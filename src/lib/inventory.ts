import { Prisma } from '@prisma/client'
import { prisma } from './prisma.js'
import { computeLineFinance, computeOrderTotals } from './orderFinance.js'

export class InventoryError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'InventoryError'
  }
}

const ZERO = new Prisma.Decimal(0)

export interface MrpSuggestion {
  productId: number
  productCode: string
  productName: string
  warehouseId: number
  warehouseCode: string
  onHand: string
  reserved: string
  available: string
  minQty: string
  maxQty: string
  reorderPoint: string
  suggestedQty: string
}

/**
 * MRP: aktif min/max kurallarını tara, her ürün×depo için eldeki stoğu topla,
 * uygun (onHand−reserved) ≤ reorderPoint ise reorder öner.
 * Önerilen miktar = reorderQty (verilmişse) yoksa maxQty − available.
 */
export async function getMrpSuggestions(companyId: number, warehouseId?: number): Promise<MrpSuggestion[]> {
  const rules = await prisma.tBLINVENTORYRULE.findMany({
    where: { companyId, isActive: true, ...(warehouseId ? { warehouseId } : {}) },
    include: {
      product: { select: { code: true, name: true } },
      warehouse: { select: { code: true } },
    },
  })

  const out: MrpSuggestion[] = []
  for (const rule of rules) {
    const agg = await prisma.tBLSTOCK.aggregate({
      where: { companyId, productId: rule.productId, location: { warehouseId: rule.warehouseId } },
      _sum: { mainQty: true, reservedQty: true },
    })
    const onHand = agg._sum.mainQty ?? ZERO
    const reserved = agg._sum.reservedQty ?? ZERO
    const available = onHand.sub(reserved)

    if (available.lessThanOrEqualTo(rule.reorderPoint)) {
      let suggested = rule.reorderQty.greaterThan(0) ? rule.reorderQty : rule.maxQty.sub(available)
      if (suggested.lessThan(0)) suggested = ZERO
      out.push({
        productId: rule.productId,
        productCode: rule.product.code,
        productName: rule.product.name,
        warehouseId: rule.warehouseId,
        warehouseCode: rule.warehouse.code,
        onHand: onHand.toString(),
        reserved: reserved.toString(),
        available: available.toString(),
        minQty: rule.minQty.toString(),
        maxQty: rule.maxQty.toString(),
        reorderPoint: rule.reorderPoint.toString(),
        suggestedQty: suggested.toString(),
      })
    }
  }
  return out
}

/**
 * MRP önerilerinden taslak (DRAFT) satınalma siparişi üretir — inventory → procurement köprüsü.
 * Fiyatlar 0 (taslak; satınalma sonradan fiyatlandırır).
 */
export async function createPurchaseOrderFromMrp(
  companyId: number,
  warehouseId: number,
  supplierId: number,
  userId: number,
  now: Date,
) {
  const suggestions = await getMrpSuggestions(companyId, warehouseId)
  if (suggestions.length === 0) throw new InventoryError('Reorder gereken ürün yok')

  const products = await prisma.tBLPRODUCT.findMany({
    where: { companyId, id: { in: suggestions.map((s) => s.productId) } },
    select: { id: true, unitId: true },
  })
  const unitOf = new Map(products.map((p) => [p.id, p.unitId]))

  const lines = suggestions.map((s, i) => {
    const fin = computeLineFinance({ quantity: Number(s.suggestedQty), unitPrice: 0 })
    return {
      lineNo: i + 1,
      productId: s.productId,
      unitId: unitOf.get(s.productId)!,
      quantity: Number(s.suggestedQty),
      ...fin,
    }
  })
  const totals = computeOrderTotals(lines)

  return prisma.tBLPURCHASEORDER.create({
    data: {
      companyId,
      orderNo: `MRP-${warehouseId}-${now.getTime()}`,
      supplierId,
      warehouseId,
      createdById: userId,
      status: 'DRAFT',
      note: 'MRP otomatik önerisi',
      ...totals,
      lines: { create: lines.map((l) => ({ ...l, companyId })) },
    },
    include: { lines: true },
  })
}
