import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { getCompanyId } from '../lib/company.js'
import { simpleCrud, type Delegate, type BeforeWrite } from './documentTypes.js'
import { firstBadRef } from '../lib/refGuard.js'
import { parseBarcode } from '../lib/barcodeParse.js'

const modes = ['EAN', 'PALLET', 'SEGMENT', 'SCRIPT'] as const
const fields = ['PALLET', 'PRODUCT', 'BATCH', 'PRODUCTION', 'EXPIRY', 'QUANTITY', 'UNIT', 'SERIAL', 'IGNORE'] as const
const parseTypes = ['FIXED', 'UNTIL'] as const

// Barkod Tipi (kural) — eşleşme + mod + ayraç. code'lu master (simpleCrud code'suz olduğundan create'te code var).
const typeCreate = z.object({
  code: z.string().min(1).max(20),
  name: z.string().max(100).nullish(),
  facilityId: z.number().int().positive().nullish(),
  sortOrder: z.number().int().nullish(),
  mode: z.enum(modes).optional(),
  matchPrefix: z.string().max(20).nullish(),
  matchContains: z.string().max(20).nullish(),
  minLen: z.number().int().nonnegative().nullish(),
  maxLen: z.number().int().nonnegative().nullish(),
  separator: z.string().max(4).nullish(),
  palletKeyLen: z.number().int().positive().nullish(),
  parseScript: z.string().max(20000).nullish(), // SCRIPT modu: sandbox betiği (legacy TXTSCRIPT)
  isProductionBarcode: z.boolean().optional(),
  isActive: z.boolean().optional(),
})
const typeUpdate = typeCreate.partial().omit({ code: true })

// Segment — barkod tipine bağlı, sıralı alan
const segCreate = z.object({
  barcodeTypeId: z.number().int().positive(),
  sortOrder: z.number().int().nullish(),
  field: z.enum(fields),
  parseType: z.enum(parseTypes).optional(),
  length: z.number().int().positive().nullish(),
  separator: z.string().max(4).nullish(),
  dateFormat: z.string().max(12).nullish(),
})
const segUpdate = segCreate.partial().omit({ barcodeTypeId: true })

// Cross-tenant: tesis bu firmaya ait olmalı
const facilityGuard: BeforeWrite = async ({ data, companyId }) => {
  const fid = data.facilityId as number | null | undefined
  if (fid == null) return null
  const bad = await firstBadRef(companyId, [['Tesis', 'facility', fid]])
  return bad ? `Geçersiz ${bad} — bu firmaya ait değil` : null
}
// Cross-tenant: segmentin bağlı olduğu barkod tipi bu firmaya ait olmalı
const segParentGuard: BeforeWrite = async ({ data, companyId }) => {
  const btId = data.barcodeTypeId as number | undefined
  if (btId == null) return null // update'te değişmiyorsa gelmez
  const bt = await prisma.tBLBARCODETYPE.findFirst({ where: { id: btId, companyId }, select: { id: true } })
  return bt ? null : 'Geçersiz barkod tipi — bu firmaya ait değil'
}

export async function barcodeTypeRoutes(app: FastifyInstance) {
  // Test/çözümleme: barkod → ayrıştırma sonucu (ekran Test sekmesi + el terminali tüketir)
  app.get('/parse', { preHandler: [app.authenticate] }, async (request) => {
    const q = request.query as { code?: string; facilityId?: string }
    const companyId = getCompanyId(request)
    return parseBarcode(companyId, q.code ?? '', { facilityId: q.facilityId ? Number(q.facilityId) : undefined })
  })
  // Tip CRUD (code'lu) — simpleCrud'u aynı context'e uygula
  await simpleCrud(prisma.tBLBARCODETYPE as unknown as Delegate, typeCreate, typeUpdate, 'Barkod tipi bulunamadı', undefined, facilityGuard)(app)
}

// Segment CRUD — LinkTab ?barcodeTypeId=X ile filtreler
export const barcodeSegmentRoutes = simpleCrud(prisma.tBLBARCODESEGMENT as unknown as Delegate, segCreate, segUpdate, 'Segment bulunamadı', 'barcodeTypeId', segParentGuard)
