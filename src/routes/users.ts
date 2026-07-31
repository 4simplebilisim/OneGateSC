import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { prisma } from '../lib/prisma.js'
import { getCompanyId, companyListFilter } from '../lib/company.js'

const createSchema = z.object({
  username: z.string().min(1).max(50),
  email: z.string().email().max(150),
  password: z.string().min(6).max(100),
  fullName: z.string().min(1).max(150),
  companyId: z.number().int().positive().optional(), // yalnız super-admin başka firmaya kullanıcı açabilir
  isSuperAdmin: z.boolean().optional(), // "Yönetici (Admin)" = firma-bağımsız süper-admin (tüm firmalar) — yalnız süper-admin verebilir
  roles: z.array(z.string()).optional(),
  groups: z.array(z.number().int().positive()).optional(), // üye olduğu kullanıcı grupları
  isActive: z.boolean().optional(),
  isMobileUser: z.boolean().optional(), // El terminali (mobil) kullanıcısı
  userType: z.enum(['CENTRAL', 'BRANCH']).optional(),
  isApproved: z.boolean().optional(),
  phone: z.string().max(30).optional(),
  validUntil: z.string().optional(), // ISO tarih, doğrudan Prisma'ya geçer
  alias: z.string().max(60).optional(),
  passwordNeverExpires: z.boolean().optional(),
  mustChangePassword: z.boolean().optional(),
  cannotChangePassword: z.boolean().optional(),
})

const updateSchema = z.object({
  email: z.string().email().max(150).optional(),
  fullName: z.string().min(1).max(150).optional(),
  password: z.string().min(6).max(100).optional(), // verilirse şifre sıfırlanır
  companyId: z.number().int().positive().optional(),
  isSuperAdmin: z.boolean().optional(), // yalnız süper-admin değiştirebilir (aşağıda enforce)
  isMobileUser: z.boolean().optional(), // El terminali (mobil) kullanıcısı
  roles: z.array(z.string()).optional(),
  groups: z.array(z.number().int().positive()).optional(),
  isActive: z.boolean().optional(),
  userType: z.enum(['CENTRAL', 'BRANCH']).optional(),
  isApproved: z.boolean().optional(),
  phone: z.string().max(30).optional(),
  validUntil: z.string().optional(), // ISO tarih, doğrudan Prisma'ya geçer
  alias: z.string().max(60).optional(),
  passwordNeverExpires: z.boolean().optional(),
  mustChangePassword: z.boolean().optional(),
  cannotChangePassword: z.boolean().optional(),
})

// İstenen companyId'yi çöz: super-admin body'deki firmayı seçebilir; normal admin kendi firmasına kilitli.
function resolveTargetCompany(request: { user?: { isSuperAdmin?: boolean } }, bodyCompanyId: number | undefined, ownCompanyId: number): number {
  if (request.user?.isSuperAdmin && bodyCompanyId) return bodyCompanyId
  return ownCompanyId
}

// Sadece bu firmaya ait grup id'lerini döndür (cross-tenant koruması). companyId null = firma-bağımsız süper → grup uygulanmaz
async function validGroupIds(companyId: number | null, groups: number[] | undefined): Promise<number[]> {
  if (!groups?.length || companyId == null) return []
  const rows = await prisma.tBLUSERGROUP.findMany({ where: { companyId, id: { in: groups } }, select: { id: true } })
  return rows.map((r) => r.id)
}

// passwordHash ASLA dönülmez
const userSelect = {
  id: true,
  companyId: true,
  username: true,
  email: true,
  fullName: true,
  isActive: true,
  isSuperAdmin: true,
  isMobileUser: true,
  lastLoginAt: true,
  createdAt: true,
  userType: true,
  isApproved: true,
  phone: true,
  validUntil: true,
  alias: true,
  passwordNeverExpires: true,
  mustChangePassword: true,
  cannotChangePassword: true,
  userRoles: { select: { role: { select: { code: true, name: true } } } },
  groupMemberships: { select: { groupId: true } },
} as const

export async function userRoutes(app: FastifyInstance) {
  app.get('/', { preHandler: [app.authenticate, app.requireAdmin] }, async (request) => {
    // Süper-admin aktif firmaya daraltılmışken firma-bağımsız (companyId=null) süper hesaplar listeden kaybolmasın
    const scope = companyListFilter(request)
    const isSuper = !!(request.user as { isSuperAdmin?: boolean } | undefined)?.isSuperAdmin
    return prisma.tBLUSER.findMany({
      where: isSuper && scope.companyId != null ? { OR: [scope, { companyId: null }] } : scope,
      orderBy: { username: 'asc' },
      select: userSelect,
    })
  })

  app.get('/:id', { preHandler: [app.authenticate, app.requireAdmin] }, async (request, reply) => {
    const id = Number((request.params as { id: string }).id)
    if (!Number.isInteger(id)) return reply.code(400).send({ error: 'Invalid id' })
    // tenant güvenliği: admin yalnız kendi firmasının kullanıcısını okur (super-admin getCompanyId ile seçili firma)
    const user = await prisma.tBLUSER.findFirst({ where: { id, ...companyListFilter(request) }, select: userSelect })
    if (!user) return reply.code(404).send({ error: 'User not found' })
    return user
  })

  app.post('/', { preHandler: [app.authenticate, app.requireAdmin] }, async (request, reply) => {
    const parsed = createSchema.safeParse(request.body)
    if (!parsed.success) return reply.code(400).send({ error: 'Invalid body', details: parsed.error.flatten() })

    const { password, roles: roleCodes, companyId: bodyCompanyId, groups, validUntil, isSuperAdmin: bodySuper, ...rest } = parsed.data
    // "Yönetici (Admin)" = firma-bağımsız süper-admin → YALNIZ süper-admin verebilir (cross-tenant ayrıcalık)
    const requesterSuper = (request.user as { isSuperAdmin?: boolean }).isSuperAdmin === true
    const wantSuper = bodySuper === true
    if (wantSuper && !requesterSuper) return reply.code(403).send({ error: 'Süper-admin (tüm firmalar) yetkisini yalnız süper-admin verebilir' })
    // süper-admin firma-bağımsız olabilir (companyId null → tüm firmalar); normal kullanıcı bir firmaya kilitli
    const companyId: number | null = wantSuper ? (bodyCompanyId ?? null) : resolveTargetCompany(request, bodyCompanyId, getCompanyId(request))
    const roles = await prisma.tBLROLE.findMany({ where: { code: { in: roleCodes ?? ['VIEWER'] } } })
    if (roles.length === 0) return reply.code(400).send({ error: 'Geçerli rol bulunamadı' })
    const passwordHash = await bcrypt.hash(password, 10)
    const gids = await validGroupIds(companyId, groups)
    const validUntilDate = validUntil ? new Date(validUntil) : undefined // boş string → DATE'e geçirme

    try {
      const user = await prisma.tBLUSER.create({
        data: { ...rest, isSuperAdmin: wantSuper, validUntil: validUntilDate, companyId, passwordHash, userRoles: { create: roles.map((r) => ({ roleId: r.id, companyId })) }, groupMemberships: { create: gids.map((g) => ({ groupId: g, companyId })) } },
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

  app.patch('/:id', { preHandler: [app.authenticate, app.requireAdmin] }, async (request, reply) => {
    const id = Number((request.params as { id: string }).id)
    if (!Number.isInteger(id)) return reply.code(400).send({ error: 'Invalid id' })
    const parsed = updateSchema.safeParse(request.body)
    if (!parsed.success) return reply.code(400).send({ error: 'Invalid body', details: parsed.error.flatten() })
    const ownCompanyId = getCompanyId(request)
    const requesterSuper = (request.user as { isSuperAdmin?: boolean }).isSuperAdmin === true
    const selfId = (request.user as { sub?: number }).sub
    // süper-admin requester tüm firmalardaki kullanıcıyı bulur; normal admin kendi firmasına kilitli (companyListFilter)
    const existing = await prisma.tBLUSER.findFirst({ where: { id, ...companyListFilter(request) } })
    if (!existing) return reply.code(404).send({ error: 'User not found' })
    // süper-admin bir kullanıcıyı yalnız başka süper-admin düzenleyebilir (normal admin dokunamaz)
    if (existing.isSuperAdmin && !requesterSuper) return reply.code(403).send({ error: 'Süper-admin kullanıcıyı yalnız süper-admin düzenleyebilir' })

    const { password, roles: roleCodes, companyId: bodyCompanyId, groups, validUntil, isSuperAdmin: bodySuper, ...rest } = parsed.data
    const data: Record<string, unknown> = { ...rest }
    // süper-admin bayrağını (Yönetici toggle) yalnız süper-admin değiştirebilir; kendi yetkini kaldıramazsın (kilitlenme koruması)
    if (bodySuper !== undefined) {
      if (!requesterSuper) return reply.code(403).send({ error: 'Süper-admin yetkisini yalnız süper-admin değiştirebilir' })
      if (existing.id === selfId && bodySuper === false) return reply.code(403).send({ error: 'Kendi süper-admin yetkinizi kaldıramazsınız' })
      data.isSuperAdmin = bodySuper
    }
    if (validUntil !== undefined) data.validUntil = validUntil ? new Date(validUntil) : null // boş string → null
    if (bodyCompanyId !== undefined) data.companyId = resolveTargetCompany(request, bodyCompanyId, ownCompanyId)
    if (password) data.passwordHash = await bcrypt.hash(password, 10)
    // üyelik junction'larının companyId'si kullanıcının (güncelleniyorsa yeni, yoksa mevcut) firmasıyla aynı
    const memberCompanyId = 'companyId' in data ? (data.companyId as number | null) : existing.companyId
    if (roleCodes) {
      const roles = await prisma.tBLROLE.findMany({ where: { code: { in: roleCodes } } })
      if (roles.length === 0) return reply.code(400).send({ error: 'Geçerli rol bulunamadı' })
      data.userRoles = { deleteMany: {}, create: roles.map((r) => ({ roleId: r.id, companyId: memberCompanyId })) }
    }
    if (groups) {
      const gids = await validGroupIds(existing.companyId ?? ownCompanyId, groups)
      data.groupMemberships = { deleteMany: {}, create: gids.map((g) => ({ groupId: g, companyId: memberCompanyId })) }
    }
    try {
      const user = await prisma.tBLUSER.update({ where: { id }, data, select: userSelect })
      return user
    } catch (err) {
      if ((err as { code?: string }).code === 'P2002') return reply.code(409).send({ error: 'Username veya email zaten kullanımda' })
      throw err
    }
  })

  app.delete('/:id', { preHandler: [app.authenticate, app.requireAdmin] }, async (request, reply) => {
    const id = Number((request.params as { id: string }).id)
    if (!Number.isInteger(id)) return reply.code(400).send({ error: 'Invalid id' })
    if ((request.user as { sub?: number }).sub === id) return reply.code(400).send({ error: 'Kendi hesabınızı silemezsiniz' })
    const existing = await prisma.tBLUSER.findFirst({ where: { id, ...companyListFilter(request) } })
    if (!existing) return reply.code(404).send({ error: 'User not found' })
    // süper-admin kullanıcıyı yalnız başka süper-admin silebilir (normal admin dokunamaz)
    if (existing.isSuperAdmin && !(request.user as { isSuperAdmin?: boolean }).isSuperAdmin) {
      return reply.code(403).send({ error: 'Süper-admin kullanıcıyı yalnız süper-admin silebilir' })
    }
    try {
      await prisma.tBLUSER.delete({ where: { id } })
    } catch (err) {
      // belge geçmişi (createdById) olan kullanıcı silinemez → pasife alma önerilir
      if ((err as { code?: string }).code === 'P2003') {
        return reply.code(409).send({ error: 'Bu kullanıcının belge geçmişi var — silmek yerine pasife alın (Aktif kapatın)' })
      }
      throw err
    }
    return reply.code(204).send()
  })
}
