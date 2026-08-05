import { prisma } from './prisma.js'

export interface SuggestedLocation {
  id: number
  code: string
  name: string | null
  warehouseId: number
  viaRuleId: number
  matchedBy: 'PRODUCT' | 'PRODUCT_GROUP'
  viaLocationGroupId?: number
  viaRoutingTypeId?: number | null
}

/** Yönlendirmenin nasıl davranacağı (TBLROUTINGPARAMETER'dan çözülür). */
export interface RoutingPolicy {
  /** Uymayan lokasyon: ERROR = işlem durur, WARNING = geçer. Tanım yoksa ERROR (mevcut davranış korunur). */
  messageType: 'ERROR' | 'WARNING'
  /** Koşul kırma açıksa şifre+neden ile aşılabilir. */
  conditionBreak: boolean
  /** Kuralı üreten parametre satırı (log/mesaj için). */
  parameterId?: number
}

const VARSAYILAN_POLITIKA: RoutingPolicy = { messageType: 'ERROR', conditionBreak: false }

type Kapsam = 'ALL' | 'GROUP' | 'SPECIFIC' | null | undefined
const kapsamUyar = (tip: Kapsam, kapsamId: number | null, id: number | null, grupId: number | null) => {
  if (!tip || tip === 'ALL') return true
  if (tip === 'SPECIFIC') return kapsamId != null && kapsamId === id
  if (tip === 'GROUP') return kapsamId != null && kapsamId === grupId
  return true
}

/**
 * Bir operasyon için geçerli YÖNLENDİRME TİPİ id'leri (TBLROUTINGTYPEOPERATION).
 * Eşleme yoksa null → "tip ayrımı yapma, tüm kurallar geçerli" (geriye dönük).
 *
 * Bu katman önceden hiç okunmuyordu: hangi kuralın hangi operasyonda geçerli
 * olduğu ekranda tanımlanıyordu ama motor tüm kuralları her operasyona uyguluyordu.
 */
export async function routingTypeIdsForOperation(
  companyId: number, operationTypeId?: number | null, facilityId?: number | null,
): Promise<number[] | null> {
  if (!operationTypeId) return null
  const esleme = await prisma.tBLROUTINGTYPEOPERATION.findMany({
    where: {
      companyId, operationTypeId, isActive: true,
      ...(facilityId != null ? { OR: [{ facilityId }, { facilityId: null }] } : {}),
    },
    select: { routingTypeId: true },
  })
  if (!esleme.length) return null
  return [...new Set(esleme.map((e) => e.routingTypeId))]
}

/**
 * Yönlendirme davranışı (TBLROUTINGPARAMETER) — cari/malzeme kapsamına göre ilk uygun satır.
 * Tanım yoksa ERROR: bugünkü sert davranış korunur, kimsenin akışı sessizce gevşemez.
 */
export async function resolveRoutingPolicy(
  companyId: number,
  ctx: {
    routingTypeIds?: number[] | null
    partnerId?: number | null; partnerGroupId?: number | null
    productId?: number | null; productGroupId?: number | null
  },
): Promise<RoutingPolicy> {
  const params = await prisma.tBLROUTINGPARAMETER.findMany({
    where: { companyId, ...(ctx.routingTypeIds?.length ? { routingTypeId: { in: ctx.routingTypeIds } } : {}) },
    orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
  })
  if (!params.length) return VARSAYILAN_POLITIKA

  const uygun = params.find((p) =>
    kapsamUyar(p.cariLinkType as Kapsam, p.cariLinkId, ctx.partnerId ?? null, ctx.partnerGroupId ?? null) &&
    kapsamUyar(p.materialLinkType as Kapsam, p.materialLinkId, ctx.productId ?? null, ctx.productGroupId ?? null))
  if (!uygun) return VARSAYILAN_POLITIKA
  return {
    messageType: uygun.messageType === 'WARNING' ? 'WARNING' : 'ERROR',
    conditionBreak: uygun.conditionBreak,
    parameterId: uygun.id,
  }
}

/**
 * Directed putaway — bir ürün için önerilen lokasyon(lar).
 * Kural eşleşmesi: ürün doğrudan (PRODUCT) veya ürün grubu (PRODUCT_GROUP).
 * Hedef: tek lokasyon (LOCATION) veya lokasyon grubunun üyeleri (LOCATION_GROUP).
 * Öncelik (priority) sırasına göre, tekrar eden lokasyonlar tekilleştirilir.
 *
 * opts.operationTypeId verilirse YÖNLENDİRME TİPİ eşlemesi uygulanır: yalnız o
 * operasyona bağlı tiplerin kuralları (+ tipsiz genel kurallar). Eşleme yoksa
 * tüm kurallar geçerlidir.
 */
export async function suggestPutawayLocations(
  companyId: number,
  productId: number,
  opts: { operationTypeId?: number | null; facilityId?: number | null } = {},
): Promise<SuggestedLocation[]> {
  const product = await prisma.tBLPRODUCT.findFirst({ where: { id: productId, companyId } })
  if (!product) return []

  const tipIds = await routingTypeIdsForOperation(companyId, opts.operationTypeId, opts.facilityId)

  const rules = await prisma.tBLROUTINGRULE.findMany({
    where: {
      companyId,
      isActive: true,
      // Operasyona bağlı tip(ler) varsa: o tiplerin kuralları + tipi olmayan (genel) kurallar
      ...(tipIds ? { OR: [{ routingTypeId: { in: tipIds } }, { routingTypeId: null }] } : {}),
      AND: [{
        OR: [
          { materialLinkType: 'PRODUCT', materialLinkCode: productId },
          ...(product.productGroupId ? [{ materialLinkType: 'PRODUCT_GROUP' as const, materialLinkCode: product.productGroupId }] : []),
        ],
      }],
    },
    orderBy: [{ priority: 'asc' }, { id: 'asc' }],
  })

  const out: SuggestedLocation[] = []
  const seen = new Set<number>()
  const push = (
    loc: { id: number; code: string; name: string | null; warehouseId: number },
    ruleId: number, matchedBy: 'PRODUCT' | 'PRODUCT_GROUP', routingTypeId: number | null, groupId?: number,
  ) => {
    if (seen.has(loc.id)) return
    seen.add(loc.id)
    out.push({
      id: loc.id, code: loc.code, name: loc.name, warehouseId: loc.warehouseId,
      viaRuleId: ruleId, matchedBy, viaLocationGroupId: groupId, viaRoutingTypeId: routingTypeId,
    })
  }

  for (const rule of rules) {
    if (rule.locationLinkType === 'LOCATION') {
      const loc = await prisma.tBLLOCATION.findFirst({ where: { id: rule.locationLinkCode, companyId } })
      if (loc) push(loc, rule.id, rule.materialLinkType, rule.routingTypeId)
    } else {
      const links = await prisma.tBLLOCATIONGROUPLINK.findMany({
        where: { locationGroupId: rule.locationLinkCode, companyId },
        include: { location: true },
      })
      for (const l of links) push(l.location, rule.id, rule.materialLinkType, rule.routingTypeId, rule.locationLinkCode)
    }
  }

  // Operasyon eşlemesinde lokasyon kısıtı varsa öneriyi daralt
  // (TBLROUTINGTYPEOPERATION: Lok. Bağlantı Tipi = Belirli / Grup)
  if (opts.operationTypeId && out.length) {
    const kisitlar = await prisma.tBLROUTINGTYPEOPERATION.findMany({
      where: {
        companyId, operationTypeId: opts.operationTypeId, isActive: true,
        locationLinkType: { not: null }, locationId: { not: null },
        ...(opts.facilityId != null ? { OR: [{ facilityId: opts.facilityId }, { facilityId: null }] } : {}),
      },
      select: { locationLinkType: true, locationId: true },
    })
    if (kisitlar.length) {
      const izinli = new Set<number>()
      for (const k of kisitlar) {
        if (!k.locationId) continue
        if (k.locationLinkType === 'SPECIFIC') izinli.add(k.locationId)
        else if (k.locationLinkType === 'GROUP') {
          const uyeler = await prisma.tBLLOCATIONGROUPLINK.findMany({
            where: { companyId, locationGroupId: k.locationId }, select: { locationId: true },
          })
          uyeler.forEach((u) => izinli.add(u.locationId))
        }
      }
      if (izinli.size) return out.filter((o) => izinli.has(o.id))
    }
  }
  return out
}
