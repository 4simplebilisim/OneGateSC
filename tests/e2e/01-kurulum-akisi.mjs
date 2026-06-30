// Sıralı uçtan-uca kurulum akışı: firma → tesis → depo → alan → lokasyon(raf) → birim →
// statü → ürün → ürün-birim → müşteri → operasyon tipi → belge → confirm → complete → STOK.
// Tüm zincirin (statü-tesis zorunlu, ilk birim oto-ana, tenant) birlikte çalıştığını kanıtlar.
import { pathToFileURL } from 'url'
import { api, msg, login, reporter, prismaClient, resetTestCompanyByCode, purgeCompany } from './_harness.mjs'

export const name = 'Kurulum akışı (firma→tesis→depo→lokasyon→birim→statü→ürün→birim→müşteri→operasyon→belge→stok)'

export default async function run() {
  const r = reporter(name)
  const TOK = await login('admin', 'admin123')
  const prisma = await prismaClient()
  await resetTestCompanyByCode(prisma, 'TEST-KURULUM') // önceki başarısız koşu kalıntısını temizle

  let companyId
  try {
    r.section('1) Firma (tenant) tanımlama')
    const firm = await api('POST', '/api/companies', { token: TOK, body: { code: 'TEST-KURULUM', name: 'Test Kurulum A.Ş.' } })
    r.ok(firm.status === 201 && !!firm.data.id, 'firma oluştu', msg(firm))
    companyId = firm.data.id
    const co = { token: TOK, companyId }

    r.section('2) Tesis tanımlama')
    const fac = await api('POST', '/api/facilities', { ...co, body: { code: 'K-FAC', name: 'Kurulum Tesis', city: 'İstanbul' } })
    r.ok(fac.status === 201 && fac.data.companyId === companyId, 'tesis oluştu (tenant ayrı)', msg(fac))
    const facId = fac.data.id

    r.section('3) Depo tanımlama')
    const wh = await api('POST', '/api/warehouses', { ...co, body: { code: 'K-WH', name: 'Kurulum Depo', facilityId: facId } })
    r.ok(wh.status === 201 && wh.data.facilityId === facId, 'depo oluştu (tesise bağlı)', msg(wh))
    const whId = wh.data.id

    r.section('4) Alan tanımlama')
    const area = await api('POST', '/api/areas', { ...co, body: { code: 'K-AR', name: 'Kurulum Alan', warehouseId: whId } })
    r.ok(area.status === 201 && !!area.data.id, 'alan oluştu', msg(area))

    r.section('5) Lokasyon (raf) tanımlama')
    const loc = await api('POST', '/api/locations', { ...co, body: { code: 'K-L01', name: 'Kurulum Raf 01', warehouseId: whId, areaId: area.data.id } })
    r.ok(loc.status === 201 && !!loc.data.id, 'lokasyon/raf oluştu', msg(loc))
    const locId = loc.data.id

    r.section('6) Birim tanımlama')
    const unit = await api('POST', '/api/units', { ...co, body: { code: 'ADET', name: 'Adet' } })
    r.ok(unit.status === 201 && !!unit.data.id, 'birim oluştu', msg(unit))
    const unitId = unit.data.id

    r.section('7) Statü tanımlama (tesis ZORUNLU)')
    const stNoFac = await api('POST', '/api/statuses', { ...co, body: { code: 'AVAILABLE', name: 'Kullanılabilir' } })
    r.ok(stNoFac.status === 400, 'tesissiz statü → 400 (STF-03)', msg(stNoFac))
    const st = await api('POST', '/api/statuses', { ...co, body: { code: 'AVAILABLE', name: 'Kullanılabilir', facilityId: facId } })
    r.ok(st.status === 201 && st.data.facilityId === facId, 'tesisli statü oluştu', msg(st))
    const statusId = st.data.id

    r.section('8) Ürün tanımlama')
    const prod = await api('POST', '/api/products', { ...co, body: { code: 'K-PRD-001', name: 'Kurulum Ürün 1' } })
    r.ok(prod.status === 201 && !!prod.data.id, 'ürün oluştu', msg(prod))
    const prodId = prod.data.id

    r.section('9) Ürün-birim tanımlama (ilk birim → oto-ANA)')
    const pu = await api('POST', '/api/product-units', { ...co, body: { productId: prodId, unitId } })
    r.ok(pu.status === 201 && pu.data.isBaseUnit === true, 'ilk ürün-birim otomatik ANA birim (PRD-06)', String(pu.data.isBaseUnit))

    r.section('10) Müşteri tanımlama')
    const partner = await api('POST', '/api/partners', { ...co, body: { code: 'K-CARI', name: 'Kurulum Müşteri', type: 'BOTH' } })
    r.ok(partner.status === 201 && !!partner.data.id, 'müşteri oluştu', msg(partner))

    r.section('11) Operasyon tipi (mal kabul / INBOUND)')
    const op = await api('POST', '/api/operation-types', { ...co, body: { code: 'K-GR', name: 'Kurulum Mal Kabul', direction: 'INBOUND', affectsStock: true, facilityId: facId } })
    r.ok(op.status === 201 && !!op.data.id, 'operasyon tipi oluştu', msg(op))
    const opId = op.data.id

    r.section('12) Belge → confirm → complete')
    const QTY = 25
    const doc = await api('POST', '/api/documents', { ...co, body: { documentNo: 'K-GR-0001', operationTypeId: opId, warehouseId: whId, partnerId: partner.data.id, lines: [{ productId: prodId, unitId, quantity: QTY, batchNo: 'KB1', targetLocationId: locId, targetStatusId: statusId }] } })
    r.ok(doc.status === 201 && !!doc.data.id, 'belge oluştu (DRAFT)', msg(doc))
    if (doc.data.id) {
      const confirm = await api('POST', `/api/documents/${doc.data.id}/confirm`, co)
      r.ok(confirm.status === 200 || confirm.status === 201, 'confirm', msg(confirm))
      const complete = await api('POST', `/api/documents/${doc.data.id}/complete`, co)
      r.ok(complete.status === 200 || complete.status === 201, 'complete (movement çalıştı)', msg(complete))
    }

    r.section('13) Stok doğrulama')
    const stock = await prisma.tBLSTOCK.findFirst({ where: { companyId, productId: prodId, batchNo: 'KB1' }, select: { mainQty: true, locationId: true, statusId: true } })
    r.ok(!!stock && Number(stock.mainQty) === QTY, `stok oluştu: ${QTY} adet`, stock ? String(stock.mainQty) : 'YOK')
    r.ok(!!stock && stock.locationId === locId && stock.statusId === statusId, 'stok doğru lokasyon + statüde')
  } finally {
    if (companyId) await purgeCompany(prisma, companyId)
    await prisma.$disconnect()
  }
  return r.done()
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) run().then((x) => { console.log(`\n=== ${x.P} geçti / ${x.F} kaldı ===`); process.exit(x.F ? 1 : 0) })
