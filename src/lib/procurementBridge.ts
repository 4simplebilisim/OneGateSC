import { prisma } from './prisma.js'
import { resolvePlatformIntegration } from '../routes/platformIntegration.js'
import { nextSequence } from './sequence.js'

/**
 * Procurement ↔ WMS köprüsü.
 *
 * Tasarım kararı (kullanıcı, 2026-08-02): iki ürünün belge tabloları AYRI yaşar.
 *  · WMS belgesi = palet/lot/seri seviyesinde operasyon detayı
 *  · Procurement siparişi = "toplandı mı, kısmi mi" özeti
 * Köprü, entegrasyon parametresine bağlı olarak Procurement siparişini WMS belge
 * tablosuna TAŞIR (kopyalar), operasyon WMS'te yürür, sonuç siparişe geri yazılır.
 */

const PO_TYPE = 2 // 1=talep, 2=sipariş
const OPEN_STATUSES = ['Open', 'Approved', 'Partially Received']

export type SyncResult = {
  enabled: boolean
  reason?: string
  created: { orderId: number; orderCode: string; documentId: number; documentNo: string }[]
  skipped: { orderId: number; orderCode: string; reason: string }[]
}

/** Entegrasyon açıksa, WMS'e taşınmamış açık siparişlerden mal kabul belgesi doğurur (idempotent). */
export async function syncOrdersToDocuments(companyId: number, userId: number, facilityId?: number | null): Promise<SyncResult> {
  const cfg = await resolvePlatformIntegration(companyId, facilityId)
  if (!cfg) return { enabled: false, reason: 'Entegrasyon kapalı (Uyarlamalar › Sistem › Platform Entegrasyonu)', created: [], skipped: [] }
  if (!cfg.autoCreateReceipt) return { enabled: false, reason: 'Ayarda "sipariş onayında belge oluştur" kapalı', created: [], skipped: [] }
  if (!cfg.receiptOperationTypeId) return { enabled: false, reason: 'Ayarda mal kabul operasyon tipi seçili değil', created: [], skipped: [] }

  const op = await prisma.tBLOPERATIONTYPE.findFirst({ where: { id: cfg.receiptOperationTypeId, companyId } })
  if (!op) return { enabled: false, reason: 'Seçili operasyon tipi bulunamadı', created: [], skipped: [] }

  const orders = await prisma.p4_Order.findMany({
    where: { OrderType: PO_TYPE, IsActive: true, IsCanceled: false, Status: { in: OPEN_STATUSES } },
    orderBy: { Id: 'asc' },
  })

  const created: SyncResult['created'] = []
  const skipped: SyncResult['skipped'] = []

  for (const order of orders) {
    // Idempotent: bu sipariş için belge zaten doğduysa atla
    const existing = await prisma.tBLDOCUMENT.findFirst({ where: { sourceOrderId: order.Id } })
    if (existing) { skipped.push({ orderId: order.Id, orderCode: order.Code, reason: `Zaten taşınmış (${existing.documentNo})` }); continue }

    const lines = await prisma.p4_OrderDetail.findMany({ where: { OrderId: order.Id }, orderBy: { LineNo: 'asc' } })
    const usable = lines.filter((l) => l.MaterialId != null && Number(l.Quantity) > 0)
    if (!usable.length) { skipped.push({ orderId: order.Id, orderCode: order.Code, reason: 'Malzemeli satır yok (hizmet siparişi)' }); continue }

    // Cari: sipariş tedarikçisi bu firmada mı
    const partner = order.SupplierId
      ? await prisma.tBLBUSINESSPARTNER.findFirst({ where: { id: order.SupplierId, companyId } })
      : null

    // Belge no: operasyonun sayacı varsa ondan, yoksa sipariş kodundan türetilir
    let documentNo = `PO-${order.Code}`
    if (op.sequenceId) {
      const seq = await prisma.tBLSEQUENCE.findUnique({ where: { id: op.sequenceId } })
      if (seq) documentNo = (await nextSequence(companyId, seq.code)).formatted
    }

    const prods = await prisma.tBLPRODUCT.findMany({
      where: { id: { in: usable.map((l) => l.MaterialId as number) } },
      select: { id: true, unitId: true },
    })
    const unitByProduct = new Map(prods.map((p) => [p.id, p.unitId ?? 0]))

    const doc = await prisma.$transaction(async (tx) => {
      const d = await tx.tBLDOCUMENT.create({
        data: {
          companyId,
          documentNo,
          operationTypeId: op.id,
          createdById: userId,
          partnerId: partner?.id ?? null,
          sourceOrderId: order.Id, // köprü bağı — idempotency ve geri yazma bunu kullanır
          note: `Satınalma siparişi ${order.Code}`,
        },
      })
      await tx.tBLDOCUMENTLINE.createMany({
        data: usable.map((l, i) => ({
          companyId,
          documentId: d.id,
          lineNo: l.LineNo || i + 1,
          productId: l.MaterialId as number,
          quantity: Number(l.Quantity),
          // Birim: sipariş satırında yoksa ürünün ana ölçü birimi kullanılır
          unitId: l.UnitId ?? unitByProduct.get(l.MaterialId as number) ?? 0,
        })),
      })
      return d
    })
    created.push({ orderId: order.Id, orderCode: order.Code, documentId: doc.id, documentNo: doc.documentNo })
  }

  return { enabled: true, created, skipped }
}

/**
 * WMS belgesi tamamlanınca sipariş tarafına özet yazar:
 * satır bazında teslim edilen miktar + sipariş durumu (kısmi / tam) + mal kabul özeti.
 * Belge siparişten doğmadıysa hiçbir şey yapmaz.
 */
export async function writeBackOnComplete(documentId: number): Promise<void> {
  const doc = await prisma.tBLDOCUMENT.findUnique({ where: { id: documentId } })
  if (!doc?.sourceOrderId) return

  const cfg = await resolvePlatformIntegration(doc.companyId)
  if (!cfg?.updateOrderOnComplete) return

  const [lines, orderLines] = await Promise.all([
    prisma.tBLDOCUMENTLINE.findMany({ where: { documentId } }),
    prisma.p4_OrderDetail.findMany({ where: { OrderId: doc.sourceOrderId } }),
  ])

  // Ürün bazında toplanan miktar → sipariş satırının teslim edilenine ekle
  const received = new Map<number, number>()
  for (const l of lines) {
    if (l.productId == null) continue
    received.set(l.productId, (received.get(l.productId) ?? 0) + Number(l.quantity ?? 0))
  }

  let total = 0
  let complete = true
  for (const ol of orderLines) {
    const got = ol.MaterialId != null ? (received.get(ol.MaterialId) ?? 0) : 0
    if (got > 0) {
      const newQty = Number(ol.DeliveredQty ?? 0) + got
      await prisma.p4_OrderDetail.update({ where: { Id: ol.Id }, data: { DeliveredQty: newQty } })
      total += got
      if (newQty + 1e-6 < Number(ol.Quantity ?? 0)) complete = false
    } else if (Number(ol.DeliveredQty ?? 0) + 1e-6 < Number(ol.Quantity ?? 0)) {
      complete = false
    }
  }

  if (total <= 0) return

  // Sipariş durumu: tam mı kısmi mi (Procurement'ın ihtiyacı bu kadar)
  await prisma.p4_Order.update({
    where: { Id: doc.sourceOrderId },
    data: { Status: complete ? 'Received' : 'Partially Received' },
  })

  // Mal kabul özeti (Procurement tarafındaki kayıt) — detay WMS'te kalır
  await prisma.p4_Receipt.create({
    data: {
      Code: `GR-${doc.documentNo}`,
      OrderId: doc.sourceOrderId,
      ReceiptDate: doc.completedAt ?? new Date(),
      WareHouseId: doc.warehouseId ?? undefined,
      Notes: `OneGate WMS belgesi ${doc.documentNo}`,
      TotalReceivedQty: total,
      TotalAcceptedQty: total,
      CreatedBy: doc.createdById,
    },
  }).catch(() => { /* özet kaydı ikincil — belge tamamlanmasını engellemez */ })
}
