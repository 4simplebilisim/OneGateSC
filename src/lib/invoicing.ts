import { Prisma } from '@prisma/client'
import { prisma } from './prisma.js'

export class InvoicingError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'InvoicingError'
  }
}

interface InvoiceableOrder {
  currency: string
  exchangeRate: Prisma.Decimal
  subTotal: Prisma.Decimal
  discountTotal: Prisma.Decimal
  taxTotal: Prisma.Decimal
  totalAmount: Prisma.Decimal
  lines: Array<{
    productId: number
    unitId: number
    quantity: Prisma.Decimal
    unitPrice: Prisma.Decimal
    discountRate: Prisma.Decimal
    discountAmount: Prisma.Decimal
    taxRate: Prisma.Decimal
    taxAmount: Prisma.Decimal
    lineTotal: Prisma.Decimal
    note: string | null
  }>
}

async function buildInvoice(
  companyId: number,
  type: 'PURCHASE' | 'SALES',
  partnerId: number,
  sourceType: 'PURCHASE_ORDER' | 'SALES_ORDER',
  sourceId: number,
  order: InvoiceableOrder,
  invoiceNo: string,
  userId: number,
) {
  try {
    return await prisma.tBLINVOICE.create({
      data: {
        companyId,
        invoiceNo,
        type,
        partnerId,
        sourceOrderType: sourceType,
        sourceOrderId: sourceId,
        currency: order.currency,
        exchangeRate: order.exchangeRate,
        subTotal: order.subTotal,
        discountTotal: order.discountTotal,
        taxTotal: order.taxTotal,
        totalAmount: order.totalAmount,
        createdById: userId,
        lines: {
          create: order.lines.map((l, i) => ({
            lineNo: i + 1,
            companyId,
            productId: l.productId,
            unitId: l.unitId,
            quantity: l.quantity,
            unitPrice: l.unitPrice,
            discountRate: l.discountRate,
            discountAmount: l.discountAmount,
            taxRate: l.taxRate,
            taxAmount: l.taxAmount,
            lineTotal: l.lineTotal,
            note: l.note ?? undefined,
          })),
        },
      },
      include: { lines: { orderBy: { lineNo: 'asc' } } },
    })
  } catch (err) {
    if ((err as { code?: string }).code === 'P2002') throw new InvoicingError('Fatura no zaten kullanımda')
    throw err
  }
}

export async function createInvoiceFromPurchaseOrder(companyId: number, poId: number, invoiceNo: string, userId: number) {
  const po = await prisma.tBLPURCHASEORDER.findFirst({ where: { id: poId, companyId }, include: { lines: { orderBy: { lineNo: 'asc' } } } })
  if (!po) throw new InvoicingError('Satınalma siparişi bu firmada bulunamadı')
  return buildInvoice(companyId, 'PURCHASE', po.supplierId, 'PURCHASE_ORDER', po.id, po, invoiceNo, userId)
}

export async function createInvoiceFromSalesOrder(companyId: number, soId: number, invoiceNo: string, userId: number) {
  const so = await prisma.tBLSALESORDER.findFirst({ where: { id: soId, companyId }, include: { lines: { orderBy: { lineNo: 'asc' } } } })
  if (!so) throw new InvoicingError('Satış siparişi bu firmada bulunamadı')
  return buildInvoice(companyId, 'SALES', so.customerId, 'SALES_ORDER', so.id, so, invoiceNo, userId)
}

/** DRAFT → ISSUED */
export async function issueInvoice(id: number) {
  const inv = await prisma.tBLINVOICE.findUniqueOrThrow({ where: { id } })
  if (inv.status !== 'DRAFT') throw new InvoicingError(`Sadece DRAFT fatura kesilir (mevcut: ${inv.status})`)
  return prisma.tBLINVOICE.update({ where: { id }, data: { status: 'ISSUED' } })
}

/** Tahsilat: paidAmount += amount; totalAmount'a ulaşınca PAID. */
export async function payInvoice(id: number, amount: number) {
  return prisma.$transaction(async (tx) => {
    const inv = await tx.tBLINVOICE.findUniqueOrThrow({ where: { id } })
    if (inv.status === 'CANCELLED') throw new InvoicingError('İptal edilmiş fatura tahsil edilemez')
    if (inv.status === 'DRAFT') throw new InvoicingError('Önce faturayı kesin (issue)')
    if (inv.status === 'PAID') throw new InvoicingError('Fatura zaten ödendi')
    const newPaid = inv.paidAmount.add(new Prisma.Decimal(amount))
    const fullyPaid = newPaid.greaterThanOrEqualTo(inv.totalAmount)
    return tx.tBLINVOICE.update({ where: { id }, data: { paidAmount: newPaid, status: fullyPaid ? 'PAID' : inv.status } })
  })
}

export async function cancelInvoice(id: number) {
  const inv = await prisma.tBLINVOICE.findUniqueOrThrow({ where: { id } })
  if (inv.status === 'PAID') throw new InvoicingError('Ödenmiş fatura iptal edilemez')
  if (inv.status === 'CANCELLED') throw new InvoicingError('Fatura zaten iptal edilmiş')
  return prisma.tBLINVOICE.update({ where: { id }, data: { status: 'CANCELLED' } })
}
