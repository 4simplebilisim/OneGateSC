import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { getCompanyId } from '../lib/company.js'
import { simpleCrud, type Delegate } from './documentTypes.js'

const pInt = z.number().int().positive()
const oInt = z.number().int()

// El terminali menü GRUBU (Tesis bazlı sekme)
const groupSchema = z.object({
  facilityId: oInt.optional(),
  code: z.string().min(1).max(40),
  name: z.string().min(1).max(100),
  sortOrder: oInt.optional(),
  isActive: z.boolean().optional(),
})
export const handheldMenuGroupRoutes = simpleCrud(prisma.tBLHANDHELDMENUGROUP as unknown as Delegate, groupSchema, groupSchema.partial(), 'Menü grubu bulunamadı')

// El terminali menü ITEM (operasyon koduna bağlı; screenType = mobil akış)
const itemSchema = z.object({
  groupId: pInt,
  code: z.string().min(1).max(40),
  name: z.string().min(1).max(100),
  screenType: z.enum(['RECEIPT', 'PICK', 'COUNT', 'STOCK']),
  operationTypeId: oInt.optional(),
  sortOrder: oInt.optional(),
  isActive: z.boolean().optional(),
})
export const handheldMenuItemRoutes = simpleCrud(prisma.tBLHANDHELDMENUITEM as unknown as Delegate, itemSchema, itemSchema.partial(), 'Menü item bulunamadı', 'groupId')

// MobileHome + yetki ekranı için birleşik okuma: aktif grup+item (sortOrder sıralı), firmaya göre.
export async function handheldMenuRoutes(app: FastifyInstance) {
  app.get('/', { preHandler: [app.authenticate] }, async (request) => {
    const companyId = getCompanyId(request)
    const q = request.query as { facilityId?: string }
    const facilityId = q.facilityId ? Number(q.facilityId) : undefined
    return prisma.tBLHANDHELDMENUGROUP.findMany({
      where: { companyId, isActive: true, ...(facilityId ? { OR: [{ facilityId }, { facilityId: null }] } : {}) },
      orderBy: { sortOrder: 'asc' },
      include: { items: { where: { isActive: true }, orderBy: { sortOrder: 'asc' } } },
    })
  })
}
