import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { Prisma } from '@prisma/client'
import { prisma } from '../lib/prisma.js'
import { getCompanyId } from '../lib/company.js'
import { refreshDocStatus } from '../lib/documentStatus.js'
import { validateScopeAgainstOperation } from '../lib/movement.js'

// Sadece-tarih alanı (üretim/SKT): "YYYY-MM-DD" → UTC ÖĞLE Date (timezone gün-kayması önlenir; @db.Date günü korur)
const dateOnly = z.preprocess(
  (v) => (typeof v === 'string' && v ? new Date(v.slice(0, 10) + 'T12:00:00.000Z') : v),
  z.date().nullable().optional(),
)

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
  productionDate: dateOnly,
  expiryDate: dateOnly,
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

// Okutma değişince satırın collectedQty'sini (Σ kapsam) yeniden hesapla + belge durumunu tazele (BKL→TPL→OBK otomatik)
async function recomputeCollected(documentLineId: number, userId?: number | null) {
  const agg = await prisma.tBLDOCUMENTLINESCOPE.aggregate({ where: { documentLineId }, _sum: { quantity: true } })
  const line = await prisma.tBLDOCUMENTLINE.update({
    where: { id: documentLineId },
    data: { collectedQty: agg._sum.quantity ?? new Prisma.Decimal(0) },
    select: { documentId: true },
  })
  await refreshDocStatus(prisma, line.documentId, { source: 'collect', userId: userId ?? null })
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
    // Kaynak/hedef lokasyon+statü verilmezse SATIRDAN miras al (operatör tek tek girmesin; complete bunları kullanır)
    const ln = await prisma.tBLDOCUMENTLINE.findUnique({
      where: { id: parsed.data.documentLineId },
      select: {
        sourceLocationId: true, sourceStatusId: true, targetLocationId: true, targetStatusId: true, productId: true,
        product: { select: { productGroupId: true } },
        document: { select: { partnerId: true, operationType: { select: { id: true, direction: true, qualityControl: true } } } },
      },
    })
    // Okutulan (miras dahil) kaynak/hedef lokasyon+statü
    const eff = {
      sourceLocationId: parsed.data.sourceLocationId ?? ln?.sourceLocationId ?? null,
      sourceStatusId: parsed.data.sourceStatusId ?? ln?.sourceStatusId ?? null,
      targetLocationId: parsed.data.targetLocationId ?? ln?.targetLocationId ?? null,
      targetStatusId: parsed.data.targetStatusId ?? ln?.targetStatusId ?? null,
    }
    // Operasyon ↔ statü/lokasyon kuralı: okutulan statü/lokasyon tanıma uymuyorsa okutma reddedilir (uyumsuz hatası)
    if (ln?.document.operationType) {
      const partnerId = ln.document.partnerId ?? null
      const partnerGroupId = partnerId
        ? (await prisma.tBLBUSINESSPARTNER.findUnique({ where: { id: partnerId }, select: { partnerGroupId: true } }))?.partnerGroupId ?? null
        : null
      const vErr = await validateScopeAgainstOperation(prisma, companyId, ln.document.operationType,
        { partnerId, partnerGroupId, productId: ln.productId, productGroupId: ln.product?.productGroupId ?? null }, eff)
      if (vErr) return reply.code(400).send({ error: vErr })
    }
    const created = await prisma.tBLDOCUMENTLINESCOPE.create({ data: {
      ...parsed.data, companyId, scopeNo: (last?.scopeNo ?? 0) + 1,
      sourceLocationId: eff.sourceLocationId, sourceStatusId: eff.sourceStatusId,
      targetLocationId: eff.targetLocationId, targetStatusId: eff.targetStatusId,
    } })
    await recomputeCollected(parsed.data.documentLineId, Number((request.user as { sub?: number | string })?.sub) || null)
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
    const updated = await prisma.tBLDOCUMENTLINESCOPE.update({ where: { id }, data: parsed.data })
    await recomputeCollected(sc.documentLineId, Number((request.user as { sub?: number | string })?.sub) || null)
    return updated
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
    await recomputeCollected(sc.documentLineId, Number((request.user as { sub?: number | string })?.sub) || null)
    return { deleted: true }
  })
}
