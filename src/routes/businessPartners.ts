import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { getCompanyId } from '../lib/company.js'

const partnerTypes = ['CUSTOMER', 'SUPPLIER', 'BOTH'] as const

const createSchema = z.object({
  code: z.string().min(1).max(40),
  name: z.string().min(1).max(200),
  type: z.enum(partnerTypes).optional(),
  regionId: z.number().int().positive().optional(),
  partnerGroupId: z.number().int().positive().optional(),
  parentId: z.number().int().positive().optional(), // zincir müşteri (üst cari)
  taxNumber: z.string().max(20).optional(),
  phone: z.string().max(20).optional(),
  email: z.string().email().max(150).optional(),
  city: z.string().max(60).optional(),
  address: z.string().max(255).optional(),
  isActive: z.boolean().optional(),
})

const updateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  type: z.enum(partnerTypes).optional(),
  regionId: z.number().int().positive().nullable().optional(),
  partnerGroupId: z.number().int().positive().nullable().optional(),
  parentId: z.number().int().positive().nullable().optional(),
  taxNumber: z.string().max(20).nullable().optional(),
  phone: z.string().max(20).nullable().optional(),
  email: z.string().email().max(150).nullable().optional(),
  city: z.string().max(60).nullable().optional(),
  address: z.string().max(255).nullable().optional(),
  isActive: z.boolean().optional(),
})

export async function businessPartnerRoutes(app: FastifyInstance) {
  app.get('/', async (request) => {
    const q = request.query as { type?: string }
    return prisma.tBLBUSINESSPARTNER.findMany({
      where: {
        companyId: getCompanyId(request),
        type: partnerTypes.includes(q.type as (typeof partnerTypes)[number])
          ? (q.type as (typeof partnerTypes)[number])
          : undefined,
      },
      orderBy: { code: 'asc' },
    })
  })

  app.get('/:id', async (request, reply) => {
    const id = Number((request.params as { id: string }).id)
    if (!Number.isInteger(id)) return reply.code(400).send({ error: 'Invalid id' })
    const partner = await prisma.tBLBUSINESSPARTNER.findUnique({ where: { id } })
    if (!partner) return reply.code(404).send({ error: 'Partner not found' })
    return partner
  })

  app.post('/', { preHandler: [app.authenticate, app.requireWrite] }, async (request, reply) => {
    const parsed = createSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.code(400).send({ error: 'Invalid body', details: parsed.error.flatten() })
    }
    try {
      const partner = await prisma.tBLBUSINESSPARTNER.create({
        data: { ...parsed.data, companyId: getCompanyId(request) },
      })
      return reply.code(201).send(partner)
    } catch (err) {
      if ((err as { code?: string }).code === 'P2002') {
        return reply.code(409).send({ error: 'Partner code already exists' })
      }
      throw err
    }
  })

  app.patch('/:id', { preHandler: [app.authenticate, app.requireWrite] }, async (request, reply) => {
    const id = Number((request.params as { id: string }).id)
    if (!Number.isInteger(id)) return reply.code(400).send({ error: 'Invalid id' })
    const parsed = updateSchema.safeParse(request.body)
    if (!parsed.success) return reply.code(400).send({ error: 'Invalid body', details: parsed.error.flatten() })
    const existing = await prisma.tBLBUSINESSPARTNER.findFirst({ where: { id, companyId: getCompanyId(request) } })
    if (!existing) return reply.code(404).send({ error: 'Partner not found' })
    return prisma.tBLBUSINESSPARTNER.update({ where: { id }, data: parsed.data })
  })
}
