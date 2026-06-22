import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { simpleCrud, type Delegate } from './documentTypes.js'

// Ek Saha (custom field) — Dinamik + Statik TEK tabloda (fieldKind ayırt-edici).
// "Tesis" = firma = companyId (örtük, otomatik enjekte). Legacy TBLEKSAHATANIMLAMA + TBLSBSTATIKSAHATANIMLAMA.
const pInt = z.number().int().positive()
const kind = z.enum(['DYNAMIC', 'STATIC'])
const entity = z.enum(['MATERIAL', 'PARTNER', 'DOC_HEADER', 'DOC_DETAIL', 'DOC_SCOPE', 'PALLET', 'STOCK', 'PALLET_NOTIFY_HEADER', 'OPERATION_DOC_DETAIL'])
const dataType = z.enum(['MULTI_SELECT_FIXED', 'TEXT', 'NUMERIC', 'DATE', 'LOOKUP'])

const extraField = z.object({
  fieldKind: kind.optional(),
  entityType: entity,
  trackingCode: z.string().max(40).optional(),
  description: z.string().min(1).max(200),
  fieldDataType: dataType,
  defaultValue: z.string().max(200).optional(),
  maxAnswerCount: z.number().int().optional(),
  isRequired: z.boolean().optional(),
  minLength: z.number().int().optional(),
  maxLength: z.number().int().optional(),
  useAsIncrementing: z.boolean().optional(),
  transferOnDocSplit: z.boolean().optional(),
  reference: z.string().max(200).optional(),
  isActive: z.boolean().optional(),
})
export const extraFieldRoutes = simpleCrud(prisma.tBLEXTRAFIELD as unknown as Delegate, extraField, extraField.partial(), 'Ek saha bulunamadı')

// Ek Saha seçenekleri (Çoktan Seçmeli / Rehber) — extraFieldId ile filtrelenir
const extraFieldOption = z.object({
  extraFieldId: pInt,
  code: z.string().min(1).max(40),
  description: z.string().max(200).optional(),
  sortOrder: z.number().int().optional(),
  reference: z.string().max(200).optional(),
  isActive: z.boolean().optional(),
})
export const extraFieldOptionRoutes = simpleCrud(prisma.tBLEXTRAFIELDOPTION as unknown as Delegate, extraFieldOption, extraFieldOption.partial(), 'Seçenek bulunamadı', 'extraFieldId')

// Operasyon Tipi Saha Bağlantı — operationTypeId ile filtrelenir
const opExtraField = z.object({
  operationTypeId: pInt,
  extraFieldId: pInt,
  isStatic: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
  useInTerminal: z.boolean().optional(),
  useInApproval: z.boolean().optional(),
  isActive: z.boolean().optional(),
})
export const operationTypeExtraFieldRoutes = simpleCrud(prisma.tBLOPERATIONTYPEEXTRAFIELD as unknown as Delegate, opExtraField, opExtraField.partial(), 'Operasyon tipi saha bağlantısı bulunamadı', 'operationTypeId')
