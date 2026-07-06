import '@fastify/jwt'
import type { FastifyReply, FastifyRequest } from 'fastify'

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>
    requireWrite: (request: FastifyRequest, reply: FastifyReply) => Promise<void>
    requireAdmin: (request: FastifyRequest, reply: FastifyReply) => Promise<void>
  }
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: { sub: number; username: string; roles: string[]; companyId: number | null; isSuperAdmin: boolean; companies?: number[]; sid?: string }
    user: { sub: number; username: string; roles: string[]; companyId: number | null; isSuperAdmin: boolean; companies?: number[]; sid?: string }
  }
}
