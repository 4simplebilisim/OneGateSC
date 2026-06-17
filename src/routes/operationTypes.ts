import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { getCompanyId } from '../lib/company.js'

const directions = ['INBOUND', 'OUTBOUND', 'INTERNAL', 'COUNT'] as const
const docTypes = ['STOCK_MOVEMENT', 'COUNT', 'PRODUCTION', 'ORDER', 'OTHER'] as const
const controlModes = ['UNCONTROLLED', 'CONTROLLED', 'REFERENCE_CONTROLLED'] as const

// Davranış flag'leri (legacy BYT*) — operasyon tipinin kalbi
const BOOL_FIELDS = [
  'emailSend', 'equivalentApplication', 'materialBasedCollection', 'materialBasedQtyEdit',
  'batchAssignment', 'qualityControl', 'detailLocationToCoverage', 'integration', 'approvedDocUpdate',
  'bulkSend', 'readBasedControl', 'readBasedInfoMessage', 'logging', 'logControl', 'grouping',
  'reasonRequired', 'reasonInHeader', 'sameUsePallet', 'sameUseSerial', 'passiveProductUse',
  'palletBreaking', 'originalQtyUpdate', 'reserveTransfer', 'affectsStock', 'isActive',
] as const
const boolShape = Object.fromEntries(BOOL_FIELDS.map((b) => [b, z.boolean().optional()]))

const baseShape = {
  direction: z.enum(directions),
  documentType: z.enum(docTypes).optional(),
  controlMode: z.enum(controlModes).optional(),
  facilityId: z.number().int().positive().optional(),
  sequenceId: z.number().int().positive().optional(),
  operationSequenceId: z.number().int().positive().optional(),
  groupSequenceId: z.number().int().positive().optional(),
  operationGroupId: z.number().int().positive().optional(),
  reverseOperationTypeId: z.number().int().positive().optional(),
  cancelLocationId: z.number().int().positive().optional(),
  logControlDays: z.number().int().optional(),
  ...boolShape,
}

const createSchema = z.object({
  code: z.string().min(1).max(20),
  name: z.string().min(1).max(100),
  ...baseShape,
})
const updateSchema = z.object({ name: z.string().min(1).max(100).optional(), ...baseShape }).partial()

export async function operationTypeRoutes(app: FastifyInstance) {
  app.get('/', async (request) =>
    prisma.tBLOPERATIONTYPE.findMany({ where: { companyId: getCompanyId(request) }, orderBy: { code: 'asc' } }),
  )

  app.get('/:id', async (request, reply) => {
    const id = Number((request.params as { id: string }).id)
    if (!Number.isInteger(id)) return reply.code(400).send({ error: 'Invalid id' })
    const row = await prisma.tBLOPERATIONTYPE.findFirst({ where: { id, companyId: getCompanyId(request) } })
    if (!row) return reply.code(404).send({ error: 'Operation type not found' })
    return row
  })

  app.post('/', { preHandler: [app.authenticate, app.requireWrite] }, async (request, reply) => {
    const parsed = createSchema.safeParse(request.body)
    if (!parsed.success) return reply.code(400).send({ error: 'Invalid body', details: parsed.error.flatten() })
    try {
      const opType = await prisma.tBLOPERATIONTYPE.create({ data: { ...parsed.data, companyId: getCompanyId(request) } })
      return reply.code(201).send(opType)
    } catch (err) {
      if ((err as { code?: string }).code === 'P2002') return reply.code(409).send({ error: 'Operasyon tipi kodu zaten var' })
      throw err
    }
  })

  app.patch('/:id', { preHandler: [app.authenticate, app.requireWrite] }, async (request, reply) => {
    const id = Number((request.params as { id: string }).id)
    if (!Number.isInteger(id)) return reply.code(400).send({ error: 'Invalid id' })
    const parsed = updateSchema.safeParse(request.body)
    if (!parsed.success) return reply.code(400).send({ error: 'Invalid body', details: parsed.error.flatten() })
    const existing = await prisma.tBLOPERATIONTYPE.findFirst({ where: { id, companyId: getCompanyId(request) } })
    if (!existing) return reply.code(404).send({ error: 'Operation type not found' })
    return prisma.tBLOPERATIONTYPE.update({ where: { id }, data: parsed.data })
  })

  app.delete('/:id', { preHandler: [app.authenticate, app.requireWrite] }, async (request, reply) => {
    const id = Number((request.params as { id: string }).id)
    if (!Number.isInteger(id)) return reply.code(400).send({ error: 'Invalid id' })
    try {
      const res = await prisma.tBLOPERATIONTYPE.deleteMany({ where: { id, companyId: getCompanyId(request) } })
      if (res.count === 0) return reply.code(404).send({ error: 'Operation type not found' })
      return { deleted: res.count }
    } catch (err) {
      if ((err as { code?: string }).code === 'P2003') return reply.code(409).send({ error: 'Operasyon tipi kullanımda — silinemez' })
      throw err
    }
  })
}
