// Entegrasyon Aktarım motoru (legacy SbEntegrasyonAktarim + TBLSBTRANSACTIONLOGGELEN/GIDEN).
// Manuel tetikleme: paket + işlem tipi + yön → token + uç çağrısı → sonuç TBLINTEGRATIONLOG'a yazılır.
// GELEN (IN): uçtan GET — kayıt sayısı raporlanır (alan eşleme/upsert sonraki aşama).
// GİDEN (OUT): bağlantı doğrulanır; gövde eşlemesi henüz tanımlı olmadığından kayıt GÖNDERİLMEZ → dürüstçe ERROR loglanır.
import { prisma } from './prisma.js'
import { netsisGetToken, logoGetToken, integrationRequest, type IntegrationPackageLike } from './integrations.js'

export class TransferError extends Error {}

export const TRANSFER_ENTITIES = ['MALZEME', 'CARI', 'SIPARIS', 'FATURA', 'TALEP'] as const

// Bilinen ERP uçları — legacy "Okuma Sorguları"nın REST karşılığı. Adres tanımı (addressId) bunları ezer.
const KNOWN_PATHS: Record<string, Record<string, string>> = {
  NETSIS_REST: { MALZEME: '/api/v2/Items', CARI: '/api/v2/ARPs', SIPARIS: '/api/v2/Orders', FATURA: '/api/v2/Invoices' },
  LOGO_REST: { MALZEME: '/api/v1/items', CARI: '/api/v1/arps', SIPARIS: '/api/v1/salesOrders', FATURA: '/api/v1/salesInvoices' },
}

// Yanıttaki kayıt sayısı: dizi / Netsis {Data:[...]} / Logo {items:[...]} / {data:[...]} / tek obje
function countRecords(body: unknown): number | null {
  if (Array.isArray(body)) return body.length
  if (body && typeof body === 'object') {
    const o = body as Record<string, unknown>
    for (const k of ['Data', 'items', 'data', 'Items']) if (Array.isArray(o[k])) return (o[k] as unknown[]).length
    return 1
  }
  return null
}
const clip = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1) + '…' : s)

export interface TransferInput {
  companyId: number
  packageId: number
  entityType: string
  direction: 'IN' | 'OUT'
  addressId?: number | null
  userId?: number | null
}

/** Tek aktarım denemesi çalıştırır ve log kaydını döner (her deneme = yeni satır, legacy gibi). */
export async function runTransfer(t: TransferInput) {
  const pkg = await prisma.tBLINTEGRATIONPACKAGE.findFirst({ where: { id: t.packageId, companyId: t.companyId } })
  if (!pkg) throw new TransferError('Entegrasyon paketi bulunamadı')
  if (!pkg.isActive) throw new TransferError('Paket pasif — aktarım yapılamaz')

  let address: { id: number; path: string; isActive: boolean } | null = null
  if (t.addressId != null) {
    address = await prisma.tBLINTEGRATIONADDRESS.findFirst({
      where: { id: t.addressId, companyId: t.companyId, packageId: pkg.id },
      select: { id: true, path: true, isActive: true },
    })
    if (!address) throw new TransferError('Geçersiz adres — bu pakete ait değil')
    if (!address.isActive) throw new TransferError('Adres pasif — aktarım yapılamaz')
  }
  // Path önceliği: seçili adres > aktif Okuma Sorgusu (REST uç yolu yazılmışsa) > bilinen ERP ucu.
  // Sorguya legacy SQL yazılmışsa (SELECT...) REST'te uygulanamaz — yok sayılır, bilinen uca düşülür.
  let queryPath: string | undefined
  if (!address && t.direction === 'IN') {
    const qry = await prisma.tBLINTEGRATIONQUERY.findFirst({
      where: { companyId: t.companyId, packageId: pkg.id, queryType: t.entityType, isActive: true },
      orderBy: { id: 'asc' },
      select: { query: true },
    })
    const qText = qry?.query.trim()
    if (qText && (/^https?:\/\//i.test(qText) || qText.startsWith('/'))) queryPath = qText
  }
  const path = address?.path ?? queryPath ?? KNOWN_PATHS[pkg.packageType]?.[t.entityType]
  if (!path) throw new TransferError(`${t.entityType} için bilinen uç yok — pakete adres ya da okuma sorgusu (uç yolu) tanımlayın`)

  let status: 'SUCCESS' | 'ERROR' = 'ERROR'
  let message = ''
  let payload: string | null = null
  try {
    let token: string | null = null
    if (pkg.packageType === 'NETSIS_REST') token = (await netsisGetToken(pkg as IntegrationPackageLike)).token ?? null
    else if (pkg.packageType === 'LOGO_REST') token = (await logoGetToken(pkg as IntegrationPackageLike)).token ?? null

    if (t.direction === 'IN') {
      const res = await integrationRequest(pkg as IntegrationPackageLike, token, 'GET', path)
      payload = res.body != null ? clip(JSON.stringify(res.body), 4000) : null
      if (res.status < 400) {
        const n = countRecords(res.body)
        status = 'SUCCESS'
        message = `${n ?? 'Bilinmeyen sayıda'} kayıt okundu (HTTP ${res.status}) — alan eşleme/içeri işleme sonraki aşamada`
      } else {
        message = `Uç hata döndü (HTTP ${res.status}) — ${path}`
      }
    } else {
      // Token alınabildiyse bağlantı sağlam; ama giden gövde eşlemesi yokken kayıt göndermek yanlış olur
      message = 'Bağlantı doğrulandı; giden veri eşlemesi henüz tanımlı değil — kayıt gönderilmedi'
    }
  } catch (err) {
    message = (err as Error).message
  }

  return prisma.tBLINTEGRATIONLOG.create({
    data: {
      companyId: t.companyId,
      direction: t.direction,
      entityType: t.entityType,
      status,
      referenceKey: clip(path, 100),
      message: clip(message, 500),
      packageId: pkg.id,
      addressId: address?.id ?? null,
      createdById: t.userId ?? null,
      payload,
    },
  })
}
