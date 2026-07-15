import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { getCompanyId } from '../lib/company.js'
import { parsePagination, paginated } from '../lib/pagination.js'
import { nextSequence } from '../lib/sequence.js'
import { firstBadRef, type RefModel } from '../lib/refGuard.js'
import { assignWorkOrder, startWorkOrder, reportLine, completeWorkOrder, cancelWorkOrder, WorkOrderError } from '../lib/workOrder.js'
import { assertUserAuthorized, AuthorizationError } from '../lib/userAuth.js'

// İş emri yetki kapısı: deposu (→tesisi) kullanıcının kısıt listesine uymalı → 403
async function woAuth(request: FastifyRequest, reply: FastifyReply, warehouseId: number | null | undefined): Promise<boolean> {
  try {
    await assertUserAuthorized(request, { warehouseId: warehouseId ?? null })
    return true
  } catch (err) {
    if (err instanceof AuthorizationError) { reply.code(403).send({ error: err.message }); return false }
    throw err
  }
}
async function woAuthById(request: FastifyRequest, reply: FastifyReply, id: number): Promise<boolean> {
  const wo = await prisma.tBLWORKORDER.findUnique({ where: { id }, select: { warehouseId: true } })
  return wo ? woAuth(request, reply, wo.warehouseId) : true // yoksa uç 404 verir
}

const types = ['PICK', 'PUTAWAY', 'COUNT', 'TRANSFER', 'REPLENISH'] as const

const lineSchema = z.object({
  productId: z.number().int().positive(),
  unitId: z.number().int().positive(),
  quantity: z.number().positive(),
  sourceLocationId: z.number().int().positive().optional(),
  targetLocationId: z.number().int().positive().optional(),
  sourceStatusId: z.number().int().positive().optional(),
  targetStatusId: z.number().int().positive().optional(),
  palletId: z.number().int().positive().optional(),
  batchNo: z.string().max(100).optional(),
  serialNo: z.string().max(100).optional(),
  reasonId: z.number().int().positive().optional(),
  note: z.string().max(255).optional(),
})

const createSchema = z.object({
  orderNo: z.string().min(1).max(40).optional(), // verilmezse 'WO' sayacından üretilir
  type: z.enum(types).optional(),
  warehouseId: z.number().int().positive(),
  assignedToUserId: z.number().int().positive().optional(),
  priority: z.number().int().optional(),
  note: z.string().max(500).optional(),
  lines: z.array(lineSchema).min(1),
})

const idOf = (request: FastifyRequest) => Number((request.params as { id: string }).id)

export async function workOrderRoutes(app: FastifyInstance) {
  app.get('/', async (request) => {
    const q = request.query as { status?: string; assignedToUserId?: string; type?: string }
    const statuses = ['PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'] as const
    const where = {
      companyId: getCompanyId(request),
      assignedToUserId: q.assignedToUserId ? Number(q.assignedToUserId) : undefined,
      status: statuses.includes(q.status as (typeof statuses)[number]) ? (q.status as (typeof statuses)[number]) : undefined,
      type: types.includes(q.type as (typeof types)[number]) ? (q.type as (typeof types)[number]) : undefined,
    }
    const p = parsePagination(request)
    const [data, total] = await Promise.all([
      prisma.tBLWORKORDER.findMany({ where, orderBy: { id: 'desc' }, include: { _count: { select: { lines: true } } }, skip: p.skip, take: p.take }),
      prisma.tBLWORKORDER.count({ where }),
    ])
    return paginated(data, total, p)
  })

  app.get('/:id', async (request, reply) => {
    const id = idOf(request)
    if (!Number.isInteger(id)) return reply.code(400).send({ error: 'Invalid id' })
    const wo = await prisma.tBLWORKORDER.findUnique({ where: { id }, include: { lines: { orderBy: { lineNo: 'asc' } } } })
    if (!wo) return reply.code(404).send({ error: 'Work order not found' })
    return wo
  })

  app.post('/', { preHandler: [app.authenticate, app.requireWrite] }, async (request, reply) => {
    const parsed = createSchema.safeParse(request.body)
    if (!parsed.success) return reply.code(400).send({ error: 'Invalid body', details: parsed.error.flatten() })
    const companyId = getCompanyId(request)
    const { lines, orderNo: providedNo, ...header } = parsed.data
    if (!(await woAuth(request, reply, header.warehouseId))) return

    // Cross-tenant koruması: depo + atanan kullanıcı + satır referansları (ürün/birim/lokasyon/statü) bu firmaya ait olmalı
    const uniq = (a: (number | null | undefined)[]) => [...new Set(a.filter((x): x is number => x != null))]
    const refs: [string, RefModel, number][] = [['depo', 'warehouse', header.warehouseId]]
    if (header.assignedToUserId) refs.push(['atanan kullanıcı', 'user', header.assignedToUserId])
    for (const id of uniq(lines.map((l) => l.productId))) refs.push(['ürün', 'product', id])
    for (const id of uniq(lines.map((l) => l.unitId))) refs.push(['birim', 'unit', id])
    for (const id of uniq(lines.flatMap((l) => [l.sourceLocationId, l.targetLocationId]))) refs.push(['lokasyon', 'location', id])
    for (const id of uniq(lines.flatMap((l) => [l.sourceStatusId, l.targetStatusId]))) refs.push(['statü', 'status', id])
    const bad = await firstBadRef(companyId, refs)
    if (bad) return reply.code(400).send({ error: `Geçersiz ${bad} — bu firmaya ait değil` })

    let orderNo = providedNo
    if (!orderNo) {
      const seq = await prisma.tBLSEQUENCE.findFirst({ where: { companyId, code: 'WO' } })
      if (!seq) return reply.code(400).send({ error: "orderNo gerekli — 'WO' sayacı tanımlı değil" })
      orderNo = (await nextSequence(companyId, 'WO')).formatted
    }
    try {
      const wo = await prisma.tBLWORKORDER.create({
        data: {
          ...header,
          orderNo,
          companyId,
          createdById: request.user.sub,
          lines: { create: lines.map((l, i) => ({ lineNo: i + 1, companyId, ...l })) },
        },
        include: { lines: { orderBy: { lineNo: 'asc' } } },
      })
      return reply.code(201).send(wo)
    } catch (err) {
      const code = (err as { code?: string }).code
      if (code === 'P2002') return reply.code(409).send({ error: 'İş emri no zaten var' })
      if (code === 'P2003') return reply.code(400).send({ error: 'Geçersiz referans (depo/ürün/birim/lokasyon...)' })
      throw err
    }
  })

  const wrap = (fn: (request: FastifyRequest) => Promise<unknown>) => async (request: FastifyRequest, reply: FastifyReply) => {
    const id = idOf(request)
    if (!Number.isInteger(id)) return reply.code(400).send({ error: 'Invalid id' })
    if (!(await woAuthById(request, reply, id))) return
    try {
      return await fn(request)
    } catch (err) {
      if (err instanceof WorkOrderError) return reply.code(409).send({ error: err.message })
      throw err
    }
  }

  app.post('/:id/assign', { preHandler: [app.authenticate, app.requireWrite] }, async (request, reply) => {
    const id = idOf(request)
    if (!Number.isInteger(id)) return reply.code(400).send({ error: 'Invalid id' })
    if (!(await woAuthById(request, reply, id))) return
    const body = z.object({ userId: z.number().int().positive() }).safeParse(request.body)
    if (!body.success) return reply.code(400).send({ error: 'Invalid body', details: body.error.flatten() })
    try {
      return await assignWorkOrder(id, body.data.userId)
    } catch (err) {
      if (err instanceof WorkOrderError) return reply.code(409).send({ error: err.message })
      throw err
    }
  })

  app.post('/:id/start', { preHandler: [app.authenticate, app.requireWrite] }, wrap((req) => startWorkOrder(idOf(req), new Date())))
  app.post('/:id/complete', { preHandler: [app.authenticate, app.requireWrite] }, wrap((req) => completeWorkOrder(idOf(req), req.user.sub, new Date())))
  app.post('/:id/cancel', { preHandler: [app.authenticate, app.requireWrite] }, wrap((req) => cancelWorkOrder(idOf(req))))

  app.post('/:id/lines/:lineId/report', { preHandler: [app.authenticate, app.requireWrite] }, async (request, reply) => {
    const id = idOf(request)
    const lineId = Number((request.params as { lineId: string }).lineId)
    if (!Number.isInteger(id) || !Number.isInteger(lineId)) return reply.code(400).send({ error: 'Invalid id' })
    if (!(await woAuthById(request, reply, id))) return
    const body = z.object({ collectedQty: z.number().min(0) }).safeParse(request.body)
    if (!body.success) return reply.code(400).send({ error: 'Invalid body', details: body.error.flatten() })
    try {
      return await reportLine(id, lineId, body.data.collectedQty)
    } catch (err) {
      if (err instanceof WorkOrderError) return reply.code(409).send({ error: err.message })
      throw err
    }
  })
}
