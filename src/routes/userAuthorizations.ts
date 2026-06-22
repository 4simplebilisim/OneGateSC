import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { getCompanyId } from '../lib/company.js'

const scopeEnum = z.enum(['FACILITY', 'WAREHOUSE', 'OPERATION_TYPE'])
const createSchema = z.object({
  userId: z.number().int().positive(),
  scopeType: scopeEnum,
  referenceId: z.number().int().positive(),
  isActive: z.boolean().optional(),
})

// referenceId, scopeType'a göre bu firmaya ait olmalı (cross-tenant koruması)
async function validRef(companyId: number, scopeType: z.infer<typeof scopeEnum>, referenceId: number): Promise<boolean> {
  if (scopeType === 'FACILITY') return !!(await prisma.tBLFACILITY.findFirst({ where: { id: referenceId, companyId } }))
  if (scopeType === 'WAREHOUSE') return !!(await prisma.tBLWAREHOUSE.findFirst({ where: { id: referenceId, companyId } }))
  return !!(await prisma.tBLOPERATIONTYPE.findFirst({ where: { id: referenceId, companyId } }))
}

export async function userAuthorizationRoutes(app: FastifyInstance) {
  // ?userId=&scopeType= ile filtrelenir (yetki ekranı bölümleri)
  app.get('/', { preHandler: [app.authenticate, app.requireAdmin] }, async (request) => {
    const q = request.query as { userId?: string; scopeType?: string }
    return prisma.tBLUSERAUTHORIZATION.findMany({
      where: {
        companyId: getCompanyId(request),
        userId: q.userId ? Number(q.userId) : undefined,
        scopeType: scopeEnum.safeParse(q.scopeType).success ? (q.scopeType as z.infer<typeof scopeEnum>) : undefined,
      },
      orderBy: { id: 'asc' },
    })
  })

  app.post('/', { preHandler: [app.authenticate, app.requireAdmin] }, async (request, reply) => {
    const parsed = createSchema.safeParse(request.body)
    if (!parsed.success) return reply.code(400).send({ error: 'Invalid body', details: parsed.error.flatten() })
    const companyId = getCompanyId(request)
    const user = await prisma.tBLUSER.findFirst({ where: { id: parsed.data.userId, companyId } })
    if (!user) return reply.code(400).send({ error: 'Geçersiz kullanıcı' })
    if (!(await validRef(companyId, parsed.data.scopeType, parsed.data.referenceId))) {
      return reply.code(400).send({ error: 'Geçersiz referans — bu firmaya ait değil' })
    }
    try {
      const row = await prisma.tBLUSERAUTHORIZATION.create({ data: { ...parsed.data, companyId } })
      return reply.code(201).send(row)
    } catch (err) {
      if ((err as { code?: string }).code === 'P2002') return reply.code(409).send({ error: 'Bu yetki zaten tanımlı' })
      throw err
    }
  })

  app.delete('/:id', { preHandler: [app.authenticate, app.requireAdmin] }, async (request, reply) => {
    const id = Number((request.params as { id: string }).id)
    if (!Number.isInteger(id)) return reply.code(400).send({ error: 'Invalid id' })
    const res = await prisma.tBLUSERAUTHORIZATION.deleteMany({ where: { id, companyId: getCompanyId(request) } })
    if (res.count === 0) return reply.code(404).send({ error: 'Yetki bulunamadı' })
    return reply.code(204).send()
  })
}
