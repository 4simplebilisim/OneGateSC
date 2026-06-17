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
 */
export async function nextSequence(companyId: number, code: string): Promise<{ value: number; formatted: string }> {
  return prisma.$transaction(async (tx) => {
    const seq = await tx.tBLSEQUENCE.findUnique({ where: { companyId_code: { companyId, code } } })
    if (!seq) throw new SequenceError(`Sayaç bulunamadı: ${code}`)
    if (!seq.isActive) throw new SequenceError(`Sayaç pasif: ${code}`)
    const next = (seq.currentValue < seq.startNo - 1 ? seq.startNo - 1 : seq.currentValue) + 1
    if (seq.endNo !== null && next > seq.endNo) throw new SequenceError(`Sayaç sınırı aşıldı (${code}): max ${seq.endNo}`)
    await tx.tBLSEQUENCE.update({ where: { id: seq.id }, data: { currentValue: next } })
    const formatted = `${seq.prefix ?? ''}${String(next).padStart(seq.padLength, '0')}`
    return { value: next, formatted }
  })
}
