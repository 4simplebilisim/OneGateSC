import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { getCompanyId } from '../lib/company.js'

const createSchema = z.object({
  code: z.string().min(1).max(40),
  name: z.string().max(120).optional(),
  type: z.enum(['IPP', 'ZPL', 'SYSTEM']).optional(),
  host: z.string().max(120).optional(),
  port: z.number().int().positive().optional(),
  path: z.string().max(200).optional(),
  location: z.string().max(120).optional(),
  isDefault: z.boolean().optional(),
  discovered: z.boolean().optional(),
  isActive: z.boolean().optional(),
})
const updateSchema = createSchema.partial().omit({ code: true })

type Discovered = { name: string; host: string; port: number; type: 'IPP' | 'ZPL'; path?: string }

/** mDNS ile ağ yazıcılarını tara (_ipp._tcp + _pdl-datastream._tcp). Kütüphane/ağ yoksa boş döner. */
async function discoverPrinters(timeoutMs = 2500): Promise<{ printers: Discovered[]; note?: string }> {
  let Bonjour: typeof import('bonjour-service').Bonjour
  try {
    Bonjour = (await import('bonjour-service')).Bonjour
  } catch {
    return { printers: [], note: 'mDNS kütüphanesi yüklü değil' }
  }
  return new Promise((resolve) => {
    const found = new Map<string, Discovered>()
    let instance: InstanceType<typeof Bonjour> | null = null
    try {
      instance = new Bonjour()
    } catch {
      resolve({ printers: [], note: 'mDNS başlatılamadı' })
      return
    }
    const add = (svc: { name?: string; host?: string; referer?: { address?: string }; addresses?: string[]; port?: number; txt?: Record<string, string> }, type: 'IPP' | 'ZPL') => {
      const host = svc.addresses?.find((a) => a.includes('.')) ?? svc.host ?? svc.referer?.address
      if (!host || !svc.port) return
      const key = `${host}:${svc.port}`
      if (found.has(key)) return
      found.set(key, { name: svc.name ?? host, host, port: svc.port, type, path: svc.txt?.rp ? `/${svc.txt.rp}` : undefined })
    }
    try {
      instance.find({ type: 'ipp' }, (s) => add(s as never, 'IPP'))
      instance.find({ type: 'pdl-datastream' }, (s) => add(s as never, 'ZPL'))
    } catch {
      /* tarama hatası yutulur */
    }
    setTimeout(() => {
      try { instance?.destroy() } catch { /* ignore */ }
      const printers = [...found.values()]
      resolve({ printers, note: printers.length ? undefined : 'Ağda yayın yapan yazıcı bulunamadı (backend yazıcılarla aynı LAN’da mı?)' })
    }, timeoutMs)
  })
}

export async function printerRoutes(app: FastifyInstance) {
  app.get('/', async (request) =>
    prisma.tBLPRINTER.findMany({ where: { companyId: getCompanyId(request) }, orderBy: [{ isDefault: 'desc' }, { code: 'asc' }] }),
  )

  app.get('/:id', async (request, reply) => {
    const id = Number((request.params as { id: string }).id)
    if (!Number.isInteger(id)) return reply.code(400).send({ error: 'Invalid id' })
    const row = await prisma.tBLPRINTER.findFirst({ where: { id, companyId: getCompanyId(request) } })
    if (!row) return reply.code(404).send({ error: 'Printer not found' })
    return row
  })

  // Ağ keşfi — mDNS taraması (kaydetmez, sadece bulur)
  app.post('/discover', { preHandler: [app.authenticate] }, async () => discoverPrinters())

  app.post('/', { preHandler: [app.authenticate, app.requireWrite] }, async (request, reply) => {
    const parsed = createSchema.safeParse(request.body)
    if (!parsed.success) return reply.code(400).send({ error: 'Invalid body', details: parsed.error.flatten() })
    const companyId = getCompanyId(request)
    try {
      const row = await prisma.$transaction(async (tx) => {
        if (parsed.data.isDefault) await tx.tBLPRINTER.updateMany({ where: { companyId }, data: { isDefault: false } })
        return tx.tBLPRINTER.create({ data: { ...parsed.data, companyId } })
      })
      return reply.code(201).send(row)
    } catch (err) {
      if ((err as { code?: string }).code === 'P2002') return reply.code(409).send({ error: 'Yazıcı kodu zaten var' })
      throw err
    }
  })

  app.patch('/:id', { preHandler: [app.authenticate, app.requireWrite] }, async (request, reply) => {
    const id = Number((request.params as { id: string }).id)
    if (!Number.isInteger(id)) return reply.code(400).send({ error: 'Invalid id' })
    const parsed = updateSchema.safeParse(request.body)
    if (!parsed.success) return reply.code(400).send({ error: 'Invalid body', details: parsed.error.flatten() })
    const companyId = getCompanyId(request)
    const existing = await prisma.tBLPRINTER.findFirst({ where: { id, companyId } })
    if (!existing) return reply.code(404).send({ error: 'Printer not found' })
    return prisma.$transaction(async (tx) => {
      if (parsed.data.isDefault) await tx.tBLPRINTER.updateMany({ where: { companyId }, data: { isDefault: false } })
      return tx.tBLPRINTER.update({ where: { id }, data: parsed.data })
    })
  })

  app.delete('/:id', { preHandler: [app.authenticate, app.requireWrite] }, async (request, reply) => {
    const id = Number((request.params as { id: string }).id)
    if (!Number.isInteger(id)) return reply.code(400).send({ error: 'Invalid id' })
    const res = await prisma.tBLPRINTER.deleteMany({ where: { id, companyId: getCompanyId(request) } })
    if (res.count === 0) return reply.code(404).send({ error: 'Printer not found' })
    return reply.code(204).send()
  })
}
