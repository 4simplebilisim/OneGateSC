import type { FastifyInstance } from 'fastify'
import { Prisma } from '@prisma/client'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { getCompanyId } from '../lib/company.js'
import { reserveStock, releaseStock, type StockKey } from '../lib/stock.js'
import { MovementError } from '../lib/movement.js'
import { assertLocationAuthorized, AuthorizationError } from '../lib/userAuth.js'
import { parsePagination, paginated } from '../lib/pagination.js'

const keySchema = z.object({
  locationId: z.number().int().positive(),
  productId: z.number().int().positive(),
  statusId: z.number().int().positive(),
  batchNo: z.string().max(100).optional(),
  serialNo: z.string().max(100).optional(),
  palletId: z.number().int().positive().optional(),
  customerId: z.number().int().positive().optional(),
  poNo: z.string().max(50).optional(),
  poLine: z.string().max(50).optional(),
  quantity: z.number().positive(),
})

const num = (v?: string) => (v ? Number(v) : undefined)

export async function stockRoutes(app: FastifyInstance) {
  // FEFO sıralı stok sorgu (uygun miktar hesaplı, sayfalı) — tesis/depo/lokasyon/ürün/statü ile süzülür
  app.get('/', async (request) => {
    const companyId = getCompanyId(request)
    const q = request.query as Record<string, string | undefined>
    const warehouseId = num(q.warehouseId)
    const facilityId = num(q.facilityId)
    // Tesis + depo lokasyon ilişkisinden süzülür (tesis = depodan türer)
    const locFilter: Prisma.TBLLOCATIONWhereInput = {}
    if (warehouseId) locFilter.warehouseId = warehouseId
    if (facilityId) locFilter.warehouse = { facilityId }
    const where = {
      companyId,
      productId: num(q.productId),
      locationId: num(q.locationId),
      statusId: num(q.statusId),
      ...(Object.keys(locFilter).length ? { location: locFilter } : {}),
      ...(q.includeZero === 'true' ? {} : { mainQty: { gt: 0 } }),
    }
    const p = parsePagination(request)
    const [rows, total] = await Promise.all([
      prisma.tBLSTOCK.findMany({
        where,
        orderBy: [{ expiryDate: 'asc' }, { id: 'asc' }], // FEFO
        include: {
          product: { select: { id: true, code: true, name: true } },
          // Tesis (depodan) + depo adları çözümlü — stok raporu kolonları
          location: { select: { id: true, code: true, warehouseId: true,
            warehouse: { select: { id: true, code: true, name: true, facility: { select: { id: true, code: true, name: true } } } },
          } },
          status: { select: { id: true, code: true, name: true } },
          unit: { select: { id: true, code: true } },
          pallet: { select: { id: true, palletNo: true } },
        },
        skip: p.skip,
        take: p.take,
      }),
      prisma.tBLSTOCK.count({ where }),
    ])
    return paginated(
      rows.map((r) => ({ ...r, availableQty: r.mainQty.sub(r.reservedQty) })),
      total,
      p,
    )
  })

  // Stok kartı — bir ürünün tüm hareketleri (hareket defteri / ledger'dan), kronolojik + yürüyen bakiye
  app.get('/card', async (request) => {
    const companyId = getCompanyId(request)
    const q = request.query as Record<string, string | undefined>
    const productId = num(q.productId)
    if (!productId) return { error: 'productId gerekli', movements: [] }
    const warehouseId = num(q.warehouseId)
    const entries = await prisma.tBLSTOCKLEDGER.findMany({ where: { companyId, productId }, orderBy: { id: 'asc' } })

    const locIds = [...new Set(entries.map((e) => e.locationId))]
    const locs = await prisma.tBLLOCATION.findMany({ where: { id: { in: locIds } }, select: { id: true, code: true, warehouseId: true } })
    const locMap = new Map(locs.map((l) => [l.id, l]))
    const docIds = [...new Set(entries.map((e) => e.documentId).filter((x): x is number => x != null))]
    const docs = await prisma.tBLDOCUMENT.findMany({ where: { id: { in: docIds } }, select: { id: true, documentNo: true, documentDate: true, operationType: { select: { code: true } } } })
    const docMap = new Map(docs.map((d) => [d.id, d]))
    const unitIds = [...new Set(entries.map((e) => e.unitId))]
    const units = await prisma.tBLUNIT.findMany({ where: { id: { in: unitIds } }, select: { id: true, code: true } })
    const unitMap = new Map(units.map((u) => [u.id, u.code]))

    const filtered = warehouseId ? entries.filter((e) => locMap.get(e.locationId)?.warehouseId === warehouseId) : entries
    let running = 0
    const movements = filtered.map((e) => {
      const d = Number(e.qtyDelta)
      running += d
      const doc = e.documentId ? docMap.get(e.documentId) : null
      return {
        date: doc?.documentDate ?? e.createdAt,
        documentNo: doc?.documentNo ?? null,
        operation: doc?.operationType?.code ?? e.direction,
        direction: e.direction,
        inQty: d > 0 ? d : 0,
        outQty: d < 0 ? -d : 0,
        location: locMap.get(e.locationId)?.code ?? null,
        unit: unitMap.get(e.unitId) ?? null,
        batchNo: e.batchNo,
        balance: running,
      }
    })
    return { productId, movementCount: movements.length, movements }
  })

  app.post('/reserve', { preHandler: [app.authenticate, app.requireWrite] }, async (request, reply) => {
    const parsed = keySchema.safeParse(request.body)
    if (!parsed.success) return reply.code(400).send({ error: 'Invalid body', details: parsed.error.flatten() })
    const { quantity, ...key } = parsed.data
    try {
      await assertLocationAuthorized(request, key.locationId) // depo/tesis yetkisi (lokasyondan türer)
      return await reserveStock({ companyId: getCompanyId(request), ...(key as Omit<StockKey, 'companyId'>) }, quantity)
    } catch (err) {
      if (err instanceof AuthorizationError) return reply.code(403).send({ error: err.message })
      if (err instanceof MovementError) return reply.code(409).send({ error: err.message })
      throw err
    }
  })

  app.post('/release', { preHandler: [app.authenticate, app.requireWrite] }, async (request, reply) => {
    const parsed = keySchema.safeParse(request.body)
    if (!parsed.success) return reply.code(400).send({ error: 'Invalid body', details: parsed.error.flatten() })
    const { quantity, ...key } = parsed.data
    try {
      await assertLocationAuthorized(request, key.locationId)
      return await releaseStock({ companyId: getCompanyId(request), ...(key as Omit<StockKey, 'companyId'>) }, quantity)
    } catch (err) {
      if (err instanceof AuthorizationError) return reply.code(403).send({ error: err.message })
      if (err instanceof MovementError) return reply.code(409).send({ error: err.message })
      throw err
    }
  })

  // Stok kimlik değişimi — Batch Atama / Batch Değiştirme / Ürün Kod Değişim (hedef kimlik varsa birleştir)
  app.post('/:id/reclassify', { preHandler: [app.authenticate, app.requireWrite] }, async (request, reply) => {
    const id = Number((request.params as { id: string }).id)
    if (!Number.isInteger(id)) return reply.code(400).send({ error: 'Invalid id' })
    const parsed = z.object({ batchNo: z.string().max(100).nullable().optional(), serialNo: z.string().max(100).nullable().optional(), productId: z.number().int().positive().optional() }).safeParse(request.body)
    if (!parsed.success) return reply.code(400).send({ error: 'Invalid body', details: parsed.error.flatten() })
    const companyId = getCompanyId(request)
    const src = await prisma.tBLSTOCK.findFirst({ where: { id, companyId } })
    if (!src) return reply.code(404).send({ error: 'Stok bulunamadı' })
    try {
      await assertLocationAuthorized(request, src.locationId) // kimlik değişimi de depo yetkisine tabi
    } catch (err) {
      if (err instanceof AuthorizationError) return reply.code(403).send({ error: err.message })
      throw err
    }
    const newProductId = parsed.data.productId ?? src.productId
    const newBatch = parsed.data.batchNo !== undefined ? parsed.data.batchNo : src.batchNo
    const newSerial = parsed.data.serialNo !== undefined ? parsed.data.serialNo : src.serialNo
    if (newProductId === src.productId && newBatch === src.batchNo && newSerial === src.serialNo) {
      return reply.code(400).send({ error: 'Değişiklik yok' })
    }
    try {
      return await prisma.$transaction(async (tx) => {
        const target = await tx.tBLSTOCK.findFirst({ where: { companyId, locationId: src.locationId, statusId: src.statusId, palletId: src.palletId, unitId: src.unitId, productId: newProductId, batchNo: newBatch, serialNo: newSerial, customerId: src.customerId, poNo: src.poNo, poLine: src.poLine, id: { not: id } } })
        if (target) {
          await tx.tBLSTOCK.update({ where: { id: target.id }, data: { mainQty: target.mainQty.add(src.mainQty), reservedQty: target.reservedQty.add(src.reservedQty) } })
          await tx.tBLSTOCK.delete({ where: { id } })
          return { merged: true, into: target.id }
        }
        const upd = await tx.tBLSTOCK.update({ where: { id }, data: { productId: newProductId, batchNo: newBatch, serialNo: newSerial } })
        return { merged: false, stockId: upd.id }
      })
    } catch (err) {
      if ((err as { code?: string }).code === 'P2003') return reply.code(400).send({ error: 'Geçersiz ürün' })
      throw err
    }
  })
}

// Stok Hareket Defteri (TBLSTOCKLEDGER, legacy TBLSBLOGBELGE) — salt-okunur liste
export async function stockLedgerRoutes(app: FastifyInstance) {
  app.get('/', async (request) => {
    const companyId = getCompanyId(request)
    const q = request.query as Record<string, string | undefined>
    const warehouseId = num(q.warehouseId)
    // Depo filtresi: ledger ilişki taşımaz → önce o deponun lokasyon id'leri
    let locFilter: Prisma.IntFilter | number | undefined = num(q.locationId)
    if (warehouseId) {
      const locs = await prisma.tBLLOCATION.findMany({ where: { companyId, warehouseId }, select: { id: true } })
      locFilter = { in: locs.map((l) => l.id) }
    }
    const where: Prisma.TBLSTOCKLEDGERWhereInput = {
      companyId,
      productId: num(q.productId),
      documentId: num(q.documentId),
      ...(locFilter !== undefined ? { locationId: locFilter } : {}),
    }
    const p = parsePagination(request)
    const [rows, total] = await Promise.all([
      prisma.tBLSTOCKLEDGER.findMany({ where, orderBy: { id: 'desc' }, skip: p.skip, take: p.take }),
      prisma.tBLSTOCKLEDGER.count({ where }),
    ])
    return paginated(rows, total, p)
  })
}
