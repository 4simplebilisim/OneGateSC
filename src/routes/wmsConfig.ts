import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { simpleCrud, type Delegate, type BeforeWrite } from './documentTypes.js'

const pInt = z.number().int().positive()
const oInt = z.number().int()
const linkScope = z.enum(['ALL', 'GROUP', 'SPECIFIC'])
const d = (x: unknown) => x as unknown as Delegate

// ── Giriş Koşulları ──
const entryBreakPw = z.object({ businessPartnerId: pInt.nullish(), password: z.string().max(100).optional(), isActive: z.boolean().optional() })
export const entryConditionBreakPasswordRoutes = simpleCrud(d(prisma.tBLENTRYCONDITIONBREAKPASSWORD), entryBreakPw, entryBreakPw.partial(), 'Not found')

const entryBreakReason = z.object({ code: z.string().min(1).max(20), businessPartnerId: pInt.nullish(), isActive: z.boolean().optional() })
export const entryConditionBreakReasonRoutes = simpleCrud(d(prisma.tBLENTRYCONDITIONBREAKREASON), entryBreakReason, entryBreakReason.partial(), 'Not found')

const entryTypeOp = z.object({ entryConditionTypeId: pInt, operationTypeId: pInt, isActive: z.boolean().optional() })
export const entryConditionTypeOperationRoutes = simpleCrud(d(prisma.tBLENTRYCONDITIONTYPEOPERATION), entryTypeOp, entryTypeOp.partial(), 'Not found')

// ── Çıkış Koşulları ──
const exitControlField = z.object({ code: z.string().min(1).max(40), tableName: z.string().max(100).optional(), fieldName: z.string().max(100).optional(), isActive: z.boolean().optional() })
export const exitConditionControlFieldRoutes = simpleCrud(d(prisma.tBLEXITCONDITIONCONTROLFIELD), exitControlField, exitControlField.partial(), 'Not found')

const exitBreakPw = z.object({ password: z.string().max(100).optional(), businessPartnerId: pInt.nullish(), isActive: z.boolean().optional() })
export const exitConditionBreakPasswordRoutes = simpleCrud(d(prisma.tBLEXITCONDITIONBREAKPASSWORD), exitBreakPw, exitBreakPw.partial(), 'Not found')

const exitBreakReason = z.object({ code: z.string().min(1).max(20), businessPartnerId: pInt.nullish(), isActive: z.boolean().optional() })
export const exitConditionBreakReasonRoutes = simpleCrud(d(prisma.tBLEXITCONDITIONBREAKREASON), exitBreakReason, exitBreakReason.partial(), 'Not found')

const exitTypeOp = z.object({ exitConditionTypeId: pInt, operationTypeId: pInt, locationLinkType: oInt.nullish(), locationId: oInt.nullish(), fifoCheckOnReverseScan: z.boolean().optional(), isActive: z.boolean().optional() })
export const exitConditionTypeOperationRoutes = simpleCrud(d(prisma.tBLEXITCONDITIONTYPEOPERATION), exitTypeOp, exitTypeOp.partial(), 'Not found')

// ── Yönlendirme ──
const routingControl = z.object({ code: z.string().min(1).max(40), fieldName: z.string().max(100).optional(), isActive: z.boolean().optional() })
export const routingControlFieldRoutes = simpleCrud(d(prisma.tBLROUTINGCONTROLFIELD), routingControl, routingControl.partial(), 'Not found')

const routingBreakPw = z.object({ password: z.string().max(100).optional(), isActive: z.boolean().optional() })
export const routingBreakPasswordRoutes = simpleCrud(d(prisma.tBLROUTINGBREAKPASSWORD), routingBreakPw, routingBreakPw.partial(), 'Not found')

const routingBreakReason = z.object({ code: z.string().min(1).max(20), isActive: z.boolean().optional() })
export const routingBreakReasonRoutes = simpleCrud(d(prisma.tBLROUTINGBREAKREASON), routingBreakReason, routingBreakReason.partial(), 'Not found')

const routingTypeOp = z.object({ facilityId: pInt.nullish(), routingTypeId: pInt, operationTypeId: pInt, locationLinkType: linkScope.optional(), locationId: pInt.nullish(), taskPlanId: oInt.nullish(), isActive: z.boolean().optional() })
export const routingTypeOperationRoutes = simpleCrud(d(prisma.tBLROUTINGTYPEOPERATION), routingTypeOp, routingTypeOp.partial(), 'Not found')

const routingProdLoc = z.object({ materialLinkType: oInt.nullish(), additionalGroupOrder: oInt.nullish(), materialLinkId: oInt.nullish(), locationLinkType: oInt.nullish(), locationLinkId: oInt.nullish(), isActive: z.boolean().optional() })
export const routingProductLocationRoutes = simpleCrud(d(prisma.tBLROUTINGPRODUCTLOCATION), routingProdLoc, routingProdLoc.partial(), 'Not found')

// Yönlendirme Parametre — yönlendirme tipine bağlı (StokBar "Yönlendirme Parametre" alt-ekranı)
const rpScope = z.enum(['ALL', 'GROUP', 'SPECIFIC'])
const routingParam = z.object({
  routingTypeId: pInt,
  cariLinkType: rpScope.optional(), cariLinkId: pInt.nullish(),
  materialLinkType: rpScope.optional(), materialLinkId: pInt.nullish(),
  sortOrder: oInt.nullish(),
  controlFieldId: pInt.nullish(),
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
const countApprovalGroup = z.object({ businessPartnerId: pInt.nullish(), operationTypeId: pInt, userGroupId: pInt, sortOrder: oInt.nullish(), mailTemplateId: oInt.nullish(), mailGroupId: oInt.nullish(), mailSp: z.string().max(200).optional(), isActive: z.boolean().optional() })
export const countApprovalUserGroupRoutes = simpleCrud(d(prisma.tBLCOUNTAPPROVALUSERGROUP), countApprovalGroup, countApprovalGroup.partial(), 'Not found')

const countCriteria = z.object({ operationTypeId: pInt, fieldCode: z.string().min(1).max(40), required: z.boolean().optional(), isActive: z.boolean().optional() })
export const countCriteriaRoutes = simpleCrud(d(prisma.tBLCOUNTCRITERIA), countCriteria, countCriteria.partial(), 'Not found')

const countParameter = z.object({
  // opsiyonel int/FK alanları NULLISH (null VEYA undefined) — form edit'te boş bırakılan alanları null gönderir; .optional() tek başına null'ı reddeder → 400
  operationTypeId: pInt, countType: oInt.nullish(), entryOperationTypeId: pInt.nullish(), exitOperationTypeId: pInt.nullish(), transferOperationTypeId: pInt.nullish(),
  equalize: z.boolean().optional(), weightDiff: z.boolean().optional(), documentDetailCount: oInt.nullish(),
  palletQtyPartialEntry: z.boolean().optional(), stacked: z.boolean().optional(), partialPallet: z.boolean().optional(), partialPalletWarning: z.boolean().optional(),
  stockMoveOnActiveCount: z.boolean().optional(), hideInnerPallets: z.boolean().optional(), hideMixedPallet: z.boolean().optional(), innerPalletCountCheck: z.boolean().optional(),
  hideInnerPalletStock: z.boolean().optional(), countDays: oInt.nullish(), dontRecountPallet: z.boolean().optional(), askLocationOnScan: z.boolean().optional(),
})
// TESİS BAŞINA TEK sayım parametresi: parametre operasyona bağlı, operasyon bir tesise (facilityId) ait.
// Aynı tesisteki başka bir operasyonun parametresi zaten varsa yeni tanım engellenir (kullanıcı kuralı).
const countParamFacilityGuard: BeforeWrite = async ({ data, companyId, id }) => {
  const opId = data.operationTypeId as number | undefined
  if (opId == null) return null // update: operasyon değişmiyorsa tesis aynı → kontrol gereksiz
  const op = await prisma.tBLOPERATIONTYPE.findFirst({ where: { id: opId, companyId }, select: { facilityId: true } })
  if (!op) return null // geçersiz operasyon → FK/refGuard yakalar
  const notSelf = id ? { id: { not: id } } : {}
  if (op.facilityId != null) {
    const ops = await prisma.tBLOPERATIONTYPE.findMany({ where: { companyId, facilityId: op.facilityId }, select: { id: true } })
    const dup = await prisma.tBLCOUNTPARAMETER.findFirst({ where: { companyId, operationTypeId: { in: ops.map((o) => o.id) }, ...notSelf }, select: { id: true } })
    if (dup) return 'Bu tesis için sayım parametresi zaten tanımlı — tesis başına yalnızca bir tanım olabilir'
  } else {
    const dup = await prisma.tBLCOUNTPARAMETER.findFirst({ where: { companyId, operationTypeId: opId, ...notSelf }, select: { id: true } })
    if (dup) return 'Bu operasyon için sayım parametresi zaten tanımlı'
  }
  return null
}
export const countParameterRoutes = simpleCrud(d(prisma.tBLCOUNTPARAMETER), countParameter, countParameter.partial(), 'Not found', undefined, countParamFacilityGuard)
