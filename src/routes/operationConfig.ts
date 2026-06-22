import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { simpleCrud, type Delegate } from './documentTypes.js'

const pInt = z.number().int().positive()
const oInt = z.number().int() // byte/enum/serbest int
const scope = z.enum(['ALL', 'GROUP', 'SPECIFIC']) // LinkScope: Hepsi/Grup/Belirli
const bulkType = z.enum(['CONTROLLED_BULK', 'BULK', 'RESERVATION', 'SELECTED_DOCUMENT', 'BATCH_CHANGE'])

// Neden Kategori
const reasonCategory = z.object({ code: z.string().min(1).max(10), name: z.string().max(100).optional(), businessPartnerId: pInt.optional(), isActive: z.boolean().optional() })
export const reasonCategoryRoutes = simpleCrud(prisma.tBLREASONCATEGORY as unknown as Delegate, reasonCategory, reasonCategory.partial(), 'Reason category not found')

// Operasyon Grup Bağlantı
const opGroupLink = z.object({ operationTypeId: pInt, facilityId: pInt.optional(), operationGroupId: pInt, businessPartnerId: pInt.optional(), isActive: z.boolean().optional() })
export const operationGroupLinkRoutes = simpleCrud(prisma.tBLOPERATIONGROUPLINK as unknown as Delegate, opGroupLink, opGroupLink.partial(), 'Operation group link not found', 'operationTypeId')

// Operasyon Tipi Tolerans
const opTolerance = z.object({ operationTypeId: pInt.optional(), facilityId: pInt.optional(), businessPartnerId: pInt.optional(), cariLinkType: scope.optional(), cariLinkId: pInt.optional(), materialLinkType: scope.optional(), materialLinkId: pInt.optional(), ignoreSplit: z.boolean().optional(), tolerancePercent: z.number().optional(), toleranceQty: z.number().optional(), isActive: z.boolean().optional() })
export const operationToleranceRoutes = simpleCrud(prisma.tBLOPERATIONTYPETOLERANCE as unknown as Delegate, opTolerance, opTolerance.partial(), 'Operation tolerance not found', 'operationTypeId')

// Operasyon Tipi Yasaklı Ürün
const forbidden = z.object({ operationTypeId: pInt, facilityId: pInt.optional(), businessPartnerId: pInt.optional(), cariLinkType: scope.optional(), cariLinkId: pInt.optional(), materialLinkType: scope.optional(), materialLinkId: pInt.optional(), isActive: z.boolean().optional() })
export const forbiddenProductRoutes = simpleCrud(prisma.tBLOPERATIONTYPEFORBIDDENPRODUCT as unknown as Delegate, forbidden, forbidden.partial(), 'Forbidden product not found', 'operationTypeId')

// Operasyon Tipi Dönüşüm
const conversion = z.object({ operationTypeId: pInt, facilityId: pInt.optional(), statusId: pInt.optional(), conversionCode: z.string().min(1).max(10), outgoing: z.boolean().optional(), sourceLocLinkType: scope.optional(), sourceLocLinkId: pInt.optional(), targetLocLinkType: scope.optional(), targetLocLinkId: pInt.optional(), isActive: z.boolean().optional() })
export const conversionRoutes = simpleCrud(prisma.tBLOPERATIONTYPECONVERSION as unknown as Delegate, conversion, conversion.partial(), 'Conversion not found', 'operationTypeId')

// Sıralı Operasyon
const sequential = z.object({ firstOperationId: pInt, secondOperationId: pInt, facilityId: pInt.optional(), cariLinkType: scope.optional(), cariLinkId: pInt.optional(), materialLinkType: scope.optional(), materialLinkId: pInt.optional(), locationLinkType: scope.optional(), locationLinkId: pInt.optional(), useInWorkOrder: z.boolean().optional(), spName: z.string().max(300).optional(), isActive: z.boolean().optional() })
export const sequentialOperationRoutes = simpleCrud(prisma.tBLSEQUENTIALOPERATION as unknown as Delegate, sequential, sequential.partial(), 'Sequential operation not found')

// Otomatik Referanslı Belge
const autoRef = z.object({ sourcePartnerId: pInt, sourceOperationTypeId: pInt, sourceLocLinkType: oInt.optional(), sourceLocLinkId: oInt.optional(), targetPartnerId: pInt, targetOperationTypeId: pInt, targetLocLinkType: oInt.optional(), targetLocLinkId: oInt.optional(), facility: z.boolean().optional(), isActive: z.boolean().optional() })
export const autoReferenceDocumentRoutes = simpleCrud(prisma.tBLAUTOREFERENCEDOCUMENT as unknown as Delegate, autoRef, autoRef.partial(), 'Auto reference document not found')

// Operasyon Tipi Toplu İşlem Bağlantı
const bulkAction = z.object({ operationTypeId: pInt, facilityId: pInt.optional(), bulkActionType: bulkType.optional(), description: z.string().max(200).optional(), isActive: z.boolean().optional() })
export const bulkActionRoutes = simpleCrud(prisma.tBLOPERATIONTYPEBULKACTION as unknown as Delegate, bulkAction, bulkAction.partial(), 'Bulk action link not found', 'operationTypeId')

// Ürün Ek Grup Bağlantı
const productAddGroup = z.object({ productId: pInt, groupId: pInt, sortOrder: oInt.optional(), isActive: z.boolean().optional() })
export const productAdditionalGroupRoutes = simpleCrud(prisma.tBLPRODUCTADDITIONALGROUPLINK as unknown as Delegate, productAddGroup, productAddGroup.partial(), 'Product additional group link not found', 'productId')

// Ürün Bazında Toplama Bağlantı
const productCollection = z.object({ businessPartnerId: pInt, sourceOperationTypeId: pInt, targetOperationTypeId: pInt, exemptLocations: z.string().max(500).optional(), isActive: z.boolean().optional() })
export const productBasedCollectionRoutes = simpleCrud(prisma.tBLPRODUCTBASEDCOLLECTION as unknown as Delegate, productCollection, productCollection.partial(), 'Product based collection not found')

// Sefer Bazında Toplama Bağlantı
const tripCollection = z.object({ businessPartnerId: pInt, sourceOperationTypeId: pInt, targetOperationTypeId: pInt, isActive: z.boolean().optional() })
export const tripBasedCollectionRoutes = simpleCrud(prisma.tBLTRIPBASEDCOLLECTION as unknown as Delegate, tripCollection, tripCollection.partial(), 'Trip based collection not found')
