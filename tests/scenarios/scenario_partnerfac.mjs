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
const ok = (c, l, d = '') => console.log((c ? '   ✓ ' : '   ✗ ') + l + (d ? ' — ' + d : ''))
let DOCN = 9500; const dn = () => `CF-${++DOCN}`

const A = 2
const TOK = (await api('POST', '/api/auth/login', { body: { username: 'admin', password: 'admin123' } })).data.token
const wh = arr((await api('GET', '/api/warehouses', { token: TOK, companyId: A })).data).find((w) => w.code === 'A-WH')
const prod = arr((await api('GET', '/api/products', { token: TOK, companyId: A })).data).find((p) => p.code === 'A-PRD-001')
const unit = arr((await api('GET', '/api/units', { token: TOK, companyId: A })).data)[0]
const loc = arr((await api('GET', '/api/locations', { token: TOK, companyId: A })).data)[0]
const stAv = arr((await api('GET', '/api/statuses', { token: TOK, companyId: A })).data).find((s) => s.code === 'AVAILABLE')
const gr = arr((await api('GET', '/api/operation-types', { token: TOK, companyId: A })).data).find((o) => o.code === 'A-GR')

const fac2 = (await api('POST', '/api/facilities', { token: TOK, companyId: A, body: { code: 'CF-FAC2', name: 'Müşteri Test Tesis 2' } })).data.id
const partner = (await api('POST', '/api/partners', { token: TOK, companyId: A, body: { code: 'PFTEST', name: 'Müşteri Test', type: 'BOTH' } })).data
ok(!!partner.id, 'müşteri oluştu id=' + partner.id, partner.status)

const mkDoc = () => api('POST', '/api/documents', { token: TOK, companyId: A, body: { documentNo: dn(), operationTypeId: gr.id, warehouseId: wh.id, partnerId: partner.id, lines: [{ productId: prod.id, unitId: unit.id, quantity: 1, batchNo: 'B1', targetLocationId: loc.id, targetStatusId: stAv.id }] } })

ok((await mkDoc()).status === 201, 'kısıt YOK → belge serbest (201)')
await api('PATCH', `/api/partners/${partner.id}`, { token: TOK, companyId: A, body: { facilities: [fac2] } })
const blocked = await mkDoc()
ok(blocked.status === 400 && /müşteri.*tesis|tesis/i.test(msg(blocked)), `FAC2'ye kısıtlı müşteri, A-FAC deposunda → ENGELLENDİ (${msg(blocked)})`)
await api('PATCH', `/api/partners/${partner.id}`, { token: TOK, companyId: A, body: { facilities: [wh.facilityId] } })
ok((await mkDoc()).status === 201, 'deponun tesisine izinli müşteri → serbest (201)')
const pget = await api('GET', `/api/partners/${partner.id}`, { token: TOK, companyId: A })
ok((pget.data.facilities ?? []).map((f) => f.facilityId).includes(wh.facilityId), 'GET müşteri.facilities dönüyor')

// temizlik
const { PrismaPg } = await import('@prisma/adapter-pg'); const { PrismaClient } = await import('@prisma/client')
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) })
const docs = await prisma.tBLDOCUMENT.findMany({ where: { documentNo: { startsWith: 'CF-' } }, select: { id: true } })
await prisma.tBLDOCUMENTLINE.deleteMany({ where: { documentId: { in: docs.map((d) => d.id) } } })
await prisma.tBLDOCUMENT.deleteMany({ where: { id: { in: docs.map((d) => d.id) } } })
await prisma.tBLPARTNERFACILITY.deleteMany({ where: { partnerId: partner.id } })
await prisma.tBLBUSINESSPARTNER.delete({ where: { id: partner.id } })
await prisma.tBLFACILITY.delete({ where: { id: fac2 } })
await prisma.$disconnect()
console.log('   ✓ temizlendi (müşteri + FAC2 + CF-belgeler)')
