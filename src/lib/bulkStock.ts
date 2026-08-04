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

export async function bulkStockOperation(
  companyId: number,
  operationTypeId: number,
  stockIds: number[],
  userId?: number | null,
  targetLocationId?: number | null,
  /** Satır bazında miktar (parçalı işlem). Verilmezse her satırın TAMAMI işlenir. */
  quantities?: { stockId: number; quantity: number }[] | null,
): Promise<BulkStockResult> {
  const op = await prisma.tBLOPERATIONTYPE.findFirst({ where: { id: operationTypeId, companyId }, include: { sequence: true } })
  if (!op) throw new BulkStockError('Operasyon bulunamadı', 404)
  if (!op.bulkAction) throw new BulkStockError("Bu operasyonda 'Toplu İşlem' işaretli değil — Operasyon Tipi › Toplu İşlem parametresini açın")
  if (op.direction !== 'OUTBOUND' && op.direction !== 'INTERNAL') throw new BulkStockError('Toplu İşlem yalnız Çıkış/Transfer operasyonlarıyla yapılır')

  const stocks = await prisma.tBLSTOCK.findMany({ where: { id: { in: stockIds }, companyId } })
  if (!stocks.length) throw new BulkStockError('Seçili stok satırı bulunamadı')
  const missing = stockIds.filter((id) => !stocks.some((s) => s.id === id))
  if (missing.length) throw new BulkStockError(`Stok satırı bulunamadı: #${missing.join(', #')}`)

  // INTERNAL iki kip: (a) TOPLU TAŞIMA — hedef lokasyon verilir (statü geçiş varsa uygulanır, yoksa korunur);
  //                   (b) STATÜ DEĞİŞTİRME — hedef lokasyon boş, stok yerinde; statü geçişi ZORUNLU (yoksa no-op olurdu).
  let transStatusId: number | null = null
  if (op.direction === 'INTERNAL') {
    if (targetLocationId != null) {
      const loc = await prisma.tBLLOCATION.findFirst({ where: { id: targetLocationId, companyId }, select: { id: true } })
      if (!loc) throw new BulkStockError('Hedef lokasyon bulunamadı — bu firmaya ait değil')
    }
    const tr = await prisma.tBLOPERATIONTYPESTATUS.findFirst({
      where: { companyId, operationTypeId: op.id, targetStatusId: { not: null } },
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }], select: { targetStatusId: true },
    })
    transStatusId = tr?.targetStatusId ?? null
    if (targetLocationId == null && !transStatusId) {
      throw new BulkStockError('Hedef lokasyon seçin (toplu taşıma) ya da operasyona statü geçişi tanımlayın (yerinde statü değişimi)')
    }
  } else if (targetLocationId != null) {
    throw new BulkStockError('Hedef lokasyon yalnız Transfer operasyonunda kullanılır')
  }
  // Satır bazında hedef: lokasyon = seçilen ?? yerinde; statü = geçiş ?? kaynak statü (taşıma statüyü korur)
  const tgtLocOf = (s: { locationId: number }) => targetLocationId ?? s.locationId
  const tgtStaOf = (s: { statusId: number }) => transStatusId ?? s.statusId

  // Parçalı işlem: yalnız operasyon tanımında "Parçalı Kullanım" açıksa (legacy BYTPARCALIKULLANIM).
  // Miktar verilmeyen satır tam işlenir; verilen miktar 0 < q <= eldeki olmalı.
  const qtyOf = new Map<number, number>()
  if (quantities?.length) {
    if (!op.partialUsage) {
      throw new BulkStockError("Bu operasyonda 'Parçalı Kullanım' kapalı — miktar değiştirilemez (Operasyon Tipi › Parçalı Kullanım)")
    }
    for (const q of quantities) {
      const st = stocks.find((s) => s.id === q.stockId)
      if (!st) throw new BulkStockError(`Stok satırı bulunamadı: #${q.stockId}`)
      if (!(q.quantity > 0)) throw new BulkStockError(`#${q.stockId}: miktar 0'dan büyük olmalı`)
      if (st.mainQty.lt(q.quantity)) throw new BulkStockError(`#${q.stockId}: eldeki miktar ${st.mainQty} — ${q.quantity} işlenemez`)
      qtyOf.set(q.stockId, q.quantity)
    }
  }
  const useQty = (s: { id: number; mainQty: Prisma.Decimal }) => qtyOf.get(s.id) ?? s.mainQty

  // Operasyonun statü kuralı: tanımda kaynak statü(ler) varsa, stok o statülerden birinde olmalı.
  // Okutma yolunda bu kural zaten uygulanıyordu; toplu işlemde HİÇ kontrol edilmiyordu.
  const opStatuses = await prisma.tBLOPERATIONTYPESTATUS.findMany({
    where: { companyId, operationTypeId: op.id }, select: { sourceStatusId: true },
  })
  const allowedSources = new Set(opStatuses.map((o) => o.sourceStatusId).filter((v): v is number => v != null))
  const statusNames = allowedSources.size
    ? (await prisma.tBLSTATUS.findMany({ where: { id: { in: [...allowedSources] } }, select: { id: true, code: true } }))
    : []
  const allowedLabel = statusNames.map((s) => s.code).join(', ')

  const skipped: string[] = []
  const usable = stocks.filter((s) => {
    if (s.mainQty.lte(0)) { skipped.push(`#${s.id} (miktar 0)`); return false }
    if (allowedSources.size && !allowedSources.has(s.statusId)) {
      skipped.push(`#${s.id} (statü uyumsuz — bu operasyon yalnız ${allowedLabel} statüsünde çalışır)`)
      return false
    }
    if (op.direction === 'INTERNAL' && tgtLocOf(s) === s.locationId && tgtStaOf(s) === s.statusId) { skipped.push(`#${s.id} (hedef = mevcut konum/statü)`); return false }
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
          quantity: useQty(s), collectedQty: useQty(s),
          batchNo: s.batchNo, serialNo: s.serialNo, palletId: s.palletId,
          customerId: s.customerId, poNo: s.poNo, poLine: s.poLine,
          sourceLocationId: s.locationId, sourceStatusId: s.statusId,
          ...(op.direction === 'INTERNAL' ? { targetLocationId: tgtLocOf(s), targetStatusId: tgtStaOf(s) } : {}),
          scopes: {
            create: [{
              companyId, scopeNo: 1, quantity: useQty(s), unitId: s.unitId,
              batchNo: s.batchNo, serialNo: s.serialNo, palletId: s.palletId,
              customerId: s.customerId, poNo: s.poNo, poLine: s.poLine,
              sourceLocationId: s.locationId, sourceStatusId: s.statusId,
              ...(op.direction === 'INTERNAL' ? { targetLocationId: tgtLocOf(s), targetStatusId: tgtStaOf(s) } : {}),
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

  // İşlenen miktar = belgeye yazılan miktar (parçalıda girilen), eldeki değil.
  // mainQty toplanıyordu: 19'luk stoktan 3 işlenince ekranda "19" yazıyordu.
  const totalQty = usable.reduce((a, s) => a.add(useQty(s)), new Prisma.Decimal(0)).toString()
  return { documentId: doc.id, documentNo: doc.documentNo, lineCount: usable.length, totalQty, skipped }
}
