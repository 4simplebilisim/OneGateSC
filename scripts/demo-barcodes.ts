// Demo barkodları — stoklu ürünlere EAN-13 barkod tanımlar (el terminali okutması için).
// Barkod okutma demosu bu tanım olmadan çalışmaz: lookup önce barkod kural motoruna,
// eşleşmezse ürün-birim barkoduna bakar; ikisi de yoksa found:false döner.
//
//   npx tsx scripts/demo-barcodes.mjs            → yalnız RAPOR (hiçbir şey yazmaz)
//   npx tsx scripts/demo-barcodes.mjs --uygula   → eksik barkodları oluşturur
//
// Barkod EAN-13 kuralına uygun üretilir: 869 (Türkiye) + firma/ürün + kontrol hanesi.
import { prisma } from '../src/lib/prisma.js'

const UYGULA = process.argv.includes('--uygula')

/** EAN-13 kontrol hanesi: tek konumlar ×1, çift konumlar ×3, 10'a tamamla. */
function ean13(govde12) {
  const t = [...govde12].reduce((s, c, i) => s + Number(c) * (i % 2 === 0 ? 1 : 3), 0)
  return govde12 + String((10 - (t % 10)) % 10)
}

const main = async () => {
  // Stoğu olan ürünler önce — demo bunların üzerinden yapılır
  const stoklu = new Set(
    (await prisma.tBLSTOCK.groupBy({ by: ['productId'], where: { mainQty: { gt: 0 } } })).map((s) => s.productId),
  )
  const birimler = await prisma.tBLPRODUCTUNIT.findMany({
    include: { product: { select: { id: true, code: true, name: true, companyId: true, unitId: true } }, barcodes: true, unit: { select: { code: true } } },
    orderBy: { id: 'asc' },
  })

  // Ürün başına ANA birim (yoksa ilk birim) — barkod ana birime tanımlanır
  const secim = new Map()
  for (const pu of birimler) {
    const mevcut = secim.get(pu.productId)
    const anaMi = pu.isBaseUnit || pu.unitId === pu.product.unitId
    if (!mevcut || (anaMi && !mevcut.anaMi)) secim.set(pu.productId, { pu, anaMi })
  }

  const eksik = [...secim.values()]
    .filter((x) => !x.pu.barcodes.some((b) => b.isActive))
    .sort((a, b) => Number(stoklu.has(b.pu.productId)) - Number(stoklu.has(a.pu.productId)))

  const varOlan = [...secim.values()].length - eksik.length
  console.log(`Ürün-birim: ${secim.size} · barkodu VAR: ${varOlan} · barkodu YOK: ${eksik.length}`)
  console.log(`Stoklu ürün: ${stoklu.size}\n`)
  if (!eksik.length) { console.log('Eksik yok.'); return }

  if (!UYGULA) {
    console.log('RAPOR modu — hiçbir şey yazılmadı. Uygulamak için: npx tsx scripts/demo-barcodes.mjs --uygula\n')
    console.log('İlk 10 aday:')
    for (const x of eksik.slice(0, 10)) {
      console.log(`  ${x.pu.product.code.padEnd(14)} ${x.pu.unit?.code ?? '?'}  ${stoklu.has(x.pu.productId) ? '(stoklu)' : ''}`)
    }
    return
  }

  let yazilan = 0
  for (const [i, x] of eksik.entries()) {
    // 869 + firma(2) + sıra(7) = 12 hane gövde
    const gövde = `869${String(x.pu.product.companyId).padStart(2, '0')}${String(1000000 + i).slice(-7)}`
    const barkod = ean13(gövde)
    const cakisma = await prisma.tBLPRODUCTUNITBARCODE.findFirst({ where: { companyId: x.pu.product.companyId, barcode: barkod } })
    if (cakisma) { console.log(`  ! ${x.pu.product.code}: ${barkod} zaten kullanımda — atlandı`); continue }
    await prisma.tBLPRODUCTUNITBARCODE.create({
      data: { companyId: x.pu.product.companyId, productUnitId: x.pu.id, barcode: barkod, isActive: true },
    })
    yazilan++
    if (stoklu.has(x.pu.productId) && yazilan <= 10) console.log(`  ✓ ${x.pu.product.code.padEnd(14)} ${x.pu.unit?.code ?? ''} → ${barkod}  (stoklu)`)
  }
  console.log(`\n${yazilan} barkod tanımlandı.`)
}

main()
  .catch((e) => { console.error(e); process.exitCode = 1 })
  .finally(() => prisma.$disconnect())
