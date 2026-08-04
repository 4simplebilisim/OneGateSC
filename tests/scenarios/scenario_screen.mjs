import 'dotenv/config'
const BASE = 'http://localhost:3000'
const api = async (m, p, { body, token, companyId, noAuth } = {}) => {
  const h = {}
  if (body) h['Content-Type'] = 'application/json'
  if (!noAuth && token) h.Authorization = 'Bearer ' + token
  if (companyId) h['x-company-id'] = String(companyId)
  const r = await fetch(BASE + p, { method: m, headers: h, body: body ? JSON.stringify(body) : undefined })
  let d; const t = await r.text(); try { d = JSON.parse(t) } catch { d = t }
  return { status: r.status, data: d }
}
const ok = (c, l, d = '') => console.log((c ? '   ✓ ' : '   ✗ ') + l + (d ? ' — ' + d : ''))

const { PrismaPg } = await import('@prisma/adapter-pg')
const { PrismaClient } = await import('@prisma/client')
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) })
const purge = async (u) => {
  const x = await prisma.tBLUSER.findFirst({ where: { username: u } })
  if (!x) return
  await prisma.tBLDOCUMENTLINE.deleteMany({ where: { document: { createdById: x.id } } })
  await prisma.tBLDOCUMENT.deleteMany({ where: { createdById: x.id } })
  await prisma.tBLUSERAUTHORIZATION.deleteMany({ where: { userId: x.id } })
  await prisma.tBLUSER.delete({ where: { id: x.id } })
}

const login = await api('POST', '/api/auth/login', { noAuth: true, body: { username: 'admin', password: 'admin123' } })
const TOK = login.data.token
await purge('screentest')

const cu = await api('POST', '/api/users', { token: TOK, companyId: 2, body: { username: 'screentest', email: 's@a.local', password: 'parola123', fullName: 'Ekran Test', companyId: 2, roles: ['OPERATOR'] } })
ok(cu.status === 201, 'kullanıcı oluştu id=' + cu.data.id)
const uid = cu.data.id

const a1 = await api('POST', '/api/user-authorizations', { token: TOK, companyId: 2, body: { userId: uid, scopeType: 'SCREEN', referenceCode: 'products' } })
const a2 = await api('POST', '/api/user-authorizations', { token: TOK, companyId: 2, body: { userId: uid, scopeType: 'SCREEN', referenceCode: 'facilities' } })
ok(a1.status === 201 && a2.status === 201, '2 ekran yetkisi atandı (products, facilities)', a1.status + '/' + a2.status)

const aBad = await api('POST', '/api/user-authorizations', { token: TOK, companyId: 2, body: { userId: uid, scopeType: 'SCREEN' } })
ok(aBad.status === 400, "referenceCode'suz SCREEN → 400", aBad.data.error || '')

const ls = await api('POST', '/api/auth/login', { noAuth: true, body: { username: 'screentest', password: 'parola123' } })
const scr = ls.data.user.screens || []
ok(scr.includes('products') && scr.includes('facilities') && scr.length === 2, 'login.user.screens = ' + JSON.stringify(scr))

const me = await api('GET', '/api/auth/me', { token: ls.data.token })
ok((me.data.user.screens || []).length === 2, '/me screens = ' + JSON.stringify(me.data.user.screens))

const gl = await api('GET', '/api/user-authorizations', { token: TOK, companyId: 2 })
const mine = (Array.isArray(gl.data) ? gl.data : gl.data.data || []).filter((x) => x.userId === uid && x.scopeType === 'SCREEN')
ok(mine.length === 2 && mine.every((x) => x.referenceCode && x.referenceId === null), 'SCREEN kayıtları: referenceCode dolu + referenceId null')

await purge('screentest')
await prisma.$disconnect()
console.log('   ✓ temizlendi')
