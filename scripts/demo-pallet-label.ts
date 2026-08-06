// PALET ETİKETİ BARKODU — bileşik barkod kuralı + palet sayacı kurulumu.
//
//   npx tsx scripts/demo-pallet-label.ts            → RAPOR (hiçbir şey yazmaz)
//   npx tsx scripts/demo-pallet-label.ts --uygula
//
// Kurduğu düzen:
//   1) PALET SAYACI  — palet tipine sayaç + numara uzunluğu bağlar; palet no artık
//      ELLE değil MOTORDAN doğar: <SAYAÇ ÖNEKİ><sıfır dolgulu sayaç>
//      (legacy: önek TBLSBSAYAC.TXTONEK, uzunluk TBLSBPALETTIPI.LNGPALETNOUZUNLUK).
//   2) PALET BARKODU — sade palet no okutması; kuralın öneki SAYAÇ önekiyle hizalanır.
//      Eskiden tip koduyla üretilmiş numaralar için ayrı kural korunur.
//   3) PALET ETİKETİ — bileşik barkod:  paletno/ürün/parti/SKT/adet/birim
//      SEGMENT modu, "/" ayracı, altı alan. Okutunca hepsi tek seferde çözülür.
//
// Önek PALLET_PREFIX (varsayılan P), uzunluk PALLET_NO_LEN (varsayılan 9) → P000000025 = 10 karakter.
// 15 karakter için: PALLET_NO_LEN=14
import { prisma } from '../src/lib/prisma.js'
import { parseBarcode } from '../src/lib/barcodeParse.js'

const UYGULA = process.argv.includes('--uygula')
const NO_UZUNLUK = Number(process.env.PALLET_NO_LEN ?? 9)
const ONEK = (process.env.PALLET_PREFIX ?? 'P').toUpperCase() // legacy TBLSBSAYAC.TXTONEK
const SKT_FORMAT = process.env.EXPIRY_FORMAT ?? 'YYYYAAGG'

const main = async () => {
  const CO = Number(process.env.DEMO_COMPANY_ID ?? 0) || (await prisma.tBLPALLETTYPE.findFirstOrThrow({ where: { isActive: true } })).companyId
  const tip = await prisma.tBLPALLETTYPE.findFirst({ where: { companyId: CO, isActive: true }, orderBy: { id: 'asc' } })
  if (!tip) throw new Error(`Firma ${CO}: palet tipi yok — Uyarlamalar › Genel › Palet Tipleri`)

  const enBuyuk = await prisma.tBLPALLET.findMany({ where: { companyId: CO }, select: { palletNo: true } })
  const mevcutEnBuyuk = enBuyuk
    .map((p) => Number(p.palletNo.replace(/\D/g, '')))
    .filter((n) => Number.isFinite(n))
    .reduce((a, b) => Math.max(a, b), 0)

  const sayacKodu = `PALET-${tip.code}`
  const mevcutSayac = await prisma.tBLSEQUENCE.findFirst({ where: { companyId: CO, code: sayacKodu } })
  const etiketKodu = 'PALETETIKET'
  const mevcutEtiket = await prisma.tBLBARCODETYPE.findFirst({ where: { companyId: CO, code: etiketKodu } })
  const paletKurali = await prisma.tBLBARCODETYPE.findFirst({
    where: { companyId: CO, mode: 'PALLET', isActive: true }, orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
  })

  const ornekNo = `${ONEK}${String(mevcutEnBuyuk + 1).padStart(NO_UZUNLUK, '0')}`
  console.log(`\nFirma ${CO} · palet tipi ${tip.code}`)
  console.log(`  Sayaç         : ${mevcutSayac ? `${sayacKodu} (var, değer ${mevcutSayac.currentValue})` : `${sayacKodu} (AÇILACAK, ${mevcutEnBuyuk}'den devam)`}`)
  console.log(`  Numara uzunluk: ${NO_UZUNLUK} → örnek palet no ${ornekNo} (${ornekNo.length} karakter)`)
  console.log(`  Palet barkodu : ${paletKurali ? `${paletKurali.code} (önek "${paletKurali.matchPrefix ?? '-'}" → "${ONEK}" olacak)` : 'AÇILACAK'}`)
  console.log(`  Palet etiketi : ${mevcutEtiket ? `${etiketKodu} (var, segmentler yenilenecek)` : `${etiketKodu} (AÇILACAK)`}`)
  console.log(`  Etiket deseni : paletno/ürün/parti/SKT/adet/birim   (ayraç "/", SKT ${SKT_FORMAT})`)

  if (!UYGULA) { console.log('\nRAPOR modu — hiçbir şey yazılmadı. Uygulamak için --uygula ekleyin.'); return }

  // 1) SAYAÇ — mevcut en büyük numaradan devam et (çakışma olmasın)
  const sayac = mevcutSayac ?? await prisma.tBLSEQUENCE.create({
    data: {
      companyId: CO, code: sayacKodu, name: `${tip.name ?? tip.code} palet numarası`,
      prefix: ONEK, startNo: 1, currentValue: mevcutEnBuyuk, padLength: NO_UZUNLUK, isActive: true,
    },
  })
  await prisma.tBLSEQUENCE.update({ where: { id: sayac.id }, data: { prefix: ONEK, padLength: NO_UZUNLUK } })
  await prisma.tBLPALLETTYPE.update({ where: { id: tip.id }, data: { sequenceId: sayac.id, palletNoLength: NO_UZUNLUK } })

  // 2) PALET BARKODU — öneki SAYAÇ önekiyle hizala (yeni numaralar okunsun)
  if (paletKurali) {
    await prisma.tBLBARCODETYPE.update({ where: { id: paletKurali.id }, data: { matchPrefix: ONEK, matchContains: null, sortOrder: 100 } })
  } else {
    await prisma.tBLBARCODETYPE.create({
      data: { companyId: CO, code: `PALET-${ONEK}`, name: 'Palet no okutma', mode: 'PALLET', matchPrefix: ONEK, isActive: true, sortOrder: 100 },
    })
  }
  // Eskiden tip koduyla üretilmiş numaralar (ör. EUR000018) da okunmaya devam etsin
  if (tip.code.toUpperCase() !== ONEK) {
    const eskiVar = await prisma.tBLPALLET.count({ where: { companyId: CO, palletNo: { startsWith: tip.code } } })
    if (eskiVar) {
      const eskiKod = `PALET-ESKI-${tip.code}`
      const mevcutEski = await prisma.tBLBARCODETYPE.findFirst({ where: { companyId: CO, code: eskiKod } })
      if (!mevcutEski) {
        await prisma.tBLBARCODETYPE.create({
          data: { companyId: CO, code: eskiKod, name: `Eski palet no (${tip.code} önekli)`, mode: 'PALLET', matchPrefix: tip.code, isActive: true, sortOrder: 110 },
        })
      }
      console.log(`  (${eskiVar} adet eski "${tip.code}" önekli palet için ayrı kural korunuyor)`)
    }
  }

  // 3) PALET ETİKETİ — bileşik barkod. "/" içerdiği için sade palet kuralından ÖNCE denenir.
  const etiket = mevcutEtiket ?? await prisma.tBLBARCODETYPE.create({
    data: {
      companyId: CO, code: etiketKodu, name: 'Palet etiketi (palet/ürün/parti/SKT/adet/birim)',
      mode: 'SEGMENT', matchPrefix: null, matchContains: '/', separator: '/', isActive: true, sortOrder: 10,
    },
  })
  await prisma.tBLBARCODETYPE.update({
    where: { id: etiket.id },
    // Önek YOK: etiket hem yeni (P…) hem eski (EUR…) palet numarasıyla gelebilir; ayırt edici olan "/"
    data: { mode: 'SEGMENT', matchPrefix: null, matchContains: '/', separator: '/', isActive: true, sortOrder: 10 },
  })
  await prisma.tBLBARCODESEGMENT.deleteMany({ where: { barcodeTypeId: etiket.id } })
  await prisma.tBLBARCODESEGMENT.createMany({
    data: [
      { companyId: CO, barcodeTypeId: etiket.id, sortOrder: 1, field: 'PALLET', parseType: 'UNTIL', separator: '/' },
      { companyId: CO, barcodeTypeId: etiket.id, sortOrder: 2, field: 'PRODUCT', parseType: 'UNTIL', separator: '/' },
      { companyId: CO, barcodeTypeId: etiket.id, sortOrder: 3, field: 'BATCH', parseType: 'UNTIL', separator: '/' },
      { companyId: CO, barcodeTypeId: etiket.id, sortOrder: 4, field: 'EXPIRY', parseType: 'UNTIL', separator: '/', dateFormat: SKT_FORMAT },
      { companyId: CO, barcodeTypeId: etiket.id, sortOrder: 5, field: 'QUANTITY', parseType: 'UNTIL', separator: '/' },
      { companyId: CO, barcodeTypeId: etiket.id, sortOrder: 6, field: 'UNIT', parseType: 'UNTIL', separator: '/' },
    ],
  })

  // ── DOĞRULAMA: gerçek verilerle bileşik barkod üret ve motordan geçir ──
  console.log('\n── DOĞRULAMA ──')
  const dolu = await prisma.tBLSTOCK.findFirst({
    where: { companyId: CO, palletId: { not: null }, mainQty: { gt: 0 } },
    include: { pallet: true, product: true, unit: true },
  })
  const paletNo = dolu?.pallet?.palletNo ?? (await prisma.tBLPALLET.findFirst({ where: { companyId: CO }, orderBy: { id: 'desc' } }))?.palletNo
  if (paletNo) {
    const sade = await parseBarcode(CO, paletNo)
    console.log(`  ${paletNo.padEnd(14)} → ${sade.matched ? sade.mode : 'EŞLEŞMEDİ'}${sade.error ? ' · ' + sade.error : ''} · içerik ${sade.pallet?.lines.length ?? 0} satır`)
  }
  if (dolu) {
    const bilesik = [paletNo, dolu.product.code, dolu.batchNo || 'L001', '20271231', String(dolu.mainQty), dolu.unit?.code ?? ''].join('/')
    const r = await parseBarcode(CO, bilesik)
    console.log(`  ${bilesik}`)
    console.log(`    mod=${r.mode} kural=${r.barcodeTypeCode}`)
    console.log(`    palet=${r.fields.palletNo} (id ${r.fields.palletId ?? 'ÇÖZÜLEMEDİ'}) · ürün=${r.product?.code ?? '-'} · parti=${r.fields.batchNo ?? '-'}`)
    console.log(`    SKT=${r.fields.expiryDate ?? '-'} · miktar=${r.fields.quantity ?? '-'} · birim=${r.unit?.code ?? '-'}`)
    if (r.warnings?.length) console.log(`    uyarı: ${r.warnings.join(' · ')}`)
  }
  console.log('\nTamam. Yeni palet açarken palletNo VERMEYİN — sayaçtan üretilir.')
}

main()
  .catch((e) => { console.error(e.message ?? e); process.exitCode = 1 })
  .finally(() => prisma.$disconnect())
