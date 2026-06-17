import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { getCompanyId } from '../lib/company.js'
import { completeDocument, reverseDocument, MovementError } from '../lib/movement.js'
import { docStatusId, DOC_STATUS } from '../lib/documentStatus.js'
import { nextSequence } from '../lib/sequence.js'
import { suggestPutawayLocations } from '../lib/routing.js'

const lineSchema = z.object({
  productId: z.number().int().positive(),
  unitId: z.number().int().positive(),
  quantity: z.number().positive(),
  sourceLocationId: z.number().int().positive().optional(),
  sourceStatusId: z.number().int().positive().optional(),
  targetLocationId: z.number().int().positive().optional(),
  targetStatusId: z.number().int().positive().optional(),
  palletId: z.number().int().positive().optional(),
  batchNo: z.string().max(100).optional(),
  serialNo: z.string().max(100).optional(),
  note: z.string().max(255).optional(),
})

const createSchema = z.object({
  documentNo: z.string().min(1).max(40).optional(), // verilmezse operasyon tipinin sayacından üretilir
  operationTypeId: z.number().int().positive(),
  warehouseId: z.number().int().positive(),
  partnerId: z.number().int().positive().optional(),
  reasonId: z.number().int().positive().optional(),
  documentDate: z.string().optional(),
  note: z.string().max(500).optional(),
  lines: z.array(lineSchema).min(1),
})

const lineInclude = {
  product: { select: { id: true, code: true, name: true } },
  unit: { select: { id: true, code: true } },
  sourceLocation: { select: { id: true, code: true } },
  targetLocation: { select: { id: true, code: true } },
  sourceStatus: { select: { id: true, code: true } },
  targetStatus: { select: { id: true, code: true } },
} as const

export async function documentRoutes(app: FastifyInstance) {
  app.get('/', async (request) => {
    const companyId = getCompanyId(request)
    const query = request.query as { warehouseId?: string; status?: string; operationTypeId?: string }
    const statuses = ['DRAFT', 'CONFIRMED', 'COMPLETED', 'CANCELLED'] as const
    return prisma.tBLDOCUMENT.findMany({
      where: {
        companyId,
        warehouseId: query.warehouseId ? Number(query.warehouseId) : undefined,
        operationTypeId: query.operationTypeId ? Number(query.operationTypeId) : undefined,
        status: statuses.includes(query.status as (typeof statuses)[number])
          ? (query.status as (typeof statuses)[number])
          : undefined,
      },
      orderBy: { id: 'desc' },
      include: {
        operationType: { select: { code: true, direction: true } },
        documentStatus: { select: { code: true, name: true, color: true } },
        _count: { select: { lines: true } },
      },
    })
  })

  app.get('/:id', async (request, reply) => {
    const id = Number((request.params as { id: string }).id)
    if (!Number.isInteger(id)) return reply.code(400).send({ error: 'Invalid id' })

    const document = await prisma.tBLDOCUMENT.findUnique({
      where: { id },
      include: {
        operationType: true,
        documentStatus: { select: { code: true, name: true, color: true } },
        warehouse: { select: { id: true, code: true, name: true } },
        createdBy: { select: { id: true, username: true, fullName: true } },
        lines: { orderBy: { lineNo: 'asc' }, include: lineInclude },
      },
    })
    if (!document) return reply.code(404).send({ error: 'Document not found' })
    return document
  })

  // Belge oluştur (DRAFT)
  app.post('/', { preHandler: [app.authenticate, app.requireWrite] }, async (request, reply) => {
    const parsed = createSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.code(400).send({ error: 'Invalid body', details: parsed.error.flatten() })
    }

    const companyId = getCompanyId(request)
    const { lines, documentDate, documentNo: providedNo, ...header } = parsed.data

    // Operasyon tipini bir kez çek (yön + sayaç)
    const opType = await prisma.tBLOPERATIONTYPE.findFirst({
      where: { id: header.operationTypeId, companyId },
      include: { sequence: true },
    })
    if (!opType) return reply.code(400).send({ error: 'Geçersiz operasyon tipi' })

    // documentNo verilmezse operasyon tipinin sayacından otomatik üret
    let documentNo = providedNo
    if (!documentNo) {
      if (!opType.sequence) {
        return reply.code(400).send({ error: 'documentNo gerekli — bu operasyon tipinde sayaç tanımlı değil' })
      }
      documentNo = (await nextSequence(companyId, opType.sequence.code)).formatted
    }

    // Mal kabulde (INBOUND) hedef statü: kalite kontrol açıksa KARANTİNA, değilse op-statü geçişinden türetilir
    let inboundTargetStatusId: number | undefined
    if (opType.direction === 'INBOUND') {
      if (opType.qualityControl) {
        const q = await prisma.tBLSTATUS.findFirst({ where: { companyId, code: 'QUARANTINE' } })
        inboundTargetStatusId = q?.id
      } else {
        const st = await prisma.tBLOPERATIONTYPESTATUS.findFirst({
          where: { companyId, operationTypeId: opType.id },
          orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
        })
        inboundTargetStatusId = st?.targetStatusId
      }
    }

    // Directed putaway: INBOUND satırlarda hedef lokasyon verilmemişse yönlendirme önerisinden, hedef statü verilmemişse op-statü geçişinden doldur
    let autoRoutedLines = 0
    const processedLines = await Promise.all(
      lines.map(async (line) => {
        if (opType.direction !== 'INBOUND') return line
        let next = { ...line }
        if (!next.targetLocationId) {
          const suggestions = await suggestPutawayLocations(companyId, line.productId)
          if (suggestions.length > 0) {
            autoRoutedLines++
            next.targetLocationId = suggestions[0]!.id
          }
        }
        if (!next.targetStatusId && inboundTargetStatusId) next.targetStatusId = inboundTargetStatusId
        return next
      }),
    )

    try {
      const document = await prisma.tBLDOCUMENT.create({
        data: {
          ...header,
          documentNo,
          companyId,
          createdById: request.user.sub,
          documentStatusId: await docStatusId(companyId, DOC_STATUS.WAITING), // Bekliyor
          documentDate: documentDate ? new Date(documentDate) : undefined,
          lines: { create: processedLines.map((line, index) => ({ lineNo: index + 1, ...line })) },
        },
        include: { lines: { orderBy: { lineNo: 'asc' } }, documentStatus: true },
      })
      return reply.code(201).send({ ...document, autoRoutedLines })
    } catch (err) {
      const code = (err as { code?: string }).code
      if (code === 'P2002') return reply.code(409).send({ error: 'Document number already exists' })
      if (code === 'P2003') {
        return reply.code(400).send({ error: 'Invalid reference (operation type, warehouse, product, unit, location, status or pallet)' })
      }
      throw err
    }
  })

  // Bekliyor → Toplanıyor (okutma/toplama başladı)
  app.post('/:id/start-picking', { preHandler: [app.authenticate, app.requireWrite] }, async (request, reply) => {
    const id = Number((request.params as { id: string }).id)
    if (!Number.isInteger(id)) return reply.code(400).send({ error: 'Invalid id' })
    const doc = await prisma.tBLDOCUMENT.findUnique({ where: { id } })
    if (!doc) return reply.code(404).send({ error: 'Document not found' })
    if (doc.status !== 'DRAFT') return reply.code(409).send({ error: `Sadece bekleyen belge toplamaya alınabilir (mevcut: ${doc.status})` })
    return prisma.tBLDOCUMENT.update({
      where: { id },
      data: { documentStatusId: await docStatusId(doc.companyId, DOC_STATUS.PICKING) },
      include: { documentStatus: true },
    })
  })

  // DRAFT → CONFIRMED (Onaya Gönder → Onay Bekliyor)
  app.post('/:id/confirm', { preHandler: [app.authenticate, app.requireWrite] }, async (request, reply) => {
    const id = Number((request.params as { id: string }).id)
    if (!Number.isInteger(id)) return reply.code(400).send({ error: 'Invalid id' })
    const doc = await prisma.tBLDOCUMENT.findUnique({ where: { id } })
    if (!doc) return reply.code(404).send({ error: 'Document not found' })
    if (doc.status !== 'DRAFT') {
      return reply.code(409).send({ error: `Sadece DRAFT belge onaya gönderilebilir (mevcut: ${doc.status})` })
    }
    return prisma.tBLDOCUMENT.update({
      where: { id },
      data: { status: 'CONFIRMED', documentStatusId: await docStatusId(doc.companyId, DOC_STATUS.PENDING_APPROVAL) },
      include: { documentStatus: true },
    })
  })

  // CONFIRMED → COMPLETED (+ stok'a işle)
  app.post('/:id/complete', { preHandler: [app.authenticate, app.requireWrite] }, async (request, reply) => {
    const id = Number((request.params as { id: string }).id)
    if (!Number.isInteger(id)) return reply.code(400).send({ error: 'Invalid id' })
    const doc = await prisma.tBLDOCUMENT.findUnique({ where: { id } })
    if (!doc) return reply.code(404).send({ error: 'Document not found' })
    try {
      const done = await completeDocument(id)
      // Onaylandı
      const onyId = await docStatusId(doc.companyId, DOC_STATUS.APPROVED)
      if (onyId) await prisma.tBLDOCUMENT.update({ where: { id }, data: { documentStatusId: onyId } })
      return await prisma.tBLDOCUMENT.findUnique({ where: { id }, include: { documentStatus: true, lines: { orderBy: { lineNo: 'asc' } } } }) ?? done
    } catch (err) {
      if (err instanceof MovementError) return reply.code(409).send({ error: err.message })
      throw err
    }
  })

  // DRAFT/CONFIRMED → CANCELLED (stok'a işlenmemişse güvenli)
  app.post('/:id/cancel', { preHandler: [app.authenticate, app.requireWrite] }, async (request, reply) => {
    const id = Number((request.params as { id: string }).id)
    if (!Number.isInteger(id)) return reply.code(400).send({ error: 'Invalid id' })
    const doc = await prisma.tBLDOCUMENT.findUnique({ where: { id } })
    if (!doc) return reply.code(404).send({ error: 'Document not found' })
    if (doc.status === 'COMPLETED') {
      return reply.code(409).send({ error: 'Tamamlanmış belge iptal edilemez (stok ters kaydı gerekir)' })
    }
    if (doc.status === 'CANCELLED') return reply.code(409).send({ error: 'Belge zaten iptal edilmiş' })
    return prisma.tBLDOCUMENT.update({
      where: { id },
      data: { status: 'CANCELLED', documentStatusId: await docStatusId(doc.companyId, DOC_STATUS.CANCELLED) },
      include: { documentStatus: true },
    })
  })

  // COMPLETED → ters kayıt (stok geri al) → CANCELLED
  app.post('/:id/reverse', { preHandler: [app.authenticate, app.requireWrite] }, async (request, reply) => {
    const id = Number((request.params as { id: string }).id)
    if (!Number.isInteger(id)) return reply.code(400).send({ error: 'Invalid id' })
    const doc = await prisma.tBLDOCUMENT.findUnique({ where: { id } })
    if (!doc) return reply.code(404).send({ error: 'Document not found' })
    try {
      const rev = await reverseDocument(id)
      const iptId = await docStatusId(doc.companyId, DOC_STATUS.CANCELLED)
      if (iptId) await prisma.tBLDOCUMENT.update({ where: { id }, data: { documentStatusId: iptId } })
      return rev
    } catch (err) {
      if (err instanceof MovementError) return reply.code(409).send({ error: err.message })
      throw err
    }
  })
}
