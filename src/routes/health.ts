import type { FastifyInstance } from 'fastify'
import { prisma } from '../lib/prisma.js'

export async function healthRoutes(app: FastifyInstance) {
  app.get('/health', async () => {
    let db: 'up' | 'down' = 'down'
    try {
      await prisma.$queryRaw`SELECT 1`
      db = 'up'
    } catch {
      db = 'down'
    }
    return {
      status: db === 'up' ? 'ok' : 'degraded',
      db,
      uptime: Math.round(process.uptime()),
    }
  })
}
