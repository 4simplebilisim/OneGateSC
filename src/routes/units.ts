import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { getCompanyId, companyListFilter } from '../lib/company.js'

const createSchema = z.object({
  code: z.string().min(1).max(20),
  name: z.string().min(1).max(50),
  isActive: z.boolean().optional(),
})

const updateSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  isActive: z.boolean().optional(),
})

export async function unitRoutes(app: FastifyInstance) {
  app.get('/', async (request) => {
    return prisma.tBLUNIT.findMany({
      where: companyListFilter(request),
      orderBy: { code: 'asc' },
    })
  })

  app.get('/:id', async (request, reply) => {
    const id = Number((request.params as { id: string }).id)
    if (!Number.isInteger(id)) return reply.code(400).send({ error: 'Invalid id' })
    const row = await prisma.tBLUNIT.findFirst({ where: { id, ...companyListFilter(request) } })
    if (!row) return reply.code(404).send({ error: 'Birim bulunamadı' })
    return row
  })

  app.delete('/:id', { preHandler: [app.authenticate, app.requireWrite] }, async (request, reply) => {
    const id = Number((request.params as { id: string }).id)
    if (!Number.isInteger(id)) return reply.code(400).send({ error: 'Invalid id' })
    try {
      const res = await prisma.tBLUNIT.deleteMany({ where: { id, ...companyListFilter(request) } })
      if (res.count === 0) return reply.code(404).send({ error: 'Birim bulunamadı' })
      return reply.code(204).send()
    } catch (err) {
      if ((err as { code?: string }).code === 'P2003') return reply.code(409).send({ error: 'Bu birime bağlı kayıt var (ürün birimi vb.) — silmek yerine pasife alın' })
      throw err
    }
  })

  app.post('/', { preHandler: [app.authenticate, app.requireWrite] }, async (request, reply) => {
    const parsed = createSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.code(400).send({ error: 'Invalid body', details: parsed.error.flatten() })
    }
    try {
      const unit = await prisma.tBLUNIT.create({
        data: { ...parsed.data, companyId: getCompanyId(request) },
      })
      return reply.code(201).send(unit)
    } catch (err) {
      if ((err as { code?: string }).code === 'P2002') {
        return reply.code(409).send({ error: 'Unit code already exists' })
      }
      throw err
    }
  })

  app.patch('/:id', { preHandler: [app.authenticate, app.requireWrite] }, async (request, reply) => {
    const id = Number((request.params as { id: string }).id)
    if (!Number.isInteger(id)) return reply.code(400).send({ error: 'Invalid id' })
    const parsed = updateSchema.safeParse(request.body)
    if (!parsed.success) return reply.code(400).send({ error: 'Invalid body', details: parsed.error.flatten() })
    const existing = await prisma.tBLUNIT.findFirst({ where: { id, ...companyListFilter(request) } })
    if (!existing) return reply.code(404).send({ error: 'Unit not found' })
    return prisma.tBLUNIT.update({ where: { id }, data: parsed.data })
  })
}
