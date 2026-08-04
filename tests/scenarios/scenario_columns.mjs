import 'dotenv/config'
const BASE = 'http://localhost:3000'
const api = async (m, p, { body, token, companyId, noAuth } = {}) => {
  const h = {}; if (body) h['Content-Type'] = 'application/json'; if (!noAuth && token) h.Authorization = 'Bearer ' + token; if (companyId) h['x-company-id'] = String(companyId)
  const r = await fetch(BASE + p, { method: m, headers: h, body: body ? JSON.stringify(body) : undefined })
  let d; const t = await r.text(); try { d = JSON.parse(t) } catch { d = t }
  return { status: r.status, data: d }
}
const arr = (d) => (Array.isArray(d) ? d : (d.data ?? []))
const ok = (c, l, d = '') => console.log((c ? '   ✓ ' : '   ✗ ') + l + (d ? ' — ' + d : ''))

const { PrismaPg } = await import('@prisma/adapter-pg'); const { PrismaClient } = await import('@prisma/client')
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) })
const purgeUser = async (u) => { const x = await prisma.tBLUSER.findFirst({ where: { username: u } }); if (x) { await prisma.tBLUSERCOLUMNAUTH.deleteMany({ where: { userId: x.id } }); await prisma.tBLUSERGROUPMEMBER.deleteMany({ where: { userId: x.id } }); await prisma.tBLUSER.delete({ where: { id: x.id } }) } }
const purgeGroup = async (c) => { const g = await prisma.tBLUSERGROUP.findFirst({ where: { code: c } }); if (g) { await prisma.tBLUSERCOLUMNAUTH.deleteMany({ where: { groupId: g.id } }); await prisma.tBLUSERGROUPMEMBER.deleteMany({ where: { groupId: g.id } }); await prisma.tBLUSERGROUP.delete({ where: { id: g.id } }) } }

const A = 2
const su = await api('POST', '/api/auth/login', { noAuth: true, body: { username: 'admin', password: 'admin123' } })
const TOK = su.data.token
await purgeUser('coltest'); await purgeGroup('COLGRP')

const cu = await api('POST', '/api/users', { token: TOK, companyId: A, body: { username: 'coltest', email: 'c@a.local', password: 'parola123', fullName: 'Kolon User', companyId: A, roles: ['OPERATOR'] } })
ok(cu.status === 201, 'kullanıcı oluştu id=' + cu.data.id); const uid = cu.data.id

// kullanıcı kolon yetkisi: warehouses.name=READONLY, warehouses.facilityId=HIDDEN
const c1 = await api('POST', '/api/column-authorizations', { token: TOK, companyId: A, body: { userId: uid, resource: 'warehouses', column: 'name', mode: 'READONLY' } })
const c2 = await api('POST', '/api/column-authorizations', { token: TOK, companyId: A, body: { userId: uid, resource: 'warehouses', column: 'facilityId', mode: 'HIDDEN' } })
ok(c1.status === 201 && c2.status === 201, 'kolon yetki: name=READONLY + facilityId=HIDDEN', c1.status + '/' + c2.status)

// upsert: name'i HIDDEN'a çek → 200 (yeni kayıt değil)
const up = await api('POST', '/api/column-authorizations', { token: TOK, companyId: A, body: { userId: uid, resource: 'warehouses', column: 'name', mode: 'HIDDEN' } })
ok(up.status === 200 && up.data.mode === 'HIDDEN', 'upsert: name READONLY→HIDDEN (200)', up.status)
// geri READONLY yapalım (test için)
await api('POST', '/api/column-authorizations', { token: TOK, companyId: A, body: { userId: uid, resource: 'warehouses', column: 'name', mode: 'READONLY' } })

// login → columnAuth
const lg = await api('POST', '/api/auth/login', { noAuth: true, body: { username: 'coltest', password: 'parola123' } })
const ca = lg.data.user.columnAuth || {}
ok(ca.warehouses?.name === 'READONLY' && ca.warehouses?.facilityId === 'HIDDEN', 'login.columnAuth.warehouses doğru', JSON.stringify(ca.warehouses))

// DELETE name → görünür
const rows = arr((await api('GET', '/api/column-authorizations', { token: TOK, companyId: A, })).data).filter((r) => r.userId === uid && r.column === 'name')
const del = await api('DELETE', '/api/column-authorizations/' + rows[0].id, { token: TOK, companyId: A })
ok(del.status === 204, 'kolon yetki silindi (görünür)', del.status)
const lg2 = await api('POST', '/api/auth/login', { noAuth: true, body: { username: 'coltest', password: 'parola123' } })
ok(!(lg2.data.user.columnAuth?.warehouses?.name), 'silince login.columnAuth\'ta name yok (görünür)', JSON.stringify(lg2.data.user.columnAuth?.warehouses))

// GRUP MİRAS: gruba kolon yetkisi → kullanıcı miras
const g = await api('POST', '/api/user-groups', { token: TOK, companyId: A, body: { code: 'COLGRP', name: 'Kolon Grup' } }); const gid = g.data.id
await api('POST', '/api/column-authorizations', { token: TOK, companyId: A, body: { groupId: gid, resource: 'products', column: 'shortName', mode: 'HIDDEN' } })
await api('PATCH', '/api/users/' + uid, { token: TOK, companyId: A, body: { groups: [gid] } })
const lg3 = await api('POST', '/api/auth/login', { noAuth: true, body: { username: 'coltest', password: 'parola123' } })
ok(lg3.data.user.columnAuth?.products?.shortName === 'HIDDEN', 'MIRAS: gruptan products.shortName=HIDDEN miras', JSON.stringify(lg3.data.user.columnAuth?.products))

await purgeUser('coltest'); await purgeGroup('COLGRP'); await prisma.$disconnect()
console.log('   ✓ temizlendi')
