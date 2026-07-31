import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { getCompanyId, companyListFilter } from '../lib/company.js'
import { nextSequence, SequenceError } from '../lib/sequence.js'

const createSchema = z.object({
  code: z.string().min(1).max(20),
  name: z.string().min(1).max(100),
  prefix: z.string().max(20).optional(),
  prefix2: z.string().max(200).optional(),
  padLength: z.number().int().min(1).max(20).optional(),
  startNo: z.number().int().min(0).optional(),
  endNo: z.number().int().positive().optional(),
  isAutomatic: z.boolean().optional(),
  isActive: z.boolean().optional(),
})

const updateSchema = createSchema.partial().omit({ code: true })

export async function sequenceRoutes(app: FastifyInstance) {
  app.get('/', async (request) => {
    return prisma.tBLSEQUENCE.findMany({ where: { ...companyListFilter(request) }, orderBy: { code: 'asc' } })
  })

  app.post('/', { preHandler: [app.authenticate, app.requireWrite] }, async (request, reply) => {
    const parsed = createSchema.safeParse(request.body)
    if (!parsed.success) return reply.code(400).send({ error: 'Invalid body', details: parsed.error.flatten() })
    try {
      const seq = await prisma.tBLSEQUENCE.create({ data: { ...parsed.data, companyId: getCompanyId(request) } })
      return reply.code(201).send(seq)
    } catch (err) {
      if ((err as { code?: string }).code === 'P2002') return reply.code(409).send({ error: 'Sayaç kodu zaten var' })
      throw err
    }
  })

  app.patch('/:id', { preHandler: [app.authenticate, app.requireWrite] }, async (request, reply) => {
    const id = Number((request.params as { id: string }).id)
    if (!Number.isInteger(id)) return reply.code(400).send({ error: 'Invalid id' })
    const parsed = updateSchema.safeParse(request.body)
    if (!parsed.success) return reply.code(400).send({ error: 'Invalid body', details: parsed.error.flatten() })
    const existing = await prisma.tBLSEQUENCE.findFirst({ where: { id, ...companyListFilter(request) } })
    if (!existing) return reply.code(404).send({ error: 'Sequence not found' })
    return prisma.tBLSEQUENCE.update({ where: { id }, data: parsed.data })
  })

  // Sonraki numarayı üret (atomik artar)
  app.post('/:code/next', { preHandler: [app.authenticate, app.requireWrite] }, async (request, reply) => {
    const code = (request.params as { code: string }).code
    try {
      return await nextSequence(getCompanyId(request), code)
    } catch (err) {
      if (err instanceof SequenceError) return reply.code(409).send({ error: err.message })
      throw err
    }
  })
}
