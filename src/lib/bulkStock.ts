import { Prisma } from '@prisma/client'
import { prisma } from './prisma.js'
import { completeDocument, collectionShortfall, uncontrolledScanGate, referenceGate, MovementError } from './movement.js'
import { refreshDocStatus } from './documentStatus.js'
import { nextSequence } from './sequence.js'

// TOPLU İŞLEM (StokBar SbTopluIslem, legacy TBLSBOPERASYONTIPITOPLUISLEMBAGLANTI + SSP_SBTOPLUISLEMSTOKDURUM):
// Stok satırları seçilir → seçilen operasyonla TEK belge otomatik doğar (satır+okutma stok kırılımı birebir),
// onaylanır ve TAMAMLANIR (statü değiştirme = statü-geçişli INTERNAL op; toplu çıkış = OUTBOUND op).
// Atomik: complete tek transaction — bir satır takılırsa (ör. başka belgenin rezervi) tümü geri döner.

export class BulkStockError extends Error {
  constructor(message: string, public httpCode = 400) { super(message) }
}

export interface BulkStockResult {
  documentId: number
  documentNo: string
  lineCount: number
  totalQty: string
  skipped: string[] // sıfır miktarlı vb. atlanan satırlar (bilgi)
}

export async function bulkStockOperation(companyId: number, operationTypeId: number, stockIds: number[], userId?: number | null): Promise<BulkStockResult> {
  const op = await prisma.tBLOPERATIONTYPE.findFirst({ where: { id: operationTypeId, companyId }, include: { sequence: true } })
  if (!op) throw new BulkStockError('Operasyon bulunamadı', 404)
  if (!op.bulkAction) throw new BulkStockError("Bu operasyonda 'Toplu İşlem' işaretli değil — Operasyon Tipi › Toplu İşlem parametresini açın")
  if (op.direction !== 'OUTBOUND' && op.direction !== 'INTERNAL') throw new BulkStockError('Toplu İşlem yalnız Çıkış/Transfer operasyonlarıyla yapılır')

  const stocks = await prisma.tBLSTOCK.findMany({ where: { id: { in: stockIds }, companyId } })
  if (!stocks.length) throw new BulkStockError('Seçili stok satırı bulunamadı')
  const missing = stockIds.filter((id) => !stocks.some((s) => s.id === id))
  if (missing.length) throw new BulkStockError(`Stok satırı bulunamadı: #${missing.join(', #')}`)

  // Hedef statü (INTERNAL — statü değiştirme): operasyonun statü geçişinden; hedef lokasyon = kaynağın kendisi (yerinde değişim)
  let targetStatusId: number | null = null
  if (op.direction === 'INTERNAL') {
    const tr = await prisma.tBLOPERATIONTYPESTATUS.findFirst({
      where: { companyId, operationTypeId: op.id, targetStatusId: { not: null } },
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }], select: { targetStatusId: true },
    })
    targetStatusId = tr?.targetStatusId ?? null
    if (!targetStatusId) throw new BulkStockError('Operasyonda hedef statü geçişi tanımlı değil — Operasyon Tipi › Statü sekmesinden tanımlayın')
  }

  const skipped: string[] = []
  const usable = stocks.filter((s) => {
    if (s.mainQty.lte(0)) { skipped.push(`#${s.id} (miktar 0)`); return false }
    if (op.direction === 'INTERNAL' && s.statusId === targetStatusId) { skipped.push(`#${s.id} (zaten hedef statüde)`); return false }
    return true
  })
  if (!usable.length) throw new BulkStockError('İşlenecek satır kalmadı (hepsi atlandı: ' + skipped.join(', ') + ')')

  const documentNo = op.sequence
    ? (await nextSequence(companyId, op.sequence.code)).formatted
    : `TOPLU-${Date.now().toString(36).toUpperCase()}`

  // Belge + satırlar + okutmalar: stok kırılımı BİREBİR (batch/seri/palet/müşteri/PO) → tam-toplama kapıları geçer.
  const doc = await prisma.tBLDOCUMENT.create({
    data: {
      companyId, documentNo, operationTypeId: op.id, status: 'DRAFT',
      createdById: userId ?? 1,
      note: `Toplu İşlem (${usable.length} stok satırı)`,
      lines: {
        create: usable.map((s, i) => ({
          companyId, lineNo: i + 1, productId: s.productId, unitId: s.unitId,
          quantity: s.mainQty, collectedQty: s.mainQty,
          batchNo: s.batchNo, serialNo: s.serialNo, palletId: s.palletId,
          customerId: s.customerId, poNo: s.poNo, poLine: s.poLine,
          sourceLocationId: s.locationId, sourceStatusId: s.statusId,
          ...(op.direction === 'INTERNAL' ? { targetLocationId: s.locationId, targetStatusId } : {}),
          scopes: {
            create: [{
              companyId, scopeNo: 1, quantity: s.mainQty, unitId: s.unitId,
              batchNo: s.batchNo, serialNo: s.serialNo, palletId: s.palletId,
              customerId: s.customerId, poNo: s.poNo, poLine: s.poLine,
              sourceLocationId: s.locationId, sourceStatusId: s.statusId,
              ...(op.direction === 'INTERNAL' ? { targetLocationId: s.locationId, targetStatusId } : {}),
            }],
          },
        })),
      },
    },
    select: { id: true, documentNo: true },
  })
  await refreshDocStatus(prisma, doc.id, { source: 'bulk-stock-create', userId: userId ?? null })

  try {
    // Tekil confirm ile aynı kapılar → CONFIRMED → complete (stok burada işlenir; hata olursa belge iptal edilir)
    const short = await collectionShortfall(prisma, doc.id)
    if (short) throw new MovementError(`Satır ${short.lineNo}: toplama eksik (${short.collected}/${short.quantity})`)
    const scanErr = await uncontrolledScanGate(prisma, doc.id)
    if (scanErr) throw new MovementError(scanErr)
    const refErr = await referenceGate(prisma, doc.id)
    if (refErr) throw new MovementError(refErr)
    await prisma.tBLDOCUMENT.update({ where: { id: doc.id }, data: { status: 'CONFIRMED' } })
    await completeDocument(doc.id, { userId: userId ?? undefined })
    await refreshDocStatus(prisma, doc.id, { source: 'bulk-stock-complete', userId: userId ?? null })
  } catch (err) {
    // Stok işlenemedi (ör. başka belgenin rezervi) → yarım belge kalmasın: iptal et, hatayı yükselt
    await prisma.tBLDOCUMENT.update({ where: { id: doc.id }, data: { status: 'CANCELLED' } }).catch(() => {})
    await refreshDocStatus(prisma, doc.id, { source: 'bulk-stock-fail', userId: userId ?? null }).catch(() => {})
    if (err instanceof MovementError) throw new BulkStockError(`İşlem uygulanamadı: ${err.message} (belge ${doc.documentNo} iptal edildi)`, 409)
    throw err
  }

  const totalQty = usable.reduce((a, s) => a.add(s.mainQty), new Prisma.Decimal(0)).toString()
  return { documentId: doc.id, documentNo: doc.documentNo, lineCount: usable.length, totalQty, skipped }
}
