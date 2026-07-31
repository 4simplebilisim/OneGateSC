import { Prisma } from '@prisma/client'
import { prisma } from './prisma.js'
import { rotationOrderBy, type Rotation } from './rotation.js'

// Belge rezervasyonu (legacy LNGREZERVEBELGEKOD): rezervasyonlu (op.reservation) ÇIKIŞ/TRANSFER belgesine
// stok ayrılır — o stok YALNIZ o belgede okutulur/çekilir. Rezervasyon ekranından elle tetiklenir;
// belge iptalinde otomatik serbest kalır; complete kendi rezervini tüketir (movement.adjustStock).

export class ReservationError extends Error {
  constructor(message: string, public httpCode = 409) { super(message) }
}

const ZERO = new Prisma.Decimal(0)

export interface ReserveLineResult { lineNo: number; productCode: string; required: string; reserved: string; missing: string }
export interface ReserveResult { documentNo: string; lines: ReserveLineResult[]; fullyReserved: boolean }

/** Belgenin plan satırları için stok rezerve eder (FEFO/FIFO/rotasyon sıralı). Kısmi rezerv = soft (eksik raporlanır). */
export async function reserveForDocument(documentId: number, companyId: number): Promise<ReserveResult> {
  return prisma.$transaction(async (tx) => {
    const doc = await tx.tBLDOCUMENT.findFirst({
      where: { id: documentId, companyId },
      include: {
        operationType: { select: { reservation: true, direction: true, stockRotation: true, facilityId: true } },
        lines: { orderBy: { lineNo: 'asc' }, include: { product: { select: { code: true } } } },
      },
    })
    if (!doc) throw new ReservationError('Belge bulunamadı', 404)
    if (!doc.operationType.reservation) throw new ReservationError('Bu operasyon tipinde Rezervasyon işaretli değil — Operasyon Tipi › Rezervasyon parametresini açın')
    if (doc.operationType.direction !== 'OUTBOUND' && doc.operationType.direction !== 'INTERNAL') throw new ReservationError('Rezervasyon yalnız Çıkış/Transfer belgelerinde yapılır')
    if (doc.status !== 'DRAFT' && doc.status !== 'CONFIRMED') throw new ReservationError(`Belge ${doc.status} durumunda — rezervasyon yalnız açık belgede yapılır`)
    if (!doc.lines.length) throw new ReservationError('Belgede satır yok — önce plan satırlarını girin')

    const rotation = (doc.operationType.stockRotation ?? 'NONE') as Rotation
    const results: ReserveLineResult[] = []

    for (const line of doc.lines) {
      // Bu belgeye bu üründen halihazırda rezerve miktar (tekrar çağrı idempotent — üzerine tamamlar)
      const already = await tx.tBLSTOCK.aggregate({
        where: { companyId, productId: line.productId, reservedDocumentId: documentId },
        _sum: { reservedQty: true },
      })
      let need = line.quantity.sub(already._sum.reservedQty ?? ZERO)
      const required = line.quantity

      if (need.gt(0)) {
        // Aday stok: satırın kaynak lokasyonu varsa oradan, yoksa firma geneli; rotasyon sırasıyla.
        // Başka belgeye rezerveli VEYA bağsız-blokajlı satırlara DOKUNULMAZ; kendi satırlarının kalan boşluğu kullanılır.
        const candidates = await tx.tBLSTOCK.findMany({
          where: {
            companyId, productId: line.productId, mainQty: { gt: 0 },
            ...(line.sourceLocationId ? { locationId: line.sourceLocationId } : {}),
            ...(line.sourceStatusId ? { statusId: line.sourceStatusId } : {}),
            ...(line.batchNo ? { batchNo: line.batchNo } : {}), // satır lot/seri belirttiyse rezerv de ona kısıtlı
            ...(line.serialNo ? { serialNo: line.serialNo } : {}),
            OR: [
              { reservedQty: { equals: ZERO } }, // tamamen serbest satır
              { reservedDocumentId: documentId }, // zaten bu belgeye — kalan boşluğu kullan
            ],
          },
          orderBy: rotationOrderBy(rotation),
        })
        for (const s of candidates) {
          if (need.lte(0)) break
          const free = s.mainQty.sub(s.reservedQty)
          if (free.lte(0)) continue
          const take = free.gte(need) ? need : free
          await tx.tBLSTOCK.update({
            where: { id: s.id },
            data: { reservedQty: s.reservedQty.add(take), reservedDocumentId: documentId },
          })
          need = need.sub(take)
        }
      }

      const reserved = required.sub(need.gt(0) ? need : ZERO)
      results.push({
        lineNo: line.lineNo,
        productCode: line.product?.code ?? `#${line.productId}`,
        required: required.toString(),
        reserved: reserved.toString(),
        missing: need.gt(0) ? need.toString() : '0',
      })
    }

    return { documentNo: doc.documentNo, lines: results, fullyReserved: results.every((r) => r.missing === '0') }
  })
}

/** Belgenin tüm rezervlerini serbest bırakır (iptal/elle). */
export async function releaseForDocument(documentId: number, companyId: number): Promise<{ releasedRows: number }> {
  const res = await prisma.tBLSTOCK.updateMany({
    where: { companyId, reservedDocumentId: documentId },
    data: { reservedQty: 0, reservedDocumentId: null },
  })
  return { releasedRows: res.count }
}

/** Belge listesi için rezerv özeti: documentId → Σ rezerve miktar (Rezervasyon ekranı rozeti). */
export async function reservationSummary(companyId: number, documentIds: number[]): Promise<Record<number, string>> {
  if (!documentIds.length) return {}
  const rows = await prisma.tBLSTOCK.groupBy({
    by: ['reservedDocumentId'],
    where: { companyId, reservedDocumentId: { in: documentIds } },
    _sum: { reservedQty: true },
  })
  return Object.fromEntries(rows.map((r) => [r.reservedDocumentId as number, (r._sum.reservedQty ?? ZERO).toString()]))
}
