// DEMO PALET SETİ — el terminalinde okutulabilir palet(ler) hazırlar.
//
//   npx tsx scripts/demo-pallet.ts            → yalnız RAPOR (hiçbir şey yazmaz)
//   npx tsx scripts/demo-pallet.ts --uygula   → paletleri açar, birine GERÇEK belgeyle stok koyar
//
// Palet numarası, firmadaki aktif PALLET barkod kuralının önekine göre üretilir
// (kural yoksa uyarır) — okutunca "Palet bulunamadı" dememesi için.
// Dolu palet, stok/defter tutarlı olsun diye GERÇEK mal kabul belgesinden geçer.
import { buildApp } from '../src/app.js'
import { prisma } from '../src/lib/prisma.js'

const UYGULA = process.argv.includes('--uygula')
const KULLANICI = process.env.DEMO_USER ?? 'admin'
const SIFRE = process.env.DEMO_PASSWORD ?? 'admin123'

const main = async () => {
  const app = await buildApp({ logger: false })
  await app.ready()
  const giris = await app.inject({ method: 'POST', url: '/api/auth/login', payload: { username: KULLANICI, password: SIFRE } })
  if (giris.statusCode !== 200) throw new Error(`Giriş başarısız (${KULLANICI}): ${giris.body} — DEMO_USER/DEMO_PASSWORD ile verin`)
  const jwt = giris.json().token as string
  const kim = JSON.parse(Buffer.from(jwt.split('.')[1]!, 'base64').toString()) as { companyId?: number; companies?: number[] }
  const CO = Number(process.env.DEMO_COMPANY_ID ?? kim.companyId ?? kim.companies?.[0])
  if (!Number.isInteger(CO)) throw new Error('Firma belirlenemedi — DEMO_COMPANY_ID verin')
  const auth = { authorization: `Bearer ${jwt}`, 'x-company-id': String(CO) }

  // Palet barkod kuralı — okutmanın çalışması buna bağlı
  const kural = await prisma.tBLBARCODETYPE.findFirst({
    where: { companyId: CO, mode: 'PALLET', isActive: true }, orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
  })
  if (!kural) throw new Error('Aktif PALLET barkod kuralı yok — Uyarlamalar › Barkod Tipleri\'nden PALLET modunda bir kural açın')
  if (kural.matchContains) {
    console.log(`⚠ Kural "${kural.code}" barkodun "${kural.matchContains}" içermesini istiyor — palet no buna göre üretiliyor.`)
  }
  const onek = kural.matchPrefix ?? 'P'
  const palNo = (n: number) => `${onek}${String(n).padStart(4, '0')}${kural.matchContains ?? ''}`

  const palTip = await prisma.tBLPALLETTYPE.findFirst({ where: { companyId: CO, isActive: true } })
  if (!palTip) throw new Error('Palet tipi tanımlı değil — Uyarlamalar › Genel › Palet Tipleri')

  // Dolu palet için: stoklu bir ürün + onun barkodu + giriş operasyonu + hedef lokasyon/statü
  const stok = await prisma.tBLSTOCK.findFirst({
    where: { companyId: CO, mainQty: { gt: 0 } },
    include: { product: true, location: true, status: true, unit: true },
    orderBy: { mainQty: 'desc' },
  })
  if (!stok) throw new Error('Firmada stok yok — önce demo verisi kurun')

  // Kontrolsüz varsa okutmayla dolar; yoksa KONTROLLÜ operasyonla plan satırı açılıp ona okutulur
  const girisAdaylari = await prisma.tBLOPERATIONTYPE.findMany({
    where: { companyId: CO, direction: 'INBOUND', statusLinks: { some: { targetStatusId: { not: null } } } },
    include: { statusLinks: true, sequence: true },
    orderBy: { id: 'asc' },
  })
  const opGir = girisAdaylari.find((o) => o.controlMode === 'UNCONTROLLED')
    ?? girisAdaylari.find((o) => o.controlMode === 'CONTROLLED')
  if (!opGir) throw new Error('Statü geçişi tanımlı bir GİRİŞ operasyonu yok')
  const kontrollu = opGir.controlMode === 'CONTROLLED'
  const hedefStatuId = opGir.statusLinks.find((s) => s.targetStatusId)!.targetStatusId!
  const urunBarkod = await prisma.tBLPRODUCTUNITBARCODE.findFirst({
    where: { companyId: CO, isActive: true, productUnit: { productId: stok.productId } },
  })

  const varOlan = await prisma.tBLPALLET.findMany({ where: { companyId: CO, palletNo: { in: [1, 2, 3].map(palNo) } } })
  console.log(`\nFirma ${CO} · palet kuralı "${kural.code}" (önek "${onek}") · palet tipi ${palTip.code}`)
  console.log(`Açılacak paletler: ${[1, 2, 3].map(palNo).join(', ')}  (mevcut: ${varOlan.length})`)
  console.log(`Dolu palet için ürün: ${stok.product.code} · lokasyon ${stok.location.code} · birim ${stok.unit?.code ?? '?'}`)
  console.log(`Giriş operasyonu: ${opGir.code} (${opGir.controlMode}) · hedef statü #${hedefStatuId}`)
  if (urunBarkod) console.log(`Ürün barkodu (EAN): ${urunBarkod.barcode}`)

  if (!UYGULA) {
    console.log('\nRAPOR modu — hiçbir şey yazılmadı. Uygulamak için --uygula ekleyin.')
    await app.close()
    return
  }

  const paletler: Array<{ no: string; id: number; yeni: boolean }> = []
  for (const n of [1, 2, 3]) {
    const no = palNo(n)
    const mevcut = varOlan.find((p) => p.palletNo === no)
    if (mevcut) { paletler.push({ no, id: mevcut.id, yeni: false }); continue }
    const p = await prisma.tBLPALLET.create({
      data: { companyId: CO, palletNo: no, palletTypeId: palTip.id, baseUnitId: stok.unitId, isActive: true },
    })
    paletler.push({ no, id: p.id, yeni: true })
  }

  // 1. palete GERÇEK belgeyle stok koy (zaten doluysa dokunma)
  const ilk = paletler[0]!
  const doluMu = await prisma.tBLSTOCK.count({ where: { companyId: CO, palletId: ilk.id, mainQty: { gt: 0 } } })
  let belgeNo: string | null = null
  if (!doluMu) {
    const satir = {
      productId: stok.productId, unitId: stok.unitId, quantity: 100,
      targetLocationId: stok.locationId, targetStatusId: hedefStatuId, palletId: ilk.id, batchNo: 'DEMO-PALET',
    }
    const bg = await app.inject({
      method: 'POST', url: '/api/documents', headers: auth,
      payload: {
        operationTypeId: opGir.id,
        ...(opGir.sequenceId ? {} : { documentNo: `DEMO-PAL-${Date.now().toString(36).toUpperCase().slice(-5)}` }),
        note: 'Demo palet dolumu',
        ...(kontrollu ? { lines: [satir] } : {}), // kontrollü: içerik plandan belli
      },
    })
    if (bg.statusCode !== 201) throw new Error('Belge açılamadı: ' + bg.body)
    const belge = bg.json()
    belgeNo = belge.documentNo
    const sc = await app.inject({
      method: 'POST', url: '/api/document-line-scopes', headers: auth,
      payload: kontrollu
        ? { documentLineId: belge.lines[0].id, unitId: stok.unitId, quantity: 100, targetLocationId: stok.locationId, targetStatusId: hedefStatuId, palletId: ilk.id, batchNo: 'DEMO-PALET' }
        : { documentId: belge.id, ...satir },
    })
    if (sc.statusCode !== 201) throw new Error('Okutma başarısız: ' + sc.body)
    const c = await app.inject({ method: 'POST', url: `/api/documents/${belge.id}/confirm`, headers: auth, payload: {} })
    if (c.statusCode !== 200) throw new Error('Onay başarısız: ' + c.body)
    const t = await app.inject({ method: 'POST', url: `/api/documents/${belge.id}/complete`, headers: auth, payload: {} })
    if (t.statusCode !== 200) throw new Error('Tamamlama başarısız: ' + t.body)
  }

  // Doğrula: okutunca gerçekten çözülüyor mu
  console.log('\n── OKUTMA DOĞRULAMASI ──')
  for (const p of paletler) {
    const r = await app.inject({ method: 'GET', url: `/api/lookup/barcode?code=${encodeURIComponent(p.no)}`, headers: auth })
    const j = r.json()
    const satir = j.pallet?.lines?.length ?? 0
    console.log(`  ${p.no.padEnd(10)} ${j.found ? `✓ ${j.mode}` : '✗ bulunamadı'} · içerik ${satir} satır${satir ? ` (${j.pallet.lines[0].productCode} ${j.pallet.lines[0].qty})` : ' (boş)'}`)
  }
  if (urunBarkod) {
    const r = await app.inject({ method: 'GET', url: `/api/lookup/barcode?code=${urunBarkod.barcode}`, headers: auth })
    console.log(`  ${urunBarkod.barcode} ${r.json().found ? `✓ ${r.json().mode} → ${r.json().product?.code} / ${r.json().unit?.code}` : '✗ bulunamadı'}`)
  }
  if (belgeNo) console.log(`\nDolum belgesi: ${belgeNo}`)
  await app.close()
}

main()
  .catch((e) => { console.error(e.message ?? e); process.exitCode = 1 })
  .finally(() => prisma.$disconnect())
