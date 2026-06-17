import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { getCompanyId } from '../lib/company.js'
import { reserveStock, releaseStock, type StockKey } from '../lib/stock.js'
import { MovementError } from '../lib/movement.js'
import { parsePagination, paginated } from '../lib/pagination.js'

const keySchema = z.object({
  locationId: z.number().int().positive(),
  productId: z.number().int().positive(),
  statusId: z.number().int().positive(),
  batchNo: z.string().max(100).optional(),
  serialNo: z.string().max(100).optional(),
  palletId: z.number().int().positive().optional(),
  quantity: z.number().positive(),
})

const num = (v?: string) => (v ? Number(v) : undefined)

export async function stockRoutes(app: FastifyInstance) {
  // FEFO sıralı stok sorgu (uygun miktar hesaplı, sayfalı)
  app.get('/', async (request) => {
    const companyId = getCompanyId(request)
    const q = request.query as Record<string, string | undefined>
    const warehouseId = num(q.warehouseId)
    const where = {
      companyId,
      productId: num(q.productId),
      locationId: num(q.locationId),
      statusId: num(q.statusId),
      ...(warehouseId ? { location: { warehouseId } } : {}),
      ...(q.includeZero === 'true' ? {} : { mainQty: { gt: 0 } }),
    }
    const p = parsePagination(request)
    const [rows, total] = await Promise.all([
      prisma.tBLSTOCK.findMany({
        where,
        orderBy: [{ expiryDate: 'asc' }, { id: 'asc' }], // FEFO
        include: {
          product: { select: { id: true, code: true, name: true } },
          location: { select: { id: true, code: true, warehouseId: true } },
          status: { select: { id: true, code: true } },
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

  // Stok kartı — bir ürünün tüm hareketleri (belge satırları), kronolojik
  app.get('/card', async (request) => {
    const companyId = getCompanyId(request)
    const q = request.query as Record<string, string | undefined>
    const productId = num(q.productId)
    if (!productId) return { error: 'productId gerekli', movements: [] }
    const warehouseId = num(q.warehouseId)
    const lines = await prisma.tBLDOCUMENTLINE.findMany({
      where: {
        productId,
        document: { companyId, status: 'COMPLETED', ...(warehouseId ? { warehouseId } : {}) },
      },
      include: {
        document: { select: { documentNo: true, documentDate: true, operationType: { select: { code: true, direction: true } } } },
        sourceLocation: { select: { code: true } },
        targetLocation: { select: { code: true } },
        unit: { select: { code: true } },
      },
      orderBy: { id: 'asc' },
    })
    const movements = lines.map((l) => {
      const dir = l.document.operationType.direction
      const qty = Number(l.quantity)
      return {
        date: l.document.documentDate,
        documentNo: l.document.documentNo,
        operation: l.document.operationType.code,
        direction: dir,
        inQty: dir === 'INBOUND' || dir === 'INTERNAL' ? qty : 0,
        outQty: dir === 'OUTBOUND' || dir === 'INTERNAL' ? qty : 0,
        sourceLocation: l.sourceLocation?.code ?? null,
        targetLocation: l.targetLocation?.code ?? null,
        unit: l.unit.code,
        batchNo: l.batchNo,
      }
    })
    return { productId, movementCount: movements.length, movements }
  })

  app.post('/reserve', { preHandler: [app.authenticate, app.requireWrite] }, async (request, reply) => {
    const parsed = keySchema.safeParse(request.body)
    if (!parsed.success) return reply.code(400).send({ error: 'Invalid body', details: parsed.error.flatten() })
    const { quantity, ...key } = parsed.data
    try {
      return await reserveStock({ companyId: getCompanyId(request), ...(key as Omit<StockKey, 'companyId'>) }, quantity)
    } catch (err) {
      if (err instanceof MovementError) return reply.code(409).send({ error: err.message })
      throw err
    }
  })

  app.post('/release', { preHandler: [app.authenticate, app.requireWrite] }, async (request, reply) => {
    const parsed = keySchema.safeParse(request.body)
    if (!parsed.success) return reply.code(400).send({ error: 'Invalid body', details: parsed.error.flatten() })
    const { quantity, ...key } = parsed.data
    try {
      return await releaseStock({ companyId: getCompanyId(request), ...(key as Omit<StockKey, 'companyId'>) }, quantity)
    } catch (err) {
      if (err instanceof MovementError) return reply.code(409).send({ error: err.message })
      throw err
    }
  })
}
