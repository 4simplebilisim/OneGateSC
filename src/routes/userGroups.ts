import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { getCompanyId } from '../lib/company.js'
import { simpleCrud, type Delegate } from './documentTypes.js'

// Kullanıcı grubu CRUD (companyId-scope). Gruba verilen yetkiler üyelerine miras geçer (userAuthorizations + userAuth.ts union).
const schema = z.object({
  code: z.string().min(1).max(40),
  name: z.string().min(1).max(100),
  isActive: z.boolean().optional(),
})

const base = simpleCrud(prisma.tBLUSERGROUP as unknown as Delegate, schema, schema.partial(), 'Kullanıcı grubu bulunamadı')

const addMembersSchema = z.object({ userIds: z.array(z.number().int().positive()).min(1) })

export async function userGroupRoutes(app: FastifyInstance) {
  await base(app) // temel CRUD (GET/POST/PATCH/DELETE)

  // Bu firmaya ait grubu getir (cross-tenant koruması) — üye rotaları için ortak
  const requireGroup = async (request: import('fastify').FastifyRequest, groupId: number) =>
    Number.isInteger(groupId) ? prisma.tBLUSERGROUP.findFirst({ where: { id: groupId, companyId: getCompanyId(request) } }) : null

  // Grup üyeleri (kullanıcılar) — "Kullanıcılar" sekmesi
  app.get('/:id/members', { preHandler: [app.authenticate, app.requireAdmin] }, async (request, reply) => {
    const groupId = Number((request.params as { id: string }).id)
    if (!(await requireGroup(request, groupId))) return reply.code(404).send({ error: 'Kullanıcı grubu bulunamadı' })
    const rows = await prisma.tBLUSERGROUPMEMBER.findMany({
      where: { groupId },
      select: { user: { select: { id: true, username: true, fullName: true, isActive: true } } },
      orderBy: { userId: 'asc' },
    })
    return rows.map((r) => r.user)
  })

  // Birden fazla kullanıcıyı AYNI ANDA gruba ekle (idempotent — zaten üye olanlar atlanır)
  app.post('/:id/members', { preHandler: [app.authenticate, app.requireAdmin] }, async (request, reply) => {
    const groupId = Number((request.params as { id: string }).id)
    const grp = await requireGroup(request, groupId)
    if (!grp) return reply.code(404).send({ error: 'Kullanıcı grubu bulunamadı' })
    const parsed = addMembersSchema.safeParse(request.body)
    if (!parsed.success) return reply.code(400).send({ error: 'Invalid body', details: parsed.error.flatten() })
    const companyId = getCompanyId(request)
    // yalnız bu firmaya ait kullanıcılar (cross-tenant koruması)
    const valid = await prisma.tBLUSER.findMany({ where: { id: { in: parsed.data.userIds }, companyId }, select: { id: true } })
    const validIds = valid.map((u) => u.id)
    if (!validIds.length) return reply.code(400).send({ error: 'Geçerli kullanıcı yok (firma dışı)' })
    const res = await prisma.tBLUSERGROUPMEMBER.createMany({ data: validIds.map((userId) => ({ userId, groupId, companyId })), skipDuplicates: true })
    return reply.code(201).send({ added: res.count })
  })

  // Gruptan kullanıcı çıkar
  app.delete('/:id/members/:userId', { preHandler: [app.authenticate, app.requireAdmin] }, async (request, reply) => {
    const p = request.params as { id: string; userId: string }
    const groupId = Number(p.id), userId = Number(p.userId)
    if (!Number.isInteger(userId)) return reply.code(400).send({ error: 'Invalid id' })
    if (!(await requireGroup(request, groupId))) return reply.code(404).send({ error: 'Kullanıcı grubu bulunamadı' })
    const res = await prisma.tBLUSERGROUPMEMBER.deleteMany({ where: { groupId, userId } })
    if (res.count === 0) return reply.code(404).send({ error: 'Üye bulunamadı' })
    return reply.code(204).send()
  })
}
