import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { getCompanyId } from '../lib/company.js'
import {
  submitOrder,
  approveOrder,
  rejectOrder,
  cancelOrder,
  receiveOrder,
  ProcurementError,
} from '../lib/procurement.js'
import { computeLineFinance, computeOrderTotals } from '../lib/orderFinance.js'
import { parsePagination, paginated } from '../lib/pagination.js'

const lineSchema = z.object({
  productId: z.number().int().positive(),
  unitId: z.number().int().positive(),
  quantity: z.number().positive(),
  unitPrice: z.number().nonnegative().optional(),
  discountRate: z.number().min(0).max(100).optional(),
  taxRate: z.number().min(0).max(100).optional(),
  note: z.string().max(255).optional(),
})

const createSchema = z.object({
  orderNo: z.string().min(1).max(40),
  supplierId: z.number().int().positive(),
  warehouseId: z.number().int().positive(),
  expectedDate: z.string().optional(),
  currency: z.string().length(3).optional(),
  exchangeRate: z.number().positive().optional(),
  note: z.string().max(500).optional(),
  lines: z.array(lineSchema).min(1),
})

const receiveSchema = z.object({
  lines: z
    .array(
      z.object({
        lineId: z.number().int().positive(),
        quantity: z.number().positive(),
        targetLocationId: z.number().int().positive(),
        targetStatusId: z.number().int().positive().optional(),
        batchNo: z.string().max(100).optional(),
        serialNo: z.string().max(100).optional(),
        palletId: z.number().int().positive().optional(),
      }),
    )
    .min(1),
})

const idOf = (request: { params: unknown }) => Number((request.params as { id: string }).id)

export async function purchaseOrderRoutes(app: FastifyInstance) {
  app.get('/', async (request) => {
    const q = request.query as { status?: string; supplierId?: string }
    const statuses = ['DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED', 'COMPLETED', 'CANCELLED'] as const
    const where = {
      companyId: getCompanyId(request),
      supplierId: q.supplierId ? Number(q.supplierId) : undefined,
      status: statuses.includes(q.status as (typeof statuses)[number]) ? (q.status as (typeof statuses)[number]) : undefined,
    }
    const p = parsePagination(request)
    const [data, total] = await Promise.all([
      prisma.tBLPURCHASEORDER.findMany({ where, orderBy: { id: 'desc' }, include: { _count: { select: { lines: true } } }, skip: p.skip, take: p.take }),
      prisma.tBLPURCHASEORDER.count({ where }),
    ])
    return paginated(data, total, p)
  })

  app.get('/:id', async (request, reply) => {
    const id = idOf(request)
    if (!Number.isInteger(id)) return reply.code(400).send({ error: 'Invalid id' })
    const order = await prisma.tBLPURCHASEORDER.findUnique({ where: { id }, include: { lines: { orderBy: { lineNo: 'asc' } } } })
    if (!order) return reply.code(404).send({ error: 'Purchase order not found' })
    return order
  })

  // Sipariş oluştur (DRAFT) — gevşek bağlamada wms referansları uygulama katmanında doğrulanır
  app.post('/', { preHandler: [app.authenticate, app.requireWrite] }, async (request, reply) => {
    const parsed = createSchema.safeParse(request.body)
    if (!parsed.success) return reply.code(400).send({ error: 'Invalid body', details: parsed.error.flatten() })

    const companyId = getCompanyId(request)
    const { lines, expectedDate, ...header } = parsed.data

    const supplier = await prisma.tBLBUSINESSPARTNER.findFirst({ where: { id: header.supplierId, companyId } })
    if (!supplier) return reply.code(400).send({ error: 'Supplier not found in this company' })
    const warehouse = await prisma.tBLWAREHOUSE.findFirst({ where: { id: header.warehouseId, companyId } })
    if (!warehouse) return reply.code(400).send({ error: 'Warehouse not found in this company' })

    const productIds = [...new Set(lines.map((l) => l.productId))]
    const products = await prisma.tBLPRODUCT.findMany({ where: { id: { in: productIds }, companyId }, select: { id: true } })
    if (products.length !== productIds.length) return reply.code(400).send({ error: 'One or more products not found in this company' })

    const orderLines = lines.map((l, i) => {
      const f = computeLineFinance(l)
      return { lineNo: i + 1, productId: l.productId, unitId: l.unitId, quantity: l.quantity, note: l.note, ...f }
    })
    const totals = computeOrderTotals(orderLines)

    try {
      const order = await prisma.tBLPURCHASEORDER.create({
        data: {
          ...header,
          companyId,
          createdById: request.user.sub,
          expectedDate: expectedDate ? new Date(expectedDate) : undefined,
          ...totals,
          lines: { create: orderLines },
        },
        include: { lines: { orderBy: { lineNo: 'asc' } } },
      })
      return reply.code(201).send(order)
    } catch (err) {
      if ((err as { code?: string }).code === 'P2002') return reply.code(409).send({ error: 'Order number already exists' })
      throw err
    }
  })

  // DRAFT sipariş düzenle (satır değiştir + toplam yeniden hesapla)
  const editSchema = z.object({
    note: z.string().max(500).nullable().optional(),
    expectedDate: z.string().nullable().optional(),
    currency: z.string().length(3).optional(),
    exchangeRate: z.number().positive().optional(),
    lines: z.array(lineSchema).min(1).optional(),
  })
  app.patch('/:id', { preHandler: [app.authenticate, app.requireWrite] }, async (request, reply) => {
    const id = idOf(request)
    if (!Number.isInteger(id)) return reply.code(400).send({ error: 'Invalid id' })
    const parsed = editSchema.safeParse(request.body)
    if (!parsed.success) return reply.code(400).send({ error: 'Invalid body', details: parsed.error.flatten() })
    const order = await prisma.tBLPURCHASEORDER.findFirst({ where: { id, companyId: getCompanyId(request) } })
    if (!order) return reply.code(404).send({ error: 'Purchase order not found' })
    if (order.status !== 'DRAFT') return reply.code(409).send({ error: `Sadece DRAFT sipariş düzenlenebilir (mevcut: ${order.status})` })

    const { lines, expectedDate, ...rest } = parsed.data
    const data: Record<string, unknown> = { ...rest }
    if (expectedDate !== undefined) data.expectedDate = expectedDate ? new Date(expectedDate) : null

    if (lines) {
      const orderLines = lines.map((l, i) => ({ lineNo: i + 1, productId: l.productId, unitId: l.unitId, quantity: l.quantity, note: l.note, ...computeLineFinance(l) }))
      Object.assign(data, computeOrderTotals(orderLines))
      return prisma.$transaction(async (tx) => {
        await tx.tBLPURCHASEORDERLINE.deleteMany({ where: { orderId: id } })
        return tx.tBLPURCHASEORDER.update({ where: { id }, data: { ...data, lines: { create: orderLines } }, include: { lines: { orderBy: { lineNo: 'asc' } } } })
      })
    }
    return prisma.tBLPURCHASEORDER.update({ where: { id }, data, include: { lines: { orderBy: { lineNo: 'asc' } } } })
  })

  const transition =
    (fn: (id: number, userId: number) => Promise<unknown>) => async (request: FastifyRequest, reply: FastifyReply) => {
      const id = idOf(request)
      if (!Number.isInteger(id)) return reply.code(400).send({ error: 'Invalid id' })
      try {
        return await fn(id, request.user.sub)
      } catch (err) {
        if (err instanceof ProcurementError) return reply.code(409).send({ error: err.message })
        throw err
      }
    }

  app.post('/:id/submit', { preHandler: [app.authenticate, app.requireWrite] }, transition((id) => submitOrder(id)))
  app.post('/:id/approve', { preHandler: [app.authenticate, app.requireWrite] }, transition((id, userId) => approveOrder(id, userId)))
  app.post('/:id/reject', { preHandler: [app.authenticate, app.requireWrite] }, transition((id) => rejectOrder(id)))
  app.post('/:id/cancel', { preHandler: [app.authenticate, app.requireWrite] }, transition((id) => cancelOrder(id)))

  // Mal kabul → WMS stok girişi
  app.post('/:id/receive', { preHandler: [app.authenticate, app.requireWrite] }, async (request, reply) => {
    const id = idOf(request)
    if (!Number.isInteger(id)) return reply.code(400).send({ error: 'Invalid id' })
    const parsed = receiveSchema.safeParse(request.body)
    if (!parsed.success) return reply.code(400).send({ error: 'Invalid body', details: parsed.error.flatten() })
    try {
      return await receiveOrder(id, parsed.data.lines, request.user.sub, new Date())
    } catch (err) {
      if (err instanceof ProcurementError) return reply.code(409).send({ error: err.message })
      throw err
    }
  })
}
