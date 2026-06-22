import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { getCompanyId } from '../lib/company.js'
import {
  dispatchShipment,
  deliverStop,
  cancelShipment,
  createShipmentFromSalesOrder,
  LogisticsError,
} from '../lib/logistics.js'

const stopSchema = z.object({
  partnerId: z.number().int().positive(),
  salesOrderId: z.number().int().positive().optional(),
  address: z.string().max(255).optional(),
  note: z.string().max(255).optional(),
})

const createSchema = z.object({
  shipmentNo: z.string().min(1).max(40),
  vehicleId: z.number().int().positive().optional(),
  driverName: z.string().max(100).optional(),
  plannedDate: z.string().optional(),
  note: z.string().max(500).optional(),
  stops: z.array(stopSchema).min(1),
})

const idOf = (request: FastifyRequest) => Number((request.params as { id: string }).id)

export async function shipmentRoutes(app: FastifyInstance) {
  app.get('/', async (request) => {
    const q = request.query as { status?: string; vehicleId?: string }
    const statuses = ['PLANNED', 'IN_TRANSIT', 'DELIVERED', 'CANCELLED'] as const
    return prisma.tBLSHIPMENT.findMany({
      where: {
        companyId: getCompanyId(request),
        vehicleId: q.vehicleId ? Number(q.vehicleId) : undefined,
        status: statuses.includes(q.status as (typeof statuses)[number]) ? (q.status as (typeof statuses)[number]) : undefined,
      },
      orderBy: { id: 'desc' },
      include: { vehicle: { select: { plateNo: true } }, _count: { select: { stops: true } } },
    })
  })

  app.get('/:id', async (request, reply) => {
    const id = idOf(request)
    if (!Number.isInteger(id)) return reply.code(400).send({ error: 'Invalid id' })
    const shipment = await prisma.tBLSHIPMENT.findUnique({
      where: { id },
      include: { vehicle: true, stops: { orderBy: { sequence: 'asc' } } },
    })
    if (!shipment) return reply.code(404).send({ error: 'Shipment not found' })
    return shipment
  })

  // Sales → Logistics: satış siparişinden sevkiyat üret
  app.post('/from-sales-order', { preHandler: [app.authenticate, app.requireWrite] }, async (request, reply) => {
    const body = z
      .object({
        salesOrderId: z.number().int().positive(),
        vehicleId: z.number().int().positive().optional(),
        driverName: z.string().max(100).optional(),
        plannedDate: z.string().optional(),
        shipmentNo: z.string().max(40).optional(),
      })
      .safeParse(request.body)
    if (!body.success) return reply.code(400).send({ error: 'Invalid body', details: body.error.flatten() })
    try {
      const { salesOrderId, plannedDate, ...opts } = body.data
      const shipment = await createShipmentFromSalesOrder(
        getCompanyId(request),
        salesOrderId,
        { ...opts, plannedDate: plannedDate ? new Date(plannedDate) : undefined },
        request.user.sub,
      )
      return reply.code(201).send(shipment)
    } catch (err) {
      if (err instanceof LogisticsError) return reply.code(409).send({ error: err.message })
      throw err
    }
  })

  app.post('/', { preHandler: [app.authenticate, app.requireWrite] }, async (request, reply) => {
    const parsed = createSchema.safeParse(request.body)
    if (!parsed.success) return reply.code(400).send({ error: 'Invalid body', details: parsed.error.flatten() })
    const { stops, plannedDate, ...header } = parsed.data
    try {
      const shipment = await prisma.tBLSHIPMENT.create({
        data: {
          ...header,
          companyId: getCompanyId(request),
          createdById: request.user.sub,
          plannedDate: plannedDate ? new Date(plannedDate) : undefined,
          stops: { create: stops.map((s, i) => ({ sequence: i + 1, companyId: getCompanyId(request), ...s })) },
        },
        include: { stops: { orderBy: { sequence: 'asc' } } },
      })
      return reply.code(201).send(shipment)
    } catch (err) {
      const code = (err as { code?: string }).code
      if (code === 'P2002') return reply.code(409).send({ error: 'Sevkiyat no zaten var' })
      if (code === 'P2003') return reply.code(400).send({ error: 'Geçersiz araç referansı' })
      throw err
    }
  })

  const wrap =
    (fn: (request: FastifyRequest) => Promise<unknown>) => async (request: FastifyRequest, reply: FastifyReply) => {
      const id = idOf(request)
      if (!Number.isInteger(id)) return reply.code(400).send({ error: 'Invalid id' })
      try {
        return await fn(request)
      } catch (err) {
        if (err instanceof LogisticsError) return reply.code(409).send({ error: err.message })
        throw err
      }
    }

  app.post('/:id/dispatch', { preHandler: [app.authenticate, app.requireWrite] }, wrap((req) => dispatchShipment(idOf(req), new Date())))
  app.post('/:id/cancel', { preHandler: [app.authenticate, app.requireWrite] }, wrap((req) => cancelShipment(idOf(req))))
  app.post('/:id/stops/:stopId/deliver', { preHandler: [app.authenticate, app.requireWrite] }, wrap((req) => {
    const stopId = Number((req.params as { stopId: string }).stopId)
    return deliverStop(idOf(req), stopId, new Date())
  }))
}
