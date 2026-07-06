// Firma-create'e bağlı seed'leri TÜM mevcut firmalara backfill'ler (idempotent — yeni seed eklendikçe tekrar koş).
// Çalıştır (sunucu): cd /opt/onegate-wms && npx tsx scripts/backfill-reports.mjs
import { prisma } from '../src/lib/prisma.js'
import { seedReports } from '../src/lib/reportSeed.js'
import { ensureWorkOrderSequence } from '../src/lib/sequence.js'

const companies = await prisma.tBLCOMPANY.findMany({ select: { id: true, code: true } })
for (const c of companies) {
  const n = await seedReports(c.id)
  await ensureWorkOrderSequence(c.id) // İş Emri 'WO' sayacı
  console.log(`  ${c.code} (#${c.id}): ${n} rapor + WO sayacı`)
}
console.log(`✔ ${companies.length} firma backfill edildi (rapor + WO sayacı)`)
await prisma.$disconnect()
