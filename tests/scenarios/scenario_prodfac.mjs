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
let DOCN = 9000; const dn = () => `PF-${++DOCN}`

const A = 2
const su = await api('POST', '/api/auth/login', { noAuth: true, body: { username: 'admin', password: 'admin123' } })
const TOK = su.data.token

const wh = arr((await api('GET', '/api/warehouses', { token: TOK, companyId: A })).data).find((w) => w.code === 'A-WH')
const prod = arr((await api('GET', '/api/products', { token: TOK, companyId: A })).data).find((p) => p.code === 'A-PRD-001')
const unit = arr((await api('GET', '/api/units', { token: TOK, companyId: A })).data)[0]
const loc = arr((await api('GET', '/api/locations', { token: TOK, companyId: A })).data)[0]
const stAv = arr((await api('GET', '/api/statuses', { token: TOK, companyId: A })).data).find((s) => s.code === 'AVAILABLE')
const gr = arr((await api('GET', '/api/operation-types', { token: TOK, companyId: A })).data).find((o) => o.code === 'A-GR')
ok(!!(wh && prod && gr && wh.facilityId), `A master: depo=${wh?.code} (tesis=${wh?.facilityId}) ürün=${prod?.code}`)

// 2. tesis (FAC2)
const fac2 = await api('POST', '/api/facilities', { token: TOK, companyId: A, body: { code: 'A-FAC2', name: 'A Tesis 2' } })
const f2 = fac2.data.id

const mkDoc = () => api('POST', '/api/documents', { token: TOK, companyId: A, body: { documentNo: dn(), operationTypeId: gr.id, warehouseId: wh.id, lines: [{ productId: prod.id, unitId: unit.id, quantity: 1, batchNo: 'B1', targetLocationId: loc.id, targetStatusId: stAv.id }] } })

// kısıtsız → serbest
ok((await mkDoc()).status === 201, 'kısıt YOK → belge serbest (201)')

// ürünü SADECE FAC2'ye kısıtla (depo tesisi A-FAC ≠ FAC2) → engellenmeli
await api('PATCH', `/api/products/${prod.id}`, { token: TOK, companyId: A, body: { facilities: [f2] } })
const blocked = await mkDoc()
ok(blocked.status === 400 && /tesis/i.test(msg(blocked)), `FAC2'ye kısıtlı ürün, A-FAC deposunda → ENGELLENDİ (${msg(blocked)})`)

// ürünü deponun tesisine (A-FAC) izinli yap → serbest
await api('PATCH', `/api/products/${prod.id}`, { token: TOK, companyId: A, body: { facilities: [wh.facilityId] } })
ok((await mkDoc()).status === 201, 'deponun tesisine izinli → belge serbest (201)')

// GET ürün facilities dönüyor mu
const pget = await api('GET', `/api/products/${prod.id}`, { token: TOK, companyId: A })
const facs = (pget.data.facilities ?? []).map((f) => f.facilityId)
ok(facs.includes(wh.facilityId) && facs.length === 1, 'GET ürün.facilities = deponun tesisi', JSON.stringify(facs))

// temizlik: kısıtı kaldır + FAC2 sil
await api('PATCH', `/api/products/${prod.id}`, { token: TOK, companyId: A, body: { facilities: [] } })
await api('DELETE', `/api/facilities/${f2}`, { token: TOK, companyId: A })
const cleared = await api('GET', `/api/products/${prod.id}`, { token: TOK, companyId: A })
ok((cleared.data.facilities ?? []).length === 0, 'temizlendi (kısıt kaldırıldı, FAC2 silindi)')

// kalan PF- belgelerini temizle
const { PrismaPg } = await import('@prisma/adapter-pg'); const { PrismaClient } = await import('@prisma/client')
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) })
const docs = await prisma.tBLDOCUMENT.findMany({ where: { documentNo: { startsWith: 'PF-' } }, select: { id: true } })
const ids = docs.map((d) => d.id)
await prisma.tBLDOCUMENTLINE.deleteMany({ where: { documentId: { in: ids } } })
await prisma.tBLDOCUMENT.deleteMany({ where: { id: { in: ids } } })
await prisma.$disconnect()
console.log('   ✓ test belgeleri temizlendi')
