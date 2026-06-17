import { prisma } from './prisma.js'

export interface SuggestedLocation {
  id: number
  code: string
  name: string | null
  warehouseId: number
  viaRuleId: number
  matchedBy: 'PRODUCT' | 'PRODUCT_GROUP'
  viaLocationGroupId?: number
}

/**
 * Directed putaway — bir ürün için yönlendirme kurallarından önerilen lokasyon(lar)ı döndürür.
 * Kural eşleşmesi: ürün doğrudan (PRODUCT) veya ürün grubu (PRODUCT_GROUP) üzerinden.
 * Hedef: tek lokasyon (LOCATION) veya lokasyon grubunun üyeleri (LOCATION_GROUP).
 * Öncelik (priority) sırasına göre, tekrar eden lokasyonlar tekilleştirilir.
 */
export async function suggestPutawayLocations(companyId: number, productId: number): Promise<SuggestedLocation[]> {
  const product = await prisma.tBLPRODUCT.findFirst({ where: { id: productId, companyId } })
  if (!product) return []

  const rules = await prisma.tBLROUTINGRULE.findMany({
    where: {
      companyId,
      isActive: true,
      OR: [
        { materialLinkType: 'PRODUCT', materialLinkCode: productId },
        ...(product.productGroupId ? [{ materialLinkType: 'PRODUCT_GROUP' as const, materialLinkCode: product.productGroupId }] : []),
      ],
    },
    orderBy: [{ priority: 'asc' }, { id: 'asc' }],
  })

  const out: SuggestedLocation[] = []
  const seen = new Set<number>()
  const push = (loc: { id: number; code: string; name: string | null; warehouseId: number }, ruleId: number, matchedBy: 'PRODUCT' | 'PRODUCT_GROUP', groupId?: number) => {
    if (seen.has(loc.id)) return
    seen.add(loc.id)
    out.push({ id: loc.id, code: loc.code, name: loc.name, warehouseId: loc.warehouseId, viaRuleId: ruleId, matchedBy, viaLocationGroupId: groupId })
  }

  for (const rule of rules) {
    if (rule.locationLinkType === 'LOCATION') {
      const loc = await prisma.tBLLOCATION.findFirst({ where: { id: rule.locationLinkCode, companyId } })
      if (loc) push(loc, rule.id, rule.materialLinkType)
    } else {
      const links = await prisma.tBLLOCATIONGROUPLINK.findMany({
        where: { locationGroupId: rule.locationLinkCode, companyId },
        include: { location: true },
      })
      for (const l of links) push(l.location, rule.id, rule.materialLinkType, rule.locationLinkCode)
    }
  }
  return out
}
