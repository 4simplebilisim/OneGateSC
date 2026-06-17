import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { getCompanyId } from '../lib/company.js'
import {
  createInvoiceFromPurchaseOrder,
  createInvoiceFromSalesOrder,
  issueInvoice,
  payInvoice,
  cancelInvoice,
  InvoicingError,
} from '../lib/invoicing.js'

const idOf = (request: FastifyRequest) => Number((request.params as { id: string }).id)

export async function invoiceRoutes(app: FastifyInstance) {
  app.get('/', async (request) => {
    const q = request.query as { type?: string; status?: string; partnerId?: string }
    const types = ['PURCHASE', 'SALES'] as const
    const statuses = ['DRAFT', 'ISSUED', 'PAID', 'CANCELLED'] as const
    return prisma.tBLINVOICE.findMany({
      where: {
        companyId: getCompanyId(request),
        partnerId: q.partnerId ? Number(q.partnerId) : undefined,
        type: types.includes(q.type as (typeof types)[number]) ? (q.type as (typeof types)[number]) : undefined,
        status: statuses.includes(q.status as (typeof statuses)[number]) ? (q.status as (typeof statuses)[number]) : undefined,
      },
      orderBy: { id: 'desc' },
      include: { _count: { select: { lines: true } } },
    })
  })

  app.get('/:id', async (request, reply) => {
    const id = idOf(request)
    if (!Number.isInteger(id)) return reply.code(400).send({ error: 'Invalid id' })
    const inv = await prisma.tBLINVOICE.findUnique({ where: { id }, include: { lines: { orderBy: { lineNo: 'asc' } } } })
    if (!inv) return reply.code(404).send({ error: 'Invoice not found' })
    return inv
  })

  app.post('/from-purchase-order', { preHandler: [app.authenticate, app.requireWrite] }, async (request, reply) => {
    const body = z.object({ purchaseOrderId: z.number().int().positive(), invoiceNo: z.string().min(1).max(40) }).safeParse(request.body)
    if (!body.success) return reply.code(400).send({ error: 'Invalid body', details: body.error.flatten() })
    try {
      const inv = await createInvoiceFromPurchaseOrder(getCompanyId(request), body.data.purchaseOrderId, body.data.invoiceNo, request.user.sub)
      return reply.code(201).send(inv)
    } catch (err) {
      if (err instanceof InvoicingError) return reply.code(409).send({ error: err.message })
      throw err
    }
  })

  app.post('/from-sales-order', { preHandler: [app.authenticate, app.requireWrite] }, async (request, reply) => {
    const body = z.object({ salesOrderId: z.number().int().positive(), invoiceNo: z.string().min(1).max(40) }).safeParse(request.body)
    if (!body.success) return reply.code(400).send({ error: 'Invalid body', details: body.error.flatten() })
    try {
      const inv = await createInvoiceFromSalesOrder(getCompanyId(request), body.data.salesOrderId, body.data.invoiceNo, request.user.sub)
      return reply.code(201).send(inv)
    } catch (err) {
      if (err instanceof InvoicingError) return reply.code(409).send({ error: err.message })
      throw err
    }
  })

  const wrap = (fn: (id: number) => Promise<unknown>) => async (request: FastifyRequest, reply: FastifyReply) => {
    const id = idOf(request)
    if (!Number.isInteger(id)) return reply.code(400).send({ error: 'Invalid id' })
    try {
      return await fn(id)
    } catch (err) {
      if (err instanceof InvoicingError) return reply.code(409).send({ error: err.message })
      throw err
    }
  }

  app.post('/:id/issue', { preHandler: [app.authenticate, app.requireWrite] }, wrap((id) => issueInvoice(id)))
  app.post('/:id/cancel', { preHandler: [app.authenticate, app.requireWrite] }, wrap((id) => cancelInvoice(id)))
  app.post('/:id/pay', { preHandler: [app.authenticate, app.requireWrite] }, async (request, reply) => {
    const id = idOf(request)
    if (!Number.isInteger(id)) return reply.code(400).send({ error: 'Invalid id' })
    const body = z.object({ amount: z.number().positive() }).safeParse(request.body)
    if (!body.success) return reply.code(400).send({ error: 'Invalid body', details: body.error.flatten() })
    try {
      return await payInvoice(id, body.data.amount)
    } catch (err) {
      if (err instanceof InvoicingError) return reply.code(409).send({ error: err.message })
      throw err
    }
  })
}
