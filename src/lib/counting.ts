import { prisma } from './prisma.js'

export class CountingError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'CountingError'
  }
}

/** Sayım başlat: deponun mevcut stok satırlarını snapshot'layıp sayım satırı oluşturur (systemQty). */
export async function createCount(companyId: number, warehouseId: number, countNo: string, userId: number, note?: string) {
  const stocks = await prisma.tBLSTOCK.findMany({
    where: { companyId, location: { warehouseId } },
    orderBy: [{ locationId: 'asc' }, { productId: 'asc' }],
  })
  try {
    return await prisma.tBLSTOCKCOUNT.create({
      data: {
        companyId,
        countNo,
        warehouseId,
        createdById: userId,
        note,
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

    let adjusted = 0
    for (const line of count.lines) {
      if (line.countedQty === null) continue
      if (line.countedQty.equals(line.systemQty)) continue
      if (line.stockId !== null) {
        await tx.tBLSTOCK.update({ where: { id: line.stockId }, data: { mainQty: line.countedQty } })
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
