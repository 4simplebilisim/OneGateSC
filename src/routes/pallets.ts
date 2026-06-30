import type { FastifyInstance } from 'fastify'
import { Prisma } from '@prisma/client'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { getCompanyId, companyListFilter } from '../lib/company.js'
import { nextSequence } from '../lib/sequence.js'

const createSchema = z.object({
  palletNo: z.string().max(40).optional(), // verilmezse palet tipinin sayacından üretilir
  palletTypeId: z.number().int().positive(),
  parentPalletId: z.number().int().positive().optional(),
  baseUnitId: z.number().int().positive().optional(),
  originalQty: z.number().nonnegative().optional(),
  productionDate: z.string().optional(),
  expiryDate: z.string().optional(),
  beaconId: z.string().max(200).optional(),
  isActive: z.boolean().optional(),
})

const num = (v?: string) => (v ? Number(v) : undefined)

export async function palletRoutes(app: FastifyInstance) {
  app.get('/', async (request) => {
    const q = request.query as { palletTypeId?: string }
    return prisma.tBLPALLET.findMany({
      where: { ...companyListFilter(request), palletTypeId: num(q.palletTypeId) },
      orderBy: { id: 'desc' },
      include: { palletType: { select: { code: true } } },
    })
  })

  app.get('/:id', async (request, reply) => {
    const id = Number((request.params as { id: string }).id)
    if (!Number.isInteger(id)) return reply.code(400).send({ error: 'Invalid id' })
    const pallet = await prisma.tBLPALLET.findUnique({ where: { id }, include: { palletType: true, childPallets: true } })
    if (!pallet) return reply.code(404).send({ error: 'Pallet not found' })
    return pallet
  })

  app.post('/', { preHandler: [app.authenticate, app.requireWrite] }, async (request, reply) => {
    const parsed = createSchema.safeParse(request.body)
    if (!parsed.success) return reply.code(400).send({ error: 'Invalid body', details: parsed.error.flatten() })
    const companyId = getCompanyId(request)
    const { palletNo: providedNo, productionDate, expiryDate, ...rest } = parsed.data

    // palletNo verilmezse: palet tipinin ÖNEKİ (code) + sayaç değeri (palletNoLength'e göre sıfır dolgulu)
    let palletNo = providedNo
    if (!palletNo) {
      const palletType = await prisma.tBLPALLETTYPE.findFirst({
        where: { id: rest.palletTypeId, companyId },
        include: { sequence: true },
      })
      if (!palletType?.sequence) {
        return reply.code(400).send({ error: 'palletNo gerekli — bu palet tipinde sayaç tanımlı değil' })
      }
      const seq = await nextSequence(companyId, palletType.sequence.code)
      const len = palletType.palletNoLength ?? 0
      const num = len > 0 ? String(seq.value).padStart(len, '0') : String(seq.value)
      palletNo = `${palletType.code}${num}` // öne­k + sıralı no
    }

    try {
      const pallet = await prisma.tBLPALLET.create({
        data: {
          ...rest,
          palletNo,
          companyId,
          productionDate: productionDate ? new Date(productionDate) : undefined,
          expiryDate: expiryDate ? new Date(expiryDate) : undefined,
        },
        include: { palletType: { select: { code: true } } },
      })
      return reply.code(201).send(pallet)
    } catch (err) {
      const code = (err as { code?: string }).code
      if (code === 'P2002') return reply.code(409).send({ error: 'Palet no zaten var' })
      if (code === 'P2003') return reply.code(400).send({ error: 'Geçersiz palet tipi / birim / üst palet' })
      throw err
    }
  })

  // Palet Güncelleme — palletNo/palletTypeId değişmez (kimlik); diğer alanlar güncellenir
  const updateSchema = z.object({
    parentPalletId: z.number().int().positive().nullable().optional(),
    baseUnitId: z.number().int().positive().nullable().optional(),
    originalQty: z.number().nonnegative().nullable().optional(),
    productionDate: z.string().nullable().optional(),
    expiryDate: z.string().nullable().optional(),
    beaconId: z.string().max(200).nullable().optional(),
    isActive: z.boolean().optional(),
  })

  app.patch('/:id', { preHandler: [app.authenticate, app.requireWrite] }, async (request, reply) => {
    const id = Number((request.params as { id: string }).id)
    if (!Number.isInteger(id)) return reply.code(400).send({ error: 'Invalid id' })
    const parsed = updateSchema.safeParse(request.body)
    if (!parsed.success) return reply.code(400).send({ error: 'Invalid body', details: parsed.error.flatten() })
    const companyId = getCompanyId(request)
    const existing = await prisma.tBLPALLET.findFirst({ where: { id, companyId } })
    if (!existing) return reply.code(404).send({ error: 'Palet bulunamadı' })
    const { productionDate, expiryDate, ...rest } = parsed.data
    try {
      return await prisma.tBLPALLET.update({
        where: { id },
        data: {
          ...rest,
          ...(productionDate !== undefined ? { productionDate: productionDate ? new Date(productionDate) : null } : {}),
          ...(expiryDate !== undefined ? { expiryDate: expiryDate ? new Date(expiryDate) : null } : {}),
        },
        include: { palletType: { select: { code: true } } },
      })
    } catch (err) {
      if ((err as { code?: string }).code === 'P2003') return reply.code(400).send({ error: 'Geçersiz birim / üst palet' })
      throw err
    }
  })

  // Toplu Palet Güncelleme — seçili paletlere ortak alanları uygula
  const bulkSchema = z.object({
    ids: z.array(z.number().int().positive()).min(1).max(1000),
    data: z.object({
      isActive: z.boolean().optional(),
      expiryDate: z.string().nullable().optional(),
      parentPalletId: z.number().int().positive().nullable().optional(),
      beaconId: z.string().max(200).nullable().optional(),
    }),
  })

  app.post('/bulk-update', { preHandler: [app.authenticate, app.requireWrite] }, async (request, reply) => {
    const parsed = bulkSchema.safeParse(request.body)
    if (!parsed.success) return reply.code(400).send({ error: 'Invalid body', details: parsed.error.flatten() })
    const companyId = getCompanyId(request)
    const { ids, data } = parsed.data
    const { expiryDate, ...rest } = data
    if (Object.keys(rest).length === 0 && expiryDate === undefined) {
      return reply.code(400).send({ error: 'Güncellenecek en az bir alan gerekli' })
    }
    try {
      const res = await prisma.tBLPALLET.updateMany({
        where: { id: { in: ids }, companyId },
        data: {
          ...rest,
          ...(expiryDate !== undefined ? { expiryDate: expiryDate ? new Date(expiryDate) : null } : {}),
        },
      })
      return reply.send({ updated: res.count })
    } catch (err) {
      if ((err as { code?: string }).code === 'P2003') return reply.code(400).send({ error: 'Geçersiz üst palet' })
      throw err
    }
  })

  // Palet içeriği — paletteki stok (Palet Bölme modalı için)
  app.get('/:id/contents', async (request, reply) => {
    const id = Number((request.params as { id: string }).id)
    if (!Number.isInteger(id)) return reply.code(400).send({ error: 'Invalid id' })
    const companyId = getCompanyId(request)
    const stocks = await prisma.tBLSTOCK.findMany({
      where: { companyId, palletId: id, mainQty: { gt: 0 } },
      include: { product: { select: { code: true, name: true } }, location: { select: { code: true } }, status: { select: { code: true } } },
      orderBy: { id: 'asc' },
    })
    return stocks.map((s) => ({
      id: s.id, productId: s.productId, urun: s.product.code, urunAd: s.product.name,
      lokasyon: s.location.code, statu: s.status.code,
      batchNo: s.batchNo, serialNo: s.serialNo, unitId: s.unitId, miktar: s.mainQty.toString(),
    }))
  })

  // Palet Bölme — kaynak paletten belirtilen ürün/miktarı YENİ palete taşı
  const splitSchema = z.object({
    productId: z.number().int().positive(),
    quantity: z.number().positive(),
    batchNo: z.string().max(100).optional(),
    serialNo: z.string().max(100).optional(),
    newPalletTypeId: z.number().int().positive().optional(),
  })

  app.post('/:id/split', { preHandler: [app.authenticate, app.requireWrite] }, async (request, reply) => {
    const sourceId = Number((request.params as { id: string }).id)
    if (!Number.isInteger(sourceId)) return reply.code(400).send({ error: 'Invalid id' })
    const parsed = splitSchema.safeParse(request.body)
    if (!parsed.success) return reply.code(400).send({ error: 'Invalid body', details: parsed.error.flatten() })
    const companyId = getCompanyId(request)
    const { productId, quantity, batchNo, serialNo, newPalletTypeId } = parsed.data

    const src = await prisma.tBLPALLET.findFirst({ where: { id: sourceId, companyId } })
    if (!src) return reply.code(404).send({ error: 'Kaynak palet bulunamadı' })
    const typeId = newPalletTypeId ?? src.palletTypeId
    const palletType = await prisma.tBLPALLETTYPE.findFirst({ where: { id: typeId, companyId }, include: { sequence: true } })
    if (!palletType?.sequence) return reply.code(400).send({ error: 'Yeni palet tipinde sayaç tanımlı değil' })
    const seq = await nextSequence(companyId, palletType.sequence.code)
    const len = palletType.palletNoLength ?? 0
    const newPalletNo = `${palletType.code}${len > 0 ? String(seq.value).padStart(len, '0') : String(seq.value)}`

    try {
      const result = await prisma.$transaction(async (tx) => {
        const stock = await tx.tBLSTOCK.findFirst({
          where: { companyId, palletId: sourceId, productId, batchNo: batchNo ?? null, serialNo: serialNo ?? null, mainQty: { gt: 0 } },
        })
        if (!stock) throw new Error('NO_STOCK')
        const qty = new Prisma.Decimal(quantity)
        if (qty.greaterThan(stock.mainQty)) throw new Error('OVER_QTY')

        const newPallet = await tx.tBLPALLET.create({ data: { companyId, palletNo: newPalletNo, palletTypeId: typeId, baseUnitId: src.baseUnitId } })
        await tx.tBLSTOCK.update({ where: { id: stock.id }, data: { mainQty: stock.mainQty.sub(qty) } })
        const target = await tx.tBLSTOCK.findFirst({
          where: { companyId, locationId: stock.locationId, productId: stock.productId, statusId: stock.statusId, batchNo: stock.batchNo, serialNo: stock.serialNo, palletId: newPallet.id, unitId: stock.unitId, customerId: stock.customerId, poNo: stock.poNo, poLine: stock.poLine },
        })
        if (target) await tx.tBLSTOCK.update({ where: { id: target.id }, data: { mainQty: target.mainQty.add(qty) } })
        else await tx.tBLSTOCK.create({ data: { companyId, locationId: stock.locationId, productId: stock.productId, statusId: stock.statusId, batchNo: stock.batchNo, serialNo: stock.serialNo, palletId: newPallet.id, unitId: stock.unitId, customerId: stock.customerId, poNo: stock.poNo, poLine: stock.poLine, mainQty: qty } })
        return { newPallet, movedQty: quantity }
      })
      return reply.code(201).send(result)
    } catch (err) {
      const m = (err as Error).message
      if (m === 'NO_STOCK') return reply.code(409).send({ error: 'Bu palette belirtilen üründen (batch/seri) stok yok' })
      if (m === 'OVER_QTY') return reply.code(409).send({ error: 'Bölünecek miktar palet stoğundan fazla' })
      throw err
    }
  })
}
