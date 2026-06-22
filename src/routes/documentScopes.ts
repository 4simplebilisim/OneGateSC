import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { getCompanyId } from '../lib/company.js'

// Belge Satır Kapsamı (okutma) — legacy TBLSBBELGEKAPSAM. Bir DETAY satırına N okutma.
const scopeSchema = z.object({
  documentLineId: z.number().int().positive(),
  quantity: z.number().positive(),
  unitId: z.number().int().positive(),
  sourceLocationId: z.number().int().positive().nullable().optional(),
  sourceStatusId: z.number().int().positive().nullable().optional(),
  targetLocationId: z.number().int().positive().nullable().optional(),
  targetStatusId: z.number().int().positive().nullable().optional(),
  palletId: z.number().int().positive().nullable().optional(),
  batchNo: z.string().max(100).nullable().optional(),
  serialNo: z.string().max(100).nullable().optional(),
  customerId: z.number().int().positive().nullable().optional(),
  poNo: z.string().max(50).nullable().optional(),
  poLine: z.string().max(50).nullable().optional(),
  vehicleId: z.number().int().positive().nullable().optional(),
  netWeight: z.number().nonnegative().nullable().optional(),
  grossWeight: z.number().nonnegative().nullable().optional(),
  reasonId: z.number().int().positive().nullable().optional(),
})

// Okutma yalnız DRAFT belgede düzenlenebilir (tamamlandıktan sonra stok kilitli)
async function draftLineGuard(companyId: number, documentLineId: number): Promise<{ code: number; error: string } | null> {
  const line = await prisma.tBLDOCUMENTLINE.findFirst({
    where: { id: documentLineId, document: { companyId } },
    include: { document: { select: { status: true } } },
  })
  if (!line) return { code: 404, error: 'Satır bulunamadı' }
  if (line.document.status !== 'DRAFT') return { code: 409, error: 'Sadece DRAFT belgede okutma düzenlenebilir' }
  return null
}

export async function documentScopeRoutes(app: FastifyInstance) {
  // Liste — documentLineId ile filtreli (satırın okutmaları)
  app.get('/', async (request) => {
    const companyId = getCompanyId(request)
    const q = request.query as { documentLineId?: string }
    const where = {
      documentLine: { document: { companyId } },
      ...(q.documentLineId ? { documentLineId: Number(q.documentLineId) } : {}),
    }
    return prisma.tBLDOCUMENTLINESCOPE.findMany({ where, orderBy: [{ documentLineId: 'asc' }, { scopeNo: 'asc' }] })
  })

  app.post('/', { preHandler: [app.authenticate, app.requireWrite] }, async (request, reply) => {
    const parsed = scopeSchema.safeParse(request.body)
    if (!parsed.success) return reply.code(400).send({ error: 'Invalid body', details: parsed.error.flatten() })
    const companyId = getCompanyId(request)
    const g = await draftLineGuard(companyId, parsed.data.documentLineId)
    if (g) return reply.code(g.code).send({ error: g.error })
    const last = await prisma.tBLDOCUMENTLINESCOPE.findFirst({ where: { documentLineId: parsed.data.documentLineId }, orderBy: { scopeNo: 'desc' }, select: { scopeNo: true } })
    const created = await prisma.tBLDOCUMENTLINESCOPE.create({ data: { ...parsed.data, companyId, scopeNo: (last?.scopeNo ?? 0) + 1 } })
    return reply.code(201).send(created)
  })

  app.patch('/:id', { preHandler: [app.authenticate, app.requireWrite] }, async (request, reply) => {
    const id = Number((request.params as { id: string }).id)
    if (!Number.isInteger(id)) return reply.code(400).send({ error: 'Invalid id' })
    const parsed = scopeSchema.partial().safeParse(request.body)
    if (!parsed.success) return reply.code(400).send({ error: 'Invalid body', details: parsed.error.flatten() })
    const companyId = getCompanyId(request)
    const sc = await prisma.tBLDOCUMENTLINESCOPE.findFirst({ where: { id, documentLine: { document: { companyId } } } })
    if (!sc) return reply.code(404).send({ error: 'Okutma bulunamadı' })
    const g = await draftLineGuard(companyId, sc.documentLineId)
    if (g) return reply.code(g.code).send({ error: g.error })
    return prisma.tBLDOCUMENTLINESCOPE.update({ where: { id }, data: parsed.data })
  })

  app.delete('/:id', { preHandler: [app.authenticate, app.requireWrite] }, async (request, reply) => {
    const id = Number((request.params as { id: string }).id)
    if (!Number.isInteger(id)) return reply.code(400).send({ error: 'Invalid id' })
    const companyId = getCompanyId(request)
    const sc = await prisma.tBLDOCUMENTLINESCOPE.findFirst({ where: { id, documentLine: { document: { companyId } } } })
    if (!sc) return reply.code(404).send({ error: 'Okutma bulunamadı' })
    const g = await draftLineGuard(companyId, sc.documentLineId)
    if (g) return reply.code(g.code).send({ error: g.error })
    await prisma.tBLDOCUMENTLINESCOPE.delete({ where: { id } })
    return { deleted: true }
  })
}
