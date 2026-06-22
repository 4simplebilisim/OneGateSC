import 'dotenv/config'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@prisma/client'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter })
const BASE = 'http://localhost:3000'

const R = { pass: [], fail: [], findings: [] }
const ok = (l) => { R.pass.push(l); console.log('   ✓', l) }
const bad = (l, d='') => { R.fail.push(l + (d ? ' — ' + d : '')); console.log('   ✗', l, d) }
const find = (l) => { R.findings.push(l); console.log('   ⚠ BULGU:', l) }

let TOKEN = null
async function api(method, path, { body, companyId, token = TOKEN, noAuth = false } = {}) {
  const headers = {}
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  if (!noAuth && token) headers['Authorization'] = `Bearer ${token}`
  if (companyId) headers['x-company-id'] = String(companyId)
  const res = await fetch(BASE + path, { method, headers, body: body ? JSON.stringify(body) : undefined })
  let data; const t = await res.text(); try { data = JSON.parse(t) } catch { data = t }
  return { status: res.status, data }
}
async function must(label, p) {
  const r = await p
  if (r.status >= 200 && r.status < 300) return r.data
  throw new Error(`${label} FAILED ${r.status}: ${JSON.stringify(r.data).slice(0, 240)}`)
}
const msg = (r) => (r.data && (r.data.error || r.data.message)) || JSON.stringify(r.data).slice(0, 120)

let DOCN = 0
const dn = () => `DOC-${String(++DOCN).padStart(5, '0')}`

async function runDoc(companyId, body) {
  if (!body.documentNo) body = { ...body, documentNo: dn() }
  const doc = await must('belge create', api('POST', '/api/documents', { body, companyId }))
  await must('confirm', api('POST', `/api/documents/${doc.id}/confirm`, { companyId }))
  const done = await must('complete', api('POST', `/api/documents/${doc.id}/complete`, { companyId }))
  return done
}
async function stockSum(companyId, productId, extra = {}) {
  const qs = new URLSearchParams({ productId: String(productId), includeZero: 'false', limit: '200', ...extra })
  const r = await api('GET', `/api/stock?${qs}`, { companyId })
  const rows = Array.isArray(r.data) ? r.data : (r.data.data ?? [])
  return { rows, total: rows.reduce((s, x) => s + Number(x.mainQty), 0) }
}

async function purge(companyId) {
  const steps = [
    () => prisma.tBLSTOCKLEDGER.deleteMany({ where: { companyId } }),
    () => prisma.tBLSTOCK.deleteMany({ where: { companyId } }),
    () => prisma.tBLDOCUMENTLINE.deleteMany({ where: { document: { companyId } } }),
    () => prisma.tBLDOCUMENT.deleteMany({ where: { companyId } }),
    () => prisma.tBLPRODUCTUNITBARCODE.deleteMany({ where: { productUnit: { product: { companyId } } } }),
    () => prisma.tBLPRODUCTUNIT.deleteMany({ where: { product: { companyId } } }),
    () => prisma.tBLPRODUCT.deleteMany({ where: { companyId } }),
    () => prisma.tBLOPERATIONTYPESTATUS.deleteMany({ where: { companyId } }),
    () => prisma.tBLOPERATIONTYPE.deleteMany({ where: { companyId } }),
    () => prisma.tBLPALLET.deleteMany({ where: { companyId } }),
    () => prisma.tBLPALLETTYPE.deleteMany({ where: { companyId } }),
    () => prisma.tBLLOCATION.deleteMany({ where: { companyId } }),
    () => prisma.tBLAREA.deleteMany({ where: { companyId } }),
    () => prisma.tBLWAREHOUSE.deleteMany({ where: { companyId } }),
    () => prisma.tBLFACILITY.deleteMany({ where: { companyId } }),
    () => prisma.tBLSTATUS.deleteMany({ where: { companyId } }),
    () => prisma.tBLUNIT.deleteMany({ where: { companyId } }),
    () => prisma.tBLUSERROLE.deleteMany({ where: { user: { companyId } } }),
    () => prisma.tBLUSER.deleteMany({ where: { companyId } }),
  ]
  for (const s of steps) { try { await s() } catch (e) { /* ignore */ } }
}

async function provision(companyId, P, mode) {
  // P = prefix (A / B). mode = 'LOT_PALLET' | 'SERIAL'
  const fac = await must('facility', api('POST', '/api/facilities', { companyId, body: { code: `${P}-FAC`, name: `${P} Tesis` } }))
  const wh = await must('warehouse', api('POST', '/api/warehouses', { companyId, body: { code: `${P}-WH`, name: `${P} Depo`, facilityId: fac.id } }))
  const area = await must('area', api('POST', '/api/areas', { companyId, body: { code: `${P}-AR`, name: `${P} Alan`, warehouseId: wh.id } }))
  const loc1 = await must('loc1', api('POST', '/api/locations', { companyId, body: { code: `${P}-L01`, name: `${P} Lok 1`, warehouseId: wh.id, areaId: area.id } }))
  const loc2 = await must('loc2', api('POST', '/api/locations', { companyId, body: { code: `${P}-L02`, name: `${P} Lok 2`, warehouseId: wh.id, areaId: area.id } }))
  const unit = await must('unit', api('POST', '/api/units', { companyId, body: { code: `${P}-AD`, name: 'Adet' } }))
  const stAvail = await must('statu-avail', api('POST', '/api/statuses', { companyId, body: { code: 'AVAILABLE', name: 'Kullanilabilir' } }))
  const stBlock = await must('statu-block', api('POST', '/api/statuses', { companyId, body: { code: 'BLOCKED', name: 'Bloke' } }))
  const product = await must('product', api('POST', '/api/products', { companyId, body: { code: `${P}-PRD-001`, name: `${P} Urun 001`, unitId: unit.id } }))
  const puBody = { productId: product.id, unitId: unit.id, isBaseUnit: true,
    batchTracking: mode === 'LOT_PALLET', serialTracking: mode === 'SERIAL' }
  const productUnit = await must('product-unit', api('POST', '/api/product-units', { companyId, body: puBody }))

  let palletType = null, pallet = null
  if (mode === 'LOT_PALLET') {
    palletType = await must('pallet-type', api('POST', '/api/pallet-types', { companyId, body: { code: `${P}-EUR`, name: `${P} Euro Palet`, mixingType: 'SINGLE_PRODUCT', palletNoLength: 6 } }))
    pallet = await must('pallet', api('POST', '/api/pallets', { companyId, body: { palletTypeId: palletType.id, palletNo: `${P}-PLT-0001` } }))
  }

  const mkOp = (code, name, direction, extra = {}) => api('POST', '/api/operation-types', { companyId,
    body: { code, name, direction, documentType: direction === 'COUNT' ? 'COUNT' : 'STOCK_MOVEMENT', facilityId: fac.id, affectsStock: true, ...extra } })
  const GR = await must('op-GR', mkOp(`${P}-GR`, `${P} Mal Kabul`, 'INBOUND', { sameUsePallet: true, batchAssignment: false, qualityControl: false }))
  const GI = await must('op-GI', mkOp(`${P}-GI`, `${P} Sevk`, 'OUTBOUND'))
  const TR = await must('op-TR', mkOp(`${P}-TR`, `${P} Transfer`, 'INTERNAL'))
  const CNT = await must('op-COUNT', mkOp(`${P}-CNT`, `${P} Sayim`, 'COUNT'))

  return { fac, wh, area, loc1, loc2, unit, stAvail, stBlock, product, productUnit, palletType, pallet, GR, GI, TR, CNT }
}

async function main() {
  console.log('\n=== 0) SUPER-ADMIN LOGIN ===')
  const login = await must('login', api('POST', '/api/auth/login', { noAuth: true, body: { username: 'admin', password: 'admin123' } }))
  TOKEN = login.token
  ok(`super-admin login (isSuperAdmin=${login.user.isSuperAdmin})`)

  console.log('\n=== 1) A/B FİRMA (TBLCOMPANY — API yok, Prisma ile) ===')
  const cA = await prisma.tBLCOMPANY.upsert({ where: { code: 'FIRMA-A' }, update: { name: 'A Lojistik (Lot+Palet)' }, create: { code: 'FIRMA-A', name: 'A Lojistik (Lot+Palet)' } })
  const cB = await prisma.tBLCOMPANY.upsert({ where: { code: 'FIRMA-B' }, update: { name: 'B Elektronik (Seri)' }, create: { code: 'FIRMA-B', name: 'B Elektronik (Seri)' } })
  ok(`firma A id=${cA.id} · firma B id=${cB.id}`)
  console.log('   (idempotent purge — önceki test verisi temizleniyor)')
  await purge(cA.id); await purge(cB.id)

  console.log('\n=== 2) PROVİZYON — A (lot+palet) ===')
  const A = await provision(cA.id, 'A', 'LOT_PALLET')
  ok(`A: tesis/depo/alan/2 lok/birim/2 statü/ürün(${A.product.code})/ürün-birim(batchTracking)/palet(${A.pallet.palletNo})/4 op`)
  console.log('\n=== 2) PROVİZYON — B (seri) ===')
  const B = await provision(cB.id, 'B', 'SERIAL')
  ok(`B: tesis/depo/alan/2 lok/birim/2 statü/ürün(${B.product.code})/ürün-birim(serialTracking)/4 op (palet YOK)`)

  // ---- SENARYO A: lot + palet ----
  console.log('\n=== 3) SENARYO A (lot/batch + palet) ===')
  // 3.1 INBOUND 100, batch LOT-A-001, pallet, AVAILABLE @ L01
  await runDoc(cA.id, { operationTypeId: A.GR.id, warehouseId: A.wh.id, lines: [
    { productId: A.product.id, unitId: A.unit.id, quantity: 100, batchNo: 'LOT-A-001', palletId: A.pallet.id, targetLocationId: A.loc1.id, targetStatusId: A.stAvail.id } ] })
  let s = await stockSum(cA.id, A.product.id)
  s.total === 100 ? ok(`A giriş: 100 stok yazıldı (batch+palet+AVAILABLE)`) : bad('A giriş stok', `beklenen 100, gelen ${s.total}`)
  const r0 = s.rows[0] || {}
  ;(r0.batchNo === 'LOT-A-001' && r0.palletId === A.pallet.id) ? ok('A stok kırılımı: batch=LOT-A-001 + palet bağlı') : bad('A stok kırılımı', JSON.stringify({ b: r0.batchNo, p: r0.palletId }))

  // 3.2 PROBE: batch'siz giriş → reddedilmeli
  {
    const doc = await api('POST', '/api/documents', { companyId: cA.id, body: { documentNo: dn(), operationTypeId: A.GR.id, warehouseId: A.wh.id, lines: [
      { productId: A.product.id, unitId: A.unit.id, quantity: 5, targetLocationId: A.loc1.id, targetStatusId: A.stAvail.id } ] } })
    await api('POST', `/api/documents/${doc.data.id}/confirm`, { companyId: cA.id })
    const c = await api('POST', `/api/documents/${doc.data.id}/complete`, { companyId: cA.id })
    c.status >= 400 && /parti|lot|batch/i.test(msg(c)) ? ok(`A iş kuralı: batch'siz giriş ENGELLENDİ (${msg(c)})`) : bad('A batch zorunluluğu', `status ${c.status}: ${msg(c)}`)
  }

  // 3.3 INTERNAL transfer 30: L01 → L02 (batch+palet korunur)
  await runDoc(cA.id, { operationTypeId: A.TR.id, warehouseId: A.wh.id, lines: [
    { productId: A.product.id, unitId: A.unit.id, quantity: 30, batchNo: 'LOT-A-001', palletId: A.pallet.id,
      sourceLocationId: A.loc1.id, sourceStatusId: A.stAvail.id, targetLocationId: A.loc2.id, targetStatusId: A.stAvail.id } ] })
  const l2 = await stockSum(cA.id, A.product.id, { locationId: String(A.loc2.id) })
  l2.total === 30 ? ok('A transfer: 30 adet L01→L02 taşındı') : bad('A transfer', `L02 beklenen 30, gelen ${l2.total}`)

  // 3.4 INTERNAL statü değişimi 20: AVAILABLE → BLOCKED @ L01
  await runDoc(cA.id, { operationTypeId: A.TR.id, warehouseId: A.wh.id, lines: [
    { productId: A.product.id, unitId: A.unit.id, quantity: 20, batchNo: 'LOT-A-001', palletId: A.pallet.id,
      sourceLocationId: A.loc1.id, sourceStatusId: A.stAvail.id, targetLocationId: A.loc1.id, targetStatusId: A.stBlock.id } ] })
  const blk = await stockSum(cA.id, A.product.id, { statusId: String(A.stBlock.id) })
  blk.total === 20 ? ok('A statü: 20 adet AVAILABLE→BLOCKED (bloke stok)') : bad('A bloke statü', `beklenen 20, gelen ${blk.total}`)

  // 3.5 OUTBOUND 10 from L01 AVAILABLE
  await runDoc(cA.id, { operationTypeId: A.GI.id, warehouseId: A.wh.id, lines: [
    { productId: A.product.id, unitId: A.unit.id, quantity: 10, batchNo: 'LOT-A-001', palletId: A.pallet.id,
      sourceLocationId: A.loc1.id, sourceStatusId: A.stAvail.id } ] })
  s = await stockSum(cA.id, A.product.id)
  // 100 - 10 (çıkış) = 90 toplam (transfer ve statü iç hareket, toplamı değiştirmez)
  s.total === 90 ? ok(`A çıkış: 10 sevk → toplam 90 (giriş100−çıkış10)`) : bad('A çıkış toplam', `beklenen 90, gelen ${s.total}`)

  // ---- SENARYO B: seri ----
  console.log('\n=== 4) SENARYO B (seri takip, lot/palet yok) ===')
  // 4.1 3 seri giriş AVAILABLE @ L01
  for (const sn of ['SN-B-001', 'SN-B-002', 'SN-B-003']) {
    await runDoc(cB.id, { operationTypeId: B.GR.id, warehouseId: B.wh.id, lines: [
      { productId: B.product.id, unitId: B.unit.id, quantity: 1, serialNo: sn, targetLocationId: B.loc1.id, targetStatusId: B.stAvail.id } ] })
  }
  let sb = await stockSum(cB.id, B.product.id)
  sb.total === 3 ? ok('B giriş: 3 seri (SN-B-001/002/003) stok=3') : bad('B giriş', `beklenen 3, gelen ${sb.total}`)

  // 4.2 PROBE: seri qty=2 → reddedilmeli
  {
    const doc = await api('POST', '/api/documents', { companyId: cB.id, body: { documentNo: dn(), operationTypeId: B.GR.id, warehouseId: B.wh.id, lines: [
      { productId: B.product.id, unitId: B.unit.id, quantity: 2, serialNo: 'SN-B-099', targetLocationId: B.loc1.id, targetStatusId: B.stAvail.id } ] } })
    await api('POST', `/api/documents/${doc.data.id}/confirm`, { companyId: cB.id })
    const c = await api('POST', `/api/documents/${doc.data.id}/complete`, { companyId: cB.id })
    c.status >= 400 && /1 olmal|adet/i.test(msg(c)) ? ok(`B iş kuralı: seri qty=2 ENGELLENDİ (${msg(c)})`) : bad('B seri qty=1', `status ${c.status}: ${msg(c)}`)
  }
  // 4.3 PROBE: serisiz giriş → reddedilmeli
  {
    const doc = await api('POST', '/api/documents', { companyId: cB.id, body: { documentNo: dn(), operationTypeId: B.GR.id, warehouseId: B.wh.id, lines: [
      { productId: B.product.id, unitId: B.unit.id, quantity: 1, targetLocationId: B.loc1.id, targetStatusId: B.stAvail.id } ] } })
    await api('POST', `/api/documents/${doc.data.id}/confirm`, { companyId: cB.id })
    const c = await api('POST', `/api/documents/${doc.data.id}/complete`, { companyId: cB.id })
    c.status >= 400 && /seri/i.test(msg(c)) ? ok(`B iş kuralı: serisiz giriş ENGELLENDİ (${msg(c)})`) : bad('B seri zorunluluğu', `status ${c.status}: ${msg(c)}`)
  }

  // 4.4 INTERNAL: SN-B-001 → BLOCKED @ L01
  await runDoc(cB.id, { operationTypeId: B.TR.id, warehouseId: B.wh.id, lines: [
    { productId: B.product.id, unitId: B.unit.id, quantity: 1, serialNo: 'SN-B-001',
      sourceLocationId: B.loc1.id, sourceStatusId: B.stAvail.id, targetLocationId: B.loc1.id, targetStatusId: B.stBlock.id } ] })
  const bblk = await stockSum(cB.id, B.product.id, { statusId: String(B.stBlock.id) })
  bblk.total === 1 ? ok('B statü: SN-B-001 AVAILABLE→BLOCKED') : bad('B bloke', `beklenen 1, gelen ${bblk.total}`)

  // 4.5 OUTBOUND: SN-B-002 sevk
  await runDoc(cB.id, { operationTypeId: B.GI.id, warehouseId: B.wh.id, lines: [
    { productId: B.product.id, unitId: B.unit.id, quantity: 1, serialNo: 'SN-B-002',
      sourceLocationId: B.loc1.id, sourceStatusId: B.stAvail.id } ] })
  sb = await stockSum(cB.id, B.product.id)
  sb.total === 2 ? ok('B çıkış: SN-B-002 sevk → kalan 2 seri') : bad('B çıkış', `beklenen 2, gelen ${sb.total}`)

  // ---- İZOLASYON PROBE'LARI (düzeltme SONRASI — hepsi GEÇMELİ) ----
  console.log('\n=== 5) TENANT İZOLASYON PROBE (fix doğrulama) ===')
  // 5.1 super-admin x-company-id ile A vs B ürün listesi ayrışıyor mu
  const pA = await api('GET', '/api/products', { companyId: cA.id })
  const pB = await api('GET', '/api/products', { companyId: cB.id })
  const codesA = (pA.data.data ?? pA.data).map((x) => x.code)
  const codesB = (pB.data.data ?? pB.data).map((x) => x.code)
  const aOnly = codesA.includes('A-PRD-001') && !codesA.includes('B-PRD-001')
  const bOnly = codesB.includes('B-PRD-001') && !codesB.includes('A-PRD-001')
  aOnly && bOnly ? ok('izolasyon: super-admin x-company-id ile A/B ürünleri ayrışıyor') : bad('header izolasyon', `A=${codesA} B=${codesB}`)

  // 5.2 PUBLIC GET (auth yok) → artık 401 olmalı (FIX)
  const pubNo = await api('GET', '/api/products', { noAuth: true })
  pubNo.status === 401 ? ok('FIX: auth\'suz GET /api/products → 401 (okuma artık kimlik doğrulamalı)') : bad('auth\'suz GET hâlâ açık', `status ${pubNo.status}`)
  const pubB = await api('GET', '/api/products', { noAuth: true, companyId: cB.id })
  pubB.status === 401 ? ok('FIX: auth\'suz GET + x-company-id:B → 401 (header ile tenant okunamıyor)') : bad('header sızıntısı sürüyor', `status ${pubB.status}`)

  // 5.3 Normal kullanıcı kilidi (artık GET de auth'lu → token firmasına kilitli)
  await must('userA', api('POST', '/api/users', { companyId: cA.id, body: { username: 'kullaniciA', email: 'a@a.local', password: 'parolaA1', fullName: 'Kullanici A', roles: ['OPERATOR'] } }))
  await must('userB', api('POST', '/api/users', { companyId: cB.id, body: { username: 'kullaniciB', email: 'b@b.local', password: 'parolaB1', fullName: 'Kullanici B', roles: ['OPERATOR'] } }))
  const loginA = await must('login A', api('POST', '/api/auth/login', { noAuth: true, body: { username: 'kullaniciA', password: 'parolaA1' } }))
  const tokA = loginA.token
  const uaProd = await api('GET', '/api/products', { token: tokA })
  const uaCodes = (uaProd.data.data ?? uaProd.data).map((x) => x.code)
  uaCodes.includes('A-PRD-001') && !uaCodes.includes('B-PRD-001') ? ok('FIX: normal kullanıcı A token\'ı ile SADECE A ürünlerini görüyor (firma 1 değil)') : bad('userA liste', uaCodes.join(','))
  // userA, x-company-id:B header'ı ile B'yi okumayı dener → token firmasına kilitli kalmalı
  const uaTryB = await api('GET', '/api/products', { token: tokA, companyId: cB.id })
  const uaTryBCodes = (uaTryB.data.data ?? uaTryB.data).map((x) => x.code)
  uaTryBCodes.includes('A-PRD-001') && !uaTryBCodes.includes('B-PRD-001') ? ok('FIX: normal kullanıcı A, x-company-id:B header\'ı ile B\'ye ULAŞAMADI (token firmasına kilitli)') : bad('kilit kırık', uaTryBCodes.join(','))

  // 5.4 Cross-tenant WRITE bloğu: userA, B'nin ürününü PATCH/DELETE dener → 404 olmalı
  const patchB = await api('PATCH', `/api/products/${B.product.id}`, { token: tokA, body: { name: 'HACK' } })
  patchB.status === 404 ? ok('izolasyon: userA, B ürününü PATCH edemedi (404)') : bad('cross-tenant PATCH', `status ${patchB.status}`)
  const delB = await api('DELETE', `/api/products/${B.product.id}`, { token: tokA })
  delB.status === 404 ? ok('izolasyon: userA, B ürününü DELETE edemedi (404)') : bad('cross-tenant DELETE', `status ${delB.status}`)

  // 5.5 Cross-tenant REFERANS: A belgesi B'nin ürün id'sini satırda referans → artık 400 (FIX)
  const xref = await api('POST', '/api/documents', { companyId: cA.id, body: { documentNo: dn(), operationTypeId: A.GR.id, warehouseId: A.wh.id, lines: [
    { productId: B.product.id, unitId: A.unit.id, quantity: 1, batchNo: 'X', targetLocationId: A.loc1.id, targetStatusId: A.stAvail.id } ] } })
  if (xref.status === 400 && /referans|firma/i.test(msg(xref))) {
    ok(`FIX: A belgesi B ürününü referans EDEMEDİ (400: ${msg(xref)})`)
  } else if (xref.status >= 200 && xref.status < 300) {
    await api('POST', `/api/documents/${xref.data.id}/cancel`, { companyId: cA.id })
    bad('cross-tenant referans hâlâ açık', `create ${xref.status} — satır referans companyId doğrulanmıyor`)
  } else {
    bad('cross-tenant referans beklenmeyen', `status ${xref.status}: ${msg(xref)}`)
  }

  // ---- ÜRÜN-BİRİM-BARKOD KOMBİNASYONU ----
  console.log('\n=== 6) ÜRÜN-BİRİM + BARKOD KURALLARI ===')
  // 6.1 A ürününe 2. birim ekle + ana birim TEK olmalı
  const unitKoli = await must('A koli birim', api('POST', '/api/units', { companyId: cA.id, body: { code: 'A-KOLI', name: 'Koli' } }))
  await must('A koli ürün-birim (base)', api('POST', '/api/product-units', { companyId: cA.id, body: { productId: A.product.id, unitId: unitKoli.id, isBaseUnit: true, batchTracking: true } }))
  const pus = (await api('GET', `/api/product-units?productId=${A.product.id}`, { companyId: cA.id })).data
  const puList = Array.isArray(pus) ? pus : (pus.data ?? [])
  const baseCount = puList.filter((x) => x.isBaseUnit).length
  baseCount === 1 ? ok(`ana birim TEK: ${puList.length} birim, ana=1 (yeni ana eklenince eski düştü)`) : bad('ana birim tekliği', `ana sayısı ${baseCount}`)

  // 6.2 Barkod tekilliği — A ürün-birim 1'e barkod ekle
  const puA1 = puList.find((x) => x.unitId === A.unit.id) || puList[0]
  const puA2 = puList.find((x) => x.unitId === unitKoli.id)
  const bcAdd = await api('POST', `/api/product-units/${puA1.id}/barcodes`, { companyId: cA.id, body: { barcode: 'BARK-A-001' } })
  bcAdd.status === 201 ? ok('barkod BARK-A-001 → A ürün-birim 1\'e eklendi') : bad('barkod ekle', `status ${bcAdd.status}: ${msg(bcAdd)}`)
  // aynı barkod, aynı ürünün BAŞKA birimine → reddedilmeli
  const bcSameProdOtherUnit = await api('POST', `/api/product-units/${puA2.id}/barcodes`, { companyId: cA.id, body: { barcode: 'BARK-A-001' } })
  bcSameProdOtherUnit.status === 409 ? ok('KURAL: aynı barkod, aynı ürünün BAŞKA birimine eklenemedi (409)') : bad('barkod aynı-ürün-başka-birim', `status ${bcSameProdOtherUnit.status}`)
  // aynı barkod, BAŞKA ürüne (A'da 2. ürün) → reddedilmeli
  const prodA2 = await must('A 2. ürün', api('POST', '/api/products', { companyId: cA.id, body: { code: 'A-PRD-002', name: 'A Urun 002', unitId: A.unit.id } }))
  const puA2prod = await must('A 2.ürün-birim', api('POST', '/api/product-units', { companyId: cA.id, body: { productId: prodA2.id, unitId: A.unit.id, isBaseUnit: true } }))
  const bcOtherProd = await api('POST', `/api/product-units/${puA2prod.id}/barcodes`, { companyId: cA.id, body: { barcode: 'BARK-A-001' } })
  bcOtherProd.status === 409 ? ok('KURAL: aynı barkod BAŞKA ürüne eklenemedi (409)') : bad('barkod başka-ürün', `status ${bcOtherProd.status}`)
  // aynı barkod, B firmasında → İZİN VERİLMELİ (tenant başına tekil)
  const puB1 = (await api('GET', `/api/product-units?productId=${B.product.id}`, { companyId: cB.id })).data
  const puBList = Array.isArray(puB1) ? puB1 : (puB1.data ?? [])
  const bcB = await api('POST', `/api/product-units/${puBList[0].id}/barcodes`, { companyId: cB.id, body: { barcode: 'BARK-A-001' } })
  bcB.status === 201 ? ok('KURAL: aynı barkod B firmasında KULLANILABİLDİ (tenant başına tekil, tenant\'lar arası serbest)') : bad('barkod tenant-arası', `status ${bcB.status}: ${msg(bcB)}`)
  // lookup: A'da BARK-A-001 → A ürünü; B'de → B ürünü (tenant izole barkod çözümü)
  const lkA = await api('GET', '/api/lookup/barcode?code=BARK-A-001', { companyId: cA.id })
  const lkB = await api('GET', '/api/lookup/barcode?code=BARK-A-001', { companyId: cB.id })
  const lkAcode = lkA.data?.product?.code
  const lkBcode = lkB.data?.product?.code
  if (lkAcode === 'A-PRD-001' && lkBcode === 'B-PRD-001') ok('lookup: aynı barkod A\'da A-ürünü, B\'de B-ürünü çözüyor (tenant izole)')
  else bad('barkod lookup tenant', `A=${lkAcode} B=${lkBcode}`)

  // ---- ÖZET ----
  console.log('\n========== SONUÇ ==========')
  console.log(`✓ GEÇEN: ${R.pass.length}`)
  console.log(`✗ KALAN: ${R.fail.length}`)
  R.fail.forEach((f) => console.log('   ✗', f))
  console.log(`⚠ BULGULAR: ${R.findings.length}`)
  R.findings.forEach((f) => console.log('   ⚠', f))
  console.log('\nFirma id: A=' + cA.id + ' B=' + cB.id + ' (UI: admin/admin123 + x-company-id, ya da kullaniciA/parolaA1)')
}

main().then(() => prisma.$disconnect()).catch(async (e) => { console.error('\n!!! HATA:', e.message); await prisma.$disconnect(); process.exit(1) })
