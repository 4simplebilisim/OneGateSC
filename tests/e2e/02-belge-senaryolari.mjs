// BELGE TEST SENARYOLARI — standart suite. Her belge testinde bu kurallar uygulanır.
// Kurallar: (1) satır bazlı TAM toplama olmadan onaya gönderilemez (kontrollü op).
//          (2) eksik toplamada BÖLmeden onaya gidilemez → böl → toplanan kısım onaylanır, kalan Bekliyor.
//          (3) KONTROLSÜZ belge BOŞ açılır, içerik el terminali okutmalarıyla dolar — okutma ŞART (okutmasız onay yok).
//              KONTROLLÜ belge içeriği belli (belge ekranı/Excel/entegrasyon) — toplama plana karşı yapılır.
//          (4) Onay İptal → Bekliyor'a döner. (5) okutma statü/lokasyon kuralı.
// Çalıştır: node tests/e2e/belge-senaryolari.mjs   (API :3000 açık olmalı)
const B = process.env.API || 'http://127.0.0.1:3000'
const CO = '2'
let pass = 0, fail = 0
const H = (ct = true) => ct ? { authorization: 'Bearer ' + TOKEN, 'x-company-id': CO, 'content-type': 'application/json' } : { authorization: 'Bearer ' + TOKEN, 'x-company-id': CO }
const req = async (m, u, body) => { const r = await fetch(B + u, { method: m, headers: body !== undefined ? H() : H(false), ...(body !== undefined ? { body: JSON.stringify(body) } : {}) }); let d; try { d = await r.json() } catch { d = null } return { status: r.status, d } }
const ok = (cond, label, extra = '') => { if (cond) { pass++; console.log('  ✓', label, extra) } else { fail++; console.log('  ✗ FAIL:', label, extra) } }
const section = (t) => console.log('\n── ' + t)
let TOKEN
const norm = (d) => Array.isArray(d) ? d : (d?.data ?? [])

TOKEN = (await (await fetch(B + '/api/auth/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ username: 'admin', password: 'admin123' }) })).json()).token
const stockAt = async (locId, statusId) => norm(await req('GET', `/api/stock?locationId=${locId}&statusId=${statusId}&pageSize=100`).then(r => r.d)).filter(s => s.productId === PROD).reduce((s, x) => s + Number(x.mainQty), 0)

// ── SETUP: temel veri + 2 operasyon (idempotent, sabit kodlu) ──
// NOT: admin=süper → GET listeleri TÜM firmaları döner (companyListFilter); ?companyId=2 ile company-2'ye sabitle.
section('SETUP')
const q2 = 'companyId=' + CO
const PROD = 1
const UNIT = (norm(await req('GET', '/api/product-units?productId=' + PROD).then(r => r.d)).find(p => p.isBaseUnit)).unitId
const stas = norm(await req('GET', `/api/statuses?pageSize=100&${q2}`).then(r => r.d))
const sta1 = stas.find(s => s.code === '1') ?? stas[0]
const STA = sta1.id, FAC = sta1.facilityId // op'un tesisi = statünün tesisi (statü-tesis uyumu)
const allLocs = norm(await req('GET', `/api/locations?pageSize=200&${q2}`).then(r => r.d))
const LOC = allLocs.find(l => l.id === 1)?.id ?? allLocs[0].id
const LOC2 = allLocs.find(l => l.id !== LOC)?.id ?? LOC // transfer hedefi (fac içi başka lokasyon)
console.log('  temel: ürün', PROD, 'birim', UNIT, 'kaynak lok', LOC, '→ hedef lok', LOC2, 'statü', STA, 'tesis', FAC)

// operasyon bul-veya-oluştur (sabit kod → tekrar çalıştırmada aynısını kullan; facilityId statüyle uyumlu)
const findOrMakeOp = async (code, name, direction, controlMode, transition) => {
  let op = norm(await req('GET', '/api/operation-types?pageSize=300').then(r => r.d)).find(o => o.code === code && o.companyId === Number(CO))
  if (!op) { op = (await req('POST', '/api/operation-types', { code, name, direction, controlMode, facilityId: FAC, affectsStock: true })).d }
  else if (op.facilityId !== FAC) { await req('PATCH', '/api/operation-types/' + op.id, { facilityId: FAC }) } // eski çalıştırmadan yanlış tesisi düzelt
  const trs = norm(await req('GET', '/api/operation-type-statuses?pageSize=300').then(r => r.d)).filter(t => t.operationTypeId === op.id)
  if (!trs.length) await req('POST', '/api/operation-type-statuses', { operationTypeId: op.id, facilityId: FAC, ...transition })
  return op
}
const opCik = await findOrMakeOp('BLG-CIK', 'Test Kontrollü Çıkış', 'OUTBOUND', 'CONTROLLED', { sourceStatusId: STA }) // src=STA → dış
const opGir = await findOrMakeOp('BLG-GIR', 'Test Kontrolsüz Giriş', 'INBOUND', 'UNCONTROLLED', { targetStatusId: STA }) // dış → tgt=STA
const opGirK = await findOrMakeOp('BLG-GIRK', 'Test Kontrollü Giriş', 'INBOUND', 'CONTROLLED', { targetStatusId: STA }) // dış → tgt=STA (okutmalı)
const opTr = await findOrMakeOp('BLG-TR', 'Test Kontrollü Transfer', 'INTERNAL', 'CONTROLLED', { sourceStatusId: STA, targetStatusId: STA }) // kaynak→hedef
console.log('  op çıkış(kontrollü):', opCik.code, opCik.id, '| giriş(kontrollü):', opGirK.code, opGirK.id, '| transfer:', opTr.code, opTr.id)
// palet tipi bul-veya-oluştur (sabit kod)
let PT = norm(await req('GET', '/api/pallet-types?pageSize=100').then(r => r.d)).find(x => x.code === 'BLG-PT' && x.companyId === Number(CO))
if (!PT) PT = (await req('POST', '/api/pallet-types', { code: 'BLG-PT', name: 'Test Palet Tipi', facilityId: FAC, mixingType: 'SINGLE_PRODUCT' })).d

let docN = 0
const mkDoc = (opId, lines) => req('POST', '/api/documents', { operationTypeId: opId, documentNo: 'BSN' + Date.now().toString().slice(-7) + '-' + (++docN), ...(lines ? { lines } : {}) })
const okut = (lineId, qty) => req('POST', '/api/document-line-scopes', { documentLineId: lineId, unitId: UNIT, quantity: qty })
const cancel = (id) => req('POST', `/api/documents/${id}/cancel`, {})
const trash = []

// ── S1: KONTROLSÜZ — legacy semantik: belge BOŞ açılır, içerik OKUTMAYLA dolar, okutma ŞART ──
section('S1 — Kontrolsüz: boş açılır → okutmasız onay ENGELLİ → okutma doldurur → onay')
const s0 = await stockAt(LOC, STA)
const d1 = (await mkDoc(opGir.id)).d; trash.push(d1.id)
ok(d1.id != null && (d1.lines?.length ?? 0) === 0, 'boş belge açıldı (satırsız)')
const c1a = await req('POST', `/api/documents/${d1.id}/confirm`, {})
ok(c1a.status === 409 && /okutma/i.test(c1a.d?.error || ''), 'okutmasız confirm ENGELLİ (okutma şart)', c1a.d?.error?.slice(0, 50))
// satır-yaratan okutma: documentId+productId → satır otomatik oluşur; satır miktarı = Σ okutma
ok((await req('POST', '/api/document-line-scopes', { documentId: d1.id, productId: PROD, unitId: UNIT, quantity: 25, targetLocationId: LOC, targetStatusId: STA })).status === 201, 'okutma 1 → satır otomatik oluştu')
ok((await req('POST', '/api/document-line-scopes', { documentId: d1.id, productId: PROD, unitId: UNIT, quantity: 15, targetLocationId: LOC, targetStatusId: STA })).status === 201, 'okutma 2 → aynı satıra birikti')
const d1b = (await req('GET', `/api/documents/${d1.id}`)).d
ok((d1b.lines?.length ?? 0) === 1 && Number(d1b.lines[0].quantity) === 40, 'tek satır, miktar=Σokutma (40)', `${d1b.lines?.length} satır, qty=${d1b.lines?.[0]?.quantity}`)
ok((await req('POST', `/api/documents/${d1.id}/confirm`, {})).status === 200, 'okutma sonrası confirm geçer')
ok((await req('POST', `/api/documents/${d1.id}/complete`, {})).status === 200, 'complete')
ok((await stockAt(LOC, STA)) === s0 + 40, 'stok +40 (okutulan kadar)', `${s0}→${await stockAt(LOC, STA)}`)
// elle satır girilmiş kontrolsüz bile okutmasız onaylanamaz (içerik ancak okutmayla gerçeklenir)
const d1c = (await mkDoc(opGir.id, [{ productId: PROD, unitId: UNIT, quantity: 5, targetLocationId: LOC, targetStatusId: STA }])).d; trash.push(d1c.id)
ok((await req('POST', `/api/documents/${d1c.id}/confirm`, {})).status === 409, 'elle satırlı kontrolsüz de okutmasız ENGELLİ')

// ── S2: KONTROLLÜ çıkış — HİÇ toplama → onaya GÖNDERİLEMEZ ──
section('S2 — Kontrollü çıkış: toplama YOK → onaya gönderilemez')
const d2 = (await mkDoc(opCik.id, [{ productId: PROD, unitId: UNIT, quantity: 5, sourceLocationId: LOC, sourceStatusId: STA }])).d; trash.push(d2.id)
const c2 = await req('POST', `/api/documents/${d2.id}/confirm`, {})
ok(c2.status === 409 && /toplama eksik/i.test(c2.d?.error || ''), 'confirm ENGELLENDİ (toplama eksik)', c2.d?.error?.slice(0, 55))

// ── S3: KONTROLLÜ çıkış — TAM toplama → onaya gönder + onayla ──
section('S3 — Kontrollü çıkış: TAM toplama → onay geçer')
const sB = await stockAt(LOC, STA)
const d3 = (await mkDoc(opCik.id, [{ productId: PROD, unitId: UNIT, quantity: 5, sourceLocationId: LOC, sourceStatusId: STA }])).d; trash.push(d3.id)
const l3 = d3.lines[0].id
ok((await okut(l3, 5)).status === 201, 'okutma 5 (tam)')
ok((await req('POST', `/api/documents/${d3.id}/confirm`, {})).status === 200, 'confirm geçti (tam toplandı)')
ok((await req('POST', `/api/documents/${d3.id}/complete`, {})).status === 200, 'complete geçti')
ok((await stockAt(LOC, STA)) === sB - 5, 'stok −5', `${sB}→${await stockAt(LOC, STA)}`)

// ── S4: KONTROLLÜ çıkış — KISMİ toplama → onaya gönderilemez → BÖL → toplanan onaylanır, kalan Bekliyor ──
section('S4 — Kontrollü çıkış: KISMİ toplama → BÖL → toplanan onaylanır')
const sB4 = await stockAt(LOC, STA)
const d4 = (await mkDoc(opCik.id, [{ productId: PROD, unitId: UNIT, quantity: 10, sourceLocationId: LOC, sourceStatusId: STA }])).d; trash.push(d4.id)
const l4 = d4.lines[0].id
ok((await okut(l4, 6)).status === 201, 'okutma 6 (kısmi, 6/10)')
const c4 = await req('POST', `/api/documents/${d4.id}/confirm`, {})
ok(c4.status === 409, 'kısmi confirm ENGELLENDİ', c4.d?.error?.slice(0, 40))
const sp = await req('POST', `/api/documents/${d4.id}/split`, {})
ok(sp.status === 201 && sp.d?.newDocumentId, 'BÖL → yeni belge', 'yeni #' + sp.d?.newDocumentId + ' (' + sp.d?.newDocumentNo + ')')
if (sp.d?.newDocumentId) {
  trash.push(sp.d.newDocumentId)
  const nd = (await req('GET', `/api/documents/${sp.d.newDocumentId}`)).d
  ok(Number(nd.lines[0].quantity) === 6 && Number(nd.lines[0].collectedQty) === 6, 'yeni belge: miktar 6, toplanan 6 (tam)')
  ok((await req('POST', `/api/documents/${sp.d.newDocumentId}/confirm`, {})).status === 200, 'yeni belge confirm geçti (tam toplandı)')
  ok((await req('POST', `/api/documents/${sp.d.newDocumentId}/complete`, {})).status === 200, 'yeni belge complete')
  ok((await stockAt(LOC, STA)) === sB4 - 6, 'stok −6 (yalnız toplanan)', `${sB4}→${await stockAt(LOC, STA)}`)
  const od = (await req('GET', `/api/documents/${d4.id}`)).d
  ok(Number(od.lines[0].quantity) === 4 && od.documentStatus?.name === 'Bekliyor', 'orijinal: kalan 4, Bekliyor')
  ok((await req('POST', `/api/documents/${d4.id}/confirm`, {})).status === 409, 'orijinal (kalan) confirm hâlâ engelli')
}

// ── S5: ONAY İPTAL (reverse) → Bekliyor'a döner + stok geri ──
section('S5 — Onay İptal: DRAFT/Bekliyor’a döner, stok geri')
const sB5 = await stockAt(LOC, STA)
const rv = await req('POST', `/api/documents/${d3.id}/reverse`, {}) // d3 tamamlanmıştı (−5)
const od3 = (await req('GET', `/api/documents/${d3.id}`)).d
ok(rv.status === 200 && od3.status === 'DRAFT' && od3.documentStatus?.name !== 'İptal', 'reverse → DRAFT (İptal değil)', od3.documentStatus?.name)
ok((await stockAt(LOC, STA)) === sB5 + 5, 'stok +5 geri', `${sB5}→${await stockAt(LOC, STA)}`)

// ── S6: OKUTMA statü kuralı — yanlış statüden okutma reddedilir ──
section('S6 — Okutma statü kuralı: uyumsuz statü reddedilir')
const wrongSta = norm(await req('GET', '/api/statuses?pageSize=50').then(r => r.d)).find(s => s.id !== STA && s.facilityId === FAC)?.id
const d6 = (await mkDoc(opCik.id, [{ productId: PROD, unitId: UNIT, quantity: 2, sourceLocationId: LOC, sourceStatusId: STA }])).d; trash.push(d6.id)
if (wrongSta) { const r6 = await okut(d6.lines[0].id, 1); // scope sourceStatusId'yi yanlış statüyle ez
  const r6b = await req('POST', '/api/document-line-scopes', { documentLineId: d6.lines[0].id, unitId: UNIT, quantity: 1, sourceStatusId: wrongSta, sourceLocationId: LOC })
  ok(r6b.status === 400 && /uyumsuz/i.test(r6b.d?.error || ''), 'yanlış statü okutma reddedildi', r6b.d?.error?.slice(0, 45))
} else { console.log('  (2. statü yok — S6 atlandı)') }

// ── S7: BÖL sınır — hiç toplama yok → böl reddedilir ──
section('S7 — Böl sınır: toplanmamış belge bölünemez')
const d7 = (await mkDoc(opCik.id, [{ productId: PROD, unitId: UNIT, quantity: 3, sourceLocationId: LOC, sourceStatusId: STA }])).d; trash.push(d7.id)
const sp7 = await req('POST', `/api/documents/${d7.id}/split`, {})
ok(sp7.status === 409, 'toplanmamış belge böl reddedildi', sp7.d?.error?.slice(0, 40))

// ── S8: KONTROLLÜ giriş (mal kabul) — okutmasız engelli → okutma → onay → stok girişi ──
section('S8 — Kontrollü giriş (mal kabul): okutma → onay → stok girişi')
const sB8 = await stockAt(LOC, STA)
const d8 = (await mkDoc(opGirK.id, [{ productId: PROD, unitId: UNIT, quantity: 8, targetLocationId: LOC, targetStatusId: STA }])).d; trash.push(d8.id)
ok((await req('POST', `/api/documents/${d8.id}/confirm`, {})).status === 409, 'kontrollü giriş okutmasız confirm engelli')
ok((await okut(d8.lines[0].id, 8)).status === 201, 'okutma 8 (tam)')
ok((await req('POST', `/api/documents/${d8.id}/confirm`, {})).status === 200, 'confirm geçti')
ok((await req('POST', `/api/documents/${d8.id}/complete`, {})).status === 200, 'complete geçti')
ok((await stockAt(LOC, STA)) === sB8 + 8, 'stok +8 (giriş)', `${sB8}→${await stockAt(LOC, STA)}`)

// ── S9: ÇOK SATIRLI — satır1 tam + satır2 kısmi → confirm engelli → BÖL (satır ayrımı) ──
section('S9 — Çok satırlı: satır1 tam + satır2 kısmi → BÖL')
const d9 = (await mkDoc(opCik.id, [
  { productId: PROD, unitId: UNIT, quantity: 5, sourceLocationId: LOC, sourceStatusId: STA },
  { productId: PROD, unitId: UNIT, quantity: 6, sourceLocationId: LOC, sourceStatusId: STA },
])).d; trash.push(d9.id)
ok(d9.lines?.length === 2, '2 satırlı belge')
await okut(d9.lines[0].id, 5) // satır1 tam
await okut(d9.lines[1].id, 3) // satır2 kısmi (3/6)
ok((await req('POST', `/api/documents/${d9.id}/confirm`, {})).status === 409, 'confirm engelli (satır2 eksik)')
const sp9 = await req('POST', `/api/documents/${d9.id}/split`, {})
ok(sp9.status === 201, 'BÖL')
if (sp9.d?.newDocumentId) {
  trash.push(sp9.d.newDocumentId)
  const nd9 = (await req('GET', `/api/documents/${sp9.d.newDocumentId}`)).d
  const nq = nd9.lines.map(l => Number(l.quantity)).sort((a, b) => a - b)
  ok(nd9.lines.length === 2 && nq[0] === 3 && nq[1] === 5, 'yeni belge: 2 satır (5 tam + 3 toplanan)')
  const od9 = (await req('GET', `/api/documents/${d9.id}`)).d
  ok(od9.lines.length === 1 && Number(od9.lines[0].quantity) === 3 && od9.documentStatus?.name === 'Bekliyor', 'orijinal: 1 satır kalan 3, Bekliyor')
  ok((await req('POST', `/api/documents/${sp9.d.newDocumentId}/confirm`, {})).status === 200, 'yeni belge confirm geçti')
}

// ── S10: İPTAL — DRAFT iptal edilir; COMPLETED iptal edilemez ──
section('S10 — İptal: DRAFT iptal / COMPLETED iptal edilemez')
const d10 = (await mkDoc(opGir.id, [{ productId: PROD, unitId: UNIT, quantity: 3, targetLocationId: LOC, targetStatusId: STA }])).d; trash.push(d10.id)
ok((await cancel(d10.id)).status === 200, 'DRAFT iptal edildi')
ok(((await req('GET', `/api/documents/${d10.id}`)).d).documentStatus?.name === 'İptal', 'durum İptal')
const cc = await cancel(d8.id) // d8 COMPLETED
ok(cc.status === 409, 'COMPLETED iptal reddedildi', cc.d?.error?.slice(0, 40))

// ── S11: TAM DÖNGÜ — onayla → Onay İptal → okutmalar korunur → yeniden onayla ──
section('S11 — Tam döngü: onayla → Onay İptal → yeniden onayla (okutma korunur)')
const sB11 = await stockAt(LOC, STA)
const d11 = (await mkDoc(opCik.id, [{ productId: PROD, unitId: UNIT, quantity: 4, sourceLocationId: LOC, sourceStatusId: STA }])).d; trash.push(d11.id)
await okut(d11.lines[0].id, 4)
await req('POST', `/api/documents/${d11.id}/confirm`, {})
await req('POST', `/api/documents/${d11.id}/complete`, {})
ok((await stockAt(LOC, STA)) === sB11 - 4, 'onaylandı, stok −4')
await req('POST', `/api/documents/${d11.id}/reverse`, {})
ok((await stockAt(LOC, STA)) === sB11, 'Onay İptal → stok geri')
ok((await req('POST', `/api/documents/${d11.id}/confirm`, {})).status === 200, 'yeniden confirm (okutma korundu)')
ok((await req('POST', `/api/documents/${d11.id}/complete`, {})).status === 200, 'yeniden complete')
ok((await stockAt(LOC, STA)) === sB11 - 4, 'yeniden onaylandı, stok −4')

// ── S12: PALET + TRANSFER — palet üret → palletli stok giriş → transfer (palet+stok yeni lokasyona) ──
section('S12 — Palet + Transfer: palet üret → palletli stok giriş → transfer')
const stAt = async (loc, pallet) => norm(await req('GET', `/api/stock?locationId=${loc}&statusId=${STA}&pageSize=100`).then(r => r.d)).filter(s => s.productId === PROD && (pallet ? s.palletId === pallet : true)).reduce((a, x) => a + Number(x.mainQty), 0)
const pal = await req('POST', '/api/pallets', { palletTypeId: PT.id, palletNo: 'BLGP' + Date.now().toString().slice(-6) })
ok(pal.status === 201 && pal.d?.palletTypeId === PT.id, 'palet üretildi (BLG-PT tipiyle)', pal.d?.palletNo)
const PID = pal.d?.id
const dgi = (await mkDoc(opGirK.id, [{ productId: PROD, unitId: UNIT, quantity: 10, targetLocationId: LOC, targetStatusId: STA }])).d; trash.push(dgi.id)
ok((await req('POST', '/api/document-line-scopes', { documentLineId: dgi.lines[0].id, unitId: UNIT, quantity: 10, palletId: PID, targetLocationId: LOC, targetStatusId: STA })).status === 201, 'palletli okutma 10')
await req('POST', `/api/documents/${dgi.id}/confirm`, {}); await req('POST', `/api/documents/${dgi.id}/complete`, {})
ok((await stAt(LOC, PID)) === 10, 'stok girdi — lok ' + LOC + ', palet ' + PID + ' üzerinde 10')
const srcB = await stAt(LOC, PID), tgtB = await stAt(LOC2, PID)
const dtr = (await mkDoc(opTr.id, [{ productId: PROD, unitId: UNIT, quantity: 10, sourceLocationId: LOC, sourceStatusId: STA, targetLocationId: LOC2, targetStatusId: STA }])).d; trash.push(dtr.id)
ok((await req('POST', '/api/document-line-scopes', { documentLineId: dtr.lines[0].id, unitId: UNIT, quantity: 10, palletId: PID })).status === 201, 'transfer okutma (palet)')
await req('POST', `/api/documents/${dtr.id}/confirm`, {})
ok((await req('POST', `/api/documents/${dtr.id}/complete`, {})).status === 200, 'transfer complete')
ok((await stAt(LOC, PID)) === srcB - 10, 'kaynak lok −10', `${srcB}→${await stAt(LOC, PID)}`)
ok((await stAt(LOC2, PID)) === tgtB + 10, 'hedef lok +10 (palet taşındı)', `${tgtB}→${await stAt(LOC2, PID)}`)

// ── TEMİZLİK: test belgelerini iptal et (op'lar sabit kod, kalır) ──
section('TEMİZLİK')
for (const id of trash) { await cancel(id) }
console.log('  ' + trash.length + ' test belgesi iptal edildi (op BLG-CIK/BLG-GIR sabit — kalır)')

console.log(`\n════════ BELGE SENARYOLARI: ${pass} geçti / ${fail} kaldı ════════`)
process.exit(fail ? 1 : 0)
