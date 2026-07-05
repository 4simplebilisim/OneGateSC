import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { getCompanyId, companyListFilter } from '../lib/company.js'
import { firstBadRef } from '../lib/refGuard.js'

// İş Atama — belge ↔ kullanıcı VEYA kullanıcı grubu. El terminalinde (op.applyAssignment açıksa)
// kullanıcı yalnız kendine/grubuna atanmış belgeleri görür.
const assignment = z.object({
  documentId: z.number().int().positive(),
  userId: z.number().int().positive().nullable().optional(),
  userGroupId: z.number().int().positive().nullable().optional(),
  note: z.string().max(200).optional(),
})

export async function documentAssignmentRoutes(app: FastifyInstance) {
  // Liste — belge/kullanıcı isimleriyle (documentId filtresi opsiyonel)
  app.get('/', async (request) => {
    const q = request.query as { documentId?: string }
    const rows = await prisma.tBLDOCUMENTASSIGNMENT.findMany({
      where: { ...companyListFilter(request), isActive: true, ...(q.documentId ? { documentId: Number(q.documentId) } : {}) },
      orderBy: { id: 'desc' }, take: 2000,
    })
    // isim çözümü (denormalize — ilişki tanımlı değil)
    const uniq = (a: (number | null)[]) => [...new Set(a.filter((x): x is number => x != null))]
    const [docs, users, groups] = await Promise.all([
      prisma.tBLDOCUMENT.findMany({ where: { id: { in: uniq(rows.map((r) => r.documentId)) } }, select: { id: true, documentNo: true } }),
      prisma.tBLUSER.findMany({ where: { id: { in: uniq(rows.map((r) => r.userId)) } }, select: { id: true, username: true, fullName: true } }),
      prisma.tBLUSERGROUP.findMany({ where: { id: { in: uniq(rows.map((r) => r.userGroupId)) } }, select: { id: true, code: true, name: true } }),
    ])
    const dM = new Map(docs.map((d) => [d.id, d])), uM = new Map(users.map((u) => [u.id, u])), gM = new Map(groups.map((g) => [g.id, g]))
    return rows.map((r) => ({
      ...r,
      documentNo: r.documentId != null ? dM.get(r.documentId)?.documentNo ?? null : null,
      atanan: r.userId != null ? (uM.get(r.userId)?.fullName ?? uM.get(r.userId)?.username ?? null)
        : r.userGroupId != null ? `Grup: ${gM.get(r.userGroupId)?.name ?? gM.get(r.userGroupId)?.code ?? ''}` : null,
    }))
  })

  // Ata — kullanıcı VEYA grup (biri zorunlu). Belge başına TEK aktif atama: öncekiler pasifleştirilir (yeniden-atama).
  app.post('/', { preHandler: [app.authenticate, app.requireWrite] }, async (request, reply) => {
    const parsed = assignment.safeParse(request.body)
    if (!parsed.success) return reply.code(400).send({ error: 'Invalid body', details: parsed.error.flatten() })
    const companyId = getCompanyId(request)
    const d = parsed.data
    if ((d.userId == null) === (d.userGroupId == null)) {
      return reply.code(400).send({ error: 'Kullanıcı VEYA kullanıcı grubu — tam olarak birini seçin' })
    }
    const bad = await firstBadRef(companyId, [
      ['Belge', 'document', d.documentId], ['Kullanıcı', 'user', d.userId], ['Kullanıcı Grubu', 'userGroup', d.userGroupId],
    ])
    if (bad) return reply.code(400).send({ error: `${bad}: başka firmaya ait veya geçersiz` })
    // yeniden-atama: belgenin önceki aktif atamalarını pasifleştir
    await prisma.tBLDOCUMENTASSIGNMENT.updateMany({ where: { companyId, documentId: d.documentId, isActive: true }, data: { isActive: false } })
    const row = await prisma.tBLDOCUMENTASSIGNMENT.create({ data: { companyId, documentId: d.documentId, userId: d.userId ?? null, userGroupId: d.userGroupId ?? null, note: d.note } })
    return reply.code(201).send(row)
  })

  // Atamayı kaldır (pasifleştir)
  app.delete('/:id', { preHandler: [app.authenticate, app.requireWrite] }, async (request, reply) => {
    const id = Number((request.params as { id: string }).id)
    if (!Number.isInteger(id)) return reply.code(400).send({ error: 'Invalid id' })
    const res = await prisma.tBLDOCUMENTASSIGNMENT.updateMany({ where: { id, companyId: getCompanyId(request) }, data: { isActive: false } })
    if (res.count === 0) return reply.code(404).send({ error: 'Atama bulunamadı' })
    return { deleted: res.count }
  })
}
