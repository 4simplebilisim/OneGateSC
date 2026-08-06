import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { simpleCrud, type Delegate } from './documentTypes.js'
import type { FastifyInstance } from 'fastify'
import { getCompanyId } from '../lib/company.js'
import { createControlCount, setControlCounted, approveControlCount, controlCountDifferences, ControlCountError } from '../lib/controlCount.js'

// Sayım/Palet ek ekranları — StokBar parite (legacy TBLSBKONTROLSAYIM / PALETBILDIRIM / PALETTARIHCE / REFERANSSAYIMBELGEISATAMA)
const pInt = z.number().int().positive()

// Sayım İş Atama — sayım ↔ kullanıcı
const countAssignment = z.object({
  stockCountId: pInt,
  userId: pInt,
  note: z.string().max(200).optional(),
  isActive: z.boolean().optional(),
})
export const countAssignmentRoutes = simpleCrud(prisma.tBLCOUNTASSIGNMENT as unknown as Delegate, countAssignment, countAssignment.partial(), 'Sayım ataması bulunamadı')

// Kontrol Sayım başlık
const controlCount = z.object({
  code: z.string().max(40).optional(),
  referenceCode: z.string().max(40).optional(),
  warehouseId: pInt.nullish(),
  note: z.string().max(200).optional(),
  isActive: z.boolean().optional(),
})
const controlCountCrud = simpleCrud(prisma.tBLCONTROLCOUNT as unknown as Delegate, controlCount, controlCount.partial(), 'Kontrol sayım bulunamadı')

// Kontrol sayım MOTORU: depo fotoğrafı → sayım → fark. Stok DEĞİŞMEZ.
export async function controlCountRoutes(app: FastifyInstance) {
  const hata = (reply: { code: (n: number) => { send: (b: unknown) => unknown } }, err: unknown) => {
    if (err instanceof ControlCountError) return reply.code(409).send({ error: err.message })
    throw err
  }

  /** Depo stoğunu fotoğrafla → satırlar otomatik doğar */
  app.post('/snapshot', { preHandler: [app.authenticate, app.requireWrite] }, async (request, reply) => {
    const parsed = z.object({
      warehouseId: pInt, code: z.string().max(40).optional(),
      referenceCode: z.string().max(40).optional(), note: z.string().max(200).optional(),
    }).safeParse(request.body)
    if (!parsed.success) return reply.code(400).send({ error: 'Invalid body', details: parsed.error.flatten() })
    try {
      return reply.code(201).send(await createControlCount(getCompanyId(request), parsed.data))
    } catch (err) { return hata(reply, err) }
  })

  app.post('/:id/lines/:lineId/count', { preHandler: [app.authenticate, app.requireWrite] }, async (request, reply) => {
    const { id, lineId } = request.params as { id: string; lineId: string }
    const parsed = z.object({ countedQty: z.number().min(0) }).safeParse(request.body)
    if (!parsed.success) return reply.code(400).send({ error: 'Invalid body', details: parsed.error.flatten() })
    try {
      return await setControlCounted(getCompanyId(request), Number(id), Number(lineId), parsed.data.countedQty)
    } catch (err) { return hata(reply, err) }
  })

  app.post('/:id/approve', { preHandler: [app.authenticate, app.requireWrite] }, async (request, reply) => {
    try {
      return await approveControlCount(getCompanyId(request), Number((request.params as { id: string }).id))
    } catch (err) { return hata(reply, err) }
  })

  app.get('/:id/differences', { preHandler: [app.authenticate] }, async (request, reply) => {
    try {
      return await controlCountDifferences(getCompanyId(request), Number((request.params as { id: string }).id))
    } catch (err) { return hata(reply, err) }
  })

  await app.register(controlCountCrud)
}

// Kontrol Sayım satır — controlCountId ile filtrelenir
const controlCountLine = z.object({
  controlCountId: pInt,
  lineNo: z.number().int().optional(),
  productId: pInt,
  mainQty: z.number().optional(),
  unitId: pInt.nullish(),
  countedQty: z.number().optional(),
  countedUnitId: pInt.nullish(),
})
export const controlCountLineRoutes = simpleCrud(prisma.tBLCONTROLCOUNTLINE as unknown as Delegate, controlCountLine, controlCountLine.partial(), 'Kontrol sayım satırı bulunamadı', 'controlCountId')

// Palet Bildirim başlık
const palletNotification = z.object({
  palletNo: z.string().max(40).optional(),
  oldPalletNo: z.string().max(40).optional(),
  palletTypeId: pInt.nullish(),
  locationId: pInt.nullish(),
  statusId: pInt.nullish(),
  partnerId: pInt.nullish(),
  tripNo: z.string().max(40).optional(),
  note: z.string().max(200).optional(),
  isActive: z.boolean().optional(),
})
export const palletNotificationRoutes = simpleCrud(prisma.tBLPALLETNOTIFICATION as unknown as Delegate, palletNotification, palletNotification.partial(), 'Palet bildirim bulunamadı')

// Palet Bildirim satır — notificationId ile filtrelenir
const palletNotificationLine = z.object({
  notificationId: pInt,
  lineNo: z.number().int().optional(),
  productId: pInt,
  mainQty: z.number().optional(),
  unitId: pInt.nullish(),
  netWeight: z.number().optional(),
  grossWeight: z.number().optional(),
  batchNo: z.string().max(100).optional(),
  serialNo: z.string().max(100).optional(),
  statusId: pInt.nullish(),
  locationId: pInt.nullish(),
})
export const palletNotificationLineRoutes = simpleCrud(prisma.tBLPALLETNOTIFICATIONLINE as unknown as Delegate, palletNotificationLine, palletNotificationLine.partial(), 'Palet bildirim satırı bulunamadı', 'notificationId')

// Palet Tarihçe — salt-okunur izleme (yine de CRUD; populasyon ileride hareket motorundan)
const palletHistory = z.object({
  palletId: pInt,
  parentPalletId: pInt.nullish(),
  originalQty: z.number().optional(),
  unitId: pInt.nullish(),
  operationDocCode: z.string().max(40).optional(),
  archived: z.boolean().optional(),
  isActive: z.boolean().optional(),
})
export const palletHistoryRoutes = simpleCrud(prisma.tBLPALLETHISTORY as unknown as Delegate, palletHistory, palletHistory.partial(), 'Palet tarihçe bulunamadı', 'palletId')
