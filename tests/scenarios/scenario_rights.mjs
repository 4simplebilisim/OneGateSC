import 'dotenv/config'
const BASE = 'http://localhost:3000'
const api = async (m, p, { body, token, companyId, noAuth } = {}) => {
  const h = {}; if (body) h['Content-Type'] = 'application/json'; if (!noAuth && token) h.Authorization = 'Bearer ' + token; if (companyId) h['x-company-id'] = String(companyId)
  const r = await fetch(BASE + p, { method: m, headers: h, body: body ? JSON.stringify(body) : undefined })
  let d; const t = await r.text(); try { d = JSON.parse(t) } catch { d = t }
  return { status: r.status, data: d }
}
const ok = (c, l, d = '') => console.log((c ? '   ✓ ' : '   ✗ ') + l + (d ? ' — ' + d : ''))

const { PrismaPg } = await import('@prisma/adapter-pg'); const { PrismaClient } = await import('@prisma/client')
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) })
const purgeUser = async (u) => { const x = await prisma.tBLUSER.findFirst({ where: { username: u } }); if (x) { await prisma.tBLUSERSCREENRIGHT.deleteMany({ where: { userId: x.id } }); await prisma.tBLUSERGROUPMEMBER.deleteMany({ where: { userId: x.id } }); await prisma.tBLUSER.delete({ where: { id: x.id } }) } }
const purgeGroup = async (c) => { const g = await prisma.tBLUSERGROUP.findFirst({ where: { code: c } }); if (g) { await prisma.tBLUSERSCREENRIGHT.deleteMany({ where: { groupId: g.id } }); await prisma.tBLUSERGROUPMEMBER.deleteMany({ where: { groupId: g.id } }); await prisma.tBLUSERGROUP.delete({ where: { id: g.id } }) } }

const A = 2
const su = await api('POST', '/api/auth/login', { noAuth: true, body: { username: 'admin', password: 'admin123' } })
const TOK = su.data.token
await purgeUser('rgtest'); await purgeGroup('RGGRP')

const cu = await api('POST', '/api/users', { token: TOK, companyId: A, body: { username: 'rgtest', email: 'rg@a.local', password: 'parola123', fullName: 'Hak Test', companyId: A, roles: ['OPERATOR'] } })
ok(cu.status === 201, 'kullanıcı oluştu id=' + cu.data.id); const uid = cu.data.id

// products: izle var ama yeni/düzenle/sil yok
const c1 = await api('POST', '/api/screen-rights', { token: TOK, companyId: A, body: { userId: uid, resource: 'products', canView: true, canAdd: false, canEdit: false, canDelete: false } })
ok(c1.status === 201, 'hak: products İzle=açık, Yeni/Düzenle/Sil=kapalı', c1.status)
// warehouses: izle=kapalı (menüde gizlenir)
const c2 = await api('POST', '/api/screen-rights', { token: TOK, companyId: A, body: { userId: uid, resource: 'warehouses', canView: false, canAdd: false, canEdit: false, canDelete: false } })
ok(c2.status === 201, 'hak: warehouses tümü kapalı (görünmez)', c2.status)

// hepsi true → silinir (204), kısıtlama kalkar
const c3 = await api('POST', '/api/screen-rights', { token: TOK, companyId: A, body: { userId: uid, resource: 'products', canView: true, canAdd: true, canEdit: true, canDelete: true } })
ok(c3.status === 204, 'hepsi true → kayıt silindi (kısıtlama yok)', c3.status)
// geri kısıtla (test için)
await api('POST', '/api/screen-rights', { token: TOK, companyId: A, body: { userId: uid, resource: 'products', canView: true, canAdd: false, canEdit: false, canDelete: false } })

// login → screenRights
const lg = await api('POST', '/api/auth/login', { noAuth: true, body: { username: 'rgtest', password: 'parola123' } })
const sr = lg.data.user.screenRights || {}
ok(sr.products?.view === true && sr.products?.add === false && sr.products?.edit === false && sr.products?.delete === false, 'login.screenRights.products doğru', JSON.stringify(sr.products))
ok(sr.warehouses?.view === false, 'login.screenRights.warehouses.view=false (gizli)', JSON.stringify(sr.warehouses))

// GRUP MİRAS: gruba hak → kullanıcı miras (false öncelikli)
const g = await api('POST', '/api/user-groups', { token: TOK, companyId: A, body: { code: 'RGGRP', name: 'Hak Grup' } }); const gid = g.data.id
await api('POST', '/api/screen-rights', { token: TOK, companyId: A, body: { groupId: gid, resource: 'partners', canView: true, canAdd: true, canEdit: false, canDelete: false } })
await api('PATCH', '/api/users/' + uid, { token: TOK, companyId: A, body: { groups: [gid] } })
const lg2 = await api('POST', '/api/auth/login', { noAuth: true, body: { username: 'rgtest', password: 'parola123' } })
ok(lg2.data.user.screenRights?.partners?.edit === false && lg2.data.user.screenRights?.partners?.add === true, 'MIRAS: gruptan partners edit=false add=true', JSON.stringify(lg2.data.user.screenRights?.partners))

await purgeUser('rgtest'); await purgeGroup('RGGRP'); await prisma.$disconnect()
console.log('   ✓ temizlendi')
