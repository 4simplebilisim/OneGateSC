import { prisma } from './prisma.js'

// Genel parametre okuyucu (TBLPARAMETER, rehber kodlarıyla) — davranış süren parametrelerin TEK kapısı.
// Değer yoksa/pasifse null; sayı bekleyenler için getParamInt (geçersiz sayı = null → özellik devre dışı).

export async function getParam(companyId: number, code: string): Promise<string | null> {
  const row = await prisma.tBLPARAMETER.findFirst({ where: { companyId, code, isActive: true }, select: { value: true } })
  const v = row?.value?.trim()
  return v ? v : null
}

export async function getParamInt(companyId: number, code: string): Promise<number | null> {
  const v = await getParam(companyId, code)
  if (v == null) return null
  const n = Number(v.replace(',', '.'))
  return Number.isFinite(n) ? n : null
}
