import type { FastifyInstance, FastifyRequest } from 'fastify'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { getCompanyId } from '../lib/company.js'
import { assertBarcodeUnique, BarcodeError } from '../lib/barcode.js'

const createSchema = z.object({
  productId: z.number().int().positive(),
  unitId: z.number().int().positive(),
  isBaseUnit: z.boolean().optional(),
  multiplier: z.number().positive().optional(),
  divisor: z.number().positive().optional(),
  // barcode: ölçü birimi artık tekil barkod tutmaz — barkodlar çoklu (TBLPRODUCTUNITBARCODE)
  length: z.number().nonnegative().optional(),
  width: z.number().nonnegative().optional(),
  height: z.number().nonnegative().optional(),
  area: z.number().nonnegative().optional(),
  volume: z.number().nonnegative().optional(),
  netWeight: z.number().nonnegative().optional(),
  grossWeight: z.number().nonnegative().optional(),
  weightUnitId: z.number().int().positive().optional(),
  minPalletQty: z.number().nonnegative().optional(),
  maxPalletQty: z.number().nonnegative().optional(),
  batchTracking: z.boolean().optional(),
  serialTracking: z.boolean().optional(),
  isSalesUnit: z.boolean().optional(),
})
const updateSchema = createSchema.partial().omit({ productId: true, unitId: true })
const barcodeSchema = z.object({ barcode: z.string().min(1).max(100), labelAddress: z.string().max(100).optional() })

const idOf = (request: FastifyRequest) => Number((request.params as { id: string }).id)
const unitInclude = { unit: { select: { code: true, name: true } }, product: { select: { code: true, name: true } }, barcodes: true } as const

export async function productUnitRoutes(app: FastifyInstance) {
  // Ürün ölçü birimleri (productId ile filtrelenir)
  app.get('/', async (request) => {
    const q = request.query as { productId?: string }
    return prisma.tBLPRODUCTUNIT.findMany({
      where: { productId: q.productId ? Number(q.productId) : undefined, product: { companyId: getCompanyId(request) } },
      include: unitInclude,
      orderBy: [{ productId: 'asc' }, { isBaseUnit: 'desc' }, { id: 'asc' }],
    })
  })

  app.get('/:id', async (request, reply) => {
    const id = idOf(request)
    if (!Number.isInteger(id)) return reply.code(400).send({ error: 'Invalid id' })
    const pu = await prisma.tBLPRODUCTUNIT.findFirst({ where: { id, product: { companyId: getCompanyId(request) } }, include: unitInclude })
    if (!pu) return reply.code(404).send({ error: 'Product unit not found' })
    return pu
  })

  app.post('/', { preHandler: [app.authenticate, app.requireWrite] }, async (request, reply) => {
    const parsed = createSchema.safeParse(request.body)
    if (!parsed.success) return reply.code(400).send({ error: 'Invalid body', details: parsed.error.flatten() })
    const companyId = getCompanyId(request)
    const product = await prisma.tBLPRODUCT.findFirst({ where: { id: parsed.data.productId, companyId } })
    if (!product) return reply.code(400).send({ error: 'Geçersiz ürün' })
    try {
      const pu = await prisma.$transaction(async (tx) => {
        // Her ürün KESİN tek bir ana birim taşımalı: ilk eklenen birim otomatik ana birim olur.
        const existingCount = await tx.tBLPRODUCTUNIT.count({ where: { productId: parsed.data.productId } })
        const makeBase = parsed.data.isBaseUnit || existingCount === 0
        if (makeBase) {
          // Önceki ana birimi kaldır (aynı anda iki ana birim olamaz)
          await tx.tBLPRODUCTUNIT.updateMany({ where: { productId: parsed.data.productId, isBaseUnit: true }, data: { isBaseUnit: false } })
        }
        const created = await tx.tBLPRODUCTUNIT.create({ data: { ...parsed.data, companyId, isBaseUnit: makeBase }, include: unitInclude })
        if (makeBase) {
          await tx.tBLPRODUCT.update({ where: { id: parsed.data.productId }, data: { unitId: parsed.data.unitId } })
        }
        return created
      })
      return reply.code(201).send(pu)
    } catch (err) {
      const code = (err as { code?: string }).code
      if (code === 'P2002') return reply.code(409).send({ error: 'Bu ürün-birim zaten tanımlı' })
      if (code === 'P2003') return reply.code(400).send({ error: 'Geçersiz birim' })
      throw err
    }
  })

  app.patch('/:id', { preHandler: [app.authenticate, app.requireWrite] }, async (request, reply) => {
    const id = idOf(request)
    if (!Number.isInteger(id)) return reply.code(400).send({ error: 'Invalid id' })
    const parsed = updateSchema.safeParse(request.body)
    if (!parsed.success) return reply.code(400).send({ error: 'Invalid body', details: parsed.error.flatten() })
    const companyId = getCompanyId(request)
    const existing = await prisma.tBLPRODUCTUNIT.findFirst({ where: { id, product: { companyId } } })
    if (!existing) return reply.code(404).send({ error: 'Product unit not found' })
    // Ana birim doğrudan kaldırılamaz — başka bir birimi ana yaparak değiştirilir (kesin bir ana birim korunur).
    if (parsed.data.isBaseUnit === false && existing.isBaseUnit) {
      return reply.code(400).send({ error: 'Ana birim doğrudan kaldırılamaz — başka bir birimi ana yaparak değiştirin.' })
    }
    const updated = await prisma.$transaction(async (tx) => {
      if (parsed.data.isBaseUnit) {
        // Önceki ana birimi kaldır (kendisi hariç)
        await tx.tBLPRODUCTUNIT.updateMany({ where: { productId: existing.productId, isBaseUnit: true, id: { not: id } }, data: { isBaseUnit: false } })
      }
      const result = await tx.tBLPRODUCTUNIT.update({ where: { id }, data: parsed.data, include: unitInclude })
      if (parsed.data.isBaseUnit) {
        await tx.tBLPRODUCT.update({ where: { id: existing.productId }, data: { unitId: existing.unitId } })
      }
      return result
    })
    return updated
  })

  app.delete('/:id', { preHandler: [app.authenticate, app.requireWrite] }, async (request, reply) => {
    const id = idOf(request)
    if (!Number.isInteger(id)) return reply.code(400).send({ error: 'Invalid id' })
    const existing = await prisma.tBLPRODUCTUNIT.findFirst({ where: { id, product: { companyId: getCompanyId(request) } } })
    if (!existing) return reply.code(404).send({ error: 'Product unit not found' })
    // Başka birim varken ana birim silinemez — önce başka birimi ana yapın (kesin bir ana birim korunur).
    if (existing.isBaseUnit) {
      const others = await prisma.tBLPRODUCTUNIT.count({ where: { productId: existing.productId, id: { not: id } } })
      if (others > 0) return reply.code(400).send({ error: 'Ana birim silinemez — önce başka bir birimi ana yapın.' })
    }
    await prisma.$transaction(async (tx) => {
      await tx.tBLPRODUCTUNIT.delete({ where: { id } })
      if (existing.isBaseUnit) {
        // Son birim (ana birim) silindi → TBLPRODUCT.unitId temizle (üründe artık birim yok)
        await tx.tBLPRODUCT.update({ where: { id: existing.productId }, data: { unitId: null } })
      }
    })
    return reply.code(204).send()
  })

  // ── Çoklu barkod (ürün-birim başına N barkod) ──
  app.get('/:id/barcodes', async (request, reply) => {
    const id = idOf(request)
    if (!Number.isInteger(id)) return reply.code(400).send({ error: 'Invalid id' })
    return prisma.tBLPRODUCTUNITBARCODE.findMany({ where: { productUnitId: id, productUnit: { product: { companyId: getCompanyId(request) } } }, orderBy: { id: 'asc' } })
  })

  app.post('/:id/barcodes', { preHandler: [app.authenticate, app.requireWrite] }, async (request, reply) => {
    const id = idOf(request)
    if (!Number.isInteger(id)) return reply.code(400).send({ error: 'Invalid id' })
    const parsed = barcodeSchema.safeParse(request.body)
    if (!parsed.success) return reply.code(400).send({ error: 'Invalid body', details: parsed.error.flatten() })
    const companyId = getCompanyId(request)
    const pu = await prisma.tBLPRODUCTUNIT.findFirst({ where: { id, product: { companyId } } })
    if (!pu) return reply.code(404).send({ error: 'Product unit not found' })
    try { await assertBarcodeUnique(companyId, parsed.data.barcode) }
    catch (err) { if (err instanceof BarcodeError) return reply.code(409).send({ error: err.message }); throw err }
    try {
      const row = await prisma.tBLPRODUCTUNITBARCODE.create({ data: { productUnitId: id, companyId, ...parsed.data } })
      return reply.code(201).send(row)
    } catch (err) {
      // DB-seviyesi @@unique([companyId, barcode]) — yarış durumunda app-kontrolünü atlasa bile burada yakalanır
      if ((err as { code?: string }).code === 'P2002') return reply.code(409).send({ error: `"${parsed.data.barcode}" barkodu zaten kullanılıyor` })
      throw err
    }
  })

  app.delete('/:id/barcodes/:barcodeId', { preHandler: [app.authenticate, app.requireWrite] }, async (request, reply) => {
    const id = idOf(request)
    const barcodeId = Number((request.params as { barcodeId: string }).barcodeId)
    if (!Number.isInteger(id) || !Number.isInteger(barcodeId)) return reply.code(400).send({ error: 'Invalid id' })
    const res = await prisma.tBLPRODUCTUNITBARCODE.deleteMany({ where: { id: barcodeId, productUnitId: id, productUnit: { product: { companyId: getCompanyId(request) } } } })
    if (res.count === 0) return reply.code(404).send({ error: 'Barcode not found' })
    return { deleted: res.count }
  })
}
