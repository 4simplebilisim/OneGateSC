import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { getCompanyId, companyListFilter } from '../lib/company.js'
import { runTransfer, TransferError } from '../lib/integrationTransfer.js'

const directions = ['IN', 'OUT'] as const
const statuses = ['PENDING', 'SUCCESS', 'ERROR'] as const

const createSchema = z.object({
  direction: z.enum(directions),
  entityType: z.string().min(1).max(40),
  status: z.enum(statuses).optional(),
  referenceKey: z.string().max(100).optional(),
  message: z.string().max(500).optional(),
})

// Manuel tetikleme (Entegrasyon Aktarım ekranı): paket + işlem tipi + yön (+ ops. adres) → gerçek deneme + log
const transferSchema = z.object({
  packageId: z.number().int().positive(),
  entityType: z.string().min(1).max(40),
  direction: z.enum(directions),
  addressId: z.number().int().positive().nullish(),
})
const retrySchema = z.object({ ids: z.array(z.number().int().positive()).min(1).max(100) })

// Entegrasyon aktarım logu — izleme (Uyarlamalar › Entegrasyon İzleme) + aktarım ekranı (İşlemler › Entegrasyon Aktarım)
export async function integrationLogRoutes(app: FastifyInstance) {
  app.get('/', async (request) => {
    const q = request.query as { direction?: string; entityType?: string; status?: string; packageId?: string; dateFrom?: string; dateTo?: string; q?: string }
    const logs = await prisma.tBLINTEGRATIONLOG.findMany({
      where: {
        companyId: getCompanyId(request),
        direction: directions.includes(q.direction as (typeof directions)[number]) ? (q.direction as (typeof directions)[number]) : undefined,
        entityType: q.entityType || undefined,
        status: statuses.includes(q.status as (typeof statuses)[number]) ? (q.status as (typeof statuses)[number]) : undefined,
        packageId: q.packageId ? Number(q.packageId) : undefined,
        createdAt: {
          gte: q.dateFrom ? new Date(q.dateFrom) : undefined,
          lte: q.dateTo ? new Date(`${q.dateTo}T23:59:59.999`) : undefined,
        },
        ...(q.q ? { OR: [{ referenceKey: { contains: q.q, mode: 'insensitive' as const } }, { message: { contains: q.q, mode: 'insensitive' as const } }] } : {}),
      },
      include: { package: { select: { code: true, name: true } }, address: { select: { name: true, path: true } } },
      orderBy: { id: 'desc' },
      take: 300,
    })
    // Kullanıcı adı çözümü (legacy TXTKULLANICIISIM karşılığı — FK ilişkisiz, elle join)
    const userIds = [...new Set(logs.map((l) => l.createdById).filter((x): x is number => x != null))]
    const users = userIds.length ? await prisma.tBLUSER.findMany({ where: { id: { in: userIds } }, select: { id: true, username: true } }) : []
    const uname = new Map(users.map((u) => [u.id, u.username]))
    return logs.map((l) => ({ ...l, userName: l.createdById != null ? (uname.get(l.createdById) ?? `#${l.createdById}`) : null }))
  })

  app.post('/', { preHandler: [app.authenticate, app.requireWrite] }, async (request, reply) => {
    const parsed = createSchema.safeParse(request.body)
    if (!parsed.success) return reply.code(400).send({ error: 'Invalid body', details: parsed.error.flatten() })
    // Elle log kaydı (API compat) — gerçek tetikleme için POST /transfer kullanılır
    const log = await prisma.tBLINTEGRATIONLOG.create({
      data: {
        companyId: getCompanyId(request),
        direction: parsed.data.direction,
        entityType: parsed.data.entityType,
        status: parsed.data.status ?? 'SUCCESS',
        referenceKey: parsed.data.referenceKey,
        message: parsed.data.message ?? `Manuel tetiklendi: ${parsed.data.entityType}`,
        createdById: (request.user as { sub?: number } | undefined)?.sub ?? null,
      },
    })
    return reply.code(201).send(log)
  })

  // Manuel aktarım tetikleme — gerçek token + uç çağrısı, sonuç yeni log satırı
  app.post('/transfer', { preHandler: [app.authenticate, app.requireWrite] }, async (request, reply) => {
    const parsed = transferSchema.safeParse(request.body)
    if (!parsed.success) return reply.code(400).send({ error: 'Invalid body', details: parsed.error.flatten() })
    try {
      const log = await runTransfer({
        companyId: getCompanyId(request),
        packageId: parsed.data.packageId,
        entityType: parsed.data.entityType.toUpperCase(),
        direction: parsed.data.direction,
        addressId: parsed.data.addressId ?? null,
        userId: (request.user as { sub?: number } | undefined)?.sub ?? null,
      })
      return reply.code(201).send(log)
    } catch (err) {
      if (err instanceof TransferError) return reply.code(400).send({ error: err.message })
      throw err
    }
  })

  // Seçili logları yeniden dene — her deneme YENİ satır yazar (legacy: her aktarım kaydı ayrı)
  app.post('/retry', { preHandler: [app.authenticate, app.requireWrite] }, async (request, reply) => {
    const parsed = retrySchema.safeParse(request.body)
    if (!parsed.success) return reply.code(400).send({ error: 'Invalid body', details: parsed.error.flatten() })
    const companyId = getCompanyId(request)
    const userId = (request.user as { sub?: number } | undefined)?.sub ?? null
    const results: { id: number; ok: boolean; status?: string; message: string; newLogId?: number }[] = []
    for (const id of parsed.data.ids) {
      const src = await prisma.tBLINTEGRATIONLOG.findFirst({ where: { id, companyId } })
      if (!src) { results.push({ id, ok: false, message: 'Kayıt bulunamadı' }); continue }
      if (src.packageId == null) { results.push({ id, ok: false, message: 'Paket bağı yok — yeniden denenemez (Aktar ile tetikleyin)' }); continue }
      try {
        const log = await runTransfer({ companyId, packageId: src.packageId, entityType: src.entityType, direction: src.direction, addressId: src.addressId, userId })
        results.push({ id, ok: log.status === 'SUCCESS', status: log.status, message: log.message ?? '', newLogId: log.id })
      } catch (err) {
        results.push({ id, ok: false, message: err instanceof TransferError ? err.message : 'Deneme başarısız' })
      }
    }
    return { results, success: results.filter((r) => r.ok).length, failed: results.filter((r) => !r.ok).length }
  })

  app.delete('/:id', { preHandler: [app.authenticate, app.requireWrite] }, async (request, reply) => {
    const id = Number((request.params as { id: string }).id)
    if (!Number.isInteger(id)) return reply.code(400).send({ error: 'Invalid id' })
    const existing = await prisma.tBLINTEGRATIONLOG.findFirst({ where: { id, ...companyListFilter(request) } })
    if (!existing) return reply.code(404).send({ error: 'Not found' })
    await prisma.tBLINTEGRATIONLOG.delete({ where: { id } })
    return reply.code(204).send()
  })
}
