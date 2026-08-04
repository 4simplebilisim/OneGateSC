import type { FastifyInstance } from 'fastify'
import { prisma } from '../lib/prisma.js'
import { getCompanyId } from '../lib/company.js'
import { getMrpSuggestions } from '../lib/inventory.js'

const num = (v?: string) => (v ? Number(v) : undefined)

export async function reportRoutes(app: FastifyInstance) {
  // Stok özeti — ürün bazında toplam / rezerve / uygun
  app.get('/stock-summary', async (request) => {
    const companyId = getCompanyId(request)
    const warehouseId = num((request.query as { warehouseId?: string }).warehouseId)
    const grouped = await prisma.tBLSTOCK.groupBy({
      by: ['productId'],
      where: { companyId, ...(warehouseId ? { location: { warehouseId } } : {}) },
      _sum: { mainQty: true, reservedQty: true },
    })
    const products = await prisma.tBLPRODUCT.findMany({
      where: { id: { in: grouped.map((g) => g.productId) } },
      select: { id: true, code: true, name: true },
    })
    const pmap = new Map(products.map((p) => [p.id, p]))
    return grouped
      .map((g) => {
        const onHand = Number(g._sum.mainQty ?? 0)
        const reserved = Number(g._sum.reservedQty ?? 0)
        return {
          productId: g.productId,
          productCode: pmap.get(g.productId)?.code ?? null,
          productName: pmap.get(g.productId)?.name ?? null,
          onHand,
          reserved,
          available: onHand - reserved,
        }
      })
      .sort((a, b) => (a.productCode ?? '').localeCompare(b.productCode ?? ''))
  })

  // Depo panosu (Dashboard) özeti — depoya hizmet eden KPI'lar (satınalma/finans DEĞİL)
  app.get('/warehouse-summary', async (request) => {
    const companyId = getCompanyId(request)
    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0)
    const today = { gte: todayStart }
    const [openDocs, activeUsers, approvedToday, receiptsToday, shipmentsToday, transfersToday] = await Promise.all([
      prisma.tBLDOCUMENT.count({ where: { companyId, status: { in: ['DRAFT', 'CONFIRMED'] } } }), // açık belge (tamamlanmamış)
      prisma.tBLUSER.count({ where: { companyId, isActive: true } }), // aktif (etkin) kullanıcı
      // "Bugün" ölçütü İŞ TARİHİ (documentDate) — updatedAt kullanılıyordu, o teknik bir damga:
      // üç ay önceki bir belgeyi düzeltmek onu "bugün mal kabul" sayısına ekliyordu.
      prisma.tBLDOCUMENT.count({ where: { companyId, status: { in: ['CONFIRMED', 'COMPLETED'] }, documentDate: today } }), // bugün onaylanan/tamamlanan
      prisma.tBLDOCUMENT.count({ where: { companyId, status: 'COMPLETED', documentDate: today, operationType: { direction: 'INBOUND' } } }), // bugün mal kabul
      prisma.tBLDOCUMENT.count({ where: { companyId, status: 'COMPLETED', documentDate: today, operationType: { direction: 'OUTBOUND' } } }), // bugün sevkiyat/çıkış
      prisma.tBLDOCUMENT.count({ where: { companyId, status: 'COMPLETED', documentDate: today, operationType: { direction: 'INTERNAL' } } }), // bugün transfer
    ])
    return { openDocs, activeUsers, approvedToday, receiptsToday, shipmentsToday, transfersToday }
  })

  // Açık siparişler — tamamlanmamış PO/SO + kalan miktar
  app.get('/open-orders', async (request) => {
    const companyId = getCompanyId(request)
    const openStatuses = ['DRAFT', 'SUBMITTED', 'APPROVED'] as const
    const [pos, sos] = await Promise.all([
      prisma.tBLPURCHASEORDER.findMany({ where: { companyId, status: { in: [...openStatuses] } }, include: { lines: true } }),
      prisma.tBLSALESORDER.findMany({ where: { companyId, status: { in: [...openStatuses] } }, include: { lines: true } }),
    ])
    const poOpen = pos.map((o) => ({
      id: o.id,
      orderNo: o.orderNo,
      status: o.status,
      totalAmount: Number(o.totalAmount),
      remainingQty: o.lines.reduce((s, l) => s + Math.max(0, Number(l.quantity) - Number(l.receivedQty)), 0),
    }))
    const soOpen = sos.map((o) => ({
      id: o.id,
      orderNo: o.orderNo,
      status: o.status,
      totalAmount: Number(o.totalAmount),
      remainingQty: o.lines.reduce((s, l) => s + Math.max(0, Number(l.quantity) - Number(l.shippedQty)), 0),
    }))
    return {
      purchaseOrders: { count: poOpen.length, orders: poOpen },
      salesOrders: { count: soOpen.length, orders: soOpen },
    }
  })

  // Fatura yaşlandırma — açık (ödenmemiş/kısmi) faturalar, vadesi geçen
  app.get('/invoice-aging', async (request) => {
    const companyId = getCompanyId(request)
    const now = new Date()
    const invoices = await prisma.tBLINVOICE.findMany({ where: { companyId, status: 'ISSUED' } })
    let outstandingTotal = 0
    let overdueCount = 0
    let overdueTotal = 0
    for (const inv of invoices) {
      const outstanding = Number(inv.totalAmount) - Number(inv.paidAmount)
      outstandingTotal += outstanding
      if (inv.dueDate && inv.dueDate < now) {
        overdueCount++
        overdueTotal += outstanding
      }
    }
    return {
      openInvoiceCount: invoices.length,
      outstandingTotal: Math.round(outstandingTotal * 10000) / 10000,
      overdueCount,
      overdueTotal: Math.round(overdueTotal * 10000) / 10000,
    }
  })

  // MRP özeti — reorder gereken ürün sayısı
  app.get('/mrp-summary', async (request) => {
    const companyId = getCompanyId(request)
    const warehouseId = num((request.query as { warehouseId?: string }).warehouseId)
    const suggestions = await getMrpSuggestions(companyId, warehouseId)
    return { reorderCount: suggestions.length, suggestions }
  })
}
