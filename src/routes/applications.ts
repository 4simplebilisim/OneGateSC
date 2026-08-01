import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { getCompanyId, companyListFilter } from '../lib/company.js'
import { listUserApps } from '../lib/entitlements.js'

// Ürün kataloğu (WMS · Satınalma …) + firma lisansı. Katalog süper-admin işi; lisans firma bazlı.
const licenseSchema = z.object({
  companyId: z.number().int().positive().nullish(),
  applicationId: z.number().int().positive(),
  isActive: z.boolean().optional(),
  validFrom: z.coerce.date().nullish(),
  validUntil: z.coerce.date().nullish(),
  userLimit: z.number().int().positive().nullish(),
  note: z.string().max(255).nullish(),
})

export async function applicationRoutes(app: FastifyInstance) {
  // Kullanıcının erişebildiği ürünler — uygulama değiştirici bunu tüketir
  app.get('/apps', { preHandler: [app.authenticate] }, async (request) => {
    const u = request.user as { sub: number; companyId?: number | null }
    return listUserApps(u.sub, u.companyId ?? null)
  })

  // Ürün kataloğu (yönetim)
  app.get('/applications', { preHandler: [app.authenticate] }, async () =>
    prisma.tBLAPPLICATION.findMany({ orderBy: { sortOrder: 'asc' } }))

  app.get('/company-licenses', { preHandler: [app.authenticate, app.requireAdmin] }, async (request) => {
    const rows = await prisma.tBLCOMPANYLICENSE.findMany({
      where: companyListFilter(request),
      include: { application: { select: { code: true, name: true } } },
      orderBy: [{ companyId: 'asc' }, { applicationId: 'asc' }],
    })
    return rows.map((r) => ({ ...r, applicationCode: r.application.code, applicationName: r.application.name }))
  })

  app.get('/company-licenses/:id', { preHandler: [app.authenticate, app.requireAdmin] }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const row = await prisma.tBLCOMPANYLICENSE.findFirst({ where: { id: Number(id), ...companyListFilter(request) } })
    if (!row) return reply.code(404).send({ error: 'Bulunamadı' })
    return row
  })

  app.post('/company-licenses', { preHandler: [app.authenticate, app.requireAdmin] }, async (request, reply) => {
    const parsed = licenseSchema.safeParse(request.body)
    if (!parsed.success) return reply.code(400).send({ error: 'Invalid body', details: parsed.error.flatten() })
    const { companyId, ...rest } = parsed.data
    const target = companyId ?? getCompanyId(request)
    if (!(await prisma.tBLAPPLICATION.findUnique({ where: { id: rest.applicationId } })))
      return reply.code(400).send({ error: 'Geçersiz ürün' })
    try {
      return await prisma.tBLCOMPANYLICENSE.create({ data: { ...rest, companyId: target } })
    } catch (e) {
      if ((e as { code?: string }).code === 'P2002') return reply.code(409).send({ error: 'Bu firma için ürün lisansı zaten var' })
      throw e
    }
  })

  app.patch('/company-licenses/:id', { preHandler: [app.authenticate, app.requireAdmin] }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const parsed = licenseSchema.partial().safeParse(request.body)
    if (!parsed.success) return reply.code(400).send({ error: 'Invalid body', details: parsed.error.flatten() })
    const existing = await prisma.tBLCOMPANYLICENSE.findFirst({ where: { id: Number(id), ...companyListFilter(request) } })
    if (!existing) return reply.code(404).send({ error: 'Bulunamadı' })
    const { companyId: _ignored, ...rest } = parsed.data
    return prisma.tBLCOMPANYLICENSE.update({ where: { id: Number(id) }, data: rest })
  })

  app.delete('/company-licenses/:id', { preHandler: [app.authenticate, app.requireAdmin] }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const existing = await prisma.tBLCOMPANYLICENSE.findFirst({ where: { id: Number(id), ...companyListFilter(request) } })
    if (!existing) return reply.code(404).send({ error: 'Bulunamadı' })
    await prisma.tBLCOMPANYLICENSE.delete({ where: { id: Number(id) } })
    return { ok: true }
  })

  // Kullanıcı × ürün erişim kısıtı (satır yoksa lisanslı tümü)
  app.get('/user-app-access', { preHandler: [app.authenticate, app.requireAdmin] }, async (request) => {
    const q = request.query as { userId?: string }
    return prisma.tBLUSERAPPACCESS.findMany({
      where: q.userId ? { userId: Number(q.userId) } : {},
      orderBy: { id: 'asc' },
    })
  })

  app.put('/user-app-access', { preHandler: [app.authenticate, app.requireAdmin] }, async (request, reply) => {
    const schema = z.object({ userId: z.number().int().positive(), applicationIds: z.array(z.number().int().positive()) })
    const parsed = schema.safeParse(request.body)
    if (!parsed.success) return reply.code(400).send({ error: 'Invalid body', details: parsed.error.flatten() })
    const { userId, applicationIds } = parsed.data
    const companyId = getCompanyId(request)
    if (!(await prisma.tBLUSER.findFirst({ where: { id: userId, companyId } })))
      return reply.code(400).send({ error: 'Geçersiz kullanıcı' })
    // Tüm ürünler seçiliyse kısıt yok demektir → satırları sil
    const total = await prisma.tBLAPPLICATION.count({ where: { isActive: true } })
    return prisma.$transaction(async (tx) => {
      await tx.tBLUSERAPPACCESS.deleteMany({ where: { userId } })
      if (applicationIds.length && applicationIds.length < total) {
        await tx.tBLUSERAPPACCESS.createMany({ data: applicationIds.map((applicationId) => ({ userId, applicationId })) })
      }
      return { userId, restricted: applicationIds.length > 0 && applicationIds.length < total }
    })
  })
}
