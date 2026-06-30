import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { getCompanyId, companyListFilter } from '../lib/company.js'

const createSchema = z.object({
  code: z.string().min(1).max(40),
  name: z.string().max(100).optional(),
  warehouseId: z.number().int().positive(),
  isActive: z.boolean().optional(),
})

const updateSchema = z.object({
  name: z.string().max(100).nullable().optional(),
  warehouseId: z.number().int().positive().optional(),
  isActive: z.boolean().optional(),
})

export async function areaRoutes(app: FastifyInstance) {
  app.get('/', async (request) => {
    const query = request.query as { warehouseId?: string }
    const warehouseId = query.warehouseId ? Number(query.warehouseId) : undefined
    return prisma.tBLAREA.findMany({
      where: { ...companyListFilter(request), ...(warehouseId ? { warehouseId } : {}) },
      include: { warehouse: { select: { code: true, name: true } } },
      orderBy: { code: 'asc' },
    })
  })

  app.get('/:id', async (request, reply) => {
    const id = Number((request.params as { id: string }).id)
    if (!Number.isInteger(id)) return reply.code(400).send({ error: 'Invalid id' })
    const area = await prisma.tBLAREA.findFirst({
      where: { id, ...companyListFilter(request) },
      include: { warehouse: { select: { code: true, name: true } }, locations: { orderBy: { code: 'asc' } } },
    })
    if (!area) return reply.code(404).send({ error: 'Area not found' })
    return area
  })

  app.post('/', { preHandler: [app.authenticate, app.requireWrite] }, async (request, reply) => {
    const parsed = createSchema.safeParse(request.body)
    if (!parsed.success) return reply.code(400).send({ error: 'Invalid body', details: parsed.error.flatten() })
    const companyId = getCompanyId(request)
    const wh = await prisma.tBLWAREHOUSE.findFirst({ where: { id: parsed.data.warehouseId, companyId } })
    if (!wh) return reply.code(400).send({ error: 'Warehouse not found' })
    try {
      // facilityId (Tesis) depodan türetilir — firma>tesis>depo tutarlılığı garanti
      const area = await prisma.tBLAREA.create({ data: { ...parsed.data, companyId, facilityId: wh.facilityId } })
      return reply.code(201).send(area)
    } catch (err) {
      if ((err as { code?: string }).code === 'P2002') return reply.code(409).send({ error: 'Area code already exists' })
      throw err
    }
  })

  app.patch('/:id', { preHandler: [app.authenticate, app.requireWrite] }, async (request, reply) => {
    const id = Number((request.params as { id: string }).id)
    if (!Number.isInteger(id)) return reply.code(400).send({ error: 'Invalid id' })
    const parsed = updateSchema.safeParse(request.body)
    if (!parsed.success) return reply.code(400).send({ error: 'Invalid body', details: parsed.error.flatten() })
    const existing = await prisma.tBLAREA.findFirst({ where: { id, ...companyListFilter(request) } })
    if (!existing) return reply.code(404).send({ error: 'Area not found' })
    // Depo değiştiyse facilityId'yi yeni depodan yeniden türet (tutarlılık)
    let facilityId: number | null | undefined
    if (parsed.data.warehouseId != null) {
      const wh = await prisma.tBLWAREHOUSE.findFirst({ where: { id: parsed.data.warehouseId, companyId: existing.companyId } })
      if (!wh) return reply.code(400).send({ error: 'Warehouse not found' })
      facilityId = wh.facilityId
    }
    return prisma.tBLAREA.update({ where: { id }, data: { ...parsed.data, ...(facilityId !== undefined ? { facilityId } : {}) } })
  })

  app.delete('/:id', { preHandler: [app.authenticate, app.requireWrite] }, async (request, reply) => {
    const id = Number((request.params as { id: string }).id)
    if (!Number.isInteger(id)) return reply.code(400).send({ error: 'Invalid id' })
    const existing = await prisma.tBLAREA.findFirst({ where: { id, ...companyListFilter(request) } })
    if (!existing) return reply.code(404).send({ error: 'Area not found' })
    try {
      await prisma.tBLAREA.delete({ where: { id } })
      return reply.code(204).send()
    } catch (err) {
      if ((err as { code?: string }).code === 'P2003') return reply.code(400).send({ error: 'Bu alana bağlı lokasyonlar var — önce onları taşıyın/silin' })
      throw err
    }
  })
}
