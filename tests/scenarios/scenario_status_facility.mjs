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
let DOCN = 8900; const dn = () => `STF-${++DOCN}`
const A = 2, B = 3

const TOK = (await api('POST', '/api/auth/login', { body: { username: 'admin', password: 'admin123' } })).data.token
const co = { token: TOK, companyId: A }
const wh = arr((await api('GET', '/api/warehouses', co)).data).find((w) => w.code === 'A-WH')
const unit = arr((await api('GET', '/api/units', co)).data)[0]
const loc = arr((await api('GET', '/api/locations', co)).data)[0]
const prod = arr((await api('GET', '/api/products', co)).data).find((p) => p.code === 'A-PRD-001')
const gr = arr((await api('GET', '/api/operation-types', co)).data).find((o) => o.code === 'A-GR')
const aFac = wh.facilityId
const bFac = arr((await api('GET', '/api/facilities', { token: TOK, companyId: B })).data)[0]?.id
const aFac2 = (await api('POST', '/api/facilities', { ...co, body: { code: 'STF-FAC2', name: 'Statü Test Tesis 2' } })).data.id

console.log('\n=== A) BACKFILL: mevcut statüler TEK tesise (facilityId) bağlı mı? + tenant ayrı mı? ===')
const list = arr((await api('GET', '/api/statuses', co)).data)
ok(list.length > 0 && list.every((s) => Number.isInteger(s.facilityId) && s.facilityId > 0), `tüm statüler facilityId taşıyor (n=${list.length})`)
ok(list.every((s) => s.companyId === A && s.facilityId === aFac), 'her statü companyId(tenant)=A + facilityId(tesis)=A-FAC ayrı alanlar')

console.log('\n=== B) OLUŞTURMA: tek tesis zorunlu + tenant doğrulama ===')
const noFac = await api('POST', '/api/statuses', { ...co, body: { code: 'STF-NOFAC', name: 'Tesissiz' } })
ok(noFac.status === 400, 'facilityId YOK → 400 (zorunlu)', msg(noFac))
const crossTenant = await api('POST', '/api/statuses', { ...co, body: { code: 'STF-XT', name: 'Cross-tenant', facilityId: bFac } })
ok(crossTenant.status === 400, `başka tenant tesisi (B id=${bFac}) → 400`, msg(crossTenant))
const created = await api('POST', '/api/statuses', { ...co, body: { code: 'STF-OK', name: 'Geçerli Statü', facilityId: aFac } })
ok(created.status === 201 && created.data.facilityId === aFac, 'A-FAC ile → 201, facilityId döndü', String(created.data.facilityId))
const sid = created.data.id

console.log('\n=== C) GET/:id + PATCH ===')
const getOne = await api('GET', `/api/statuses/${sid}`, co)
ok(getOne.data.facilityId === aFac && getOne.data.companyId === A, 'GET/:id facilityId + companyId dönüyor')
const patched = await api('PATCH', `/api/statuses/${sid}`, { ...co, body: { facilityId: aFac2 } })
ok(patched.status === 200 && patched.data.facilityId === aFac2, 'PATCH facilityId=A-FAC2 → tek tesis güncellendi', String(patched.data.facilityId))
const patchXT = await api('PATCH', `/api/statuses/${sid}`, { ...co, body: { facilityId: bFac } })
ok(patchXT.status === 400, 'PATCH başka tenant tesisi → 400', msg(patchXT))

console.log('\n=== D) ENFORCEMENT: statü-tesis kısıtı belgede ===')
const mk = (statusId) => api('POST', '/api/documents', { ...co, body: { documentNo: dn(), operationTypeId: gr.id, warehouseId: wh.id, lines: [{ productId: prod.id, unitId: unit.id, quantity: 1, batchNo: 'STFB1', targetLocationId: loc.id, targetStatusId: statusId }] } })
// sid şu an A-FAC2'ye bağlı; A-WH (tesis A-FAC) deposunda → 400
const blocked = await mk(sid)
ok(blocked.status === 400 && /statü.*tesis|tesis/i.test(msg(blocked)), `A-FAC2 statüsü, A-FAC deposunda → ENGELLENDİ (${msg(blocked)})`)
await api('PATCH', `/api/statuses/${sid}`, { ...co, body: { facilityId: aFac } })
const allowed = await mk(sid)
ok(allowed.status === 201, 'statü A-FAC tesisine alınınca → belge serbest (201)', msg(allowed))

console.log('\n=== TEMİZLİK ===')
const { PrismaPg } = await import('@prisma/adapter-pg'); const { PrismaClient } = await import('@prisma/client')
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) })
const docs = await prisma.tBLDOCUMENT.findMany({ where: { documentNo: { startsWith: 'STF-' } }, select: { id: true } })
const ids = docs.map((d) => d.id)
await prisma.tBLSTOCKLEDGER.deleteMany({ where: { documentId: { in: ids } } })
await prisma.tBLDOCUMENTLINE.deleteMany({ where: { documentId: { in: ids } } })
await prisma.tBLSTOCK.deleteMany({ where: { companyId: A, batchNo: 'STFB1' } })
await prisma.tBLDOCUMENT.deleteMany({ where: { id: { in: ids } } })
await prisma.tBLSTATUS.deleteMany({ where: { id: sid } })
await prisma.tBLFACILITY.delete({ where: { id: aFac2 } })
await prisma.$disconnect()
console.log('   ✓ temizlendi')
console.log(`\n========== SONUÇ: ${P} geçti / ${F} kaldı ==========`)
process.exit(F ? 1 : 0)
