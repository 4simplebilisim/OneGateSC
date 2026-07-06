import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { getCompanyId, companyListFilter } from '../lib/company.js'
import { firstBadRef, partnerParentIssue } from '../lib/refGuard.js'
import { importRows, codeMap, resolveCode, str, norm } from '../lib/importer.js'

const partnerTypes = ['CUSTOMER', 'SUPPLIER', 'BOTH'] as const

// Genişletilmiş cari alanları (legacy TBLMUSTERI) — create & update'te opsiyonel
const extraShape = z.object({
  shortName: z.string().max(50),
  contactPerson: z.string().max(100),
  contactPerson2: z.string().max(100),
  specialCode: z.string().max(40),
  address2: z.string().max(255),
  district: z.string().max(60),
  postalCode: z.string().max(20),
  country: z.string().max(60),
  phone2: z.string().max(20),
  mobilePhone: z.string().max(20),
  fax: z.string().max(20),
  website: z.string().max(150),
  taxOffice: z.string().max(100),
  nationalId: z.string().max(20),
  licenseOffice: z.string().max(100),
  licenseNo: z.string().max(40),
  priorityOrder: z.number().int(),
  palletized: z.boolean(),
  minDeliveryTime: z.string().max(10),
  maxDeliveryTime: z.string().max(10),
  vehicleRestriction: z.string().max(255),
  street: z.string().max(100),
  streetName: z.string().max(100),
  neighborhood: z.string().max(100),
  otherAddress: z.string().max(255),
  doorNo: z.string().max(20),
  mapCode: z.number().int(),
  coordinateX: z.number(),
  coordinateY: z.number(),
}).partial()

const createSchema = z.object({
  code: z.string().min(1).max(40),
  name: z.string().min(1).max(200),
  type: z.enum(partnerTypes).optional(),
  regionId: z.number().int().positive().optional(),
  partnerGroupId: z.number().int().positive().optional(),
  parentId: z.number().int().positive().optional(), // zincir müşteri (üst cari)
  taxNumber: z.string().max(20).optional(),
  phone: z.string().max(20).optional(),
  email: z.string().email().max(150).optional(),
  city: z.string().max(60).optional(),
  address: z.string().max(255).optional(),
  facilities: z.array(z.number().int().positive()).optional(), // kullanılabilir tesisler (boş = tüm tesisler)
  isActive: z.boolean().optional(),
}).merge(extraShape)

const updateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  type: z.enum(partnerTypes).optional(),
  regionId: z.number().int().positive().nullable().optional(),
  partnerGroupId: z.number().int().positive().nullable().optional(),
  parentId: z.number().int().positive().nullable().optional(),
  taxNumber: z.string().max(20).nullable().optional(),
  phone: z.string().max(20).nullable().optional(),
  email: z.string().email().max(150).nullable().optional(),
  city: z.string().max(60).nullable().optional(),
  address: z.string().max(255).nullable().optional(),
  facilities: z.array(z.number().int().positive()).optional(),
  isActive: z.boolean().optional(),
}).merge(extraShape)

// Sadece bu firmaya ait tesis id'leri (cross-tenant koruması)
async function validFacilityIds(companyId: number, facilities: number[] | undefined): Promise<number[]> {
  if (!facilities?.length) return []
  const rows = await prisma.tBLFACILITY.findMany({ where: { companyId, id: { in: facilities } }, select: { id: true } })
  return rows.map((r) => r.id)
}

export async function businessPartnerRoutes(app: FastifyInstance) {
  app.get('/', async (request) => {
    const q = request.query as { type?: string; parentId?: string }
    return prisma.tBLBUSINESSPARTNER.findMany({
      where: {
        ...companyListFilter(request),
        type: partnerTypes.includes(q.type as (typeof partnerTypes)[number])
          ? (q.type as (typeof partnerTypes)[number])
          : undefined,
        ...(q.parentId ? { parentId: Number(q.parentId) } : {}),
      },
      orderBy: { code: 'asc' },
    })
  })

  app.get('/:id', async (request, reply) => {
    const id = Number((request.params as { id: string }).id)
    if (!Number.isInteger(id)) return reply.code(400).send({ error: 'Invalid id' })
    const partner = await prisma.tBLBUSINESSPARTNER.findFirst({ where: { id, ...companyListFilter(request) }, include: { facilities: { select: { facilityId: true } } } })
    if (!partner) return reply.code(404).send({ error: 'Partner not found' })
    return partner
  })

  // Excel içe aktarma: kanonik anahtarlı satırlar → toplu cari oluştur. Cari Grubu KOD ile; Tip Türkçe (Müşteri/Tedarikçi/Her İkisi).
  const typeOf = (v: unknown): 'CUSTOMER' | 'SUPPLIER' | 'BOTH' => {
    const s = norm(v)
    if (['tedarikçi', 'tedarikci', 'supplier', 's'].includes(s)) return 'SUPPLIER'
    if (['her ikisi', 'ikisi', 'both', 'her iki'].includes(s)) return 'BOTH'
    return 'CUSTOMER' // varsayılan (boş dahil)
  }
  const importRowSchema = z.object({
    code: z.any().optional(), name: z.any().optional(), type: z.any().optional(),
    taxNumber: z.any().optional(), phone: z.any().optional(), email: z.any().optional(),
    city: z.any().optional(), address: z.any().optional(), groupCode: z.any().optional(),
  }).passthrough()
  app.post('/import', { preHandler: [app.authenticate, app.requireWrite] }, async (request, reply) => {
    const body = z.object({ rows: z.array(importRowSchema).min(1).max(5000) }).safeParse(request.body)
    if (!body.success) return reply.code(400).send({ error: 'Geçersiz veri (rows dizisi gerekli, en fazla 5000)' })
    const companyId = getCompanyId(request)
    const groups = await codeMap(prisma.tBLPARTNERGROUP, companyId)
    const result = await importRows(body.data.rows, async (r) => {
      const code = str(r.code), name = str(r.name)
      if (!code) throw new Error('Kod zorunlu')
      if (!name) throw new Error('Ad zorunlu')
      const partnerGroupId = resolveCode(groups, r.groupCode, 'Cari Grubu')
      const email = str(r.email)
      if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new Error(`Geçersiz e-posta: ${email}`)
      try {
        await prisma.tBLBUSINESSPARTNER.create({ data: {
          companyId, code, name, type: typeOf(r.type), partnerGroupId,
          taxNumber: str(r.taxNumber) || undefined, phone: str(r.phone) || undefined,
          email: email || undefined, city: str(r.city) || undefined, address: str(r.address) || undefined,
        } })
      } catch (e) {
        if ((e as { code?: string }).code === 'P2002') throw new Error(`Kod zaten var: ${code}`)
        throw e
      }
    })
    return result
  })

  app.post('/', { preHandler: [app.authenticate, app.requireWrite] }, async (request, reply) => {
    const parsed = createSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.code(400).send({ error: 'Invalid body', details: parsed.error.flatten() })
    }
    const companyId = getCompanyId(request)
    const { facilities, ...rest } = parsed.data
    // FK'ler bu firmaya ait mi (çapraz-firma izolasyon)
    const bad = await firstBadRef(companyId, [['cari grubu', 'partnerGroup', rest.partnerGroupId], ['bölge', 'region', rest.regionId], ['üst cari', 'partner', rest.parentId]])
    if (bad) return reply.code(400).send({ error: `Geçersiz ${bad} — bu firmaya ait değil` })
    const facIds = await validFacilityIds(companyId, facilities)
    try {
      const partner = await prisma.tBLBUSINESSPARTNER.create({
        data: { ...rest, companyId, facilities: { create: facIds.map((fid) => ({ companyId, facilityId: fid })) } },
      })
      return reply.code(201).send(partner)
    } catch (err) {
      const code = (err as { code?: string }).code
      if (code === 'P2002') return reply.code(409).send({ error: 'Partner code already exists' })
      if (code === 'P2003') return reply.code(400).send({ error: 'Geçersiz referans (cari grubu/bölge/üst cari)' })
      throw err
    }
  })

  app.patch('/:id', { preHandler: [app.authenticate, app.requireWrite] }, async (request, reply) => {
    const id = Number((request.params as { id: string }).id)
    if (!Number.isInteger(id)) return reply.code(400).send({ error: 'Invalid id' })
    const parsed = updateSchema.safeParse(request.body)
    if (!parsed.success) return reply.code(400).send({ error: 'Invalid body', details: parsed.error.flatten() })
    const existing = await prisma.tBLBUSINESSPARTNER.findFirst({ where: { id, ...companyListFilter(request) } })
    if (!existing) return reply.code(404).send({ error: 'Partner not found' })
    const { facilities, ...rest } = parsed.data
    // FK'ler cari'nin firmasına ait mi (çapraz-firma izolasyon; og_company değil)
    const bad = await firstBadRef(existing.companyId, [['cari grubu', 'partnerGroup', rest.partnerGroupId], ['bölge', 'region', rest.regionId], ['üst cari', 'partner', rest.parentId]])
    if (bad) return reply.code(400).send({ error: `Geçersiz ${bad} — bu firmaya ait değil` })
    // Zincir (parentId): self-referans / döngü engeli
    if (rest.parentId !== undefined) {
      const issue = await partnerParentIssue(existing.companyId, id, rest.parentId)
      if (issue === 'self') return reply.code(400).send({ error: 'Cari kendisini üst cari (zincir) yapamaz' })
      if (issue === 'cycle') return reply.code(400).send({ error: 'Zincir döngüsü — bu üst cari zaten bu carinin altında' })
    }
    const data: Record<string, unknown> = { ...rest }
    if (facilities) {
      // Cross-company düzenlemede tesisler düzenlenen cari'nin firmasına göre doğrulanır (og_company değil)
      const facIds = await validFacilityIds(existing.companyId, facilities)
      data.facilities = { deleteMany: {}, create: facIds.map((fid) => ({ companyId: existing.companyId, facilityId: fid })) }
    }
    try {
      return await prisma.tBLBUSINESSPARTNER.update({ where: { id }, data, include: { facilities: { select: { facilityId: true } } } })
    } catch (err) {
      if ((err as { code?: string }).code === 'P2003') return reply.code(400).send({ error: 'Geçersiz referans (cari grubu/bölge/üst cari)' })
      throw err
    }
  })
}
