// Tek seferlik: mevcut COMPLETED belgelerden hareket defterini (TBLSTOCKLEDGER) doldur.
// Ledger sonradan eklendiği için geçmiş hareketler yoktu; bu script as-built ledger'ı kurar.
// Idempotent: ledger boş değilse atlar. Çalıştır: npx tsx src/backfillLedger.ts
import { prisma } from './lib/prisma.js'

async function main() {
  const existing = await prisma.tBLSTOCKLEDGER.count()
  if (existing > 0) {
    console.log(`Ledger zaten ${existing} kayıt içeriyor — backfill atlandı.`)
    return
  }
  const docs = await prisma.tBLDOCUMENT.findMany({
    where: { status: 'COMPLETED' },
    include: { operationType: true, lines: { orderBy: { lineNo: 'asc' } } },
  })
  let n = 0
  for (const doc of docs) {
    if (!doc.operationType.affectsStock) continue
    const dir = doc.operationType.direction
    for (const line of doc.lines) {
      const base = {
        companyId: doc.companyId,
        productId: line.productId,
        unitId: line.unitId,
        batchNo: line.batchNo,
        serialNo: line.serialNo,
        palletId: line.palletId,
        direction: dir,
        documentId: doc.id,
        documentLineId: line.id,
        operationTypeId: doc.operationTypeId,
        userId: doc.createdById,
        createdAt: doc.completedAt ?? doc.createdAt,
      }
      if ((dir === 'OUTBOUND' || dir === 'INTERNAL') && line.sourceLocationId != null && line.sourceStatusId != null) {
        await prisma.tBLSTOCKLEDGER.create({ data: { ...base, locationId: line.sourceLocationId, statusId: line.sourceStatusId, qtyDelta: line.quantity.negated() } })
        n++
      }
      if ((dir === 'INBOUND' || dir === 'INTERNAL') && line.targetLocationId != null && line.targetStatusId != null) {
        await prisma.tBLSTOCKLEDGER.create({ data: { ...base, locationId: line.targetLocationId, statusId: line.targetStatusId, qtyDelta: line.quantity } })
        n++
      }
    }
  }
  console.log(`Backfill tamam: ${docs.length} COMPLETED belge → ${n} ledger kaydı.`)
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1) })
