import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { getCompanyId } from '../lib/company.js'

const bodySchema = z.object({
  productId: z.number().int().positive(),
  substituteProductId: z.number().int().positive(),
})

export async function productSubstituteRoutes(app: FastifyInstance) {
  app.get('/', async (request) => {
    const q = request.query as { productId?: string }
    return prisma.tBLPRODUCTSUBSTITUTE.findMany({
      where: { productId: q.productId ? Number(q.productId) : undefined },
      include: { substitute: { select: { id: true, code: true, name: true } } },
      orderBy: { id: 'asc' },
    })
  })

  app.post('/', { preHandler: [app.authenticate, app.requireWrite] }, async (request, reply) => {
    const parsed = bodySchema.safeParse(request.body)
    if (!parsed.success) return reply.code(400).send({ error: 'Invalid body', details: parsed.error.flatten() })
    // Ürünün bu şirkete ait olduğunu doğrula
    const product = await prisma.tBLPRODUCT.findFirst({ where: { id: parsed.data.productId, companyId: getCompanyId(request) } })
    if (!product) return reply.code(400).send({ error: 'Geçersiz ürün' })
    try {
      return reply.code(201).send(await prisma.tBLPRODUCTSUBSTITUTE.create({
        data: parsed.data,
        include: { substitute: { select: { id: true, code: true, name: true } } },
      }))
    } catch (e) {
      if ((e as { code?: string }).code === 'P2002') return reply.code(409).send({ error: 'Bu muadil zaten tanımlı' })
      if ((e as { code?: string }).code === 'P2003') return reply.code(400).send({ error: 'Geçersiz muadil ürün' })
      throw e
    }
  })

  app.delete('/:id', { preHandler: [app.authenticate, app.requireWrite] }, async (request, reply) => {
    const id = Number((request.params as { id: string }).id)
    const row = await prisma.tBLPRODUCTSUBSTITUTE.findFirst({
      where: { id },
      include: { product: { select: { companyId: true } } },
    })
    if (!row || row.product.companyId !== getCompanyId(request)) return reply.code(404).send({ error: 'Not found' })
    await prisma.tBLPRODUCTSUBSTITUTE.delete({ where: { id } })
    return reply.code(204).send()
  })
}
