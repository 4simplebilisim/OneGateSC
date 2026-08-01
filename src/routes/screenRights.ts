import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { getCompanyId, companyListFilter } from '../lib/company.js'

// Ekran hakkı (aksiyon matrisi): kullanıcı/grup × ekran → İzle/Yeni/Düzenle/Sil.
// Kayıt yoksa tüm aksiyonlar serbest; grup birleşiminde false öncelikli (en kısıtlayıcı).
const upsertSchema = z.object({
  userId: z.number().int().positive().optional(),
  groupId: z.number().int().positive().optional(),
  resource: z.string().min(1).max(60),
  canView: z.boolean(),
  canAdd: z.boolean(),
  canEdit: z.boolean(),
  canDelete: z.boolean(),
}).refine((d) => (d.userId ? 1 : 0) + (d.groupId ? 1 : 0) === 1, { message: 'userId VEYA groupId (tam biri) gerekli' })

export async function screenRightRoutes(app: FastifyInstance) {
  app.get('/', { preHandler: [app.authenticate, app.requireAdmin] }, async (request) => {
    const q = request.query as { userId?: string; groupId?: string }
    return prisma.tBLUSERSCREENRIGHT.findMany({
      where: { ...companyListFilter(request), userId: q.userId ? Number(q.userId) : undefined, groupId: q.groupId ? Number(q.groupId) : undefined },
      orderBy: { id: 'asc' },
    })
  })

  // upsert: aynı owner+resource varsa güncelle, yoksa oluştur. Tüm aksiyonlar true → kayıt silinir (kısıtlama yok).
  app.post('/', { preHandler: [app.authenticate, app.requireAdmin] }, async (request, reply) => {
    const parsed = upsertSchema.safeParse(request.body)
    if (!parsed.success) return reply.code(400).send({ error: 'Invalid body', details: parsed.error.flatten() })
    const companyId = getCompanyId(request)
    const { userId, groupId, resource, canView, canAdd, canEdit, canDelete } = parsed.data
    if (userId) {
      if (!(await prisma.tBLUSER.findFirst({ where: { id: userId, companyId } }))) return reply.code(400).send({ error: 'Geçersiz kullanıcı' })
    } else {
      if (!(await prisma.tBLUSERGROUP.findFirst({ where: { id: groupId, companyId } }))) return reply.code(400).send({ error: 'Geçersiz grup' })
    }
    const existing = await prisma.tBLUSERSCREENRIGHT.findFirst({ where: { companyId, userId: userId ?? null, groupId: groupId ?? null, resource } })
    const allTrue = canView && canAdd && canEdit && canDelete
    if (allTrue) {
      if (existing) await prisma.tBLUSERSCREENRIGHT.delete({ where: { id: existing.id } })
      return reply.code(204).send()
    }
    if (existing) {
      const row = await prisma.tBLUSERSCREENRIGHT.update({ where: { id: existing.id }, data: { canView, canAdd, canEdit, canDelete } })
      return reply.code(200).send(row)
    }
    const row = await prisma.tBLUSERSCREENRIGHT.create({ data: { companyId, userId, groupId, resource, canView, canAdd, canEdit, canDelete } })
    return reply.code(201).send(row)
  })

  // Toplu kaydet (StokBar tarzı matris): tüm satırlar tek istekte — allTrue satırın kaydı silinir (kısıt yok)
  const bulkSchema = z.object({
    userId: z.number().int().positive().optional(),
    groupId: z.number().int().positive().optional(),
    rows: z.array(z.object({
      resource: z.string().min(1).max(60),
      canView: z.boolean(), canAdd: z.boolean(), canEdit: z.boolean(), canDelete: z.boolean(),
    })).min(1).max(500),
  }).refine((d) => (d.userId ? 1 : 0) + (d.groupId ? 1 : 0) === 1, { message: 'userId VEYA groupId (tam biri) gerekli' })
  app.put('/bulk', { preHandler: [app.authenticate, app.requireAdmin] }, async (request, reply) => {
    const parsed = bulkSchema.safeParse(request.body)
    if (!parsed.success) return reply.code(400).send({ error: 'Invalid body', details: parsed.error.flatten() })
    const companyId = getCompanyId(request)
    const { userId, groupId, rows } = parsed.data
    if (userId) {
      if (!(await prisma.tBLUSER.findFirst({ where: { id: userId, companyId } }))) return reply.code(400).send({ error: 'Geçersiz kullanıcı' })
    } else if (!(await prisma.tBLUSERGROUP.findFirst({ where: { id: groupId, companyId } }))) return reply.code(400).send({ error: 'Geçersiz grup' })
    const existing = await prisma.tBLUSERSCREENRIGHT.findMany({ where: { companyId, userId: userId ?? null, groupId: groupId ?? null } })
    const byRes = new Map(existing.map((e) => [e.resource, e]))
    let updated = 0, cleared = 0
    await prisma.$transaction(async (tx) => {
      for (const r of rows) {
        const cur = byRes.get(r.resource)
        const allTrue = r.canView && r.canAdd && r.canEdit && r.canDelete
        if (allTrue) {
          if (cur) { await tx.tBLUSERSCREENRIGHT.delete({ where: { id: cur.id } }); cleared++ }
        } else if (cur) {
          await tx.tBLUSERSCREENRIGHT.update({ where: { id: cur.id }, data: { canView: r.canView, canAdd: r.canAdd, canEdit: r.canEdit, canDelete: r.canDelete } })
          updated++
        } else {
          await tx.tBLUSERSCREENRIGHT.create({ data: { companyId, userId, groupId, resource: r.resource, canView: r.canView, canAdd: r.canAdd, canEdit: r.canEdit, canDelete: r.canDelete } })
          updated++
        }
      }
    })
    return { updated, cleared }
  })
}

type Rights = { view: boolean; add: boolean; edit: boolean; delete: boolean }

// Kullanıcının ekran hakları (doğrudan + grup, birleşik). Yalnız KISITLI ekranlar döner (bir aksiyonu false).
// false öncelikli: herhangi bir satır (kullanıcı/grup) false derse o aksiyon false.
export async function getUserScreenRights(userId: number): Promise<Record<string, Rights>> {
  const groups = await prisma.tBLUSERGROUPMEMBER.findMany({ where: { userId }, select: { groupId: true } })
  const groupIds = groups.map((g) => g.groupId)
  const rows = await prisma.tBLUSERSCREENRIGHT.findMany({
    where: { OR: [{ userId }, ...(groupIds.length ? [{ groupId: { in: groupIds } }] : [])] },
    select: { resource: true, canView: true, canAdd: true, canEdit: true, canDelete: true },
  })
  const out: Record<string, Rights> = {}
  for (const r of rows) {
    const cur = (out[r.resource] ??= { view: true, add: true, edit: true, delete: true })
    if (!r.canView) cur.view = false
    if (!r.canAdd) cur.add = false
    if (!r.canEdit) cur.edit = false
    if (!r.canDelete) cur.delete = false
  }
  return out
}
