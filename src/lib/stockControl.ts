import { prisma } from './prisma.js'

/**
 * STOK KONTROL PARAMETRESİ — TBLSTOCKCONTROLPARAMETER motoru (öncelik ekseni).
 *
 * Parametre ekranı vardı, hiçbir kod okumuyordu. Tablonun işe yarayan çekirdeği
 * CARİ ÖNCELİĞİ: hangi müşterinin işi önce yapılacak. Toplama listesi (el
 * terminali) ve belge listesi bu sıraya göre çalışılır.
 *
 * Öncelik KÜÇÜK = ÖNCE. Tanımsız cari en sona düşer (öncelik yok = acele yok).
 */

export interface PartnerPriority {
  customerPriority: number | null
  shipmentPriority: number | null
  distributionType: number | null
}

/** Cari → öncelik haritası. Tanım yoksa boş harita (sıralama değişmez). */
export async function loadPartnerPriorities(companyId: number): Promise<Map<number, PartnerPriority>> {
  const rows = await prisma.tBLSTOCKCONTROLPARAMETER.findMany({
    where: { companyId, isActive: true, businessPartnerId: { not: null } },
    select: { businessPartnerId: true, customerPriority: true, shipmentPriority: true, distributionType: true },
    orderBy: { id: 'asc' },
  })
  const m = new Map<number, PartnerPriority>()
  for (const r of rows) {
    if (r.businessPartnerId == null) continue
    m.set(r.businessPartnerId, { customerPriority: r.customerPriority, shipmentPriority: r.shipmentPriority, distributionType: r.distributionType })
  }
  return m
}

const SON = Number.MAX_SAFE_INTEGER // tanımsız öncelik en sona

/**
 * Belgeleri çalışma sırasına diz: müşteri önceliği → sevkiyat önceliği → tarih (eski önce).
 * Harita boşsa gelen sıra korunur (davranış değişmez).
 */
export function sortByPriority<T extends { partnerId: number | null; documentDate: Date | null; id: number }>(
  docs: T[], priorities: Map<number, PartnerPriority>,
): T[] {
  if (!priorities.size) return docs
  const p = (d: T) => (d.partnerId != null ? priorities.get(d.partnerId) : undefined)
  return [...docs].sort((a, b) => {
    const pa = p(a), pb = p(b)
    const c = (pa?.customerPriority ?? SON) - (pb?.customerPriority ?? SON)
    if (c) return c
    const s = (pa?.shipmentPriority ?? SON) - (pb?.shipmentPriority ?? SON)
    if (s) return s
    const ta = a.documentDate ? a.documentDate.getTime() : 0
    const tb = b.documentDate ? b.documentDate.getTime() : 0
    return ta - tb || a.id - b.id
  })
}

/** Listede gösterilecek öncelik etiketi (yoksa null). */
export function priorityLabel(pr: PartnerPriority | undefined): string | null {
  if (!pr) return null
  const parts: string[] = []
  if (pr.customerPriority != null) parts.push(`M${pr.customerPriority}`)
  if (pr.shipmentPriority != null) parts.push(`S${pr.shipmentPriority}`)
  return parts.length ? parts.join('/') : null
}
