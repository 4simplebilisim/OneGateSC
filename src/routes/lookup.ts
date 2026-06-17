import type { FastifyInstance } from 'fastify'
import { prisma } from '../lib/prisma.js'
import { getCompanyId } from '../lib/company.js'

/** Mobil/el terminali — barkod → ürün + birim + stok özeti. */
export async function lookupRoutes(app: FastifyInstance) {
  app.get('/barcode', async (request, reply) => {
    const code = String((request.query as { code?: string }).code ?? '').trim()
    if (!code) return reply.code(400).send({ error: 'code gerekli' })
    const companyId = getCompanyId(request)

    // Barkod tek kaynak = ürün-birim çoklu barkod (TBLPRODUCTUNITBARCODE)
    let productId: number | null = null
    let unitId: number | null = null

    const puBarcode = await prisma.tBLPRODUCTUNITBARCODE.findFirst({
      where: { barcode: code, productUnit: { product: { companyId } } },
      include: { productUnit: { select: { productId: true, unitId: true } } },
    })
    if (puBarcode) { productId = puBarcode.productUnit.productId; unitId = puBarcode.productUnit.unitId }

    if (!productId) return reply.send({ found: false, code })

    const product = await prisma.tBLPRODUCT.findUnique({ where: { id: productId }, select: { id: true, code: true, name: true, unitId: true } })
    const unit = await prisma.tBLUNIT.findUnique({ where: { id: (unitId ?? product?.unitId) as number }, select: { id: true, code: true, name: true } })
    const stock = await prisma.tBLSTOCK.findMany({
      where: { companyId, productId, mainQty: { gt: 0 } },
      select: {
        mainQty: true, reservedQty: true, batchNo: true, serialNo: true,
        location: { select: { code: true } }, status: { select: { code: true } },
      },
      orderBy: { id: 'asc' }, take: 50,
    })
    return reply.send({
      found: true,
      product,
      unit,
      stock: stock.map((s) => ({
        location: s.location?.code, status: s.status?.code,
        batchNo: s.batchNo, serialNo: s.serialNo,
        qty: s.mainQty.toString(), reserved: s.reservedQty.toString(),
      })),
    })
  })
}
