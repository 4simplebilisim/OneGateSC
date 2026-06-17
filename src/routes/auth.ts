import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { prisma } from '../lib/prisma.js'

const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
})

export async function authRoutes(app: FastifyInstance) {
  app.post('/login', async (request, reply) => {
    const parsed = loginSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.code(400).send({ error: 'Invalid body', details: parsed.error.flatten() })
    }

    const { username, password } = parsed.data
    const user = await prisma.tBLUSER.findUnique({
      where: { username },
      include: { userRoles: { include: { role: true } } },
    })

    if (!user || !user.isActive) {
      return reply.code(401).send({ error: 'Invalid credentials' })
    }

    const passwordOk = await bcrypt.compare(password, user.passwordHash)
    if (!passwordOk) {
      return reply.code(401).send({ error: 'Invalid credentials' })
    }

    const roles = user.userRoles.map((ur) => ur.role.code)
    const token = app.jwt.sign({
      sub: user.id,
      username: user.username,
      roles,
      companyId: user.companyId,
      isSuperAdmin: user.isSuperAdmin,
    })

    await prisma.tBLUSER.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    })

    return {
      token,
      user: {
        id: user.id,
        username: user.username,
        fullName: user.fullName,
        roles,
        companyId: user.companyId,
        isSuperAdmin: user.isSuperAdmin,
      },
    }
  })

  app.get('/me', { preHandler: [app.authenticate] }, async (request) => {
    return { user: request.user }
  })
}
