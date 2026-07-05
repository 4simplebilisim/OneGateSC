import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { simpleCrud, type Delegate } from './documentTypes.js'
import { getCompanyId, companyListFilter } from '../lib/company.js'

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

// Operasyon Tipi Tolerans (master — kademe detayları ayrı tabloda)
const opTolerance = z.object({ operationTypeId: pInt.optional(), facilityId: pInt.optional(), businessPartnerId: pInt.optional(), cariLinkType: scope.optional(), cariLinkId: pInt.optional(), materialLinkType: scope.optional(), materialLinkId: pInt.optional(), ignoreSplit: z.boolean().optional(), isActive: z.boolean().optional() })
export const operationToleranceRoutes = simpleCrud(prisma.tBLOPERATIONTYPETOLERANCE as unknown as Delegate, opTolerance, opTolerance.partial(), 'Operation tolerance not found', 'operationTypeId')

// Operasyon Tipi Tolerans DETAY — kademe bazında (StokBar Tolerans Detay). Bir toleransta N detay (ör. kg %10, adet %15).
const dNum = z.number().nullable().optional()
const dInt = pInt.nullable().optional()
const opToleranceDetail = z.object({ toleranceId: pInt, unitId: dInt, lowerPercent: dNum, upperPercent: dNum })
export const operationToleranceDetailRoutes = simpleCrud(prisma.tBLOPERATIONTYPETOLERANCEDETAIL as unknown as Delegate, opToleranceDetail, opToleranceDetail.partial().omit({ toleranceId: true }), 'Tolerance detail not found', 'toleranceId')

// Operasyon Tipi Yasaklı Ürün
const forbidden = z.object({ operationTypeId: pInt, facilityId: pInt.optional(), businessPartnerId: pInt.optional(), cariLinkType: scope.optional(), cariLinkId: pInt.optional(), materialLinkType: scope.optional(), materialLinkId: pInt.optional(), isActive: z.boolean().optional() })
export const forbiddenProductRoutes = simpleCrud(prisma.tBLOPERATIONTYPEFORBIDDENPRODUCT as unknown as Delegate, forbidden, forbidden.partial(), 'Forbidden product not found', 'operationTypeId')

// Operasyon Tipi Dönüşüm
const conversion = z.object({ operationTypeId: pInt, facilityId: pInt.optional(), statusId: pInt.optional(), conversionCode: z.string().min(1).max(10), outgoing: z.boolean().optional(), sourceLocLinkType: scope.optional(), sourceLocLinkId: pInt.optional(), targetLocLinkType: scope.optional(), targetLocLinkId: pInt.optional(), isActive: z.boolean().optional() })
export const conversionRoutes = simpleCrud(prisma.tBLOPERATIONTYPECONVERSION as unknown as Delegate, conversion, conversion.partial(), 'Conversion not found', 'operationTypeId')

// Sıralı Operasyon
const sequential = z.object({ firstOperationId: pInt, secondOperationId: pInt, facilityId: pInt.optional(), cariLinkType: scope.optional(), cariLinkId: pInt.optional(), materialLinkType: scope.optional(), materialLinkId: pInt.optional(), locationLinkType: scope.optional(), locationLinkId: pInt.optional(), useInWorkOrder: z.boolean().optional(), spName: z.string().max(300).optional(), isActive: z.boolean().optional() })
export const sequentialOperationRoutes = simpleCrud(prisma.tBLSEQUENTIALOPERATION as unknown as Delegate, sequential, sequential.partial(), 'Sequential operation not found')

// Otomatik Referanslı Belge — Referans Kontrollü eşleme: KAYNAK TESİS+ÇIKIŞ op onaylanınca HEDEF TESİS+GİRİŞ op'ta belge doğar.
// facility (BYTTESIS) = TESİS İÇİ: tikli → hedef tesis = kaynak tesis (alan boş); değilse hedef tesis ZORUNLU.
const autoRef = z.object({
  sourceFacilityId: pInt,
  sourceOperationTypeId: pInt,
  sourceLocLinkType: oInt.optional(), sourceLocLinkId: oInt.optional(),
  facility: z.boolean().optional(),
  targetFacilityId: pInt.nullable().optional(),
  targetOperationTypeId: pInt,
  targetLocLinkType: oInt.optional(), targetLocLinkId: oInt.optional(),
  isActive: z.boolean().optional(),
})
type AutoRefData = z.infer<typeof autoRef>

async function autoRefIssue(companyId: number, d: AutoRefData): Promise<string | null> {
  const sameFacility = d.facility === true
  if (!sameFacility && d.targetFacilityId == null) return 'Hedef tesis zorunlu — "Tesis İçi" işaretli değilse tesisler arası hareket hedef tesis ister'
  const [srcFac, tgtFac, srcOp, tgtOp] = await Promise.all([
    prisma.tBLFACILITY.findFirst({ where: { id: d.sourceFacilityId, companyId }, select: { id: true } }),
    d.targetFacilityId != null ? prisma.tBLFACILITY.findFirst({ where: { id: d.targetFacilityId, companyId }, select: { id: true } }) : Promise.resolve(null),
    prisma.tBLOPERATIONTYPE.findFirst({ where: { id: d.sourceOperationTypeId, companyId }, select: { direction: true, facilityId: true } }),
    prisma.tBLOPERATIONTYPE.findFirst({ where: { id: d.targetOperationTypeId, companyId }, select: { direction: true, facilityId: true } }),
  ])
  if (!srcFac) return 'Kaynak tesis geçersiz (başka firmaya ait olabilir)'
  if (!sameFacility && !tgtFac) return 'Hedef tesis geçersiz (başka firmaya ait olabilir)'
  if (!srcOp) return 'Kaynak operasyon geçersiz'
  if (srcOp.direction !== 'OUTBOUND') return 'Kaynak operasyon ÇIKIŞ yönlü olmalı'
  if (srcOp.facilityId != null && srcOp.facilityId !== d.sourceFacilityId) return 'Kaynak operasyon kaynak tesise ait değil'
  if (!tgtOp) return 'Hedef operasyon geçersiz'
  if (tgtOp.direction !== 'INBOUND') return 'Hedef operasyon GİRİŞ yönlü olmalı'
  const expectedFac = sameFacility ? d.sourceFacilityId : d.targetFacilityId
  if (tgtOp.facilityId != null && tgtOp.facilityId !== expectedFac) return sameFacility ? 'Hedef operasyon kaynak tesise ait değil (Tesis İçi seçili)' : 'Hedef operasyon hedef tesise ait değil'
  return null
}

export async function autoReferenceDocumentRoutes(app: FastifyInstance) {
  app.get('/', async (request) => prisma.tBLAUTOREFERENCEDOCUMENT.findMany({ where: { ...companyListFilter(request) }, orderBy: { id: 'desc' } }))
  app.get('/:id', async (request, reply) => {
    const id = Number((request.params as { id: string }).id)
    if (!Number.isInteger(id)) return reply.code(400).send({ error: 'Invalid id' })
    const row = await prisma.tBLAUTOREFERENCEDOCUMENT.findFirst({ where: { id, ...companyListFilter(request) } })
    if (!row) return reply.code(404).send({ error: 'Otomatik referanslı belge tanımı bulunamadı' })
    return row
  })
  app.post('/', { preHandler: [app.authenticate, app.requireWrite] }, async (request, reply) => {
    const parsed = autoRef.safeParse(request.body)
    if (!parsed.success) return reply.code(400).send({ error: 'Invalid body', details: parsed.error.flatten() })
    const companyId = getCompanyId(request)
    const d = { ...parsed.data, targetFacilityId: parsed.data.facility ? null : parsed.data.targetFacilityId } // tesis içi → hedef boş (kaynakla aynı)
    const issue = await autoRefIssue(companyId, d)
    if (issue) return reply.code(400).send({ error: issue })
    return reply.code(201).send(await prisma.tBLAUTOREFERENCEDOCUMENT.create({ data: { ...d, companyId } }))
  })
  app.patch('/:id', { preHandler: [app.authenticate, app.requireWrite] }, async (request, reply) => {
    const id = Number((request.params as { id: string }).id)
    if (!Number.isInteger(id)) return reply.code(400).send({ error: 'Invalid id' })
    const parsed = autoRef.partial().safeParse(request.body)
    if (!parsed.success) return reply.code(400).send({ error: 'Invalid body', details: parsed.error.flatten() })
    const companyId = getCompanyId(request)
    const existing = await prisma.tBLAUTOREFERENCEDOCUMENT.findFirst({ where: { id, companyId } })
    if (!existing) return reply.code(404).send({ error: 'Otomatik referanslı belge tanımı bulunamadı' })
    const merged: AutoRefData = {
      sourceFacilityId: parsed.data.sourceFacilityId ?? existing.sourceFacilityId,
      sourceOperationTypeId: parsed.data.sourceOperationTypeId ?? existing.sourceOperationTypeId,
      facility: parsed.data.facility ?? existing.facility,
      targetFacilityId: parsed.data.targetFacilityId !== undefined ? parsed.data.targetFacilityId : existing.targetFacilityId,
      targetOperationTypeId: parsed.data.targetOperationTypeId ?? existing.targetOperationTypeId,
    }
    if (merged.facility) merged.targetFacilityId = null // tesis içi → hedef boş
    const issue = await autoRefIssue(companyId, merged)
    if (issue) return reply.code(400).send({ error: issue })
    return prisma.tBLAUTOREFERENCEDOCUMENT.update({ where: { id }, data: { ...parsed.data, targetFacilityId: merged.targetFacilityId } })
  })
  app.delete('/:id', { preHandler: [app.authenticate, app.requireWrite] }, async (request, reply) => {
    const id = Number((request.params as { id: string }).id)
    if (!Number.isInteger(id)) return reply.code(400).send({ error: 'Invalid id' })
    const res = await prisma.tBLAUTOREFERENCEDOCUMENT.deleteMany({ where: { id, companyId: getCompanyId(request) } })
    if (res.count === 0) return reply.code(404).send({ error: 'Otomatik referanslı belge tanımı bulunamadı' })
    return { deleted: res.count }
  })
}

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
