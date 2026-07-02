import { prisma } from './prisma.js'

// FK doğrulama — çapraz-firma izolasyonu: bir FK'nin referans ettiği kayıt AYNI firmaya ait olmalı.
// Prisma FK yalnız varlığı kontrol eder, companyId'yi DEĞİL → başka firmanın kaydı referanslanabiliyordu.

type FindFirst = { findFirst(a: { where: { id: number; companyId: number }; select: { id: true } }): Promise<{ id: number } | null> }
// Doğrulanabilir modeller (cast burada kapsanır — çağıran taraf sade kalır)
const MODELS = {
  facility: prisma.tBLFACILITY, area: prisma.tBLAREA, warehouse: prisma.tBLWAREHOUSE, unit: prisma.tBLUNIT,
  productGroup: prisma.tBLPRODUCTGROUP, productSubGroup: prisma.tBLPRODUCTSUBGROUP,
  productType: prisma.tBLPRODUCTTYPE, productDetailType: prisma.tBLPRODUCTDETAILTYPE,
  partnerGroup: prisma.tBLPARTNERGROUP, region: prisma.tBLREGION, partner: prisma.tBLBUSINESSPARTNER,
  product: prisma.tBLPRODUCT, user: prisma.tBLUSER, userGroup: prisma.tBLUSERGROUP,
  operationType: prisma.tBLOPERATIONTYPE,
} as unknown as Record<string, FindFirst>

export type RefModel = 'facility' | 'area' | 'warehouse' | 'unit' | 'productGroup' | 'productSubGroup' | 'productType' | 'productDetailType' | 'partnerGroup' | 'region' | 'partner' | 'product' | 'user' | 'userGroup' | 'operationType'
type Ref = [label: string, model: RefModel, id: number | null | undefined]

/** İlk çapraz-firma/geçersiz FK'nin etiketini döner (hepsi geçerli/boş ise null). null/undefined id atlanır (opsiyonel). */
export async function firstBadRef(companyId: number, refs: Ref[]): Promise<string | null> {
  for (const [label, model, id] of refs) {
    if (id == null) continue
    const del = MODELS[model]!
    if (!(await del.findFirst({ where: { id, companyId }, select: { id: true } }))) return label
  }
  return null
}

/** Bir alanın (areaId) verilen depoya (warehouseId) ait olup olmadığı — hiyerarşi tutarlılığı (aynı firma). */
export async function areaBelongsToWarehouse(companyId: number, areaId: number | null | undefined, warehouseId: number | null | undefined): Promise<boolean> {
  if (areaId == null || warehouseId == null) return true
  const area = await prisma.tBLAREA.findFirst({ where: { id: areaId, companyId }, select: { warehouseId: true } })
  return !!area && area.warehouseId === warehouseId
}

/** Cari zincir (parentId): self-referans veya döngü (A→B→A) oluşur mu? → 'self' | 'cycle' | null. */
export async function partnerParentIssue(companyId: number, partnerId: number, newParentId: number | null | undefined): Promise<'self' | 'cycle' | null> {
  if (newParentId == null) return null
  if (newParentId === partnerId) return 'self'
  let cur: number | null = newParentId
  const seen = new Set<number>()
  while (cur != null) {
    if (cur === partnerId) return 'cycle'
    if (seen.has(cur)) return null // önceden var olan döngü (bizim eklediğimiz değil) — sonsuz döngüyü kır
    seen.add(cur)
    const p: { parentId: number | null } | null = await prisma.tBLBUSINESSPARTNER.findFirst({ where: { id: cur, companyId }, select: { parentId: true } })
    cur = p?.parentId ?? null
  }
  return null
}
