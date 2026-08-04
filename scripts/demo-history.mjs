// DEMO HAREKET GEÇMİŞİ — mal kabul / sevkiyat / transfer belgelerini GERÇEK MOTORDAN geçirir.
// Doğrudan tabloya yazmaz: belge aç → okut → onayla → tamamla. Böylece stok ve hareket
// defteri kendiliğinden tutarlı olur (bkz. scripts/check-ledger.mjs).
//
//   node scripts/demo-history.mjs <gun> [--api https://...] [--uygula]
//
// Tarihler: motor "şimdi" damgası atar; sonunda belge tarihi ve defter damgası
// son <gun> güne YAYILIR (yalnız zaman damgası kayar, miktar/ilişki değişmez) —
// böylece hareket raporları ve grafikler gerçek bir zaman serisi gösterir.
import { execSync } from 'node:child_process'
import { writeFileSync, unlinkSync } from 'node:fs'

const GUN = Number(process.argv[2] ?? 90)
const API = (process.argv.find((a) => a.startsWith('--api=')) ?? '--api=https://onegate.4simple.com.tr').slice(6)
const uygula = process.argv.includes('--uygula')
const KULLANICI = process.env.DEMO_USER ?? 'e2e_admin'
const SIFRE = process.env.DEMO_PASS ?? 'Test.1234'

let TOKEN
const req = async (m, p, b) => {
  const gs = m === 'GET'
  const r = await fetch(API + p, {
    method: m,
    headers: { ...(gs ? {} : { 'content-type': 'application/json' }), ...(TOKEN ? { authorization: `Bearer ${TOKEN}` } : {}) },
    body: gs ? undefined : JSON.stringify(b ?? {}),
  })
  const t = await r.text(); let j; try { j = JSON.parse(t) } catch { j = t }
  return { status: r.status, body: j }
}
const dizi = (x) => (Array.isArray(x) ? x : (x?.data ?? []))
const rnd = (n) => Math.floor(Math.random() * n)
const sec = (a) => a[rnd(a.length)]

TOKEN = (await req('POST', '/api/auth/login', { username: KULLANICI, password: SIFRE })).body.token
if (!TOKEN) { console.error('Giriş başarısız'); process.exit(1) }

// ── Ortamı tanı ──────────────────────────────────────────────────────────
const ops = dizi((await req('GET', '/api/operation-types?pageSize=100')).body)
const OP = Object.fromEntries(ops.map((o) => [o.code, o]))
const urunler = dizi((await req('GET', '/api/products?pageSize=500')).body).filter((p) => p.unitId)
const cariler = dizi((await req('GET', '/api/partners?pageSize=200')).body)
const loklar = dizi((await req('GET', '/api/locations?pageSize=500')).body)
const statuler = dizi((await req('GET', '/api/statuses?pageSize=50')).body)
const paletler = dizi((await req('GET', '/api/pallets?pageSize=100')).body)

const stSaglam = statuler.find((s) => s.code === 'SAGLAM') ?? statuler[0]
const rafA = loklar.filter((l) => /^A[12]-/.test(l.code))
const rafS = loklar.filter((l) => /^S[123]-/.test(l.code))

console.log(`Ortam: ${urunler.length} ürün · ${cariler.length} cari · ${rafA.length} ana raf · ${rafS.length} sevkiyat rafı · ${paletler.length} palet`)
console.log(`Operasyonlar: ${Object.keys(OP).join(', ')}`)
if (!OP.MK001 || !stSaglam || !rafA.length) { console.error('Eksik yapılandırma — önce demo-setup.mjs çalıştırın'); process.exit(1) }

if (!uygula) { console.log('\nÖN İZLEME — --uygula ile çalıştırın.'); process.exit(0) }

/** belge aç → her satırı TAM okut → onayla → tamamla */
const akis = async (op, satirlar, ek = {}) => {
  const d = await req('POST', '/api/documents', { operationTypeId: op.id, lines: satirlar, ...ek })
  if (d.status >= 400) return { hata: `oluştur ${d.status} ${JSON.stringify(d.body).slice(0, 120)}` }
  const det = await req('GET', `/api/documents/${d.body.id}`)
  for (const [i, ln] of (det.body.lines ?? []).entries()) {
    const s = satirlar[i]
    const sc = await req('POST', '/api/document-line-scopes', {
      documentLineId: ln.id, quantity: Number(ln.quantity), unitId: s.unitId,
      sourceLocationId: s.sourceLocationId ?? null, sourceStatusId: s.sourceStatusId ?? null,
      targetLocationId: s.targetLocationId ?? null, targetStatusId: s.targetStatusId ?? null,
      palletId: s.palletId ?? null, batchNo: s.batchNo ?? null,
    })
    if (sc.status >= 400) return { id: d.body.id, hata: `okutma ${sc.status} ${JSON.stringify(sc.body).slice(0, 120)}` }
  }
  const c = await req('POST', `/api/documents/${d.body.id}/confirm`)
  if (c.status >= 400) return { id: d.body.id, hata: `onay ${c.status} ${JSON.stringify(c.body).slice(0, 120)}` }
  const t = await req('POST', `/api/documents/${d.body.id}/complete`)
  if (t.status >= 400) return { id: d.body.id, hata: `complete ${t.status} ${JSON.stringify(t.body).slice(0, 120)}` }
  return { id: d.body.id, no: d.body.documentNo }
}

const olusan = []
const hatalar = []
const partiNo = () => `L${2600 + rnd(60)}`

// ── 1. MAL KABUL (her hafta 3-4 tır) ─────────────────────────────────────
const kabulSayisi = Math.max(12, Math.round(GUN / 3))
console.log(`\n1. Mal kabul — ${kabulSayisi} belge`)
for (let i = 0; i < kabulSayisi; i++) {
  const satirlar = []
  const kalem = 2 + rnd(4)
  for (let k = 0; k < kalem; k++) {
    const u = sec(urunler)
    satirlar.push({
      lineNo: k + 1, productId: u.id, unitId: u.unitId, quantity: 20 + rnd(180),
      targetLocationId: sec(rafA).id, targetStatusId: stSaglam.id,
      palletId: paletler.length && Math.random() < 0.5 ? sec(paletler).id : null,
      batchNo: Math.random() < 0.6 ? partiNo() : null,
    })
  }
  const r = await akis(OP.MK001, satirlar, cariler.length ? { partnerId: sec(cariler).id } : {})
  if (r.hata) { hatalar.push(`kabul#${i}: ${r.hata}`); if (hatalar.length === 1) console.log(`   ilk hata: ${r.hata}`) }
  else olusan.push({ id: r.id, tip: 'kabul' })
  if ((i + 1) % 10 === 0) process.stdout.write(`   ${i + 1}/${kabulSayisi}\r`)
}
console.log(`   ${olusan.filter((o) => o.tip === 'kabul').length} mal kabul tamamlandı`)

// ── 2. SEVKİYAT (eldeki stoktan) ─────────────────────────────────────────
const sevkSayisi = Math.max(8, Math.round(GUN / 5))
console.log(`\n2. Sevkiyat — ${sevkSayisi} belge`)
for (let i = 0; i < sevkSayisi; i++) {
  const stok = dizi((await req('GET', '/api/stock?pageSize=200')).body).filter((s) => Number(s.mainQty) > 5)
  if (!stok.length) { console.log('   stok yok, atlandı'); break }
  const satirlar = []
  const kullanilan = new Set()
  for (let k = 0; k < 1 + rnd(3); k++) {
    const s = sec(stok)
    if (kullanilan.has(s.id)) continue
    kullanilan.add(s.id)
    const q = Math.max(1, Math.min(Math.floor(Number(s.mainQty) / 2), 1 + rnd(30)))
    satirlar.push({
      lineNo: k + 1, productId: s.productId, unitId: s.unitId, quantity: q,
      sourceLocationId: s.locationId, sourceStatusId: s.statusId,
      batchNo: s.batchNo ?? null, palletId: s.palletId ?? null,
    })
  }
  const r = await akis(OP.ZC001, satirlar, cariler.length ? { partnerId: sec(cariler).id } : {})
  if (r.hata) hatalar.push(`sevk#${i}: ${r.hata}`)
  else olusan.push({ id: r.id, tip: 'sevk' })
}
console.log(`   ${olusan.filter((o) => o.tip === 'sevk').length} sevkiyat tamamlandı`)

// ── 3. TRANSFER (ana depo → sevkiyat deposu) ─────────────────────────────
if (OP.ZT001 && rafS.length) {
  const trSayisi = Math.max(6, Math.round(GUN / 8))
  console.log(`\n3. Depolar arası transfer — ${trSayisi} belge`)
  for (let i = 0; i < trSayisi; i++) {
    const stok = dizi((await req('GET', '/api/stock?pageSize=200')).body).filter((s) => Number(s.mainQty) > 10)
    if (!stok.length) break
    const s = sec(stok)
    const q = Math.max(1, Math.floor(Number(s.mainQty) / 3))
    const r = await akis(OP.ZT001, [{
      lineNo: 1, productId: s.productId, unitId: s.unitId, quantity: q,
      sourceLocationId: s.locationId, sourceStatusId: s.statusId,
      targetLocationId: sec(rafS).id, targetStatusId: stSaglam.id,
      batchNo: s.batchNo ?? null, palletId: s.palletId ?? null,
    }])
    if (r.hata) hatalar.push(`transfer#${i}: ${r.hata}`)
    else olusan.push({ id: r.id, tip: 'transfer' })
  }
  console.log(`   ${olusan.filter((o) => o.tip === 'transfer').length} transfer tamamlandı`)
}

// ── 4. TARİHLERİ SON <GUN> GÜNE YAY ──────────────────────────────────────
// Motor "şimdi" damgası atıyor; raporlar zaman serisi göstersin diye damgaları kaydırıyoruz.
// YALNIZ zaman damgası değişir — miktar, ilişki, stok bakiyesi aynı kalır.
console.log(`\n4. ${olusan.length} belgenin tarihi son ${GUN} güne yayılıyor`)
const ids = olusan.map((o) => o.id)
if (ids.length) {
  const sql = `
    WITH s AS (
      SELECT id, now() - (random() * ${GUN} || ' days')::interval
             - (random() * 10 || ' hours')::interval AS ts
      FROM wms."TBLDOCUMENT" WHERE id IN (${ids.join(',')})
    )
    UPDATE wms."TBLDOCUMENT" d SET "documentDate" = s.ts, "createdAt" = s.ts FROM s WHERE d.id = s.id;
    UPDATE wms."TBLSTOCKLEDGER" l SET "createdAt" = d."createdAt"
      FROM wms."TBLDOCUMENT" d WHERE l."documentId" = d.id AND d.id IN (${ids.join(',')});
    UPDATE wms."TBLDOCUMENTSTATUSHISTORY" h SET "createdAt" = d."createdAt"
      FROM wms."TBLDOCUMENT" d WHERE h."documentId" = d.id AND d.id IN (${ids.join(',')});`
  // Tırnak kaçışı platformlar arası kırılgan → SQL'i dosyayla taşı
  const yerel = 'demo-dates.sql'
  writeFileSync(yerel, sql)
  execSync(`scp -q ${yerel} hetzner:/tmp/demo-dates.sql`)
  execSync(`ssh hetzner "sudo -u postgres psql -d onegate_wms -q -f /tmp/demo-dates.sql && rm -f /tmp/demo-dates.sql"`, { stdio: 'inherit' })
  unlinkSync(yerel)
  console.log('   tarihler yayıldı')
}

console.log(`\n${'═'.repeat(60)}`)
console.log(`✔ ${olusan.length} belge oluşturuldu (${hatalar.length} hata)`)
if (hatalar.length) console.log('İlk 3 hata:\n  ' + hatalar.slice(0, 3).join('\n  '))
