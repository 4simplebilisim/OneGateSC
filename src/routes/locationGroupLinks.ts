import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { getCompanyId } from '../lib/company.js'

// /api/location-groups altına eklenir: /:id/locations (M-N)
export async function locationGroupLinkRoutes(app: FastifyInstance) {
  app.get('/:id/locations', async (request, reply) => {
    const id = Number((request.params as { id: string }).id)
    if (!Number.isInteger(id)) return reply.code(400).send({ error: 'Invalid id' })
    const links = await prisma.tBLLOCATIONGROUPLINK.findMany({
      where: { locationGroupId: id, companyId: getCompanyId(request) },
      include: { location: { select: { id: true, code: true, name: true, warehouseId: true } } },
      orderBy: { id: 'asc' },
    })
    return links.map((l) => l.location)
  })

  app.post('/:id/locations', { preHandler: [app.authenticate, app.requireWrite] }, async (request, reply) => {
    const id = Number((request.params as { id: string }).id)
    if (!Number.isInteger(id)) return reply.code(400).send({ error: 'Invalid id' })
    const body = z.object({ locationId: z.number().int().positive() }).safeParse(request.body)
    if (!body.success) return reply.code(400).send({ error: 'Invalid body', details: body.error.flatten() })
    const companyId = getCompanyId(request)
    const group = await prisma.tBLLOCATIONGROUP.findFirst({ where: { id, companyId } })
    if (!group) return reply.code(404).send({ error: 'Location group not found' })
    try {
      const link = await prisma.tBLLOCATIONGROUPLINK.create({
        data: { companyId, locationGroupId: id, locationId: body.data.locationId },
      })
      return reply.code(201).send(link)
    } catch (err) {
      const code = (err as { code?: string }).code
      if (code === 'P2002') return reply.code(409).send({ error: 'Lokasyon zaten bu grupta' })
      if (code === 'P2003') return reply.code(400).send({ error: 'Geçersiz lokasyon' })
      throw err
    }
  })

  app.delete('/:id/locations/:locationId', { preHandler: [app.authenticate, app.requireWrite] }, async (request, reply) => {
    const id = Number((request.params as { id: string }).id)
    const locationId = Number((request.params as { locationId: string }).locationId)
    if (!Number.isInteger(id) || !Number.isInteger(locationId)) return reply.code(400).send({ error: 'Invalid id' })
    const res = await prisma.tBLLOCATIONGROUPLINK.deleteMany({
      where: { locationGroupId: id, locationId, companyId: getCompanyId(request) },
    })
    if (res.count === 0) return reply.code(404).send({ error: 'Bağlantı bulunamadı' })
    return { removed: res.count }
  })
}
