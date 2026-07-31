import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { firstBadRef } from '../lib/refGuard.js'
import { getCompanyId, companyListFilter } from '../lib/company.js'

const directions = ['INBOUND', 'OUTBOUND', 'INTERNAL', 'COUNT'] as const
const docTypes = ['STOCK_MOVEMENT', 'COUNT', 'PRODUCTION', 'ORDER', 'OTHER'] as const
const controlModes = ['UNCONTROLLED', 'CONTROLLED', 'REFERENCE_CONTROLLED'] as const
const rotations = ['NONE', 'FIFO', 'FEFO'] as const // Stok rotasyonu (çıkış yönlendirme)

// Davranış flag'leri (legacy BYT*) — operasyon tipinin kalbi
const BOOL_FIELDS = [
  'emailSend', 'equivalentApplication', 'materialBasedCollection', 'materialBasedQtyEdit',
  'batchAssignment', 'qualityControl', 'detailLocationToCoverage', 'integration', 'approvedDocUpdate',
  'bulkSend', 'readBasedControl', 'readBasedInfoMessage', 'logging', 'logControl', 'grouping',
  'reasonRequired', 'reasonInHeader', 'sameUsePallet', 'sameUseSerial', 'passiveProductUse',
  'palletBreaking', 'originalQtyUpdate', 'reserveTransfer', 'partialUsage', 'affectsStock', 'isActive',
  'bulkAction', 'reservation', // Toplu İşlem (BYTTOPLUISLEM) + Rezervasyon — yönüne göre Toplu İşlem ekranında görünürlük
  'applyAssignment', // İş Ataması Uygula — el terminalinde atanmış-belge görünürlüğü
] as const
const boolShape = Object.fromEntries(BOOL_FIELDS.map((b) => [b, z.boolean().optional()]))

// EDIT'te boş bırakılan opsiyonel FK/enum'lar NULL gelir — .optional() null'ı reddedip 400 verir → .nullish()
// (FK kolonları nullable: null = bağı temizle; enum kolonları NOT NULL: null'lar handler'da atılır)
const baseShape = {
  direction: z.enum(directions),
  documentType: z.enum(docTypes).nullish(),
  controlMode: z.enum(controlModes).nullish(),
  stockRotation: z.enum(rotations).nullish(),
  facilityId: z.number().int().positive().nullish(),
  sequenceId: z.number().int().positive().nullish(),
  operationSequenceId: z.number().int().positive().nullish(),
  groupSequenceId: z.number().int().positive().nullish(),
  operationGroupId: z.number().int().positive().nullish(),
  reverseOperationTypeId: z.number().int().positive().nullish(),
  linkedEntryOperationTypeId: z.number().int().positive().nullish(), // Referans Kontrollü: onayda otomatik doğacak GİRİŞ operasyonu
  cancelLocationId: z.number().int().positive().nullish(),
  logControlDays: z.number().int().nullish(),
  ...boolShape,
}
// Enum kolonları NOT NULL (default'lu) — null geleni gönderme (mevcut/default değer korunur)
const dropNullEnums = (data: Record<string, unknown>) => {
  for (const k of ['documentType', 'controlMode', 'stockRotation']) if (data[k] === null) delete data[k]
}

const createSchema = z.object({
  code: z.string().min(1).max(20),
  name: z.string().min(1).max(100),
  ...baseShape,
})
const updateSchema = z.object({ name: z.string().min(1).max(100).optional(), ...baseShape }).partial()

// Ters operasyon yön kuralı: kategorisi giriş(INBOUND) olan operasyonun ters operasyonu giriş olamaz
// (çıkış için de simetrik) — ters hareket yönü çevirir. INTERNAL/COUNT için kısıt yok.
async function reverseDirectionError(companyId: number, direction: string | undefined, reverseOpId: number | null | undefined): Promise<string | null> {
  if (!reverseOpId || (direction !== 'INBOUND' && direction !== 'OUTBOUND')) return null
  const rev = await prisma.tBLOPERATIONTYPE.findFirst({ where: { id: reverseOpId, companyId }, select: { direction: true } })
  if (rev && rev.direction === direction) {
    const lbl = direction === 'INBOUND' ? 'giriş' : 'çıkış'
    return `Ters operasyon yönü hatalı: kategorisi ${lbl} olan operasyonun ters operasyonu da ${lbl} olamaz (ters hareket yönü çevirir).`
  }
  return null
}

// Cross-tenant FK: operasyonun referansladığı tesis/sayaç/lokasyon/grup AYNI firmaya ait olmalı
async function opRefsIssue(companyId: number, d: { facilityId?: number | null; sequenceId?: number | null; operationSequenceId?: number | null; groupSequenceId?: number | null; operationGroupId?: number | null; cancelLocationId?: number | null }): Promise<string | null> {
  const bad = await firstBadRef(companyId, [
    ['Tesis', 'facility', d.facilityId],
    ['Sayaç', 'sequence', d.sequenceId],
    ['Operasyon Sayaç', 'sequence', d.operationSequenceId],
    ['Grup Sayaç', 'sequence', d.groupSequenceId],
    ['Operasyon Grubu', 'operationGroup', d.operationGroupId],
    ['İptal Lokasyonu', 'location', d.cancelLocationId],
  ])
  return bad ? `${bad}: başka firmaya ait veya geçersiz` : null
}

// Bağlı giriş operasyonu (Referans Kontrollü): aynı firmaya ait + GİRİŞ (INBOUND) yönlü olmalı
async function linkedEntryError(companyId: number, linkedOpId: number | null | undefined): Promise<string | null> {
  if (linkedOpId == null) return null
  const op = await prisma.tBLOPERATIONTYPE.findFirst({ where: { id: linkedOpId, companyId }, select: { direction: true } })
  if (!op) return 'Bağlı giriş operasyonu bulunamadı (başka firmaya ait veya geçersiz)'
  if (op.direction !== 'INBOUND') return 'Bağlı giriş operasyonu GİRİŞ (INBOUND) yönlü olmalı — onayda karşı tarafta giriş belgesi doğar'
  return null
}

export async function operationTypeRoutes(app: FastifyInstance) {
  app.get('/', async (request) =>
    prisma.tBLOPERATIONTYPE.findMany({ where: { ...companyListFilter(request) }, orderBy: { code: 'asc' } }),
  )

  app.get('/:id', async (request, reply) => {
    const id = Number((request.params as { id: string }).id)
    if (!Number.isInteger(id)) return reply.code(400).send({ error: 'Invalid id' })
    const row = await prisma.tBLOPERATIONTYPE.findFirst({ where: { id, ...companyListFilter(request) } })
    if (!row) return reply.code(404).send({ error: 'Operation type not found' })
    return row
  })

  app.post('/', { preHandler: [app.authenticate, app.requireWrite] }, async (request, reply) => {
    const parsed = createSchema.safeParse(request.body)
    if (!parsed.success) return reply.code(400).send({ error: 'Invalid body', details: parsed.error.flatten() })
    dropNullEnums(parsed.data as Record<string, unknown>)
    const companyId = getCompanyId(request)
    const revErr = await reverseDirectionError(companyId, parsed.data.direction, parsed.data.reverseOperationTypeId)
    if (revErr) return reply.code(400).send({ error: revErr })
    const lnkErr = await linkedEntryError(companyId, parsed.data.linkedEntryOperationTypeId)
    if (lnkErr) return reply.code(400).send({ error: lnkErr })
    const refErr = await opRefsIssue(companyId, parsed.data)
    if (refErr) return reply.code(400).send({ error: refErr })
    // COUNT (Sayım) operasyonu stok HAREKETİ postlamaz — stok yalnız sayım motoru (equalize) ile düzeltilir → affectsStock DAİMA kapalı (çift-düzeltme önlenir)
    if (parsed.data.direction === 'COUNT') (parsed.data as Record<string, unknown>).affectsStock = false
    try {
      const opType = await prisma.tBLOPERATIONTYPE.create({ data: { ...parsed.data, companyId } })
      return reply.code(201).send(opType)
    } catch (err) {
      if ((err as { code?: string }).code === 'P2002') return reply.code(409).send({ error: 'Operasyon tipi kodu zaten var' })
      throw err
    }
  })

  app.patch('/:id', { preHandler: [app.authenticate, app.requireWrite] }, async (request, reply) => {
    const id = Number((request.params as { id: string }).id)
    if (!Number.isInteger(id)) return reply.code(400).send({ error: 'Invalid id' })
    const parsed = updateSchema.safeParse(request.body)
    if (!parsed.success) return reply.code(400).send({ error: 'Invalid body', details: parsed.error.flatten() })
    dropNullEnums(parsed.data as Record<string, unknown>)
    const companyId = getCompanyId(request)
    const existing = await prisma.tBLOPERATIONTYPE.findFirst({ where: { id, companyId } })
    if (!existing) return reply.code(404).send({ error: 'Operation type not found' })
    // Etkin yön + ters operasyon (payload'ta yoksa mevcut kayıttan) ile yön kuralını doğrula
    const direction = parsed.data.direction ?? existing.direction
    // COUNT (Sayım) operasyonu stok hareketi postlamaz → affectsStock DAİMA kapalı (yanlışlıkla açılırsa düzeltilir)
    if (direction === 'COUNT') (parsed.data as Record<string, unknown>).affectsStock = false
    const reverseOpId = parsed.data.reverseOperationTypeId ?? existing.reverseOperationTypeId
    const revErr = await reverseDirectionError(companyId, direction, reverseOpId)
    if (revErr) return reply.code(400).send({ error: revErr })
    const lnkErr = await linkedEntryError(companyId, parsed.data.linkedEntryOperationTypeId ?? existing.linkedEntryOperationTypeId)
    if (lnkErr) return reply.code(400).send({ error: lnkErr })
    const refErr = await opRefsIssue(companyId, parsed.data)
    if (refErr) return reply.code(400).send({ error: refErr })
    return prisma.tBLOPERATIONTYPE.update({ where: { id }, data: parsed.data })
  })

  app.delete('/:id', { preHandler: [app.authenticate, app.requireWrite] }, async (request, reply) => {
    const id = Number((request.params as { id: string }).id)
    if (!Number.isInteger(id)) return reply.code(400).send({ error: 'Invalid id' })
    try {
      const res = await prisma.tBLOPERATIONTYPE.deleteMany({ where: { id, ...companyListFilter(request) } })
      if (res.count === 0) return reply.code(404).send({ error: 'Operation type not found' })
      return { deleted: res.count }
    } catch (err) {
      if ((err as { code?: string }).code === 'P2003') return reply.code(409).send({ error: 'Operasyon tipi kullanımda — silinemez' })
      throw err
    }
  })
}
