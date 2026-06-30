import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { getCompanyId, companyListFilter } from '../lib/company.js'
import { parsePagination, paginated } from '../lib/pagination.js'

const bodySchema = z.object({ code: z.string().min(1).max(20), name: z.string().min(1).max(100), isActive: z.boolean().optional() })
const updateSchema = bodySchema.partial()

export async function productDetailTypeRoutes(app: FastifyInstance) {
  app.get('/', async (request) => {
    const q = request.query as { search?: string }
    const where = { ...companyListFilter(request), ...(q.search ? { OR: [{ code: { contains: q.search, mode: 'insensitive' as const } }, { name: { contains: q.search, mode: 'insensitive' as const } }] } : {}) }
    const p = parsePagination(request)
    const [data, total] = await Promise.all([
      prisma.tBLPRODUCTDETAILTYPE.findMany({ where, orderBy: { code: 'asc' }, skip: p.skip, take: p.take }),
      prisma.tBLPRODUCTDETAILTYPE.count({ where }),
    ])
    return paginated(data, total, p)
  })

  app.get('/:id', async (request, reply) => {
    const id = Number((request.params as { id: string }).id)
    const row = await prisma.tBLPRODUCTDETAILTYPE.findFirst({ where: { id, ...companyListFilter(request) } })
    if (!row) return reply.code(404).send({ error: 'Not found' })
    return row
  })

  app.post('/', { preHandler: [app.authenticate, app.requireWrite] }, async (request, reply) => {
    const parsed = bodySchema.safeParse(request.body)
    if (!parsed.success) return reply.code(400).send({ error: 'Invalid body', details: parsed.error.flatten() })
    try {
      return reply.code(201).send(await prisma.tBLPRODUCTDETAILTYPE.create({ data: { ...parsed.data, companyId: getCompanyId(request) } }))
    } catch (e) {
      if ((e as { code?: string }).code === 'P2002') return reply.code(409).send({ error: 'Kod zaten var' })
      throw e
    }
  })

  app.patch('/:id', { preHandler: [app.authenticate, app.requireWrite] }, async (request, reply) => {
    const id = Number((request.params as { id: string }).id)
    const parsed = updateSchema.safeParse(request.body)
    if (!parsed.success) return reply.code(400).send({ error: 'Invalid body' })
    const existing = await prisma.tBLPRODUCTDETAILTYPE.findFirst({ where: { id, ...companyListFilter(request) } })
    if (!existing) return reply.code(404).send({ error: 'Not found' })
    return prisma.tBLPRODUCTDETAILTYPE.update({ where: { id }, data: parsed.data })
  })

  app.delete('/:id', { preHandler: [app.authenticate, app.requireWrite] }, async (request, reply) => {
    const id = Number((request.params as { id: string }).id)
    const existing = await prisma.tBLPRODUCTDETAILTYPE.findFirst({ where: { id, ...companyListFilter(request) } })
    if (!existing) return reply.code(404).send({ error: 'Not found' })
    await prisma.tBLPRODUCTDETAILTYPE.delete({ where: { id } })
    return reply.code(204).send()
  })
}
