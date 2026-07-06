import type { FastifyInstance } from 'fastify'
import { randomUUID } from 'node:crypto'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { prisma } from '../lib/prisma.js'
import { getUserColumnAuth } from './columnAuthorizations.js'
import { getUserScreenRights } from './screenRights.js'
import { getUserCompanies } from '../lib/userAuth.js'

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
    // Erişilebilir firmalar (kendi + COMPANY yetkileri) — JWT'ye gömülür; getCompanyId çok-firmalı geçişi buradan doğrular
    const companies = user.isSuperAdmin ? [] : await getUserCompanies(user.id, user.companyId)
    // Tek oturum (single-session): bu girişin oturum kimliği. DB'ye yazılır + JWT'ye gömülür (sid).
    // Aynı kullanıcı başka cihazda giriş yaparsa sessionId değişir → eski token'lar (eski sid) global hook'ta 401 olur.
    const sessionId = randomUUID()
    const token = app.jwt.sign({
      sub: user.id,
      username: user.username,
      roles,
      companyId: user.companyId,
      isSuperAdmin: user.isSuperAdmin,
      companies,
      sid: sessionId,
    })

    await prisma.tBLUSER.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date(), sessionId },
    })

    // Ekran (mobil menü) + kolon + ekran-hakkı (web aksiyon) yetkileri — boş ise serbest (frontend süzer)
    const [screens, columnAuth, screenRights] = await Promise.all([getUserScreens(user.id), getUserColumnAuth(user.id), getUserScreenRights(user.id)])

    return {
      token,
      user: {
        id: user.id,
        username: user.username,
        fullName: user.fullName,
        roles,
        companyId: user.companyId,
        isSuperAdmin: user.isSuperAdmin,
        isMobileUser: user.isMobileUser, // el terminali kullanıcısı → frontend backoffice'e girmesin, /m'e yönlensin
        companies, // erişilebilir firmalar (çok-firmalı kullanıcıda >1) — frontend firma switcher'ı için
        screens,
        columnAuth,
        screenRights,
      },
    }
  })

  // Oturum tazeleme — kullanıcının güncel ekran + kolon + hak yetkilerini döndürür
  app.get('/me', { preHandler: [app.authenticate] }, async (request) => {
    const u = request.user as { sub: number }
    const [screens, columnAuth, screenRights] = await Promise.all([getUserScreens(u.sub), getUserColumnAuth(u.sub), getUserScreenRights(u.sub)])
    return { user: { ...request.user, screens, columnAuth, screenRights } }
  })
}

// Kullanıcının SCREEN yetkisi olan resource adları (doğrudan + grup yetkileri birleşik; boş = kısıtsız)
async function getUserScreens(userId: number): Promise<string[]> {
  const groups = await prisma.tBLUSERGROUPMEMBER.findMany({ where: { userId }, select: { groupId: true } })
  const groupIds = groups.map((g) => g.groupId)
  const rows = await prisma.tBLUSERAUTHORIZATION.findMany({
    where: { scopeType: 'SCREEN', isActive: true, OR: [{ userId }, ...(groupIds.length ? [{ groupId: { in: groupIds } }] : [])] },
    select: { referenceCode: true },
  })
  return [...new Set(rows.map((r) => r.referenceCode).filter((c): c is string => !!c))]
}
