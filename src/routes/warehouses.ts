import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { getCompanyId, companyListFilter } from '../lib/company.js'
import { firstBadRef } from '../lib/refGuard.js'

const createSchema = z.object({
  code: z.string().min(1).max(20),
  name: z.string().min(1).max(100),
  facilityId: z.number().int().positive().optional(),
  isActive: z.boolean().optional(),
})

const updateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  facilityId: z.number().int().positive().nullable().optional(),
  isActive: z.boolean().optional(),
})

export async function warehouseRoutes(app: FastifyInstance) {
  app.get('/', async (request) => {
    // ?facilityId — Tesis→Depo cascade: seçilen tesisin depoları
    const q = request.query as { facilityId?: string }
    const facilityId = q.facilityId ? Number(q.facilityId) : undefined
    return prisma.tBLWAREHOUSE.findMany({
      where: { ...companyListFilter(request), ...(facilityId ? { facilityId } : {}) },
      orderBy: { code: 'asc' },
    })
  })

  app.get('/:id', async (request, reply) => {
    const id = Number((request.params as { id: string }).id)
    if (!Number.isInteger(id)) return reply.code(400).send({ error: 'Invalid id' })

    const warehouse = await prisma.tBLWAREHOUSE.findUnique({
      where: { id },
      include: { locations: { orderBy: { code: 'asc' } } },
    })
    if (!warehouse) return reply.code(404).send({ error: 'Warehouse not found' })
    return warehouse
  })

  app.post('/', { preHandler: [app.authenticate, app.requireWrite] }, async (request, reply) => {
    const parsed = createSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.code(400).send({ error: 'Invalid body', details: parsed.error.flatten() })
    }
    const companyId = getCompanyId(request)
    const bad = await firstBadRef(companyId, [['tesis', 'facility', parsed.data.facilityId]])
    if (bad) return reply.code(400).send({ error: `Geçersiz ${bad} — bu firmaya ait değil` })
    try {
      const warehouse = await prisma.tBLWAREHOUSE.create({
        data: { ...parsed.data, companyId },
      })
      return reply.code(201).send(warehouse)
    } catch (err) {
      const code = (err as { code?: string }).code
      if (code === 'P2002') return reply.code(409).send({ error: 'Warehouse code already exists' })
      if (code === 'P2003') return reply.code(400).send({ error: 'Geçersiz tesis' })
      throw err
    }
  })

  app.patch('/:id', { preHandler: [app.authenticate, app.requireWrite] }, async (request, reply) => {
    const id = Number((request.params as { id: string }).id)
    if (!Number.isInteger(id)) return reply.code(400).send({ error: 'Invalid id' })
    const parsed = updateSchema.safeParse(request.body)
    if (!parsed.success) return reply.code(400).send({ error: 'Invalid body', details: parsed.error.flatten() })
    const existing = await prisma.tBLWAREHOUSE.findFirst({ where: { id, ...companyListFilter(request) } })
    if (!existing) return reply.code(404).send({ error: 'Warehouse not found' })
    const bad = await firstBadRef(existing.companyId, [['tesis', 'facility', parsed.data.facilityId]])
    if (bad) return reply.code(400).send({ error: `Geçersiz ${bad} — bu firmaya ait değil` })
    try {
      return await prisma.tBLWAREHOUSE.update({ where: { id }, data: parsed.data })
    } catch (err) {
      if ((err as { code?: string }).code === 'P2003') return reply.code(400).send({ error: 'Geçersiz tesis' })
      throw err
    }
  })
}
