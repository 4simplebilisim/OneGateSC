import { prisma } from './prisma.js'

/** Belge Durumu kodunu (BKL/TPL/OBK/ONY/IPT) firma bazında id'ye çözer. Tanımlı değilse null. */
export async function docStatusId(companyId: number, code: string): Promise<number | null> {
  const row = await prisma.tBLDOCUMENTSTATUS.findFirst({ where: { companyId, code }, select: { id: true } })
  return row?.id ?? null
}

// Belge yaşam döngüsü kodları
export const DOC_STATUS = { WAITING: 'BKL', PICKING: 'TPL', PENDING_APPROVAL: 'OBK', APPROVED: 'ONY', CANCELLED: 'IPT' } as const
