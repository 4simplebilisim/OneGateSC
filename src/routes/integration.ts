import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { getCompanyId } from '../lib/company.js'

const directions = ['IN', 'OUT'] as const
const statuses = ['PENDING', 'SUCCESS', 'ERROR'] as const

const createSchema = z.object({
  direction: z.enum(directions),
  entityType: z.string().min(1).max(40),
  status: z.enum(statuses).optional(),
  referenceKey: z.string().max(100).optional(),
  message: z.string().max(500).optional(),
})

// Entegrasyon aktarım logu — izleme (Gelen/Giden Aktarım İzleme) + manuel tetikleme (Entegrasyon Aktarım)
export async function integrationLogRoutes(app: FastifyInstance) {
  app.get('/', async (request) => {
    const q = request.query as { direction?: string; entityType?: string; status?: string }
    return prisma.tBLINTEGRATIONLOG.findMany({
      where: {
        companyId: getCompanyId(request),
        direction: directions.includes(q.direction as (typeof directions)[number]) ? (q.direction as (typeof directions)[number]) : undefined,
        entityType: q.entityType || undefined,
        status: statuses.includes(q.status as (typeof statuses)[number]) ? (q.status as (typeof statuses)[number]) : undefined,
      },
      orderBy: { id: 'desc' },
      take: 200,
    })
  })

  app.post('/', { preHandler: [app.authenticate, app.requireWrite] }, async (request, reply) => {
    const parsed = createSchema.safeParse(request.body)
    if (!parsed.success) return reply.code(400).send({ error: 'Invalid body', details: parsed.error.flatten() })
    // Manuel tetikleme — gerçek dış sistem entegrasyonu yok; aktarım denemesi log'lanır (status SUCCESS, işlenme=now)
    const log = await prisma.tBLINTEGRATIONLOG.create({
      data: {
        companyId: getCompanyId(request),
        direction: parsed.data.direction,
        entityType: parsed.data.entityType,
        status: parsed.data.status ?? 'SUCCESS',
        referenceKey: parsed.data.referenceKey,
        message: parsed.data.message ?? `Manuel tetiklendi: ${parsed.data.entityType}`,
      },
    })
    return reply.code(201).send(log)
  })

  app.delete('/:id', { preHandler: [app.authenticate, app.requireWrite] }, async (request, reply) => {
    const id = Number((request.params as { id: string }).id)
    if (!Number.isInteger(id)) return reply.code(400).send({ error: 'Invalid id' })
    const existing = await prisma.tBLINTEGRATIONLOG.findFirst({ where: { id, companyId: getCompanyId(request) } })
    if (!existing) return reply.code(404).send({ error: 'Not found' })
    await prisma.tBLINTEGRATIONLOG.delete({ where: { id } })
    return reply.code(204).send()
  })
}
