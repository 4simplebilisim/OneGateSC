// Rapor tanımlarını TÜM mevcut firmalara backfill'ler (seedReports idempotent — yeni rapor eklendikçe tekrar koş).
// Çalıştır (sunucu): cd /opt/onegate-wms && npx tsx scripts/backfill-reports.mjs
import { prisma } from '../src/lib/prisma.js'
import { seedReports } from '../src/lib/reportSeed.js'

const companies = await prisma.tBLCOMPANY.findMany({ select: { id: true, code: true } })
for (const c of companies) {
  const n = await seedReports(c.id)
  console.log(`  ${c.code} (#${c.id}): ${n} rapor seed'lendi`)
}
console.log(`✔ ${companies.length} firma backfill edildi`)
await prisma.$disconnect()
