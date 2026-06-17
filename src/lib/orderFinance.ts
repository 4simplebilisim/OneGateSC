/**
 * Sipariş satırı finans hesabı — satınalma ve satışta ortak.
 * gross = miktar × birim fiyat
 * iskonto = gross × iskontoOranı%   → net = gross − iskonto
 * vergi   = net × vergiOranı%       → satırToplam = net + vergi
 * Tutarlar 4 ondalığa yuvarlanır.
 */

const round4 = (n: number) => Math.round(n * 10000) / 10000

export interface FinanceLineInput {
  quantity: number
  unitPrice?: number
  discountRate?: number
  taxRate?: number
}

export interface FinanceLineResult {
  unitPrice: number
  discountRate: number
  discountAmount: number
  taxRate: number
  taxAmount: number
  lineTotal: number
}

export function computeLineFinance(input: FinanceLineInput): FinanceLineResult {
  const unitPrice = input.unitPrice ?? 0
  const discountRate = input.discountRate ?? 0
  const taxRate = input.taxRate ?? 0
  const gross = input.quantity * unitPrice
  const discountAmount = round4((gross * discountRate) / 100)
  const net = gross - discountAmount
  const taxAmount = round4((net * taxRate) / 100)
  const lineTotal = round4(net + taxAmount)
  return { unitPrice, discountRate, discountAmount, taxRate, taxAmount, lineTotal }
}

export interface OrderTotals {
  subTotal: number
  discountTotal: number
  taxTotal: number
  totalAmount: number
}

export function computeOrderTotals(lines: Array<{ quantity: number } & FinanceLineResult>): OrderTotals {
  let subTotal = 0
  let discountTotal = 0
  let taxTotal = 0
  for (const l of lines) {
    const gross = l.quantity * l.unitPrice
    discountTotal += l.discountAmount
    subTotal += gross - l.discountAmount
    taxTotal += l.taxAmount
  }
  return {
    subTotal: round4(subTotal),
    discountTotal: round4(discountTotal),
    taxTotal: round4(taxTotal),
    totalAmount: round4(subTotal + taxTotal),
  }
}
