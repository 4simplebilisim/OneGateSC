import { prisma } from './prisma.js'

// Barkod kural motoru: barkod tipini (eşleşme) seç → moda göre çöz (EAN/PALET/SEGMENT).
// Legacy TBLSBBARKODTIPI.TXTSCRIPT'in bildirimsel karşılığı. Byte-offset/birleştirme gibi ileri
// dinamikler kapsam dışı (sonraki tur); ayraç + sabit uzunluk + palet/EAN lookup destekli.

export interface BarcodeFields {
  productId?: number; unitId?: number; quantity?: number
  batchNo?: string; serialNo?: string
  productionDate?: string; expiryDate?: string // YYYY-MM-DD
  palletId?: number; palletNo?: string; po?: string
}
export interface BarcodePalletLine { productCode: string; productName: string | null; batchNo: string | null; qty: string; expiryDate: string | null; location: string | null; status: string | null }
export interface BarcodeSegmentView { field: string; raw: string; value?: string }
export interface BarcodeParseResult {
  matched: boolean
  code: string
  barcodeTypeId?: number
  barcodeTypeCode?: string
  mode?: 'EAN' | 'PALLET' | 'SEGMENT'
  fields: BarcodeFields
  product?: { id: number; code: string; name: string | null } | null
  unit?: { id: number; code: string; name: string | null } | null
  pallet?: { palletNo: string; lines: BarcodePalletLine[] } | null
  segments?: BarcodeSegmentView[]
  warnings?: string[]
  error?: string
}

const iso = (y: string, m: string, d: string) => `${y}-${m}-${d}`
export function parseBarcodeDate(raw: string, fmt?: string | null): string | undefined {
  const v = (raw || '').trim()
  if (!v) return undefined
  const f = (fmt || '').toUpperCase()
  const dg = v.replace(/\D/g, '')
  if ((f === 'YYAAGG' || f === 'YYMMDD') && dg.length >= 6) return iso('20' + dg.slice(0, 2), dg.slice(2, 4), dg.slice(4, 6))
  if ((f === 'GGAAYY' || f === 'DDMMYY') && dg.length >= 6) return iso('20' + dg.slice(4, 6), dg.slice(2, 4), dg.slice(0, 2))
  if ((f === 'YYYYAAGG' || f === 'YYYYMMDD') && dg.length >= 8) return iso(dg.slice(0, 4), dg.slice(4, 6), dg.slice(6, 8))
  if (/^\d{4}-\d{2}-\d{2}/.test(v)) return v.slice(0, 10) // zaten ISO
  if (dg.length === 8) return iso(dg.slice(0, 4), dg.slice(4, 6), dg.slice(6, 8))
  if (dg.length === 6) return iso('20' + dg.slice(0, 2), dg.slice(2, 4), dg.slice(4, 6))
  return v
}

type TypeRow = { id: number; code: string; mode: string; matchPrefix: string | null; matchContains: string | null; minLen: number | null; maxLen: number | null; separator: string | null; palletKeyLen: number | null; segments: { field: string; parseType: string; length: number | null; separator: string | null; dateFormat: string | null }[] }
function ruleMatches(t: TypeRow, code: string): boolean {
  if (t.matchPrefix && code.indexOf(t.matchPrefix) !== 0) return false
  if (t.matchContains && code.indexOf(t.matchContains) < 0) return false
  if (t.minLen != null && code.length < t.minLen) return false
  if (t.maxLen != null && code.length > t.maxLen) return false
  return true
}

async function resolveProduct(companyId: number, token: string): Promise<{ id: number; code: string; name: string | null; unitId?: number } | null> {
  const tok = (token || '').trim()
  if (!tok) return null
  const pub = await prisma.tBLPRODUCTUNITBARCODE.findFirst({ where: { barcode: tok, productUnit: { product: { companyId } } }, include: { productUnit: { select: { productId: true, unitId: true } } } })
  if (pub) { const p = await prisma.tBLPRODUCT.findUnique({ where: { id: pub.productUnit.productId }, select: { id: true, code: true, name: true } }); return p ? { ...p, unitId: pub.productUnit.unitId } : null }
  return prisma.tBLPRODUCT.findFirst({ where: { companyId, code: tok }, select: { id: true, code: true, name: true } })
}
async function resolveUnitByCode(companyId: number, token: string) {
  const tok = (token || '').trim()
  if (!tok) return null
  return prisma.tBLUNIT.findFirst({ where: { companyId, code: tok }, select: { id: true, code: true, name: true } })
}
async function unitById(id: number) { return prisma.tBLUNIT.findUnique({ where: { id }, select: { id: true, code: true, name: true } }) }

export async function parseBarcode(companyId: number, rawCode: string, opts: { facilityId?: number | null } = {}): Promise<BarcodeParseResult> {
  const code = (rawCode ?? '').trim()
  const res: BarcodeParseResult = { matched: false, code, fields: {}, warnings: [] }
  if (!code) { res.error = 'Boş barkod'; return res }

  const types = (await prisma.tBLBARCODETYPE.findMany({
    where: { companyId, isActive: true, ...(opts.facilityId != null ? { OR: [{ facilityId: opts.facilityId }, { facilityId: null }] } : {}) },
    orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
    include: { segments: { orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }] } },
  })) as unknown as TypeRow[]

  const type = types.find((t) => ruleMatches(t, code))
  if (!type) { res.error = 'Barkod tipi bulunamadı — hatalı barkod'; return res }
  res.matched = true; res.barcodeTypeId = type.id; res.barcodeTypeCode = type.code; res.mode = type.mode as BarcodeParseResult['mode']

  // ── EAN: ürün-birim tam eşleşme ──
  if (type.mode === 'EAN') {
    const p = await resolveProduct(companyId, code)
    if (!p) { res.error = `Ürün bulunamadı: ${code}`; return res }
    res.fields.productId = p.id; res.product = { id: p.id, code: p.code, name: p.name }
    if (p.unitId) { res.fields.unitId = p.unitId; res.unit = await unitById(p.unitId) }
    return res
  }

  // ── PALLET: palet anahtarı → stok içeriği ──
  if (type.mode === 'PALLET') {
    const key = type.palletKeyLen ? code.slice(0, type.palletKeyLen) : code
    res.fields.palletNo = key
    const pallet = await prisma.tBLPALLET.findFirst({ where: { companyId, palletNo: key }, select: { id: true, palletNo: true } })
    if (!pallet) { res.error = `Palet bulunamadı: ${key}`; return res }
    res.fields.palletId = pallet.id
    const stock = await prisma.tBLSTOCK.findMany({
      where: { companyId, palletId: pallet.id, mainQty: { gt: 0 } },
      select: { mainQty: true, batchNo: true, expiryDate: true, product: { select: { code: true, name: true } }, location: { select: { code: true } }, status: { select: { code: true } } },
      orderBy: [{ expiryDate: 'asc' }, { id: 'asc' }],
    })
    res.pallet = { palletNo: pallet.palletNo, lines: stock.map((s) => ({ productCode: s.product?.code ?? '?', productName: s.product?.name ?? null, batchNo: s.batchNo, qty: s.mainQty.toString(), expiryDate: s.expiryDate ? s.expiryDate.toISOString().slice(0, 10) : null, location: s.location?.code ?? null, status: s.status?.code ?? null })) }
    return res
  }

  // ── SEGMENT: alanlara böl ──
  const segs = type.segments
  if (!segs.length) { res.error = 'Bu barkod tipinde segment tanımlı değil'; return res }
  let pos = 0
  const view: BarcodeSegmentView[] = []
  for (const s of segs) {
    let raw: string
    if (s.parseType === 'FIXED') { raw = code.slice(pos, pos + (s.length ?? 0)); pos += (s.length ?? 0) }
    else { const sep = s.separator || type.separator || '/'; const idx = code.indexOf(sep, pos); if (idx < 0) { raw = code.slice(pos); pos = code.length } else { raw = code.slice(pos, idx); pos = idx + sep.length } }
    let value: string | undefined = raw
    if (s.field === 'PRODUCT') {
      const p = await resolveProduct(companyId, raw)
      if (p) { res.fields.productId = p.id; res.product = { id: p.id, code: p.code, name: p.name }; if (res.fields.unitId == null && p.unitId) res.fields.unitId = p.unitId; value = p.code }
      else res.warnings!.push(`Ürün bulunamadı: ${raw.trim()}`)
    } else if (s.field === 'UNIT') {
      const u = await resolveUnitByCode(companyId, raw)
      if (u) { res.fields.unitId = u.id; res.unit = u; value = u.code } else if (raw.trim()) res.warnings!.push(`Birim bulunamadı: ${raw.trim()}`)
    } else if (s.field === 'QUANTITY') {
      const n = Number(raw.trim().replace(',', '.')); if (!Number.isNaN(n)) { res.fields.quantity = n; value = String(n) }
    } else if (s.field === 'PRODUCTION') { value = parseBarcodeDate(raw, s.dateFormat); res.fields.productionDate = value }
    else if (s.field === 'EXPIRY') { value = parseBarcodeDate(raw, s.dateFormat); res.fields.expiryDate = value }
    else if (s.field === 'BATCH') { res.fields.batchNo = raw.trim() || undefined }
    else if (s.field === 'SERIAL') { res.fields.serialNo = raw.trim() || undefined }
    else if (s.field === 'PALLET') { res.fields.palletNo = raw.trim() || undefined }
    view.push({ field: s.field, raw, value })
  }
  res.segments = view
  return res
}
