import type { FastifyRequest } from 'fastify'
import { prisma } from './prisma.js'

/**
 * Kullanıcı yetki enforcement: bir kullanıcı yalnız yetkili olduğu tesis/depo/operasyon tipini kullanabilir.
 * Model = kısıtlama-listesi: bir scope tipinde HİÇ kayıt yoksa o boyut serbest; kayıt varsa yalnız listedekiler.
 * super-admin tüm erişime sahiptir (bypass). request.user yoksa (teorik) bypass.
 */
export class AuthorizationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'AuthorizationError'
  }
}

type CheckScopes = { warehouseId?: number | null; facilityId?: number | null; operationTypeId?: number | null }

/** Kullanıcının izinli operasyon-tipi id'leri. null = kısıt yok (tümü serbest). Süper-admin → null. */
export async function allowedOperationTypeIds(userId: number | undefined, isSuperAdmin?: boolean): Promise<Set<number> | null> {
  if (isSuperAdmin || !userId) return null
  const groups = await prisma.tBLUSERGROUPMEMBER.findMany({ where: { userId }, select: { groupId: true } })
  const groupIds = groups.map((g) => g.groupId)
  const auths = await prisma.tBLUSERAUTHORIZATION.findMany({
    where: { isActive: true, scopeType: 'OPERATION_TYPE', OR: [{ userId }, ...(groupIds.length ? [{ groupId: { in: groupIds } }] : [])] },
    select: { referenceId: true },
  })
  return auths.length === 0 ? null : new Set(auths.map((a) => a.referenceId).filter((x): x is number => x != null)) // hiç OP kaydı yok → kısıtsız
}

/** Kullanıcının üyesi olduğu grup id'leri (İş Atama görünürlüğü için). */
export async function userGroupIds(userId: number): Promise<number[]> {
  const rows = await prisma.tBLUSERGROUPMEMBER.findMany({ where: { userId }, select: { groupId: true } })
  return rows.map((r) => r.groupId)
}

export async function assertUserAuthorized(request: FastifyRequest, scopes: CheckScopes): Promise<void> {
  const user = request.user as { sub?: number; isSuperAdmin?: boolean } | undefined
  if (!user || user.isSuperAdmin) return
  const userId = user.sub
  if (!userId) return

  // Kullanıcının doğrudan yetkileri + üyesi olduğu grupların yetkileri (birleşik)
  const groups = await prisma.tBLUSERGROUPMEMBER.findMany({ where: { userId }, select: { groupId: true } })
  const groupIds = groups.map((g) => g.groupId)
  const auths = await prisma.tBLUSERAUTHORIZATION.findMany({
    where: { isActive: true, OR: [{ userId }, ...(groupIds.length ? [{ groupId: { in: groupIds } }] : [])] },
    select: { scopeType: true, referenceId: true },
  })
  if (auths.length === 0) return // hiç yetki kaydı yok → kısıtsız

  const allowedOf = (type: 'FACILITY' | 'WAREHOUSE' | 'OPERATION_TYPE') =>
    auths.filter((a) => a.scopeType === type).map((a) => a.referenceId)

  const whAllowed = allowedOf('WAREHOUSE')
  if (scopes.warehouseId != null && whAllowed.length > 0 && !whAllowed.includes(scopes.warehouseId)) {
    throw new AuthorizationError('Bu depo için yetkiniz yok')
  }

  const opAllowed = allowedOf('OPERATION_TYPE')
  if (scopes.operationTypeId != null && opAllowed.length > 0 && !opAllowed.includes(scopes.operationTypeId)) {
    throw new AuthorizationError('Bu operasyon tipi için yetkiniz yok')
  }

  // Tesis: doğrudan verilirse (belge = operationType.facilityId) onu, yoksa deponun tesisinden türet
  const facAllowed = allowedOf('FACILITY')
  if (facAllowed.length > 0) {
    let facilityId = scopes.facilityId ?? null
    if (facilityId == null && scopes.warehouseId != null) {
      const wh = await prisma.tBLWAREHOUSE.findUnique({ where: { id: scopes.warehouseId }, select: { facilityId: true } })
      facilityId = wh?.facilityId ?? null
    }
    if (facilityId != null && !facAllowed.includes(facilityId)) {
      throw new AuthorizationError('Bu tesis için yetkiniz yok')
    }
  }
}
