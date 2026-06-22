import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { getCompanyId } from '../lib/company.js'
import { simpleCrud, type Delegate } from './documentTypes.js'

const pInt = z.number().int().positive()

// ── Config CRUD: Rapor Başlık / Kriter / Saha (Uyarlamalar) ──
const reportDef = z.object({ code: z.string().min(1).max(40), name: z.string().min(1).max(120), sourceKey: z.string().min(1).max(40), category: z.string().max(60).optional(), isActive: z.boolean().optional() })
export const reportDefRoutes = simpleCrud(prisma.tBLREPORTDEF as unknown as Delegate, reportDef, reportDef.partial(), 'Rapor bulunamadı')

const reportCriteria = z.object({ reportId: pInt, fieldCode: z.string().min(1).max(40), label: z.string().min(1).max(80), type: z.string().min(1).max(20), refResource: z.string().max(60).optional(), options: z.string().max(500).optional(), required: z.boolean().optional(), sortOrder: z.number().int().optional() })
export const reportCriteriaRoutes = simpleCrud(prisma.tBLREPORTCRITERIA as unknown as Delegate, reportCriteria, reportCriteria.partial(), 'Kriter bulunamadı', 'reportId')

const reportField = z.object({ reportId: pInt, fieldCode: z.string().min(1).max(40), label: z.string().min(1).max(80), align: z.string().max(10).optional(), sortOrder: z.number().int().optional() })
export const reportFieldRoutes = simpleCrud(prisma.tBLREPORTFIELD as unknown as Delegate, reportField, reportField.partial(), 'Saha bulunamadı', 'reportId')

// ── Rapor motoru: sourceKey → sorgu (kriterlerle filtrele, alanlarla kolonla) ──
type Crit = Record<string, string>

async function runStock(companyId: number, c: Crit) {
  const stocks = await prisma.tBLSTOCK.findMany({
    where: {
      companyId, mainQty: { gt: 0 },
      ...(c.warehouseId ? { location: { warehouseId: Number(c.warehouseId) } } : {}),
      ...(c.productId ? { productId: Number(c.productId) } : {}),
      ...(c.statusId ? { statusId: Number(c.statusId) } : {}),
    },
    include: { product: { select: { code: true } }, location: { select: { code: true } }, status: { select: { code: true } } },
    orderBy: { id: 'asc' }, take: 2000,
  })
  return stocks.map((s) => ({ lokasyon: s.location.code, urun: s.product.code, statu: s.status.code, batchNo: s.batchNo ?? '', miktar: s.mainQty.toString() }))
}

async function runDocuments(companyId: number, c: Crit) {
  const dirs = ['INBOUND', 'OUTBOUND', 'INTERNAL', 'COUNT']
  const sts = ['DRAFT', 'CONFIRMED', 'COMPLETED', 'CANCELLED']
  const docs = await prisma.tBLDOCUMENT.findMany({
    where: {
      companyId,
      ...(c.direction && dirs.includes(c.direction) ? { operationType: { direction: c.direction as 'INBOUND' } } : {}),
      ...(c.status && sts.includes(c.status) ? { status: c.status as 'DRAFT' } : c.openOnly === 'true' ? { status: { in: ['DRAFT', 'CONFIRMED'] } } : {}),
    },
    include: { operationType: { select: { code: true, direction: true } }, _count: { select: { lines: true } } },
    orderBy: { id: 'desc' }, take: 2000,
  })
  return docs.map((d) => ({ belgeNo: d.documentNo, operasyon: d.operationType.code, yon: d.operationType.direction, durum: d.status, tarih: d.documentDate.toISOString().slice(0, 10), satir: String(d._count.lines) }))
}

async function runPallets(companyId: number, c: Crit) {
  const pallets = await prisma.tBLPALLET.findMany({
    where: { companyId, ...(c.palletNo ? { palletNo: { contains: c.palletNo, mode: 'insensitive' } } : {}) },
    include: { palletType: { select: { code: true } } }, orderBy: { id: 'desc' }, take: 2000,
  })
  return pallets.map((p) => ({ paletNo: p.palletNo, tip: p.palletType?.code ?? '', durum: p.isActive ? 'Aktif' : 'Pasif' }))
}

async function runReport(companyId: number, sourceKey: string, c: Crit) {
  if (sourceKey === 'STOCK') return runStock(companyId, c)
  if (sourceKey === 'DOCUMENTS') return runDocuments(companyId, c)
  if (sourceKey === 'PALLETS') return runPallets(companyId, c)
  return []
}

// ── Çalıştırma uçları: tanım (full) + run ──
export async function reportRunRoutes(app: FastifyInstance) {
  // rapor listesi (sadece başlık)
  app.get('/', async (request) => prisma.tBLREPORTDEF.findMany({ where: { companyId: getCompanyId(request), isActive: true }, orderBy: [{ category: 'asc' }, { name: 'asc' }] }))

  // tek raporun tam tanımı (kriter + saha)
  app.get('/:id', async (request, reply) => {
    const id = Number((request.params as { id: string }).id)
    if (!Number.isInteger(id)) return reply.code(400).send({ error: 'Invalid id' })
    const def = await prisma.tBLREPORTDEF.findFirst({
      where: { id, companyId: getCompanyId(request) },
      include: { criteria: { orderBy: { sortOrder: 'asc' } }, fields: { orderBy: { sortOrder: 'asc' } } },
    })
    if (!def) return reply.code(404).send({ error: 'Rapor bulunamadı' })
    return def
  })

  // raporu çalıştır (gövde = kriter değerleri) → { rows }
  app.post('/:id/run', { preHandler: [app.authenticate] }, async (request, reply) => {
    const id = Number((request.params as { id: string }).id)
    if (!Number.isInteger(id)) return reply.code(400).send({ error: 'Invalid id' })
    const companyId = getCompanyId(request)
    const def = await prisma.tBLREPORTDEF.findFirst({ where: { id, companyId } })
    if (!def) return reply.code(404).send({ error: 'Rapor bulunamadı' })
    const crit = (request.body ?? {}) as Crit
    const rows = await runReport(companyId, def.sourceKey, crit)
    return { rows }
  })
}
