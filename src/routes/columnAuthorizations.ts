import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { getCompanyId, companyListFilter } from '../lib/company.js'

const modeEnum = z.enum(['READONLY', 'HIDDEN'])
const createSchema = z.object({
  userId: z.number().int().positive().optional(),
  groupId: z.number().int().positive().optional(),
  resource: z.string().min(1).max(60),
  column: z.string().min(1).max(60),
  mode: modeEnum,
}).refine((d) => (d.userId ? 1 : 0) + (d.groupId ? 1 : 0) === 1, { message: 'userId VEYA groupId (tam biri) gerekli' })

export async function columnAuthorizationRoutes(app: FastifyInstance) {
  // ?userId= veya ?groupId= (+ &resource=) ile filtrelenir
  app.get('/', { preHandler: [app.authenticate, app.requireAdmin] }, async (request) => {
    const q = request.query as { userId?: string; groupId?: string; resource?: string }
    return prisma.tBLUSERCOLUMNAUTH.findMany({
      where: {
        companyId: getCompanyId(request),
        userId: q.userId ? Number(q.userId) : undefined,
        groupId: q.groupId ? Number(q.groupId) : undefined,
        resource: q.resource || undefined,
      },
      orderBy: { id: 'asc' },
    })
  })

  // upsert: aynı owner+resource+column varsa modu güncelle, yoksa oluştur
  app.post('/', { preHandler: [app.authenticate, app.requireAdmin] }, async (request, reply) => {
    const parsed = createSchema.safeParse(request.body)
    if (!parsed.success) return reply.code(400).send({ error: 'Invalid body', details: parsed.error.flatten() })
    const companyId = getCompanyId(request)
    const { userId, groupId, resource, column, mode } = parsed.data
    if (userId) {
      if (!(await prisma.tBLUSER.findFirst({ where: { id: userId, companyId } }))) return reply.code(400).send({ error: 'Geçersiz kullanıcı' })
    } else {
      if (!(await prisma.tBLUSERGROUP.findFirst({ where: { id: groupId, companyId } }))) return reply.code(400).send({ error: 'Geçersiz grup' })
    }
    const existing = await prisma.tBLUSERCOLUMNAUTH.findFirst({ where: { companyId, userId: userId ?? null, groupId: groupId ?? null, resource, column } })
    if (existing) {
      const row = await prisma.tBLUSERCOLUMNAUTH.update({ where: { id: existing.id }, data: { mode } })
      return reply.code(200).send(row)
    }
    const row = await prisma.tBLUSERCOLUMNAUTH.create({ data: { companyId, userId, groupId, resource, column, mode } })
    return reply.code(201).send(row)
  })

  app.delete('/:id', { preHandler: [app.authenticate, app.requireAdmin] }, async (request, reply) => {
    const id = Number((request.params as { id: string }).id)
    if (!Number.isInteger(id)) return reply.code(400).send({ error: 'Invalid id' })
    const res = await prisma.tBLUSERCOLUMNAUTH.deleteMany({ where: { id, ...companyListFilter(request) } })
    if (res.count === 0) return reply.code(404).send({ error: 'Kayıt bulunamadı' })
    return reply.code(204).send()
  })
}

// Kullanıcının kolon yetkileri (doğrudan + grup, birleşik) → { resource: { column: mode } }; HIDDEN, READONLY'yi ezer.
export async function getUserColumnAuth(userId: number): Promise<Record<string, Record<string, 'READONLY' | 'HIDDEN'>>> {
  const groups = await prisma.tBLUSERGROUPMEMBER.findMany({ where: { userId }, select: { groupId: true } })
  const groupIds = groups.map((g) => g.groupId)
  const rows = await prisma.tBLUSERCOLUMNAUTH.findMany({
    where: { OR: [{ userId }, ...(groupIds.length ? [{ groupId: { in: groupIds } }] : [])] },
    select: { resource: true, column: true, mode: true },
  })
  const out: Record<string, Record<string, 'READONLY' | 'HIDDEN'>> = {}
  for (const r of rows) {
    const bucket = (out[r.resource] ??= {})
    // HIDDEN en kısıtlayıcı → öncelikli
    if (bucket[r.column] !== 'HIDDEN') bucket[r.column] = r.mode
  }
  return out
}
