import { prisma } from './prisma.js'
import type { Prisma } from '@prisma/client'

export type DocStatusCode = 'BKL' | 'TPL' | 'OBK' | 'ONY' | 'IPT'

/** Belge Durumu kodunu (BKL/TPL/OBK/ONY/IPT) firma bazında id'ye çözer. Tanımlı değilse null. */
export async function docStatusId(companyId: number, code: string, client: Prisma.TransactionClient = prisma): Promise<number | null> {
  const row = await client.tBLDOCUMENTSTATUS.findFirst({ where: { companyId, code }, select: { id: true } })
  return row?.id ?? null
}

// Belge yaşam döngüsü kodları
export const DOC_STATUS = { WAITING: 'BKL', PICKING: 'TPL', PENDING_APPROVAL: 'OBK', APPROVED: 'ONY', CANCELLED: 'IPT' } as const

// ───────────────────────────────────────────────────────────────────────────
// Faz 1 — Belge Durumu TÜRETME MOTORU (tek doğru kaynağı)
// StokBar'ın iki SP'sini (SSP_SBKONTROLLUBELGEDURUM kontrollü + SSP_SBKONTROLSUZBELGEDURUM
// kontrolsüz) + bizim iç-statü kapılarımızı TEK SAF fonksiyonda birleştirir. SQL SP yerine
// test edilebilir TS; dağınık imperatif set'ler yerine tek refreshDocStatus çağrısı.
// ───────────────────────────────────────────────────────────────────────────

export type DocFacts = {
  cancelled: boolean // iç status CANCELLED
  completed: boolean // iç status COMPLETED (= onaylandı / stok işlendi)
  confirmed: boolean // iç status CONFIRMED (= onaya gönderildi, kapı)
  controlCollection: boolean // operasyonun onay tipi: toplama kontrolü (TBLDOCUMENTAPPROVALTYPE)
  collectedSum: number // Σ collectedQty — legacy DBLTOPLANANMIKTAR
  shortLines: number // quantity > collectedQty olan (eksik toplanmış) satır sayısı — legacy DBLANAMIKTAR>DBLTOPLANANMIKTAR
}

/**
 * Belge durumunu gerçeklerden türet (SAF, DB'siz, test edilebilir).
 * Öncelik sırası: iptal → onaylı → onaya gönderildi (kapı) → DRAFT'ta toplama ilerlemesi.
 * DRAFT türetimi StokBar'la birebir: hiç toplanmadı=BKL, kontrollü&eksik=TPL, kontrollü&tam=OBK, kontrolsüz=TPL.
 */
export function computeDocStatus(f: DocFacts): DocStatusCode {
  if (f.cancelled) return 'IPT' // iptal
  if (f.completed) return 'ONY' // tamamlandı = onaylandı
  if (f.confirmed) return 'OBK' // onaya gönderildi (iç kapı)
  // DRAFT — toplama ilerlemesine göre (StokBar SP türetimi):
  if (f.collectedSum <= 0) return 'BKL' // hiç toplanmadı → bekliyor
  if (f.controlCollection && f.shortLines > 0) return 'TPL' // kontrollü + kısmi → toplanıyor
  if (f.controlCollection) return 'OBK' // kontrollü + tam (eksik yok) → onay bekliyor
  return 'TPL' // kontrolsüz + toplanmış → toplanıyor
}

// ───────────────────────────────────────────────────────────────────────────
// Faz 2 — VERİ-GÜDÜMLÜ KRİTER (Belge Durum Kriter)
// "Belge Durum Kriter" satırları operasyon (+ opsiyonel cari) bazında KOŞUL → hedef durum eşler.
// Sabit, güvenli koşul kümesi (serbest SQL/expression YOK). Eşleşme yoksa computeDocStatus'a düşülür.
// StokBar SP-fork'unun yerine firma/operasyon bazında veri ile yapılandırılır (multi-tenant, kod değişikliği yok).
// ───────────────────────────────────────────────────────────────────────────

export type DocCondition = 'CANCELLED' | 'COMPLETED' | 'CONFIRMED' | 'NONE_COLLECTED' | 'PARTIAL' | 'FULLY_COLLECTED' | 'ANY_COLLECTED'
export const DOC_CONDITIONS: DocCondition[] = ['CANCELLED', 'COMPLETED', 'CONFIRMED', 'NONE_COLLECTED', 'PARTIAL', 'FULLY_COLLECTED', 'ANY_COLLECTED']

// Toplama koşulları (NONE/PARTIAL/FULLY/ANY) YALNIZ DRAFT fazında geçerli: iptal/tamamlandı/onaya-gönderildi
// belgede (collected=0 olsa bile) EŞLEŞMEZ — ki kapı (completed→ONY, cancelled→IPT, confirmed→OBK) baskın kalsın.
// Kapı koşulları (CANCELLED/COMPLETED/CONFIRMED) her zaman geçerli (gate-bazlı override hâlâ mümkün).
const inDraft = (f: DocFacts) => !f.cancelled && !f.completed && !f.confirmed
const CONDITION_PREDICATES: Record<DocCondition, (f: DocFacts) => boolean> = {
  CANCELLED: (f) => f.cancelled,
  COMPLETED: (f) => f.completed,
  CONFIRMED: (f) => f.confirmed,
  NONE_COLLECTED: (f) => inDraft(f) && f.collectedSum <= 0,
  PARTIAL: (f) => inDraft(f) && f.collectedSum > 0 && f.shortLines > 0,
  FULLY_COLLECTED: (f) => inDraft(f) && f.collectedSum > 0 && f.shortLines === 0,
  ANY_COLLECTED: (f) => inDraft(f) && f.collectedSum > 0,
}

export type StatusCriterion = { condition: string; targetStatusId: number; priority: number }

/**
 * Kriter satırlarını öncelik (priority artan) sırasıyla değerlendir; ilk eşleşen koşulun hedef statü id'sini döndür.
 * Eşleşme yoksa null → çağıran yerleşik computeDocStatus'a düşer. SAF, DB'siz, test edilebilir.
 */
export function evalCriteria(facts: DocFacts, criteria: StatusCriterion[]): number | null {
  for (const c of [...criteria].sort((a, b) => a.priority - b.priority)) {
    const pred = CONDITION_PREDICATES[c.condition as DocCondition]
    if (pred && pred(facts)) return c.targetStatusId
  }
  return null
}

/** Belgenin gerçeklerini topla (status + satır toplama + operasyon toplama-kontrolü). Belge yoksa null. */
export async function gatherDocFacts(client: Prisma.TransactionClient, documentId: number): Promise<{ companyId: number; operationTypeId: number; partnerId: number | null; currentStatusId: number | null; currentCode: string | null; facts: DocFacts } | null> {
  const doc = await client.tBLDOCUMENT.findUnique({
    where: { id: documentId },
    select: { companyId: true, status: true, operationTypeId: true, partnerId: true, documentStatusId: true, documentStatus: { select: { code: true } }, lines: { select: { quantity: true, collectedQty: true } } },
  })
  if (!doc) return null
  const appr = await client.tBLDOCUMENTAPPROVALTYPE.findFirst({
    where: { companyId: doc.companyId, operationTypeId: doc.operationTypeId, isActive: true },
    select: { controlCollection: true },
  })
  let collectedSum = 0
  let shortLines = 0
  for (const l of doc.lines) {
    const col = l.collectedQty ? Number(l.collectedQty) : 0
    collectedSum += col
    if (Number(l.quantity) > col) shortLines++
  }
  return {
    companyId: doc.companyId,
    operationTypeId: doc.operationTypeId,
    partnerId: doc.partnerId,
    currentStatusId: doc.documentStatusId,
    currentCode: doc.documentStatus?.code ?? null,
    facts: {
      cancelled: doc.status === 'CANCELLED',
      completed: doc.status === 'COMPLETED',
      confirmed: doc.status === 'CONFIRMED',
      controlCollection: appr?.controlCollection ?? false,
      collectedSum,
      shortLines,
    },
  }
}

/**
 * Belge durumunu yeniden hesapla + documentStatusId'yi güncelle. TEK doğru kaynağı:
 * önce veri-güdümlü Kriter (operasyon+cari), eşleşme yoksa yerleşik computeDocStatus. İdempotent.
 * GERÇEK değişimde audit satırı (TBLDOCUMENTSTATUSHISTORY) yazar. opts.source/userId geçiş kaynağını işaretler.
 * tx içinde de (movement) tx dışında da (prisma) çağrılabilir. Dönüş = atanan durum kodu.
 */
export async function refreshDocStatus(client: Prisma.TransactionClient, documentId: number, opts?: { source?: string; userId?: number | null }): Promise<string | null> {
  const g = await gatherDocFacts(client, documentId)
  if (!g) return null
  // Faz 2: Belge Durum Kriter — operasyon (+ bu cari ya da "tüm cariler") için tanımlı kurallar
  const criteria = await client.tBLDOCUMENTSTATUSCRITERIA.findMany({
    where: {
      companyId: g.companyId, operationTypeId: g.operationTypeId, isActive: true,
      condition: { not: null }, targetStatusId: { not: null },
      OR: [{ businessPartnerId: null }, { businessPartnerId: g.partnerId ?? -1 }],
    },
    select: { condition: true, targetStatusId: true, priority: true, targetStatus: { select: { code: true } } },
  })
  const rows: StatusCriterion[] = criteria
    .filter((c) => c.condition != null && c.targetStatusId != null)
    .map((c) => ({ condition: c.condition!, targetStatusId: c.targetStatusId!, priority: c.priority }))
  // Hedef: kriter eşleşirse onun durumu (source=criteria), yoksa yerleşik computeDocStatus
  const targetId = evalCriteria(g.facts, rows)
  let newStatusId: number | null
  let newCode: string | null
  let derivedSource: string
  if (targetId != null) {
    newStatusId = targetId
    newCode = criteria.find((c) => c.targetStatusId === targetId)?.targetStatus?.code ?? null
    derivedSource = 'criteria'
  } else {
    newCode = computeDocStatus(g.facts)
    newStatusId = await docStatusId(g.companyId, newCode, client)
    derivedSource = 'derive'
  }
  if (newStatusId == null) return newCode // durum kodu firmada tanımlı değil → no-op
  if (newStatusId !== g.currentStatusId) {
    await client.tBLDOCUMENT.update({ where: { id: documentId }, data: { documentStatusId: newStatusId } })
    await client.tBLDOCUMENTSTATUSHISTORY.create({
      data: { companyId: g.companyId, documentId, fromCode: g.currentCode, toCode: newCode ?? '?', source: opts?.source ?? derivedSource, userId: opts?.userId ?? null },
    })
  }
  return newCode
}
