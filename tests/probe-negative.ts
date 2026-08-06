import { buildApp } from '../src/app.js'
import { prisma } from '../src/lib/prisma.js'

/**
 * HATA SENARYOLARI PROBU — "yanlış" işlemler gerçekten engelleniyor mu?
 *
 * Bu dosya bir test DEĞİL, bir ÖLÇÜMdür: her senaryoda beklenen davranışı
 * yazar, gerçekleşeni ölçer ve KORUNUYOR / SESSİZ GEÇTİ diye raporlar.
 * Amaç sahada veri bozacak açıkları görünür kılmak.
 */
const CO = Number(process.env.DEMO_COMPANY_ID ?? 2)
const rapor: Array<{ no: string; senaryo: string; beklenen: string; sonuc: 'KORUNUYOR' | 'SESSİZ GEÇTİ' | 'BİLGİ'; detay: string }> = []
const yaz = (no: string, senaryo: string, beklenen: string, korundu: boolean, detay: string, bilgi = false) => {
  rapor.push({ no, senaryo, beklenen, sonuc: bilgi ? 'BİLGİ' : korundu ? 'KORUNUYOR' : 'SESSİZ GEÇTİ', detay })
  console.log(`  ${bilgi ? '·' : korundu ? '✓' : '✗'} ${no} ${senaryo} → ${detay}`)
}

const app = await buildApp({ logger: false })
await app.ready()
const login = await app.inject({ method: 'POST', url: '/api/auth/login', payload: { username: process.env.DEMO_USER ?? 'admin', password: process.env.DEMO_PASSWORD ?? 'admin123' } })
if (login.statusCode !== 200) throw new Error('login: ' + login.body)
const auth = { authorization: `Bearer ${login.json().token as string}`, 'x-company-id': String(CO) }
const POST = (u: string, p?: unknown) => app.inject({ method: 'POST', url: u, headers: auth, payload: p ?? {} })

const damga = Date.now().toString(36).toUpperCase().slice(-6)
const belgeler: number[] = []
const paletIds: number[] = []

const tip = await prisma.tBLPALLETTYPE.findFirstOrThrow({ where: { companyId: CO, isActive: true } })
const lok = await prisma.tBLLOCATION.findFirstOrThrow({ where: { companyId: CO } })
const urunler = await prisma.tBLPRODUCT.findMany({ where: { companyId: CO, unitId: { not: null } }, take: 2 })
const urun = urunler[0]!, urun2 = urunler[1] ?? urunler[0]!
const birim = await prisma.tBLUNIT.findFirstOrThrow({ where: { id: urun.unitId! } })

const opGirler = await prisma.tBLOPERATIONTYPE.findMany({
  where: { companyId: CO, direction: 'INBOUND', statusLinks: { some: { targetStatusId: { not: null } } } },
  include: { statusLinks: true }, orderBy: { id: 'asc' },
})
const opGir = opGirler.find((o) => o.controlMode === 'CONTROLLED') ?? opGirler[0]!
const hedefStatu = opGir.statusLinks.find((s) => s.targetStatusId)!.targetStatusId!
const opCik = await prisma.tBLOPERATIONTYPE.findFirst({
  where: { companyId: CO, direction: 'OUTBOUND', controlMode: 'CONTROLLED', statusLinks: { some: { sourceStatusId: { not: null } } } },
  include: { statusLinks: true }, orderBy: { id: 'asc' },
})
const kaynakStatu = opCik?.statusLinks.find((s) => s.sourceStatusId)?.sourceStatusId ?? hedefStatu

/** Kontrollü giriş belgesi aç + okut + tamamla. Döner: hata metni ya da null. */
const girisYap = async (o: { palletId?: number; palletNo?: string; productId?: number; unitId?: number; qty?: number; batchNo?: string }) => {
  const satir = {
    productId: o.productId ?? urun.id, unitId: o.unitId ?? birim.id, quantity: o.qty ?? 10,
    targetLocationId: lok.id, targetStatusId: hedefStatu, batchNo: o.batchNo ?? `PRB-${damga}`,
    ...(o.palletId ? { palletId: o.palletId } : {}),
  }
  const b = await POST('/api/documents', { documentNo: `PRB-${damga}-${Math.floor(Math.random() * 1e5)}`, operationTypeId: opGir.id, lines: [satir] })
  if (b.statusCode !== 201) return `belge: ${b.json()?.error ?? b.body.slice(0, 90)}`
  belgeler.push(b.json().id)
  const sc = await POST('/api/document-line-scopes', {
    documentLineId: b.json().lines[0].id, unitId: satir.unitId, quantity: satir.quantity,
    targetLocationId: lok.id, targetStatusId: hedefStatu, batchNo: satir.batchNo,
    ...(o.palletId ? { palletId: o.palletId } : {}), ...(o.palletNo ? { palletNo: o.palletNo } : {}),
  })
  if (sc.statusCode !== 201) return `okutma: ${sc.json()?.error ?? sc.body.slice(0, 90)}`
  const c = await POST(`/api/documents/${b.json().id}/confirm`)
  if (c.statusCode !== 200) return `onay: ${c.json()?.error ?? c.body.slice(0, 90)}`
  const t = await POST(`/api/documents/${b.json().id}/complete`)
  if (t.statusCode !== 200) return `tamamla: ${t.json()?.error ?? t.body.slice(0, 90)}`
  return null
}

console.log(`\n╔═ HATA SENARYOLARI PROBU · firma ${CO} · giriş ${opGir.code} · çıkış ${opCik?.code ?? '-'}\n`)

// ────────── A · PALET ──────────
console.log('A · PALET')
const palet = await prisma.tBLPALLET.create({ data: { companyId: CO, palletNo: `PRB${damga}`, palletTypeId: tip.id, baseUnitId: birim.id, isActive: true } })
paletIds.push(palet.id)

// A1: palet ilk kez kullanılıyor
yaz('A1', 'boş palete giriş', 'başarılı olmalı', (await girisYap({ palletId: palet.id })) === null, (await girisYap({ palletId: palet.id, qty: 0.0001 })) ?? 'geçti', true)

// A2: DOLU palete tekrar giriş — sameUsePallet KAPALI
await prisma.tBLOPERATIONTYPE.update({ where: { id: opGir.id }, data: { sameUsePallet: false } })
const a2 = await girisYap({ palletId: palet.id, qty: 5 })
yaz('A2', 'dolu palete giriş · "aynı palet kullanılsın" KAPALI', 'REDDEDİLMELİ', !!a2, a2 ?? 'GEÇTİ — engellenmedi')

// A3: DOLU palete tekrar giriş — sameUsePallet AÇIK
await prisma.tBLOPERATIONTYPE.update({ where: { id: opGir.id }, data: { sameUsePallet: true } })
const a3 = await girisYap({ palletId: palet.id, qty: 5 })
yaz('A3', 'dolu palete giriş · "aynı palet kullanılsın" AÇIK', 'KABUL EDİLMELİ', a3 === null, a3 ?? 'kabul edildi (doğru)', true)

// A4: karma palet — palet tipi TEK ÜRÜN iken palete İKİNCİ ürün
await prisma.tBLPALLETTYPE.update({ where: { id: tip.id }, data: { mixingType: 'SINGLE_PRODUCT', singleProductControl: true } })
const a4 = await girisYap({ palletId: palet.id, productId: urun2.id, qty: 3 })
yaz('A4', 'TEK ÜRÜN paletine ikinci ürün', 'REDDEDİLMELİ', !!a4, a4 ?? 'GEÇTİ — karma palet oluştu')

// A5: parti kontrolü açıkken palete FARKLI parti
await prisma.tBLPALLETTYPE.update({ where: { id: tip.id }, data: { batchControl: true } })
const a5 = await girisYap({ palletId: palet.id, qty: 3, batchNo: `BASKA-${damga}` })
yaz('A5', 'parti kontrollü palete FARKLI parti', 'REDDEDİLMELİ', !!a5, a5 ?? 'GEÇTİ — palette iki parti karıştı')

// ────────── B · ÇIKIŞ / PARÇALI ──────────
console.log('\nB · ÇIKIŞ · PARÇALI KULLANIM')
const paletStok = await prisma.tBLSTOCK.aggregate({ where: { companyId: CO, palletId: palet.id, mainQty: { gt: 0 } }, _sum: { mainQty: true } })
const eldeki = Number(paletStok._sum.mainQty ?? 0)
console.log(`    (palette ${eldeki} birim var)`)

const cikisDene = async (qty: number, palletId?: number) => {
  if (!opCik) return 'çıkış operasyonu yok'
  const b = await POST('/api/documents', {
    documentNo: `PRBC-${damga}-${Math.floor(Math.random() * 1e5)}`, operationTypeId: opCik.id,
    lines: [{ productId: urun.id, unitId: birim.id, quantity: qty, sourceLocationId: lok.id, sourceStatusId: kaynakStatu, batchNo: `PRB-${damga}`, ...(palletId ? { palletId } : {}) }],
  })
  if (b.statusCode !== 201) return `belge: ${b.json()?.error ?? b.body.slice(0, 80)}`
  belgeler.push(b.json().id)
  const sc = await POST('/api/document-line-scopes', {
    documentLineId: b.json().lines[0].id, unitId: birim.id, quantity: qty,
    sourceLocationId: lok.id, sourceStatusId: kaynakStatu, batchNo: `PRB-${damga}`, ...(palletId ? { palletId } : {}),
  })
  if (sc.statusCode !== 201) return `okutma: ${sc.json()?.error ?? sc.body.slice(0, 80)}`
  const c = await POST(`/api/documents/${b.json().id}/confirm`)
  if (c.statusCode !== 200) return `onay: ${c.json()?.error ?? c.body.slice(0, 80)}`
  const t = await POST(`/api/documents/${b.json().id}/complete`)
  if (t.statusCode !== 200) return `tamamla: ${t.json()?.error ?? t.body.slice(0, 80)}`
  return null
}

// B1: paletten KISMİ çıkış — parçalı kullanım KAPALI, bölünemez
await prisma.tBLPALLETTYPE.update({ where: { id: tip.id }, data: { partialUse: false, isDivisible: false } })
const b1 = await cikisDene(1, palet.id)
yaz('B1', 'BÖLÜNEMEZ + parçalı kullanım KAPALI palettten kısmi çıkış', 'REDDEDİLMELİ', !!b1, b1 ?? 'GEÇTİ — palet bölündü')

// B2: parçalı kullanım AÇIK → kısmi çıkış çalışmalı
await prisma.tBLPALLETTYPE.update({ where: { id: tip.id }, data: { partialUse: true, isDivisible: true } })
const b2 = await cikisDene(1, palet.id)
yaz('B2', 'parçalı kullanım AÇIK palettten kısmi çıkış', 'KABUL EDİLMELİ', b2 === null, b2 ?? 'kabul edildi (doğru)', true)

// B3: stoktan FAZLA çıkış
const b3 = await cikisDene(eldeki + 500, palet.id)
yaz('B3', 'stoktan FAZLA çıkış', 'REDDEDİLMELİ', !!b3, b3 ?? 'GEÇTİ — eksi stok oluştu!')

// B4: paletsiz çıkışta olmayan partiden çekme
const b4 = await cikisDene(1)
yaz('B4', 'palet belirtmeden çıkış (paletli stoktan)', 'bilgi', b4 === null, b4 ?? 'kabul edildi', true)

// ────────── C · BİRİM ──────────
console.log('\nC · BİRİM')
const baskaBirim = await prisma.tBLUNIT.findFirst({ where: { companyId: CO, id: { not: birim.id } } })
const tanimli = baskaBirim ? await prisma.tBLPRODUCTUNIT.findFirst({ where: { productId: urun.id, unitId: baskaBirim.id } }) : null
if (!baskaBirim) console.log('    (ikinci birim yok — atlandı)')
else {
  if (tanimli) await prisma.tBLPRODUCTUNIT.delete({ where: { id: tanimli.id } })
  const c1 = await girisYap({ unitId: baskaBirim.id, qty: 7, batchNo: `BRM-${damga}` })
  yaz('C1', `ürüne TANIMSIZ birimle giriş (${urun.code} ana birim ${birim.code}, okutulan ${baskaBirim.code})`, 'REDDEDİLMELİ', !!c1, c1 ?? 'GEÇTİ — tanımsız birimle stok oluştu')
}
const yabanci = await prisma.tBLUNIT.findFirst({ where: { companyId: { not: CO } } })
if (yabanci) {
  const c2 = await girisYap({ unitId: yabanci.id, qty: 2, batchNo: `YBN-${damga}` })
  yaz('C2', 'BAŞKA FİRMANIN birimiyle giriş', 'REDDEDİLMELİ', !!c2, c2 ?? 'GEÇTİ — çapraz firma birim kabul edildi')
}

// ────────── D · MİKTAR ──────────
console.log('\nD · MİKTAR')
const d1 = await POST('/api/document-line-scopes', { documentId: 1, productId: urun.id, unitId: birim.id, quantity: -5 })
yaz('D1', 'NEGATİF miktarla okutma', 'REDDEDİLMELİ', d1.statusCode === 400, `${d1.statusCode} ${JSON.stringify(d1.json()?.error ?? d1.json()?.details?.fieldErrors?.quantity ?? '')}`.slice(0, 90))
const d2 = await POST('/api/document-line-scopes', { documentId: 1, productId: urun.id, unitId: birim.id, quantity: 0 })
yaz('D2', 'SIFIR miktarla okutma', 'REDDEDİLMELİ', d2.statusCode === 400, `${d2.statusCode}`)

// ── temizlik ──
for (const id of [...belgeler].reverse()) {
  const d = await prisma.tBLDOCUMENT.findUnique({ where: { id } })
  if (d?.status === 'COMPLETED') await POST(`/api/documents/${id}/reverse`)
}
await prisma.tBLSTOCKLEDGER.deleteMany({ where: { documentId: { in: belgeler } } })
await prisma.tBLDOCUMENTLINESCOPE.deleteMany({ where: { documentLine: { documentId: { in: belgeler } } } })
await prisma.tBLDOCUMENTLINE.deleteMany({ where: { documentId: { in: belgeler } } })
await prisma.tBLDOCUMENTSTATUSHISTORY.deleteMany({ where: { documentId: { in: belgeler } } })
await prisma.tBLDOCUMENT.deleteMany({ where: { id: { in: belgeler } } })
await prisma.tBLSTOCK.deleteMany({ where: { companyId: CO, palletId: { in: paletIds } } })
await prisma.tBLSTOCK.deleteMany({ where: { companyId: CO, batchNo: { startsWith: 'PRB-' } } })
await prisma.tBLSTOCK.deleteMany({ where: { companyId: CO, batchNo: { in: [`BRM-${damga}`, `YBN-${damga}`, `BASKA-${damga}`] } } })
await prisma.tBLPALLET.deleteMany({ where: { id: { in: paletIds } } })
await prisma.tBLPALLETTYPE.update({ where: { id: tip.id }, data: { mixingType: null, singleProductControl: false, batchControl: false, partialUse: false, isDivisible: true } })
await prisma.tBLOPERATIONTYPE.update({ where: { id: opGir.id }, data: { sameUsePallet: false } })

console.log('\n╔═══ ÖZET ═══')
const acik = rapor.filter((r) => r.sonuc === 'SESSİZ GEÇTİ')
console.log(`  korunuyor: ${rapor.filter((r) => r.sonuc === 'KORUNUYOR').length} · SESSİZ GEÇEN: ${acik.length}`)
for (const a of acik) console.log(`  ✗ ${a.no} ${a.senaryo}\n      beklenen: ${a.beklenen} · gerçekleşen: ${a.detay}`)
console.log('╚═══ (prob verisi silindi)')
await app.close()
await prisma.$disconnect()
