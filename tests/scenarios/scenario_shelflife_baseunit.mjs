import 'dotenv/config'
const BASE = 'http://localhost:3000'
const api = async (m, p, { body, token, companyId } = {}) => {
  const h = {}; if (body) h['Content-Type'] = 'application/json'; if (token) h.Authorization = 'Bearer ' + token; if (companyId) h['x-company-id'] = String(companyId)
  const r = await fetch(BASE + p, { method: m, headers: h, body: body ? JSON.stringify(body) : undefined })
  let d; const t = await r.text(); try { d = JSON.parse(t) } catch { d = t }
  return { status: r.status, data: d }
}
const arr = (d) => (Array.isArray(d) ? d : (d.data ?? []))
const msg = (r) => (r.data && (r.data.error || r.data.message)) || r.status
let P = 0, F = 0
const ok = (c, l, d = '') => { console.log((c ? '   ✓ ' : '   ✗ ') + l + (d ? ' — ' + d : '')); c ? P++ : F++ }
let DOCN = 7700; const dn = () => `SL-${++DOCN}`
const A = 2

const TOK = (await api('POST', '/api/auth/login', { body: { username: 'admin', password: 'admin123' } })).data.token
const co = { token: TOK, companyId: A }
const wh = arr((await api('GET', '/api/warehouses', co)).data).find((w) => w.code === 'A-WH')
const unit = arr((await api('GET', '/api/units', co)).data)[0]
const unit2 = arr((await api('GET', '/api/units', co)).data)[1] || unit
const loc = arr((await api('GET', '/api/locations', co)).data)[0]
const stAv = arr((await api('GET', '/api/statuses', co)).data).find((s) => s.code === 'AVAILABLE')
const gr = arr((await api('GET', '/api/operation-types', co)).data).find((o) => o.code === 'A-GR')

console.log('\n=== A) RAF ÖMRÜ: shelfLifeControl türetimi (kutu yok) ===')
const pc = (await api('POST', '/api/products', { ...co, body: { code: 'SL-RAF', name: 'Raf Ömrü Ürün', shelfLifeDays: 30 } })).data
ok(pc.id && pc.shelfLifeControl === true, 'gün=30 girilince shelfLifeControl=true türetildi', String(pc.shelfLifeControl))
const pn = (await api('POST', '/api/products', { ...co, body: { code: 'SL-NORAF', name: 'Raf Ömrüsüz Ürün' } })).data
ok(pn.id && pn.shelfLifeControl === false, 'gün boş → shelfLifeControl=false', String(pn.shelfLifeControl))
// patch ile gün ekle → türetim güncellenir
const pu = await api('PATCH', `/api/products/${pn.id}`, { ...co, body: { shelfLifeDays: 10 } })
ok(pu.data.shelfLifeControl === true, 'PATCH gün=10 → shelfLifeControl=true', String(pu.data.shelfLifeControl))

console.log('\n=== B) RAF ÖMRÜ: girişte SKT (expiryDate) uygulanıyor mu? ===')
const mk = () => api('POST', '/api/documents', { ...co, body: { documentNo: dn(), operationTypeId: gr.id, warehouseId: wh.id, lines: [{ productId: pc.id, unitId: unit.id, quantity: 5, batchNo: 'SLB1', targetLocationId: loc.id, targetStatusId: stAv.id }] } })
const doc = (await mk()).data
ok(!!doc.id, 'mal kabul belgesi oluştu (DRAFT)', doc.id ? '' : JSON.stringify(doc).slice(0, 120))
const cf = await api('POST', `/api/documents/${doc.id}/confirm`, co)
ok(cf.status === 200 || cf.status === 201, 'confirm', msg(cf))
const cp = await api('POST', `/api/documents/${doc.id}/complete`, co)
ok(cp.status === 200 || cp.status === 201, 'complete (movement çalıştı)', msg(cp))
// stok expiryDate kontrolü (DB)
const { PrismaPg } = await import('@prisma/adapter-pg'); const { PrismaClient } = await import('@prisma/client')
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) })
const st = await prisma.tBLSTOCK.findFirst({ where: { companyId: A, productId: pc.id, batchNo: 'SLB1' }, select: { expiryDate: true, mainQty: true } })
const expDays = st?.expiryDate ? Math.round((st.expiryDate.getTime() - Date.now()) / 86400000) : null
ok(st?.expiryDate != null && expDays >= 29 && expDays <= 31, `stok SKT = bugün+~30 gün (hesaplanan ${expDays} gün)`, String(st?.expiryDate))
// raf ömrüsüz ürün → SKT yok
const docN = (await api('POST', '/api/documents', { ...co, body: { documentNo: dn(), operationTypeId: gr.id, warehouseId: wh.id, lines: [{ productId: pn.id, unitId: unit.id, quantity: 3, batchNo: 'NB1', targetLocationId: loc.id, targetStatusId: stAv.id }] } })).data
await api('POST', `/api/documents/${docN.id}/confirm`, co); await api('POST', `/api/documents/${docN.id}/complete`, co)
// pn artık shelfLifeDays=10 (patch ettik) → SKT olmalı; ayrı bir gerçekten-boş ürünle test edelim
const pe = (await api('POST', '/api/products', { ...co, body: { code: 'SL-EMPTY', name: 'SKT yok' } })).data
const docE = (await api('POST', '/api/documents', { ...co, body: { documentNo: dn(), operationTypeId: gr.id, warehouseId: wh.id, lines: [{ productId: pe.id, unitId: unit.id, quantity: 2, batchNo: 'EB1', targetLocationId: loc.id, targetStatusId: stAv.id }] } })).data
await api('POST', `/api/documents/${docE.id}/confirm`, co); await api('POST', `/api/documents/${docE.id}/complete`, co)
const stE = await prisma.tBLSTOCK.findFirst({ where: { companyId: A, productId: pe.id, batchNo: 'EB1' }, select: { expiryDate: true } })
ok(stE && stE.expiryDate == null, 'raf ömrüsüz ürün → stokta SKT yok (null)', String(stE?.expiryDate))

console.log('\n=== C) ÖLÇÜ BİRİMİ: kesin tek ana birim ===')
const q = (await api('POST', '/api/products', { ...co, body: { code: 'SL-UNIT', name: 'Birim Testi' } })).data
const u1 = await api('POST', '/api/product-units', { ...co, body: { productId: q.id, unitId: unit.id } })
ok(u1.data.isBaseUnit === true, 'ilk birim isBaseUnit göndermeden → otomatik ANA birim', String(u1.data.isBaseUnit))
const u2 = await api('POST', '/api/product-units', { ...co, body: { productId: q.id, unitId: unit2.id, multiplier: 12 } })
const u2NotBase = u2.data.isBaseUnit === false || (unit2.id === unit.id && u2.status === 409)
ok(u2NotBase, 'ikinci birim → ana DEĞİL', unit2.id === unit.id ? '(tek birim var, 409 beklenir)' : String(u2.data.isBaseUnit))

if (unit2.id !== unit.id && u2.data.id) {
  const demote = await api('PATCH', `/api/product-units/${u1.data.id}`, { ...co, body: { isBaseUnit: false } })
  ok(demote.status === 400, 'tek ana birimi doğrudan kaldırma → 400', msg(demote))
  const promote = await api('PATCH', `/api/product-units/${u2.data.id}`, { ...co, body: { isBaseUnit: true } })
  ok(promote.status === 200 && promote.data.isBaseUnit === true, 'ikinciyi ana yap → eskisi otomatik düşer', msg(promote))
  const u1after = await api('GET', `/api/product-units/${u1.data.id}`, co)
  ok(u1after.data.isBaseUnit === false, 'eski ana birim artık ana değil (kesin tek ana)', String(u1after.data.isBaseUnit))
  const delBase = await api('DELETE', `/api/product-units/${u2.data.id}`, co)
  ok(delBase.status === 400, 'başka birim varken ana birimi silme → 400', msg(delBase))
  const delOther = await api('DELETE', `/api/product-units/${u1.data.id}`, co)
  ok(delOther.status === 204, 'ana-olmayan birim silinebilir', String(delOther.status))
  const delLast = await api('DELETE', `/api/product-units/${u2.data.id}`, co)
  ok(delLast.status === 204, 'son (ana) birim silinebilir → üründe birim kalmaz', String(delLast.status))
}

console.log('\n=== TEMİZLİK ===')
const docs = await prisma.tBLDOCUMENT.findMany({ where: { documentNo: { startsWith: 'SL-' } }, select: { id: true } })
const ids = docs.map((d) => d.id)
await prisma.tBLSTOCKLEDGER.deleteMany({ where: { documentId: { in: ids } } })
await prisma.tBLDOCUMENTLINE.deleteMany({ where: { documentId: { in: ids } } })
await prisma.tBLSTOCK.deleteMany({ where: { companyId: A, productId: { in: [pc.id, pn.id, pe.id].filter(Boolean) } } })
await prisma.tBLDOCUMENT.deleteMany({ where: { id: { in: ids } } })
await prisma.tBLPRODUCTUNIT.deleteMany({ where: { productId: q.id } })
await prisma.tBLPRODUCT.deleteMany({ where: { id: { in: [pc.id, pn.id, pe.id, q.id].filter(Boolean) } } })
await prisma.$disconnect()
console.log('   ✓ temizlendi')
console.log(`\n========== SONUÇ: ${P} geçti / ${F} kaldı ==========`)
process.exit(F ? 1 : 0)
