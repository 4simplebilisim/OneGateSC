import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { Prisma } from '@prisma/client'
import { prisma } from '../lib/prisma.js'
import { getCompanyId } from '../lib/company.js'
import { refreshDocStatus } from '../lib/documentStatus.js'
import { validateScopeAgainstOperation, loadTolerances, pickTolerance } from '../lib/movement.js'
import { firstBadRef } from '../lib/refGuard.js'
import { rotationWarning, type Rotation } from '../lib/rotation.js'

// Sadece-tarih alanı (üretim/SKT): "YYYY-MM-DD" → UTC ÖĞLE Date (timezone gün-kayması önlenir; @db.Date günü korur)
const dateOnly = z.preprocess(
  (v) => (typeof v === 'string' && v ? new Date(v.slice(0, 10) + 'T12:00:00.000Z') : v),
  z.date().nullable().optional(),
)

// Belge Satır Kapsamı (okutma) — legacy TBLSBBELGEKAPSAM. Bir DETAY satırına N okutma.
// İki mod: (a) documentLineId → mevcut satıra okutma (kontrollü: plan satırına toplama)
//          (b) documentId + productId → SATIR-YARATAN okutma (kontrolsüz: belge boş açılır, okutma satırı bul-veya-yaratır)
const scopeSchema = z.object({
  documentLineId: z.number().int().positive().optional(),
  documentId: z.number().int().positive().optional(),
  productId: z.number().int().positive().optional(),
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

// Okutma değişince satırın collectedQty'sini (Σ kapsam) yeniden hesapla + belge durumunu tazele (BKL→TPL→OBK otomatik).
// KONTROLSÜZ op'ta satır MİKTARI da Σ okutma olur (plan yok — belge okutmayla dolar/oluşur; legacy).
async function recomputeCollected(documentLineId: number, userId?: number | null) {
  const agg = await prisma.tBLDOCUMENTLINESCOPE.aggregate({ where: { documentLineId }, _sum: { quantity: true } })
  const sum = agg._sum.quantity ?? new Prisma.Decimal(0)
  const info = await prisma.tBLDOCUMENTLINE.findUnique({
    where: { id: documentLineId },
    select: { documentId: true, document: { select: { operationType: { select: { controlMode: true } } } } },
  })
  if (!info) return
  const uncontrolled = info.document.operationType.controlMode === 'UNCONTROLLED'
  await prisma.tBLDOCUMENTLINE.update({
    where: { id: documentLineId },
    data: { collectedQty: sum, ...(uncontrolled ? { quantity: sum } : {}) },
  })
  await refreshDocStatus(prisma, info.documentId, { source: 'collect', userId: userId ?? null })
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
    // documentId/productId scope kolonu değil — satır çözümlemesinde kullanılır, create'e spread edilmez
    const { documentLineId: givenLineId, documentId, productId, ...scopeData } = parsed.data

    let documentLineId = givenLineId
    if (!documentLineId) {
      // SATIR-YARATAN okutma (kontrolsüz): belge boş açılır, her okutma ürün satırını bul-veya-yaratır
      if (!documentId || !productId) return reply.code(400).send({ error: 'documentLineId ya da (documentId + productId) gerekli' })
      const doc = await prisma.tBLDOCUMENT.findFirst({
        where: { id: documentId, companyId },
        select: { status: true, operationType: { select: { controlMode: true } } },
      })
      if (!doc) return reply.code(404).send({ error: 'Belge bulunamadı' })
      if (doc.status !== 'DRAFT') return reply.code(409).send({ error: 'Sadece DRAFT belgede okutma düzenlenebilir' })
      if (doc.operationType.controlMode !== 'UNCONTROLLED') {
        return reply.code(400).send({ error: 'Kontrollü belgede okutma plan satırına yapılır (documentLineId verin) — içerik plandan bellidir' })
      }
      const bad = await firstBadRef(companyId, [['Ürün', 'product', productId], ['Birim', 'unit', scopeData.unitId]])
      if (bad) return reply.code(400).send({ error: `${bad}: başka firmaya ait veya geçersiz` })
      let line = await prisma.tBLDOCUMENTLINE.findFirst({ where: { documentId, productId, unitId: scopeData.unitId } })
      if (!line) {
        const maxNo = await prisma.tBLDOCUMENTLINE.aggregate({ where: { documentId }, _max: { lineNo: true } })
        line = await prisma.tBLDOCUMENTLINE.create({
          data: { companyId, documentId, lineNo: (maxNo._max.lineNo ?? 0) + 1, productId, unitId: scopeData.unitId, quantity: 0, collectedQty: 0 },
        })
      }
      documentLineId = line.id
    } else {
      const g = await draftLineGuard(companyId, documentLineId)
      if (g) return reply.code(g.code).send({ error: g.error })
    }
    const last = await prisma.tBLDOCUMENTLINESCOPE.findFirst({ where: { documentLineId }, orderBy: { scopeNo: 'desc' }, select: { scopeNo: true } })
    // Kaynak/hedef lokasyon+statü verilmezse SATIRDAN miras al (operatör tek tek girmesin; complete bunları kullanır)
    const ln = await prisma.tBLDOCUMENTLINE.findUnique({
      where: { id: documentLineId },
      select: {
        documentId: true,
        sourceLocationId: true, sourceStatusId: true, targetLocationId: true, targetStatusId: true, productId: true,
        batchNo: true, serialNo: true, quantity: true,
        product: { select: { productGroupId: true } },
        document: { select: { partnerId: true, operationType: { select: { id: true, direction: true, qualityControl: true, controlMode: true, stockRotation: true } } } },
      },
    })
    // Okutulan (miras dahil) kaynak/hedef lokasyon+statü
    const eff = {
      sourceLocationId: scopeData.sourceLocationId ?? ln?.sourceLocationId ?? null,
      sourceStatusId: scopeData.sourceStatusId ?? ln?.sourceStatusId ?? null,
      targetLocationId: scopeData.targetLocationId ?? ln?.targetLocationId ?? null,
      targetStatusId: scopeData.targetStatusId ?? ln?.targetStatusId ?? null,
    }
    // Statü çözümü: okutma → satır → OPERASYONUN STATÜ GEÇİŞİ (otomatik doldurma).
    // Hiçbirinde yoksa → operasyonda statü tanımı EKSİK: okutma net hatayla reddedilir (sessiz statüsüz stok oluşmaz).
    if (ln?.document.operationType) {
      const dirn = ln.document.operationType.direction
      const opId = ln.document.operationType.id
      if (!eff.targetStatusId && (dirn === 'INBOUND' || dirn === 'INTERNAL')) {
        const tr = await prisma.tBLOPERATIONTYPESTATUS.findFirst({
          where: { companyId, operationTypeId: opId, targetStatusId: { not: null } },
          orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }], select: { targetStatusId: true },
        })
        eff.targetStatusId = tr?.targetStatusId ?? null
      }
      if (!eff.sourceStatusId && (dirn === 'OUTBOUND' || dirn === 'INTERNAL')) {
        const tr = await prisma.tBLOPERATIONTYPESTATUS.findFirst({
          where: { companyId, operationTypeId: opId, sourceStatusId: { not: null } },
          orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }], select: { sourceStatusId: true },
        })
        eff.sourceStatusId = tr?.sourceStatusId ?? null
      }
      if ((dirn === 'INBOUND' || dirn === 'INTERNAL') && !eff.targetStatusId) {
        return reply.code(400).send({ error: 'Operasyonda statü tanımı eksik — hedef statü çözülemedi. Operasyon Tipi › Statü sekmesinden geçiş tanımlayın' })
      }
      if ((dirn === 'OUTBOUND' || dirn === 'INTERNAL') && !eff.sourceStatusId) {
        return reply.code(400).send({ error: 'Operasyonda statü tanımı eksik — kaynak statü çözülemedi. Operasyon Tipi › Statü sekmesinden geçiş tanımlayın' })
      }
    }

    // Operasyon ↔ statü/lokasyon kuralı: okutulan statü/lokasyon tanıma uymuyorsa okutma reddedilir (uyumsuz hatası)
    if (ln?.document.operationType) {
      const partnerId = ln.document.partnerId ?? null
      const partnerGroupId = partnerId
        ? (await prisma.tBLBUSINESSPARTNER.findUnique({ where: { id: partnerId }, select: { partnerGroupId: true } }))?.partnerGroupId ?? null
        : null
      const ctx = { partnerId, partnerGroupId, productId: ln.productId, productGroupId: ln.product?.productGroupId ?? null }
      const vErr = await validateScopeAgainstOperation(prisma, companyId, ln.document.operationType, ctx, eff)
      if (vErr) return reply.code(400).send({ error: vErr })
      // KONTROLLÜ/REFERANSLI toplama ÜST SINIRI: Σ okutma satır miktarını AŞAMAZ — üst tolerans tanımlıysa o kadar esner.
      // (Kontrolsüzde sınır yok: plan yok, belge okutmayla dolar.)
      if (ln.document.operationType.controlMode !== 'UNCONTROLLED') {
        const agg = await prisma.tBLDOCUMENTLINESCOPE.aggregate({ where: { documentLineId }, _sum: { quantity: true } })
        const current = agg._sum.quantity ?? new Prisma.Decimal(0)
        const tolerances = await loadTolerances(prisma, companyId, ln.document.operationType.id)
        const { upperPct } = pickTolerance(tolerances, ctx, scopeData.unitId)
        const limit = ln.quantity.mul(new Prisma.Decimal(1).add(upperPct.div(100)))
        const after = current.add(new Prisma.Decimal(scopeData.quantity))
        if (after.gt(limit)) {
          return reply.code(400).send({
            error: `Tolerans aşımı: satır miktarı ${ln.quantity}, toplanan ${current} + okutma ${scopeData.quantity} = ${after} > üst sınır ${limit}` +
              (upperPct.gt(0) ? ` (üst tolerans %${upperPct})` : ' (tolerans tanımsız — plan üstü okutma yapılamaz)'),
          })
        }
      }
    }
    // Rezerv kapısı (legacy LNGREZERVEBELGEKOD): kaynak stok BAŞKA belgeye rezerveyse yalnız SERBEST kısmı okutulabilir.
    // (complete'teki adjustStock kesin kapı — bu erken, kullanıcı-dostu red.)
    if (ln?.document.operationType && (ln.document.operationType.direction === 'OUTBOUND' || ln.document.operationType.direction === 'INTERNAL') && eff.sourceLocationId && eff.sourceStatusId) {
      const st = await prisma.tBLSTOCK.findFirst({
        where: {
          companyId, locationId: eff.sourceLocationId, productId: ln.productId, statusId: eff.sourceStatusId,
          batchNo: scopeData.batchNo ?? ln.batchNo ?? null,
          serialNo: scopeData.serialNo ?? ln.serialNo ?? null,
          palletId: scopeData.palletId ?? null,
          customerId: scopeData.customerId ?? null, poNo: scopeData.poNo ?? null, poLine: scopeData.poLine ?? null,
          reservedQty: { gt: 0 },
        },
        select: { reservedQty: true, mainQty: true, reservedDocumentId: true },
      })
      if (st && st.reservedDocumentId !== ln.documentId) {
        const free = st.mainQty.sub(st.reservedQty)
        if (new Prisma.Decimal(scopeData.quantity).gt(free)) {
          const owner = st.reservedDocumentId != null ? `belge #${st.reservedDocumentId}'e rezerve` : 'blokaj/tahsis rezervli'
          return reply.code(400).send({ error: `Rezerve stok — bu stok ${owner}; yalnız o belgede okutulabilir (serbest: ${free.toString()}, okutma: ${scopeData.quantity})` })
        }
      }
    }
    const created = await prisma.tBLDOCUMENTLINESCOPE.create({ data: {
      ...scopeData, documentLineId, companyId, scopeNo: (last?.scopeNo ?? 0) + 1,
      sourceLocationId: eff.sourceLocationId, sourceStatusId: eff.sourceStatusId,
      targetLocationId: eff.targetLocationId, targetStatusId: eff.targetStatusId,
      // Parti/seri okutmada verilmezse plan satırından miras (complete scope'u gerçek kaynak alır)
      batchNo: scopeData.batchNo ?? ln?.batchNo ?? null,
      serialNo: scopeData.serialNo ?? ln?.serialNo ?? null,
    } })
    await recomputeCollected(documentLineId, Number((request.user as { sub?: number | string })?.sub) || null)

    // Stok rotasyonu (öner+uyar): ÇIKIŞ operasyonunda daha eski lot dururken yeni lot okutulduysa uyar (bloklamaz)
    let warning: string | null = null
    const op = ln?.document.operationType
    if (op && op.direction === 'OUTBOUND' && (op.stockRotation ?? 'NONE') !== 'NONE' && eff.sourceLocationId) {
      warning = await rotationWarning({
        companyId, strategy: op.stockRotation as Rotation, productId: ln!.productId, sourceLocationId: eff.sourceLocationId,
        pickedExpiry: scopeData.expiryDate ?? null, pickedProduction: scopeData.productionDate ?? null,
        pickedBatchNo: scopeData.batchNo ?? ln!.batchNo ?? null,
      })
    }
    return reply.code(201).send(warning ? { ...created, _warning: warning } : created)
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
    // documentLineId/documentId/productId PATCH ile değiştirilemez (okutma satırına bağlıdır; taşıma = sil + yeniden okut)
    const { documentLineId: _l, documentId: _d, productId: _p, ...patch } = parsed.data
    // Miktar artırılıyorsa üst sınır (satır miktarı + üst tolerans) kontrolü — POST'takiyle aynı kural
    if (patch.quantity != null) {
      const ln2 = await prisma.tBLDOCUMENTLINE.findUnique({
        where: { id: sc.documentLineId },
        select: {
          quantity: true, productId: true, product: { select: { productGroupId: true } },
          document: { select: { partnerId: true, partner: { select: { partnerGroupId: true } }, operationType: { select: { id: true, controlMode: true } } } },
        },
      })
      if (ln2 && ln2.document.operationType.controlMode !== 'UNCONTROLLED') {
        const agg = await prisma.tBLDOCUMENTLINESCOPE.aggregate({ where: { documentLineId: sc.documentLineId }, _sum: { quantity: true } })
        const others = (agg._sum.quantity ?? new Prisma.Decimal(0)).sub(sc.quantity)
        const tolerances = await loadTolerances(prisma, companyId, ln2.document.operationType.id)
        const { upperPct } = pickTolerance(tolerances, { partnerId: ln2.document.partnerId, partnerGroupId: ln2.document.partner?.partnerGroupId ?? null, productId: ln2.productId, productGroupId: ln2.product?.productGroupId ?? null }, patch.unitId ?? sc.unitId)
        const limit = ln2.quantity.mul(new Prisma.Decimal(1).add(upperPct.div(100)))
        if (others.add(new Prisma.Decimal(patch.quantity)).gt(limit)) {
          return reply.code(400).send({ error: `Tolerans aşımı: toplam okutma ${others.add(new Prisma.Decimal(patch.quantity))} > üst sınır ${limit}` })
        }
      }
    }
    const updated = await prisma.tBLDOCUMENTLINESCOPE.update({ where: { id }, data: patch })
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
