import { prisma } from './prisma.js'

/** Lojistik akışı hatası — route'larda 409'a map'lenir. */
export class LogisticsError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'LogisticsError'
  }
}

/** PLANNED → IN_TRANSIT (araç atanmış olmalı) */
export async function dispatchShipment(id: number, now: Date) {
  const s = await prisma.tBLSHIPMENT.findUniqueOrThrow({ where: { id } })
  if (s.status !== 'PLANNED') throw new LogisticsError(`Sadece PLANNED sevkiyat yola çıkar (mevcut: ${s.status})`)
  if (!s.vehicleId) throw new LogisticsError('Sevkiyatı yola çıkarmadan önce araç atayın')
  return prisma.tBLSHIPMENT.update({
    where: { id },
    data: { status: 'IN_TRANSIT', dispatchedAt: now },
    include: { vehicle: true, stops: { orderBy: { sequence: 'asc' } } },
  })
}

/** Durağı teslim et; tüm duraklar çözüldüyse (PENDING kalmadıysa) sevkiyat DELIVERED. */
export async function deliverStop(shipmentId: number, stopId: number, now: Date) {
  return prisma.$transaction(async (tx) => {
    const shipment = await tx.tBLSHIPMENT.findUniqueOrThrow({ where: { id: shipmentId }, include: { stops: true } })
    if (shipment.status !== 'IN_TRANSIT') throw new LogisticsError(`Sevkiyat yolda değil (mevcut: ${shipment.status})`)
    const stop = shipment.stops.find((s) => s.id === stopId)
    if (!stop) throw new LogisticsError('Durak bu sevkiyatta bulunamadı')
    if (stop.status === 'DELIVERED') throw new LogisticsError('Durak zaten teslim edildi')

    await tx.tBLSHIPMENTSTOP.update({ where: { id: stopId }, data: { status: 'DELIVERED', arrivedAt: now } })

    const stillPending = shipment.stops.some((s) => s.id !== stopId && s.status === 'PENDING')
    if (!stillPending) {
      return tx.tBLSHIPMENT.update({
        where: { id: shipmentId },
        data: { status: 'DELIVERED', deliveredAt: now },
        include: { stops: { orderBy: { sequence: 'asc' } } },
      })
    }
    return tx.tBLSHIPMENT.findUniqueOrThrow({ where: { id: shipmentId }, include: { stops: { orderBy: { sequence: 'asc' } } } })
  })
}

/**
 * Sales → Logistics köprüsü: satış siparişinden sevkiyat (PLANNED) oluşturur,
 * müşteriyi durak olarak ekler ve salesOrderId ile bağlar.
 */
export async function createShipmentFromSalesOrder(
  companyId: number,
  salesOrderId: number,
  opts: { vehicleId?: number; driverName?: string; plannedDate?: Date; shipmentNo?: string },
  userId: number,
) {
  const order = await prisma.tBLSALESORDER.findFirst({ where: { id: salesOrderId, companyId } })
  if (!order) throw new LogisticsError('Satış siparişi bu firmada bulunamadı')
  try {
    return await prisma.tBLSHIPMENT.create({
      data: {
        companyId,
        shipmentNo: opts.shipmentNo ?? `SHP-${order.orderNo}`,
        vehicleId: opts.vehicleId,
        driverName: opts.driverName,
        plannedDate: opts.plannedDate,
        createdById: userId,
        status: 'PLANNED',
        stops: { create: [{ sequence: 1, partnerId: order.customerId, salesOrderId: order.id }] },
      },
      include: { stops: { orderBy: { sequence: 'asc' } } },
    })
  } catch (err) {
    if ((err as { code?: string }).code === 'P2002') throw new LogisticsError('Bu sipariş için sevkiyat no zaten var')
    throw err
  }
}

/** → CANCELLED (teslim edilmemiş) */
export async function cancelShipment(id: number) {
  const s = await prisma.tBLSHIPMENT.findUniqueOrThrow({ where: { id } })
  if (s.status === 'DELIVERED') throw new LogisticsError('Teslim edilmiş sevkiyat iptal edilemez')
  if (s.status === 'CANCELLED') throw new LogisticsError('Sevkiyat zaten iptal edilmiş')
  return prisma.tBLSHIPMENT.update({ where: { id }, data: { status: 'CANCELLED' } })
}
