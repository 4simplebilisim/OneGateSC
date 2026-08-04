import 'dotenv/config'
const BASE = 'http://localhost:3000'
const api = async (m, p, { body, token, companyId, noAuth } = {}) => {
  const h = {}; if (body) h['Content-Type'] = 'application/json'; if (!noAuth && token) h.Authorization = 'Bearer ' + token; if (companyId) h['x-company-id'] = String(companyId)
  const r = await fetch(BASE + p, { method: m, headers: h, body: body ? JSON.stringify(body) : undefined })
  let d; const t = await r.text(); try { d = JSON.parse(t) } catch { d = t }
  return { status: r.status, data: d }
}
const arr = (d) => (Array.isArray(d) ? d : (d.data ?? []))
const msg = (r) => (r.data && (r.data.error || r.data.message)) || r.status
const ok = (c, l, d = '') => console.log((c ? '   ✓ ' : '   ✗ ') + l + (d ? ' — ' + d : ''))
let DOCN = 7000; const dn = () => `G-${++DOCN}`

const { PrismaPg } = await import('@prisma/adapter-pg'); const { PrismaClient } = await import('@prisma/client')
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) })
const purgeUser = async (u) => { const x = await prisma.tBLUSER.findFirst({ where: { username: u } }); if (x) { await prisma.tBLDOCUMENTLINE.deleteMany({ where: { document: { createdById: x.id } } }); await prisma.tBLDOCUMENT.deleteMany({ where: { createdById: x.id } }); await prisma.tBLUSERAUTHORIZATION.deleteMany({ where: { userId: x.id } }); await prisma.tBLUSERGROUPMEMBER.deleteMany({ where: { userId: x.id } }); await prisma.tBLUSER.delete({ where: { id: x.id } }) } }
const purgeGroup = async (c) => { const g = await prisma.tBLUSERGROUP.findFirst({ where: { code: c } }); if (g) { await prisma.tBLUSERAUTHORIZATION.deleteMany({ where: { groupId: g.id } }); await prisma.tBLUSERGROUPMEMBER.deleteMany({ where: { groupId: g.id } }); await prisma.tBLUSERGROUP.delete({ where: { id: g.id } }) } }

const A = 2
const su = await api('POST', '/api/auth/login', { noAuth: true, body: { username: 'admin', password: 'admin123' } })
const TOK = su.data.token
await purgeUser('grpuser'); await purgeGroup('GRPTEST')

// A master
const ops = arr((await api('GET', '/api/operation-types', { token: TOK, companyId: A })).data)
const GR = ops.find((o) => o.code === 'A-GR'), GI = ops.find((o) => o.code === 'A-GI')
const prod = arr((await api('GET', '/api/products', { token: TOK, companyId: A })).data).find((p) => p.code === 'A-PRD-001')
const unit = arr((await api('GET', '/api/units', { token: TOK, companyId: A })).data)[0]
const loc = arr((await api('GET', '/api/locations', { token: TOK, companyId: A })).data)[0]
const wh = arr((await api('GET', '/api/warehouses', { token: TOK, companyId: A })).data)[0]
const stAv = arr((await api('GET', '/api/statuses', { token: TOK, companyId: A })).data).find((s) => s.code === 'AVAILABLE')

// 1) grup oluştur
const g = await api('POST', '/api/user-groups', { token: TOK, companyId: A, body: { code: 'GRPTEST', name: 'Test Grup' } })
ok(g.status === 201, 'grup oluştu id=' + g.data.id, g.status); const gid = g.data.id

// 2) gruba yetki: SCREEN products + OPERATION_TYPE A-GR
const ga1 = await api('POST', '/api/user-authorizations', { token: TOK, companyId: A, body: { groupId: gid, scopeType: 'SCREEN', referenceCode: 'products' } })
const ga2 = await api('POST', '/api/user-authorizations', { token: TOK, companyId: A, body: { groupId: gid, scopeType: 'OPERATION_TYPE', referenceId: GR.id } })
ok(ga1.status === 201 && ga2.status === 201, 'gruba yetki: SCREEN products + OP A-GR', ga1.status + '/' + ga2.status)

// 3) kullanıcı oluştur + gruba ata
const cu = await api('POST', '/api/users', { token: TOK, companyId: A, body: { username: 'grpuser', email: 'g@a.local', password: 'parola123', fullName: 'Grup User', companyId: A, roles: ['OPERATOR'], groups: [gid] } })
ok(cu.status === 201, 'kullanıcı oluştu + gruba atandı id=' + cu.data.id, cu.status)
const uid = cu.data.id
const mem = (cu.data.groupMemberships ?? []).map((m) => m.groupId)
ok(mem.includes(gid), 'kullanıcı grup üyeliği kayıtlı', JSON.stringify(mem))

// 4) login → ekran yetkisi gruptan miras (products)
const lg = await api('POST', '/api/auth/login', { noAuth: true, body: { username: 'grpuser', password: 'parola123' } })
const scr = lg.data.user.screens || []
ok(scr.includes('products'), 'MIRAS: login.screens grubun "products" ekranını içeriyor', JSON.stringify(scr))
const tokU = lg.data.token

// 5) enforcement: grubun OP yetkisi A-GR → GR serbest, GI engelli
const mkDoc = (opId) => api('POST', '/api/documents', { token: tokU, body: { documentNo: dn(), operationTypeId: opId, warehouseId: wh.id, lines: [{ productId: prod.id, unitId: unit.id, quantity: 1, batchNo: 'B1', targetLocationId: loc.id, targetStatusId: stAv.id }] } })
const dGR = await mkDoc(GR.id)
ok(dGR.status === 201, 'MIRAS enforcement: grup-yetkili GR → 201', dGR.status)
const dGI = await mkDoc(GI.id)
ok(dGI.status === 403, 'MIRAS enforcement: grup-yetkisiz GI → 403', msg(dGI))

// 6) user-groups CRUD list
const gl = await api('GET', '/api/user-groups', { token: TOK, companyId: A })
ok(arr(gl.data).some((x) => x.code === 'GRPTEST'), 'user-groups liste GRPTEST içeriyor')

// cleanup
await purgeUser('grpuser'); await purgeGroup('GRPTEST')
await prisma.$disconnect()
console.log('   ✓ temizlendi')
