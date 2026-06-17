import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { getCompanyId } from '../lib/company.js'

const locationTypes = ['SHELF', 'FLOOR', 'RECEIVING', 'SHIPPING', 'STAGING', 'QUARANTINE'] as const

const createSchema = z.object({
  warehouseId: z.number().int().positive(),
  areaId: z.number().int().positive().nullable().optional(),
  code: z.string().min(1).max(40),
  name: z.string().max(100).optional(),
  type: z.enum(locationTypes).optional(),
  barcode: z.string().max(60).nullable().optional(),
  priority: z.number().int().nullable().optional(),
  isActive: z.boolean().optional(),
})
const updateSchema = createSchema.partial().omit({ warehouseId: true })

export async function locationRoutes(app: FastifyInstance) {
  app.get('/', async (request) => {
    const companyId = getCompanyId(request)
    const query = request.query as { warehouseId?: string }
    const warehouseId = query.warehouseId ? Number(query.warehouseId) : undefined
    return prisma.tBLLOCATION.findMany({
      where: { companyId, ...(warehouseId ? { warehouseId } : {}) },
      orderBy: [{ warehouseId: 'asc' }, { code: 'asc' }],
    })
  })

  app.post('/', { preHandler: [app.authenticate, app.requireWrite] }, async (request, reply) => {
    const parsed = createSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.code(400).send({ error: 'Invalid body', details: parsed.error.flatten() })
    }
    try {
      const location = await prisma.tBLLOCATION.create({
        data: { ...parsed.data, companyId: getCompanyId(request) },
      })
      return reply.code(201).send(location)
    } catch (err) {
      const code = (err as { code?: string }).code
      if (code === 'P2002') {
        return reply.code(409).send({ error: 'Location code already exists in this warehouse' })
      }
      if (code === 'P2003') {
        return reply.code(400).send({ error: 'Warehouse does not exist' })
      }
      throw err
    }
  })

  app.get('/:id', async (request, reply) => {
    const id = Number((request.params as { id: string }).id)
    if (!Number.isInteger(id)) return reply.code(400).send({ error: 'Invalid id' })
    const location = await prisma.tBLLOCATION.findFirst({ where: { id, companyId: getCompanyId(request) } })
    if (!location) return reply.code(404).send({ error: 'Location not found' })
    return location
  })

  app.patch('/:id', { preHandler: [app.authenticate, app.requireWrite] }, async (request, reply) => {
    const id = Number((request.params as { id: string }).id)
    if (!Number.isInteger(id)) return reply.code(400).send({ error: 'Invalid id' })
    const parsed = updateSchema.safeParse(request.body)
    if (!parsed.success) return reply.code(400).send({ error: 'Invalid body', details: parsed.error.flatten() })
    const existing = await prisma.tBLLOCATION.findFirst({ where: { id, companyId: getCompanyId(request) } })
    if (!existing) return reply.code(404).send({ error: 'Location not found' })
    try {
      return await prisma.tBLLOCATION.update({ where: { id }, data: parsed.data })
    } catch (err) {
      const code = (err as { code?: string }).code
      if (code === 'P2002') return reply.code(409).send({ error: 'Location code already exists in this warehouse' })
      if (code === 'P2003') return reply.code(400).send({ error: 'Geçersiz alan' })
      throw err
    }
  })

  app.delete('/:id', { preHandler: [app.authenticate, app.requireWrite] }, async (request, reply) => {
    const id = Number((request.params as { id: string }).id)
    if (!Number.isInteger(id)) return reply.code(400).send({ error: 'Invalid id' })
    const existing = await prisma.tBLLOCATION.findFirst({ where: { id, companyId: getCompanyId(request) } })
    if (!existing) return reply.code(404).send({ error: 'Location not found' })
    try {
      await prisma.tBLLOCATION.delete({ where: { id } })
      return reply.code(204).send()
    } catch (err) {
      if ((err as { code?: string }).code === 'P2003') return reply.code(409).send({ error: 'Lokasyon kullanımda — silinemez' })
      throw err
    }
  })

  // Seviye-bazlı toplu lokasyon üretme (StokBar "Seviye" diyaloğu): her seviye start/end/increment → kartezyen çarpım
  const levelSchema = z.object({ start: z.number().int(), end: z.number().int(), increment: z.number().int().positive().default(1) })
  const bulkSchema = z.object({
    warehouseId: z.number().int().positive(),
    areaId: z.number().int().positive().optional(),
    type: z.enum(locationTypes).optional(),
    prefix: z.string().max(20).optional(),
    separator: z.string().max(3).optional(),
    pad: z.boolean().optional(),
    levels: z.array(levelSchema).min(1).max(4),
  })

  app.post('/bulk-generate', { preHandler: [app.authenticate, app.requireWrite] }, async (request, reply) => {
    const parsed = bulkSchema.safeParse(request.body)
    if (!parsed.success) return reply.code(400).send({ error: 'Invalid body', details: parsed.error.flatten() })
    const { warehouseId, areaId, type, prefix = '', separator = '-', pad = true, levels } = parsed.data
    for (const l of levels) {
      if (l.end < l.start) return reply.code(400).send({ error: 'Bitiş, başlangıçtan küçük olamaz' })
    }
    // her seviyenin değer listesi + dolgu genişliği
    const lists = levels.map((l) => {
      const vals: number[] = []
      for (let v = l.start; v <= l.end; v += l.increment) vals.push(v)
      return { vals, width: pad ? String(l.end).length : 0 }
    })
    const total = lists.reduce((acc, l) => acc * l.vals.length, 1)
    if (total === 0) return reply.code(400).send({ error: 'Üretilecek kombinasyon yok' })
    if (total > 5000) return reply.code(400).send({ error: `Çok fazla kombinasyon (${total}) — en fazla 5000` })

    // kartezyen çarpım
    let combos: number[][] = [[]]
    for (const { vals } of lists) {
      const next: number[][] = []
      for (const c of combos) for (const v of vals) next.push([...c, v])
      combos = next
    }
    const companyId = getCompanyId(request)
    const data = combos.map((combo) => {
      const code = prefix + combo.map((v, i) => String(v).padStart(lists[i]!.width, '0')).join(separator)
      return { companyId, warehouseId, areaId, code, name: code, type }
    })

    try {
      const res = await prisma.tBLLOCATION.createMany({ data, skipDuplicates: true })
      return reply.code(201).send({ requested: total, created: res.count, skipped: total - res.count, sample: data.slice(0, 5).map((d) => d.code) })
    } catch (err) {
      if ((err as { code?: string }).code === 'P2003') return reply.code(400).send({ error: 'Geçersiz depo / alan' })
      throw err
    }
  })
}
