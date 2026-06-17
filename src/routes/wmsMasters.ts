import type { FastifyInstance } from 'fastify'
import { z, type ZodTypeAny } from 'zod'
import { prisma } from '../lib/prisma.js'
import { getCompanyId } from '../lib/company.js'

interface MasterDelegate {
  findMany(args: unknown): Promise<unknown[]>
  create(args: unknown): Promise<unknown>
  findFirst(args: unknown): Promise<unknown | null>
  update(args: unknown): Promise<unknown>
  deleteMany(args: unknown): Promise<{ count: number }>
}

/** Basit tanım tablosu (code+name+...) için ortak CRUD route'ları. */
function masterRoutes(delegate: MasterDelegate, createSchema: ZodTypeAny, updateSchema: ZodTypeAny, dupMsg: string, notFound: string) {
  return async function (app: FastifyInstance) {
    app.get('/', async (request) =>
      delegate.findMany({ where: { companyId: getCompanyId(request) }, orderBy: { code: 'asc' } }),
    )

    app.get('/:id', async (request, reply) => {
      const id = Number((request.params as { id: string }).id)
      if (!Number.isInteger(id)) return reply.code(400).send({ error: 'Invalid id' })
      const row = await delegate.findFirst({ where: { id, companyId: getCompanyId(request) } })
      if (!row) return reply.code(404).send({ error: notFound })
      return row
    })

    app.post('/', { preHandler: [app.authenticate, app.requireWrite] }, async (request, reply) => {
      const parsed = createSchema.safeParse(request.body)
      if (!parsed.success) return reply.code(400).send({ error: 'Invalid body', details: parsed.error.flatten() })
      try {
        const row = await delegate.create({ data: { ...(parsed.data as Record<string, unknown>), companyId: getCompanyId(request) } })
        return reply.code(201).send(row)
      } catch (err) {
        if ((err as { code?: string }).code === 'P2002') return reply.code(409).send({ error: dupMsg })
        throw err
      }
    })

    app.patch('/:id', { preHandler: [app.authenticate, app.requireWrite] }, async (request, reply) => {
      const id = Number((request.params as { id: string }).id)
      if (!Number.isInteger(id)) return reply.code(400).send({ error: 'Invalid id' })
      const parsed = updateSchema.safeParse(request.body)
      if (!parsed.success) return reply.code(400).send({ error: 'Invalid body', details: parsed.error.flatten() })
      const existing = await delegate.findFirst({ where: { id, companyId: getCompanyId(request) } })
      if (!existing) return reply.code(404).send({ error: notFound })
      return delegate.update({ where: { id }, data: parsed.data })
    })

    app.delete('/:id', { preHandler: [app.authenticate, app.requireWrite] }, async (request, reply) => {
      const id = Number((request.params as { id: string }).id)
      if (!Number.isInteger(id)) return reply.code(400).send({ error: 'Invalid id' })
      try {
        const res = await delegate.deleteMany({ where: { id, companyId: getCompanyId(request) } })
        if (res.count === 0) return reply.code(404).send({ error: notFound })
        return { deleted: res.count }
      } catch (err) {
        if ((err as { code?: string }).code === 'P2003') return reply.code(409).send({ error: 'Kayıt kullanımda — silinemez' })
        throw err
      }
    })
  }
}

// Neden (legacy TBLSBNEDEN)
const reason = z.object({ code: z.string().min(1).max(10), name: z.string().min(1).max(100), isActive: z.boolean().optional() })
export const reasonRoutes = masterRoutes(prisma.tBLREASON as unknown as MasterDelegate, reason, reason.partial().omit({ code: true }), 'Neden kodu zaten var', 'Reason not found')

// Lokasyon grubu (legacy TBLSBLOKASYONGRUP)
const locGroup = z.object({ code: z.string().min(1).max(16), name: z.string().min(1).max(100), isWorkOrderGroup: z.boolean().optional(), isActive: z.boolean().optional() })
export const locationGroupRoutes = masterRoutes(prisma.tBLLOCATIONGROUP as unknown as MasterDelegate, locGroup, locGroup.partial().omit({ code: true }), 'Grup kodu zaten var', 'Location group not found')

// Operasyon grubu (legacy TBLSBOPERASYONGRUP)
const opGroup = z.object({ code: z.string().min(1).max(16), name: z.string().min(1).max(100), isActive: z.boolean().optional() })
export const operationGroupRoutes = masterRoutes(prisma.tBLOPERATIONGROUP as unknown as MasterDelegate, opGroup, opGroup.partial().omit({ code: true }), 'Grup kodu zaten var', 'Operation group not found')

// Etiket tipi (legacy TBLSBDEETIKETTIPI)
const label = z.object({
  code: z.string().min(1).max(50),
  labelName: z.string().max(200).optional(),
  screenTitle: z.string().max(200).optional(),
  displayType: z.number().int().optional(),
  reportType: z.number().int().optional(),
  col1Count: z.number().int().optional(),
  col2Count: z.number().int().optional(),
  col3Count: z.number().int().optional(),
  col1Length: z.number().int().optional(),
  col2Length: z.number().int().optional(),
  layoutJson: z.string().optional(), // görsel tasarım (boyut + elementler) JSON string
  isActive: z.boolean().optional(),
})
export const labelTypeRoutes = masterRoutes(prisma.tBLLABELTYPE as unknown as MasterDelegate, label, label.partial().omit({ code: true }), 'Etiket tipi kodu zaten var', 'Label type not found')

// Ürün alt-grubu (legacy TBLURUNEKGRUP)
const subGroup = z.object({
  code: z.string().min(1).max(20),
  name: z.string().min(1).max(120),
  reference: z.string().max(200).optional(),
  imagePath: z.string().max(500).optional(),
  sortOrder: z.number().int().optional(),
  colorCode: z.string().max(14).optional(),
  isActive: z.boolean().optional(),
})
export const productSubGroupRoutes = masterRoutes(prisma.tBLPRODUCTSUBGROUP as unknown as MasterDelegate, subGroup, subGroup.partial().omit({ code: true }), 'Alt-grup kodu zaten var', 'Product subgroup not found')

// Giriş/çıkış koşulu tipi + yönlendirme tipi (legacy GIRISKOSULTIPI/CIKISKOSULTIPI/YONLENDIRMETIPI)
const condType = z.object({ code: z.string().min(1).max(20), name: z.string().max(100).optional(), isActive: z.boolean().optional() })
const condUpdate = condType.partial().omit({ code: true })
export const entryConditionTypeRoutes = masterRoutes(prisma.tBLENTRYCONDITIONTYPE as unknown as MasterDelegate, condType, condUpdate, 'Giriş koşul tipi kodu zaten var', 'Entry condition type not found')
export const exitConditionTypeRoutes = masterRoutes(prisma.tBLEXITCONDITIONTYPE as unknown as MasterDelegate, condType, condUpdate, 'Çıkış koşul tipi kodu zaten var', 'Exit condition type not found')
export const routingTypeRoutes = masterRoutes(prisma.tBLROUTINGTYPE as unknown as MasterDelegate, condType, condUpdate, 'Yönlendirme tipi kodu zaten var', 'Routing type not found')

// Tesis (bizim eklediğimiz) · Bölge (legacy MSDBOLGE) · Cari grup (legacy MUSTERIGRUP)
const facility = z.object({ code: z.string().min(1).max(20), name: z.string().min(1).max(100), city: z.string().max(60).optional(), address: z.string().max(255).optional(), isActive: z.boolean().optional() })
export const facilityRoutes = masterRoutes(prisma.tBLFACILITY as unknown as MasterDelegate, facility, facility.partial().omit({ code: true }), 'Tesis kodu zaten var', 'Facility not found')
const codeName60 = z.object({ code: z.string().min(1).max(20), name: z.string().min(1).max(60), isActive: z.boolean().optional() })
const codeName60Upd = codeName60.partial().omit({ code: true })
export const regionRoutes = masterRoutes(prisma.tBLREGION as unknown as MasterDelegate, codeName60, codeName60Upd, 'Bölge kodu zaten var', 'Region not found')
export const partnerGroupRoutes = masterRoutes(prisma.tBLPARTNERGROUP as unknown as MasterDelegate, codeName60, codeName60Upd, 'Cari grup kodu zaten var', 'Partner group not found')

// Statü (legacy TBLSBSTATU) — operasyon statü geçişleri bunu kullanır
const status = z.object({ code: z.string().min(1).max(20), name: z.string().min(1).max(100), isActive: z.boolean().optional() })
export const statusRoutes = masterRoutes(prisma.tBLSTATUS as unknown as MasterDelegate, status, status.partial().omit({ code: true }), 'Statü kodu zaten var', 'Status not found')

// Palet tipi (legacy TBLSBPALETTIPI) — prefix(code) + sayaç + uzunluk + tip(tek ürün/karma) + palet içi palet + transfer bayrakları
const palletType = z.object({
  code: z.string().min(1).max(20),
  name: z.string().min(1).max(100),
  mixingType: z.enum(['SINGLE_PRODUCT', 'MIXED']).optional(),
  facilityId: z.number().int().positive().optional(),
  palletNoLength: z.number().int().optional(),
  sequenceId: z.number().int().positive().optional(),
  isDivisible: z.boolean().optional(),
  partialUse: z.boolean().optional(),
  batchControl: z.boolean().optional(),
  singleProductControl: z.boolean().optional(),
  newNoOnEdit: z.boolean().optional(),
  breakParentPallet: z.boolean().optional(),
  breakPartialPallet: z.boolean().optional(),
  breakPalletOnTransfer: z.boolean().optional(),
  removeFromPalletOnTransfer: z.boolean().optional(),
  keepFullPalletOnTransfer: z.boolean().optional(),
  logging: z.boolean().optional(),
  logControl: z.boolean().optional(),
  logControlWarningType: z.number().int().optional(),
  isActive: z.boolean().optional(),
})
export const palletTypeRoutes = masterRoutes(prisma.tBLPALLETTYPE as unknown as MasterDelegate, palletType, palletType.partial().omit({ code: true }), 'Palet tipi kodu zaten var', 'Pallet type not found')

// Barkod tipi/parse (legacy TBLSBBARKODTIPI) + Genel parametre (legacy TBLSBPARAMETRE)
const barcodeType = z.object({ code: z.string().min(1).max(20), name: z.string().max(100).optional(), parseScript: z.string().optional(), isProductionBarcode: z.boolean().optional(), isActive: z.boolean().optional() })
export const barcodeTypeRoutes = masterRoutes(prisma.tBLBARCODETYPE as unknown as MasterDelegate, barcodeType, barcodeType.partial().omit({ code: true }), 'Barkod tipi kodu zaten var', 'Barcode type not found')
const parameter = z.object({ code: z.string().min(1).max(100), name: z.string().max(200).optional(), value: z.string().max(510).optional(), isActive: z.boolean().optional() })
export const parameterRoutes = masterRoutes(prisma.tBLPARAMETER as unknown as MasterDelegate, parameter, parameter.partial().omit({ code: true }), 'Parametre kodu zaten var', 'Parameter not found')

// Belge durumu (legacy TBLSBBELGEDURUM) — kod/tanım/renk + yaşam döngüsü sırası
const docStatus = z.object({ code: z.string().min(1).max(20), name: z.string().max(100).optional(), color: z.string().max(20).optional(), sortOrder: z.number().int().optional(), isActive: z.boolean().optional() })
export const documentStatusRoutes = masterRoutes(prisma.tBLDOCUMENTSTATUS as unknown as MasterDelegate, docStatus, docStatus.partial().omit({ code: true }), 'Belge durumu kodu zaten var', 'Document status not found')
