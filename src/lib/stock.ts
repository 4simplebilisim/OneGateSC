import { Prisma } from '@prisma/client'
import { prisma } from './prisma.js'
import { MovementError } from './movement.js'

export interface StockKey {
  companyId: number
  locationId: number
  productId: number
  statusId: number
  batchNo?: string | null
  serialNo?: string | null
  palletId?: number | null
  customerId?: number | null
  poNo?: string | null
  poLine?: string | null
}

function normalize(key: StockKey) {
  return {
    companyId: key.companyId,
    locationId: key.locationId,
    productId: key.productId,
    statusId: key.statusId,
    batchNo: key.batchNo ?? null,
    serialNo: key.serialNo ?? null,
    palletId: key.palletId ?? null,
    customerId: key.customerId ?? null,
    poNo: key.poNo ?? null,
    poLine: key.poLine ?? null,
  }
}

/** Uygun (rezerve edilebilir) miktar = mainQty − reservedQty. */
export async function reserveStock(key: StockKey, quantity: number) {
  const q = new Prisma.Decimal(quantity)
  return prisma.$transaction(async (tx) => {
    const s = await tx.tBLSTOCK.findFirst({ where: normalize(key) })
    if (!s) throw new MovementError('Stok bulunamadı — rezerve edilemez')
    const available = s.mainQty.sub(s.reservedQty)
    if (available.lessThan(q)) {
      throw new MovementError(`Yetersiz uygun stok: uygun ${available.toString()}, talep ${quantity}`)
    }
    return tx.tBLSTOCK.update({ where: { id: s.id }, data: { reservedQty: s.reservedQty.add(q) } })
  })
}

/** Rezerveyi serbest bırak (0'ın altına inmez). */
export async function releaseStock(key: StockKey, quantity: number) {
  const q = new Prisma.Decimal(quantity)
  return prisma.$transaction(async (tx) => {
    const s = await tx.tBLSTOCK.findFirst({ where: normalize(key) })
    if (!s) throw new MovementError('Stok bulunamadı — rezerve serbest bırakılamaz')
    let newReserved = s.reservedQty.sub(q)
    if (newReserved.isNegative()) newReserved = new Prisma.Decimal(0)
    return tx.tBLSTOCK.update({ where: { id: s.id }, data: { reservedQty: newReserved } })
  })
}
