import { buildApp } from '../src/app.js'
import { prisma } from '../src/lib/prisma.js'

/**
 * TAM TUR E2E — gerçek HTTP uçlarından (auth + RBAC + tüm middleware dahil):
 *   ① MAL KABUL: barkod okut → stok gir
 *   ② STATÜ DEĞİŞTİR: Kullanılabilir → Bloke
 *   ③ SEVKİYAT: rezervasyon + barkod okutma → stok çıkışı
 */
const CO = 2
let hata = 0
const ok = (a: string, b: boolean, d?: unknown) => {
  if (b) console.log(`  ✓ ${a}${d !== undefined ? ` — ${d}` : ''}`)
  else { hata++; console.log(`  ✗ BULGU ${a}${d !== undefined ? ` — ${JSON.stringify(d)}` : ''}`) }
}
const bilgi = (s: string) => console.log(`    · ${s}`)

const app = await buildApp({ logger: false })
await app.ready()

const login = await app.inject({ method: 'POST', url: '/api/auth/login', payload: { username: 'admin', password: 'admin123' } })
if (login.statusCode !== 200) throw new Error('login başarısız: ' + login.body)
const auth = { authorization: `Bearer ${login.json().token as string}`, 'x-company-id': String(CO) }
const GET = (u: string) => app.inject({ method: 'GET', url: u, headers: auth })
const POST = (u: string, payload?: unknown) => app.inject({ method: 'POST', url: u, headers: auth, payload: payload ?? {} })

// Referans veri
// Barkodlu bir ürün seç — test barkod okutmasıyla başlar
const bc = await prisma.tBLPRODUCTUNITBARCODE.findFirst({
  where: { productUnit: { product: { companyId: CO } } },
  include: { productUnit: { include: { product: true } } },
})
if (!bc) throw new Error(`Firma ${CO}: barkod tanımlı ürün yok — test barkod okutmasıyla başlıyor`)
const urun = bc.productUnit.product
const BARKOD = bc.barcode
const opGir = await prisma.tBLOPERATIONTYPE.findFirstOrThrow({ where: { companyId: CO, code: 'BLG-GIR' } })
const opSta = await prisma.tBLOPERATIONTYPE.findFirstOrThrow({ where: { companyId: CO, code: 'STA-DEG' } })
const opCik = await prisma.tBLOPERATIONTYPE.findFirstOrThrow({ where: { companyId: CO, code: 'REZ-CIK' } }) // rezervasyon açık
const stKul = await prisma.tBLSTATUS.findFirstOrThrow({ where: { companyId: CO, code: '1' } })
const stBlo = await prisma.tBLSTATUS.findFirstOrThrow({ where: { companyId: CO, code: '2' } })
const lok = await prisma.tBLLOCATION.findFirstOrThrow({ where: { companyId: CO, code: 'E1-01' } })
const cari = await prisma.tBLBUSINESSPARTNER.findFirst({ where: { companyId: CO } })
const damga = Date.now().toString(36).toUpperCase().slice(-6)

const stokAl = async (statusId: number) => {
  const r = await prisma.tBLSTOCK.aggregate({
    where: { companyId: CO, productId: urun.id, locationId: lok.id, statusId, batchNo: `E2E-${damga}` },
    _sum: { mainQty: true, reservedQty: true },
  })
  return { adet: Number(r._sum.mainQty ?? 0), rezerv: Number(r._sum.reservedQty ?? 0) }
}
const olusan: number[] = []

console.log(`\n╔═ TAM TUR E2E · ürün ${urun.code} · barkod ${BARKOD} · lokasyon ${lok.code} · parti E2E-${damga}\n`)

// ──────────────────────────────────────────────────────────────
console.log('① MAL KABUL — barkod okutmasıyla stok giriş')
// ──────────────────────────────────────────────────────────────
const bak = await GET(`/api/lookup/barcode?code=${BARKOD}`)
ok('barkod okundu → 200', bak.statusCode === 200, bak.statusCode)
const bakJ = bak.json()
ok('ürün çözüldü', bakJ.found === true && bakJ.product?.id === urun.id, `${bakJ.product?.code} (mod ${bakJ.mode})`)
ok('birim çözüldü', !!bakJ.unit?.id, bakJ.unit?.code)
const birimId = bakJ.unit?.id ?? urun.unitId

const bilinmeyen = await GET('/api/lookup/barcode?code=BOYLE-BIR-BARKOD-YOK')
ok('tanımsız barkod found:false döner (patlamaz)', bilinmeyen.statusCode === 200 && bilinmeyen.json().found === false)

const bg = await POST('/api/documents', {
  documentNo: `E2E-MK-${damga}`, operationTypeId: opGir.id, ...(cari ? { partnerId: cari.id } : {}),
  note: 'E2E mal kabul turu',
})
ok('mal kabul belgesi açıldı → 201', bg.statusCode === 201, bg.statusCode === 201 ? bg.json().documentNo : bg.body)
const belgeGir = bg.json()
if (belgeGir?.id) olusan.push(belgeGir.id)
ok('kontrolsüz belge BOŞ açıldı (satır yok)', (belgeGir.lines?.length ?? 0) === 0)

// Okutma yapılmadan onaya gitmeye çalış — kapı çalışmalı
const erkenOnay = await POST(`/api/documents/${belgeGir.id}/confirm`)
ok('okutmasız onay REDDEDİLİR', erkenOnay.statusCode === 409, erkenOnay.json()?.error)

// Barkod okutmaları: 60 + 40 = 100 KG
for (const adet of [60, 40]) {
  const sc = await POST('/api/document-line-scopes', {
    documentId: belgeGir.id, productId: bakJ.product.id, unitId: birimId, quantity: adet,
    targetLocationId: lok.id, targetStatusId: stKul.id, batchNo: `E2E-${damga}`,
  })
  ok(`okutma ${adet} KG → 201`, sc.statusCode === 201, sc.statusCode === 201 ? `scope #${sc.json().id}` : sc.body)
}
const gDetay = (await GET(`/api/documents/${belgeGir.id}`)).json()
ok('okutma SATIR YARATTI (1 satır)', gDetay.lines?.length === 1, `${gDetay.lines?.length} satır`)
ok('satır miktarı okutmaların toplamı = 100', Number(gDetay.lines?.[0]?.quantity) === 100, gDetay.lines?.[0]?.quantity)

const oncesi = await stokAl(stKul.id)
bilgi(`giriş öncesi stok (Kullanılabilir): ${oncesi.adet}`)
const c1 = await POST(`/api/documents/${belgeGir.id}/confirm`)
ok('onaya gönderildi → 200', c1.statusCode === 200, c1.statusCode === 200 ? c1.json().status : c1.body)
const stokOnayda = await stokAl(stKul.id)
ok('ONAYDA STOK DEĞİŞMEDİ (stok yalnız tamamlamada)', stokOnayda.adet === oncesi.adet, `${stokOnayda.adet}`)

const t1 = await POST(`/api/documents/${belgeGir.id}/complete`)
ok('tamamlandı → 200', t1.statusCode === 200, t1.statusCode === 200 ? t1.json().status : t1.body)
const sonrasi = await stokAl(stKul.id)
ok('STOK 100 ARTTI', sonrasi.adet === oncesi.adet + 100, `${oncesi.adet} → ${sonrasi.adet}`)

const defter = await prisma.tBLSTOCKLEDGER.count({ where: { companyId: CO, documentId: belgeGir.id } })
ok('hareket defterine yazıldı', defter > 0, `${defter} kayıt`)

// ──────────────────────────────────────────────────────────────
console.log('\n② STATÜ DEĞİŞTİRME — Kullanılabilir → Bloke (40 KG)')
// ──────────────────────────────────────────────────────────────
const bloOnce = await stokAl(stBlo.id)
const bs = await POST('/api/documents', {
  documentNo: `E2E-ST-${damga}`, operationTypeId: opSta.id,
  lines: [{
    productId: urun.id, unitId: birimId, quantity: 40,
    sourceLocationId: lok.id, sourceStatusId: stKul.id,
    targetLocationId: lok.id, targetStatusId: stBlo.id, batchNo: `E2E-${damga}`,
  }],
})
ok('statü değiştirme belgesi açıldı → 201', bs.statusCode === 201, bs.statusCode === 201 ? bs.json().documentNo : bs.body)
const belgeSta = bs.json()
if (belgeSta?.id) olusan.push(belgeSta.id)

const scSta = await POST('/api/document-line-scopes', {
  documentLineId: belgeSta.lines[0].id, unitId: birimId, quantity: 40,
  sourceLocationId: lok.id, sourceStatusId: stKul.id,
  targetLocationId: lok.id, targetStatusId: stBlo.id, batchNo: `E2E-${damga}`,
})
ok('plan satırına okutma → 201', scSta.statusCode === 201, scSta.statusCode === 201 ? 'ok' : scSta.body)
const c2 = await POST(`/api/documents/${belgeSta.id}/confirm`)
ok('onaya gönderildi → 200', c2.statusCode === 200, c2.statusCode === 200 ? c2.json().status : c2.body)
const t2 = await POST(`/api/documents/${belgeSta.id}/complete`)
ok('tamamlandı → 200', t2.statusCode === 200, t2.statusCode === 200 ? t2.json().status : t2.body)

const kulSonra = await stokAl(stKul.id)
const bloSonra = await stokAl(stBlo.id)
ok('Kullanılabilir 40 AZALDI', kulSonra.adet === sonrasi.adet - 40, `${sonrasi.adet} → ${kulSonra.adet}`)
ok('Bloke 40 ARTTI', bloSonra.adet === bloOnce.adet + 40, `${bloOnce.adet} → ${bloSonra.adet}`)
ok('toplam korundu (kayıp/kazanç yok)', kulSonra.adet + bloSonra.adet === sonrasi.adet + bloOnce.adet)

// ──────────────────────────────────────────────────────────────
console.log('\n③ SEVKİYAT — rezervasyon + barkod okutma (30 KG)')
// ──────────────────────────────────────────────────────────────
const bc2 = await POST('/api/documents', {
  documentNo: `E2E-SV-${damga}`, operationTypeId: opCik.id, ...(cari ? { partnerId: cari.id } : {}),
  lines: [{
    productId: urun.id, unitId: birimId, quantity: 30,
    sourceLocationId: lok.id, sourceStatusId: stKul.id, batchNo: `E2E-${damga}`,
  }],
})
ok('sevkiyat belgesi açıldı → 201', bc2.statusCode === 201, bc2.statusCode === 201 ? bc2.json().documentNo : bc2.body)
const belgeCik = bc2.json()
if (belgeCik?.id) olusan.push(belgeCik.id)

const rez = await POST(`/api/documents/${belgeCik.id}/reserve`)
ok('REZERVASYON → 200', rez.statusCode === 200, rez.statusCode === 200 ? JSON.stringify(rez.json()) : rez.body)
const rezSonra = await stokAl(stKul.id)
ok('stokta 30 REZERVE göründü', rezSonra.rezerv >= 30, `rezerv ${rezSonra.rezerv}`)
ok('rezervasyon eldeki miktarı DÜŞÜRMEDİ', rezSonra.adet === kulSonra.adet, `${rezSonra.adet}`)

// Rezerve stok başkasına verilmesin: serbest = eldeki - rezerv
const serbest = rezSonra.adet - rezSonra.rezerv
bilgi(`eldeki ${rezSonra.adet} · rezerve ${rezSonra.rezerv} · serbest ${serbest}`)

const bak2 = await GET(`/api/lookup/barcode?code=${BARKOD}`)
ok('sevkiyatta barkod okundu', bak2.statusCode === 200 && bak2.json().found === true)
const stokSatiri = (bak2.json().stock as Array<{ location: string; qty: string; reserved: string }>)
  .find((s) => s.location === lok.code)
ok('barkod sorgusu rezervi de gösteriyor', !!stokSatiri && Number(stokSatiri.reserved) > 0, JSON.stringify(stokSatiri))

const scCik = await POST('/api/document-line-scopes', {
  documentLineId: belgeCik.lines[0].id, unitId: birimId, quantity: 30,
  sourceLocationId: lok.id, sourceStatusId: stKul.id, batchNo: `E2E-${damga}`,
})
ok('plan satırına okutma → 201', scCik.statusCode === 201, scCik.statusCode === 201 ? 'ok' : scCik.body)

// Plandan fazla okutma engellenmeli
const asiri = await POST('/api/document-line-scopes', {
  documentLineId: belgeCik.lines[0].id, unitId: birimId, quantity: 5,
  sourceLocationId: lok.id, sourceStatusId: stKul.id, batchNo: `E2E-${damga}`,
})
ok('PLANDAN FAZLA okutma reddedilir', asiri.statusCode >= 400 && asiri.statusCode !== 404, asiri.statusCode === 201 ? 'GEÇTİ!' : `${asiri.statusCode} ${asiri.json()?.error ?? asiri.body}`)

const c3 = await POST(`/api/documents/${belgeCik.id}/confirm`)
ok('onaya gönderildi → 200', c3.statusCode === 200, c3.statusCode === 200 ? c3.json().status : c3.body)
const t3 = await POST(`/api/documents/${belgeCik.id}/complete`)
ok('tamamlandı → 200', t3.statusCode === 200, t3.statusCode === 200 ? t3.json().status : t3.body)

const cikSonra = await stokAl(stKul.id)
ok('STOK 30 AZALDI', cikSonra.adet === rezSonra.adet - 30, `${rezSonra.adet} → ${cikSonra.adet}`)
ok('REZERV ÇÖZÜLDÜ (çıkışta serbest bırakıldı)', cikSonra.rezerv === 0, `rezerv ${cikSonra.rezerv}`)

// --------------------------------------------------------------
console.log('\n④ PALETLİ GİRİŞ — palet barkodu okutmasıyla (50 KG)')
// --------------------------------------------------------------
// Canlıdaki kuralla aynı desen: PALLET modu, barkodu palet NUMARASI olarak okur.
const palTip = await prisma.tBLPALLETTYPE.findFirst({ where: { companyId: CO } })
if (!palTip) {
  console.log('  (palet tipi tanımlı değil — paletli ayak atlandı)')
} else {
  // Test KENDİ palet kuralını kurar: kiracının mevcut kuralına bağlı kalmasın
  // (ör. yerelde PALLET kuralı barkodun "/" içermesini şart koşuyor).
  // 'ZP' öneki mevcut kurallarla çakışmaz; test sonunda silinir.
  const palKural = await prisma.tBLBARCODETYPE.create({
    data: { companyId: CO, code: `E2EPAL-${damga}`, name: 'E2E palet kuralı', mode: 'PALLET', matchPrefix: 'ZP', isActive: true, sortOrder: 900 },
  })
  const kuralGecici = true
  const PALET_NO = `ZP${damga}`
  const palet = await prisma.tBLPALLET.create({
    data: { companyId: CO, palletNo: PALET_NO, palletTypeId: palTip.id, baseUnitId: birimId, isActive: true },
  })
  bilgi(`palet ${PALET_NO} açıldı (tip ${palTip.code ?? palTip.id}) · kural ${palKural.code} öneki "${palKural.matchPrefix}"`)

  const bosPalet = await GET(`/api/lookup/barcode?code=${PALET_NO}`)
  ok('palet barkodu okundu → PALLET modu', bosPalet.statusCode === 200 && bosPalet.json().mode === 'PALLET', bosPalet.json().mode)
  ok('boş palet içeriği boş döner', (bosPalet.json().pallet?.lines?.length ?? 0) === 0)

  const bp = await POST('/api/documents', { documentNo: `E2E-PL-${damga}`, operationTypeId: opGir.id, note: 'E2E paletli giriş' })
  ok('paletli mal kabul belgesi açıldı → 201', bp.statusCode === 201, bp.statusCode === 201 ? bp.json().documentNo : bp.body)
  const belgePal = bp.json()
  if (belgePal?.id) olusan.push(belgePal.id)

  const scPal = await POST('/api/document-line-scopes', {
    documentId: belgePal.id, productId: urun.id, unitId: birimId, quantity: 50,
    targetLocationId: lok.id, targetStatusId: stKul.id, batchNo: `E2E-${damga}`, palletId: palet.id,
  })
  ok('palete okutma → 201', scPal.statusCode === 201, scPal.statusCode === 201 ? 'ok' : scPal.body)
  const c4 = await POST(`/api/documents/${belgePal.id}/confirm`)
  ok('onaya gönderildi → 200', c4.statusCode === 200, c4.statusCode === 200 ? c4.json().status : c4.body)
  const t4 = await POST(`/api/documents/${belgePal.id}/complete`)
  ok('tamamlandı → 200', t4.statusCode === 200, t4.statusCode === 200 ? t4.json().status : t4.body)

  const palStok = await prisma.tBLSTOCK.aggregate({ where: { companyId: CO, palletId: palet.id, mainQty: { gt: 0 } }, _sum: { mainQty: true } })
  ok('STOK PALETE BAĞLI oluştu (50)', Number(palStok._sum.mainQty ?? 0) === 50, `${palStok._sum.mainQty}`)
  const paletsiz = await prisma.tBLSTOCK.aggregate({
    where: { companyId: CO, productId: urun.id, locationId: lok.id, statusId: stKul.id, batchNo: `E2E-${damga}`, palletId: null },
    _sum: { mainQty: true },
  })
  ok('paletli stok PALETSİZ stokla KARIŞMADI (ayrı satır)', Number(paletsiz._sum.mainQty ?? 0) === 30, `paletsiz ${paletsiz._sum.mainQty}`)

  const doluPalet = await GET(`/api/lookup/barcode?code=${PALET_NO}`)
  const icerik = (doluPalet.json().pallet?.lines ?? []) as Array<{ qty: string; location: string; batchNo: string }>
  ok('PALET OKUTUNCA İÇERİĞİ GELİYOR', icerik.length === 1 && Number(icerik[0]?.qty) === 50, JSON.stringify(icerik[0] ?? null))
  ok('içerikte lokasyon + parti görünüyor', icerik[0]?.location === lok.code && icerik[0]?.batchNo === `E2E-${damga}`)

  const dp = await prisma.tBLDOCUMENT.findUnique({ where: { id: belgePal.id } })
  if (dp?.status === 'COMPLETED') await POST(`/api/documents/${belgePal.id}/reverse`)
  await prisma.tBLSTOCK.deleteMany({ where: { companyId: CO, palletId: palet.id } })
  await prisma.tBLDOCUMENTLINE.updateMany({ where: { palletId: palet.id }, data: { palletId: null } })
  await prisma.tBLPALLET.delete({ where: { id: palet.id } }).catch(() => undefined)
  if (kuralGecici) await prisma.tBLBARCODETYPE.delete({ where: { id: palKural.id } }).catch(() => undefined)
}

// --------------------------------------------------------------
console.log('\n⑤ EAN-13 — gerçek EAN barkoduyla ürün çözümü')
// --------------------------------------------------------------
const ean13 = (g: string) => g + String((10 - ([...g].reduce((t, c, i) => t + Number(c) * (i % 2 === 0 ? 1 : 3), 0) % 10)) % 10)
const EAN = ean13(`869${String(CO).padStart(2, '0')}${String(Math.abs([...damga].reduce((h, c) => h * 31 + c.charCodeAt(0), 7)) % 10000000).padStart(7, '0')}`)
const pu = await prisma.tBLPRODUCTUNIT.findFirst({ where: { companyId: CO, productId: urun.id, unitId: birimId } })
if (!pu) console.log('  (ürün-birim satırı yok — EAN ayağı atlandı)')
else {
  const eanKaydi = await prisma.tBLPRODUCTUNITBARCODE.create({ data: { companyId: CO, productUnitId: pu.id, barcode: EAN, isActive: true } })
  bilgi(`EAN-13 ${EAN} → ${urun.code} / ${bakJ.unit?.code}`)
  ok('üretilen barkod geçerli EAN-13 (kontrol hanesi)', ean13(EAN.slice(0, 12)) === EAN, EAN)
  const eanBak = await GET(`/api/lookup/barcode?code=${EAN}`)
  ok('EAN-13 okundu → ürün çözüldü', eanBak.statusCode === 200 && eanBak.json().product?.id === urun.id, `${eanBak.json().product?.code} (mod ${eanBak.json().mode})`)
  ok('EAN ile birim de çözüldü', eanBak.json().unit?.id === birimId, eanBak.json().unit?.code)
  ok('EAN sorgusu güncel stoğu getirdi', Array.isArray(eanBak.json().stock) && eanBak.json().stock.length > 0, `${eanBak.json().stock?.length} satır`)
  await prisma.tBLPRODUCTUNITBARCODE.delete({ where: { id: eanKaydi.id } })
}

console.log('\n⑥ ÖZET')
const nihai = { kul: (await stokAl(stKul.id)).adet, blo: (await stokAl(stBlo.id)).adet - bloOnce.adet }
ok('nihai tablo: 100 giriş − 40 bloke − 30 çıkış = 30 kullanılabilir', nihai.kul - oncesi.adet === 30 && nihai.blo === 40, `kullanılabilir +${nihai.kul - oncesi.adet} · bloke +${nihai.blo}`)

// ── temizlik: E2E belgelerini ve stok izlerini geri al ──
for (const id of [...olusan].reverse()) {
  const d = await prisma.tBLDOCUMENT.findUnique({ where: { id } })
  if (d?.status === 'COMPLETED') await POST(`/api/documents/${id}/reverse`)
}
await prisma.tBLSTOCKLEDGER.deleteMany({ where: { companyId: CO, documentId: { in: olusan } } })
await prisma.tBLDOCUMENTLINESCOPE.deleteMany({ where: { documentLine: { documentId: { in: olusan } } } })
await prisma.tBLDOCUMENTLINE.deleteMany({ where: { documentId: { in: olusan } } })
await prisma.tBLDOCUMENTSTATUSHISTORY.deleteMany({ where: { documentId: { in: olusan } } })
await prisma.tBLDOCUMENT.deleteMany({ where: { id: { in: olusan } } })
await prisma.tBLSTOCK.deleteMany({ where: { companyId: CO, batchNo: `E2E-${damga}` } })
console.log('\n(E2E belgeleri geri alındı ve silindi)')

console.log(hata ? `\n╚═ ${hata} BULGU VAR` : '\n╚═ TAM TUR TEMİZ — hepsi geçti')
await app.close()
await prisma.$disconnect()
process.exit(hata ? 1 : 0)
