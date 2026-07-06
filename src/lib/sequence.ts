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
    const seq = await tx.tBLSEQUENCE.findUnique({ where: { companyId_code: { companyId, code } } })
    if (!seq) throw new SequenceError(`Sayaç bulunamadı: ${code}`)
    if (!seq.isActive) throw new SequenceError(`Sayaç pasif: ${code}`)
    const next = (seq.currentValue < seq.startNo - 1 ? seq.startNo - 1 : seq.currentValue) + 1
    if (seq.endNo !== null && next > seq.endNo) throw new SequenceError(`Sayaç sınırı aşıldı (${code}): max ${seq.endNo}`)
    await tx.tBLSEQUENCE.update({ where: { id: seq.id }, data: { currentValue: next } })
    const formatted = `${seq.prefix ?? ''}${String(next).padStart(seq.padLength, '0')}`
    return { value: next, formatted }
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
