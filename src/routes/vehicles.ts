import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { getCompanyId } from '../lib/company.js'

const types = ['TRUCK', 'VAN', 'CAR', 'MOTORCYCLE'] as const

const createSchema = z.object({
  plateNo: z.string().min(1).max(20),
  name: z.string().max(100).optional(),
  type: z.enum(types).optional(),
  capacityKg: z.number().nonnegative().optional(),
  capacityM3: z.number().nonnegative().optional(),
  isActive: z.boolean().optional(),
})
const updateSchema = createSchema.partial()

export async function vehicleRoutes(app: FastifyInstance) {
  app.get('/', async (request) => {
    return prisma.tBLVEHICLE.findMany({ where: { companyId: getCompanyId(request) }, orderBy: { plateNo: 'asc' } })
  })

  app.get('/:id', async (request, reply) => {
    const id = Number((request.params as { id: string }).id)
    if (!Number.isInteger(id)) return reply.code(400).send({ error: 'Invalid id' })
    const vehicle = await prisma.tBLVEHICLE.findFirst({ where: { id, companyId: getCompanyId(request) } })
    if (!vehicle) return reply.code(404).send({ error: 'Vehicle not found' })
    return vehicle
  })

  app.post('/', { preHandler: [app.authenticate, app.requireWrite] }, async (request, reply) => {
    const parsed = createSchema.safeParse(request.body)
    if (!parsed.success) return reply.code(400).send({ error: 'Invalid body', details: parsed.error.flatten() })
    try {
      const vehicle = await prisma.tBLVEHICLE.create({ data: { ...parsed.data, companyId: getCompanyId(request) } })
      return reply.code(201).send(vehicle)
    } catch (err) {
      if ((err as { code?: string }).code === 'P2002') return reply.code(409).send({ error: 'Plaka zaten kayıtlı' })
      throw err
    }
  })

  app.patch('/:id', { preHandler: [app.authenticate, app.requireWrite] }, async (request, reply) => {
    const id = Number((request.params as { id: string }).id)
    if (!Number.isInteger(id)) return reply.code(400).send({ error: 'Invalid id' })
    const parsed = updateSchema.safeParse(request.body)
    if (!parsed.success) return reply.code(400).send({ error: 'Invalid body', details: parsed.error.flatten() })
    const existing = await prisma.tBLVEHICLE.findFirst({ where: { id, companyId: getCompanyId(request) } })
    if (!existing) return reply.code(404).send({ error: 'Vehicle not found' })
    try {
      return await prisma.tBLVEHICLE.update({ where: { id }, data: parsed.data })
    } catch (err) {
      if ((err as { code?: string }).code === 'P2002') return reply.code(409).send({ error: 'Plaka zaten kayıtlı' })
      throw err
    }
  })

  app.delete('/:id', { preHandler: [app.authenticate, app.requireWrite] }, async (request, reply) => {
    const id = Number((request.params as { id: string }).id)
    if (!Number.isInteger(id)) return reply.code(400).send({ error: 'Invalid id' })
    const existing = await prisma.tBLVEHICLE.findFirst({ where: { id, companyId: getCompanyId(request) } })
    if (!existing) return reply.code(404).send({ error: 'Vehicle not found' })
    try {
      await prisma.tBLVEHICLE.delete({ where: { id } })
      return reply.code(204).send()
    } catch (err) {
      if ((err as { code?: string }).code === 'P2003') return reply.code(409).send({ error: 'Araç kullanımda — silinemez' })
      throw err
    }
  })
}
