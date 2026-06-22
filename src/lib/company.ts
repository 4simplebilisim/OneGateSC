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
  const user = request.user as { companyId?: number | null; isSuperAdmin?: boolean } | undefined

  if (user) {
    if (user.isSuperAdmin) {
      return headerCompanyId(request) ?? (typeof user.companyId === 'number' && user.companyId > 0 ? user.companyId : DEFAULT_COMPANY_ID)
    }
    if (typeof user.companyId === 'number' && user.companyId > 0) return user.companyId
    return DEFAULT_COMPANY_ID
  }

  return headerCompanyId(request) ?? DEFAULT_COMPANY_ID
}
