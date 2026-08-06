import { resolveWorkOrderOperation } from './workOrderParams.js'
import { prisma } from './prisma.js'
import { completeDocument, MovementError } from './movement.js'
import { refreshDocStatus } from './documentStatus.js'

export class WorkOrderError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'WorkOrderError'
  }
}

/** Kullanıcı ata (tamamlanmamış/iptal değil). */
export async function assignWorkOrder(id: number, assignedToUserId: number) {
  const wo = await prisma.tBLWORKORDER.findUniqueOrThrow({ where: { id } })
  if (wo.status === 'COMPLETED' || wo.status === 'CANCELLED') {
    throw new WorkOrderError(`Kapalı iş emrine atama yapılamaz (${wo.status})`)
  }
  return prisma.tBLWORKORDER.update({ where: { id }, data: { assignedToUserId } })
}

/** PLANNED → IN_PROGRESS (atanmış olmalı). */
export async function startWorkOrder(id: number, now: Date) {
  const wo = await prisma.tBLWORKORDER.findUniqueOrThrow({ where: { id } })
  if (wo.status !== 'PLANNED') throw new WorkOrderError(`Sadece PLANNED iş emri başlatılır (mevcut: ${wo.status})`)
  if (!wo.assignedToUserId) throw new WorkOrderError('Başlatmadan önce kullanıcı atayın')
  return prisma.tBLWORKORDER.update({ where: { id }, data: { status: 'IN_PROGRESS', startDate: now } })
}

/** Satıra toplanan miktarı yaz (iş emri IN_PROGRESS olmalı). */
export async function reportLine(workOrderId: number, lineId: number, collectedQty: number) {
  const wo = await prisma.tBLWORKORDER.findUniqueOrThrow({ where: { id: workOrderId } })
  if (wo.status !== 'IN_PROGRESS') throw new WorkOrderError(`İş emri devam etmiyor (${wo.status})`)
  const line = await prisma.tBLWORKORDERLINE.findFirst({ where: { id: lineId, workOrderId } })
  if (!line) throw new WorkOrderError('İş emri satırı bulunamadı')
  return prisma.tBLWORKORDERLINE.update({ where: { id: lineId }, data: { collectedQty } })
}

/**
 * IN_PROGRESS → COMPLETED.
 * Köprü: toplanan miktarı (collectedQty) olan + kaynak&hedef lokasyon/statü tanımlı
 * satırlar için INTERNAL hareket belgesi üretip stoğu hareket ettirir (movement engine).
 * Hareket başarısız olursa (yetersiz stok vb.) iş emri IN_PROGRESS kalır.
 */
export async function completeWorkOrder(id: number, userId: number, now: Date) {
  const wo = await prisma.tBLWORKORDER.findUniqueOrThrow({ where: { id }, include: { lines: true } })
  if (wo.status !== 'IN_PROGRESS') throw new WorkOrderError(`Sadece IN_PROGRESS iş emri tamamlanır (mevcut: ${wo.status})`)

  // Stok hareketine uygun satırlar (COUNT hareket üretmez)
  const moveLines = wo.lines.filter(
    (l) =>
      wo.type !== 'COUNT' &&
      l.collectedQty.greaterThan(0) &&
      l.sourceLocationId != null &&
      l.sourceStatusId != null &&
      l.targetLocationId != null &&
      l.targetStatusId != null,
  )

  let generatedDocumentId: number | null = null
  if (moveLines.length > 0) {
    // Hareketi hangi operasyon üretecek: İş Emri Referans Operasyon → Genel Parametre → alfabetik ilk INTERNAL
    const secim = await resolveWorkOrderOperation(wo.companyId, { type: wo.type })
    if (!secim) throw new WorkOrderError('INTERNAL operasyon tipi (ör. TR) tanımlı değil — stok hareketi üretilemedi')
    const op = { id: secim.operationTypeId }

    const doc = await prisma.tBLDOCUMENT.create({
      data: {
        companyId: wo.companyId,
        documentNo: `WOTX-${wo.orderNo}-${now.getTime()}`,
        operationTypeId: op.id,
        warehouseId: wo.warehouseId,
        createdById: userId,
        status: 'CONFIRMED',
        reasonId: moveLines[0]!.reasonId ?? undefined,
        note: `İş emri ${wo.orderNo} otomatik stok hareketi`,
        lines: {
          create: moveLines.map((l, i) => ({
            lineNo: i + 1,
            companyId: wo.companyId,
            productId: l.productId,
            unitId: l.unitId,
            quantity: l.collectedQty,
            sourceLocationId: l.sourceLocationId,
            sourceStatusId: l.sourceStatusId,
            targetLocationId: l.targetLocationId,
            targetStatusId: l.targetStatusId,
            batchNo: l.batchNo,
            serialNo: l.serialNo,
            palletId: l.palletId,
          })),
        },
      },
    })

    try {
      await completeDocument(doc.id)
    } catch (err) {
      // Belgeyi temizle ki yarım CONFIRMED kayıt kalmasın; iş emri IN_PROGRESS kalır
      await prisma.tBLDOCUMENT.delete({ where: { id: doc.id } }).catch(() => undefined)
      if (err instanceof MovementError) throw new WorkOrderError(`Stok hareketi başarısız: ${err.message}`)
      throw err
    }
    await refreshDocStatus(prisma, doc.id) // COMPLETED → ONY — tek doğru kaynağı
    generatedDocumentId = doc.id
  }

  const updated = await prisma.tBLWORKORDER.update({
    where: { id },
    data: { status: 'COMPLETED', endDate: now },
    include: { lines: { orderBy: { lineNo: 'asc' } } },
  })
  return { ...updated, generatedDocumentId }
}

/**
 * → CANCELLED (tamamlanmamış).
 * İŞ EMRİ NEDENİ (TBLWORKORDERREASON): iptal nedeni tanımlıysa neden ZORUNLU olur
 * ve nedene şifre tanımlıysa doğru şifre gerekir. Tanım yoksa eski davranış.
 */
export async function cancelWorkOrder(id: number, opts: { reasonCode?: string; breakPassword?: string } = {}) {
  const wo = await prisma.tBLWORKORDER.findUniqueOrThrow({ where: { id } })
  if (wo.status === 'COMPLETED') throw new WorkOrderError('Tamamlanmış iş emri iptal edilemez')
  if (wo.status === 'CANCELLED') throw new WorkOrderError('İş emri zaten iptal edilmiş')

  const nedenler = await prisma.tBLWORKORDERREASON.findMany({
    where: { companyId: wo.companyId, isCancel: true, isActive: true },
    orderBy: { code: 'asc' },
  })
  if (nedenler.length) {
    if (!opts.reasonCode) {
      throw new WorkOrderError(`İptal nedeni zorunlu — geçerli nedenler: ${nedenler.map((n) => n.code).join(', ')}`)
    }
    const neden = nedenler.find((n) => n.code === opts.reasonCode)
    if (!neden) throw new WorkOrderError(`Geçersiz iptal nedeni: ${opts.reasonCode}`)
    if (neden.breakPassword && neden.breakPassword !== opts.breakPassword) {
      throw new WorkOrderError(`"${neden.description ?? neden.code}" nedeni şifre ister — şifre hatalı`)
    }
  }
  return prisma.tBLWORKORDER.update({ where: { id }, data: { status: 'CANCELLED' } })
}

/** Aktif iptal nedenleri (ekranın seçenek listesi). */
export async function cancelReasons(companyId: number) {
  return prisma.tBLWORKORDERREASON.findMany({
    where: { companyId, isCancel: true, isActive: true },
    select: { code: true, description: true, breakPassword: true },
    orderBy: { code: 'asc' },
  })
}
