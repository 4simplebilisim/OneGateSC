import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { simpleCrud, type Delegate } from './documentTypes.js'

// Dinamik Etiket Tipi — StokBar TBLSBDEETIKETTIPI/ITEM/SORGU (etiket tipi → item'lar + sorgu kütüphanesi)
const pInt = z.number().int().positive()

const labelTemplate = z.object({
  code: z.string().min(1).max(40),
  screenTitle: z.string().max(120).optional(),
  labelName: z.string().max(120).optional(),
  menuGroupId: pInt.nullish(),
  displayType: z.number().int().optional(),
  reportType: z.number().int().optional(),
  col1Count: z.number().int().optional(),
  col2Count: z.number().int().optional(),
  col3Count: z.number().int().optional(),
  col1Length: z.number().int().optional(),
  col2Length: z.number().int().optional(),
  password: z.string().max(40).optional(),
  isActive: z.boolean().optional(),
})
export const labelTemplateRoutes = simpleCrud(prisma.tBLLABELTEMPLATE as unknown as Delegate, labelTemplate, labelTemplate.partial(), 'Etiket tipi bulunamadı')

// Item — etiket tipine bağlı form alanları
const labelTemplateItem = z.object({
  labelTemplateId: pInt,
  title: z.string().max(120).optional(),
  itemType: z.string().max(20).optional(),
  designName: z.string().max(80).optional(),
  displayName: z.string().max(120).optional(),
  sortOrder: z.number().int().optional(),
  isRequired: z.boolean().optional(),
  isVisible: z.boolean().optional(),
  width: z.number().int().optional(),
  maxLength: z.number().int().optional(),
  defaultValue: z.string().max(200).optional(),
  comboQuery: z.string().optional(),
  lookupId: pInt.nullish(),
  isActive: z.boolean().optional(),
})
export const labelTemplateItemRoutes = simpleCrud(prisma.tBLLABELTEMPLATEITEM as unknown as Delegate, labelTemplateItem, labelTemplateItem.partial(), 'Etiket item bulunamadı', 'labelTemplateId')

// Sorgu — etiket tipine bağlı sorgu kütüphanesi (item combo/lookup veri kaynağı)
const labelTemplateQuery = z.object({
  labelTemplateId: pInt,
  code: z.string().max(40).optional(),
  queryTitle: z.string().max(200).optional(),
  queryDetail: z.string().optional(),
  bindingField: z.string().max(80).optional(),
  isActive: z.boolean().optional(),
})
export const labelTemplateQueryRoutes = simpleCrud(prisma.tBLLABELTEMPLATEQUERY as unknown as Delegate, labelTemplateQuery, labelTemplateQuery.partial(), 'Etiket sorgu bulunamadı', 'labelTemplateId')
