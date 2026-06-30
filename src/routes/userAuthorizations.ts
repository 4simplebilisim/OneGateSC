import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { getCompanyId, companyListFilter } from '../lib/company.js'

const scopeEnum = z.enum(['FACILITY', 'WAREHOUSE', 'OPERATION_TYPE', 'SCREEN'])
const createSchema = z.object({
  userId: z.number().int().positive().optional(), // sahip = kullanıcı
  groupId: z.number().int().positive().optional(), // sahip = grup (üyelerine miras)
  scopeType: scopeEnum,
  referenceId: z.number().int().positive().optional(), // entity scope
  referenceCode: z.string().min(1).max(60).optional(), // SCREEN scope = ekran/menü anahtarı
  isActive: z.boolean().optional(),
}).refine((d) => (d.userId ? 1 : 0) + (d.groupId ? 1 : 0) === 1, { message: 'userId VEYA groupId (tam biri) gerekli' })

// entity scope referenceId, scopeType'a göre bu firmaya ait olmalı (cross-tenant koruması)
async function validRef(companyId: number, scopeType: z.infer<typeof scopeEnum>, referenceId: number): Promise<boolean> {
  if (scopeType === 'FACILITY') return !!(await prisma.tBLFACILITY.findFirst({ where: { id: referenceId, companyId } }))
  if (scopeType === 'WAREHOUSE') return !!(await prisma.tBLWAREHOUSE.findFirst({ where: { id: referenceId, companyId } }))
  return !!(await prisma.tBLOPERATIONTYPE.findFirst({ where: { id: referenceId, companyId } }))
}

export async function userAuthorizationRoutes(app: FastifyInstance) {
  // ?userId= veya ?groupId= + &scopeType= ile filtrelenir (yetki ekranı bölümleri)
  app.get('/', { preHandler: [app.authenticate, app.requireAdmin] }, async (request) => {
    const q = request.query as { userId?: string; groupId?: string; scopeType?: string }
    return prisma.tBLUSERAUTHORIZATION.findMany({
      where: {
        companyId: getCompanyId(request),
        userId: q.userId ? Number(q.userId) : undefined,
        groupId: q.groupId ? Number(q.groupId) : undefined,
        scopeType: scopeEnum.safeParse(q.scopeType).success ? (q.scopeType as z.infer<typeof scopeEnum>) : undefined,
      },
      orderBy: { id: 'asc' },
    })
  })

  app.post('/', { preHandler: [app.authenticate, app.requireAdmin] }, async (request, reply) => {
    const parsed = createSchema.safeParse(request.body)
    if (!parsed.success) return reply.code(400).send({ error: 'Invalid body', details: parsed.error.flatten() })
    const companyId = getCompanyId(request)
    const { userId, groupId, scopeType, referenceId, referenceCode, isActive } = parsed.data

    // sahip (kullanıcı veya grup) bu firmaya ait olmalı
    if (userId) {
      if (!(await prisma.tBLUSER.findFirst({ where: { id: userId, companyId } }))) return reply.code(400).send({ error: 'Geçersiz kullanıcı' })
    } else {
      if (!(await prisma.tBLUSERGROUP.findFirst({ where: { id: groupId, companyId } }))) return reply.code(400).send({ error: 'Geçersiz grup' })
    }

    if (scopeType === 'SCREEN') {
      if (!referenceCode) return reply.code(400).send({ error: 'SCREEN yetkisi için ekran anahtarı (referenceCode) gerekli' })
    } else {
      if (!referenceId) return reply.code(400).send({ error: 'Bu yetki için referenceId gerekli' })
      if (!(await validRef(companyId, scopeType, referenceId))) {
        return reply.code(400).send({ error: 'Geçersiz referans — bu firmaya ait değil' })
      }
    }
    try {
      const row = await prisma.tBLUSERAUTHORIZATION.create({
        data: { companyId, userId, groupId, scopeType, isActive, referenceId: scopeType === 'SCREEN' ? null : referenceId, referenceCode: scopeType === 'SCREEN' ? referenceCode : null },
      })
      return reply.code(201).send(row)
    } catch (err) {
      if ((err as { code?: string }).code === 'P2002') return reply.code(409).send({ error: 'Bu yetki zaten tanımlı' })
      throw err
    }
  })

  app.delete('/:id', { preHandler: [app.authenticate, app.requireAdmin] }, async (request, reply) => {
    const id = Number((request.params as { id: string }).id)
    if (!Number.isInteger(id)) return reply.code(400).send({ error: 'Invalid id' })
    const res = await prisma.tBLUSERAUTHORIZATION.deleteMany({ where: { id, ...companyListFilter(request) } })
    if (res.count === 0) return reply.code(404).send({ error: 'Yetki bulunamadı' })
    return reply.code(204).send()
  })
}
