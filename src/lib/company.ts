import type { FastifyRequest } from 'fastify'

/**
 * Çok-kiracılık: companyId context. companyId JWT payload'ında taşınır.
 * Tüm /api/* (login + branding hariç) global onRequest hook'unda kimlik doğrulamasından geçer (app.ts),
 * dolayısıyla request.user GET dahil her korumalı istekte doludur:
 *  - Normal kullanıcı → kendi JWT companyId'sine KİLİTLİ (x-company-id header yok sayılır).
 *  - Super-admin → x-company-id header ile firma seçer; yoksa kendi firması/DEFAULT.
 * DEFAULT yalnız super-admin (companyId=null) header'sız durumda devreye girer; normal okuma sızıntısı kapalı.
 */
export const DEFAULT_COMPANY_ID = 1

function headerCompanyId(request: FastifyRequest): number | undefined {
  const raw = request.headers['x-company-id']
  const value = Array.isArray(raw) ? raw[0] : raw
  const n = value ? Number(value) : NaN
  return Number.isInteger(n) && n > 0 ? n : undefined
}

/**
 * Tenant çözümü:
 *  - Normal kullanıcı → JWT'deki kendi companyId'sine KİLİTLİ (header yok sayılır).
 *  - Super-admin → x-company-id header ile herhangi bir firmayı seçebilir; yoksa kendi firması/default.
 *  - Anonim (public GET) → x-company-id header ya da default firma.
 */
export function getCompanyId(request: FastifyRequest): number {
  const user = request.user as { companyId?: number | null; isSuperAdmin?: boolean; companies?: number[] } | undefined

  if (user) {
    if (user.isSuperAdmin) {
      return headerCompanyId(request) ?? (typeof user.companyId === 'number' && user.companyId > 0 ? user.companyId : DEFAULT_COMPANY_ID)
    }
    const own = typeof user.companyId === 'number' && user.companyId > 0 ? user.companyId : DEFAULT_COMPANY_ID
    // Çok-firmalı kullanıcı (COMPANY yetkisi): x-company-id header'ı İZİNLİ firmalardan biriyse ona geç; değilse kendi firması.
    const allowed = user.companies && user.companies.length ? user.companies : [own]
    const h = headerCompanyId(request)
    if (h && allowed.includes(h)) return h
    return own
  }

  return headerCompanyId(request) ?? DEFAULT_COMPANY_ID
}

/**
 * LİSTE filtreleme (GET / + id-bazlı kayıt erişimi). Super-admin önceliği:
 *  1. `?companyId=all` → TÜM firmalar (bilinçli birleşik görünüm — liste ekranındaki açık seçim)
 *  2. `?companyId=N`   → o firma (ekran içi geçici daraltma)
 *  3. `x-company-id` header → AKTİF firma (üstteki firma seçici) — kullanıcı beklentisi: seçili firma her yeri kapsar
 *  4. hiçbiri yoksa → tüm firmalar
 * Normal kullanıcı → kendi/izinli firmasına KİLİTLİ (query yok sayılır) — kiracı izolasyonu korunur.
 * Prisma where'e yayılır: `where: { ...companyListFilter(request), ...diğerFiltreler }`. Boş obje = tüm firmalar.
 */
export function companyListFilter(request: FastifyRequest): { companyId?: number } {
  const user = request.user as { companyId?: number | null; isSuperAdmin?: boolean } | undefined
  if (user?.isSuperAdmin) {
    const raw = (request.query as { companyId?: string } | undefined)?.companyId
    if (raw === 'all') return {}
    const n = raw ? Number(raw) : NaN
    if (Number.isInteger(n) && n > 0) return { companyId: n }
    // KAYIT-DÜZEYİ erişim (:id rotaları): süper aktif firmaya KİLİTLENMEZ — 'Tüm firmalar' listesinde
    // görünen satır her zaman açılabilir/düzenlenebilir; companyId=null kayıtlar (firma-bağımsız süper
    // hesaplar) da erişilebilir kalır. Header yalnız LİSTELERİ daraltır.
    if ((request.params as { id?: string } | undefined)?.id != null) return {}
    const h = headerCompanyId(request)
    return h ? { companyId: h } : {}
  }
  return { companyId: getCompanyId(request) }
}
