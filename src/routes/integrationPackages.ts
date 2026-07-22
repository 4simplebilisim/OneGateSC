import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { getCompanyId } from '../lib/company.js'
import { simpleCrud, type Delegate, type BeforeWrite } from './documentTypes.js'
import { firstBadRef } from '../lib/refGuard.js'
import { testConnection, type IntegrationPackageLike } from '../lib/integrations.js'

const packageTypes = ['GENERIC_REST', 'NETSIS_REST', 'LOGO_REST'] as const

// Entegrasyon Paketi — legacy TBLSBENTEGRASYONPAKET (bağlantı profili: sunucu/db/şube/dönem/kullanıcılar)
const pkgCreate = z.object({
  code: z.string().min(1).max(40),
  name: z.string().max(150).nullish(),
  packageType: z.enum(packageTypes).optional(),
  baseUrl: z.string().max(300).nullish(),
  username: z.string().max(100).nullish(),
  password: z.string().max(200).nullish(),
  clientId: z.string().max(150).nullish(),
  clientSecret: z.string().max(200).nullish(),
  dbType: z.string().max(30).nullish(),
  dbName: z.string().max(100).nullish(),
  dbUser: z.string().max(100).nullish(),
  dbPassword: z.string().max(200).nullish(),
  branchCode: z.string().max(20).nullish(),
  firmNr: z.string().max(10).nullish(),
  periodNr: z.string().max(10).nullish(),
  logging: z.boolean().optional(),
  isActive: z.boolean().optional(),
})
const pkgUpdate = pkgCreate.partial().omit({ code: true })

// Entegrasyon Adresi — legacy TBLSBENTEGRASYONADRES (operasyona bağlı uç + tetik bayrakları)
const addrCreate = z.object({
  packageId: z.number().int().positive(),
  operationTypeId: z.number().int().positive().nullish(),
  facilityId: z.number().int().positive().nullish(),
  name: z.string().max(150).nullish(),
  path: z.string().min(1).max(300),
  sortOrder: z.number().int().nullish(),
  onCreate: z.boolean().optional(), // legacy BYTYARATMAENTEGRASYONU
  onFirstScan: z.boolean().optional(), // legacy BYTILKOKUTMAENTEGRASYONU
  onConfirm: z.boolean().optional(), // legacy BYTONAYENTEGRASYONU
  onComplete: z.boolean().optional(), // legacy BYTKAYDETMEENTEGRASYONU
  logging: z.boolean().optional(),
  isActive: z.boolean().optional(),
})
const addrUpdate = addrCreate.partial().omit({ packageId: true })

// Cross-tenant: adresin paketi/operasyonu/tesisi bu firmaya ait olmalı
const addrGuard: BeforeWrite = async ({ data, companyId }) => {
  const pkgId = data.packageId as number | undefined
  if (pkgId != null) {
    const pkg = await prisma.tBLINTEGRATIONPACKAGE.findFirst({ where: { id: pkgId, companyId }, select: { id: true } })
    if (!pkg) return 'Geçersiz entegrasyon paketi — bu firmaya ait değil'
  }
  const refs: [string, 'operationType' | 'facility', number][] = []
  const opId = data.operationTypeId as number | null | undefined
  const facId = data.facilityId as number | null | undefined
  if (opId != null) refs.push(['Operasyon', 'operationType', opId])
  if (facId != null) refs.push(['Tesis', 'facility', facId])
  if (refs.length) {
    const bad = await firstBadRef(companyId, refs)
    if (bad) return `Geçersiz ${bad} — bu firmaya ait değil`
  }
  return null
}

export async function integrationPackageRoutes(app: FastifyInstance) {
  // Bağlantı testi — tipe göre token dener (Netsis/Logo) ya da erişilebilirlik (GENERIC); şifre yanıtta yer almaz
  app.post('/:id/test', { preHandler: [app.authenticate, app.requireWrite] }, async (request, reply) => {
    const id = Number((request.params as { id: string }).id)
    if (!Number.isInteger(id)) return reply.code(400).send({ error: 'Invalid id' })
    const pkg = await prisma.tBLINTEGRATIONPACKAGE.findFirst({ where: { id, companyId: getCompanyId(request) } })
    if (!pkg) return reply.code(404).send({ error: 'Entegrasyon paketi bulunamadı' })
    const result = await testConnection(pkg as IntegrationPackageLike)
    return reply.code(result.ok ? 200 : 502).send(result)
  })
  await simpleCrud(prisma.tBLINTEGRATIONPACKAGE as unknown as Delegate, pkgCreate, pkgUpdate, 'Entegrasyon paketi bulunamadı')(app)
}

// Adres CRUD — LinkTab ?packageId=X ile filtreler
export const integrationAddressRoutes = simpleCrud(prisma.tBLINTEGRATIONADDRESS as unknown as Delegate, addrCreate, addrUpdate, 'Entegrasyon adresi bulunamadı', 'packageId', addrGuard)
