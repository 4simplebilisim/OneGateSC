import type { Prisma } from '@prisma/client'

type Tx = Prisma.TransactionClient
type Direction = 'INBOUND' | 'OUTBOUND' | 'INTERNAL' | 'COUNT'

/**
 * Stok hareket defteri (TBLSTOCKLEDGER, legacy TBLSBLOGBELGE) — append-only kayıt.
 * Her mainQty değişiminde çağrılır; qtyDelta işaretlidir (+ giriş, − çıkış).
 * Aynı transaction (tx) içinde yazılır → stok değişimiyle atomik.
 */
export interface LedgerEntry {
  companyId: number
  productId: number
  unitId: number
  locationId: number
  statusId: number
  qtyDelta: Prisma.Decimal
  direction: Direction
  documentId?: number | null
  documentLineId?: number | null
  operationTypeId?: number | null
  batchNo?: string | null
  serialNo?: string | null
  palletId?: number | null
  poNo?: string | null
  poLine?: string | null
  barcode?: string | null
  userId?: number | null
}

export async function writeLedger(tx: Tx, e: LedgerEntry) {
  await tx.tBLSTOCKLEDGER.create({
    data: {
      companyId: e.companyId,
      productId: e.productId,
      unitId: e.unitId,
      locationId: e.locationId,
      statusId: e.statusId,
      qtyDelta: e.qtyDelta,
      direction: e.direction,
      documentId: e.documentId ?? null,
      documentLineId: e.documentLineId ?? null,
      operationTypeId: e.operationTypeId ?? null,
      batchNo: e.batchNo ?? null,
      serialNo: e.serialNo ?? null,
      palletId: e.palletId ?? null,
      poNo: e.poNo ?? null,
      poLine: e.poLine ?? null,
      barcode: e.barcode ?? null,
      userId: e.userId ?? null,
    },
  })
}
