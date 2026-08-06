import type { ExtraFieldDataType, ExtraFieldEntity, Prisma } from '@prisma/client'
import { prisma } from './prisma.js'

/**
 * EK SAHA MOTORU — TBLEXTRAFIELD + TBLEXTRAFIELDOPTION + TBLOPERATIONTYPEEXTRAFIELD
 * + TBLEXTRAFIELDVALUE.
 *
 * Üç tanım ekranı vardı, hiçbiri işe yaramıyordu: alan tanımlanıyor, operasyona
 * bağlanıyor, ama DEĞER SAKLANACAK YER YOKTU — girilen hiçbir şey kaydedilmiyordu.
 * Legacy'de varlık başına ayrı tablo var (BELGEBASLIK/BELGEDETAY/BELGEKAPSAM/PALET
 * EKSAHA); bizde tek polimorfik TBLEXTRAFIELDVALUE.
 *
 * Doğrulama tanımdan gelir: zorunluluk, min/max uzunluk, sayısal/tarih tipi,
 * çoktan seçmelide seçenek listesi ve maksimum cevap sayısı.
 */

export class ExtraFieldError extends Error {}

export interface ExtraFieldDef {
  id: number
  description: string
  dataType: ExtraFieldDataType
  required: boolean
  defaultValue: string | null
  minLength: number | null
  maxLength: number | null
  maxAnswerCount: number | null
  sortOrder: number | null
  useInTerminal: boolean
  useInApproval: boolean
  transferOnDocSplit: boolean
  options: Array<{ code: string; description: string | null }>
}

/**
 * Bir operasyonun belirli bir varlık türü için kullandığı ek sahalar.
 * Operasyona bağlı tanım yoksa boş döner → hiçbir yerde ek saha çıkmaz.
 */
export async function extraFieldsForOperation(
  companyId: number, operationTypeId: number, entityType: ExtraFieldEntity,
  opts: { terminalOnly?: boolean; approvalOnly?: boolean } = {},
): Promise<ExtraFieldDef[]> {
  const baglar = await prisma.tBLOPERATIONTYPEEXTRAFIELD.findMany({
    where: {
      companyId, operationTypeId, isActive: true,
      ...(opts.terminalOnly ? { useInTerminal: true } : {}),
      ...(opts.approvalOnly ? { useInApproval: true } : {}),
    },
    orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
  })
  if (!baglar.length) return []

  const alanlar = await prisma.tBLEXTRAFIELD.findMany({
    where: { id: { in: baglar.map((b) => b.extraFieldId) }, companyId, entityType, isActive: true },
    include: { options: { where: { isActive: true }, orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }] } },
  })
  const alanOf = new Map(alanlar.map((a) => [a.id, a]))

  return baglar
    .map((b) => {
      const a = alanOf.get(b.extraFieldId)
      if (!a) return null
      return {
        id: a.id, description: a.description, dataType: a.fieldDataType,
        required: a.isRequired, defaultValue: a.defaultValue,
        minLength: a.minLength, maxLength: a.maxLength, maxAnswerCount: a.maxAnswerCount,
        sortOrder: b.sortOrder, useInTerminal: b.useInTerminal, useInApproval: b.useInApproval,
        transferOnDocSplit: a.transferOnDocSplit,
        options: a.options.map((o) => ({ code: o.code, description: o.description })),
      }
    })
    .filter((v): v is ExtraFieldDef => v != null)
}

/** Kayıtlara girilmiş değerler: entityId → (extraFieldId → değer). */
export async function loadExtraValues(
  companyId: number, entityType: ExtraFieldEntity, entityIds: number[],
): Promise<Map<number, Record<number, string>>> {
  const out = new Map<number, Record<number, string>>()
  if (!entityIds.length) return out
  const rows = await prisma.tBLEXTRAFIELDVALUE.findMany({
    where: { companyId, entityType, entityId: { in: entityIds } },
  })
  for (const r of rows) {
    const m = out.get(r.entityId) ?? {}
    m[r.extraFieldId] = r.value ?? ''
    out.set(r.entityId, m)
  }
  return out
}

/** Tek bir kaydın değerleri. */
export async function loadExtraValue(companyId: number, entityType: ExtraFieldEntity, entityId: number) {
  return (await loadExtraValues(companyId, entityType, [entityId])).get(entityId) ?? {}
}

/** Tek bir değeri tanıma göre doğrula — hata metni döner, geçerliyse null. */
export function validateExtraValue(def: ExtraFieldDef, ham: string | null | undefined): string | null {
  const v = (ham ?? '').trim()
  if (!v) return def.required ? `"${def.description}" zorunlu` : null

  if (def.minLength != null && v.length < def.minLength) return `"${def.description}" en az ${def.minLength} karakter olmalı`
  if (def.maxLength != null && v.length > def.maxLength) return `"${def.description}" en fazla ${def.maxLength} karakter olmalı`

  switch (def.dataType) {
    case 'NUMERIC':
      if (!/^-?\d+([.,]\d+)?$/.test(v)) return `"${def.description}" sayısal olmalı`
      break
    case 'DATE':
      if (Number.isNaN(new Date(v).getTime())) return `"${def.description}" geçerli bir tarih olmalı`
      break
    case 'MULTI_SELECT_FIXED': {
      if (!def.options.length) return `"${def.description}" için seçenek tanımlanmamış`
      const secilen = v.split(',').map((x) => x.trim()).filter(Boolean)
      if (def.maxAnswerCount != null && secilen.length > def.maxAnswerCount) {
        return `"${def.description}" en fazla ${def.maxAnswerCount} seçim kabul eder`
      }
      const gecerli = new Set(def.options.map((o) => o.code))
      const kacak = secilen.find((x) => !gecerli.has(x))
      if (kacak) return `"${def.description}" için geçersiz seçenek: ${kacak}`
      break
    }
  }
  return null
}

/**
 * Değerleri doğrula + kaydet. `values` anahtarı extraFieldId.
 * Tanımda olmayan alan gönderilirse yok sayılır (operasyonun alanı değilse yazılmaz).
 * Boş gönderilen değer siler. Varsayılan değer, hiç gönderilmemiş alanlara uygulanır.
 */
export async function saveExtraValues(
  companyId: number, operationTypeId: number, entityType: ExtraFieldEntity, entityId: number,
  values: Record<string, string | null>, client?: Prisma.TransactionClient,
): Promise<{ saved: number }> {
  const defs = await extraFieldsForOperation(companyId, operationTypeId, entityType)
  if (!defs.length) return { saved: 0 }
  const db = client ?? prisma

  const hatalar: string[] = []
  const yazilacak: Array<{ fieldId: number; value: string | null }> = []
  for (const d of defs) {
    const gonderildi = Object.prototype.hasOwnProperty.call(values, String(d.id))
    const ham = gonderildi ? values[String(d.id)] : d.defaultValue
    const hata = validateExtraValue(d, ham)
    if (hata) { hatalar.push(hata); continue }
    if (!gonderildi && !d.defaultValue) continue // dokunulmadı
    yazilacak.push({ fieldId: d.id, value: (ham ?? '').trim() || null })
  }
  if (hatalar.length) throw new ExtraFieldError(hatalar.join(' · '))

  for (const y of yazilacak) {
    if (y.value == null) {
      await db.tBLEXTRAFIELDVALUE.deleteMany({ where: { companyId, extraFieldId: y.fieldId, entityType, entityId } })
    } else {
      await db.tBLEXTRAFIELDVALUE.upsert({
        where: { extraFieldId_entityType_entityId: { extraFieldId: y.fieldId, entityType, entityId } },
        update: { value: y.value },
        create: { companyId, extraFieldId: y.fieldId, entityType, entityId, value: y.value },
      })
    }
  }
  return { saved: yazilacak.length }
}

/**
 * Zorunlu ek sahalar dolu mu? (belge onayı/tamamlaması öncesi kapı)
 * Operasyonda ek saha tanımı yoksa hiçbir şey kontrol edilmez.
 */
export async function assertRequiredExtraFields(
  companyId: number, operationTypeId: number, entityType: ExtraFieldEntity, entityId: number,
  opts: { approvalOnly?: boolean } = {},
): Promise<void> {
  const defs = (await extraFieldsForOperation(companyId, operationTypeId, entityType, opts)).filter((d) => d.required)
  if (!defs.length) return
  const mevcut = await loadExtraValue(companyId, entityType, entityId)
  const eksik = defs.filter((d) => !(mevcut[d.id] ?? '').trim()).map((d) => d.description)
  if (eksik.length) throw new ExtraFieldError(`Zorunlu ek saha boş: ${eksik.join(', ')}`)
}

/**
 * Belge bölünürken/planlanırken ek saha değerlerini yeni kayda taşı.
 * Yalnız "Bölme İşleminde Aktar" işaretli alanlar kopyalanır (TXTBOLMEISLEMINDEAKTAR).
 */
export async function copyExtraValuesOnSplit(
  companyId: number, entityType: ExtraFieldEntity, fromEntityId: number, toEntityId: number,
  client?: Prisma.TransactionClient,
): Promise<number> {
  const db = client ?? prisma
  const rows = await db.tBLEXTRAFIELDVALUE.findMany({
    where: { companyId, entityType, entityId: fromEntityId },
    include: { extraField: { select: { transferOnDocSplit: true } } },
  })
  const tasinacak = rows.filter((r) => r.extraField.transferOnDocSplit)
  for (const r of tasinacak) {
    await db.tBLEXTRAFIELDVALUE.upsert({
      where: { extraFieldId_entityType_entityId: { extraFieldId: r.extraFieldId, entityType, entityId: toEntityId } },
      update: { value: r.value },
      create: { companyId, extraFieldId: r.extraFieldId, entityType, entityId: toEntityId, value: r.value },
    })
  }
  return tasinacak.length
}
