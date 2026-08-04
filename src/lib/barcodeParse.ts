import { getQuickJS, shouldInterruptAfterDeadline, type QuickJSWASMModule } from 'quickjs-emscripten'
import { prisma } from './prisma.js'

// Barkod kural motoru: barkod tipleri sıralı denenir (ilk eşleşen), moda göre çözülür.
// EAN/PALET/SEGMENT = bildirimsel (%80). SCRIPT = ileri seviye (%20): parseScript GERÇEK sandbox'ta
// (QuickJS/WASM — host erişimi yok, CPU/bellek sınırlı) çalışır; legacy TXTSCRIPT'in birebir portu.

export interface BarcodeFields {
  productId?: number; unitId?: number; quantity?: number
  productCode?: string; unitCode?: string // çözülemese de ham kod taşınır (mobil gösterim)
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

type TypeRow = { id: number; code: string; mode: string; matchPrefix: string | null; matchContains: string | null; minLen: number | null; maxLen: number | null; separator: string | null; palletKeyLen: number | null; parseScript: string | null; segments: { field: string; parseType: string; length: number | null; separator: string | null; dateFormat: string | null }[] }
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

// Paletin stok içeriği (PALLET modu + SCRIPT'te yalnız-palet dönen betik — "palet okut, hepsi gelsin")
async function palletContents(companyId: number, palletNo: string): Promise<{ palletId: number; view: NonNullable<BarcodeParseResult['pallet']> } | null> {
  const pallet = await prisma.tBLPALLET.findFirst({ where: { companyId, palletNo }, select: { id: true, palletNo: true } })
  if (!pallet) return null
  const stock = await prisma.tBLSTOCK.findMany({
    where: { companyId, palletId: pallet.id, mainQty: { gt: 0 } },
    select: { mainQty: true, batchNo: true, expiryDate: true, product: { select: { code: true, name: true } }, location: { select: { code: true } }, status: { select: { code: true } } },
    orderBy: [{ expiryDate: 'asc' }, { id: 'asc' }],
  })
  return { palletId: pallet.id, view: { palletNo: pallet.palletNo, lines: stock.map((s) => ({ productCode: s.product?.code ?? '?', productName: s.product?.name ?? null, batchNo: s.batchNo, qty: s.mainQty.toString(), expiryDate: s.expiryDate ? s.expiryDate.toISOString().slice(0, 10) : null, location: s.location?.code ?? null, status: s.status?.code ?? null })) } }
}

// ── SCRIPT modu: parseScript GERÇEK sandbox'ta (QuickJS/WASM) — host erişimi yok, 100ms CPU + 8MB bellek sınırı.
// Sözleşme: `code` (barkod) + yardımcılar mid/instr/len/rep (VBScript Mid/InStr/Len/Replace, 1-tabanlı) hazır;
// betik `b` nesnesine yazar: b.product, b.unit, b.quantity, b.batch, b.serial, b.po, b.pallet,
// b.production/b.expiry ('YYYY-MM-DD'), b.error (hata mesajı), b.matched=false (bu kural benim değil → sonraki denenir).
let qjsModule: Promise<QuickJSWASMModule> | null = null
export async function runParseScript(script: string, code: string): Promise<Record<string, unknown> | { __error: string }> {
  qjsModule ??= getQuickJS()
  const QuickJS = await qjsModule
  const rt = QuickJS.newRuntime()
  rt.setInterruptHandler(shouldInterruptAfterDeadline(Date.now() + 100))
  rt.setMemoryLimit(8 * 1024 * 1024)
  const vm = rt.newContext()
  try {
    const prelude =
      `const code=${JSON.stringify(code)};` +
      `const mid=(s,st,ln)=> ln===undefined ? String(s).slice(st-1) : String(s).slice(st-1, st-1+ln);` +
      `const instr=(st,s,sub)=>{const i=String(s).indexOf(sub,st-1);return i<0?0:i+1};` +
      `const len=(s)=>String(s).length;` +
      `const rep=(s,a,b)=>String(s).split(a).join(b);` +
      `const b={};\n`
    const result = vm.evalCode(prelude + script + '\n;JSON.stringify(b)')
    if (result.error) { const err = vm.dump(result.error) as { message?: string }; result.error.dispose(); return { __error: String(err?.message ?? err) } }
    const out = vm.dump(result.value) as string; result.value.dispose()
    return JSON.parse(out) as Record<string, unknown>
  } catch (e) {
    return { __error: (e as Error).message }
  } finally { vm.dispose(); rt.dispose() }
}

export async function parseBarcode(companyId: number, rawCode: string, opts: { facilityId?: number | null } = {}): Promise<BarcodeParseResult> {
  const code = (rawCode ?? '').trim()
  const res: BarcodeParseResult = { matched: false, code, fields: {}, warnings: [] }
  if (!code) { res.error = 'Boş barkod'; return res }

  const types = (await prisma.tBLBARCODETYPE.findMany({
    where: { companyId, isActive: true, ...(opts.facilityId != null ? { OR: [{ facilityId: opts.facilityId }, { facilityId: null }] } : {}) },
    orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
    include: { segments: { orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }] } },
  })) as unknown as TypeRow[]

  // Sıralı zincir (legacy if/elseif): ilk **beceren** kural kazanır.
  // Önceden ilk EŞLEŞEN kural zinciri bitiriyordu: kriterleri aynı bir PALLET + SEGMENT
  // çiftinde palet bulunamayınca "Palet bulunamadı" deyip duruyor, SEGMENT hiç
  // denenmiyordu. Artık bir kural kodu gerçekten çözemezse (ürün/palet yok, segment
  // veya betik tanımsız) zincir devam eder; hiçbiri beceremezse İLK hata gösterilir.
  let ilkHata: string | null = null          // zincirde kimse beceremezse gösterilecek
  const eslesenler: string[] = []            // aynı barkodu yakalayan kurallar (belirsizlik uyarısı)
  const devam = (hata: string) => {          // bu kural çözemedi → sıradakine geç
    if (ilkHata === null) ilkHata = hata
    res.matched = false; res.barcodeTypeId = undefined; res.barcodeTypeCode = undefined; res.mode = undefined
    res.fields = {}
  }

  for (const type of types) {
    if (!ruleMatches(type, code)) continue
    eslesenler.push(type.code)
    res.matched = true; res.barcodeTypeId = type.id; res.barcodeTypeCode = type.code; res.mode = type.mode as BarcodeParseResult['mode']

    // ── EAN: ürün-birim tam eşleşme ──
    if (type.mode === 'EAN') {
      const p = await resolveProduct(companyId, code)
      if (!p) { devam(`Ürün bulunamadı: ${code} (kural: ${type.code})`); continue }
      res.fields.productId = p.id; res.product = { id: p.id, code: p.code, name: p.name }
      if (p.unitId) { res.fields.unitId = p.unitId; res.unit = await unitById(p.unitId) }
      return res
    }

    // ── PALLET: palet anahtarı → stok içeriği ──
    if (type.mode === 'PALLET') {
      const key = type.palletKeyLen ? code.slice(0, type.palletKeyLen) : code
      res.fields.palletNo = key
      const pc = await palletContents(companyId, key)
      if (!pc) { devam(`Palet bulunamadı: ${key} (kural: ${type.code})`); continue }
      res.fields.palletId = pc.palletId
      res.pallet = pc.view
      return res
    }

    // ── SCRIPT: sandbox'ta betik — legacy TXTSCRIPT birebir ──
    if (type.mode === 'SCRIPT') {
      if (!type.parseScript?.trim()) { devam(`Betik tanımlı değil (kural: ${type.code})`); continue }
      const out = await runParseScript(type.parseScript, code)
      if ('__error' in out) { res.error = `Betik hatası: ${out.__error}`; return res }
      if (out.matched === false) { // betik "bu barkod benim değil" dedi → zincirde sonraki kural
        devam(`Betik eşleşmedi (kural: ${type.code})`)
        continue
      }
      if (typeof out.error === 'string' && out.error) { res.error = out.error; return res }
      const str = (v: unknown) => (v == null ? undefined : String(v).trim() || undefined)
      res.fields.batchNo = str(out.batch)
      res.fields.serialNo = str(out.serial)
      res.fields.po = str(out.po)
      res.fields.productionDate = str(out.production) ? parseBarcodeDate(String(out.production)) : undefined
      res.fields.expiryDate = str(out.expiry) ? parseBarcodeDate(String(out.expiry)) : undefined
      if (out.quantity != null && String(out.quantity).trim() !== '') {
        const n = Number(String(out.quantity).trim().replace(',', '.'))
        if (!Number.isNaN(n)) res.fields.quantity = n
      }
      const prodCode = str(out.product)
      if (prodCode) {
        res.fields.productCode = prodCode
        const p = await resolveProduct(companyId, prodCode)
        if (p) { res.fields.productId = p.id; res.product = { id: p.id, code: p.code, name: p.name }; if (p.unitId) { res.fields.unitId = p.unitId; res.unit = await unitById(p.unitId) } }
        else res.warnings!.push(`Ürün bulunamadı: ${prodCode}`)
      }
      const unitCode = str(out.unit)
      if (unitCode) {
        res.fields.unitCode = unitCode
        const u = await resolveUnitByCode(companyId, unitCode)
        if (u) { res.fields.unitId = u.id; res.unit = u } else res.warnings!.push(`Birim bulunamadı: ${unitCode}`)
      }
      const palletNo = str(out.pallet)
      if (palletNo) {
        res.fields.palletNo = palletNo
        const pc = await palletContents(companyId, palletNo)
        if (pc) { res.fields.palletId = pc.palletId; if (!prodCode) res.pallet = pc.view } // yalnız-palet betiği → içerik (hepsi gelsin)
        else if (!prodCode) { res.error = `Palet bulunamadı: ${palletNo}`; return res }
      }
      return res
    }

    // ── SEGMENT: alanlara böl ──
    const segs = type.segments
    if (!segs.length) { devam(`Segment tanımlı değil (kural: ${type.code})`); continue }
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

  // Hiçbir kural beceremedi: en açıklayıcı olan İLK hatayı ver (jenerik mesaj yerine)
  res.error = ilkHata ?? 'Barkod tipi bulunamadı — hatalı barkod'
  if (eslesenler.length > 1) {
    res.warnings!.push(`Bu barkodu ${eslesenler.length} kural yakalıyor (${eslesenler.join(', ')}) — hiçbiri çözemedi. Kural kriterlerini ayrıştırın.`)
  }
  return res
}
