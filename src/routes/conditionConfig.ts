import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { getCompanyId, companyListFilter } from '../lib/company.js'
import { simpleCrud, type Delegate } from './documentTypes.js'

const pInt = z.number().int().positive()
const scope = z.enum(['ALL', 'GROUP', 'SPECIFIC'])
const ctrl = z.enum(['MANUAL', 'REQUIRE_BATCH', 'REQUIRE_SERIAL', 'REQUIRE_REASON', 'CONTROL_FIELD_REQUIRED', 'MIN_SHELF_LIFE'])

// Giriş Koşulu Parametresi (legacy TBLSBGIRISKOSULPARAMETRE)
const entryParam = z.object({
  entryConditionTypeId: pInt,
  cariLinkType: scope.optional(), cariLinkId: pInt.nullish(),
  materialLinkType: scope.optional(), materialLinkId: pInt.nullish(),
  controlType: ctrl.optional(),
  conditionBreakAllowed: z.boolean().optional(),
  exclude: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
  isActive: z.boolean().optional(),
})
export const entryConditionParameterRoutes = simpleCrud(prisma.tBLENTRYCONDITIONPARAMETER as unknown as Delegate, entryParam, entryParam.partial(), 'Giriş koşul parametresi bulunamadı')

// Çıkış Koşulu Parametresi (legacy TBLSBCIKISKOSULPARAMETRE)
const exitParam = z.object({
  exitConditionTypeId: pInt,
  cariLinkType: scope.optional(), cariLinkId: pInt.nullish(),
  materialLinkType: scope.optional(), materialLinkId: pInt.nullish(),
  controlType: ctrl.optional(),
  controlFieldId: pInt.nullish(),
  toleranceValue: z.number().optional(),
  percentValue: z.number().optional(),
  dayCount: z.number().int().optional(),
  conditionBreakAllowed: z.boolean().optional(),
  exclude: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
  isActive: z.boolean().optional(),
})
export const exitConditionParameterRoutes = simpleCrud(prisma.tBLEXITCONDITIONPARAMETER as unknown as Delegate, exitParam, exitParam.partial(), 'Çıkış koşul parametresi bulunamadı')

// Koşul Kırma Logu — denetim izi (documentId + conditionType=ENTRY/EXIT ile filtrelenir; sistem üretir, salt-okunur+sil)
export function conditionBreakLogRoutes(app: FastifyInstance) {
  app.get('/', async (request) => {
    const q = request.query as { documentId?: string; conditionType?: string }
    return prisma.tBLCONDITIONBREAKLOG.findMany({
      where: {
        companyId: getCompanyId(request),
        documentId: q.documentId ? Number(q.documentId) : undefined,
        conditionType: q.conditionType || undefined,
      },
      orderBy: { id: 'desc' },
      take: 300,
    })
  })
  app.delete('/:id', { preHandler: [app.authenticate, app.requireWrite] }, async (request, reply) => {
    const id = Number((request.params as { id: string }).id)
    if (!Number.isInteger(id)) return reply.code(400).send({ error: 'Invalid id' })
    const res = await prisma.tBLCONDITIONBREAKLOG.deleteMany({ where: { id, ...companyListFilter(request) } })
    if (res.count === 0) return reply.code(404).send({ error: 'Log bulunamadı' })
    return { deleted: res.count }
  })
}
