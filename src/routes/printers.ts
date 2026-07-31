import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { getCompanyId, companyListFilter } from '../lib/company.js'

// Legacy-sade yazıcı (StokBar): Tesis (facility) + Yazıcı (name) + Yazıcı Adresi (UNC \\sunucu\yazici veya IP).
const createSchema = z.object({
  facilityId: z.number().int().positive(),
  name: z.string().min(1).max(120),
  address: z.string().min(1).max(200),
  isDefault: z.boolean().optional(),
  isActive: z.boolean().optional(),
})
const updateSchema = createSchema.partial()

// Tesis bu firmaya (tenant) ait mi?
async function facilityInCompany(companyId: number, facilityId: number): Promise<boolean> {
  return (await prisma.tBLFACILITY.count({ where: { id: facilityId, companyId } })) > 0
}

export async function printerRoutes(app: FastifyInstance) {
  app.get('/', async (request) =>
    prisma.tBLPRINTER.findMany({ where: { ...companyListFilter(request) }, orderBy: [{ isDefault: 'desc' }, { name: 'asc' }] }),
  )

  app.get('/:id', async (request, reply) => {
    const id = Number((request.params as { id: string }).id)
    if (!Number.isInteger(id)) return reply.code(400).send({ error: 'Invalid id' })
    const row = await prisma.tBLPRINTER.findFirst({ where: { id, ...companyListFilter(request) } })
    if (!row) return reply.code(404).send({ error: 'Printer not found' })
    return row
  })

  app.post('/', { preHandler: [app.authenticate, app.requireWrite] }, async (request, reply) => {
    const parsed = createSchema.safeParse(request.body)
    if (!parsed.success) return reply.code(400).send({ error: 'Invalid body', details: parsed.error.flatten() })
    const companyId = getCompanyId(request)
    if (!(await facilityInCompany(companyId, parsed.data.facilityId))) return reply.code(400).send({ error: 'Geçersiz tesis (bu firmaya ait değil)' })
    try {
      const row = await prisma.$transaction(async (tx) => {
        // Aynı tesiste tek varsayılan yazıcı
        if (parsed.data.isDefault) await tx.tBLPRINTER.updateMany({ where: { companyId, facilityId: parsed.data.facilityId }, data: { isDefault: false } })
        return tx.tBLPRINTER.create({ data: { ...parsed.data, companyId } })
      })
      return reply.code(201).send(row)
    } catch (err) {
      if ((err as { code?: string }).code === 'P2002') return reply.code(409).send({ error: 'Bu tesiste bu yazıcı adı zaten var' })
      throw err
    }
  })

  app.patch('/:id', { preHandler: [app.authenticate, app.requireWrite] }, async (request, reply) => {
    const id = Number((request.params as { id: string }).id)
    if (!Number.isInteger(id)) return reply.code(400).send({ error: 'Invalid id' })
    const parsed = updateSchema.safeParse(request.body)
    if (!parsed.success) return reply.code(400).send({ error: 'Invalid body', details: parsed.error.flatten() })
    const existing = await prisma.tBLPRINTER.findFirst({ where: { id, ...companyListFilter(request) } })
    if (!existing) return reply.code(404).send({ error: 'Printer not found' })
    // Tesis değişiyorsa, yeni tesis düzenlenen yazıcının firmasına ait olmalı (cross-company doğru doğrulama)
    if (parsed.data.facilityId != null && !(await facilityInCompany(existing.companyId, parsed.data.facilityId)))
      return reply.code(400).send({ error: 'Geçersiz tesis (bu firmaya ait değil)' })
    try {
      return await prisma.$transaction(async (tx) => {
        if (parsed.data.isDefault) await tx.tBLPRINTER.updateMany({ where: { companyId: existing.companyId, facilityId: parsed.data.facilityId ?? existing.facilityId }, data: { isDefault: false } })
        return tx.tBLPRINTER.update({ where: { id }, data: parsed.data })
      })
    } catch (err) {
      if ((err as { code?: string }).code === 'P2002') return reply.code(409).send({ error: 'Bu tesiste bu yazıcı adı zaten var' })
      throw err
    }
  })

  app.delete('/:id', { preHandler: [app.authenticate, app.requireWrite] }, async (request, reply) => {
    const id = Number((request.params as { id: string }).id)
    if (!Number.isInteger(id)) return reply.code(400).send({ error: 'Invalid id' })
    const res = await prisma.tBLPRINTER.deleteMany({ where: { id, ...companyListFilter(request) } })
    if (res.count === 0) return reply.code(404).send({ error: 'Printer not found' })
    return reply.code(204).send()
  })
}
