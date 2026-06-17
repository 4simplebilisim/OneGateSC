import type { FastifyReply, FastifyRequest } from 'fastify'

/**
 * Rol-bazlı yetki preHandler'ı. `app.authenticate`'ten SONRA çalışır.
 * Super-admin tüm rolleri bypass eder. Yetkisizse 403.
 */
export function requireRole(...allowed: string[]) {
  return async function roleGuard(request: FastifyRequest, reply: FastifyReply) {
    const user = request.user as { roles?: string[]; isSuperAdmin?: boolean } | undefined
    if (!user) return reply.code(401).send({ error: 'Unauthorized' })
    if (user.isSuperAdmin) return
    const roles = user.roles ?? []
    if (!roles.some((r) => allowed.includes(r))) {
      return reply.code(403).send({ error: `Yetki yetersiz — gerekli rol: ${allowed.join(' / ')}` })
    }
  }
}
