import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { getCompanyId } from '../lib/company.js'
import { getMrpSuggestions, createPurchaseOrderFromMrp, InventoryError } from '../lib/inventory.js'

const ruleSchema = z.object({
  productId: z.number().int().positive(),
  warehouseId: z.number().int().positive(),
  minQty: z.number().min(0).optional(),
  maxQty: z.number().min(0).optional(),
  reorderPoint: z.number().min(0).optional(),
  reorderQty: z.number().min(0).optional(),
  isActive: z.boolean().optional(),
})

const mrpPoSchema = z.object({
  warehouseId: z.number().int().positive(),
  supplierId: z.number().int().positive(),
})

const num = (v?: string) => (v ? Number(v) : undefined)

export async function inventoryRoutes(app: FastifyInstance) {
  // Min/max kuralları
  app.get('/rules', async (request) => {
    const q = request.query as Record<string, string | undefined>
    return prisma.tBLINVENTORYRULE.findMany({
      where: { companyId: getCompanyId(request), productId: num(q.productId), warehouseId: num(q.warehouseId) },
      orderBy: { id: 'asc' },
      include: { product: { select: { code: true, name: true } }, warehouse: { select: { code: true } } },
    })
  })

  app.post('/rules', { preHandler: [app.authenticate, app.requireWrite] }, async (request, reply) => {
    const parsed = ruleSchema.safeParse(request.body)
    if (!parsed.success) return reply.code(400).send({ error: 'Invalid body', details: parsed.error.flatten() })
    try {
      const rule = await prisma.tBLINVENTORYRULE.create({
        data: { ...parsed.data, companyId: getCompanyId(request) },
      })
      return reply.code(201).send(rule)
    } catch (err) {
      const code = (err as { code?: string }).code
      if (code === 'P2002') return reply.code(409).send({ error: 'Bu ürün+depo için kural zaten var' })
      if (code === 'P2003') return reply.code(400).send({ error: 'Geçersiz ürün veya depo' })
      throw err
    }
  })

  // MRP — reorder önerileri
  app.get('/mrp', async (request) => {
    const q = request.query as { warehouseId?: string }
    return getMrpSuggestions(getCompanyId(request), num(q.warehouseId))
  })

  // MRP önerilerinden taslak satınalma siparişi
  app.post('/mrp/purchase-order', { preHandler: [app.authenticate, app.requireWrite] }, async (request, reply) => {
    const parsed = mrpPoSchema.safeParse(request.body)
    if (!parsed.success) return reply.code(400).send({ error: 'Invalid body', details: parsed.error.flatten() })
    try {
      const po = await createPurchaseOrderFromMrp(
        getCompanyId(request),
        parsed.data.warehouseId,
        parsed.data.supplierId,
        request.user.sub,
        new Date(),
      )
      return reply.code(201).send(po)
    } catch (err) {
      if (err instanceof InventoryError) return reply.code(409).send({ error: err.message })
      if ((err as { code?: string }).code === 'P2003') return reply.code(400).send({ error: 'Geçersiz tedarikçi veya depo' })
      throw err
    }
  })
}
