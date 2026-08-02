import { prisma } from './prisma.js'

// Ürün kartındaki "Kullanım Alanı": ürün hangi platformlarda kullanılabilir?
// Depoda TBLPRODUCTAPPLICATION satırları tutulur; KISITLAMA listesidir:
//   satır YOK   → her platformda kullanılır ("BOTH")
//   satır VAR   → yalnız o platformlarda
// Yeni bir ürün (Finans, Satış…) eklendiğinde enum değiştirmek gerekmez.
export type ProductScope = 'BOTH' | 'WMS' | 'PROC'

export const SCOPE_CODES: Record<Exclude<ProductScope, 'BOTH'>, string> = { WMS: 'WMS', PROC: 'PROC' }

/** Satırlardan tek alanlık kullanım değerini türetir (form/liste bunu görür). */
export function scopeFromCodes(codes: string[]): ProductScope {
  const set = new Set(codes)
  if (set.size === 0 || (set.has('WMS') && set.has('PROC'))) return 'BOTH'
  if (set.has('PROC')) return 'PROC'
  if (set.has('WMS')) return 'WMS'
  return 'BOTH'
}

/** Ürünün kullanım alanını yazar. BOTH → kısıt yok (satırlar silinir). */
export async function setProductScope(productId: number, companyId: number, scope: ProductScope): Promise<void> {
  const apps = await prisma.tBLAPPLICATION.findMany({ where: { isActive: true }, select: { id: true, code: true } })
  const wanted = scope === 'BOTH' ? [] : apps.filter((a) => a.code === SCOPE_CODES[scope]).map((a) => a.id)
  await prisma.$transaction(async (tx) => {
    await tx.tBLPRODUCTAPPLICATION.deleteMany({ where: { productId } })
    if (wanted.length) {
      await tx.tBLPRODUCTAPPLICATION.createMany({ data: wanted.map((applicationId) => ({ productId, applicationId, companyId })) })
    }
  })
}

/** Liste yanıtlarına tek sorguda kullanım alanı ekler (N+1 olmadan). */
export async function attachScopes<T extends { id: number }>(products: T[]): Promise<(T & { usageScope: ProductScope })[]> {
  if (!products.length) return []
  const rows = await prisma.tBLPRODUCTAPPLICATION.findMany({
    where: { productId: { in: products.map((p) => p.id) } },
    select: { productId: true, application: { select: { code: true } } },
  })
  const byProduct = new Map<number, string[]>()
  for (const r of rows) {
    const list = byProduct.get(r.productId) ?? []
    list.push(r.application.code)
    byProduct.set(r.productId, list)
  }
  return products.map((p) => ({ ...p, usageScope: scopeFromCodes(byProduct.get(p.id) ?? []) }))
}

/**
 * Belirli bir platformda kullanılabilir ürünleri süzen Prisma koşulu.
 * "Kısıt yok" (hiç satır yok) VEYA "bu platform için satır var".
 */
export function usableInAppFilter(code: string) {
  return {
    OR: [
      { applications: { none: {} } },
      { applications: { some: { application: { code } } } },
    ],
  }
}
