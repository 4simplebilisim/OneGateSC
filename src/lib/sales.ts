import { Prisma } from '@prisma/client'
import { prisma } from './prisma.js'
import { completeDocument } from './movement.js'
import { docStatusId, DOC_STATUS } from './documentStatus.js'
import { nextSequence } from './sequence.js'

const ZERO = new Prisma.Decimal(0)

/** Satış akışı hatası — route'larda 409'a map'lenir. */
export class SalesError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'SalesError'
  }
}

export async function submitSalesOrder(id: number) {
  const o = await prisma.tBLSALESORDER.findUniqueOrThrow({ where: { id } })
  if (o.status !== 'DRAFT') throw new SalesError(`Sadece DRAFT sipariş gönderilebilir (mevcut: ${o.status})`)
  return prisma.tBLSALESORDER.update({ where: { id }, data: { status: 'SUBMITTED' } })
}

export async function approveSalesOrder(id: number, userId: number) {
  const o = await prisma.tBLSALESORDER.findUniqueOrThrow({ where: { id } })
  if (o.status !== 'SUBMITTED') throw new SalesError(`Sadece SUBMITTED sipariş onaylanabilir (mevcut: ${o.status})`)
  return prisma.tBLSALESORDER.update({
    where: { id },
    data: { status: 'APPROVED', approvedById: userId, approvedAt: new Date() },
  })
}

export async function rejectSalesOrder(id: number) {
  const o = await prisma.tBLSALESORDER.findUniqueOrThrow({ where: { id } })
  if (o.status !== 'SUBMITTED') throw new SalesError(`Sadece SUBMITTED sipariş reddedilebilir (mevcut: ${o.status})`)
  return prisma.tBLSALESORDER.update({ where: { id }, data: { status: 'REJECTED' } })
}

/**
 * Toplama emri (pick work order) üretir — yönlendirilmiş toplama.
 * Ayrılmış (allocate edilmiş) stok satırlarından, toplayıcıya hangi lokasyon/parti/paletten
 * ne kadar alacağını söyleyen bir PICK iş emri oluşturur. Hedef yok: stok hareketi sevkte olur.
 */
export async function createPickOrder(orderId: number, userId: number) {
  const order = await prisma.tBLSALESORDER.findUniqueOrThrow({
    where: { id: orderId },
    include: { lines: { include: { allocations: true } } },
  })
  if (order.status !== 'APPROVED') throw new SalesError(`Toplama emri için sipariş APPROVED + ayrılmış olmalı (mevcut: ${order.status})`)

  const existing = await prisma.tBLWORKORDER.findFirst({
    where: { salesOrderId: orderId, type: 'PICK', status: { in: ['PLANNED', 'IN_PROGRESS'] } },
  })
  if (existing) throw new SalesError(`Bu sipariş için zaten aktif toplama emri var (${existing.orderNo})`)

  const stockIds = order.lines.flatMap((l) => l.allocations.map((a) => a.stockId))
  if (stockIds.length === 0) throw new SalesError('Sipariş için ayrılmış stok yok — önce allocate edin')
  const stocks = await prisma.tBLSTOCK.findMany({ where: { id: { in: stockIds } } })
  const stockMap = new Map(stocks.map((s) => [s.id, s]))

  const lines = order.lines.flatMap((line) =>
    line.allocations.flatMap((alloc) => {
      const s = stockMap.get(alloc.stockId)
      if (!s) return []
      return [{
        productId: line.productId,
        unitId: line.unitId,
        quantity: alloc.quantity,
        sourceLocationId: s.locationId,
        sourceStatusId: s.statusId,
        batchNo: s.batchNo,
        serialNo: s.serialNo,
        palletId: s.palletId,
      }]
    }),
  )

  const seq = await prisma.tBLSEQUENCE.findFirst({ where: { companyId: order.companyId, code: 'WO' } })
  if (!seq) throw new SalesError("'WO' sayacı tanımlı değil — iş emri numarası üretilemedi")
  const orderNo = (await nextSequence(order.companyId, 'WO')).formatted

  return prisma.tBLWORKORDER.create({
    data: {
      companyId: order.companyId,
      orderNo,
      type: 'PICK',
      warehouseId: order.warehouseId,
      salesOrderId: orderId,
      createdById: userId,
      note: `Satış siparişi ${order.orderNo} toplama emri`,
      lines: { create: lines.map((l, i) => ({ lineNo: i + 1, companyId: order.companyId, ...l })) },
    },
    include: { lines: { orderBy: { lineNo: 'asc' } } },
  })
}

export async function cancelSalesOrder(id: number) {
  const o = await prisma.tBLSALESORDER.findUniqueOrThrow({ where: { id } })
  if (o.status === 'COMPLETED') throw new SalesError('Tamamlanmış sipariş iptal edilemez')
  if (o.status === 'CANCELLED') throw new SalesError('Sipariş zaten iptal edilmiş')
  await deallocateOrder(id) // varsa rezervasyonları serbest bırak
  return prisma.tBLSALESORDER.update({ where: { id }, data: { status: 'CANCELLED' } })
}

export interface ShipmentLine {
  lineId: number
  quantity: number
  sourceLocationId: number
  sourceStatusId?: number
  batchNo?: string
  serialNo?: string
  palletId?: number
}

/**
 * Onaylı satış siparişine sevk: WMS OUTBOUND belgesi oluşturur + stok'tan düşer (movement),
 * PO satır shippedQty artırır, tüm satırlar tam sevk edildiyse siparişi COMPLETED yapar.
 * Sales → WMS köprüsü. Yetersiz stokta movement 409 fırlatır (rollback).
 */
export async function shipOrder(orderId: number, shipments: ShipmentLine[], userId: number, now: Date) {
  const order = await prisma.tBLSALESORDER.findUniqueOrThrow({ where: { id: orderId }, include: { lines: true } })
  if (order.status !== 'APPROVED') {
    throw new SalesError(`Sadece APPROVED sipariş sevk edilebilir (mevcut: ${order.status})`)
  }

  const giOp = await prisma.tBLOPERATIONTYPE.findFirst({
    where: { companyId: order.companyId, OR: [{ code: 'GI' }, { direction: 'OUTBOUND' }] },
    orderBy: { code: 'asc' },
  })
  if (!giOp) throw new SalesError('Sevk için OUTBOUND operasyon tipi (GI) tanımlı değil')

  const defaultStatus = await prisma.tBLSTATUS.findFirst({
    where: { companyId: order.companyId, OR: [{ code: 'AVAILABLE' }, {}] },
    orderBy: { code: 'asc' },
  })
  if (!defaultStatus) throw new SalesError('Stok statüsü tanımlı değil')

  const docLines = shipments.map((s, i) => {
    const soLine = order.lines.find((l) => l.id === s.lineId)
    if (!soLine) throw new SalesError(`Sipariş satırı bulunamadı: ${s.lineId}`)
    return {
      lineNo: i + 1,
      productId: soLine.productId,
      unitId: soLine.unitId,
      quantity: s.quantity,
      sourceLocationId: s.sourceLocationId,
      sourceStatusId: s.sourceStatusId ?? defaultStatus.id,
      batchNo: s.batchNo,
      serialNo: s.serialNo,
      palletId: s.palletId,
    }
  })

  const doc = await prisma.tBLDOCUMENT.create({
    data: {
      companyId: order.companyId,
      documentNo: `GI-${order.orderNo}-${now.getTime()}`,
      operationTypeId: giOp.id,
      warehouseId: order.warehouseId,
      partnerId: order.customerId,
      createdById: userId,
      status: 'CONFIRMED',
      note: `Satış siparişi ${order.orderNo} sevkiyatı`,
      lines: { create: docLines.map((l) => ({ ...l, companyId: order.companyId })) },
    },
  })
  await completeDocument(doc.id) // OUTBOUND → stok düşer (yetersizse MovementError)
  const onyId = await docStatusId(order.companyId, DOC_STATUS.APPROVED)
  if (onyId) await prisma.tBLDOCUMENT.update({ where: { id: doc.id }, data: { documentStatusId: onyId } })

  for (const s of shipments) {
    await prisma.tBLSALESORDERLINE.update({
      where: { id: s.lineId },
      data: { shippedQty: { increment: s.quantity } },
    })
  }

  const updated = await prisma.tBLSALESORDER.findUniqueOrThrow({ where: { id: orderId }, include: { lines: true } })
  const allShipped = updated.lines.every((l) => l.shippedQty.greaterThanOrEqualTo(l.quantity))
  const finalOrder = allShipped
    ? await prisma.tBLSALESORDER.update({ where: { id: orderId }, data: { status: 'COMPLETED' }, include: { lines: true } })
    : updated

  return { documentId: doc.id, order: finalOrder }
}

// ============================================================================
// Allocation zinciri: onay → ayır (FEFO rezerve) → ayrılandan sevk
// ============================================================================

/**
 * Onaylı siparişe FEFO ile stok ayırır: her satır için, deponun uygun
 * (mainQty−reservedQty>0) stok satırlarını SKT sırasıyla gezip reservedQty artırır,
 * allocation kaydı oluşturur ve satır allocatedQty'sini günceller. Tek transaction.
 * Yetersiz uygun stokta hata (rollback).
 */
export async function allocateOrder(orderId: number) {
  return prisma.$transaction(async (tx) => {
    const order = await tx.tBLSALESORDER.findUniqueOrThrow({
      where: { id: orderId },
      include: { lines: { include: { allocations: true } } },
    })
    if (order.status !== 'APPROVED') throw new SalesError(`Sadece APPROVED sipariş için stok ayrılır (mevcut: ${order.status})`)

    for (const line of order.lines) {
      let remaining = line.quantity.sub(line.shippedQty).sub(line.allocatedQty)
      if (remaining.lessThanOrEqualTo(ZERO)) continue

      const rows = await tx.tBLSTOCK.findMany({
        where: { companyId: order.companyId, productId: line.productId, location: { warehouseId: order.warehouseId } },
        orderBy: [{ expiryDate: 'asc' }, { id: 'asc' }], // FEFO
      })

      for (const row of rows) {
        if (remaining.lessThanOrEqualTo(ZERO)) break
        const avail = row.mainQty.sub(row.reservedQty)
        if (avail.lessThanOrEqualTo(ZERO)) continue
        const take = avail.lessThan(remaining) ? avail : remaining
        await tx.tBLSTOCK.update({ where: { id: row.id }, data: { reservedQty: { increment: take } } })
        await tx.tBLSALESALLOCATION.create({ data: { orderLineId: line.id, stockId: row.id, quantity: take, companyId: order.companyId } })
        await tx.tBLSALESORDERLINE.update({ where: { id: line.id }, data: { allocatedQty: { increment: take } } })
        remaining = remaining.sub(take)
      }

      if (remaining.greaterThan(ZERO)) {
        throw new SalesError(`Satır ${line.lineNo}: yetersiz uygun stok — ${remaining.toString()} ayrılamadı (ürün ${line.productId})`)
      }
    }

    return tx.tBLSALESORDER.findUniqueOrThrow({ where: { id: orderId }, include: { lines: { include: { allocations: true } } } })
  })
}

/** Siparişin tüm rezervasyonlarını serbest bırakır (reservedQty geri al, allocation sil, allocatedQty=0). */
export async function deallocateOrder(orderId: number) {
  return prisma.$transaction(async (tx) => {
    const order = await tx.tBLSALESORDER.findUniqueOrThrow({
      where: { id: orderId },
      include: { lines: { include: { allocations: true } } },
    })
    for (const line of order.lines) {
      if (line.allocations.length === 0) continue
      for (const a of line.allocations) {
        const stock = await tx.tBLSTOCK.findUnique({ where: { id: a.stockId } })
        if (stock) {
          let nr = stock.reservedQty.sub(a.quantity)
          if (nr.isNegative()) nr = ZERO
          await tx.tBLSTOCK.update({ where: { id: stock.id }, data: { reservedQty: nr } })
        }
      }
      await tx.tBLSALESALLOCATION.deleteMany({ where: { orderLineId: line.id } })
      await tx.tBLSALESORDERLINE.update({ where: { id: line.id }, data: { allocatedQty: 0 } })
    }
    return tx.tBLSALESORDER.findUniqueOrThrow({ where: { id: orderId }, include: { lines: true } })
  })
}

/**
 * Ayrılan (allocate edilmiş) stoktan sevk: kaynak belirtmeye gerek yok — allocation'lardan
 * okunur. Her allocation için stok mainQty −qty, reservedQty −qty (rezerve tüketilir),
 * OUTBOUND belge (COMPLETED) kaydı, satır shippedQty +qty, allocation silinir.
 * Hepsi sevk edildiyse sipariş COMPLETED. Tek transaction — atomik.
 */
export async function shipAllocatedOrder(orderId: number, userId: number, now: Date) {
  return prisma.$transaction(async (tx) => {
    const order = await tx.tBLSALESORDER.findUniqueOrThrow({
      where: { id: orderId },
      include: { lines: { include: { allocations: true } } },
    })
    if (order.status !== 'APPROVED') throw new SalesError(`Sadece APPROVED sipariş sevk edilebilir (mevcut: ${order.status})`)

    const allocs = order.lines.flatMap((l) => l.allocations.map((a) => ({ ...a, productId: l.productId, unitId: l.unitId })))
    if (allocs.length === 0) throw new SalesError('Önce stok ayırın (allocate)')

    const giOp = await tx.tBLOPERATIONTYPE.findFirst({
      where: { companyId: order.companyId, OR: [{ code: 'GI' }, { direction: 'OUTBOUND' }] },
      orderBy: { code: 'asc' },
    })
    if (!giOp) throw new SalesError('Sevk için OUTBOUND operasyon tipi (GI) tanımlı değil')

    const docLines: Prisma.TBLDOCUMENTLINECreateWithoutDocumentInput[] = []
    let lineNo = 1
    for (const a of allocs) {
      const stock = await tx.tBLSTOCK.findUniqueOrThrow({ where: { id: a.stockId } })
      const newMain = stock.mainQty.sub(a.quantity)
      if (newMain.isNegative()) throw new SalesError(`Stok tutarsız (stok ${a.stockId})`)
      let newReserved = stock.reservedQty.sub(a.quantity)
      if (newReserved.isNegative()) newReserved = ZERO
      await tx.tBLSTOCK.update({ where: { id: stock.id }, data: { mainQty: newMain, reservedQty: newReserved } })
      await tx.tBLSALESORDERLINE.update({ where: { id: a.orderLineId }, data: { shippedQty: { increment: a.quantity } } })
      docLines.push({
        lineNo: lineNo++,
        companyId: order.companyId,
        product: { connect: { id: a.productId } },
        unit: { connect: { id: a.unitId } },
        quantity: a.quantity,
        sourceLocation: { connect: { id: stock.locationId } },
        sourceStatus: { connect: { id: stock.statusId } },
        batchNo: stock.batchNo,
        serialNo: stock.serialNo,
        ...(stock.palletId ? { pallet: { connect: { id: stock.palletId } } } : {}),
      })
    }

    const doc = await tx.tBLDOCUMENT.create({
      data: {
        companyId: order.companyId,
        documentNo: `GI-${order.orderNo}-${now.getTime()}`,
        operationTypeId: giOp.id,
        warehouseId: order.warehouseId,
        partnerId: order.customerId,
        createdById: userId,
        status: 'COMPLETED',
        completedAt: now,
        documentStatusId: await docStatusId(order.companyId, DOC_STATUS.APPROVED), // Onaylandı
        note: `Satış siparişi ${order.orderNo} sevkiyatı (allocation)`,
        lines: { create: docLines },
      },
    })

    await tx.tBLSALESALLOCATION.deleteMany({ where: { orderLineId: { in: order.lines.map((l) => l.id) } } })

    const updated = await tx.tBLSALESORDER.findUniqueOrThrow({ where: { id: orderId }, include: { lines: true } })
    const allShipped = updated.lines.every((l) => l.shippedQty.greaterThanOrEqualTo(l.quantity))
    const finalOrder = allShipped
      ? await tx.tBLSALESORDER.update({ where: { id: orderId }, data: { status: 'COMPLETED' }, include: { lines: true } })
      : updated

    return { documentId: doc.id, order: finalOrder }
  })
}
