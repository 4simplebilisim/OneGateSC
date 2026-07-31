import type { FastifyInstance } from 'fastify'
import { prisma } from '../lib/prisma.js'
import { getCompanyId } from '../lib/company.js'
import { parseBarcode } from '../lib/barcodeParse.js'

// Belirli bir ürün için güncel stok özeti (lokasyon/statü/lot kırılımı, FEFO sıralı)
async function stockSummary(companyId: number, productId: number) {
  const stock = await prisma.tBLSTOCK.findMany({
    where: { companyId, productId, mainQty: { gt: 0 } },
    select: { mainQty: true, reservedQty: true, batchNo: true, serialNo: true, expiryDate: true, location: { select: { code: true } }, status: { select: { code: true } } },
    orderBy: [{ expiryDate: 'asc' }, { id: 'asc' }], take: 50,
  })
  return stock.map((s) => ({ location: s.location?.code, status: s.status?.code, batchNo: s.batchNo, serialNo: s.serialNo, expiryDate: s.expiryDate ? s.expiryDate.toISOString().slice(0, 10) : null, qty: s.mainQty.toString(), reserved: s.reservedQty.toString() }))
}

/** Mobil/el terminali — barkod → barkod kural motoru (EAN/Palet/Segment); tanımsızsa ürün-birim tam eşleşmeye düşer. */
export async function lookupRoutes(app: FastifyInstance) {
  app.get('/barcode', async (request, reply) => {
    const q = request.query as { code?: string; facilityId?: string }
    const code = String(q.code ?? '').trim()
    if (!code) return reply.code(400).send({ error: 'code gerekli' })
    const companyId = getCompanyId(request)
    const facilityId = q.facilityId ? Number(q.facilityId) : undefined

    // 1) Barkod kural motoru (tanımlı barkod tipleri)
    const parsed = await parseBarcode(companyId, code, { facilityId })
    if (parsed.matched && !parsed.error) {
      const productId = parsed.fields.productId ?? null
      const unit = parsed.unit ?? (parsed.fields.unitId ? await prisma.tBLUNIT.findUnique({ where: { id: parsed.fields.unitId }, select: { id: true, code: true, name: true } }) : null)
      return reply.send({
        found: true,
        mode: parsed.mode,
        barcodeType: parsed.barcodeTypeCode,
        product: parsed.product ?? null,
        unit,
        fields: parsed.fields, // productId/unitId/quantity/batchNo/production/expiry/palletNo...
        pallet: parsed.pallet ?? null, // PALLET modu: paletin içeriği
        segments: parsed.segments ?? null, // SEGMENT modu: görsel kırılım (Test)
        warnings: parsed.warnings && parsed.warnings.length ? parsed.warnings : undefined,
        stock: productId ? await stockSummary(companyId, productId) : [],
      })
    }

    // 2) FALLBACK — eski davranış: ürün-birim barkodu tam eşleşme (barkod tipi tanımsız tenant korunur)
    const puBarcode = await prisma.tBLPRODUCTUNITBARCODE.findFirst({
      where: { barcode: code, productUnit: { product: { companyId } } },
      include: { productUnit: { select: { productId: true, unitId: true } } },
    })
    if (!puBarcode) return reply.send({ found: false, code, ...(parsed.error ? { message: parsed.error } : {}) })

    const productId = puBarcode.productUnit.productId
    const product = await prisma.tBLPRODUCT.findUnique({ where: { id: productId }, select: { id: true, code: true, name: true, unitId: true } })
    const unit = await prisma.tBLUNIT.findUnique({ where: { id: (puBarcode.productUnit.unitId ?? product?.unitId) as number }, select: { id: true, code: true, name: true } })
    return reply.send({ found: true, mode: 'EAN', product, unit, fields: { productId, unitId: puBarcode.productUnit.unitId }, stock: await stockSummary(companyId, productId) })
  })
}
