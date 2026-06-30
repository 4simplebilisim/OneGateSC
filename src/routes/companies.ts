import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { getCompanyId } from '../lib/company.js'

// Firma (tenant) yönetimi. Okuma: super-admin tümü, normal admin yalnız kendi firması.
// Yazma (oluştur/düzenle/sil): YALNIZ super-admin — firmalar cross-tenant'tır.
const select = { id: true, code: true, name: true, isActive: true } as const
const createSchema = z.object({
  code: z.string().min(1).max(40),
  name: z.string().min(1).max(150),
  isActive: z.boolean().optional(),
})
const updateSchema = createSchema.partial()

function requireSuper(request: FastifyRequest, reply: FastifyReply): boolean {
  if (!(request.user as { isSuperAdmin?: boolean }).isSuperAdmin) {
    reply.code(403).send({ error: 'Yalnız super-admin firma yönetebilir' })
    return false
  }
  return true
}

export async function companyRoutes(app: FastifyInstance) {
  app.get('/', { preHandler: [app.authenticate] }, async (request) => {
    const user = request.user as { isSuperAdmin?: boolean }
    if (user.isSuperAdmin) return prisma.tBLCOMPANY.findMany({ orderBy: { code: 'asc' }, select })
    return prisma.tBLCOMPANY.findMany({ where: { id: getCompanyId(request) }, orderBy: { code: 'asc' }, select })
  })

  app.get('/:id', { preHandler: [app.authenticate] }, async (request, reply) => {
    const id = Number((request.params as { id: string }).id)
    if (!Number.isInteger(id)) return reply.code(400).send({ error: 'Invalid id' })
    const user = request.user as { isSuperAdmin?: boolean }
    const where = user.isSuperAdmin ? { id } : { id, AND: { id: getCompanyId(request) } }
    const row = await prisma.tBLCOMPANY.findFirst({ where, select })
    if (!row) return reply.code(404).send({ error: 'Firma bulunamadı' })
    return row
  })

  app.post('/', { preHandler: [app.authenticate, app.requireWrite] }, async (request, reply) => {
    if (!requireSuper(request, reply)) return
    const parsed = createSchema.safeParse(request.body)
    if (!parsed.success) return reply.code(400).send({ error: 'Invalid body', details: parsed.error.flatten() })
    try {
      const row = await prisma.tBLCOMPANY.create({ data: parsed.data, select })
      return reply.code(201).send(row)
    } catch (err) {
      if ((err as { code?: string }).code === 'P2002') return reply.code(409).send({ error: 'Bu firma kodu zaten kullanımda' })
      throw err
    }
  })

  app.patch('/:id', { preHandler: [app.authenticate, app.requireWrite] }, async (request, reply) => {
    if (!requireSuper(request, reply)) return
    const id = Number((request.params as { id: string }).id)
    if (!Number.isInteger(id)) return reply.code(400).send({ error: 'Invalid id' })
    const parsed = updateSchema.safeParse(request.body)
    if (!parsed.success) return reply.code(400).send({ error: 'Invalid body', details: parsed.error.flatten() })
    const existing = await prisma.tBLCOMPANY.findUnique({ where: { id }, select: { id: true } })
    if (!existing) return reply.code(404).send({ error: 'Firma bulunamadı' })
    try {
      return await prisma.tBLCOMPANY.update({ where: { id }, data: parsed.data, select })
    } catch (err) {
      if ((err as { code?: string }).code === 'P2002') return reply.code(409).send({ error: 'Bu firma kodu zaten kullanımda' })
      throw err
    }
  })

  app.delete('/:id', { preHandler: [app.authenticate, app.requireWrite] }, async (request, reply) => {
    if (!requireSuper(request, reply)) return
    const id = Number((request.params as { id: string }).id)
    if (!Number.isInteger(id)) return reply.code(400).send({ error: 'Invalid id' })
    const existing = await prisma.tBLCOMPANY.findUnique({ where: { id }, select: { id: true } })
    if (!existing) return reply.code(404).send({ error: 'Firma bulunamadı' })
    // Kullanıcısı olan firma silinemez — yoksa firma→user SetNull ile kullanıcı(lar) firmasız kalır
    // (super-admin'in ev firması böyle silinip context'i kırılmıştı).
    const userCount = await prisma.tBLUSER.count({ where: { companyId: id } })
    if (userCount > 0) return reply.code(409).send({ error: 'Bu firmaya bağlı kullanıcı(lar) var — silinemez (önce kullanıcıları taşıyın/silin)' })
    try {
      await prisma.tBLCOMPANY.delete({ where: { id } })
    } catch (err) {
      if ((err as { code?: string }).code === 'P2003') {
        return reply.code(409).send({ error: 'Bu firmaya bağlı veri var — silmek yerine pasife alın (Aktif kapatın)' })
      }
      throw err
    }
    return reply.code(204).send()
  })
}
