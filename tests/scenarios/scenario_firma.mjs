import 'dotenv/config'
const BASE = 'http://localhost:3000'
const api = async (m, p, { body, token, noAuth } = {}) => {
  const h = {}; if (body) h['Content-Type'] = 'application/json'; if (!noAuth && token) h.Authorization = 'Bearer ' + token
  const r = await fetch(BASE + p, { method: m, headers: h, body: body ? JSON.stringify(body) : undefined })
  let d; const t = await r.text(); try { d = JSON.parse(t) } catch { d = t }
  return { status: r.status, data: d }
}
const arr = (d) => (Array.isArray(d) ? d : (d.data ?? []))
const ok = (c, l, d = '') => console.log((c ? '   ✓ ' : '   ✗ ') + l + (d ? ' — ' + d : ''))

const su = await api('POST', '/api/auth/login', { noAuth: true, body: { username: 'admin', password: 'admin123' } })
const TOK = su.data.token

// temizle — firma-create otomatik seed yapar (raporlar + belge durumları + WO sayacı, 0c8f31d);
// FK Restrict olduğundan firma silinmeden ÖNCE seed kayıtları da silinmeli
const { PrismaPg } = await import('@prisma/adapter-pg'); const { PrismaClient } = await import('@prisma/client')
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) })
const purgeSeeds = async (companyId) => {
  await prisma.tBLREPORTDEF.deleteMany({ where: { companyId } }) // kriter/saha cascade
  await prisma.tBLDOCUMENTSTATUS.deleteMany({ where: { companyId } })
  await prisma.tBLSEQUENCE.deleteMany({ where: { companyId } })
}
for (const row of await prisma.tBLCOMPANY.findMany({ where: { code: 'TEST-FIRMA' }, select: { id: true } })) {
  await purgeSeeds(row.id)
  await prisma.tBLCOMPANY.delete({ where: { id: row.id } })
}
await prisma.tBLUSER.deleteMany({ where: { username: 'test-firma-op' } }) // önceki koşudan kalan test kullanıcısı

const c = await api('POST', '/api/companies', { token: TOK, body: { code: 'TEST-FIRMA', name: 'Test Firma', taxNumber: '999' } })
ok(c.status === 201, 'super-admin firma oluşturdu id=' + c.data.id, c.status)
const cid = c.data.id

// firma-create otomatik seed doğrulaması: kanonik belge durumları (BKL/TPL/OBK/ONY/IPT) + raporlar
const stCount = await prisma.tBLDOCUMENTSTATUS.count({ where: { companyId: cid } })
ok(stCount === 5, "firma-create belge durumlarını seed'ledi (5)", stCount)
const repCount = await prisma.tBLREPORTDEF.count({ where: { companyId: cid } })
ok(repCount > 0, "firma-create raporları seed'ledi", repCount)

const list = await api('GET', '/api/companies', { token: TOK })
ok(arr(list.data).some((x) => x.code === 'TEST-FIRMA'), 'liste TEST-FIRMA içeriyor')

const dup = await api('POST', '/api/companies', { token: TOK, body: { code: 'TEST-FIRMA', name: 'X' } })
ok(dup.status === 409, 'aynı kod → 409', dup.data.error || dup.status)

const pa = await api('PATCH', '/api/companies/' + cid, { token: TOK, body: { name: 'Test Firma 2' } })
ok(pa.status === 200 && pa.data.name === 'Test Firma 2', 'PATCH ad güncellendi')

// normal kullanıcı testi — güncel fikstürde hazır 'operator' yok, senaryo kendi kullanıcısını açar
// (OPERATOR rolü: requireWrite geçer → 403 kesin requireSuper'den gelir)
const uc = await api('POST', '/api/users', { token: TOK, body: { username: 'test-firma-op', email: 'test-firma-op@test.local', password: 'test123', fullName: 'Test Firma Op', roles: ['OPERATOR'] } })
ok(uc.status === 201, 'test kullanıcısı (OPERATOR) açıldı id=' + uc.data.id, uc.status)
const opLogin = await api('POST', '/api/auth/login', { noAuth: true, body: { username: 'test-firma-op', password: 'test123' } })
ok(opLogin.status === 200, 'test kullanıcısı login oldu', opLogin.status)
const OPTOK = opLogin.data.token

const opCreate = await api('POST', '/api/companies', { token: OPTOK, body: { code: 'OP-FIRMA', name: 'Op' } })
ok(opCreate.status === 403, 'normal kullanıcı firma açamaz → 403', opCreate.data.error || opCreate.status)

// silme 1: seed'lenen bağlı veri (rapor/belge durumu/sayaç) varken → 409 DOĞRU davranış
const del1 = await api('DELETE', '/api/companies/' + cid, { token: TOK })
ok(del1.status === 409, "seed'lenen bağlı veri varken silme → 409", del1.data.error || del1.status)

// silme 2: bağlı seed kayıtları temizlenince → 204
await purgeSeeds(cid)
const del2 = await api('DELETE', '/api/companies/' + cid, { token: TOK })
ok(del2.status === 204, 'bağlı veri temizlenince super-admin firma sildi → 204', del2.status)

const left = await prisma.tBLCOMPANY.findMany({ where: { code: 'TEST-FIRMA' } })
ok(left.length === 0, 'silindi (DB temiz)')

// test kullanıcısını temizle (userRoles cascade)
await prisma.tBLUSER.deleteMany({ where: { username: 'test-firma-op' } })
await prisma.$disconnect()
