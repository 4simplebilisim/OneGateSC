import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { getCompanyId, companyListFilter } from '../lib/company.js'
import { firstBadRef } from '../lib/refGuard.js'
import { attachScopes, setProductScope, usableInAppFilter, scopeFromCodes, type ProductScope } from '../lib/productScope.js'
import { parsePagination, paginated } from '../lib/pagination.js'
import { importRows, codeMap, resolveCode, str, parseBool } from '../lib/importer.js'

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
  usageScope: z.enum(['BOTH', 'WMS', 'PROC']).optional(), // ürün hangi platformlarda kullanılır
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
  usageScope: z.enum(['BOTH', 'WMS', 'PROC']).optional(),
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
    const q = request.query as { search?: string; app?: string }
    const where = {
      ...companyListFilter(request),
      ...(q.search ? { OR: [{ code: { contains: q.search, mode: 'insensitive' as const } }, { name: { contains: q.search, mode: 'insensitive' as const } }] } : {}),
      // ?app=WMS|PROC → yalnız o platformda kullanılabilen ürünler (kısıtsızlar dahil)
      ...(q.app ? usableInAppFilter(q.app) : {}),
    }
    const p = parsePagination(request)
    const [data, total] = await Promise.all([
      prisma.tBLPRODUCT.findMany({ where, orderBy: { code: 'asc' }, include: { unit: true }, skip: p.skip, take: p.take }),
      prisma.tBLPRODUCT.count({ where }),
    ])
    return paginated(await attachScopes(data), total, p)
  })

  app.get('/:id', async (request, reply) => {
    const id = Number((request.params as { id: string }).id)
    if (!Number.isInteger(id)) return reply.code(400).send({ error: 'Invalid id' })

    const product = await prisma.tBLPRODUCT.findFirst({
      where: { id, ...companyListFilter(request) },
      include: { unit: true, facilities: { select: { facilityId: true } }, applications: { select: { application: { select: { code: true } } } } },
    })
    if (!product) return reply.code(404).send({ error: 'Product not found' })
    return { ...product, usageScope: scopeFromCodes(product.applications.map((a) => a.application.code)) }
  })

  app.post('/', { preHandler: [app.authenticate, app.requireWrite] }, async (request, reply) => {
    const parsed = createSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.code(400).send({ error: 'Invalid body', details: parsed.error.flatten() })
    }
    const companyId = getCompanyId(request)
    const { facilities, usageScope, ...rest } = parsed.data
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
      if (usageScope) await setProductScope(product.id, companyId, usageScope as ProductScope)
      return reply.code(201).send({ ...product, usageScope: usageScope ?? 'BOTH' })
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

  // Excel içe aktarma: kanonik anahtarlı satırlar (frontend Türkçe başlıkları çözer) → toplu ürün oluştur.
  // Birim/Grup/Tip KOD ile verilir (id değil), firma-scope çözülür. Satır-bazlı hata döner (kısmi import).
  const importRowSchema = z.object({
    code: z.any().optional(), name: z.any().optional(), shortName: z.any().optional(),
    unitCode: z.any().optional(), groupCode: z.any().optional(), typeCode: z.any().optional(),
    manufacturerCode: z.any().optional(), shelfLifeDays: z.any().optional(), isActive: z.any().optional(),
  }).passthrough()
  app.post('/import', { preHandler: [app.authenticate, app.requireWrite] }, async (request, reply) => {
    const body = z.object({ rows: z.array(importRowSchema).min(1).max(5000) }).safeParse(request.body)
    if (!body.success) return reply.code(400).send({ error: 'Geçersiz veri (rows dizisi gerekli, en fazla 5000)' })
    const companyId = getCompanyId(request)
    const [units, groups, types] = await Promise.all([
      codeMap(prisma.tBLUNIT, companyId), codeMap(prisma.tBLPRODUCTGROUP, companyId), codeMap(prisma.tBLPRODUCTTYPE, companyId),
    ])
    const result = await importRows(body.data.rows, async (r) => {
      const code = str(r.code), name = str(r.name)
      if (!code) throw new Error('Kod zorunlu')
      if (!name) throw new Error('Ad zorunlu')
      const unitId = resolveCode(units, r.unitCode, 'Birim')
      const productGroupId = resolveCode(groups, r.groupCode, 'Ürün Grubu')
      const productTypeId = resolveCode(types, r.typeCode, 'Ürün Tipi')
      const daysRaw = str(r.shelfLifeDays)
      const shelfLifeDays = daysRaw ? Number(daysRaw) : undefined
      if (shelfLifeDays != null && !Number.isFinite(shelfLifeDays)) throw new Error(`Raf ömrü sayı olmalı: ${daysRaw}`)
      try {
        await prisma.tBLPRODUCT.create({ data: {
          companyId, code, name, shortName: str(r.shortName) || undefined,
          unitId, productGroupId, productTypeId, manufacturerCode: str(r.manufacturerCode) || undefined,
          shelfLifeDays, shelfLifeControl: (shelfLifeDays ?? 0) > 0, isActive: parseBool(r.isActive, true),
        } })
      } catch (e) {
        if ((e as { code?: string }).code === 'P2002') throw new Error(`Kod zaten var: ${code}`)
        throw e
      }
    })
    return result
  })

  app.patch('/:id', { preHandler: [app.authenticate, app.requireWrite] }, async (request, reply) => {
    const id = Number((request.params as { id: string }).id)
    if (!Number.isInteger(id)) return reply.code(400).send({ error: 'Invalid id' })
    const parsed = updateSchema.safeParse(request.body)
    if (!parsed.success) return reply.code(400).send({ error: 'Invalid body', details: parsed.error.flatten() })
    const existing = await prisma.tBLPRODUCT.findFirst({ where: { id, ...companyListFilter(request) } })
    if (!existing) return reply.code(404).send({ error: 'Product not found' })
    const { facilities, usageScope, ...rest } = parsed.data
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
      if (usageScope) await setProductScope(id, existing.companyId, usageScope as ProductScope)
      return { ...product, ...(usageScope ? { usageScope } : {}) }
    } catch (err) {
      if ((err as { code?: string }).code === 'P2003') return reply.code(400).send({ error: 'Geçersiz referans (birim/grup/tip)' })
      throw err
    }
  })
}
