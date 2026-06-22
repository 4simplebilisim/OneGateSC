import type { FastifyInstance } from 'fastify'
import { z, type ZodTypeAny } from 'zod'
import { prisma } from '../lib/prisma.js'
import { getCompanyId } from '../lib/company.js'

interface LinkDelegate {
  findMany(args: unknown): Promise<unknown[]>
  create(args: unknown): Promise<unknown>
  findFirst(args: unknown): Promise<unknown | null>
  update(args: unknown): Promise<unknown>
  deleteMany(args: unknown): Promise<{ count: number }>
}

/** Operasyon tipine bağlı alt-kayıt (statü/lokasyon/neden/palet tipi) için ortak CRUD. operationTypeId ile filtrelenir. */
function opLinkRoutes(delegate: LinkDelegate, createSchema: ZodTypeAny, updateSchema: ZodTypeAny, notFound: string) {
  return async function (app: FastifyInstance) {
    app.get('/', async (request) => {
      const q = request.query as { operationTypeId?: string }
      return delegate.findMany({
        where: { companyId: getCompanyId(request), operationTypeId: q.operationTypeId ? Number(q.operationTypeId) : undefined },
        orderBy: [{ operationTypeId: 'asc' }, { id: 'asc' }],
        include: { operationType: { select: { code: true, name: true } } },
      })
    })

    app.get('/:id', async (request, reply) => {
      const id = Number((request.params as { id: string }).id)
      if (!Number.isInteger(id)) return reply.code(400).send({ error: 'Invalid id' })
      const row = await delegate.findFirst({ where: { id, companyId: getCompanyId(request) } })
      if (!row) return reply.code(404).send({ error: notFound })
      return row
    })

    app.post('/', { preHandler: [app.authenticate, app.requireWrite] }, async (request, reply) => {
      const parsed = createSchema.safeParse(request.body)
      if (!parsed.success) return reply.code(400).send({ error: 'Invalid body', details: parsed.error.flatten() })
      try {
        const row = await delegate.create({ data: { ...(parsed.data as Record<string, unknown>), companyId: getCompanyId(request) } })
        return reply.code(201).send(row)
      } catch (err) {
        if ((err as { code?: string }).code === 'P2003') return reply.code(400).send({ error: 'Geçersiz referans (operasyon tipi / statü / lokasyon / neden / palet tipi)' })
        throw err
      }
    })

    app.patch('/:id', { preHandler: [app.authenticate, app.requireWrite] }, async (request, reply) => {
      const id = Number((request.params as { id: string }).id)
      if (!Number.isInteger(id)) return reply.code(400).send({ error: 'Invalid id' })
      const parsed = updateSchema.safeParse(request.body)
      if (!parsed.success) return reply.code(400).send({ error: 'Invalid body', details: parsed.error.flatten() })
      const existing = await delegate.findFirst({ where: { id, companyId: getCompanyId(request) } })
      if (!existing) return reply.code(404).send({ error: notFound })
      return delegate.update({ where: { id }, data: parsed.data })
    })

    app.delete('/:id', { preHandler: [app.authenticate, app.requireWrite] }, async (request, reply) => {
      const id = Number((request.params as { id: string }).id)
      if (!Number.isInteger(id)) return reply.code(400).send({ error: 'Invalid id' })
      const res = await delegate.deleteMany({ where: { id, companyId: getCompanyId(request) } })
      if (res.count === 0) return reply.code(404).send({ error: notFound })
      return { deleted: res.count }
    })
  }
}

const opId = z.number().int().positive()
const scope = z.enum(['ALL', 'GROUP', 'SPECIFIC'])
const pOpt = z.number().int().positive().optional()

// Operasyon ↔ statü geçişi
const opStatus = z.object({ operationTypeId: opId, facilityId: pOpt, cariLinkType: scope.optional(), cariLinkId: pOpt, materialLinkType: scope.optional(), materialLinkId: pOpt, sourceStatusId: pOpt, targetStatusId: z.number().int().positive(), sortOrder: z.number().int().optional() })
export const operationTypeStatusRoutes = opLinkRoutes(prisma.tBLOPERATIONTYPESTATUS as unknown as LinkDelegate, opStatus, opStatus.partial(), 'Operation status link not found')

// Operasyon ↔ lokasyon
const opLocation = z.object({ operationTypeId: opId, facilityId: pOpt, cariLinkType: scope.optional(), cariLinkId: pOpt, materialLinkType: scope.optional(), materialLinkId: pOpt, sourceLinkType: scope.optional(), sourceLocationId: pOpt, targetLinkType: scope.optional(), targetLocationId: pOpt, fixLocation: z.boolean().optional(), terminalFixSource: z.boolean().optional(), terminalFixTarget: z.boolean().optional(), sortOrder: z.number().int().optional() })
export const operationTypeLocationRoutes = opLinkRoutes(prisma.tBLOPERATIONTYPELOCATION as unknown as LinkDelegate, opLocation, opLocation.partial(), 'Operation location link not found')

// Operasyon ↔ neden
const opReason = z.object({ operationTypeId: opId, facilityId: pOpt, reasonCategoryId: pOpt, reasonId: z.number().int().positive(), sortOrder: z.number().int().optional(), isAutomatic: z.boolean().optional() })
export const operationTypeReasonRoutes = opLinkRoutes(prisma.tBLOPERATIONTYPEREASON as unknown as LinkDelegate, opReason, opReason.partial(), 'Operation reason link not found')

// Operasyon ↔ palet tipi
const opPalletType = z.object({ operationTypeId: opId, facilityId: pOpt, palletTypeId: z.number().int().positive(), innerPalletTypeId: pOpt })
export const operationTypePalletTypeRoutes = opLinkRoutes(prisma.tBLOPERATIONTYPEPALLETTYPE as unknown as LinkDelegate, opPalletType, opPalletType.partial(), 'Operation pallet type link not found')
