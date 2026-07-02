import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { getCompanyId, companyListFilter } from '../lib/company.js'
import { firstBadRef } from '../lib/refGuard.js'
import { parsePagination, paginated } from '../lib/pagination.js'

const createSchema = z.object({
  code: z.string().min(1).max(40),
  name: z.string().min(1).max(200),
  shortName: z.string().max(50).optional(),
  // barcode: ARTIK ana kartta tanımlanmaz — sadece ölçü birimine bağlı (TBLPRODUCTUNIT)
  unitId: z.number().int().positive().optional(),
  productGroupId: z.number().int().positive().optional(),
  productSubGroupId: z.number().int().positive().optional(),
  productTypeId: z.number().int().positive().optional(),
  detailTypeId: z.number().int().positive().optional(),
  manufacturerCode: z.string().max(60).optional(),
  shelfLifeControl: z.boolean().optional(),
  shelfLifeDays: z.number().int().nonnegative().nullable().optional(),
  catchWeight: z.boolean().optional(),
  minWeight: z.number().nonnegative().nullable().optional(),
  maxWeight: z.number().nonnegative().nullable().optional(),
  facilities: z.array(z.number().int().positive()).optional(), // kullanılabilir tesisler (boş = tüm tesisler)
  isActive: z.boolean().optional(),
})

const updateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  shortName: z.string().max(50).nullable().optional(),
  unitId: z.number().int().positive().optional(),
  productGroupId: z.number().int().positive().nullable().optional(),
  productSubGroupId: z.number().int().positive().nullable().optional(),
  productTypeId: z.number().int().positive().nullable().optional(),
  detailTypeId: z.number().int().positive().nullable().optional(),
  manufacturerCode: z.string().max(60).nullable().optional(),
  shelfLifeControl: z.boolean().optional(),
  shelfLifeDays: z.number().int().nonnegative().nullable().optional(),
  catchWeight: z.boolean().optional(),
  minWeight: z.number().nonnegative().nullable().optional(),
  maxWeight: z.number().nonnegative().nullable().optional(),
  facilities: z.array(z.number().int().positive()).optional(),
  isActive: z.boolean().optional(),
})

// Sadece bu firmaya ait tesis id'leri (cross-tenant koruması)
async function validFacilityIds(companyId: number, facilities: number[] | undefined): Promise<number[]> {
  if (!facilities?.length) return []
  const rows = await prisma.tBLFACILITY.findMany({ where: { companyId, id: { in: facilities } }, select: { id: true } })
  return rows.map((r) => r.id)
}

export async function productRoutes(app: FastifyInstance) {
  app.get('/', async (request) => {
    const q = request.query as { search?: string }
    const where = {
      ...companyListFilter(request),
      ...(q.search ? { OR: [{ code: { contains: q.search, mode: 'insensitive' as const } }, { name: { contains: q.search, mode: 'insensitive' as const } }] } : {}),
    }
    const p = parsePagination(request)
    const [data, total] = await Promise.all([
      prisma.tBLPRODUCT.findMany({ where, orderBy: { code: 'asc' }, include: { unit: true }, skip: p.skip, take: p.take }),
      prisma.tBLPRODUCT.count({ where }),
    ])
    return paginated(data, total, p)
  })

  app.get('/:id', async (request, reply) => {
    const id = Number((request.params as { id: string }).id)
    if (!Number.isInteger(id)) return reply.code(400).send({ error: 'Invalid id' })

    const product = await prisma.tBLPRODUCT.findFirst({
      where: { id, ...companyListFilter(request) },
      include: { unit: true, facilities: { select: { facilityId: true } } },
    })
    if (!product) return reply.code(404).send({ error: 'Product not found' })
    return product
  })

  app.post('/', { preHandler: [app.authenticate, app.requireWrite] }, async (request, reply) => {
    const parsed = createSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.code(400).send({ error: 'Invalid body', details: parsed.error.flatten() })
    }
    const companyId = getCompanyId(request)
    const { facilities, ...rest } = parsed.data
    // FK'ler bu firmaya ait mi (çapraz-firma izolasyon)
    const bad = await firstBadRef(companyId, [
      ['birim', 'unit', rest.unitId], ['ürün grubu', 'productGroup', rest.productGroupId], ['alt grup', 'productSubGroup', rest.productSubGroupId],
      ['ürün tipi', 'productType', rest.productTypeId], ['detay tipi', 'productDetailType', rest.detailTypeId],
    ])
    if (bad) return reply.code(400).send({ error: `Geçersiz ${bad} — bu firmaya ait değil` })
    const facIds = await validFacilityIds(companyId, facilities)
    // Raf ömrü takibi artık ayrı bir kutu değil: gün sayısı girildiyse (>0) takip açık sayılır.
    const shelfLifeControl = (rest.shelfLifeDays ?? 0) > 0
    try {
      const product = await prisma.tBLPRODUCT.create({
        data: { ...rest, shelfLifeControl, companyId, facilities: { create: facIds.map((fid) => ({ companyId, facilityId: fid })) } },
      })
      return reply.code(201).send(product)
    } catch (err) {
      const code = (err as { code?: string }).code
      if (code === 'P2002') {
        return reply.code(409).send({ error: 'Product code already exists' })
      }
      if (code === 'P2003') {
        return reply.code(400).send({ error: 'Geçersiz referans (birim/grup/tip)' })
      }
      throw err
    }
  })

  app.patch('/:id', { preHandler: [app.authenticate, app.requireWrite] }, async (request, reply) => {
    const id = Number((request.params as { id: string }).id)
    if (!Number.isInteger(id)) return reply.code(400).send({ error: 'Invalid id' })
    const parsed = updateSchema.safeParse(request.body)
    if (!parsed.success) return reply.code(400).send({ error: 'Invalid body', details: parsed.error.flatten() })
    const existing = await prisma.tBLPRODUCT.findFirst({ where: { id, ...companyListFilter(request) } })
    if (!existing) return reply.code(404).send({ error: 'Product not found' })
    const { facilities, ...rest } = parsed.data
    // FK'ler ürünün firmasına ait mi (çapraz-firma izolasyon; og_company değil)
    const bad = await firstBadRef(existing.companyId, [
      ['birim', 'unit', rest.unitId], ['ürün grubu', 'productGroup', rest.productGroupId], ['alt grup', 'productSubGroup', rest.productSubGroupId],
      ['ürün tipi', 'productType', rest.productTypeId], ['detay tipi', 'productDetailType', rest.detailTypeId],
    ])
    if (bad) return reply.code(400).send({ error: `Geçersiz ${bad} — bu firmaya ait değil` })
    const data: Record<string, unknown> = { ...rest }
    // Gün sayısı bu patch'te geldiyse, raf ömrü takibini gün>0'a göre türet.
    if (rest.shelfLifeDays !== undefined) data.shelfLifeControl = (rest.shelfLifeDays ?? 0) > 0
    if (facilities) {
      // Cross-company düzenlemede tesisler düzenlenen ürünün firmasına göre doğrulanır (og_company değil)
      const facIds = await validFacilityIds(existing.companyId, facilities)
      data.facilities = { deleteMany: {}, create: facIds.map((fid) => ({ companyId: existing.companyId, facilityId: fid })) }
    }
    try {
      const product = await prisma.tBLPRODUCT.update({ where: { id }, data, include: { unit: true, facilities: { select: { facilityId: true } } } })
      return product
    } catch (err) {
      if ((err as { code?: string }).code === 'P2003') return reply.code(400).send({ error: 'Geçersiz referans (birim/grup/tip)' })
      throw err
    }
  })
}
