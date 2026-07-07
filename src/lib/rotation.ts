import { Prisma } from '@prisma/client'
import { prisma } from './prisma.js'

// Stok rotasyonu (operasyon tipi stockRotation): çıkış toplamada hangi lot önce alınır.
// FEFO = SKT (expiryDate) en yakın önce · FIFO = üretim tarihi en eski önce · NONE = giriş (id) sırası.
export type Rotation = 'NONE' | 'FIFO' | 'FEFO'

/** Stok seçim sıralaması (öneri + tahsis). Postgres 'asc' NULL'ları SONA atar → tarihsiz lotlar en sona. */
export function rotationOrderBy(strategy: Rotation): Prisma.TBLSTOCKOrderByWithRelationInput[] {
  if (strategy === 'FEFO') return [{ expiryDate: 'asc' }, { id: 'asc' }]
  if (strategy === 'FIFO') return [{ productionDate: 'asc' }, { id: 'asc' }]
  return [{ id: 'asc' }]
}

/**
 * "Öner + uyar" (soft): operatör kaynak lokasyonda daha eski bir lot dururken daha yeni lotu okuttuysa uyarı döner.
 * Bloklamaz — yalnız bilgilendirir (null = uyarı yok). Tarihsiz stok varsa/karşılaştırılamıyorsa sessiz geçer.
 */
export async function rotationWarning(opts: {
  companyId: number
  strategy: Rotation
  productId: number
  sourceLocationId: number
  pickedExpiry?: Date | null
  pickedProduction?: Date | null
  pickedBatchNo?: string | null // okutulan lotun tarihi verilmediyse (çıkışta olağan) stoktan çözülür
}): Promise<string | null> {
  const { companyId, strategy, productId, sourceLocationId, pickedExpiry, pickedProduction, pickedBatchNo } = opts
  if (strategy === 'NONE') return null
  const base = { companyId, productId, locationId: sourceLocationId, mainQty: { gt: 0 } }

  // Bu lokasyondaki en erken tarihli uygun lot (picked lot dahil)
  const earliest =
    strategy === 'FEFO'
      ? await prisma.tBLSTOCK.findFirst({ where: { ...base, expiryDate: { not: null } }, orderBy: { expiryDate: 'asc' }, select: { expiryDate: true, batchNo: true } })
      : await prisma.tBLSTOCK.findFirst({ where: { ...base, productionDate: { not: null } }, orderBy: { productionDate: 'asc' }, select: { productionDate: true, batchNo: true } })
  const earliestDate = strategy === 'FEFO' ? (earliest as { expiryDate: Date | null } | null)?.expiryDate : (earliest as { productionDate: Date | null } | null)?.productionDate
  if (!earliestDate) return null // bu lokasyonda tarihli stok yok → rotasyon uygulanamaz

  // Okutulan lotun tarihi: (1) okutmada verildiyse o; yoksa (2) lot no ile stoktan çöz. Çözülemezse yanlış-pozitif üretme → sessiz geç.
  let picked = strategy === 'FEFO' ? pickedExpiry ?? null : pickedProduction ?? null
  if (picked == null && pickedBatchNo) {
    const pk = await prisma.tBLSTOCK.findFirst({ where: { ...base, batchNo: pickedBatchNo }, select: { expiryDate: true, productionDate: true } })
    picked = strategy === 'FEFO' ? pk?.expiryDate ?? null : pk?.productionDate ?? null
  }
  if (picked == null) return null // okutulan lotun tarihi çözülemedi → uyarı yok
  if (picked.getTime() <= earliestDate.getTime()) return null // en erken (veya daha erken) lotu okuttu → OK

  const lbl = strategy === 'FEFO' ? 'SKT' : 'üretim'
  const lot = earliest?.batchNo ? `, lot ${earliest.batchNo}` : ''
  return `Rotasyon (${strategy}): bu lokasyonda daha eski bir lot var (${lbl} ${earliestDate.toISOString().slice(0, 10)}${lot}) — önce onu toplayın.`
}
