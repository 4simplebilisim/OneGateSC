import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { getCompanyId } from '../lib/company.js'
import { createCount, setCounted, completeCount, cancelCount, CountingError } from '../lib/counting.js'

const createSchema = z.object({
  countNo: z.string().min(1).max(40),
  warehouseId: z.number().int().positive(),
  note: z.string().max(500).optional(),
})

const idOf = (request: FastifyRequest) => Number((request.params as { id: string }).id)

export async function stockCountRoutes(app: FastifyInstance) {
  app.get('/', async (request) => {
    return prisma.tBLSTOCKCOUNT.findMany({
      where: { companyId: getCompanyId(request) },
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
      const count = await createCount(getCompanyId(request), parsed.data.warehouseId, parsed.data.countNo, request.user.sub, parsed.data.note)
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
}
