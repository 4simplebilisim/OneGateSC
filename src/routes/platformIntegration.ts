import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { getCompanyId, companyListFilter } from '../lib/company.js'
import { firstBadRef } from '../lib/refGuard.js'
import { syncOrdersToDocuments } from '../lib/procurementBridge.js'

// WMS ↔ Procurement entegrasyon ayarı.
// Satır YOKSA entegrasyon kapalıdır: firma yalnız WMS, yalnız Procurement ya da ikisini
// bağımsız kullanıyor olabilir. Satır varsa hangi operasyona senkronlanacağı da burada.
const schema = z.object({
  facilityId: z.number().int().positive().nullish(), // boş = tüm tesisler
  isActive: z.boolean().optional(),
  receiptOperationTypeId: z.number().int().positive().nullish(),
  autoCreateReceipt: z.boolean().optional(),
  updateOrderOnComplete: z.boolean().optional(),
  note: z.string().max(255).nullish(),
})

export async function platformIntegrationRoutes(app: FastifyInstance) {
  app.get('/', { preHandler: [app.authenticate] }, async (request) =>
    prisma.tBLPLATFORMINTEGRATION.findMany({
      where: companyListFilter(request),
      orderBy: [{ facilityId: 'asc' }, { id: 'asc' }],
    }))

  app.get('/:id', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const row = await prisma.tBLPLATFORMINTEGRATION.findFirst({ where: { id: Number(id), ...companyListFilter(request) } })
    if (!row) return reply.code(404).send({ error: 'Bulunamadı' })
    return row
  })

  app.post('/', { preHandler: [app.authenticate, app.requireAdmin] }, async (request, reply) => {
    const parsed = schema.safeParse(request.body)
    if (!parsed.success) return reply.code(400).send({ error: 'Invalid body', details: parsed.error.flatten() })
    const companyId = getCompanyId(request)
    const bad = await firstBadRef(companyId, [
      ['tesis', 'facility', parsed.data.facilityId ?? undefined],
      ['operasyon tipi', 'operationType', parsed.data.receiptOperationTypeId ?? undefined],
    ])
    if (bad) return reply.code(400).send({ error: `Geçersiz ${bad} — bu firmaya ait değil` })
    try {
      return await prisma.tBLPLATFORMINTEGRATION.create({ data: { ...parsed.data, companyId } })
    } catch (e) {
      if ((e as { code?: string }).code === 'P2002') return reply.code(409).send({ error: 'Bu tesis için ayar zaten var' })
      throw e
    }
  })

  app.patch('/:id', { preHandler: [app.authenticate, app.requireAdmin] }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const parsed = schema.partial().safeParse(request.body)
    if (!parsed.success) return reply.code(400).send({ error: 'Invalid body', details: parsed.error.flatten() })
    const existing = await prisma.tBLPLATFORMINTEGRATION.findFirst({ where: { id: Number(id), ...companyListFilter(request) } })
    if (!existing) return reply.code(404).send({ error: 'Bulunamadı' })
    const bad = await firstBadRef(existing.companyId, [
      ['tesis', 'facility', parsed.data.facilityId ?? undefined],
      ['operasyon tipi', 'operationType', parsed.data.receiptOperationTypeId ?? undefined],
    ])
    if (bad) return reply.code(400).send({ error: `Geçersiz ${bad} — bu firmaya ait değil` })
    return prisma.tBLPLATFORMINTEGRATION.update({ where: { id: Number(id) }, data: parsed.data })
  })

  // Açık satınalma siparişlerini WMS belge tablosuna taşı (idempotent, elle tetikleme)
  app.post('/sync-orders', { preHandler: [app.authenticate, app.requireWrite] }, async (request) => {
    const u = request.user as { sub: number }
    const q = request.query as { facilityId?: string }
    return syncOrdersToDocuments(getCompanyId(request), u.sub, q.facilityId ? Number(q.facilityId) : null)
  })

  app.delete('/:id', { preHandler: [app.authenticate, app.requireAdmin] }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const existing = await prisma.tBLPLATFORMINTEGRATION.findFirst({ where: { id: Number(id), ...companyListFilter(request) } })
    if (!existing) return reply.code(404).send({ error: 'Bulunamadı' })
    await prisma.tBLPLATFORMINTEGRATION.delete({ where: { id: Number(id) } })
    return { ok: true }
  })
}

/**
 * Entegrasyon açık mı ve hangi mal kabul operasyonuna bağlanacak?
 * Tesise özel satır önceliklidir; yoksa firma geneli (facilityId = null) satırına düşer.
 * Satır yoksa entegrasyon KAPALI kabul edilir (bağımsız kullanım).
 */
export async function resolvePlatformIntegration(companyId: number, facilityId?: number | null) {
  const rows = await prisma.tBLPLATFORMINTEGRATION.findMany({ where: { companyId, isActive: true } })
  return rows.find((r) => facilityId != null && r.facilityId === facilityId) ?? rows.find((r) => r.facilityId == null) ?? null
}
