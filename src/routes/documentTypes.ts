import type { FastifyInstance } from 'fastify'
import { z, type ZodTypeAny } from 'zod'
import { prisma } from '../lib/prisma.js'
import { getCompanyId } from '../lib/company.js'

export interface Delegate {
  findMany(args: unknown): Promise<unknown[]>
  create(args: unknown): Promise<unknown>
  findFirst(args: unknown): Promise<unknown | null>
  update(args: unknown): Promise<unknown>
  deleteMany(args: unknown): Promise<{ count: number }>
}

/**
 * Code'suz config tablosu CRUD (Belge Tipleri / Operasyon config). id sırası, companyId scope.
 * ownerField verilirse GET o alana göre de filtreler (ör. ?operationTypeId=5) — sekme/master-detay için.
 */
export function simpleCrud(delegate: Delegate, createSchema: ZodTypeAny, updateSchema: ZodTypeAny, notFound: string, ownerField?: string) {
  return async function (app: FastifyInstance) {
    app.get('/', async (request) => {
      const where: Record<string, unknown> = { companyId: getCompanyId(request) }
      if (ownerField) {
        const q = request.query as Record<string, string | undefined>
        if (q[ownerField]) where[ownerField] = Number(q[ownerField])
      }
      return delegate.findMany({ where, orderBy: { id: 'asc' } })
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
        if ((err as { code?: string }).code === 'P2003') return reply.code(400).send({ error: 'Geçersiz referans' })
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
      return reply.code(204).send()
    })
  }
}

const pInt = z.number().int().positive()

// Belge Durum İşlem
const dsAction = z.object({ documentStatusId: pInt, actionType: z.number().int(), isActive: z.boolean().optional() })
export const documentStatusActionRoutes = simpleCrud(prisma.tBLDOCUMENTSTATUSACTION as unknown as Delegate, dsAction, dsAction.partial(), 'Document status action not found')

// Belge Durum Kriter
const dsCriteria = z.object({ operationTypeId: pInt, businessPartnerId: pInt.optional(), criteria: z.string().min(1), isActive: z.boolean().optional() })
export const documentStatusCriteriaRoutes = simpleCrud(prisma.tBLDOCUMENTSTATUSCRITERIA as unknown as Delegate, dsCriteria, dsCriteria.partial(), 'Document status criteria not found')

// Belge Onay Tipi
const docApproval = z.object({ operationTypeId: pInt, approvalType: z.number().int(), controlCollection: z.boolean().optional(), isActive: z.boolean().optional() })
export const documentApprovalTypeRoutes = simpleCrud(prisma.tBLDOCUMENTAPPROVALTYPE as unknown as Delegate, docApproval, docApproval.partial(), 'Document approval type not found')
