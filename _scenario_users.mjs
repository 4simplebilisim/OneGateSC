import 'dotenv/config'
const BASE = 'http://localhost:3000'
const R = { pass: [], fail: [] }
const ok = (l) => { R.pass.push(l); console.log('   ✓', l) }
const bad = (l, d = '') => { R.fail.push(l + (d ? ' — ' + d : '')); console.log('   ✗', l, d) }

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
const arr = (d) => (Array.isArray(d) ? d : (d.data ?? []))
const msg = (r) => (r.data && (r.data.error || r.data.message)) || JSON.stringify(r.data).slice(0, 120)
let DOCN = 5000
const dn = () => `U-${++DOCN}`

async function main() {
  const login = await api('POST', '/api/auth/login', { noAuth: true, body: { username: 'admin', password: 'admin123' } })
  TOKEN = login.data.token
  ok('super-admin login')

  const A = 2, B = 3
  // A firması master verisi
  const whA = arr((await api('GET', '/api/warehouses', { companyId: A })).data)[0]
  const ops = arr((await api('GET', '/api/operation-types', { companyId: A })).data)
  const GR = ops.find((o) => o.code === 'A-GR'), GI = ops.find((o) => o.code === 'A-GI')
  const prod = arr((await api('GET', '/api/products', { companyId: A })).data).find((p) => p.code === 'A-PRD-001')
  const unit = arr((await api('GET', '/api/units', { companyId: A })).data)[0]
  const loc = arr((await api('GET', '/api/locations', { companyId: A })).data)[0]
  const stAv = arr((await api('GET', '/api/statuses', { companyId: A })).data).find((s) => s.code === 'AVAILABLE')
  const whB = arr((await api('GET', '/api/warehouses', { companyId: B })).data)[0]
  if (!whA || !GR || !GI || !prod || !unit || !loc || !stAv || !whB) { bad('master veri eksik', JSON.stringify({ whA: !!whA, GR: !!GR, GI: !!GI, prod: !!prod, unit: !!unit, loc: !!loc, stAv: !!stAv, whB: !!whB })); return finish() }
  ok(`A master: depo=${whA.code} op[GR=${GR.id},GI=${GI.id}] ürün=${prod.code} · B depo=${whB.code}`)

  // Prisma (idempotent temizlik için) — önceki test kullanıcısı belge/yetki dahil temizlenir
  const { PrismaPg } = await import('@prisma/adapter-pg')
  const { PrismaClient } = await import('@prisma/client')
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) })
  const purgeUser = async (username) => {
    const u = await prisma.tBLUSER.findFirst({ where: { username } })
    if (!u) return
    await prisma.tBLDOCUMENTLINE.deleteMany({ where: { document: { createdById: u.id } } })
    await prisma.tBLDOCUMENT.deleteMany({ where: { createdById: u.id } })
    await prisma.tBLUSERAUTHORIZATION.deleteMany({ where: { userId: u.id } })
    await prisma.tBLUSER.delete({ where: { id: u.id } })
  }
  await purgeUser('yetkili1')

  // Test kullanıcısı (A firması, OPERATOR)
  const cu = await api('POST', '/api/users', { companyId: A, body: { username: 'yetkili1', email: 'yetkili1@a.local', password: 'parola123', fullName: 'Yetki Test', companyId: A, roles: ['OPERATOR'] } })
  cu.status === 201 ? ok(`kullanıcı oluştu (id=${cu.data.id}, firma=${cu.data.companyId})`) : bad('kullanıcı create', `${cu.status} ${msg(cu)}`)
  const uid = cu.data.id
  const lu = await api('POST', '/api/auth/login', { noAuth: true, body: { username: 'yetkili1', password: 'parola123' } })
  const tokU = lu.data.token
  tokU ? ok('test kullanıcı login') : bad('test login', msg(lu))

  const mkDoc = (token, opId, whId) => api('POST', '/api/documents', { token, body: {
    documentNo: dn(), operationTypeId: opId, warehouseId: whId,
    lines: [{ productId: prod.id, unitId: unit.id, quantity: 1, batchNo: 'B1', targetLocationId: loc.id, targetStatusId: stAv.id }] } })

  // FAZ 1 — yetki YOK → kısıtsız
  const d1 = await mkDoc(tokU, GR.id, whA.id)
  d1.status === 201 ? ok('FAZ1 (yetki yok): GR belgesi serbest oluştu (201)') : bad('FAZ1 GR', `${d1.status} ${msg(d1)}`)
  const d1b = await mkDoc(tokU, GI.id, whA.id)
  d1b.status !== 403 ? ok(`FAZ1: GI de serbest (403 değil, ${d1b.status})`) : bad('FAZ1 GI 403 olmamalı', msg(d1b))

  // Yetki ata: yalnız GR operasyonu
  const ga = await api('POST', '/api/user-authorizations', { companyId: A, body: { userId: uid, scopeType: 'OPERATION_TYPE', referenceId: GR.id } })
  ga.status === 201 ? ok('yetki atandı: OPERATION_TYPE = A-GR') : bad('yetki ata', `${ga.status} ${msg(ga)}`)

  // FAZ 2 — kısıtlı
  const d2 = await mkDoc(tokU, GR.id, whA.id)
  d2.status === 201 ? ok('FAZ2: yetkili GR → 201') : bad('FAZ2 GR', `${d2.status} ${msg(d2)}`)
  const d3 = await mkDoc(tokU, GI.id, whA.id)
  d3.status === 403 ? ok(`FAZ2: yetkisiz GI → 403 ENGELLENDİ (${msg(d3)})`) : bad('FAZ2 GI 403 olmalı', `${d3.status} ${msg(d3)}`)

  // super-admin bypass
  const dsa = await api('POST', '/api/documents', { companyId: A, body: { documentNo: dn(), operationTypeId: GI.id, warehouseId: whA.id,
    lines: [{ productId: prod.id, unitId: unit.id, quantity: 1, batchNo: 'B1', targetLocationId: loc.id, targetStatusId: stAv.id }] } })
  dsa.status !== 403 ? ok(`super-admin bypass: GI 403 değil (${dsa.status})`) : bad('super-admin bypass', msg(dsa))

  // Cross-tenant ref: A kullanıcısına B'nin deposunu atamak → 400
  const xref = await api('POST', '/api/user-authorizations', { companyId: A, body: { userId: uid, scopeType: 'WAREHOUSE', referenceId: whB.id } })
  xref.status === 400 ? ok(`cross-tenant yetki ref ENGELLENDİ (B deposu A kullanıcısına: ${msg(xref)})`) : bad('cross-tenant ref 400 olmalı', `${xref.status} ${msg(xref)}`)

  // Admin-only: OPERATOR kullanıcı /api/users + /api/user-authorizations'a erişemez
  const ru = await api('GET', '/api/users', { token: tokU })
  ru.status === 403 ? ok('admin-only: OPERATOR /api/users → 403') : bad('users admin-only', ru.status)
  const ra = await api('GET', '/api/user-authorizations', { token: tokU, companyId: A })
  ra.status === 403 ? ok('admin-only: OPERATOR /api/user-authorizations → 403') : bad('user-auth admin-only', ra.status)

  // PATCH user (ad değiştir)
  const pu = await api('PATCH', `/api/users/${uid}`, { companyId: A, body: { fullName: 'Yetki Test 2' } })
  pu.status === 200 && pu.data.fullName === 'Yetki Test 2' ? ok('users PATCH: ad güncellendi') : bad('users PATCH', `${pu.status} ${msg(pu)}`)

  // companies endpoint (super-admin tümünü görür)
  const co = await api('GET', '/api/companies')
  const codes = arr(co.data).map((c) => c.code)
  codes.includes('FIRMA-A') && codes.includes('FIRMA-B') ? ok(`/api/companies: super-admin ${arr(co.data).length} firma görüyor`) : bad('companies', codes.join(','))

  // Yetki listesi doğru mu (GR var)
  const al = await api('GET', '/api/user-authorizations', { companyId: A, body: undefined })
  const myAuths = arr(al.data).filter((a) => a.userId === uid)
  myAuths.length === 1 && myAuths[0].scopeType === 'OPERATION_TYPE' ? ok('yetki listesi: 1 OPERATION_TYPE kaydı') : bad('yetki listesi', JSON.stringify(myAuths))

  // DELETE: belge geçmişi olan kullanıcı → temiz 409 (500 değil)
  const du = await api('DELETE', `/api/users/${uid}`, { companyId: A })
  du.status === 409 ? ok(`users DELETE: belge geçmişli kullanıcı → temiz 409 (${msg(du)})`) : bad('users DELETE 409 olmalı', `${du.status} ${msg(du)}`)

  // Prisma ile tam temizlik (test belgeleri + yetkiler + kullanıcı)
  await purgeUser('yetkili1')
  await prisma.$disconnect()
  ok('cleanup: test belgeleri + yetkiler + kullanıcı Prisma ile temizlendi')

  finish()
}
function finish() {
  console.log(`\n========== SONUÇ ==========\n✓ GEÇEN: ${R.pass.length}\n✗ KALAN: ${R.fail.length}`)
  R.fail.forEach((f) => console.log('   ✗', f))
}
main().catch((e) => { console.error('HATA:', e.message); process.exit(1) })
