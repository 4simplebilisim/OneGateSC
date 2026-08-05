import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { getCompanyId, companyListFilter } from '../lib/company.js'
import { suggestPutawayLocations } from '../lib/routing.js'

const createSchema = z.object({
  routingTypeId: z.number().int().positive().optional(),
  materialLinkType: z.enum(['PRODUCT', 'PRODUCT_GROUP']),
  materialLinkCode: z.number().int().positive(),
  locationLinkType: z.enum(['LOCATION', 'LOCATION_GROUP']),
  locationLinkCode: z.number().int().positive(),
  priority: z.number().int().optional(),
  isActive: z.boolean().optional(),
})

const updateSchema = createSchema.partial()

export async function routingRuleRoutes(app: FastifyInstance) {
  // Directed putaway önerisi — bir ürün için önerilen lokasyon(lar)
  app.get('/suggest', async (request, reply) => {
    const q = request.query as { productId?: string; operationTypeId?: string; facilityId?: string }
    const productId = Number(q.productId)
    if (!Number.isInteger(productId)) return reply.code(400).send({ error: 'productId (query) gerekli' })
    // operationTypeId verilirse Yönlendirme Tipi ↔ Operasyon eşlemesi uygulanır
    return suggestPutawayLocations(getCompanyId(request), productId, {
      operationTypeId: q.operationTypeId ? Number(q.operationTypeId) : null,
      facilityId: q.facilityId ? Number(q.facilityId) : null,
    })
  })

  app.get('/', async (request) =>
    prisma.tBLROUTINGRULE.findMany({
      where: { ...companyListFilter(request) },
      orderBy: [{ priority: 'asc' }, { id: 'asc' }],
      include: { routingType: { select: { code: true } } },
    }),
  )

  app.get('/:id', async (request, reply) => {
    const id = Number((request.params as { id: string }).id)
    if (!Number.isInteger(id)) return reply.code(400).send({ error: 'Invalid id' })
    const row = await prisma.tBLROUTINGRULE.findFirst({ where: { id, ...companyListFilter(request) } })
    if (!row) return reply.code(404).send({ error: 'Routing rule not found' })
    return row
  })

  app.post('/', { preHandler: [app.authenticate, app.requireWrite] }, async (request, reply) => {
    const parsed = createSchema.safeParse(request.body)
    if (!parsed.success) return reply.code(400).send({ error: 'Invalid body', details: parsed.error.flatten() })
    try {
      const row = await prisma.tBLROUTINGRULE.create({ data: { ...parsed.data, companyId: getCompanyId(request) } })
      return reply.code(201).send(row)
    } catch (err) {
      if ((err as { code?: string }).code === 'P2003') return reply.code(400).send({ error: 'Geçersiz yönlendirme tipi' })
      throw err
    }
  })

  app.patch('/:id', { preHandler: [app.authenticate, app.requireWrite] }, async (request, reply) => {
    const id = Number((request.params as { id: string }).id)
    if (!Number.isInteger(id)) return reply.code(400).send({ error: 'Invalid id' })
    const parsed = updateSchema.safeParse(request.body)
    if (!parsed.success) return reply.code(400).send({ error: 'Invalid body', details: parsed.error.flatten() })
    const existing = await prisma.tBLROUTINGRULE.findFirst({ where: { id, ...companyListFilter(request) } })
    if (!existing) return reply.code(404).send({ error: 'Routing rule not found' })
    return prisma.tBLROUTINGRULE.update({ where: { id }, data: parsed.data })
  })

  app.delete('/:id', { preHandler: [app.authenticate, app.requireWrite] }, async (request, reply) => {
    const id = Number((request.params as { id: string }).id)
    if (!Number.isInteger(id)) return reply.code(400).send({ error: 'Invalid id' })
    const res = await prisma.tBLROUTINGRULE.deleteMany({ where: { id, ...companyListFilter(request) } })
    if (res.count === 0) return reply.code(404).send({ error: 'Routing rule not found' })
    return { deleted: res.count }
  })
}
