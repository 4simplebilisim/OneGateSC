// ERP entegrasyon istemcileri (altyapı katmanı) — Netsis NetOpenX REST + Logo Objects REST + düz REST.
// Kaynaklar: docs.logo.com.tr › NetOpenX Rest (OAuth2 /api/v2/token: BranchCode/NetsisUser/NetsisPassword/DbType/DbName/DbUser/DbPassword)
//            docs.logo.com.tr › Logo Objects REST Servis (ClientId/ClientSecret Basic → Bearer; firmNr/periodNr)
// Bu katman: token alma + istek yardımcıları + bağlantı testi. Veri eşleme/gönderim akışları adres tetikleri üzerinden ayrıca kurulur.

export interface IntegrationPackageLike {
  packageType: 'GENERIC_REST' | 'NETSIS_REST' | 'LOGO_REST'
  baseUrl: string | null
  username: string | null
  password: string | null
  clientId: string | null
  clientSecret: string | null
  dbType: string | null
  dbName: string | null
  dbUser: string | null
  dbPassword: string | null
  branchCode: string | null
  firmNr: string | null
  periodNr: string | null
}

export interface ConnectionTestResult {
  ok: boolean
  status?: number
  message: string // şifre/secret ASLA içermez
  tokenReceived?: boolean
}

const TIMEOUT_MS = 8000
async function timedFetch(url: string, init: RequestInit): Promise<Response> {
  const ctl = new AbortController()
  const t = setTimeout(() => ctl.abort(), TIMEOUT_MS)
  try { return await fetch(url, { ...init, signal: ctl.signal }) } finally { clearTimeout(t) }
}
const trimBase = (u: string) => u.replace(/\/+$/, '')

/** Netsis NetOpenX REST: OAuth2 password grant → access_token (8 saat). baseUrl örn. http://sunucu:9090 veya .../api/v2 kökü. */
export async function netsisGetToken(p: IntegrationPackageLike): Promise<{ token?: string; raw?: unknown }> {
  if (!p.baseUrl) throw new Error('Sunucu adresi (baseUrl) boş')
  const base = trimBase(p.baseUrl)
  const tokenUrl = base.endsWith('/api/v2') ? `${base}/token` : `${base}/api/v2/token`
  const form = new URLSearchParams({
    grant_type: 'password',
    branchcode: p.branchCode ?? '0',
    password: p.password ?? '',
    username: p.username ?? '',
    dbtype: p.dbType ?? 'vtMSSQL',
    dbname: p.dbName ?? '',
    dbuser: p.dbUser ?? '',
    dbpassword: p.dbPassword ?? '',
  })
  const res = await timedFetch(tokenUrl, { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: form.toString() })
  const body = (await res.json().catch(() => null)) as { access_token?: string; error_description?: string; error?: string } | null
  if (!res.ok || !body?.access_token) {
    throw new Error(`Netsis token alınamadı (HTTP ${res.status}): ${body?.error_description ?? body?.error ?? 'yanıt çözülemedi'}`)
  }
  return { token: body.access_token, raw: body }
}

/** Logo Objects REST: Basic(ClientId:ClientSecret) + kullanıcı/şifre + firmno → Bearer token. baseUrl örn. http://sunucu:32001 (Logo REST kökü). */
export async function logoGetToken(p: IntegrationPackageLike): Promise<{ token?: string; raw?: unknown }> {
  if (!p.baseUrl) throw new Error('Sunucu adresi (baseUrl) boş')
  const base = trimBase(p.baseUrl)
  const tokenUrl = base.includes('/api/') ? `${base}/token` : `${base}/api/v1/token`
  const basic = Buffer.from(`${p.clientId ?? ''}:${p.clientSecret ?? ''}`).toString('base64')
  const form = new URLSearchParams({
    grant_type: 'password',
    username: p.username ?? '',
    password: p.password ?? '',
    firmno: p.firmNr ?? '',
  })
  const res = await timedFetch(tokenUrl, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded', authorization: `Basic ${basic}` },
    body: form.toString(),
  })
  const body = (await res.json().catch(() => null)) as { access_token?: string; error_description?: string; error?: string } | null
  if (!res.ok || !body?.access_token) {
    throw new Error(`Logo token alınamadı (HTTP ${res.status}): ${body?.error_description ?? body?.error ?? 'yanıt çözülemedi'}`)
  }
  return { token: body.access_token, raw: body }
}

/** Token'lı istek yardımcısı — gönderim akışları bunu kullanır (path adres tanımından gelir). */
export async function integrationRequest(p: IntegrationPackageLike, token: string, method: string, path: string, payload?: unknown): Promise<{ status: number; body: unknown }> {
  if (!p.baseUrl) throw new Error('Sunucu adresi (baseUrl) boş')
  const url = /^https?:\/\//i.test(path) ? path : `${trimBase(p.baseUrl)}${path.startsWith('/') ? '' : '/'}${path}`
  const res = await timedFetch(url, {
    method,
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    ...(payload !== undefined ? { body: JSON.stringify(payload) } : {}),
  })
  const body = await res.json().catch(() => null)
  return { status: res.status, body }
}

/** Bağlantı testi (paket ekranındaki buton): tipe göre token dener; GENERIC yalnız erişilebilirlik. */
export async function testConnection(p: IntegrationPackageLike): Promise<ConnectionTestResult> {
  try {
    if (p.packageType === 'NETSIS_REST') {
      await netsisGetToken(p)
      return { ok: true, message: 'Netsis bağlantısı başarılı — token alındı', tokenReceived: true }
    }
    if (p.packageType === 'LOGO_REST') {
      await logoGetToken(p)
      return { ok: true, message: 'Logo bağlantısı başarılı — token alındı', tokenReceived: true }
    }
    if (!p.baseUrl) return { ok: false, message: 'Sunucu adresi (baseUrl) boş' }
    const res = await timedFetch(trimBase(p.baseUrl), { method: 'GET' })
    return { ok: res.status < 500, status: res.status, message: `Sunucuya erişildi (HTTP ${res.status})` }
  } catch (err) {
    const e = err as Error & { cause?: { code?: string } }
    const code = e.cause?.code
    if (e.name === 'AbortError') return { ok: false, message: `Zaman aşımı (${TIMEOUT_MS / 1000} sn) — sunucuya erişilemiyor` }
    if (code === 'ECONNREFUSED') return { ok: false, message: 'Bağlantı reddedildi — adres/port kapalı veya servis çalışmıyor' }
    if (code === 'ENOTFOUND') return { ok: false, message: 'Sunucu adı çözülemedi — adresi kontrol edin' }
    return { ok: false, message: e.message }
  }
}
