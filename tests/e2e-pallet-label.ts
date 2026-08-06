import { buildApp } from '../src/app.js'
import { prisma } from '../src/lib/prisma.js'

/**
 * PALET ETİKETİ TURU — tedarikçi etiketiyle ilk mal kabul.
 *
 * Senaryo: etiketteki barkod  paletno/ürün/parti/SKT/adet/birim
 * Palet SİSTEMDE YOK (etiket sadece bir kâğıt). Okutmada:
 *   1) barkod alanlarına ayrışır
 *   2) palet kaydı AÇILIR (id alınır)
 *   3) stok o palletId ile yazılır (complete anında)
 */
const CO = Number(process.env.DEMO_COMPANY_ID ?? 2)
let hata = 0
const ok = (a: string, b: boolean, d?: unknown) => {
  if (b) console.log(`  ✓ ${a}${d !== undefined ? ` — ${d}` : ''}`)
  else { hata++; console.log(`  ✗ BULGU ${a}${d !== undefined ? ` — ${JSON.stringify(d)}` : ''}`) }
}

const app = await buildApp({ logger: false })
await app.ready()
const login = await app.inject({
  method: 'POST', url: '/api/auth/login',
  payload: { username: process.env.DEMO_USER ?? 'admin', password: process.env.DEMO_PASSWORD ?? 'admin123' },
})
if (login.statusCode !== 200) throw new Error('login: ' + login.body)
const auth = { authorization: `Bearer ${login.json().token as string}`, 'x-company-id': String(CO) }
const GET = (u: string) => app.inject({ method: 'GET', url: u, headers: auth })
const POST = (u: string, payload?: unknown) => app.inject({ method: 'POST', url: u, headers: auth, payload: payload ?? {} })

const damga = Date.now().toString(36).toUpperCase().slice(-6)
const temizlik: { belgeler: number[]; paletIds: number[]; barkodTipleri: number[]; parti: string } = { belgeler: [], paletIds: [], barkodTipleri: [], parti: `TED-${damga}` }

// Referans veri
const tip = await prisma.tBLPALLETTYPE.findFirstOrThrow({ where: { companyId: CO, isActive: true } })
const urun = await prisma.tBLPRODUCT.findFirstOrThrow({ where: { companyId: CO }, include: { unit: true } })
const birim = urun.unit ?? await prisma.tBLUNIT.findFirstOrThrow({ where: { companyId: CO } })
const lok = await prisma.tBLLOCATION.findFirstOrThrow({ where: { companyId: CO } })
const opGirler = await prisma.tBLOPERATIONTYPE.findMany({
  where: { companyId: CO, direction: 'INBOUND', statusLinks: { some: { targetStatusId: { not: null } } } },
  include: { statusLinks: true }, orderBy: { id: 'asc' },
})
const opGir = opGirler.find((o) => o.controlMode === 'UNCONTROLLED') ?? opGirler[0]
if (!opGir) throw new Error('Statü geçişli GİRİŞ operasyonu yok')
const kontrollu = opGir.controlMode !== 'UNCONTROLLED'
const hedefStatuId = opGir.statusLinks.find((s) => s.targetStatusId)!.targetStatusId!

// Bileşik barkod kuralı (test kendi kuralını kurar — kiracı ayarına bağlı kalmasın)
const kural = await prisma.tBLBARCODETYPE.create({
  data: {
    companyId: CO, code: `E2ELBL-${damga}`, name: 'E2E palet etiketi', mode: 'SEGMENT',
    matchPrefix: tip.code, matchContains: '/', separator: '/', isActive: true, sortOrder: 5,
  },
})
temizlik.barkodTipleri.push(kural.id)
await prisma.tBLBARCODESEGMENT.createMany({
  data: [
    { companyId: CO, barcodeTypeId: kural.id, sortOrder: 1, field: 'PALLET', parseType: 'UNTIL', separator: '/' },
    { companyId: CO, barcodeTypeId: kural.id, sortOrder: 2, field: 'PRODUCT', parseType: 'UNTIL', separator: '/' },
    { companyId: CO, barcodeTypeId: kural.id, sortOrder: 3, field: 'BATCH', parseType: 'UNTIL', separator: '/' },
    { companyId: CO, barcodeTypeId: kural.id, sortOrder: 4, field: 'EXPIRY', parseType: 'UNTIL', separator: '/', dateFormat: 'YYYYAAGG' },
    { companyId: CO, barcodeTypeId: kural.id, sortOrder: 5, field: 'QUANTITY', parseType: 'UNTIL', separator: '/' },
    { companyId: CO, barcodeTypeId: kural.id, sortOrder: 6, field: 'UNIT', parseType: 'UNTIL', separator: '/' },
  ],
})

// Sade palet no kuralı (bileşikten SONRA denensin: '/' içermeyen kod buraya düşer)
const sadeKural = await prisma.tBLBARCODETYPE.create({
  data: {
    companyId: CO, code: `E2EPAL-${damga}`, name: 'E2E palet no', mode: 'PALLET',
    matchPrefix: tip.code, isActive: true, sortOrder: 6,
  },
})
temizlik.barkodTipleri.push(sadeKural.id)

const PALET_NO = `${tip.code}${damga}`
const ETIKET = `${PALET_NO}/${urun.code}/${temizlik.parti}/20271231/120/${birim.code}`

console.log(`\n╔═ PALET ETİKETİ TURU · ${opGir.code} (${opGir.controlMode})`)
console.log(`   Etiket: ${ETIKET}\n`)

console.log('① ETİKET OKUNUYOR (palet henüz SİSTEMDE YOK)')
const yokMu = await prisma.tBLPALLET.count({ where: { companyId: CO, palletNo: PALET_NO } })
ok('palet sistemde yok', yokMu === 0)

const bak = await GET(`/api/lookup/barcode?code=${encodeURIComponent(ETIKET)}`)
const j = bak.json()
ok('barkod çözüldü → SEGMENT', bak.statusCode === 200 && j.mode === 'SEGMENT', `${j.mode} / kural ${j.barcodeType}`)
ok('palet no okundu', j.fields?.palletNo === PALET_NO, j.fields?.palletNo)
ok('ürün çözüldü', j.product?.id === urun.id, j.product?.code)
ok('parti okundu', j.fields?.batchNo === temizlik.parti, j.fields?.batchNo)
ok('SKT tarihe çevrildi', j.fields?.expiryDate === '2027-12-31', j.fields?.expiryDate)
ok('miktar okundu', Number(j.fields?.quantity) === 120, j.fields?.quantity)
ok('birim çözüldü', j.unit?.code === birim.code, j.unit?.code)
ok('OKUMA PALET YARATMADI (GET yan etkisiz)', (await prisma.tBLPALLET.count({ where: { companyId: CO, palletNo: PALET_NO } })) === 0)
ok('olmayan palet uyarı olarak bildirildi', (j.warnings ?? []).some((w: string) => w.includes('Palet bulunamadı')), JSON.stringify(j.warnings))

console.log('\n② STOK GİRİŞİ — okutmada palet AÇILIR')
const satir = {
  productId: urun.id, unitId: birim.id, quantity: 120,
  targetLocationId: lok.id, targetStatusId: hedefStatuId,
  batchNo: j.fields.batchNo, expiryDate: j.fields.expiryDate,
}
const bg = await POST('/api/documents', {
  documentNo: `E2E-TED-${damga}`, operationTypeId: opGir.id, note: 'Tedarikçi paleti ilk giriş',
  ...(kontrollu ? { lines: [satir] } : {}),
})
ok('mal kabul belgesi açıldı', bg.statusCode === 201, bg.statusCode === 201 ? bg.json().documentNo : bg.body)
const belge = bg.json()
temizlik.belgeler.push(belge.id)

// OKUTMA: palletId DEĞİL, etiketten okunan palet NUMARASI gönderilir
const sc = await POST('/api/document-line-scopes', kontrollu
  ? { documentLineId: belge.lines[0].id, unitId: birim.id, quantity: 120, targetLocationId: lok.id, targetStatusId: hedefStatuId, batchNo: j.fields.batchNo, expiryDate: j.fields.expiryDate, palletNo: j.fields.palletNo }
  : { documentId: belge.id, ...satir, palletNo: j.fields.palletNo })
ok('okutma kabul edildi', sc.statusCode === 201, sc.statusCode === 201 ? 'ok' : sc.body)
const scJ = sc.json()
ok('PALET OKUTMADA AÇILDI', scJ._palletCreated?.palletNo === PALET_NO, JSON.stringify(scJ._palletCreated ?? null))
const palet = await prisma.tBLPALLET.findFirst({ where: { companyId: CO, palletNo: PALET_NO } })
if (palet) temizlik.paletIds.push(palet.id)
ok('palet tablosunda kayıt var', !!palet, palet ? `#${palet.id} tip ${tip.code}` : 'YOK')
ok('okutma paletin id\'sine bağlandı', scJ.palletId === palet?.id, `${scJ.palletId}`)

const c = await POST(`/api/documents/${belge.id}/confirm`)
ok('onaya gönderildi', c.statusCode === 200, c.statusCode === 200 ? c.json().status : c.body)
const t = await POST(`/api/documents/${belge.id}/complete`)
ok('tamamlandı', t.statusCode === 200, t.statusCode === 200 ? t.json().status : t.body)

const stok = await prisma.tBLSTOCK.findFirst({ where: { companyId: CO, palletId: palet?.id ?? -1, mainQty: { gt: 0 } } })
ok('STOK PALET ID İLE YAZILDI (120)', Number(stok?.mainQty ?? 0) === 120, `${stok?.mainQty} · parti ${stok?.batchNo}`)
ok('SKT stoğa da geçti', stok?.expiryDate?.toISOString().slice(0, 10) === '2027-12-31', String(stok?.expiryDate?.toISOString().slice(0, 10)))

console.log('\n③ İKİNCİ OKUTMA — palet artık VAR, tekrar açılmaz')
const bak2 = await GET(`/api/lookup/barcode?code=${encodeURIComponent(ETIKET)}`)
const j2 = bak2.json()
ok('etiket okununca palet ÇÖZÜLÜYOR', j2.fields?.palletId === palet?.id, `id ${j2.fields?.palletId}`)
ok('paletin İÇERİĞİ geliyor', (j2.pallet?.lines?.length ?? 0) === 1 && Number(j2.pallet.lines[0].qty) === 120, JSON.stringify(j2.pallet?.lines?.[0] ?? null))
ok('artık "palet bulunamadı" uyarısı yok', !(j2.warnings ?? []).some((w: string) => w.includes('Palet bulunamadı')))

const sade = await GET(`/api/lookup/barcode?code=${PALET_NO}`)
ok('sade palet no okutması da çalışıyor', sade.json().found === true, `mod ${sade.json().mode}`)

console.log('\n④ ÇIKIŞTA OLMAYAN PALET AÇILMAZ')
const opCik = await prisma.tBLOPERATIONTYPE.findFirst({
  where: { companyId: CO, direction: 'OUTBOUND', statusLinks: { some: { sourceStatusId: { not: null } } } },
  include: { statusLinks: true }, orderBy: { id: 'asc' },
})
if (!opCik) console.log('  (çıkış operasyonu yok — atlandı)')
else {
  const kaynakStatu = opCik.statusLinks.find((x) => x.sourceStatusId)!.sourceStatusId!
  const bc = await POST('/api/documents', {
    documentNo: `E2E-TEDC-${damga}`, operationTypeId: opCik.id,
    lines: [{ productId: urun.id, unitId: birim.id, quantity: 1, sourceLocationId: lok.id, sourceStatusId: kaynakStatu }],
  })
  if (bc.statusCode !== 201) console.log('  (çıkış belgesi açılamadı — atlandı)', bc.body.slice(0, 120))
  else {
    temizlik.belgeler.push(bc.json().id)
    const red = await POST('/api/document-line-scopes', {
      documentLineId: bc.json().lines[0].id, unitId: birim.id, quantity: 1,
      sourceLocationId: lok.id, sourceStatusId: kaynakStatu, palletNo: `${tip.code}YOKPALET`,
    })
    ok('olmayan paletle ÇIKIŞ reddedildi', red.statusCode === 400 && String(red.json().error).includes('Palet bulunamadı'), red.json()?.error)
    ok('reddedilen okutma palet YARATMADI', (await prisma.tBLPALLET.count({ where: { companyId: CO, palletNo: `${tip.code}YOKPALET` } })) === 0)
  }
}

// ── temizlik ──
for (const id of [...temizlik.belgeler].reverse()) {
  const d = await prisma.tBLDOCUMENT.findUnique({ where: { id } })
  if (d?.status === 'COMPLETED') await POST(`/api/documents/${id}/reverse`)
}
await prisma.tBLSTOCKLEDGER.deleteMany({ where: { documentId: { in: temizlik.belgeler } } })
await prisma.tBLDOCUMENTLINESCOPE.deleteMany({ where: { documentLine: { documentId: { in: temizlik.belgeler } } } })
await prisma.tBLDOCUMENTLINE.deleteMany({ where: { documentId: { in: temizlik.belgeler } } })
await prisma.tBLDOCUMENTSTATUSHISTORY.deleteMany({ where: { documentId: { in: temizlik.belgeler } } })
await prisma.tBLDOCUMENT.deleteMany({ where: { id: { in: temizlik.belgeler } } })
await prisma.tBLSTOCK.deleteMany({ where: { companyId: CO, palletId: { in: temizlik.paletIds } } })
await prisma.tBLPALLET.deleteMany({ where: { id: { in: temizlik.paletIds } } })
await prisma.tBLBARCODESEGMENT.deleteMany({ where: { barcodeTypeId: { in: temizlik.barkodTipleri } } })
await prisma.tBLBARCODETYPE.deleteMany({ where: { id: { in: temizlik.barkodTipleri } } })
console.log('\n(test verisi silindi)')

console.log(hata ? `\n╚═ ${hata} BULGU VAR` : '\n╚═ PALET ETİKETİ TURU TEMİZ')
await app.close()
await prisma.$disconnect()
process.exit(hata ? 1 : 0)
