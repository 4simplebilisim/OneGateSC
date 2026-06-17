import type { FastifyInstance, FastifyRequest } from 'fastify'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { getCompanyId } from '../lib/company.js'
import { decideInspection, QualityError } from '../lib/quality.js'

const createSchema = z.object({
  inspectionNo: z.string().min(1).max(40),
  productId: z.number().int().positive(),
  locationId: z.number().int().positive(),
  statusId: z.number().int().positive(),
  unitId: z.number().int().positive(),
  quantity: z.number().positive(),
  batchNo: z.string().max(100).optional(),
  serialNo: z.string().max(100).optional(),
  palletId: z.number().int().positive().optional(),
  note: z.string().max(500).optional(),
})

const idOf = (request: FastifyRequest) => Number((request.params as { id: string }).id)

export async function qualityInspectionRoutes(app: FastifyInstance) {
  app.get('/', async (request) => {
    const q = request.query as { result?: string }
    const results = ['PENDING', 'PASSED', 'FAILED'] as const
    return prisma.tBLQUALITYINSPECTION.findMany({
      where: {
        companyId: getCompanyId(request),
        result: results.includes(q.result as (typeof results)[number]) ? (q.result as (typeof results)[number]) : undefined,
      },
      orderBy: { id: 'desc' },
    })
  })

  app.get('/:id', async (request, reply) => {
    const id = idOf(request)
    if (!Number.isInteger(id)) return reply.code(400).send({ error: 'Invalid id' })
    const insp = await prisma.tBLQUALITYINSPECTION.findUnique({ where: { id } })
    if (!insp) return reply.code(404).send({ error: 'Inspection not found' })
    return insp
  })

  app.post('/', { preHandler: [app.authenticate, app.requireWrite] }, async (request, reply) => {
    const parsed = createSchema.safeParse(request.body)
    if (!parsed.success) return reply.code(400).send({ error: 'Invalid body', details: parsed.error.flatten() })
    try {
      const insp = await prisma.tBLQUALITYINSPECTION.create({
        data: { ...parsed.data, companyId: getCompanyId(request), createdById: request.user.sub },
      })
      return reply.code(201).send(insp)
    } catch (err) {
      if ((err as { code?: string }).code === 'P2002') return reply.code(409).send({ error: 'Muayene no zaten var' })
      throw err
    }
  })

  // Sonuçlandır: { pass: true|false } → AVAILABLE / BLOCKED statüsüne taşır
  app.post('/:id/decide', { preHandler: [app.authenticate, app.requireWrite] }, async (request, reply) => {
    const id = idOf(request)
    if (!Number.isInteger(id)) return reply.code(400).send({ error: 'Invalid id' })
    const body = z.object({ pass: z.boolean() }).safeParse(request.body)
    if (!body.success) return reply.code(400).send({ error: 'Invalid body', details: body.error.flatten() })
    try {
      return await decideInspection(id, body.data.pass, request.user.sub, new Date())
    } catch (err) {
      if (err instanceof QualityError) return reply.code(409).send({ error: err.message })
      throw err
    }
  })
}
