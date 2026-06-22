import { prisma } from './prisma.js'
import { writeLedger } from './ledger.js'

export class CountingError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'CountingError'
  }
}

/** Sayım başlat: deponun mevcut stok satırlarını snapshot'layıp sayım satırı oluşturur (systemQty). */
export async function createCount(
  companyId: number,
  warehouseId: number,
  countNo: string,
  userId: number,
  opts: { note?: string; countType?: string; locationId?: number; productId?: number } = {},
) {
  // Kapsam: belirli lokasyon ve/veya ürün verilirse snapshot ona göre filtrelenir (yoksa tüm depo)
  const stocks = await prisma.tBLSTOCK.findMany({
    where: {
      companyId,
      location: { warehouseId },
      ...(opts.locationId ? { locationId: opts.locationId } : {}),
      ...(opts.productId ? { productId: opts.productId } : {}),
    },
    orderBy: [{ locationId: 'asc' }, { productId: 'asc' }],
  })
  try {
    return await prisma.tBLSTOCKCOUNT.create({
      data: {
        companyId,
        countNo,
        warehouseId,
        countType: opts.countType,
        createdById: userId,
        note: opts.note,
        status: 'DRAFT',
        lines: {
          create: stocks.map((s, i) => ({
            lineNo: i + 1,
            stockId: s.id,
            locationId: s.locationId,
            productId: s.productId,
            statusId: s.statusId,
            unitId: s.unitId,
            batchNo: s.batchNo,
            serialNo: s.serialNo,
            palletId: s.palletId,
            systemQty: s.mainQty,
          })),
        },
      },
      include: { lines: { orderBy: { lineNo: 'asc' } } },
    })
  } catch (err) {
    if ((err as { code?: string }).code === 'P2002') throw new CountingError('Sayım no zaten kullanımda')
    throw err
  }
}

/** Satıra sayılan miktarı yaz. */
export async function setCounted(countId: number, lineId: number, countedQty: number) {
  const count = await prisma.tBLSTOCKCOUNT.findUniqueOrThrow({ where: { id: countId } })
  if (count.status === 'COMPLETED' || count.status === 'CANCELLED') {
    throw new CountingError(`Sayım kapalı (${count.status}) — düzenlenemez`)
  }
  const line = await prisma.tBLSTOCKCOUNTLINE.findFirst({ where: { id: lineId, countId } })
  if (!line) throw new CountingError('Sayım satırı bulunamadı')
  if (count.status === 'DRAFT') await prisma.tBLSTOCKCOUNT.update({ where: { id: countId }, data: { status: 'COUNTING' } })
  return prisma.tBLSTOCKCOUNTLINE.update({ where: { id: lineId }, data: { countedQty } })
}

/** Tamamla: sayılan ≠ sistem olan satırlarda stok mainQty'yi sayılan değere çeker. Tek transaction. */
export async function completeCount(countId: number, now: Date) {
  return prisma.$transaction(async (tx) => {
    const count = await tx.tBLSTOCKCOUNT.findUniqueOrThrow({ where: { id: countId }, include: { lines: true } })
    if (count.status === 'COMPLETED') throw new CountingError('Sayım zaten tamamlandı')
    if (count.status === 'CANCELLED') throw new CountingError('İptal edilmiş sayım tamamlanamaz')

    // Sayım kriteri: aktif "zorunlu" kriter varsa tüm satırlar sayılmadan tamamlanamaz (TBLCOUNTCRITERIA)
    const requiredCriteria = await tx.tBLCOUNTCRITERIA.findFirst({ where: { companyId: count.companyId, required: true, isActive: true } })
    if (requiredCriteria) {
      const uncounted = count.lines.filter((l) => l.countedQty === null).length
      if (uncounted > 0) throw new CountingError(`Sayım kriteri gereği ${uncounted} satır sayılmadan sayım tamamlanamaz`)
    }

    let adjusted = 0
    for (const line of count.lines) {
      if (line.countedQty === null) continue
      if (line.countedQty.equals(line.systemQty)) continue
      if (line.stockId !== null) {
        await tx.tBLSTOCK.update({ where: { id: line.stockId }, data: { mainQty: line.countedQty } })
        // Hareket defteri: sayım düzeltmesi (işaretli fark = sayılan − sistem)
        await writeLedger(tx, {
          companyId: count.companyId, productId: line.productId, unitId: line.unitId,
          locationId: line.locationId, statusId: line.statusId, batchNo: line.batchNo, serialNo: line.serialNo,
          palletId: line.palletId, qtyDelta: line.countedQty.sub(line.systemQty), direction: 'COUNT', userId: count.createdById,
        })
        adjusted++
      }
    }
    const updated = await tx.tBLSTOCKCOUNT.update({
      where: { id: countId },
      data: { status: 'COMPLETED', completedAt: now },
      include: { lines: { orderBy: { lineNo: 'asc' } } },
    })
    return { adjustedLines: adjusted, count: updated }
  })
}

export async function cancelCount(id: number) {
  const c = await prisma.tBLSTOCKCOUNT.findUniqueOrThrow({ where: { id } })
  if (c.status === 'COMPLETED') throw new CountingError('Tamamlanmış sayım iptal edilemez')
  if (c.status === 'CANCELLED') throw new CountingError('Sayım zaten iptal edilmiş')
  return prisma.tBLSTOCKCOUNT.update({ where: { id }, data: { status: 'CANCELLED' } })
}

/** Sayım Eşitleme İptal — tamamlanmış sayımın stok düzeltmelerini geri al (countedQty → systemQty), sayımı iptal et. */
export async function reverseEqualize(id: number) {
  return prisma.$transaction(async (tx) => {
    const c = await tx.tBLSTOCKCOUNT.findUniqueOrThrow({ where: { id }, include: { lines: true } })
    if (c.status !== 'COMPLETED') throw new CountingError('Sadece tamamlanmış sayımın eşitlemesi iptal edilebilir')
    let reverted = 0
    for (const line of c.lines) {
      if (line.countedQty === null || line.stockId === null) continue
      if (line.countedQty.equals(line.systemQty)) continue
      await tx.tBLSTOCK.update({ where: { id: line.stockId }, data: { mainQty: line.systemQty } })
      // Hareket defteri: eşitleme geri alma (işaretli fark = sistem − sayılan)
      await writeLedger(tx, {
        companyId: c.companyId, productId: line.productId, unitId: line.unitId,
        locationId: line.locationId, statusId: line.statusId, batchNo: line.batchNo, serialNo: line.serialNo,
        palletId: line.palletId, qtyDelta: line.systemQty.sub(line.countedQty), direction: 'COUNT', userId: c.createdById,
      })
      reverted++
    }
    const updated = await tx.tBLSTOCKCOUNT.update({ where: { id }, data: { status: 'CANCELLED' } })
    return { revertedLines: reverted, count: updated }
  })
}

/** Sayım Fark — countedQty ile systemQty farklı olan satırlar (opsiyonel: sadece tamamlanmış sayımlar). */
export async function countDifferences(companyId: number, onlyCompleted: boolean) {
  const lines = await prisma.tBLSTOCKCOUNTLINE.findMany({
    where: {
      countedQty: { not: null },
      count: { companyId, ...(onlyCompleted ? { status: 'COMPLETED' } : { status: { in: ['DRAFT', 'COMPLETED'] } }) },
    },
    include: { count: { select: { countNo: true, status: true } } },
    orderBy: [{ countId: 'desc' }, { lineNo: 'asc' }],
  })
  const diffs = lines.filter((l) => l.countedQty != null && !l.countedQty.equals(l.systemQty))
  const products = new Map((await prisma.tBLPRODUCT.findMany({ where: { id: { in: [...new Set(diffs.map((l) => l.productId))] } }, select: { id: true, code: true } })).map((p) => [p.id, p.code]))
  const locations = new Map((await prisma.tBLLOCATION.findMany({ where: { id: { in: [...new Set(diffs.map((l) => l.locationId))] } }, select: { id: true, code: true } })).map((l) => [l.id, l.code]))
  return diffs.map((l) => ({
    id: l.id,
    sayimNo: l.count.countNo,
    durum: l.count.status,
    urun: products.get(l.productId) ?? String(l.productId),
    lokasyon: locations.get(l.locationId) ?? '—',
    sistemMiktar: l.systemQty.toString(),
    sayilanMiktar: l.countedQty!.toString(),
    fark: l.countedQty!.sub(l.systemQty).toString(),
  }))
}
