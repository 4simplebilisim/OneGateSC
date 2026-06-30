import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { getCompanyId, companyListFilter } from '../lib/company.js'
import {
  submitSalesOrder,
  approveSalesOrder,
  rejectSalesOrder,
  cancelSalesOrder,
  shipOrder,
  allocateOrder,
  deallocateOrder,
  shipAllocatedOrder,
  createPickOrder,
  SalesError,
} from '../lib/sales.js'
import { MovementError } from '../lib/movement.js'
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
  customerId: z.number().int().positive(),
  warehouseId: z.number().int().positive(),
  requestedDate: z.string().optional(),
  currency: z.string().length(3).optional(),
  exchangeRate: z.number().positive().optional(),
  note: z.string().max(500).optional(),
  lines: z.array(lineSchema).min(1),
})

const shipSchema = z.object({
  lines: z
    .array(
      z.object({
        lineId: z.number().int().positive(),
        quantity: z.number().positive(),
        sourceLocationId: z.number().int().positive(),
        sourceStatusId: z.number().int().positive().optional(),
        batchNo: z.string().max(100).optional(),
        serialNo: z.string().max(100).optional(),
        palletId: z.number().int().positive().optional(),
      }),
    )
    .min(1),
})

const idOf = (request: FastifyRequest) => Number((request.params as { id: string }).id)

export async function salesOrderRoutes(app: FastifyInstance) {
  app.get('/', async (request) => {
    const q = request.query as { status?: string; customerId?: string }
    const statuses = ['DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED', 'COMPLETED', 'CANCELLED'] as const
    const where = {
      companyId: getCompanyId(request),
      customerId: q.customerId ? Number(q.customerId) : undefined,
      status: statuses.includes(q.status as (typeof statuses)[number]) ? (q.status as (typeof statuses)[number]) : undefined,
    }
    const p = parsePagination(request)
    const [data, total] = await Promise.all([
      prisma.tBLSALESORDER.findMany({ where, orderBy: { id: 'desc' }, include: { _count: { select: { lines: true } } }, skip: p.skip, take: p.take }),
      prisma.tBLSALESORDER.count({ where }),
    ])
    return paginated(data, total, p)
  })

  app.get('/:id', async (request, reply) => {
    const id = idOf(request)
    if (!Number.isInteger(id)) return reply.code(400).send({ error: 'Invalid id' })
    const order = await prisma.tBLSALESORDER.findUnique({ where: { id }, include: { lines: { orderBy: { lineNo: 'asc' } } } })
    if (!order) return reply.code(404).send({ error: 'Sales order not found' })
    return order
  })

  app.post('/', { preHandler: [app.authenticate, app.requireWrite] }, async (request, reply) => {
    const parsed = createSchema.safeParse(request.body)
    if (!parsed.success) return reply.code(400).send({ error: 'Invalid body', details: parsed.error.flatten() })

    const companyId = getCompanyId(request)
    const { lines, requestedDate, ...header } = parsed.data

    const customer = await prisma.tBLBUSINESSPARTNER.findFirst({ where: { id: header.customerId, companyId } })
    if (!customer) return reply.code(400).send({ error: 'Customer not found in this company' })
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
      const order = await prisma.tBLSALESORDER.create({
        data: {
          ...header,
          companyId,
          createdById: request.user.sub,
          requestedDate: requestedDate ? new Date(requestedDate) : undefined,
          ...totals,
          lines: { create: orderLines.map((l) => ({ ...l, companyId })) },
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
    requestedDate: z.string().nullable().optional(),
    currency: z.string().length(3).optional(),
    exchangeRate: z.number().positive().optional(),
    lines: z.array(lineSchema).min(1).optional(),
  })
  app.patch('/:id', { preHandler: [app.authenticate, app.requireWrite] }, async (request, reply) => {
    const id = idOf(request)
    if (!Number.isInteger(id)) return reply.code(400).send({ error: 'Invalid id' })
    const parsed = editSchema.safeParse(request.body)
    if (!parsed.success) return reply.code(400).send({ error: 'Invalid body', details: parsed.error.flatten() })
    const order = await prisma.tBLSALESORDER.findFirst({ where: { id, ...companyListFilter(request) } })
    if (!order) return reply.code(404).send({ error: 'Sales order not found' })
    if (order.status !== 'DRAFT') return reply.code(409).send({ error: `Sadece DRAFT sipariş düzenlenebilir (mevcut: ${order.status})` })

    const { lines, requestedDate, ...rest } = parsed.data
    const data: Record<string, unknown> = { ...rest }
    if (requestedDate !== undefined) data.requestedDate = requestedDate ? new Date(requestedDate) : null

    if (lines) {
      const orderLines = lines.map((l, i) => ({ lineNo: i + 1, productId: l.productId, unitId: l.unitId, quantity: l.quantity, note: l.note, ...computeLineFinance(l) }))
      Object.assign(data, computeOrderTotals(orderLines))
      return prisma.$transaction(async (tx) => {
        await tx.tBLSALESORDERLINE.deleteMany({ where: { orderId: id } })
        return tx.tBLSALESORDER.update({ where: { id }, data: { ...data, lines: { create: orderLines.map((l) => ({ ...l, companyId: order.companyId })) } }, include: { lines: { orderBy: { lineNo: 'asc' } } } })
      })
    }
    return prisma.tBLSALESORDER.update({ where: { id }, data, include: { lines: { orderBy: { lineNo: 'asc' } } } })
  })

  const transition =
    (fn: (id: number, userId: number) => Promise<unknown>) => async (request: FastifyRequest, reply: FastifyReply) => {
      const id = idOf(request)
      if (!Number.isInteger(id)) return reply.code(400).send({ error: 'Invalid id' })
      try {
        return await fn(id, request.user.sub)
      } catch (err) {
        if (err instanceof SalesError) return reply.code(409).send({ error: err.message })
        throw err
      }
    }

  app.post('/:id/submit', { preHandler: [app.authenticate, app.requireWrite] }, transition((id) => submitSalesOrder(id)))
  app.post('/:id/approve', { preHandler: [app.authenticate, app.requireWrite] }, transition((id, userId) => approveSalesOrder(id, userId)))
  app.post('/:id/reject', { preHandler: [app.authenticate, app.requireWrite] }, transition((id) => rejectSalesOrder(id)))
  app.post('/:id/cancel', { preHandler: [app.authenticate, app.requireWrite] }, transition((id) => cancelSalesOrder(id)))

  // Allocation zinciri: stok ayır (FEFO) / serbest bırak / ayrılandan sevk
  app.post('/:id/allocate', { preHandler: [app.authenticate, app.requireWrite] }, transition((id) => allocateOrder(id)))
  app.post('/:id/deallocate', { preHandler: [app.authenticate, app.requireWrite] }, transition((id) => deallocateOrder(id)))
  // Toplama emri (pick work order) üret — yönlendirilmiş toplama, ayrılmış stoktan
  app.post('/:id/create-pick-order', { preHandler: [app.authenticate, app.requireWrite] }, transition((id, userId) => createPickOrder(id, userId)))
  app.post('/:id/ship-allocated', { preHandler: [app.authenticate, app.requireWrite] }, async (request, reply) => {
    const id = idOf(request)
    if (!Number.isInteger(id)) return reply.code(400).send({ error: 'Invalid id' })
    try {
      return await shipAllocatedOrder(id, request.user.sub, new Date())
    } catch (err) {
      if (err instanceof SalesError || err instanceof MovementError) return reply.code(409).send({ error: err.message })
      throw err
    }
  })

  // Sevk → WMS stok çıkışı (yetersiz stok 409)
  app.post('/:id/ship', { preHandler: [app.authenticate, app.requireWrite] }, async (request, reply) => {
    const id = idOf(request)
    if (!Number.isInteger(id)) return reply.code(400).send({ error: 'Invalid id' })
    const parsed = shipSchema.safeParse(request.body)
    if (!parsed.success) return reply.code(400).send({ error: 'Invalid body', details: parsed.error.flatten() })
    try {
      return await shipOrder(id, parsed.data.lines, request.user.sub, new Date())
    } catch (err) {
      if (err instanceof SalesError || err instanceof MovementError) return reply.code(409).send({ error: err.message })
      throw err
    }
  })
}
