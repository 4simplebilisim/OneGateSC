// ANA BİRİMİ HİÇ OLMAYAN ÜRÜNLER — birimi mevcut veriden türetip yazar.
//
//   npx tsx scripts/backfill-missing-unit.ts            → RAPOR
//   npx tsx scripts/backfill-missing-unit.ts --uygula
//
// backfill-base-units.mjs'in tamamlayıcısı: o, unitId'si OLAN ama ürün-birim
// satırı olmayanları düzeltiyor. Bu ise unitId'si HİÇ OLMAYAN ürünleri ele alıyor.
// Birimsiz ürün, okutmada "Birim uyumsuz" hatasına takılır ve stoğu işlenemez.
//
// Birim şu sırayla türetilir: mevcut ÜRÜN-BİRİM satırı → STOK satırı → BELGE satırı.
// Hiçbirinden çıkmıyorsa dokunulmaz (elle seçilmeli — uydurmak yanlış olur).
import { prisma } from '../src/lib/prisma.js'

const UYGULA = process.argv.includes('--uygula')

const main = async () => {
  const birimsiz = await prisma.tBLPRODUCT.findMany({
    where: { unitId: null },
    select: { id: true, code: true, name: true, companyId: true },
    orderBy: { id: 'asc' },
  })
  console.log(`\nAna birimi olmayan ürün: ${birimsiz.length}`)
  if (!birimsiz.length) { console.log('✔ Tamam.'); return }

  const ids = birimsiz.map((p) => p.id)
  const [purs, stoklar, satirlar] = await Promise.all([
    prisma.tBLPRODUCTUNIT.findMany({ where: { productId: { in: ids } }, select: { productId: true, unitId: true, isBaseUnit: true } }),
    prisma.tBLSTOCK.groupBy({ by: ['productId', 'unitId'], where: { productId: { in: ids } }, _sum: { mainQty: true } }),
    prisma.tBLDOCUMENTLINE.groupBy({ by: ['productId', 'unitId'], where: { productId: { in: ids } }, _count: true }),
  ])
  const birimler = await prisma.tBLUNIT.findMany({ select: { id: true, code: true } })
  const birimKod = new Map(birimler.map((b) => [b.id, b.code]))

  const plan: Array<{ p: (typeof birimsiz)[number]; unitId: number; kaynak: string }> = []
  const cozulemeyen: typeof birimsiz = []
  for (const p of birimsiz) {
    const pu = purs.find((x) => x.productId === p.id && x.isBaseUnit) ?? purs.find((x) => x.productId === p.id)
    const st = stoklar.filter((x) => x.productId === p.id).sort((a, b) => Number(b._sum.mainQty ?? 0) - Number(a._sum.mainQty ?? 0))[0]
    const dl = satirlar.filter((x) => x.productId === p.id).sort((a, b) => b._count - a._count)[0]
    const secim = pu ? { unitId: pu.unitId, kaynak: 'ürün-birim satırı' }
      : st ? { unitId: st.unitId, kaynak: `stok (${st._sum.mainQty})` }
        : dl ? { unitId: dl.unitId, kaynak: `belge satırı (${dl._count})` } : null
    if (secim) plan.push({ p, unitId: secim.unitId, kaynak: secim.kaynak })
    else cozulemeyen.push(p)
  }

  console.log(`  türetilebilen: ${plan.length} · türetilemeyen: ${cozulemeyen.length}\n`)
  for (const x of plan.slice(0, 12)) console.log(`  ${x.p.code.padEnd(14)} → ${birimKod.get(x.unitId) ?? x.unitId}  (${x.kaynak})`)
  if (plan.length > 12) console.log(`  … +${plan.length - 12} ürün daha`)
  if (cozulemeyen.length) console.log(`\n  ⚠ türetilemeyen (elle seçilmeli): ${cozulemeyen.map((p) => p.code).join(', ')}`)

  if (!UYGULA) { console.log('\nRAPOR modu — hiçbir şey yazılmadı. Uygulamak için --uygula ekleyin.'); return }

  let yazilan = 0
  for (const x of plan) {
    await prisma.tBLPRODUCT.update({ where: { id: x.p.id }, data: { unitId: x.unitId } })
    // Ana birim satırı da olsun (Ölçü Birimleri sekmesi boş görünmesin, barkod eklenebilsin)
    const varMi = purs.some((u) => u.productId === x.p.id && u.unitId === x.unitId)
    if (!varMi) {
      await prisma.tBLPRODUCTUNIT.create({
        data: { companyId: x.p.companyId, productId: x.p.id, unitId: x.unitId, isBaseUnit: true, multiplier: 1, divisor: 1 },
      })
    }
    yazilan++
  }
  console.log(`\n✓ ${yazilan} ürüne ana birim yazıldı.`)

  const kalan = await prisma.tBLPRODUCT.count({ where: { unitId: null } })
  console.log(`  ana birimi hâlâ boş: ${kalan}`)
}

main()
  .catch((e) => { console.error(e); process.exitCode = 1 })
  .finally(() => prisma.$disconnect())
