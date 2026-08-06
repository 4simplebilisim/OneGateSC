import { Prisma } from '@prisma/client'
import { prisma } from './prisma.js'

/**
 * TOPLAMA SIRASI / KIRILIMI — TBLPICKORDERPARAMETER motoru.
 *
 * Parametre ekranı vardı, hiçbir kod okumuyordu: "tam palet şu operasyonla,
 * tam koli şununla, parçalı şununla toplanır" tanımlanıp yok sayılıyordu.
 *
 * Kırılım, toplanacak miktarın ürünün palet/koli katına tam bölünüp
 * bölünmediğine bakılarak bulunur (miktar ANA BİRİM cinsindendir):
 *   miktar % paletKatı == 0 → TAM PALET
 *   miktar % koliKatı  == 0 → TAM KOLİ
 *   aksi halde                PARÇALI
 */

export type PickGranularity = 'FULL_PALLET' | 'FULL_CASE' | 'PARTIAL'

export interface PickPlan {
  granularity: PickGranularity
  /** Kırılımı karşılayan operasyon (parametrede tanımlıysa) */
  operationTypeId: number | null
  operationCode: string | null
  /** Kırılımın birimi (palet/koli) ve bir birimdeki ana-birim miktarı */
  unitId: number | null
  unitCode: string | null
  unitMultiplier: string | null
}

const ETIKET: Record<PickGranularity, string> = {
  FULL_PALLET: 'Tam Palet',
  FULL_CASE: 'Tam Koli',
  PARTIAL: 'Parçalı',
}
export const pickGranularityLabel = (g: PickGranularity) => ETIKET[g]

/** Cariye özel parametre öncelikli, yoksa genel (businessPartnerId null). */
export async function loadPickOrderParameter(companyId: number, partnerId?: number | null) {
  const rows = await prisma.tBLPICKORDERPARAMETER.findMany({
    where: {
      companyId, isActive: true,
      ...(partnerId ? { OR: [{ businessPartnerId: partnerId }, { businessPartnerId: null }] } : { businessPartnerId: null }),
    },
    orderBy: { id: 'asc' },
  })
  if (!rows.length) return null
  return rows.find((r) => r.businessPartnerId === partnerId) ?? rows.find((r) => r.businessPartnerId == null) ?? null
}

/**
 * Bir satır için toplama kırılımı + operasyonu.
 * Parametre yoksa null döner (öneri ekranı kolonu boş görünür, davranış değişmez).
 */
export async function resolvePickPlan(
  companyId: number,
  args: { productId: number; quantity: Prisma.Decimal | number; partnerId?: number | null },
  param?: Awaited<ReturnType<typeof loadPickOrderParameter>>,
): Promise<PickPlan | null> {
  const p = param !== undefined ? param : await loadPickOrderParameter(companyId, args.partnerId)
  if (!p) return null

  const birimIds = [p.fullPalletUnitId, p.fullCaseUnitId, p.partialProductUnitId].filter((v): v is number => v != null)
  const urunBirimleri = birimIds.length
    ? await prisma.tBLPRODUCTUNIT.findMany({
        where: { productId: args.productId, unitId: { in: birimIds } },
        include: { unit: { select: { id: true, code: true } } },
      })
    : []
  const opIds = [p.fullPalletOpId, p.fullCaseOpId, p.partialProductOpId].filter((v): v is number => v != null)
  const ops = opIds.length
    ? await prisma.tBLOPERATIONTYPE.findMany({ where: { id: { in: opIds }, companyId }, select: { id: true, code: true } })
    : []
  const opOf = new Map(ops.map((o) => [o.id, o.code]))

  const qty = new Prisma.Decimal(args.quantity)
  const kat = (unitId: number | null) => {
    if (!unitId) return null
    const pu = urunBirimleri.find((u) => u.unitId === unitId)
    if (!pu) return null
    // Bir üst birimde kaç ana birim var: multiplier / divisor
    const m = new Prisma.Decimal(pu.multiplier).div(new Prisma.Decimal(pu.divisor || 1))
    return m.gt(0) ? { m, unitId, unitCode: pu.unit?.code ?? null } : null
  }
  const tamBolunur = (m: Prisma.Decimal) => qty.gt(0) && qty.mod(m).equals(0)

  const palet = kat(p.fullPalletUnitId)
  if (palet && tamBolunur(palet.m)) {
    return {
      granularity: 'FULL_PALLET', operationTypeId: p.fullPalletOpId ?? null,
      operationCode: p.fullPalletOpId ? opOf.get(p.fullPalletOpId) ?? null : null,
      unitId: palet.unitId, unitCode: palet.unitCode, unitMultiplier: palet.m.toString(),
    }
  }
  const koli = kat(p.fullCaseUnitId)
  if (koli && tamBolunur(koli.m)) {
    return {
      granularity: 'FULL_CASE', operationTypeId: p.fullCaseOpId ?? null,
      operationCode: p.fullCaseOpId ? opOf.get(p.fullCaseOpId) ?? null : null,
      unitId: koli.unitId, unitCode: koli.unitCode, unitMultiplier: koli.m.toString(),
    }
  }
  const parcali = kat(p.partialProductUnitId)
  return {
    granularity: 'PARTIAL', operationTypeId: p.partialProductOpId ?? null,
    operationCode: p.partialProductOpId ? opOf.get(p.partialProductOpId) ?? null : null,
    unitId: parcali?.unitId ?? null, unitCode: parcali?.unitCode ?? null,
    unitMultiplier: parcali?.m.toString() ?? null,
  }
}
