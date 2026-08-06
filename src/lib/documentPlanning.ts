import { Prisma } from '@prisma/client'
import { prisma } from './prisma.js'
import { copyExtraValuesOnSplit } from './extraFields.js'
import { nextSequence } from './sequence.js'
import { refreshDocStatus } from './documentStatus.js'
import { suggestPutawayLocations } from './routing.js'
import { rotationOrderBy, type Rotation } from './rotation.js'

/**
 * BELGE PLANLAMA — TBLDOCUMENTPLANNINGPARAMETER motoru.
 *
 * Parametre ekranı vardı, hiçbir kod okumuyordu: "büyük siparişi kaç parçaya
 * böl, ürün grubuna göre mi ayır, parçalar hangi durumda doğsun" tanımlanıp
 * yok sayılıyordu.
 *
 * Planlama TOPLAMADAN ÖNCE yapılır (Böl'ün tersi: Böl toplanana göre ayırır).
 * Amaç işi paylaştırmak: bir belge N parçaya ayrılır, her parça ayrı toplayıcıya
 * atanabilir. PARÇA 1 = ORİJİNAL BELGE (numarası korunur), 2..N yeni belgedir;
 * satırlar kopyalanmaz TAŞINIR — aynı miktar iki belgede çıkmaz.
 */

export class PlanningError extends Error {}

/** Cariye özel parametre öncelikli, yoksa genel (businessPartnerId null). */
export async function loadPlanningParameter(companyId: number, partnerId?: number | null) {
  const rows = await prisma.tBLDOCUMENTPLANNINGPARAMETER.findMany({
    where: {
      companyId, isActive: true,
      ...(partnerId ? { OR: [{ businessPartnerId: partnerId }, { businessPartnerId: null }] } : { businessPartnerId: null }),
    },
    orderBy: { id: 'asc' },
  })
  if (!rows.length) return null
  return rows.find((r) => r.businessPartnerId === partnerId) ?? rows.find((r) => r.businessPartnerId == null) ?? null
}

export interface PlanResult {
  parameterId: number
  /** Ayrım nasıl yapıldı */
  mode: 'PRODUCT_GROUP' | 'PART_COUNT'
  parts: Array<{ id: number; documentNo: string; lineCount: number; original: boolean }>
  /** Lokasyon ataması açıksa doldurulan satır sayısı */
  assignedLocations: number
}

/** Satırları eşit yüke böl: sırayla kovalara dağıt (round-robin). */
function roundRobin<T>(items: T[], buckets: number): T[][] {
  const out: T[][] = Array.from({ length: buckets }, () => [])
  items.forEach((it, i) => out[i % buckets]!.push(it))
  return out.filter((b) => b.length)
}

/**
 * Belgeyi parçalara ayır. Yalnız DRAFT ve HİÇ TOPLANMAMIŞ belge planlanabilir.
 * Parametre yoksa hata verir (planlama kuralsız yapılmaz).
 */
export async function planDocument(documentId: number, userId?: number): Promise<PlanResult> {
  return prisma.$transaction(async (tx) => {
    const doc = await tx.tBLDOCUMENT.findUniqueOrThrow({
      where: { id: documentId },
      include: {
        operationType: { include: { sequence: true } },
        lines: { orderBy: { lineNo: 'asc' }, include: { scopes: { select: { id: true } }, product: { select: { productGroupId: true } } } },
      },
    })
    if (doc.status !== 'DRAFT') throw new PlanningError('Yalnız bekleyen (DRAFT) belge planlanabilir')
    if (!doc.lines.length) throw new PlanningError('Belgede satır yok')
    if (doc.lines.some((l) => l.scopes.length)) {
      throw new PlanningError('Toplama başlamış — planlama toplamadan ÖNCE yapılır (toplananı ayırmak için "Böl" kullanın)')
    }

    const p = await loadPlanningParameter(doc.companyId, doc.partnerId)
    if (!p) throw new PlanningError('Belge Planlama Parametresi tanımlı değil — Uyarlamalar › Belge Planlama Parametresi')

    // Parça dağılımı: ürün grubu bazında ya da parça sayısına göre
    let gruplar: (typeof doc.lines)[]
    let mode: PlanResult['mode']
    if (p.splitByProductGroup) {
      mode = 'PRODUCT_GROUP'
      const harita = new Map<string, (typeof doc.lines)>()
      for (const l of doc.lines) {
        const k = String(l.product.productGroupId ?? 'grupsuz')
        const arr = harita.get(k) ?? []
        arr.push(l)
        harita.set(k, arr)
      }
      gruplar = [...harita.values()]
      if (gruplar.length < 2) throw new PlanningError('Satırların hepsi aynı ürün grubunda — parçalanacak bir şey yok')
    } else {
      mode = 'PART_COUNT'
      const adet = p.partCount ?? 0
      if (adet < 2) throw new PlanningError('Parça Sayısı en az 2 olmalı (ya da "Ürün Grup Bazında Parçalansın" açılmalı)')
      if (doc.lines.length < 2) throw new PlanningError('Tek satırlı belge parçalanamaz')
      gruplar = roundRobin(doc.lines, Math.min(adet, doc.lines.length))
    }

    // Parçaların operasyonu: planlama operasyonu tanımlıysa o, değilse belgenin operasyonu
    let parcaOp = doc.operationType
    if (p.planningOperationTypeId && p.planningOperationTypeId !== doc.operationTypeId) {
      const op = await tx.tBLOPERATIONTYPE.findFirst({
        where: { id: p.planningOperationTypeId, companyId: doc.companyId }, include: { sequence: true },
      })
      if (!op) throw new PlanningError('Planlama operasyonu bulunamadı')
      if (op.direction !== doc.operationType.direction) {
        throw new PlanningError(`Planlama operasyonu yönü belgeyle uyuşmuyor (${op.direction} ≠ ${doc.operationType.direction})`)
      }
      parcaOp = op
    }

    const parts: PlanResult['parts'] = []

    // PARÇA 1 → orijinal belge (satırları yerinde kalır, numarası korunur)
    const ilk = gruplar[0]!
    parts.push({ id: doc.id, documentNo: doc.documentNo, lineCount: ilk.length, original: true })
    const disari = doc.lines.filter((l) => !ilk.some((x) => x.id === l.id))

    // PARÇA 2..N → yeni belgeler, satırlar TAŞINIR
    for (let i = 1; i < gruplar.length; i++) {
      const kume = gruplar[i]!
      const no = parcaOp.sequence
        ? (await nextSequence(doc.companyId, parcaOp.sequence.code, tx)).formatted
        : `${doc.documentNo}-P${i + 1}`
      const yeni = await tx.tBLDOCUMENT.create({
        data: {
          companyId: doc.companyId, documentNo: no, operationTypeId: parcaOp.id, warehouseId: doc.warehouseId,
          partnerId: doc.partnerId, reasonId: doc.reasonId, createdById: userId ?? doc.createdById,
          documentStatusId: p.plannedDocStatusId ?? doc.documentStatusId,
          referenceDocumentId: doc.id,
          documentDate: doc.documentDate,
          note: doc.note ? `${doc.note} · plan ${i + 1}/${gruplar.length} ← ${doc.documentNo}` : `Plan ${i + 1}/${gruplar.length} ← ${doc.documentNo}`,
        },
      })
      let sira = 0
      for (const l of kume) {
        sira++
        await tx.tBLDOCUMENTLINE.update({ where: { id: l.id }, data: { documentId: yeni.id, lineNo: sira } })
      }
      await copyExtraValuesOnSplit(doc.companyId, 'DOC_HEADER', doc.id, yeni.id, tx)
      parts.push({ id: yeni.id, documentNo: no, lineCount: kume.length, original: false })
    }

    // Orijinalde kalan satırların sırasını yenile
    let sira = 0
    for (const l of ilk) {
      sira++
      if (l.lineNo !== sira) await tx.tBLDOCUMENTLINE.update({ where: { id: l.id }, data: { lineNo: sira } })
    }
    if (p.plannedDocStatusId && p.plannedDocStatusId !== doc.documentStatusId) {
      await tx.tBLDOCUMENT.update({ where: { id: doc.id }, data: { documentStatusId: p.plannedDocStatusId } })
    }

    // LOKASYON ATAMA — parçalar toplayıcıya gitmeden önce kaynak/hedef doldurulur
    let assigned = 0
    if (p.locationAssign) {
      const cikis = doc.operationType.direction === 'OUTBOUND'
      const rotation = (doc.operationType.stockRotation ?? 'NONE') as Rotation
      for (const l of [...ilk, ...disari]) {
        if (cikis) {
          if (l.sourceLocationId) continue
          const s = await tx.tBLSTOCK.findFirst({
            where: { companyId: doc.companyId, productId: l.productId, mainQty: { gt: 0 } },
            orderBy: rotationOrderBy(rotation),
          })
          if (s && new Prisma.Decimal(s.mainQty).sub(s.reservedQty).gt(0)) {
            await tx.tBLDOCUMENTLINE.update({ where: { id: l.id }, data: { sourceLocationId: s.locationId } })
            assigned++
          }
        } else {
          if (l.targetLocationId) continue
          const sugg = await suggestPutawayLocations(doc.companyId, l.productId, { operationTypeId: doc.operationTypeId, facilityId: null })
          if (sugg[0]) {
            await tx.tBLDOCUMENTLINE.update({ where: { id: l.id }, data: { targetLocationId: sugg[0].id } })
            assigned++
          }
        }
      }
    }

    for (const part of parts) await refreshDocStatus(tx, part.id, { source: 'PLANNING', userId })
    return { parameterId: p.id, mode, parts, assignedLocations: assigned }
  }, { timeout: 30000 })
}
