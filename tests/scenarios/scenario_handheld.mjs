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
const purge = async () => {
  const gs = await prisma.tBLHANDHELDMENUGROUP.findMany({ where: { code: { in: ['HHG1', 'HHG2'] } } })
  for (const g of gs) { await prisma.tBLHANDHELDMENUITEM.deleteMany({ where: { groupId: g.id } }); await prisma.tBLHANDHELDMENUGROUP.delete({ where: { id: g.id } }) }
}

const su = await api('POST', '/api/auth/login', { noAuth: true, body: { username: 'admin', password: 'admin123' } })
const TOK = su.data.token
await purge()
const C = su.data.user.companyId ?? 1
const op = arr((await api('GET', '/api/operation-types', { token: TOK })).data).find((o) => o.code === 'GR')

// grup + 2 item
const g1 = await api('POST', '/api/handheld-menu-groups', { token: TOK, body: { code: 'HHG1', name: 'MAL KABUL', sortOrder: 1 } })
ok(g1.status === 201, 'menü grubu oluştu id=' + g1.data.id, g1.status); const gid = g1.data.id
const i1 = await api('POST', '/api/handheld-menu-items', { token: TOK, body: { groupId: gid, code: 'ZG01', name: 'Mal Kabul', screenType: 'RECEIPT', operationTypeId: op?.id, sortOrder: 1 } })
const i2 = await api('POST', '/api/handheld-menu-items', { token: TOK, body: { groupId: gid, code: 'ZG02', name: 'Platinyum Giriş', screenType: 'RECEIPT', sortOrder: 2 } })
ok(i1.status === 201 && i2.status === 201, '2 menü item oluştu (ZG01 op=GR, ZG02)', i1.status + '/' + i2.status)

// item ownerField filtre
const items = arr((await api('GET', `/api/handheld-menu-items?groupId=${gid}`, { token: TOK })).data)
ok(items.length === 2, 'item liste groupId filtreli (2)', items.length)

// birleşik endpoint
const menu = arr((await api('GET', '/api/handheld-menu', { token: TOK })).data)
const grp = menu.find((g) => g.code === 'HHG1')
ok(grp && grp.items?.length === 2 && grp.items[0].screenType === 'RECEIPT', 'GET /api/handheld-menu: grup+2 item (sortOrder sıralı)', JSON.stringify(grp?.items?.map((x) => x.code)))

// 2. grup pasif item ile → birleşikte gelmez
const g2 = await api('POST', '/api/handheld-menu-groups', { token: TOK, body: { code: 'HHG2', name: 'PASIF', sortOrder: 2, isActive: false } })
const menu2 = arr((await api('GET', '/api/handheld-menu', { token: TOK })).data)
ok(!menu2.find((g) => g.code === 'HHG2'), 'pasif grup birleşikte gelmiyor')

await purge(); await prisma.$disconnect()
console.log('   ✓ temizlendi')
