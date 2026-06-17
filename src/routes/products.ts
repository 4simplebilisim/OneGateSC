import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { getCompanyId } from '../lib/company.js'
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
  isActive: z.boolean().optional(),
})

export async function productRoutes(app: FastifyInstance) {
  app.get('/', async (request) => {
    const companyId = getCompanyId(request)
    const q = request.query as { search?: string }
    const where = {
      companyId,
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

    const product = await prisma.tBLPRODUCT.findUnique({
      where: { id },
      include: { unit: true },
    })
    if (!product) return reply.code(404).send({ error: 'Product not found' })
    return product
  })

  app.post('/', { preHandler: [app.authenticate, app.requireWrite] }, async (request, reply) => {
    const parsed = createSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.code(400).send({ error: 'Invalid body', details: parsed.error.flatten() })
    }
    try {
      const product = await prisma.tBLPRODUCT.create({
        data: { ...parsed.data, companyId: getCompanyId(request) },
      })
      return reply.code(201).send(product)
    } catch (err) {
      const code = (err as { code?: string }).code
      if (code === 'P2002') {
        return reply.code(409).send({ error: 'Product code already exists' })
      }
      if (code === 'P2003') {
        return reply.code(400).send({ error: 'Unit does not exist' })
      }
      throw err
    }
  })

  app.patch('/:id', { preHandler: [app.authenticate, app.requireWrite] }, async (request, reply) => {
    const id = Number((request.params as { id: string }).id)
    if (!Number.isInteger(id)) return reply.code(400).send({ error: 'Invalid id' })
    const parsed = updateSchema.safeParse(request.body)
    if (!parsed.success) return reply.code(400).send({ error: 'Invalid body', details: parsed.error.flatten() })
    const existing = await prisma.tBLPRODUCT.findFirst({ where: { id, companyId: getCompanyId(request) } })
    if (!existing) return reply.code(404).send({ error: 'Product not found' })
    try {
      const product = await prisma.tBLPRODUCT.update({ where: { id }, data: parsed.data, include: { unit: true } })
      return product
    } catch (err) {
      if ((err as { code?: string }).code === 'P2003') return reply.code(400).send({ error: 'Unit does not exist' })
      throw err
    }
  })
}
