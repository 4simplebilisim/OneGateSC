import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { getCompanyId } from '../lib/company.js'
import { createCount, setCounted, completeCount, cancelCount, reverseEqualize, countDifferences, CountingError } from '../lib/counting.js'

const createSchema = z.object({
  countNo: z.string().min(1).max(40),
  warehouseId: z.number().int().positive(),
  countType: z.string().max(20).optional(),
  locationId: z.number().int().positive().optional(), // kapsam: belirli lokasyon
  productId: z.number().int().positive().optional(), // kapsam: belirli ürün
  note: z.string().max(500).optional(),
})

const idOf = (request: FastifyRequest) => Number((request.params as { id: string }).id)

export async function stockCountRoutes(app: FastifyInstance) {
  app.get('/', async (request) => {
    const q = request.query as { status?: string }
    const statuses = ['DRAFT', 'COUNTING', 'COMPLETED', 'CANCELLED'] as const
    return prisma.tBLSTOCKCOUNT.findMany({
      where: {
        companyId: getCompanyId(request),
        status: statuses.includes(q.status as (typeof statuses)[number]) ? (q.status as (typeof statuses)[number]) : undefined,
      },
      orderBy: { id: 'desc' },
      include: { _count: { select: { lines: true } } },
    })
  })

  app.get('/:id', async (request, reply) => {
    const id = idOf(request)
    if (!Number.isInteger(id)) return reply.code(400).send({ error: 'Invalid id' })
    const count = await prisma.tBLSTOCKCOUNT.findUnique({ where: { id }, include: { lines: { orderBy: { lineNo: 'asc' } } } })
    if (!count) return reply.code(404).send({ error: 'Stock count not found' })
    return count
  })

  app.post('/', { preHandler: [app.authenticate, app.requireWrite] }, async (request, reply) => {
    const parsed = createSchema.safeParse(request.body)
    if (!parsed.success) return reply.code(400).send({ error: 'Invalid body', details: parsed.error.flatten() })
    try {
      const { warehouseId, countNo, note, countType, locationId, productId } = parsed.data
      const count = await createCount(getCompanyId(request), warehouseId, countNo, request.user.sub, { note, countType, locationId, productId })
      return reply.code(201).send(count)
    } catch (err) {
      if (err instanceof CountingError) return reply.code(409).send({ error: err.message })
      throw err
    }
  })

  app.post('/:id/lines/:lineId/count', { preHandler: [app.authenticate, app.requireWrite] }, async (request, reply) => {
    const id = idOf(request)
    const lineId = Number((request.params as { lineId: string }).lineId)
    if (!Number.isInteger(id) || !Number.isInteger(lineId)) return reply.code(400).send({ error: 'Invalid id' })
    const body = z.object({ countedQty: z.number().min(0) }).safeParse(request.body)
    if (!body.success) return reply.code(400).send({ error: 'Invalid body', details: body.error.flatten() })
    try {
      return await setCounted(id, lineId, body.data.countedQty)
    } catch (err) {
      if (err instanceof CountingError) return reply.code(409).send({ error: err.message })
      throw err
    }
  })

  const wrap = (fn: (id: number) => Promise<unknown>) => async (request: FastifyRequest, reply: FastifyReply) => {
    const id = idOf(request)
    if (!Number.isInteger(id)) return reply.code(400).send({ error: 'Invalid id' })
    try {
      return await fn(id)
    } catch (err) {
      if (err instanceof CountingError) return reply.code(409).send({ error: err.message })
      throw err
    }
  }

  app.post('/:id/complete', { preHandler: [app.authenticate, app.requireWrite] }, wrap((id) => completeCount(id, new Date())))
  app.post('/:id/cancel', { preHandler: [app.authenticate, app.requireWrite] }, wrap((id) => cancelCount(id)))
  app.post('/:id/reverse-equalize', { preHandler: [app.authenticate, app.requireWrite] }, wrap((id) => reverseEqualize(id)))
}

// Sayım Fark raporu (Sayım Fark / Onaylı Sayım Fark) — /api/count-differences
export async function countDifferenceRoutes(app: FastifyInstance) {
  app.get('/', async (request) => {
    const q = request.query as { completed?: string }
    return countDifferences(getCompanyId(request), q.completed === 'true')
  })
}
