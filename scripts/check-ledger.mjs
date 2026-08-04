// Stok ↔ Hareket Defteri mutabakatı: her ürün için TBLSTOCK toplamı ile
// TBLSTOCKLEDGER qtyDelta toplamı eşit olmalı. Eşit değilse bir hareket
// deftere yazılıp stoğa işlenmemiş (ya da tersi) demektir.
//
//   node scripts/check-ledger.mjs            # tüm firmalar
//   node scripts/check-ledger.mjs 10         # tek firma
//
// Canlıda: ssh hetzner "cd /opt/onegate-wms && npx tsx scripts/check-ledger.mjs"
// Çıkış kodu 1 = fark var (izleme/cron'a bağlanabilir).
import { prisma } from '../src/lib/prisma.js'

const only = process.argv[2] ? Number(process.argv[2]) : null

const rows = await prisma.$queryRawUnsafe(`
  WITH s AS (SELECT "companyId", "productId", SUM("mainQty") AS stok
             FROM wms."TBLSTOCK" GROUP BY 1,2),
       l AS (SELECT "companyId", "productId", SUM("qtyDelta") AS defter
             FROM wms."TBLSTOCKLEDGER" GROUP BY 1,2)
  SELECT COALESCE(s."companyId", l."companyId") AS "companyId",
         COALESCE(s."productId", l."productId") AS "productId",
         COALESCE(s.stok, 0) AS stok, COALESCE(l.defter, 0) AS defter,
         COALESCE(s.stok, 0) - COALESCE(l.defter, 0) AS fark
  FROM s FULL JOIN l ON s."companyId" = l."companyId" AND s."productId" = l."productId"
  WHERE ABS(COALESCE(s.stok, 0) - COALESCE(l.defter, 0)) > 0.001
    ${only ? `AND COALESCE(s."companyId", l."companyId") = ${only}` : ''}
  ORDER BY ABS(COALESCE(s.stok, 0) - COALESCE(l.defter, 0)) DESC
`)

if (!rows.length) {
  const [{ n }] = await prisma.$queryRawUnsafe(`SELECT COUNT(*)::int AS n FROM wms."TBLSTOCKLEDGER"${only ? ` WHERE "companyId"=${only}` : ''}`)
  console.log(`✔ Mutabakat TAM — stok ile defter birebir uyuşuyor (${n} hareket kaydı denetlendi)`)
  await prisma.$disconnect()
  process.exit(0)
}

console.log(`✗ ${rows.length} üründe FARK var (stok ≠ defter):\n`)
console.log('  firma   ürün        stok        defter        fark')
const prods = await prisma.tBLPRODUCT.findMany({
  where: { id: { in: rows.map((r) => r.productId) } }, select: { id: true, code: true },
})
const kod = new Map(prods.map((p) => [p.id, p.code]))
for (const r of rows) {
  console.log(`  ${String(r.companyId).padStart(5)}   ${(kod.get(r.productId) ?? '#' + r.productId).padEnd(10)} ${String(r.stok).padStart(10)} ${String(r.defter).padStart(12)} ${String(r.fark).padStart(11)}`)
}
console.log('\nOlası sebep: bir hareket deftere yazılıp stoğa işlenmemiş (ya da tersi).')
console.log('Defter denetim izidir — SATIR SİLME. Düzeltme için ters kayıt geçin.')
await prisma.$disconnect()
process.exit(1)
