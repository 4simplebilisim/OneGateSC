import { prisma } from './prisma.js'
import { completeDocument } from './movement.js'
import { docStatusId, DOC_STATUS } from './documentStatus.js'

/** Satınalma akışı hatası — route'larda 409'a map'lenir. */
export class ProcurementError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ProcurementError'
  }
}

/** DRAFT → SUBMITTED */
export async function submitOrder(id: number) {
  const o = await prisma.tBLPURCHASEORDER.findUniqueOrThrow({ where: { id } })
  if (o.status !== 'DRAFT') throw new ProcurementError(`Sadece DRAFT sipariş gönderilebilir (mevcut: ${o.status})`)
  return prisma.tBLPURCHASEORDER.update({ where: { id }, data: { status: 'SUBMITTED' } })
}

/** SUBMITTED → APPROVED */
export async function approveOrder(id: number, userId: number) {
  const o = await prisma.tBLPURCHASEORDER.findUniqueOrThrow({ where: { id } })
  if (o.status !== 'SUBMITTED') throw new ProcurementError(`Sadece SUBMITTED sipariş onaylanabilir (mevcut: ${o.status})`)
  return prisma.tBLPURCHASEORDER.update({
    where: { id },
    data: { status: 'APPROVED', approvedById: userId, approvedAt: new Date() },
  })
}

/** SUBMITTED → REJECTED */
export async function rejectOrder(id: number) {
  const o = await prisma.tBLPURCHASEORDER.findUniqueOrThrow({ where: { id } })
  if (o.status !== 'SUBMITTED') throw new ProcurementError(`Sadece SUBMITTED sipariş reddedilebilir (mevcut: ${o.status})`)
  return prisma.tBLPURCHASEORDER.update({ where: { id }, data: { status: 'REJECTED' } })
}

/** → CANCELLED (tamamlanmamış/iptal edilmemiş) */
export async function cancelOrder(id: number) {
  const o = await prisma.tBLPURCHASEORDER.findUniqueOrThrow({ where: { id } })
  if (o.status === 'COMPLETED') throw new ProcurementError('Tamamlanmış sipariş iptal edilemez')
  if (o.status === 'CANCELLED') throw new ProcurementError('Sipariş zaten iptal edilmiş')
  return prisma.tBLPURCHASEORDER.update({ where: { id }, data: { status: 'CANCELLED' } })
}

export interface ReceiptLine {
  lineId: number
  quantity: number
  targetLocationId: number
  targetStatusId?: number
  batchNo?: string
  serialNo?: string
  palletId?: number
}

/**
 * Onaylı siparişe mal kabul: WMS INBOUND belgesi oluşturur + stok'a işler (movement),
 * PO satırlarının receivedQty'sini artırır, tüm satırlar tam alındıysa siparişi COMPLETED yapar.
 * Procurement → WMS köprüsü burada.
 */
export async function receiveOrder(orderId: number, receipts: ReceiptLine[], userId: number, now: Date) {
  const order = await prisma.tBLPURCHASEORDER.findUniqueOrThrow({ where: { id: orderId }, include: { lines: true } })
  if (order.status !== 'APPROVED') {
    throw new ProcurementError(`Sadece APPROVED sipariş mal kabul edilebilir (mevcut: ${order.status})`)
  }

  const grOp = await prisma.tBLOPERATIONTYPE.findFirst({
    where: { companyId: order.companyId, OR: [{ code: 'GR' }, { direction: 'INBOUND' }] },
    orderBy: { code: 'asc' },
  })
  if (!grOp) throw new ProcurementError('Mal kabul için INBOUND operasyon tipi (GR) tanımlı değil')

  const defaultStatus = await prisma.tBLSTATUS.findFirst({
    where: { companyId: order.companyId, OR: [{ code: 'AVAILABLE' }, {}] },
    orderBy: { code: 'asc' },
  })
  if (!defaultStatus) throw new ProcurementError('Stok statüsü tanımlı değil')

  // Receipt → WMS belge satırı eşleştir
  const docLines = receipts.map((r, i) => {
    const poLine = order.lines.find((l) => l.id === r.lineId)
    if (!poLine) throw new ProcurementError(`Sipariş satırı bulunamadı: ${r.lineId}`)
    return {
      lineNo: i + 1,
      productId: poLine.productId,
      unitId: poLine.unitId,
      quantity: r.quantity,
      targetLocationId: r.targetLocationId,
      targetStatusId: r.targetStatusId ?? defaultStatus.id,
      batchNo: r.batchNo,
      serialNo: r.serialNo,
      palletId: r.palletId,
    }
  })

  // WMS INBOUND belgesi (CONFIRMED) → stok'a işle
  const doc = await prisma.tBLDOCUMENT.create({
    data: {
      companyId: order.companyId,
      documentNo: `GR-${order.orderNo}-${now.getTime()}`,
      operationTypeId: grOp.id,
      warehouseId: order.warehouseId,
      partnerId: order.supplierId,
      createdById: userId,
      status: 'CONFIRMED',
      note: `Satınalma siparişi ${order.orderNo} mal kabulü`,
      lines: { create: docLines.map((l) => ({ ...l, companyId: order.companyId })) },
    },
  })
  await completeDocument(doc.id)
  const onyId = await docStatusId(order.companyId, DOC_STATUS.APPROVED)
  if (onyId) await prisma.tBLDOCUMENT.update({ where: { id: doc.id }, data: { documentStatusId: onyId } })

  // PO satır receivedQty güncelle
  for (const r of receipts) {
    await prisma.tBLPURCHASEORDERLINE.update({
      where: { id: r.lineId },
      data: { receivedQty: { increment: r.quantity } },
    })
  }

  // Tüm satırlar tam alındıysa COMPLETED
  const updated = await prisma.tBLPURCHASEORDER.findUniqueOrThrow({ where: { id: orderId }, include: { lines: true } })
  const allReceived = updated.lines.every((l) => l.receivedQty.greaterThanOrEqualTo(l.quantity))
  const finalOrder = allReceived
    ? await prisma.tBLPURCHASEORDER.update({ where: { id: orderId }, data: { status: 'COMPLETED' }, include: { lines: true } })
    : updated

  return { documentId: doc.id, order: finalOrder }
}
