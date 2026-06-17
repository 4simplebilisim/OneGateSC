import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { getCompanyId } from '../lib/company.js'

const bodySchema = z.object({
  productId: z.number().int().positive(),
  warehouseId: z.number().int().positive(),
  minQty: z.number().nonnegative().optional(),
  maxQty: z.number().nonnegative().optional(),
  reorderPoint: z.number().nonnegative().optional(),
  reorderQty: z.number().nonnegative().optional(),
  isActive: z.boolean().optional(),
})
const updateSchema = bodySchema.omit({ productId: true, warehouseId: true }).partial()

export async function inventoryRuleRoutes(app: FastifyInstance) {
  app.get('/', async (request) => {
    const q = request.query as { productId?: string }
    return prisma.tBLINVENTORYRULE.findMany({
      where: { productId: q.productId ? Number(q.productId) : undefined, companyId: getCompanyId(request) },
      include: { warehouse: { select: { code: true, name: true } } },
      orderBy: { id: 'asc' },
    })
  })

  app.post('/', { preHandler: [app.authenticate, app.requireWrite] }, async (request, reply) => {
    const parsed = bodySchema.safeParse(request.body)
    if (!parsed.success) return reply.code(400).send({ error: 'Invalid body', details: parsed.error.flatten() })
    const product = await prisma.tBLPRODUCT.findFirst({ where: { id: parsed.data.productId, companyId: getCompanyId(request) } })
    if (!product) return reply.code(400).send({ error: 'Geçersiz ürün' })
    try {
      return reply.code(201).send(await prisma.tBLINVENTORYRULE.create({
        data: { ...parsed.data, companyId: getCompanyId(request) },
        include: { warehouse: { select: { code: true, name: true } } },
      }))
    } catch (e) {
      if ((e as { code?: string }).code === 'P2002') return reply.code(409).send({ error: 'Bu ürün-depo kombinasyonu zaten tanımlı' })
      throw e
    }
  })

  app.patch('/:id', { preHandler: [app.authenticate, app.requireWrite] }, async (request, reply) => {
    const id = Number((request.params as { id: string }).id)
    const parsed = updateSchema.safeParse(request.body)
    if (!parsed.success) return reply.code(400).send({ error: 'Invalid body' })
    const existing = await prisma.tBLINVENTORYRULE.findFirst({ where: { id, companyId: getCompanyId(request) } })
    if (!existing) return reply.code(404).send({ error: 'Not found' })
    return prisma.tBLINVENTORYRULE.update({ where: { id }, data: parsed.data, include: { warehouse: { select: { code: true, name: true } } } })
  })

  app.delete('/:id', { preHandler: [app.authenticate, app.requireWrite] }, async (request, reply) => {
    const id = Number((request.params as { id: string }).id)
    const existing = await prisma.tBLINVENTORYRULE.findFirst({ where: { id, companyId: getCompanyId(request) } })
    if (!existing) return reply.code(404).send({ error: 'Not found' })
    await prisma.tBLINVENTORYRULE.delete({ where: { id } })
    return reply.code(204).send()
  })
}
