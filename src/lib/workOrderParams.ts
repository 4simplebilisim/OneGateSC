import type { WorkOrderType } from '@prisma/client'
import { prisma } from './prisma.js'

/**
 * İŞ EMRİ PARAMETRELERİ — TBLWORKORDERGENERALPARAMETER + TBLWORKORDERREFERENCEOPERATION motoru.
 *
 * İki ekran da veri topluyordu, hiçbir kod okumuyordu. İkisi de gerçek bir
 * boşluğu kapatıyor: iş emri tamamlanınca doğan stok hareketi belgesi,
 * "alfabetik ilk INTERNAL operasyon" ile açılıyordu — hangi operasyonla
 * hareket üretileceği tanımlanabilir olmalıydı.
 */

/** Referans operasyon tablosunda kategori = iş emri türü. */
export const WO_CATEGORY: Record<WorkOrderType, number> = {
  PICK: 1, PUTAWAY: 2, COUNT: 3, TRANSFER: 4, REPLENISH: 5,
}
export const WO_CATEGORY_LABEL: Record<number, string> = {
  1: 'Toplama', 2: 'Yerleştirme', 3: 'Sayım', 4: 'Transfer', 5: 'Raf Besleme',
}

/** Cariye özel öncelikli, yoksa genel (businessPartnerId null). */
export async function loadWorkOrderParameter(companyId: number, partnerId?: number | null) {
  const rows = await prisma.tBLWORKORDERGENERALPARAMETER.findMany({
    where: {
      companyId, isActive: true,
      ...(partnerId ? { OR: [{ businessPartnerId: partnerId }, { businessPartnerId: null }] } : { businessPartnerId: null }),
    },
    orderBy: { id: 'asc' },
  })
  if (!rows.length) return null
  return rows.find((r) => r.businessPartnerId === partnerId) ?? rows.find((r) => r.businessPartnerId == null) ?? null
}

/** Alarm süresi milisaniye — tanımsızsa null (alarm üretilmez). 1=Dakika 2=Saat 3=Gün. */
export function workOrderAlarmMs(param: { alarmDuration: number | null; alarmUnit: number | null } | null): number | null {
  if (!param?.alarmDuration || param.alarmDuration <= 0) return null
  const carpan = param.alarmUnit === 1 ? 60_000 : param.alarmUnit === 3 ? 86_400_000 : 3_600_000 // varsayılan saat
  return param.alarmDuration * carpan
}

/**
 * İş emrinin stok hareketini hangi operasyon üretecek?
 *   1) İş Emri Referans Operasyon (tür + cari eşleşmesi)
 *   2) Raf besleme türünde → Genel Parametre "Raf Geri Besleme Operasyonu"
 *   3) Tanım yoksa alfabetik ilk INTERNAL (eski davranış — geriye dönük uyum)
 * Döner: { operationTypeId, source } — kaynak loglanabilsin diye.
 */
export async function resolveWorkOrderOperation(
  companyId: number, wo: { type: WorkOrderType; businessPartnerId?: number | null },
): Promise<{ operationTypeId: number; source: 'REFERENCE' | 'PARAMETER' | 'FALLBACK' } | null> {
  const kategori = WO_CATEGORY[wo.type]
  const partnerId = wo.businessPartnerId ?? null
  const refs = await prisma.tBLWORKORDERREFERENCEOPERATION.findMany({
    where: {
      companyId, isActive: true, category: kategori,
      ...(partnerId ? { OR: [{ businessPartnerId: partnerId }, { businessPartnerId: null }] } : { businessPartnerId: null }),
    },
    orderBy: { id: 'asc' },
  })
  const ref = refs.find((r) => r.businessPartnerId === partnerId) ?? refs.find((r) => r.businessPartnerId == null)
  if (ref) return { operationTypeId: ref.operationTypeId, source: 'REFERENCE' }

  if (wo.type === 'REPLENISH' || wo.type === 'PUTAWAY') {
    const p = await loadWorkOrderParameter(companyId, partnerId)
    if (p?.rackFeedbackOpId) return { operationTypeId: p.rackFeedbackOpId, source: 'PARAMETER' }
  }

  const op = await prisma.tBLOPERATIONTYPE.findFirst({
    where: { companyId, direction: 'INTERNAL' }, orderBy: { code: 'asc' }, select: { id: true },
  })
  return op ? { operationTypeId: op.id, source: 'FALLBACK' } : null
}
