import type { FastifyInstance, FastifyRequest } from 'fastify'
import { z, type ZodTypeAny } from 'zod'
import { prisma } from '../lib/prisma.js'
import { getCompanyId, companyListFilter } from '../lib/company.js'

// Config CRUD'a özel iş-kuralı doğrulaması (ör. tesis başına tek kayıt). Hata mesajı döner → 400; null → geçer.
// id verilirse UPDATE (kendini hariç tut), yoksa CREATE.
export type BeforeWrite = (a: { request: FastifyRequest; data: Record<string, unknown>; companyId: number; id?: number }) => Promise<string | null>

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
export function simpleCrud(delegate: Delegate, createSchema: ZodTypeAny, updateSchema: ZodTypeAny, notFound: string, ownerField?: string, beforeWrite?: BeforeWrite) {
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
      const row = await delegate.findFirst({ where: { id, ...companyListFilter(request) } })
      if (!row) return reply.code(404).send({ error: notFound })
      return row
    })

    app.post('/', { preHandler: [app.authenticate, app.requireWrite] }, async (request, reply) => {
      const parsed = createSchema.safeParse(request.body)
      if (!parsed.success) return reply.code(400).send({ error: 'Invalid body', details: parsed.error.flatten() })
      const companyId = getCompanyId(request)
      if (beforeWrite) {
        const err = await beforeWrite({ request, data: parsed.data as Record<string, unknown>, companyId })
        if (err) return reply.code(400).send({ error: err })
      }
      try {
        const row = await delegate.create({ data: { ...(parsed.data as Record<string, unknown>), companyId } })
        return reply.code(201).send(row)
      } catch (err) {
        if ((err as { code?: string }).code === 'P2003') return reply.code(400).send({ error: 'Geçersiz referans' })
        if ((err as { code?: string }).code === 'P2002') return reply.code(409).send({ error: 'Bu kod zaten kullanılıyor' })
        throw err
      }
    })

    app.patch('/:id', { preHandler: [app.authenticate, app.requireWrite] }, async (request, reply) => {
      const id = Number((request.params as { id: string }).id)
      if (!Number.isInteger(id)) return reply.code(400).send({ error: 'Invalid id' })
      const parsed = updateSchema.safeParse(request.body)
      if (!parsed.success) return reply.code(400).send({ error: 'Invalid body', details: parsed.error.flatten() })
      const existing = await delegate.findFirst({ where: { id, ...companyListFilter(request) } })
      if (!existing) return reply.code(404).send({ error: notFound })
      if (beforeWrite) {
        const err = await beforeWrite({ request, data: parsed.data as Record<string, unknown>, companyId: getCompanyId(request), id })
        if (err) return reply.code(400).send({ error: err })
      }
      try {
        return await delegate.update({ where: { id }, data: parsed.data })
      } catch (err) {
        if ((err as { code?: string }).code === 'P2003') return reply.code(400).send({ error: 'Geçersiz referans' })
        if ((err as { code?: string }).code === 'P2002') return reply.code(409).send({ error: 'Bu kod zaten kullanılıyor' })
        throw err
      }
    })

    app.delete('/:id', { preHandler: [app.authenticate, app.requireWrite] }, async (request, reply) => {
      const id = Number((request.params as { id: string }).id)
      if (!Number.isInteger(id)) return reply.code(400).send({ error: 'Invalid id' })
      const res = await delegate.deleteMany({ where: { id, ...companyListFilter(request) } })
      if (res.count === 0) return reply.code(404).send({ error: notFound })
      return reply.code(204).send()
    })
  }
}

const pInt = z.number().int().positive()

// Belge Durum İşlem
const dsAction = z.object({ documentStatusId: pInt, actionType: z.number().int(), isActive: z.boolean().optional() })
export const documentStatusActionRoutes = simpleCrud(prisma.tBLDOCUMENTSTATUSACTION as unknown as Delegate, dsAction, dsAction.partial(), 'Document status action not found')

// Belge Durum Kriter (Faz 2: veri-güdümlü kural — koşul → hedef durum)
const docCondition = z.enum(['CANCELLED', 'COMPLETED', 'CONFIRMED', 'NONE_COLLECTED', 'PARTIAL', 'FULLY_COLLECTED', 'ANY_COLLECTED'])
const dsCriteria = z.object({ operationTypeId: pInt, businessPartnerId: pInt.nullable().optional(), condition: docCondition.optional(), targetStatusId: pInt.nullable().optional(), priority: z.number().int().optional(), criteria: z.string().optional(), isActive: z.boolean().optional() })
export const documentStatusCriteriaRoutes = simpleCrud(prisma.tBLDOCUMENTSTATUSCRITERIA as unknown as Delegate, dsCriteria, dsCriteria.partial(), 'Document status criteria not found')

// Belge Onay Tipi — BYTONAYTIPI: 1=Toplama Ekranından Onay (okutma bitince İleri→onay; genelde kontrolsüz)
// 2=Tek Aşamalı (kontrollüde kısmi toplama; İleri→Onayla/Böl) · 3=İki Aşamalı (mobil onay + Gözlem'den son onay)
const docApproval = z.object({ facilityId: pInt.nullish(), operationTypeId: pInt, approvalType: z.number().int().min(1).max(3), controlCollection: z.boolean().optional(), isActive: z.boolean().optional() })
export const documentApprovalTypeRoutes = simpleCrud(prisma.tBLDOCUMENTAPPROVALTYPE as unknown as Delegate, docApproval, docApproval.partial(), 'Document approval type not found')
