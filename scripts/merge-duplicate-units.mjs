// Mükerrer birim birleştirme: kaynak birimin TÜM referansları hedefe taşınır, kaynak silinir.
// Yalnız ÇEVRİM KATSAYISI 1 olan (aynı anlama gelen) birimler için — miktar dönüşümü YAPMAZ.
//
//   node scripts/merge-duplicate-units.mjs <kaynakId> <hedefId>          # ön izleme
//   node scripts/merge-duplicate-units.mjs <kaynakId> <hedefId> --uygula # uygula
//
// Canlı: ssh hetzner "cd /opt/onegate-wms && npx tsx scripts/merge-duplicate-units.mjs 41 36 --uygula"
import { prisma } from '../src/lib/prisma.js'

const [kaynakId, hedefId] = [Number(process.argv[2]), Number(process.argv[3])]
const uygula = process.argv.includes('--uygula')
if (!kaynakId || !hedefId || kaynakId === hedefId) {
  console.error('Kullanım: merge-duplicate-units.mjs <kaynakId> <hedefId> [--uygula]')
  process.exit(1)
}

const [kaynak, hedef] = await Promise.all([
  prisma.tBLUNIT.findUnique({ where: { id: kaynakId } }),
  prisma.tBLUNIT.findUnique({ where: { id: hedefId } }),
])
if (!kaynak || !hedef) { console.error('Birim bulunamadı'); process.exit(1) }
if (kaynak.companyId !== hedef.companyId) { console.error('Farklı firmaların birimleri birleştirilemez'); process.exit(1) }

console.log(`Birleştirme: ${kaynak.code} "${kaynak.name}" (#${kaynak.id})  →  ${hedef.code} "${hedef.name}" (#${hedef.id})\n`)

// Taşınacak referanslar
const say = async () => ({
  urun: await prisma.tBLPRODUCT.count({ where: { unitId: kaynakId } }),
  urunBirim: await prisma.tBLPRODUCTUNIT.count({ where: { unitId: kaynakId } }),
  stok: await prisma.tBLSTOCK.count({ where: { unitId: kaynakId } }),
  belgeSatir: await prisma.tBLDOCUMENTLINE.count({ where: { unitId: kaynakId } }),
  defter: await prisma.tBLSTOCKLEDGER.count({ where: { unitId: kaynakId } }),
})
const once = await say()
for (const [k, v] of Object.entries(once)) console.log(`  ${k.padEnd(12)} ${v}`)

// Çakışma kontrolü: aynı üründe HEM kaynak HEM hedef birim satırı varsa unique kısıt patlar
const kaynakSatir = await prisma.tBLPRODUCTUNIT.findMany({ where: { unitId: kaynakId }, select: { productId: true } })
const cakisan = kaynakSatir.length
  ? await prisma.tBLPRODUCTUNIT.findMany({
      where: { unitId: hedefId, productId: { in: kaynakSatir.map((r) => r.productId) } },
      select: { productId: true },
    })
  : []
if (cakisan.length) console.log(`\n  ⚠ ${cakisan.length} üründe her iki birim de tanımlı — kaynak satırları SİLİNECEK (hedef zaten var)`)

if (!uygula) {
  console.log('\nÖN İZLEME — hiçbir şey değişmedi. Uygulamak için --uygula ekleyin.')
  await prisma.$disconnect(); process.exit(0)
}

await prisma.$transaction(async (tx) => {
  // Çakışan ürün-birim satırlarını önce sil (hedefte zaten var)
  if (cakisan.length) {
    await tx.tBLPRODUCTUNIT.deleteMany({ where: { unitId: kaynakId, productId: { in: cakisan.map((c) => c.productId) } } })
  }
  await tx.tBLPRODUCT.updateMany({ where: { unitId: kaynakId }, data: { unitId: hedefId } })
  await tx.tBLPRODUCTUNIT.updateMany({ where: { unitId: kaynakId }, data: { unitId: hedefId } })
  await tx.tBLSTOCK.updateMany({ where: { unitId: kaynakId }, data: { unitId: hedefId } })
  await tx.tBLDOCUMENTLINE.updateMany({ where: { unitId: kaynakId }, data: { unitId: hedefId } })
  await tx.tBLSTOCKLEDGER.updateMany({ where: { unitId: kaynakId }, data: { unitId: hedefId } })
  await tx.tBLUNIT.delete({ where: { id: kaynakId } })
})

const sonra = await say()
const kalan = Object.values(sonra).reduce((a, b) => a + b, 0)
console.log(`\n✔ Birleştirildi. Kaynak birime kalan referans: ${kalan} (0 olmalı)`)
console.log(`  ${kaynak.code} silindi, tüm kayıtlar ${hedef.code} kullanıyor.`)
await prisma.$disconnect()
