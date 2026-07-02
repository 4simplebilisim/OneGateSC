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

const num = (v?: string) => (v ? Number(v) : undefined)

// Güncel stok (Stok Durum + Palet İzleme = paletin şu anki konumu). tesis/depo/alan/lokasyon/ürün/palet/batch/statü süzme.
// palletOnly=true → yalnız paletli stok (Palet İzleme; paletsiz satırlar gizlenir).
async function runStock(companyId: number, c: Crit, palletOnly = false) {
  const locFilter = {
    ...(c.warehouseId ? { warehouseId: Number(c.warehouseId) } : {}),
    ...(c.facilityId ? { warehouse: { facilityId: Number(c.facilityId) } } : {}),
    ...(c.areaId ? { areaId: Number(c.areaId) } : {}),
    ...(c.locationId ? { id: Number(c.locationId) } : {}),
  }
  const stocks = await prisma.tBLSTOCK.findMany({
    where: {
      companyId, mainQty: { gt: 0 },
      productId: num(c.productId), statusId: num(c.statusId),
      palletId: c.palletId ? Number(c.palletId) : palletOnly ? { not: null } : undefined,
      ...(c.batchNo ? { batchNo: { contains: c.batchNo, mode: 'insensitive' as const } } : {}),
      ...(Object.keys(locFilter).length ? { location: locFilter } : {}),
    },
    include: {
      product: { select: { code: true, name: true } },
      location: { select: { code: true, warehouse: { select: { code: true, name: true, facility: { select: { code: true, name: true } } } } } },
      status: { select: { code: true } }, pallet: { select: { palletNo: true } }, unit: { select: { code: true } },
    },
    orderBy: { id: 'asc' }, take: 2000,
  })
  const cn = (co?: string, n?: string) => (co ? (n ? `${co} — ${n}` : co) : '')
  return stocks.map((s) => ({
    tesis: cn(s.location.warehouse?.facility?.code, s.location.warehouse?.facility?.name),
    depo: cn(s.location.warehouse?.code, s.location.warehouse?.name), lokasyon: s.location.code,
    palet: s.pallet?.palletNo ?? '', urun: cn(s.product.code, s.product.name), statu: s.status.code,
    batchNo: s.batchNo ?? '', miktar: s.mainQty.toString(), birim: s.unit.code,
  }))
}

async function runDocuments(companyId: number, c: Crit, forceOpen = false) {
  const dirs = ['INBOUND', 'OUTBOUND', 'INTERNAL', 'COUNT']
  const sts = ['DRAFT', 'CONFIRMED', 'COMPLETED', 'CANCELLED']
  // Satır-seviyesi kriterler (ürün/palet/batch): belgenin herhangi bir satırı eşleşmeli
  const lineFilter = {
    ...(c.productId ? { productId: Number(c.productId) } : {}),
    ...(c.palletId ? { palletId: Number(c.palletId) } : {}),
    ...(c.batchNo ? { batchNo: { contains: c.batchNo, mode: 'insensitive' as const } } : {}),
  }
  const docs = await prisma.tBLDOCUMENT.findMany({
    where: {
      companyId,
      ...(c.operationTypeId ? { operationTypeId: Number(c.operationTypeId) } : {}),
      ...(c.direction && dirs.includes(c.direction) ? { operationType: { direction: c.direction as 'INBOUND' } } : {}),
      ...(forceOpen || c.openOnly === 'true'
        ? { status: { in: ['DRAFT', 'CONFIRMED'] } } // Açık Belge = toplanmamış/onaylanmamış
        : (c.status && sts.includes(c.status) ? { status: c.status as 'DRAFT' } : {})),
      ...(Object.keys(lineFilter).length ? { lines: { some: lineFilter } } : {}),
    },
    include: { operationType: { select: { code: true, direction: true } }, documentStatus: { select: { name: true } }, partner: { select: { code: true, name: true } }, _count: { select: { lines: true } } },
    orderBy: { id: 'desc' }, take: 2000,
  })
  return docs.map((d) => ({
    belgeNo: d.documentNo, operasyon: d.operationType.code, yon: d.operationType.direction,
    cari: d.partner ? `${d.partner.code}${d.partner.name ? ' — ' + d.partner.name : ''}` : '',
    durum: d.documentStatus?.name ?? d.status, tarih: d.documentDate.toISOString().slice(0, 10), satir: String(d._count.lines),
  }))
}

async function runPallets(companyId: number, c: Crit) {
  const pallets = await prisma.tBLPALLET.findMany({
    where: { companyId, ...(c.palletNo ? { palletNo: { contains: c.palletNo, mode: 'insensitive' } } : {}) },
    include: { palletType: { select: { code: true } } }, orderBy: { id: 'desc' }, take: 2000,
  })
  return pallets.map((p) => ({ paletNo: p.palletNo, tip: p.palletType?.code ?? '', durum: p.isActive ? 'Aktif' : 'Pasif' }))
}

// Hareket analizi (Çıkış/Giriş/Transfer) + Palet Tarihçesi — TBLSTOCKLEDGER'dan hareket dökümü.
// Ledger denormalize (ilişki yok) → belge/operasyon/ürün/lokasyon/statü/palet/birim/kullanıcı toplu lookup.
// opts.chronological=true → eskiden yeniye (Palet Tarihçesi: giriş→çıkış). direction yoksa tüm yönler.
async function runMovements(companyId: number, c: Crit, direction?: 'INBOUND' | 'OUTBOUND' | 'INTERNAL', opts: { chronological?: boolean; palletOnly?: boolean } = {}) {
  // Üst Palet No → o palete bağlı alt paletlerin id'leri (ledger palletId'de yalnız alt palet var)
  let palletIds: number[] | undefined
  if (c.parentPalletId) {
    const kids = await prisma.tBLPALLET.findMany({ where: { companyId, parentPalletId: Number(c.parentPalletId) }, select: { id: true } })
    palletIds = kids.map((k) => k.id)
    if (!palletIds.length) return []
  }
  // tesis/depo/alan → lokasyon id kümesi
  let locIds: number[] | undefined
  if (c.facilityId || c.warehouseId || c.areaId) {
    const locs = await prisma.tBLLOCATION.findMany({
      where: {
        companyId,
        ...(c.warehouseId ? { warehouseId: Number(c.warehouseId) } : {}),
        ...(c.facilityId ? { warehouse: { facilityId: Number(c.facilityId) } } : {}),
        ...(c.areaId ? { areaId: Number(c.areaId) } : {}),
      },
      select: { id: true },
    })
    locIds = locs.map((l) => l.id)
    if (!locIds.length) return []
  }
  // belge no / cari → belge id kümesi
  let docIds: number[] | undefined
  if (c.documentNo || c.partnerId) {
    const docs = await prisma.tBLDOCUMENT.findMany({
      where: {
        companyId,
        ...(c.documentNo ? { documentNo: { contains: c.documentNo, mode: 'insensitive' as const } } : {}),
        ...(c.partnerId ? { partnerId: Number(c.partnerId) } : {}),
      },
      select: { id: true },
    })
    docIds = docs.map((d) => d.id)
    if (!docIds.length) return []
  }
  const dateFilter = {
    ...(c.dateFrom ? { gte: new Date(c.dateFrom.slice(0, 10) + 'T00:00:00.000Z') } : {}),
    ...(c.dateTo ? { lte: new Date(c.dateTo.slice(0, 10) + 'T23:59:59.999Z') } : {}),
  }
  const led = await prisma.tBLSTOCKLEDGER.findMany({
    where: {
      companyId,
      ...(direction ? { direction } : {}),
      operationTypeId: num(c.operationTypeId), productId: num(c.productId), statusId: num(c.statusId),
      userId: num(c.userId),
      ...(c.palletId ? { palletId: Number(c.palletId) } : palletIds ? { palletId: { in: palletIds } } : opts.palletOnly ? { palletId: { not: null } } : {}),
      ...(c.locationId ? { locationId: Number(c.locationId) } : locIds ? { locationId: { in: locIds } } : {}),
      ...(docIds ? { documentId: { in: docIds } } : {}),
      ...(c.batchNo ? { batchNo: { contains: c.batchNo, mode: 'insensitive' as const } } : {}),
      ...(Object.keys(dateFilter).length ? { createdAt: dateFilter } : {}),
    },
    orderBy: opts.chronological ? { id: 'asc' } : { id: 'desc' }, // kronolojik = giriş→çıkış (id sırası = kayıt sırası)
    take: c.limit ? Math.max(1, Math.min(Number(c.limit), 5000)) : 2000, // Kayıt Sayısı
  })
  if (!led.length) return []
  const uniq = (arr: (number | null)[]) => [...new Set(arr.filter((x): x is number => x != null))]
  const [docs, ops, prods, locs, stats, pals, units, users] = await Promise.all([
    prisma.tBLDOCUMENT.findMany({ where: { id: { in: uniq(led.map((r) => r.documentId)) } }, select: { id: true, documentNo: true, partner: { select: { code: true, name: true } } } }),
    prisma.tBLOPERATIONTYPE.findMany({ where: { id: { in: uniq(led.map((r) => r.operationTypeId)) } }, select: { id: true, code: true, name: true } }),
    prisma.tBLPRODUCT.findMany({ where: { id: { in: uniq(led.map((r) => r.productId)) } }, select: { id: true, code: true, name: true } }),
    prisma.tBLLOCATION.findMany({ where: { id: { in: uniq(led.map((r) => r.locationId)) } }, select: { id: true, code: true, warehouse: { select: { code: true } } } }),
    prisma.tBLSTATUS.findMany({ where: { id: { in: uniq(led.map((r) => r.statusId)) } }, select: { id: true, code: true } }),
    prisma.tBLPALLET.findMany({ where: { id: { in: uniq(led.map((r) => r.palletId)) } }, select: { id: true, palletNo: true, parentPallet: { select: { palletNo: true } } } }),
    prisma.tBLUNIT.findMany({ where: { id: { in: uniq(led.map((r) => r.unitId)) } }, select: { id: true, code: true } }),
    prisma.tBLUSER.findMany({ where: { id: { in: uniq(led.map((r) => r.userId)) } }, select: { id: true, username: true } }),
  ])
  const idMap = <T extends { id: number }>(arr: T[]) => new Map(arr.map((x) => [x.id, x]))
  const dM = idMap(docs), oM = idMap(ops), pM = idMap(prods), lM = idMap(locs), sM = idMap(stats), palM = idMap(pals), uM = idMap(units), userM = idMap(users)
  const cn = (co?: string, n?: string) => (co ? (n ? `${co} — ${n}` : co) : '')
  return led.map((r) => {
    const d = r.documentId != null ? dM.get(r.documentId) : undefined
    const p = r.productId != null ? pM.get(r.productId) : undefined
    const delta = Number(r.qtyDelta)
    return {
      tarih: r.createdAt.toISOString().slice(0, 10),
      belgeNo: d?.documentNo ?? '',
      operasyon: r.operationTypeId != null ? cn(oM.get(r.operationTypeId)?.code, oM.get(r.operationTypeId)?.name) : '',
      cari: d?.partner ? cn(d.partner.code, d.partner.name) : '',
      urun: cn(p?.code, p?.name),
      depo: r.locationId != null ? lM.get(r.locationId)?.warehouse?.code ?? '' : '',
      lokasyon: r.locationId != null ? lM.get(r.locationId)?.code ?? '' : '',
      giris: delta > 0 ? String(delta) : '', cikis: delta < 0 ? String(-delta) : '',
      birim: r.unitId != null ? uM.get(r.unitId)?.code ?? '' : '',
      batch: r.batchNo ?? '',
      palet: r.palletId != null ? palM.get(r.palletId)?.palletNo ?? '' : '',
      ustPalet: r.palletId != null ? palM.get(r.palletId)?.parentPallet?.palletNo ?? '' : '',
      statu: r.statusId != null ? sM.get(r.statusId)?.code ?? '' : '',
      kullanici: r.userId != null ? userM.get(r.userId)?.username ?? '' : '',
    }
  })
}

async function runReport(companyId: number, sourceKey: string, c: Crit) {
  if (sourceKey === 'STOCK') return runStock(companyId, c)
  if (sourceKey === 'PALLET_TRACK') return runStock(companyId, c, true) // Palet İzleme — yalnız paletli stok
  if (sourceKey === 'DOCUMENTS') return runDocuments(companyId, c)
  if (sourceKey === 'OPEN_DOCUMENTS') return runDocuments(companyId, c, true) // Açık Belge Listesi (openOnly zorlanır)
  if (sourceKey === 'PALLETS') return runPallets(companyId, c)
  if (sourceKey === 'MOVEMENTS_OUT') return runMovements(companyId, c, 'OUTBOUND') // Çıkış Hareketleri Analizi
  if (sourceKey === 'MOVEMENTS_IN') return runMovements(companyId, c, 'INBOUND') // Giriş Hareketleri Analizi
  if (sourceKey === 'MOVEMENTS_TR') return runMovements(companyId, c, 'INTERNAL') // Transfer Hareketleri Analizi
  if (sourceKey === 'PALLET_HISTORY') return runMovements(companyId, c, undefined, { chronological: true, palletOnly: true }) // Palet Tarihçesi — yalnız paletli hareketler, giriş→çıkış
  return []
}

// ── Çalıştırma uçları: tanım (full) + run ──
export async function reportRunRoutes(app: FastifyInstance) {
  // rapor listesi (sadece başlık) — AKTİF firmaya göre (run ile tutarlı; süper-admin firma değiştirince o firmanın raporları)
  app.get('/', async (request) => prisma.tBLREPORTDEF.findMany({ where: { companyId: getCompanyId(request), isActive: true }, orderBy: [{ category: 'asc' }, { name: 'asc' }] }))

  // tek raporun tam tanımı (kriter + saha) — aktif firma
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
