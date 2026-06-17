import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { simpleCrud, type Delegate } from './documentTypes.js'

const pInt = z.number().int().positive()
const oInt = z.number().int()
const num = z.number()
const dt = z.string().datetime().or(z.string())
const d = (x: unknown) => x as unknown as Delegate

// Dil
const language = z.object({ code: z.string().min(1).max(10), isDefault: z.boolean().optional(), isActive: z.boolean().optional() })
export const languageRoutes = simpleCrud(d(prisma.tBLLANGUAGE), language, language.partial(), 'Not found')

// Vardiya
const shift = z.object({ code: z.string().min(1).max(20), name: z.string().max(100).optional(), startTime: dt.optional(), endTime: dt.optional(), businessPartnerId: pInt.optional(), isActive: z.boolean().optional() })
export const shiftRoutes = simpleCrud(d(prisma.tBLSHIFT), shift, shift.partial(), 'Not found')

// Ekran Rapor Bağlantı
const screenReport = z.object({ screenButtonCode: z.string().max(50).optional(), reportCode: z.string().max(50).optional(), businessPartnerId: pInt.optional(), isActive: z.boolean().optional() })
export const screenReportLinkRoutes = simpleCrud(d(prisma.tBLSCREENREPORTLINK), screenReport, screenReport.partial(), 'Not found')

// Stok Kontrol Parametre
const stockControl = z.object({ businessPartnerId: pInt.optional(), distributionType: oInt.optional(), customerPriority: oInt.optional(), shipmentPriority: oInt.optional(), askUser: z.boolean().optional(), dontUpdatePreparedQty: z.boolean().optional(), controlStatus: z.string().max(50).optional(), errorOnAllSplit: z.boolean().optional(), controlLocation: z.string().max(200).optional(), isActive: z.boolean().optional() })
export const stockControlParameterRoutes = simpleCrud(d(prisma.tBLSTOCKCONTROLPARAMETER), stockControl, stockControl.partial(), 'Not found')

// Belge Planlama Parametre
const docPlanning = z.object({
  plannedDocStatusId: pInt.optional(), planningOperationTypeId: pInt.optional(), partCount: oInt.optional(), businessPartnerId: pInt.optional(),
  splitByProductGroup: z.boolean().optional(), fieldEntry: z.boolean().optional(), templateOperationTypeId: pInt.optional(), updateMainQty: z.boolean().optional(), locationAssign: z.boolean().optional(),
  extraField11: oInt.optional(), extraField12: oInt.optional(), extraField21: oInt.optional(), extraField22: oInt.optional(), extraField31: oInt.optional(), extraField32: oInt.optional(),
  extraField41: oInt.optional(), extraField42: oInt.optional(), extraField51: oInt.optional(), extraField52: oInt.optional(), isActive: z.boolean().optional(),
})
export const documentPlanningParameterRoutes = simpleCrud(d(prisma.tBLDOCUMENTPLANNINGPARAMETER), docPlanning, docPlanning.partial(), 'Not found')

// Toplama Emri Parametre
const pickOrder = z.object({ businessPartnerId: pInt.optional(), fullPalletOpId: pInt.optional(), fullCaseOpId: pInt.optional(), partialProductOpId: pInt.optional(), fullPalletUnitId: pInt.optional(), fullCaseUnitId: pInt.optional(), partialProductUnitId: pInt.optional(), isActive: z.boolean().optional() })
export const pickOrderParameterRoutes = simpleCrud(d(prisma.tBLPICKORDERPARAMETER), pickOrder, pickOrder.partial(), 'Not found')

// Dashboard Rapor
const dashboard = z.object({ type: oInt.optional(), reportSp: z.string().max(200).optional(), defaultReport: z.boolean().optional(), reportName: z.string().max(200).optional(), userLinkType: oInt.optional(), userLinkId: oInt.optional(), isActive: z.boolean().optional() })
export const dashboardReportRoutes = simpleCrud(d(prisma.tBLDASHBOARDREPORT), dashboard, dashboard.partial(), 'Not found')

// Depo Araç
const vehicle = z.object({ code: z.string().min(1).max(20), name: z.string().max(100).optional(), status: oInt.optional(), pallet: z.boolean().optional(), workType: oInt.optional(), quantity: num.optional(), unitId: pInt.optional(), businessPartnerId: pInt.optional(), ipAddress: z.string().max(50).optional(), isActive: z.boolean().optional() })
export const warehouseVehicleRoutes = simpleCrud(d(prisma.tBLWAREHOUSEVEHICLE), vehicle, vehicle.partial(), 'Not found')

// İş Emri Genel Parametre
const woGeneral = z.object({ businessPartnerId: pInt.optional(), alarmDuration: oInt.optional(), alarmUnit: oInt.optional(), pickCancelOpId: pInt.optional(), rackFeedbackOpId: pInt.optional(), askEntryLocation: z.boolean().optional(), locationPriority: z.boolean().optional(), isActive: z.boolean().optional() })
export const workOrderGeneralParameterRoutes = simpleCrud(d(prisma.tBLWORKORDERGENERALPARAMETER), woGeneral, woGeneral.partial(), 'Not found')

// İş Emri Nedenleri
const woReason = z.object({ code: z.string().min(1).max(20), description: z.string().max(200).optional(), isCancel: z.boolean().optional(), autoCreateOrder: z.boolean().optional(), businessPartnerId: pInt.optional(), createDocument: z.boolean().optional(), clearSystemFault: z.boolean().optional(), breakPassword: z.string().max(100).optional(), isActive: z.boolean().optional() })
export const workOrderReasonRoutes = simpleCrud(d(prisma.tBLWORKORDERREASON), woReason, woReason.partial(), 'Not found')

// İş Emri Referans Operasyon
const woRefOp = z.object({ category: oInt.optional(), operationTypeId: pInt, businessPartnerId: pInt.optional(), headerId: oInt.optional(), isActive: z.boolean().optional() })
export const workOrderReferenceOperationRoutes = simpleCrud(d(prisma.tBLWORKORDERREFERENCEOPERATION), woRefOp, woRefOp.partial(), 'Not found')

// Raf Besleme Parametre
const rackFeed = z.object({ businessPartnerId: pInt.optional(), locationGroupId: pInt.optional(), onStockEmpty: z.boolean().optional(), capacityPercent: num.optional(), palletBreaking: z.boolean().optional(), isActive: z.boolean().optional() })
export const rackFeedParameterRoutes = simpleCrud(d(prisma.tBLRACKFEEDPARAMETER), rackFeed, rackFeed.partial(), 'Not found')

// Menü Grubu
const menuGroup = z.object({ code: z.string().min(1).max(20), description: z.string().max(200).optional(), screenType: oInt.optional(), isActive: z.boolean().optional() })
export const menuGroupRoutes = simpleCrud(d(prisma.tBLMENUGROUP), menuGroup, menuGroup.partial(), 'Not found')
