import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { simpleCrud, type Delegate } from './documentTypes.js'

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
export const controlCountRoutes = simpleCrud(prisma.tBLCONTROLCOUNT as unknown as Delegate, controlCount, controlCount.partial(), 'Kontrol sayım bulunamadı')

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
