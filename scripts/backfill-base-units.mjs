// Ana birim satırı olmayan ürünlere TBLPRODUCTUNIT satırı açar (isBaseUnit=true, çarpan/bölen=1).
// Ana birim TBLPRODUCT.unitId'de tutuluyordu ama listede satırı olmuyordu → "Ölçü Birimleri"
// sekmesi ürünün birimi varken boş görünüyordu ve barkod eklenecek satır bulunmuyordu.
//
//   npx tsx scripts/backfill-base-units.mjs           # ön izleme
//   npx tsx scripts/backfill-base-units.mjs --uygula
import { prisma } from '../src/lib/prisma.js'

const uygula = process.argv.includes('--uygula')

const urunler = await prisma.tBLPRODUCT.findMany({
  where: { unitId: { not: null } },
  select: { id: true, code: true, companyId: true, unitId: true },
})
const mevcut = await prisma.tBLPRODUCTUNIT.findMany({ select: { productId: true, unitId: true } })
const var_ = new Set(mevcut.map((m) => `${m.productId}:${m.unitId}`))
const eksik = urunler.filter((p) => !var_.has(`${p.id}:${p.unitId}`))

console.log(`${urunler.length} ürünün ${eksik.length} tanesinde ana birim satırı yok`)
if (!eksik.length) { console.log('✔ Tamam, yapılacak bir şey yok'); await prisma.$disconnect(); process.exit(0) }
console.log('  örnek: ' + eksik.slice(0, 5).map((p) => p.code).join(', '))

if (!uygula) { console.log('\nÖN İZLEME — --uygula ile çalıştırın.'); await prisma.$disconnect(); process.exit(0) }

const res = await prisma.tBLPRODUCTUNIT.createMany({
  data: eksik.map((p) => ({ companyId: p.companyId, productId: p.id, unitId: p.unitId, isBaseUnit: true, multiplier: 1, divisor: 1 })),
  skipDuplicates: true,
})
console.log(`✔ ${res.count} ana birim satırı oluşturuldu`)
await prisma.$disconnect()
