import type { Prisma } from '@prisma/client'
import { prisma } from './prisma.js'

export class SequenceError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'SequenceError'
  }
}

/**
 * Sayacın bir sonraki numarasını üretir (atomik): currentValue++ ve önekle formatlar.
 * Örn. prefix="GR-", padLength=6 → "GR-000123". endNo aşılırsa hata.
 * client verilirse (mevcut transaction) onun içinde çalışır — dış tx ile ATOMİK (rollback'te numara yanmaz);
 * verilmezse kendi transaction'ını açar (mevcut çağıranlar değişmez).
 */
export async function nextSequence(companyId: number, code: string, client?: Prisma.TransactionClient): Promise<{ value: number; formatted: string }> {
  const run = async (tx: Prisma.TransactionClient) => {
    // ATOMİK artırım: oku-sonra-yaz yerine tek UPDATE ... RETURNING.
    // READ COMMITTED altında iki eşzamanlı istek aynı currentValue'yu okuyup aynı
    // numarayı üretiyordu → belge no unique çakışması (10 paralelde 8'i 409 düşüyordu).
    // UPDATE satırı kilitler; ikinci istek kilidi bekleyip GÜNCEL değeri görür.
    const rows = await tx.$queryRaw<Array<{ currentValue: number; prefix: string | null; padLength: number; endNo: number | null }>>`
      UPDATE wms."TBLSEQUENCE"
         SET "currentValue" = GREATEST("currentValue", "startNo" - 1) + 1,
             "updatedAt"    = now()
       WHERE "companyId" = ${companyId} AND "code" = ${code} AND "isActive" = true
      RETURNING "currentValue", "prefix", "padLength", "endNo"
    `
    const row = rows[0]
    if (!row) {
      // Yalnız hata yolunda ek sorgu: sayaç yok mu, pasif mi — mesaj net olsun
      const seq = await tx.tBLSEQUENCE.findUnique({ where: { companyId_code: { companyId, code } } })
      if (!seq) throw new SequenceError(`Sayaç bulunamadı: ${code}`)
      throw new SequenceError(`Sayaç pasif: ${code}`)
    }
    const { currentValue: next, prefix, padLength, endNo } = row
    // Sınır aşıldıysa fırlat — artırım bu transaction'da geri alınır (numara yanmaz)
    if (endNo !== null && next > endNo) throw new SequenceError(`Sayaç sınırı aşıldı (${code}): max ${endNo}`)
    return { value: next, formatted: `${prefix ?? ''}${String(next).padStart(padLength, '0')}` }
  }
  return client ? run(client) : prisma.$transaction(run)
}

/** İş Emri sayacı ('WO') yoksa kurar (idempotent). WorkOrderCreate otomatik no + sales→iş emri için gerekli.
 *  Firma-create'e bağlı + backfill script'iyle mevcut firmalara koşulur. */
export async function ensureWorkOrderSequence(companyId: number): Promise<void> {
  await prisma.tBLSEQUENCE.upsert({
    where: { companyId_code: { companyId, code: 'WO' } },
    update: {},
    create: { companyId, code: 'WO', name: 'İş Emri', prefix: 'WO', padLength: 6, isAutomatic: true },
  })
}
