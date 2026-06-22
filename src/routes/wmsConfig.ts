import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { simpleCrud, type Delegate } from './documentTypes.js'

const pInt = z.number().int().positive()
const oInt = z.number().int()
const linkScope = z.enum(['ALL', 'GROUP', 'SPECIFIC'])
const d = (x: unknown) => x as unknown as Delegate

// ── Giriş Koşulları ──
const entryBreakPw = z.object({ businessPartnerId: pInt.optional(), password: z.string().max(100).optional(), isActive: z.boolean().optional() })
export const entryConditionBreakPasswordRoutes = simpleCrud(d(prisma.tBLENTRYCONDITIONBREAKPASSWORD), entryBreakPw, entryBreakPw.partial(), 'Not found')

const entryBreakReason = z.object({ code: z.string().min(1).max(20), businessPartnerId: pInt.optional(), isActive: z.boolean().optional() })
export const entryConditionBreakReasonRoutes = simpleCrud(d(prisma.tBLENTRYCONDITIONBREAKREASON), entryBreakReason, entryBreakReason.partial(), 'Not found')

const entryTypeOp = z.object({ entryConditionTypeId: pInt, operationTypeId: pInt, isActive: z.boolean().optional() })
export const entryConditionTypeOperationRoutes = simpleCrud(d(prisma.tBLENTRYCONDITIONTYPEOPERATION), entryTypeOp, entryTypeOp.partial(), 'Not found')

// ── Çıkış Koşulları ──
const exitControlField = z.object({ code: z.string().min(1).max(40), tableName: z.string().max(100).optional(), fieldName: z.string().max(100).optional(), isActive: z.boolean().optional() })
export const exitConditionControlFieldRoutes = simpleCrud(d(prisma.tBLEXITCONDITIONCONTROLFIELD), exitControlField, exitControlField.partial(), 'Not found')

const exitBreakPw = z.object({ password: z.string().max(100).optional(), businessPartnerId: pInt.optional(), isActive: z.boolean().optional() })
export const exitConditionBreakPasswordRoutes = simpleCrud(d(prisma.tBLEXITCONDITIONBREAKPASSWORD), exitBreakPw, exitBreakPw.partial(), 'Not found')

const exitBreakReason = z.object({ code: z.string().min(1).max(20), businessPartnerId: pInt.optional(), isActive: z.boolean().optional() })
export const exitConditionBreakReasonRoutes = simpleCrud(d(prisma.tBLEXITCONDITIONBREAKREASON), exitBreakReason, exitBreakReason.partial(), 'Not found')

const exitTypeOp = z.object({ exitConditionTypeId: pInt, operationTypeId: pInt, locationLinkType: oInt.optional(), locationId: oInt.optional(), fifoCheckOnReverseScan: z.boolean().optional(), isActive: z.boolean().optional() })
export const exitConditionTypeOperationRoutes = simpleCrud(d(prisma.tBLEXITCONDITIONTYPEOPERATION), exitTypeOp, exitTypeOp.partial(), 'Not found')

// ── Yönlendirme ──
const routingControl = z.object({ code: z.string().min(1).max(40), fieldName: z.string().max(100).optional(), isActive: z.boolean().optional() })
export const routingControlFieldRoutes = simpleCrud(d(prisma.tBLROUTINGCONTROLFIELD), routingControl, routingControl.partial(), 'Not found')

const routingBreakPw = z.object({ password: z.string().max(100).optional(), isActive: z.boolean().optional() })
export const routingBreakPasswordRoutes = simpleCrud(d(prisma.tBLROUTINGBREAKPASSWORD), routingBreakPw, routingBreakPw.partial(), 'Not found')

const routingBreakReason = z.object({ code: z.string().min(1).max(20), isActive: z.boolean().optional() })
export const routingBreakReasonRoutes = simpleCrud(d(prisma.tBLROUTINGBREAKREASON), routingBreakReason, routingBreakReason.partial(), 'Not found')

const routingTypeOp = z.object({ facilityId: pInt.optional(), routingTypeId: pInt, operationTypeId: pInt, locationLinkType: linkScope.optional(), locationId: pInt.optional(), taskPlanId: oInt.optional(), isActive: z.boolean().optional() })
export const routingTypeOperationRoutes = simpleCrud(d(prisma.tBLROUTINGTYPEOPERATION), routingTypeOp, routingTypeOp.partial(), 'Not found')

const routingProdLoc = z.object({ materialLinkType: oInt.optional(), additionalGroupOrder: oInt.optional(), materialLinkId: oInt.optional(), locationLinkType: oInt.optional(), locationLinkId: oInt.optional(), isActive: z.boolean().optional() })
export const routingProductLocationRoutes = simpleCrud(d(prisma.tBLROUTINGPRODUCTLOCATION), routingProdLoc, routingProdLoc.partial(), 'Not found')

// Yönlendirme Parametre — yönlendirme tipine bağlı (StokBar "Yönlendirme Parametre" alt-ekranı)
const rpScope = z.enum(['ALL', 'GROUP', 'SPECIFIC'])
const routingParam = z.object({
  routingTypeId: pInt,
  cariLinkType: rpScope.optional(), cariLinkId: pInt.optional(),
  materialLinkType: rpScope.optional(), materialLinkId: pInt.optional(),
  sortOrder: oInt.optional(),
  controlFieldId: pInt.optional(),
  messageType: z.enum(['WARNING', 'ERROR']).optional(),
  conditionBreak: z.boolean().optional(),
  controlMode: z.string().max(40).optional(),
  spName: z.string().max(120).optional(),
  controlTypeDescription: z.string().max(200).optional(),
  incrementalSort: z.boolean().optional(),
  isActive: z.boolean().optional(),
})
export const routingParameterRoutes = simpleCrud(d(prisma.tBLROUTINGPARAMETER), routingParam, routingParam.partial(), 'Yönlendirme parametresi bulunamadı', 'routingTypeId')

// ── Sayım ──
const countApprovalGroup = z.object({ businessPartnerId: pInt.optional(), operationTypeId: pInt, userGroupId: pInt, sortOrder: oInt.optional(), mailTemplateId: oInt.optional(), mailGroupId: oInt.optional(), mailSp: z.string().max(200).optional(), isActive: z.boolean().optional() })
export const countApprovalUserGroupRoutes = simpleCrud(d(prisma.tBLCOUNTAPPROVALUSERGROUP), countApprovalGroup, countApprovalGroup.partial(), 'Not found')

const countCriteria = z.object({ operationTypeId: pInt, fieldCode: z.string().min(1).max(40), required: z.boolean().optional(), isActive: z.boolean().optional() })
export const countCriteriaRoutes = simpleCrud(d(prisma.tBLCOUNTCRITERIA), countCriteria, countCriteria.partial(), 'Not found')

const countParameter = z.object({
  operationTypeId: pInt, countType: oInt.optional(), entryOperationTypeId: pInt.optional(), exitOperationTypeId: pInt.optional(), transferOperationTypeId: pInt.optional(),
  equalize: z.boolean().optional(), weightDiff: z.boolean().optional(), documentDetailCount: oInt.optional(),
  palletQtyPartialEntry: z.boolean().optional(), stacked: z.boolean().optional(), partialPallet: z.boolean().optional(), partialPalletWarning: z.boolean().optional(),
  stockMoveOnActiveCount: z.boolean().optional(), hideInnerPallets: z.boolean().optional(), hideMixedPallet: z.boolean().optional(), innerPalletCountCheck: z.boolean().optional(),
  hideInnerPalletStock: z.boolean().optional(), countDays: oInt.optional(), dontRecountPallet: z.boolean().optional(), askLocationOnScan: z.boolean().optional(),
})
export const countParameterRoutes = simpleCrud(d(prisma.tBLCOUNTPARAMETER), countParameter, countParameter.partial(), 'Not found')
