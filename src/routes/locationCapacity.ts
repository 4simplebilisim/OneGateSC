import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { getCompanyId, companyListFilter } from '../lib/company.js'

const createSchema = z.object({
  locationLinkType: z.enum(['LOCATION', 'LOCATION_GROUP']),
  locationLinkCode: z.number().int().positive(),
  materialLinkType: z.enum(['PRODUCT', 'PRODUCT_GROUP']).optional(),
  materialLinkCode: z.number().int().positive().optional(),
  quantity: z.number().nonnegative().optional(),
  unitId: z.number().int().positive().optional(),
  palletQty: z.number().nonnegative().optional(),
  toleranceQty: z.number().nonnegative().optional(),
  toleranceUnitId: z.number().int().positive().optional(),
  width: z.number().nonnegative().optional(),
  length: z.number().nonnegative().optional(),
  height: z.number().nonnegative().optional(),
  placementHeight: z.number().nonnegative().optional(),
  dimensionUnitId: z.number().int().positive().optional(),
  weight: z.number().nonnegative().optional(),
  weightUnitId: z.number().int().positive().optional(),
  messageType: z.enum(['ERROR', 'WARNING']).optional(),
  distributeToCells: z.boolean().optional(),
  isActive: z.boolean().optional(),
})
const updateSchema = createSchema.partial()

export async function locationCapacityRoutes(app: FastifyInstance) {
  app.get('/', async (request) =>
    prisma.tBLLOCATIONCAPACITY.findMany({ where: { ...companyListFilter(request) }, orderBy: { id: 'desc' } }),
  )

  app.post('/', { preHandler: [app.authenticate, app.requireWrite] }, async (request, reply) => {
    const parsed = createSchema.safeParse(request.body)
    if (!parsed.success) return reply.code(400).send({ error: 'Invalid body', details: parsed.error.flatten() })
    try {
      const row = await prisma.tBLLOCATIONCAPACITY.create({ data: { ...parsed.data, companyId: getCompanyId(request) } })
      return reply.code(201).send(row)
    } catch (err) {
      if ((err as { code?: string }).code === 'P2003') return reply.code(400).send({ error: 'Geçersiz referans (birim vb.)' })
      throw err
    }
  })

  app.patch('/:id', { preHandler: [app.authenticate, app.requireWrite] }, async (request, reply) => {
    const id = Number((request.params as { id: string }).id)
    if (!Number.isInteger(id)) return reply.code(400).send({ error: 'Invalid id' })
    const parsed = updateSchema.safeParse(request.body)
    if (!parsed.success) return reply.code(400).send({ error: 'Invalid body', details: parsed.error.flatten() })
    const existing = await prisma.tBLLOCATIONCAPACITY.findFirst({ where: { id, ...companyListFilter(request) } })
    if (!existing) return reply.code(404).send({ error: 'Location capacity not found' })
    return prisma.tBLLOCATIONCAPACITY.update({ where: { id }, data: parsed.data })
  })

  app.delete('/:id', { preHandler: [app.authenticate, app.requireWrite] }, async (request, reply) => {
    const id = Number((request.params as { id: string }).id)
    if (!Number.isInteger(id)) return reply.code(400).send({ error: 'Invalid id' })
    const res = await prisma.tBLLOCATIONCAPACITY.deleteMany({ where: { id, ...companyListFilter(request) } })
    if (res.count === 0) return reply.code(404).send({ error: 'Location capacity not found' })
    return { deleted: res.count }
  })
}
