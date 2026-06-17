import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { prisma } from '../lib/prisma.js'
import { getCompanyId } from '../lib/company.js'

const createSchema = z.object({
  username: z.string().min(1).max(50),
  email: z.string().email().max(150),
  password: z.string().min(6).max(100),
  fullName: z.string().min(1).max(150),
  roles: z.array(z.string()).optional(),
  isActive: z.boolean().optional(),
})

// passwordHash ASLA dönülmez
const userSelect = {
  id: true,
  companyId: true,
  username: true,
  email: true,
  fullName: true,
  isActive: true,
  isSuperAdmin: true,
  lastLoginAt: true,
  createdAt: true,
  userRoles: { select: { role: { select: { code: true, name: true } } } },
} as const

export async function userRoutes(app: FastifyInstance) {
  app.get('/', { preHandler: [app.authenticate, app.requireAdmin] }, async (request) => {
    return prisma.tBLUSER.findMany({
      where: { companyId: getCompanyId(request) },
      orderBy: { username: 'asc' },
      select: userSelect,
    })
  })

  app.get('/:id', { preHandler: [app.authenticate, app.requireAdmin] }, async (request, reply) => {
    const id = Number((request.params as { id: string }).id)
    if (!Number.isInteger(id)) return reply.code(400).send({ error: 'Invalid id' })
    const user = await prisma.tBLUSER.findUnique({ where: { id }, select: userSelect })
    if (!user) return reply.code(404).send({ error: 'User not found' })
    return user
  })

  app.post('/', { preHandler: [app.authenticate, app.requireAdmin] }, async (request, reply) => {
    const parsed = createSchema.safeParse(request.body)
    if (!parsed.success) return reply.code(400).send({ error: 'Invalid body', details: parsed.error.flatten() })

    const companyId = getCompanyId(request)
    const { password, roles: roleCodes, ...rest } = parsed.data
    const roles = await prisma.tBLROLE.findMany({ where: { code: { in: roleCodes ?? ['VIEWER'] } } })
    if (roles.length === 0) return reply.code(400).send({ error: 'Geçerli rol bulunamadı' })
    const passwordHash = await bcrypt.hash(password, 10)

    try {
      const user = await prisma.tBLUSER.create({
        data: { ...rest, companyId, passwordHash, userRoles: { create: roles.map((r) => ({ roleId: r.id })) } },
        select: userSelect,
      })
      return reply.code(201).send(user)
    } catch (err) {
      if ((err as { code?: string }).code === 'P2002') {
        return reply.code(409).send({ error: 'Username veya email zaten kullanımda' })
      }
      throw err
    }
  })
}
