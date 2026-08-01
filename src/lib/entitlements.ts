import { prisma } from './prisma.js'

// Ürün erişimi = firma lisansı (aktif + tarih geçerli) ∩ kullanıcı erişim kısıtı.
// Kullanıcı için TBLUSERAPPACCESS satırı YOKSA lisanslı tüm ürünlere erişir (OneGate kısıtlama-listesi deseni).
export type AppEntitlement = {
  code: string
  name: string
  description: string | null
  path: string
  icon: string | null
  sortOrder: number
  validUntil: Date | null
}

export async function listUserApps(userId: number, companyId: number | null): Promise<AppEntitlement[]> {
  if (companyId == null) {
    // Süper-admin firmasız oturumda tüm aktif ürünleri görür (lisans firmaya bağlı)
    const apps = await prisma.tBLAPPLICATION.findMany({ where: { isActive: true }, orderBy: { sortOrder: 'asc' } })
    return apps.map((a) => ({ code: a.code, name: a.name, description: a.description, path: a.path, icon: a.icon, sortOrder: a.sortOrder, validUntil: null }))
  }

  const today = new Date()
  const licenses = await prisma.tBLCOMPANYLICENSE.findMany({
    where: {
      companyId,
      isActive: true,
      application: { isActive: true },
      AND: [
        { OR: [{ validFrom: null }, { validFrom: { lte: today } }] },
        { OR: [{ validUntil: null }, { validUntil: { gte: today } }] },
      ],
    },
    include: { application: true },
  })

  const restrictions = await prisma.tBLUSERAPPACCESS.findMany({ where: { userId }, select: { applicationId: true } })
  const allowed = restrictions.length ? new Set(restrictions.map((r) => r.applicationId)) : null

  return licenses
    .filter((l) => !allowed || allowed.has(l.applicationId))
    .map((l) => ({
      code: l.application.code,
      name: l.application.name,
      description: l.application.description,
      path: l.application.path,
      icon: l.application.icon,
      sortOrder: l.application.sortOrder,
      validUntil: l.validUntil,
    }))
    .sort((a, b) => a.sortOrder - b.sortOrder)
}

export async function hasAppAccess(userId: number, companyId: number | null, code: string): Promise<boolean> {
  const apps = await listUserApps(userId, companyId)
  return apps.some((a) => a.code === code)
}
