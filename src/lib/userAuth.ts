import type { FastifyRequest } from 'fastify'
import { prisma } from './prisma.js'

/**
 * Kullanıcı yetki enforcement — ETKİN YETKİ = grant − yasak, KULLANICI > GRUP.
 * Grup GENELLEME (baseline grant'lar); kullanıcı seviyesinde ekleme (grant) ya da KALDIRMA (deny) ile override.
 * Model: allGrants = kullanıcı+grup grant kayıtları; effective = allGrants − kullanıcı DENY kayıtları.
 *   Bir scope'ta HİÇ grant yoksa → o boyut SERBEST (kısıtsız). super-admin tümünü bypass eder.
 */
export class AuthorizationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'AuthorizationError'
  }
}

type CheckScopes = { warehouseId?: number | null; facilityId?: number | null; operationTypeId?: number | null }
type EntityScope = 'COMPANY' | 'FACILITY' | 'WAREHOUSE' | 'OPERATION_TYPE'

/** Kullanıcının TÜM entity yetkilerini bir kerede çeker → scope başına ETKİN izinli id kümesi (grant − kullanıcı yasak).
 *  Değer null = o scope'ta grant yok → kısıtsız. Bir kez sorgu; helper'lar bunu paylaşır. */
export async function getEffectiveAuthMap(userId: number): Promise<Record<EntityScope, Set<number> | null>> {
  const groups = await prisma.tBLUSERGROUPMEMBER.findMany({ where: { userId }, select: { groupId: true } })
  const groupIds = groups.map((g) => g.groupId)
  const rows = await prisma.tBLUSERAUTHORIZATION.findMany({
    where: { isActive: true, scopeType: { in: ['COMPANY', 'FACILITY', 'WAREHOUSE', 'OPERATION_TYPE'] }, OR: [{ userId }, ...(groupIds.length ? [{ groupId: { in: groupIds } }] : [])] },
    select: { scopeType: true, referenceId: true, deny: true, userId: true },
  })
  const grants: Record<EntityScope, Set<number>> = { COMPANY: new Set(), FACILITY: new Set(), WAREHOUSE: new Set(), OPERATION_TYPE: new Set() }
  const userDenies: Record<EntityScope, Set<number>> = { COMPANY: new Set(), FACILITY: new Set(), WAREHOUSE: new Set(), OPERATION_TYPE: new Set() }
  for (const r of rows) {
    if (r.referenceId == null) continue
    const st = r.scopeType as EntityScope
    if (r.deny) { if (r.userId != null) userDenies[st].add(r.referenceId) } // yasak yalnız KULLANICI seviyesinde (grubu override eder)
    else grants[st].add(r.referenceId)
  }
  const out = {} as Record<EntityScope, Set<number> | null>
  for (const st of ['COMPANY', 'FACILITY', 'WAREHOUSE', 'OPERATION_TYPE'] as EntityScope[]) {
    if (grants[st].size === 0) { out[st] = null; continue } // hiç grant yok → kısıtsız (yasaklar tek başına kısıtlamaz)
    for (const d of userDenies[st]) grants[st].delete(d) // kullanıcı yasağı grubun grant'ını kaldırır
    out[st] = grants[st]
  }
  return out
}

/** Kullanıcının izinli operasyon-tipi id'leri. null = kısıt yok. Süper-admin → null (tüm firmalarda god-mode). */
export async function allowedOperationTypeIds(userId: number | undefined, isSuperAdmin?: boolean): Promise<Set<number> | null> {
  if (isSuperAdmin || !userId) return null
  return (await getEffectiveAuthMap(userId)).OPERATION_TYPE
}

/** Kullanıcının üyesi olduğu grup id'leri (İş Atama görünürlüğü için). */
export async function userGroupIds(userId: number): Promise<number[]> {
  const rows = await prisma.tBLUSERGROUPMEMBER.findMany({ where: { userId }, select: { groupId: true } })
  return rows.map((r) => r.groupId)
}

/** Kullanıcının erişebileceği firma id'leri (kendi firması HER ZAMAN + etkin COMPANY yetkileri). Login'de JWT'ye gömülür. */
export async function getUserCompanies(userId: number, ownCompanyId: number | null): Promise<number[]> {
  const eff = (await getEffectiveAuthMap(userId)).COMPANY
  const set = new Set<number>()
  if (ownCompanyId != null) set.add(ownCompanyId)
  if (eff) for (const id of eff) set.add(id)
  return [...set]
}

export async function assertUserAuthorized(request: FastifyRequest, scopes: CheckScopes): Promise<void> {
  const user = request.user as { sub?: number; isSuperAdmin?: boolean } | undefined
  if (!user || user.isSuperAdmin) return // süper-admin → tüm firmalarda yetki bypass (firma-bağımsız god-mode)
  const userId = user.sub
  if (!userId) return

  const eff = await getEffectiveAuthMap(userId)

  if (scopes.warehouseId != null && eff.WAREHOUSE && !eff.WAREHOUSE.has(scopes.warehouseId)) {
    throw new AuthorizationError('Bu depo için yetkiniz yok')
  }
  if (scopes.operationTypeId != null && eff.OPERATION_TYPE && !eff.OPERATION_TYPE.has(scopes.operationTypeId)) {
    throw new AuthorizationError('Bu operasyon tipi için yetkiniz yok')
  }
  // Tesis: doğrudan verilirse (belge = operationType.facilityId) onu, yoksa deponun tesisinden türet
  if (eff.FACILITY) {
    let facilityId = scopes.facilityId ?? null
    if (facilityId == null && scopes.warehouseId != null) {
      const wh = await prisma.tBLWAREHOUSE.findUnique({ where: { id: scopes.warehouseId }, select: { facilityId: true } })
      facilityId = wh?.facilityId ?? null
    }
    if (facilityId != null && !eff.FACILITY.has(facilityId)) {
      throw new AuthorizationError('Bu tesis için yetkiniz yok')
    }
  }
}

/** Belge üzerinden yetki: belgenin operasyonu + tesisi + deposu kullanıcının kısıt listesine uymalı (yaşam döngüsü uçları). */
export async function assertDocumentAuthorized(request: FastifyRequest, documentId: number): Promise<void> {
  const user = request.user as { isSuperAdmin?: boolean } | undefined
  if (!user || user.isSuperAdmin) return
  const doc = await prisma.tBLDOCUMENT.findUnique({
    where: { id: documentId },
    select: { warehouseId: true, operationTypeId: true, operationType: { select: { facilityId: true } } },
  })
  if (!doc) return // uç zaten 404 verir — yetki katmanı varlık sızdırmaz
  await assertUserAuthorized(request, { warehouseId: doc.warehouseId, facilityId: doc.operationType?.facilityId ?? null, operationTypeId: doc.operationTypeId })
}

/** Lokasyon üzerinden yetki: lokasyonun deposu (ve tesisi) kullanıcının kısıt listesine uymalı (stok uçları). */
export async function assertLocationAuthorized(request: FastifyRequest, locationId: number | null | undefined): Promise<void> {
  const user = request.user as { isSuperAdmin?: boolean } | undefined
  if (!user || user.isSuperAdmin || locationId == null) return
  const loc = await prisma.tBLLOCATION.findUnique({ where: { id: locationId }, select: { warehouseId: true, facilityId: true } })
  if (!loc) return
  await assertUserAuthorized(request, { warehouseId: loc.warehouseId, facilityId: loc.facilityId })
}
