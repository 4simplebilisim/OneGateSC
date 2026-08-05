import { Prisma } from '@prisma/client'
import { prisma } from './prisma.js'

/**
 * RAF BESLEME (replenishment) — TBLRACKFEEDPARAMETER motoru.
 *
 * Parametre ekranı vardı ama hiçbir kod okumuyordu: "toplama gözü boşalınca
 * rezerv stoktan besle" kuralı tanımlanıp işlemiyordu.
 *
 * Kural: bir LOKASYON GRUBU toplama alanı sayılır. O gruptaki gözlerde
 *  · onStockEmpty  → stok SIFIRLANINCA besle
 *  · capacityPercent → tanımlı kapasitenin altına düşünce besle (ör. %30)
 * Kaynak: aynı ürünün grup DIŞINDAKİ (rezerv) stokları, en çok miktardan başlayarak.
 * palletBreaking kapalıysa yalnız paletsiz/tam-palet kaynak önerilir.
 */

export interface ReplenishmentSource {
  stockId: number
  locationId: number
  locationCode: string
  availableQty: string
  palletId: number | null
  palletNo: string | null
  batchNo: string | null
}

export interface ReplenishmentNeed {
  parameterId: number
  locationId: number
  locationCode: string
  productId: number
  productCode: string
  productName: string | null
  unitId: number | null
  currentQty: string
  capacityQty: string | null
  /** Neden beslenmeli: boşaldı ya da kapasite yüzdesinin altında */
  reason: 'EMPTY' | 'BELOW_CAPACITY'
  /** Kapasiteye tamamlamak için gereken miktar (kapasite tanımlıysa) */
  neededQty: string | null
  palletBreakingAllowed: boolean
  sources: ReplenishmentSource[]
}

const D = (v: Prisma.Decimal | number | null | undefined) => new Prisma.Decimal(v ?? 0)

/** Bir lokasyon grubunun üye lokasyon id'leri. */
async function groupLocationIds(companyId: number, locationGroupId: number): Promise<number[]> {
  const rows = await prisma.tBLLOCATIONGROUPLINK.findMany({
    where: { companyId, locationGroupId }, select: { locationId: true },
  })
  return rows.map((r) => r.locationId)
}

/**
 * Lokasyon+ürün için tanımlı kapasite (TBLLOCATIONCAPACITY).
 * Önce göz+ürün, sonra göz+hepsi, sonra grup+ürün, sonra grup+hepsi.
 */
async function capacityFor(
  companyId: number, locationId: number, productId: number, productGroupId: number | null, groupIds: number[],
): Promise<Prisma.Decimal | null> {
  const caps = await prisma.tBLLOCATIONCAPACITY.findMany({
    where: {
      companyId,
      OR: [
        { locationLinkType: 'LOCATION', locationLinkCode: locationId },
        ...(groupIds.length ? [{ locationLinkType: 'LOCATION_GROUP' as const, locationLinkCode: { in: groupIds } }] : []),
      ],
    },
  })
  if (!caps.length) return null
  const puan = (c: (typeof caps)[number]) =>
    (c.locationLinkType === 'LOCATION' ? 2 : 0) +
    (c.materialLinkType === 'PRODUCT' && c.materialLinkCode === productId ? 2
      : c.materialLinkType === 'PRODUCT_GROUP' && productGroupId != null && c.materialLinkCode === productGroupId ? 1 : 0)
  const uygun = caps
    .filter((c) => !c.materialLinkType
      || (c.materialLinkType === 'PRODUCT' && c.materialLinkCode === productId)
      || (c.materialLinkType === 'PRODUCT_GROUP' && productGroupId != null && c.materialLinkCode === productGroupId))
    .sort((a, b) => puan(b) - puan(a))[0]
  return uygun?.quantity ?? null
}

/**
 * Beslenmesi gereken gözler + kaynak önerileri.
 * opts.partnerId verilirse o cariye özel parametreler de dikkate alınır.
 */
export async function suggestReplenishment(
  companyId: number,
  opts: { partnerId?: number | null; locationGroupId?: number | null; limit?: number } = {},
): Promise<ReplenishmentNeed[]> {
  const params = await prisma.tBLRACKFEEDPARAMETER.findMany({
    where: {
      companyId, isActive: true,
      ...(opts.locationGroupId ? { locationGroupId: opts.locationGroupId } : {}),
      // Cari kapsamı: genel (null) + verilen cariye özel
      ...(opts.partnerId ? { OR: [{ businessPartnerId: null }, { businessPartnerId: opts.partnerId }] } : {}),
    },
    orderBy: { id: 'asc' },
  })
  if (!params.length) return []

  const out: ReplenishmentNeed[] = []
  const limit = opts.limit ?? 200

  for (const p of params) {
    if (!p.locationGroupId) continue // grup tanımsızsa hangi gözler toplama alanı belli değil
    const toplamaLokIds = await groupLocationIds(companyId, p.locationGroupId)
    if (!toplamaLokIds.length) continue

    // Toplama alanındaki mevcut stok (ürün × lokasyon)
    const mevcut = await prisma.tBLSTOCK.groupBy({
      by: ['locationId', 'productId', 'unitId'],
      where: { companyId, locationId: { in: toplamaLokIds } },
      _sum: { mainQty: true },
    })

    // Bu alanda DAHA ÖNCE görülmüş ürünler: göz boşalsa bile hangi ürünün oraya ait olduğunu
    // hareket defterinden biliyoruz (aksi halde boş göz için ürün belirlenemezdi).
    const gecmis = await prisma.tBLSTOCKLEDGER.groupBy({
      by: ['locationId', 'productId', 'unitId'],
      where: { companyId, locationId: { in: toplamaLokIds } },
      _max: { createdAt: true },
    })

    // ürün×lokasyon birleşimi: mevcut stok + geçmişte görülmüş (şu an boş) gözler
    const anahtar = (l: number, u: number) => `${l}:${u}`
    const harita = new Map<string, { locationId: number; productId: number; unitId: number | null; qty: Prisma.Decimal }>()
    for (const g of gecmis) harita.set(anahtar(g.locationId, g.productId), { locationId: g.locationId, productId: g.productId, unitId: g.unitId, qty: new Prisma.Decimal(0) })
    for (const m of mevcut) harita.set(anahtar(m.locationId, m.productId), { locationId: m.locationId, productId: m.productId, unitId: m.unitId, qty: D(m._sum.mainQty) })

    const urunIds = [...new Set([...harita.values()].map((v) => v.productId))]
    const lokIds = [...new Set([...harita.values()].map((v) => v.locationId))]
    const [urunler, lokasyonlar] = await Promise.all([
      prisma.tBLPRODUCT.findMany({ where: { id: { in: urunIds } }, select: { id: true, code: true, name: true, productGroupId: true } }),
      prisma.tBLLOCATION.findMany({ where: { id: { in: lokIds } }, select: { id: true, code: true } }),
    ])
    const urunOf = new Map(urunler.map((u) => [u.id, u]))
    const lokOf = new Map(lokasyonlar.map((l) => [l.id, l]))

    for (const v of harita.values()) {
      if (out.length >= limit) return out
      const urun = urunOf.get(v.productId)
      const lok = lokOf.get(v.locationId)
      if (!urun || !lok) continue

      const kapasite = await capacityFor(companyId, v.locationId, v.productId, urun.productGroupId, [p.locationGroupId])
      let neden: 'EMPTY' | 'BELOW_CAPACITY' | null = null
      if (p.onStockEmpty && v.qty.lte(0)) neden = 'EMPTY'
      else if (p.capacityPercent && kapasite && kapasite.gt(0)) {
        const esik = kapasite.mul(D(p.capacityPercent)).div(100)
        if (v.qty.lt(esik)) neden = 'BELOW_CAPACITY'
      }
      if (!neden) continue

      // Kaynak: aynı ürünün TOPLAMA ALANI DIŞINDAKİ stokları (rezerv), çoktan aza
      const kaynaklar = await prisma.tBLSTOCK.findMany({
        where: {
          companyId, productId: v.productId, mainQty: { gt: 0 },
          locationId: { notIn: toplamaLokIds },
          // Palet kırma kapalıysa paletli kaynak önerilmez (paleti bölmek gerekirdi)
          ...(p.palletBreaking ? {} : { palletId: null }),
        },
        include: { location: { select: { code: true } }, pallet: { select: { palletNo: true } } },
        orderBy: { mainQty: 'desc' },
        take: 5,
      })

      out.push({
        parameterId: p.id,
        locationId: v.locationId, locationCode: lok.code,
        productId: urun.id, productCode: urun.code, productName: urun.name,
        unitId: v.unitId,
        currentQty: v.qty.toString(),
        capacityQty: kapasite ? kapasite.toString() : null,
        reason: neden,
        neededQty: kapasite ? kapasite.sub(v.qty).toString() : null,
        palletBreakingAllowed: p.palletBreaking,
        sources: kaynaklar.map((k) => ({
          stockId: k.id, locationId: k.locationId, locationCode: k.location.code,
          availableQty: k.mainQty.toString(), palletId: k.palletId,
          palletNo: k.pallet?.palletNo ?? null, batchNo: k.batchNo,
        })),
      })
    }
  }
  return out
}
