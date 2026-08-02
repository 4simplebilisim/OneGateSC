import type { FastifyInstance } from 'fastify'
import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto'
import { prisma } from '../lib/prisma.js'
import { env } from '../lib/env.js'
import { listUserApps } from '../lib/entitlements.js'

// Ürünler arası oturum devri: kullanıcı WMS'te giriş yapmışsa Satınalma'ya
// yeniden şifre sormadan geçer. OneGate kısa ömürlü imzalı bir bilet üretir,
// hedef ürün bileti PAYLAŞILAN sırla doğrulayıp kendi oturumunu açar.
const TICKET_TTL_MS = 60_000 // 60 sn — devir anında kullanılır, uzun yaşamaz

const b64url = (b: Buffer) => b.toString('base64url')

export function signTicket(payload: Record<string, unknown>): string {
  const body = b64url(Buffer.from(JSON.stringify(payload)))
  const sig = b64url(createHmac('sha256', env.ssoSecret).update(body).digest())
  return `${body}.${sig}`
}

export function verifyTicket(ticket: string): Record<string, unknown> | null {
  const [body, sig] = ticket.split('.')
  if (!body || !sig) return null
  const expected = b64url(createHmac('sha256', env.ssoSecret).update(body).digest())
  const a = Buffer.from(sig)
  const b = Buffer.from(expected)
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null
  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString()) as { exp?: number }
    if (!payload.exp || payload.exp < Date.now()) return null
    return payload as Record<string, unknown>
  } catch {
    return null
  }
}

export async function ssoRoutes(app: FastifyInstance) {
  // Oturumdaki kullanıcı için hedef ürüne devir bileti üretir
  app.get('/ticket', { preHandler: [app.authenticate] }, async (request, reply) => {
    const u = request.user as { sub: number; companyId?: number | null }
    const { app: code } = request.query as { app?: string }
    if (!code) return reply.code(400).send({ error: 'app parametresi gerekli' })

    const apps = await listUserApps(u.sub, u.companyId ?? null)
    const target = apps.find((a) => a.code === code)
    if (!target) return reply.code(403).send({ error: 'Bu ürüne erişim yetkiniz yok' })

    const user = await prisma.tBLUSER.findUnique({ where: { id: u.sub }, select: { username: true, isActive: true } })
    if (!user?.isActive) return reply.code(403).send({ error: 'Kullanıcı pasif' })

    const ticket = signTicket({
      sub: u.sub,
      username: user.username,
      aud: code,
      jti: randomUUID(),
      exp: Date.now() + TICKET_TTL_MS,
    })
    // Hedef ürünün devir ucu: /satinalma/api/sso?ticket=...
    return { url: `${target.path.replace(/\/$/, '')}/api/sso?ticket=${encodeURIComponent(ticket)}`, ticket }
  })
}
