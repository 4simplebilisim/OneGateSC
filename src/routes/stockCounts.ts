import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { getCompanyId, companyListFilter } from '../lib/company.js'
import { createCount, setCounted, completeCount, cancelCount, reverseEqualize, deleteCount, countDifferences, CountingError, assignedCountIds} from '../lib/counting.js'
import { firstBadRef, type RefModel } from '../lib/refGuard.js'
import { assertUserAuthorized, AuthorizationError } from '../lib/userAuth.js'

const scope = z.enum(['ALL', 'GROUP', 'SPECIFIC'])
const createSchema = z.object({
  countNo: z.string().min(1).max(40),
  warehouseId: z.number().int().positive(),
  countType: z.string().max(20).optional(),
  operationTypeId: z.number().int().positive().optional(), // Sayım Operasyonu → parametreler (eşitleme vb.)
  locationId: z.number().int().positive().optional(), // kapsam: belirli lokasyon
  productId: z.number().int().positive().optional(), // kapsam: belirli ürün (geriye dönük)
  note: z.string().max(500).optional(),
  // Bağlantı Tipi kapsamı (StokBar Sayım Belge): Malzeme + Kullanıcı → Hepsi/Grup/Kod
  materialLinkType: scope.optional(),
  materialLinkId: z.number().int().positive().optional(), // GROUP→ürün grubu, SPECIFIC→ürün
  userLinkType: scope.optional(),
  userLinkId: z.number().int().positive().optional(), // GROUP→kullanıcı grubu, SPECIFIC→kullanıcı
})

const idOf = (request: FastifyRequest) => Number((request.params as { id: string }).id)

export async function stockCountRoutes(app: FastifyInstance) {
  // Mevcut sayımın deposu/operasyonu için yetki kontrolü (kısıtlama-listesi) — yetkisiz 403, sayım yoksa 404.
  // false dönerse çağıran reply'ı gönderilmiştir; handler `return reply` ile durur.
  const assertCountAuth = async (request: FastifyRequest, reply: FastifyReply, id: number): Promise<boolean> => {
    const count = await prisma.tBLSTOCKCOUNT.findFirst({ where: { id, companyId: getCompanyId(request) }, select: { warehouseId: true, operationTypeId: true } })
    if (!count) { reply.code(404).send({ error: 'Stock count not found' }); return false }
    try {
      await assertUserAuthorized(request, { warehouseId: count.warehouseId, operationTypeId: count.operationTypeId })
      return true
    } catch (err) {
      if (err instanceof AuthorizationError) { reply.code(403).send({ error: err.message }); return false }
      throw err
    }
  }

  app.get('/', async (request) => {
    const q = request.query as { status?: string; assignedFor?: string }
    const statuses = ['DRAFT', 'COUNTING', 'COMPLETED', 'CANCELLED'] as const
    const companyId = getCompanyId(request)
    // El terminali: ?assignedFor=me → yalnız bana atanmış sayımlar.
    // Hiç atama tanımlanmamışsa liste kısıtlanmaz (kısıtlama-listesi deseni).
    let idFilter: { in: number[] } | undefined
    if (q.assignedFor === 'me') {
      const uid = Number((request.user as { sub?: number | string })?.sub) || 0
      const varMi = await prisma.tBLCOUNTASSIGNMENT.count({ where: { companyId, isActive: true } })
      if (varMi) idFilter = { in: await assignedCountIds(companyId, uid) }
    }
    return prisma.tBLSTOCKCOUNT.findMany({
      where: {
        companyId,
        status: statuses.includes(q.status as (typeof statuses)[number]) ? (q.status as (typeof statuses)[number]) : undefined,
        ...(idFilter ? { id: idFilter } : {}),
      },
      orderBy: { id: 'desc' },
      include: { _count: { select: { lines: true } } },
    })
  })

  app.get('/:id', async (request, reply) => {
    const id = idOf(request)
    if (!Number.isInteger(id)) return reply.code(400).send({ error: 'Invalid id' })
    // tenant: yalnız kendi firmasının sayımı (findUnique yerine findFirst + companyListFilter — sızıntı kapandı)
    const count = await prisma.tBLSTOCKCOUNT.findFirst({ where: { id, ...companyListFilter(request) }, include: { lines: { orderBy: { lineNo: 'asc' } } } })
    if (!count) return reply.code(404).send({ error: 'Stock count not found' })
    // Satır ürün/lokasyon/birim KODLARINI çöz (TBLSTOCKCOUNTLINE'da relation yok — manuel join, sayım giriş ekranı için)
    const pick = <K extends string>(arr: { productId: number; locationId: number; unitId: number }[], k: 'productId' | 'locationId' | 'unitId') => [...new Set(arr.map((l) => l[k]))]
    const [products, locations, units] = await Promise.all([
      prisma.tBLPRODUCT.findMany({ where: { id: { in: pick(count.lines, 'productId') } }, select: { id: true, code: true, name: true } }),
      prisma.tBLLOCATION.findMany({ where: { id: { in: pick(count.lines, 'locationId') } }, select: { id: true, code: true } }),
      prisma.tBLUNIT.findMany({ where: { id: { in: pick(count.lines, 'unitId') } }, select: { id: true, code: true } }),
    ])
    const pMap = new Map(products.map((p) => [p.id, p])), lMap = new Map(locations.map((l) => [l.id, l.code])), uMap = new Map(units.map((u) => [u.id, u.code]))
    // KÖR SAYIM (legacy BYTSAYIMTIP=1): sayım bitene dek sayıcı SİSTEM miktarını görmez — systemQty maskelenir.
    // Fark COMPLETED sonrası görünür (DB'de değer durur; yalnız yanıt maskeler). Parametre sayım operasyonundan çözülür.
    const param = count.operationTypeId
      ? await prisma.tBLCOUNTPARAMETER.findFirst({ where: { companyId: count.companyId, operationTypeId: count.operationTypeId }, select: { countType: true } })
      : null
    const blindCount = param?.countType === 1 && count.status !== 'COMPLETED'
    const lines = count.lines.map((l) => ({
      ...l,
      ...(blindCount ? { systemQty: null } : {}),
      productCode: pMap.get(l.productId)?.code, productName: pMap.get(l.productId)?.name, locationCode: lMap.get(l.locationId), unitCode: uMap.get(l.unitId),
    }))
    const warehouse = await prisma.tBLWAREHOUSE.findUnique({ where: { id: count.warehouseId }, select: { code: true, name: true } })
    return { ...count, lines, blindCount, warehouseCode: warehouse?.code, warehouseName: warehouse?.name }
  })

  app.post('/', { preHandler: [app.authenticate, app.requireWrite] }, async (request, reply) => {
    const parsed = createSchema.safeParse(request.body)
    if (!parsed.success) return reply.code(400).send({ error: 'Invalid body', details: parsed.error.flatten() })
    const companyId = getCompanyId(request)
    const d = parsed.data
    // Bağlantı Tipi seçiliyse (Kod/Grup) hedef id zorunlu
    if ((d.materialLinkType === 'SPECIFIC' || d.materialLinkType === 'GROUP') && !d.materialLinkId)
      return reply.code(400).send({ error: 'Malzeme Bağlantı Tipi Kod/Grup iken Ürün/Ürün Grubu zorunlu' })
    if ((d.userLinkType === 'SPECIFIC' || d.userLinkType === 'GROUP') && !d.userLinkId)
      return reply.code(400).send({ error: 'Kullanıcı Bağlantı Tipi Kod/Grup iken Kullanıcı/Kullanıcı Grubu zorunlu' })
    // Çapraz-firma FK: depo + kapsam referansları aynı firmaya ait olmalı (Kod→ürün/kullanıcı, Grup→grup)
    const refs: [string, RefModel, number | null | undefined][] = [['Depo', 'warehouse', d.warehouseId], ['Sayım Operasyonu', 'operationType', d.operationTypeId]]
    if (d.materialLinkType === 'SPECIFIC') refs.push(['Ürün', 'product', d.materialLinkId])
    if (d.materialLinkType === 'GROUP') refs.push(['Ürün Grubu', 'productGroup', d.materialLinkId])
    if (d.userLinkType === 'SPECIFIC') refs.push(['Kullanıcı', 'user', d.userLinkId])
    if (d.userLinkType === 'GROUP') refs.push(['Kullanıcı Grubu', 'userGroup', d.userLinkId])
    const bad = await firstBadRef(companyId, refs)
    if (bad) return reply.code(400).send({ error: `${bad}: başka firmaya ait veya geçersiz` })
    // Yetki (kısıtlama-listesi): kullanıcının bu DEPO (+ tesisi) ve varsa sayım OPERASYONU için yetkisi olmalı → yetkisiz 403
    try {
      await assertUserAuthorized(request, { warehouseId: d.warehouseId, operationTypeId: d.operationTypeId })
    } catch (err) {
      if (err instanceof AuthorizationError) return reply.code(403).send({ error: err.message })
      throw err
    }
    try {
      const count = await createCount(companyId, d.warehouseId, d.countNo, request.user.sub, {
        note: d.note, countType: d.countType, operationTypeId: d.operationTypeId, locationId: d.locationId, productId: d.productId,
        materialLinkType: d.materialLinkType, materialLinkId: d.materialLinkId,
        userLinkType: d.userLinkType, userLinkId: d.userLinkId,
      })
      return reply.code(201).send(count)
    } catch (err) {
      if (err instanceof CountingError) return reply.code(409).send({ error: err.message })
      throw err
    }
  })

  app.post('/:id/lines/:lineId/count', { preHandler: [app.authenticate, app.requireWrite] }, async (request, reply) => {
    const id = idOf(request)
    const lineId = Number((request.params as { lineId: string }).lineId)
    if (!Number.isInteger(id) || !Number.isInteger(lineId)) return reply.code(400).send({ error: 'Invalid id' })
    const body = z.object({ countedQty: z.number().min(0) }).safeParse(request.body)
    if (!body.success) return reply.code(400).send({ error: 'Invalid body', details: body.error.flatten() })
    if (!(await assertCountAuth(request, reply, id))) return reply // yetki: bu sayımın deposu/operasyonu
    try {
      return await setCounted(id, lineId, body.data.countedQty, Number((request.user as { sub?: number | string })?.sub) || null)
    } catch (err) {
      if (err instanceof CountingError) return reply.code(409).send({ error: err.message })
      throw err
    }
  })

  const wrap = (fn: (id: number, userId: number | null) => Promise<unknown>) => async (request: FastifyRequest, reply: FastifyReply) => {
    const id = idOf(request)
    if (!Number.isInteger(id)) return reply.code(400).send({ error: 'Invalid id' })
    if (!(await assertCountAuth(request, reply, id))) return reply
    const userId = Number((request.user as { sub?: number | string })?.sub) || null
    try {
      return await fn(id, userId)
    } catch (err) {
      if (err instanceof CountingError) return reply.code(409).send({ error: err.message })
      throw err
    }
  }

  app.post('/:id/complete', { preHandler: [app.authenticate, app.requireWrite] }, wrap((id, userId) => completeCount(id, new Date(), userId)))
  app.post('/:id/cancel', { preHandler: [app.authenticate, app.requireWrite] }, wrap((id) => cancelCount(id)))
  app.post('/:id/reverse-equalize', { preHandler: [app.authenticate, app.requireWrite] }, wrap((id, userId) => reverseEqualize(id, userId)))
  // Yanlış açılan sayımı listeden KALDIR (cancel yalnız durumu değiştiriyordu, kayıt kalıyordu)
  app.delete('/:id', { preHandler: [app.authenticate, app.requireWrite] }, wrap((id) => deleteCount(id)))
}

// Sayım Fark raporu (Sayım Fark / Onaylı Sayım Fark) — /api/count-differences
export async function countDifferenceRoutes(app: FastifyInstance) {
  app.get('/', async (request) => {
    const q = request.query as { completed?: string }
    return countDifferences(getCompanyId(request), q.completed === 'true')
  })
}
