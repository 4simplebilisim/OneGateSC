import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { getCompanyId } from '../lib/company.js'
import { suggestReplenishment } from '../lib/replenishment.js'
import { nextSequence } from '../lib/sequence.js'

// RAF BESLEME — Raf Besleme Parametresi'ne göre beslenmesi gereken toplama gözleri
// ve kaynak önerileri. Öneri ekrandan onaylanınca TRANSFER belgesi doğar.
export async function replenishmentRoutes(app: FastifyInstance) {
  /** Beslenmesi gereken gözler (+ kaynak seçenekleri). */
  app.get('/suggest', { preHandler: [app.authenticate] }, async (request) => {
    const q = request.query as { partnerId?: string; locationGroupId?: string; limit?: string }
    return suggestReplenishment(getCompanyId(request), {
      partnerId: q.partnerId ? Number(q.partnerId) : null,
      locationGroupId: q.locationGroupId ? Number(q.locationGroupId) : null,
      limit: q.limit ? Number(q.limit) : undefined,
    })
  })

  /**
   * Seçilen önerilerden BESLEME BELGESİ (transfer) oluştur — DRAFT olarak.
   * Normal akışla (okut → onayla → tamamla) işlenir; stok burada değişmez.
   */
  app.post('/create-document', { preHandler: [app.authenticate, app.requireWrite] }, async (request, reply) => {
    const parsed = z.object({
      operationTypeId: z.number().int().positive(),
      lines: z.array(z.object({
        stockId: z.number().int().positive(),      // kaynak stok satırı
        targetLocationId: z.number().int().positive(),
        quantity: z.number().positive(),
      })).min(1).max(200),
    }).safeParse(request.body)
    if (!parsed.success) return reply.code(400).send({ error: 'Invalid body', details: parsed.error.flatten() })

    const companyId = getCompanyId(request)
    const userId = Number((request.user as { sub?: number | string })?.sub)
    if (!Number.isInteger(userId)) return reply.code(401).send({ error: 'Kullanıcı belirlenemedi' })
    const op = await prisma.tBLOPERATIONTYPE.findFirst({
      where: { id: parsed.data.operationTypeId, companyId }, include: { sequence: true },
    })
    if (!op) return reply.code(400).send({ error: 'Operasyon bulunamadı' })
    if (op.direction !== 'INTERNAL') return reply.code(400).send({ error: 'Raf besleme TRANSFER (iç hareket) operasyonuyla yapılır' })

    const stoklar = await prisma.tBLSTOCK.findMany({
      where: { id: { in: parsed.data.lines.map((l) => l.stockId) }, companyId },
    })
    if (stoklar.length !== parsed.data.lines.length) return reply.code(400).send({ error: 'Kaynak stok satırı bulunamadı' })

    for (const l of parsed.data.lines) {
      const s = stoklar.find((x) => x.id === l.stockId)!
      if (s.mainQty.lt(l.quantity)) {
        return reply.code(400).send({ error: `#${l.stockId}: eldeki ${s.mainQty} — ${l.quantity} beslenemez` })
      }
    }

    const documentNo = op.sequenceId && op.sequence
      ? (await nextSequence(companyId, op.sequence.code)).formatted
      : `RB-${Date.now().toString(36).toUpperCase()}`

    const doc = await prisma.tBLDOCUMENT.create({
      data: {
        companyId, documentNo, operationTypeId: op.id, status: 'DRAFT',
        createdById: userId,
        note: 'Raf besleme önerisinden oluşturuldu',
        lines: {
          create: parsed.data.lines.map((l, i) => {
            const s = stoklar.find((x) => x.id === l.stockId)!
            return {
              companyId, lineNo: i + 1, productId: s.productId, unitId: s.unitId, quantity: l.quantity,
              sourceLocationId: s.locationId, sourceStatusId: s.statusId,
              targetLocationId: l.targetLocationId, targetStatusId: s.statusId,
              batchNo: s.batchNo, serialNo: s.serialNo, palletId: s.palletId,
            }
          }),
        },
      },
      include: { lines: { orderBy: { lineNo: 'asc' } } },
    })
    return reply.code(201).send(doc)
  })
}
