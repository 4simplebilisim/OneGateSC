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
  logoVersion: z.number().int().nullish(), // legacy BYTLOGOVERSIYON (1=LOGO 2.02 üstü, 0=öncesi)
  multiCompanyTransfer: z.boolean().optional(), // legacy BYTCOKLUFIRMAAKTARIMI
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

// ── Okuma Sorgusu (legacy TBLSBENTEGRASYONSORGU) — GELEN kaynak tanımı; '/uç' yazılırsa motor kullanır
const queryTypes = ['MALZEME', 'CARI', 'SIPARIS', 'FATURA', 'TALEP'] as const
const qryCreate = z.object({
  packageId: z.number().int().positive(),
  queryType: z.enum(queryTypes),
  query: z.string().min(1).max(20000), // legacy TXTSORGU (SQL) veya REST uç yolu
  ordering: z.string().max(300).nullish(),
  isActive: z.boolean().optional(),
})
const qryUpdate = qryCreate.partial().omit({ packageId: true })
const qryGuard: BeforeWrite = async ({ data, companyId }) => {
  const pkgId = data.packageId as number | undefined
  if (pkgId == null) return null
  const pkg = await prisma.tBLINTEGRATIONPACKAGE.findFirst({ where: { id: pkgId, companyId }, select: { id: true } })
  return pkg ? null : 'Geçersiz entegrasyon paketi — bu firmaya ait değil'
}
export const integrationQueryRoutes = simpleCrud(prisma.tBLINTEGRATIONQUERY as unknown as Delegate, qryCreate, qryUpdate, 'Okuma sorgusu bulunamadı', 'packageId', qryGuard)

// Sorgu Kolon Dönüşümü (legacy TBLSBENTEGRASYONSORGUKOLONDONUSUM) — LinkTab ?queryId=X
const qcolCreate = z.object({
  queryId: z.number().int().positive(),
  sourceColumn: z.string().min(1).max(100),
  targetField: z.string().min(1).max(40),
  sortOrder: z.number().int().nullish(),
})
const qcolUpdate = qcolCreate.partial().omit({ queryId: true })
const qcolGuard: BeforeWrite = async ({ data, companyId }) => {
  const qid = data.queryId as number | undefined
  if (qid == null) return null
  const qry = await prisma.tBLINTEGRATIONQUERY.findFirst({ where: { id: qid, companyId }, select: { id: true } })
  return qry ? null : 'Geçersiz okuma sorgusu — bu firmaya ait değil'
}
export const integrationQueryColumnRoutes = simpleCrud(prisma.tBLINTEGRATIONQUERYCOLUMN as unknown as Delegate, qcolCreate, qcolUpdate, 'Kolon dönüşümü bulunamadı', 'queryId', qcolGuard)

// ── Yazma Parametresi (legacy TBLSBENTYAZMAPARAMETRE) — GİDEN kırılım bayrakları
const wpCreate = z.object({
  facilityId: z.number().int().positive().nullish(),
  conversionId: z.number().int().positive().nullish(),
  addressId: z.number().int().positive(),
  bulkAction: z.boolean().optional(),
  batchTransfer: z.boolean().optional(),
  palletBatchTransfer: z.boolean().optional(),
  serialTransfer: z.boolean().optional(),
  isActive: z.boolean().optional(),
})
const wpUpdate = wpCreate.partial()
const wpGuard: BeforeWrite = async ({ data, companyId }) => {
  const addrId = data.addressId as number | undefined
  if (addrId != null) {
    const addr = await prisma.tBLINTEGRATIONADDRESS.findFirst({ where: { id: addrId, companyId }, select: { id: true } })
    if (!addr) return 'Geçersiz entegrasyon adresi — bu firmaya ait değil'
  }
  const convId = data.conversionId as number | null | undefined
  if (convId != null) {
    const conv = await prisma.tBLOPERATIONTYPECONVERSION.findFirst({ where: { id: convId, companyId }, select: { id: true } })
    if (!conv) return 'Geçersiz operasyon tipi dönüşümü — bu firmaya ait değil'
  }
  const facId = data.facilityId as number | null | undefined
  if (facId != null) {
    const bad = await firstBadRef(companyId, [['Tesis', 'facility', facId]])
    if (bad) return `Geçersiz ${bad} — bu firmaya ait değil`
  }
  return null
}
export const integrationWriteParamRoutes = simpleCrud(prisma.tBLINTEGRATIONWRITEPARAM as unknown as Delegate, wpCreate, wpUpdate, 'Yazma parametresi bulunamadı', 'addressId', wpGuard)

// ── XML Convert (legacy TBLSBENTEGRASYONXMLCONVERT) — gövde dönüşüm şablonları
const xmlCreate = z.object({
  name: z.string().min(1).max(100),
  xmlTemplate: z.string().max(100000).nullish(),
  xslTemplate: z.string().max(100000).nullish(),
  isActive: z.boolean().optional(),
})
export const integrationXmlConvertRoutes = simpleCrud(prisma.tBLINTEGRATIONXMLCONVERT as unknown as Delegate, xmlCreate, xmlCreate.partial(), 'XML dönüşümü bulunamadı')
