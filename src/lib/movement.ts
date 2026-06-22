import { Prisma } from '@prisma/client'
import { prisma } from './prisma.js'
import { suggestPutawayLocations } from './routing.js'
import { writeLedger } from './ledger.js'

/** Hareket motoru hatası — route'larda 409'a map'lenir. */
export class MovementError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'MovementError'
  }
}

type Tx = Prisma.TransactionClient

// ── Kapsam (LinkScope) eşleştirme: Hepsi/Grup/Belirli ──
type Scope = 'ALL' | 'GROUP' | 'SPECIFIC' | null
/** Malzeme kapsamı bir ürüne uyuyor mu? (Hepsi→evet, Grup→ürün grubu eşleşir, Belirli→ürün eşleşir) */
function materialScopeMatches(type: Scope, linkId: number | null, productId: number, productGroupId: number | null): boolean {
  if (!type || type === 'ALL') return true
  if (type === 'GROUP') return linkId != null && linkId === productGroupId
  if (type === 'SPECIFIC') return linkId != null && linkId === productId
  return false
}
/** Cari kapsamı bir cariye uyuyor mu? */
function cariScopeMatches(type: Scope, linkId: number | null, partnerId: number | null, partnerGroupId: number | null): boolean {
  if (!type || type === 'ALL') return true
  if (type === 'GROUP') return linkId != null && linkId === partnerGroupId
  if (type === 'SPECIFIC') return linkId != null && linkId === partnerId
  return false
}
/** Lokasyon kapsamı bir lokasyona uyuyor mu? (null/Hepsi→serbest, Grup→lokasyon o gruba üye, Belirli→lokasyon eşleşir) */
function locationScopeMatches(type: Scope, linkId: number | null, locationId: number | null, locationGroupIds: number[]): boolean {
  if (!type || type === 'ALL') return true
  if (locationId == null) return false
  if (type === 'GROUP') return linkId != null && locationGroupIds.includes(linkId)
  if (type === 'SPECIFIC') return linkId != null && linkId === locationId
  return false
}

// Giriş/Çıkış koşulu kontrol tipi — SSP yerine yerleşik kontroller
type CtrlType = 'MANUAL' | 'REQUIRE_BATCH' | 'REQUIRE_SERIAL' | 'REQUIRE_REASON' | 'CONTROL_FIELD_REQUIRED' | 'MIN_SHELF_LIFE'
/** Sync koşul SAĞLANMADI mı? (true → gate). MIN_SHELF_LIFE async olduğu için burada değil. */
function conditionFails(controlType: CtrlType, line: { batchNo: string | null; serialNo: string | null; note: string | null }, docReasonId: number | null, controlFieldName?: string | null): boolean {
  switch (controlType) {
    case 'MANUAL': return true
    case 'REQUIRE_BATCH': return !line.batchNo
    case 'REQUIRE_SERIAL': return !line.serialNo
    case 'REQUIRE_REASON': return docReasonId == null
    case 'CONTROL_FIELD_REQUIRED': {
      // kontrol sahası bilinen satır alanına denk geliyorsa dolu olmalı; bilinmiyorsa kontrol edilemez (geç)
      const f = (controlFieldName ?? '').trim()
      if (f === 'batchNo') return !line.batchNo
      if (f === 'serialNo') return !line.serialNo
      if (f === 'note') return !line.note
      return false
    }
    default: return false
  }
}

export interface CompleteOpts { breakPassword?: string; breakReasonCode?: string; userId?: number }

interface StockKey {
  companyId: number
  locationId: number
  productId: number
  statusId: number
  batchNo: string | null
  serialNo: string | null
  palletId: number | null
  customerId: number | null // consignment — müşteri-sahipli stok kimliği
  poNo: string | null // PO-bazlı izlenebilirlik
  poLine: string | null
}

/** Stok hareketinin defterine (TBLSTOCKLEDGER) yazılacak bağlamı — belge/operasyon/yön/kullanıcı. */
interface MoveCtx {
  direction: 'INBOUND' | 'OUTBOUND' | 'INTERNAL' | 'COUNT'
  documentId?: number | null
  documentLineId?: number | null
  operationTypeId?: number | null
  userId?: number | null
}

/**
 * Stok satırını izleme kırılımına (lokasyon×ürün×statü×batch×seri×palet) göre bulur
 * ve delta uygular. Nullable alanlar IS NULL olarak eşleşir (findFirst).
 * Yoksa ve delta>0 ise yeni satır açar; delta<0 ve satır yoksa/yetersizse hata.
 * Her başarılı değişim hareket defterine (ledger) işaretli qtyDelta ile yazılır.
 */
async function adjustStock(tx: Tx, key: StockKey, unitId: number, delta: Prisma.Decimal, ctx: MoveCtx, expiryDate?: Date | null) {
  const existing = await tx.tBLSTOCK.findFirst({ where: key })

  if (existing) {
    const newQty = existing.mainQty.add(delta)
    if (newQty.isNegative()) {
      throw new MovementError(
        `Yetersiz stok (lokasyon ${key.locationId}, ürün ${key.productId}, statü ${key.statusId}): mevcut ${existing.mainQty.toString()}, talep ${delta.abs().toString()}`,
      )
    }
    // Fiziksel miktar rezervenin altına düşerse rezerveyi kıs (sevk rezerveyi tüketir)
    const data: Prisma.TBLSTOCKUpdateInput = { mainQty: newQty }
    if (existing.reservedQty.greaterThan(newQty)) data.reservedQty = newQty
    await tx.tBLSTOCK.update({ where: { id: existing.id }, data })
  } else {
    if (delta.isNegative()) {
      throw new MovementError(
        `Stok bulunamadı (lokasyon ${key.locationId}, ürün ${key.productId}, statü ${key.statusId}) — çıkış yapılamaz`,
      )
    }
    await tx.tBLSTOCK.create({ data: { ...key, unitId, mainQty: delta, ...(expiryDate ? { expiryDate } : {}) } })
  }

  // Hareket defteri (legacy TBLSBLOGBELGE) — append-only, stok değişimiyle aynı transaction
  await writeLedger(tx, {
    companyId: key.companyId,
    productId: key.productId,
    unitId,
    locationId: key.locationId,
    statusId: key.statusId,
    batchNo: key.batchNo,
    serialNo: key.serialNo,
    palletId: key.palletId,
    poNo: key.poNo,
    poLine: key.poLine,
    qtyDelta: delta,
    direction: ctx.direction,
    documentId: ctx.documentId,
    documentLineId: ctx.documentLineId,
    operationTypeId: ctx.operationTypeId,
    userId: ctx.userId,
  })
}

/**
 * Belgeyi tamamlar (CONFIRMED → COMPLETED) ve operasyon yönüne göre stok'a işler:
 *  - INBOUND  : hedef lokasyon/statü +miktar
 *  - OUTBOUND : kaynak lokasyon/statü −miktar
 *  - INTERNAL : kaynak −miktar, hedef +miktar (transfer / statü değişimi)
 * Tüm satırlar tek transaction içinde; herhangi biri hata verirse rollback.
 */
/**
 * Lokasyon kapasite kontrolü — hedef lokasyona giriş öncesi.
 * İlgili kurallar (lokasyon + ürün/grup/Hepsi) için mevcut yük + gelen > limit ise:
 * messageType ERROR → hata fırlatır; WARNING → izin verir.
 */
async function enforceCapacity(
  tx: Prisma.TransactionClient,
  companyId: number,
  locationId: number,
  productId: number,
  incomingQty: Prisma.Decimal,
  lineNo: number,
) {
  const product = await tx.tBLPRODUCT.findUnique({ where: { id: productId }, select: { productGroupId: true } })
  // bu lokasyonun grupları (LOCATION_GROUP kuralları için)
  const groupLinks = await tx.tBLLOCATIONGROUPLINK.findMany({ where: { companyId, locationId }, select: { locationGroupId: true } })
  const groupIds = groupLinks.map((g) => g.locationGroupId)

  const rules = await tx.tBLLOCATIONCAPACITY.findMany({
    where: {
      companyId,
      isActive: true,
      quantity: { not: null },
      OR: [
        { locationLinkType: 'LOCATION', locationLinkCode: locationId },
        ...(groupIds.length ? [{ locationLinkType: 'LOCATION_GROUP' as const, locationLinkCode: { in: groupIds } }] : []),
      ],
      AND: {
        OR: [
          { materialLinkType: null },
          { materialLinkType: 'PRODUCT', materialLinkCode: productId },
          ...(product?.productGroupId ? [{ materialLinkType: 'PRODUCT_GROUP' as const, materialLinkCode: product.productGroupId }] : []),
        ],
      },
    },
  })

  for (const rule of rules) {
    const stockWhere: Prisma.TBLSTOCKWhereInput = { companyId, locationId }
    if (rule.materialLinkType === 'PRODUCT') stockWhere.productId = productId
    else if (rule.materialLinkType === 'PRODUCT_GROUP') stockWhere.product = { productGroupId: rule.materialLinkCode }
    const agg = await tx.tBLSTOCK.aggregate({ where: stockWhere, _sum: { mainQty: true } })
    const current = agg._sum.mainQty ?? new Prisma.Decimal(0)
    if (current.add(incomingQty).greaterThan(rule.quantity!)) {
      if (rule.messageType === 'ERROR') {
        throw new MovementError(`Satır ${lineNo}: lokasyon kapasitesi aşıldı (limit ${rule.quantity}, mevcut ${current}, gelen ${incomingQty})`)
      }
    }
  }
}

export async function completeDocument(documentId: number, breakOpts: CompleteOpts = {}) {
  return prisma.$transaction(async (tx) => {
    const doc = await tx.tBLDOCUMENT.findUniqueOrThrow({
      where: { id: documentId },
      include: { operationType: true, lines: { orderBy: { lineNo: 'asc' }, include: { scopes: { orderBy: { scopeNo: 'asc' } } } } },
    })

    if (doc.status === 'COMPLETED') throw new MovementError('Belge zaten tamamlanmış')
    if (doc.status === 'CANCELLED') throw new MovementError('İptal edilmiş belge tamamlanamaz')
    if (doc.status !== 'CONFIRMED') throw new MovementError('Sadece CONFIRMED belge tamamlanabilir')

    const op = doc.operationType
    const dir = op.direction

    // Operasyon: neden zorunlu mu (reasonRequired flag → davranış)
    if (op.reasonRequired && doc.reasonId == null) {
      throw new MovementError('Bu operasyon tipi için neden (reason) girilmesi zorunlu')
    }
    // Operasyon ↔ statü geçişleri (tanımlıysa satır statüleri buna uymalı)
    const transitions = op.affectsStock
      ? await tx.tBLOPERATIONTYPESTATUS.findMany({ where: { operationTypeId: op.id, companyId: doc.companyId } })
      : []

    // Operasyon ↔ neden: bağlı neden listesi varsa belge nedeni bunlardan biri olmalı
    const allowedReasons = await tx.tBLOPERATIONTYPEREASON.findMany({ where: { operationTypeId: op.id, companyId: doc.companyId }, select: { reasonId: true } })
    if (allowedReasons.length > 0 && doc.reasonId != null && !allowedReasons.some((a) => a.reasonId === doc.reasonId)) {
      throw new MovementError('Belge nedeni bu operasyon tipinde tanımlı değil')
    }
    // Operasyon ↔ palet tipi: bağlı palet tipi listesi varsa satır paletinin tipi uygun olmalı
    const allowedPalletTypes = await tx.tBLOPERATIONTYPEPALLETTYPE.findMany({ where: { operationTypeId: op.id, companyId: doc.companyId }, select: { palletTypeId: true } })

    // Operasyon ↔ yasaklı ürün: kapsam (cari + malzeme) eşleşen kural varsa o ürün bu operasyonda hareket edemez
    const forbiddenRules = await tx.tBLOPERATIONTYPEFORBIDDENPRODUCT.findMany({
      where: { operationTypeId: op.id, companyId: doc.companyId, isActive: true },
    })
    const docPartnerGroupId = doc.partnerId
      ? (await tx.tBLBUSINESSPARTNER.findUnique({ where: { id: doc.partnerId }, select: { partnerGroupId: true } }))?.partnerGroupId ?? null
      : null

    // Operasyon ↔ lokasyon kapsamı: tanımlı kural(lar) varsa satır kaynak/hedef lokasyonu izinli listede olmalı (TBLOPERATIONTYPELOCATION — isActive kolonu yok)
    const locationRules = await tx.tBLOPERATIONTYPELOCATION.findMany({
      where: { operationTypeId: op.id, companyId: doc.companyId },
    })

    // Giriş/Çıkış Koşulları: operasyona bağlı koşul tipleri → aktif parametreler (cari/malzeme scope + kontrol tipi + kırma)
    const entryTypeIds = (await tx.tBLENTRYCONDITIONTYPEOPERATION.findMany({ where: { operationTypeId: op.id, companyId: doc.companyId, isActive: true }, select: { entryConditionTypeId: true } })).map((x) => x.entryConditionTypeId)
    const exitTypeIds = (await tx.tBLEXITCONDITIONTYPEOPERATION.findMany({ where: { operationTypeId: op.id, companyId: doc.companyId, isActive: true }, select: { exitConditionTypeId: true } })).map((x) => x.exitConditionTypeId)
    const entryParams = entryTypeIds.length ? await tx.tBLENTRYCONDITIONPARAMETER.findMany({ where: { entryConditionTypeId: { in: entryTypeIds }, companyId: doc.companyId, isActive: true } }) : []
    const exitParams = exitTypeIds.length ? await tx.tBLEXITCONDITIONPARAMETER.findMany({ where: { exitConditionTypeId: { in: exitTypeIds }, companyId: doc.companyId, isActive: true } }) : []
    // Çıkış kontrol sahaları (controlFieldId → fieldName) — CONTROL_FIELD_REQUIRED için
    const ctrlFieldIds = exitParams.map((p) => p.controlFieldId).filter((x): x is number => x != null)
    const ctrlFieldMap = new Map<number, string | null>(
      ctrlFieldIds.length ? (await tx.tBLEXITCONDITIONCONTROLFIELD.findMany({ where: { id: { in: ctrlFieldIds }, companyId: doc.companyId } })).map((f) => [f.id, f.fieldName]) : [],
    )
    const condParams = [
      ...entryParams.map((p) => ({ id: p.id, dir: 'ENTRY' as const, cariLinkType: p.cariLinkType as Scope, cariLinkId: p.cariLinkId, materialLinkType: p.materialLinkType as Scope, materialLinkId: p.materialLinkId, controlType: p.controlType as CtrlType, conditionBreakAllowed: p.conditionBreakAllowed, exclude: p.exclude, controlFieldName: null as string | null, dayCount: null as number | null })),
      ...exitParams.map((p) => ({ id: p.id, dir: 'EXIT' as const, cariLinkType: p.cariLinkType as Scope, cariLinkId: p.cariLinkId, materialLinkType: p.materialLinkType as Scope, materialLinkId: p.materialLinkId, controlType: p.controlType as CtrlType, conditionBreakAllowed: p.conditionBreakAllowed, exclude: p.exclude, controlFieldName: p.controlFieldId != null ? (ctrlFieldMap.get(p.controlFieldId) ?? null) : null, dayCount: p.dayCount })),
    ]
    // Operasyon ↔ tolerans: kapsamı eşleşen kural + satırda referenceQty varsa miktar tolerans bandında olmalı
    const toleranceRules = await tx.tBLOPERATIONTYPETOLERANCE.findMany({ where: { operationTypeId: op.id, companyId: doc.companyId, isActive: true } })
    // Directed putaway: ürün başına önerilen lokasyonlar (yönlendirme kuralı varsa hedef bu listede olmalı) — ürün bazında cache
    const putawayCache = new Map<number, Set<number>>()
    // Koşul kırma geçerli mi? Şifre + neden birlikte gerekli; şifre aktif kırma-şifresi tablosunda (cari null veya belge carisi) olmalı
    let breakOk = false
    if (condParams.length > 0 && breakOpts.breakPassword && breakOpts.breakReasonCode) {
      const pw = (await tx.tBLENTRYCONDITIONBREAKPASSWORD.findFirst({ where: { companyId: doc.companyId, password: breakOpts.breakPassword, isActive: true, OR: [{ businessPartnerId: null }, { businessPartnerId: doc.partnerId }] } }))
        ?? (await tx.tBLEXITCONDITIONBREAKPASSWORD.findFirst({ where: { companyId: doc.companyId, password: breakOpts.breakPassword, isActive: true, OR: [{ businessPartnerId: null }, { businessPartnerId: doc.partnerId }] } }))
      breakOk = !!pw
    }

    if (doc.operationType.affectsStock) {
      for (const line of doc.lines) {
        // Pasif ürün: operasyon izin vermiyorsa (passiveProductUse=false) pasif ürün hareket edemez
        const product = await tx.tBLPRODUCT.findUnique({ where: { id: line.productId }, select: { isActive: true, code: true, productGroupId: true, shelfLifeDays: true } })
        if (product && !product.isActive && !op.passiveProductUse) {
          throw new MovementError(`Satır ${line.lineNo}: pasif ürün (${product.code}) — bu operasyonda kullanılamaz`)
        }

        // Yasaklı ürün: kapsam (cari + malzeme Hepsi/Grup/Belirli) eşleşen kural varsa bloke
        if (forbiddenRules.length > 0) {
          const blocked = forbiddenRules.find((r) =>
            cariScopeMatches(r.cariLinkType, r.cariLinkId, doc.partnerId, docPartnerGroupId) &&
            materialScopeMatches(r.materialLinkType, r.materialLinkId, line.productId, product?.productGroupId ?? null),
          )
          if (blocked) throw new MovementError(`Satır ${line.lineNo}: ürün (${product?.code}) bu operasyonda yasaklı`)
        }

        // ── KAPSAM (okutma) katmanı — satırda scope varsa: her scope = bir fiili hareket (legacy DETAY→N KAPSAM) ──
        // Scope'ta loc/statü/palet/batch/seri/cari/PO scope'tan gelir. Satır-seviyesi alan validasyonları (batch/seri/
        // statü-geçiş/koşul/tolerans) scope yolunda atlanır — scope kaynak gerçektir (MVP; tam per-scope validasyon: follow-up).
        if (line.scopes && line.scopes.length > 0) {
          const moveCtx: MoveCtx = { direction: dir, documentId: doc.id, documentLineId: line.id, operationTypeId: op.id, userId: breakOpts.userId ?? null }
          let collected = new Prisma.Decimal(0)
          for (const sc of line.scopes) {
            const sCommon = {
              companyId: doc.companyId, productId: line.productId,
              batchNo: sc.batchNo, serialNo: sc.serialNo, palletId: sc.palletId,
              customerId: sc.customerId, poNo: sc.poNo, poLine: sc.poLine,
            }
            if (dir === 'OUTBOUND' || dir === 'INTERNAL') {
              if (sc.sourceLocationId == null || sc.sourceStatusId == null) throw new MovementError(`Satır ${line.lineNo} okutma ${sc.scopeNo}: kaynak lokasyon/statü gerekli`)
              await adjustStock(tx, { ...sCommon, locationId: sc.sourceLocationId, statusId: sc.sourceStatusId }, sc.unitId, sc.quantity.negated(), moveCtx)
            }
            if (dir === 'INBOUND' || dir === 'INTERNAL') {
              if (sc.targetLocationId == null || sc.targetStatusId == null) throw new MovementError(`Satır ${line.lineNo} okutma ${sc.scopeNo}: hedef lokasyon/statü gerekli`)
              await enforceCapacity(tx, doc.companyId, sc.targetLocationId, line.productId, sc.quantity, line.lineNo)
              await adjustStock(tx, { ...sCommon, locationId: sc.targetLocationId, statusId: sc.targetStatusId }, sc.unitId, sc.quantity, moveCtx)
            }
            collected = collected.add(sc.quantity)
          }
          await tx.tBLDOCUMENTLINE.update({ where: { id: line.id }, data: { collectedQty: collected } })
          continue
        }

        // Lot/seri takip zorunluluğu: ürün-birim parti/seri izlemeli ise stok hareketinde zorunlu (kapalıysa null serbest)
        const pu = await tx.tBLPRODUCTUNIT.findFirst({
          where: { productId: line.productId, unitId: line.unitId },
          select: { batchTracking: true, serialTracking: true },
        })
        if (pu?.batchTracking && !line.batchNo) {
          if (op.batchAssignment) {
            // Otomatik parti atama: operasyon açıksa tarih+belge bazlı parti üret
            const d = new Date()
            const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`
            line.batchNo = `AUTO-${ymd}-${doc.id}-${line.lineNo}`
            await tx.tBLDOCUMENTLINE.update({ where: { id: line.id }, data: { batchNo: line.batchNo } })
          } else {
            throw new MovementError(`Satır ${line.lineNo}: ürün parti (lot) takipli — parti no gerekli`)
          }
        }
        if (pu?.serialTracking) {
          if (!line.serialNo) {
            throw new MovementError(`Satır ${line.lineNo}: ürün seri takipli — seri no gerekli`)
          }
          // Seri = 1 adet (her seri tek birim)
          if (!line.quantity.equals(1)) {
            throw new MovementError(`Satır ${line.lineNo}: seri takipli ürün miktarı 1 olmalı (her seri = 1 adet)`)
          }
          // Girişte seri tekrarı: aynı seri stokta varsa ve operasyon "aynı seri kullanılsın" değilse engelle
          if (dir === 'INBOUND' && !op.sameUseSerial) {
            const existing = await tx.tBLSTOCK.findFirst({
              where: { companyId: doc.companyId, productId: line.productId, serialNo: line.serialNo, mainQty: { gt: 0 } },
              select: { id: true },
            })
            if (existing) {
              throw new MovementError(`Satır ${line.lineNo}: seri no '${line.serialNo}' zaten stokta — tekrar giriş yapılamaz`)
            }
          }
        }

        // Statü geçişi doğrulaması: operasyonda geçiş tanımlıysa satırın statüsü uygun olmalı
        // (qualityControl INBOUND'da hedef KARANTİNA'ya zorlandığı için bu kontrol atlanır)
        if (transitions.length > 0 && !(dir === 'INBOUND' && op.qualityControl)) {
          const valid =
            dir === 'INBOUND'
              ? transitions.some((t) => t.targetStatusId === line.targetStatusId)
              : dir === 'OUTBOUND'
                ? transitions.some((t) => t.sourceStatusId === line.sourceStatusId)
                : transitions.some((t) => t.sourceStatusId === line.sourceStatusId && t.targetStatusId === line.targetStatusId)
          if (!valid) {
            throw new MovementError(`Satır ${line.lineNo}: statü geçişi operasyon tanımına uymuyor (${dir})`)
          }
        }

        // Operasyon ↔ palet tipi: bağlı liste varsa satır paletinin tipi uygun olmalı
        if (allowedPalletTypes.length > 0 && line.palletId != null) {
          const pallet = await tx.tBLPALLET.findUnique({ where: { id: line.palletId }, select: { palletTypeId: true } })
          if (pallet?.palletTypeId != null && !allowedPalletTypes.some((a) => a.palletTypeId === pallet.palletTypeId)) {
            throw new MovementError(`Satır ${line.lineNo}: palet tipi bu operasyonda kullanılamaz`)
          }
        }

        // Operasyon ↔ lokasyon kapsamı: kural tanımlıysa kaynak/hedef lokasyon izinli olmalı (cari+malzeme kapsamı eşleşen kurallar arasında)
        if (locationRules.length > 0) {
          const scoped = locationRules.filter((r) =>
            cariScopeMatches(r.cariLinkType, r.cariLinkId, doc.partnerId, docPartnerGroupId) &&
            materialScopeMatches(r.materialLinkType, r.materialLinkId, line.productId, product?.productGroupId ?? null),
          )
          if (scoped.length > 0) {
            const srcGroupIds = line.sourceLocationId != null
              ? (await tx.tBLLOCATIONGROUPLINK.findMany({ where: { companyId: doc.companyId, locationId: line.sourceLocationId }, select: { locationGroupId: true } })).map((g) => g.locationGroupId)
              : []
            const tgtGroupIds = line.targetLocationId != null
              ? (await tx.tBLLOCATIONGROUPLINK.findMany({ where: { companyId: doc.companyId, locationId: line.targetLocationId }, select: { locationGroupId: true } })).map((g) => g.locationGroupId)
              : []
            if (dir === 'OUTBOUND' || dir === 'INTERNAL') {
              if (!scoped.some((r) => locationScopeMatches(r.sourceLinkType, r.sourceLocationId, line.sourceLocationId, srcGroupIds))) {
                throw new MovementError(`Satır ${line.lineNo}: kaynak lokasyon bu operasyon için izinli değil`)
              }
            }
            if (dir === 'INBOUND' || dir === 'INTERNAL') {
              if (!scoped.some((r) => locationScopeMatches(r.targetLinkType, r.targetLocationId, line.targetLocationId, tgtGroupIds))) {
                throw new MovementError(`Satır ${line.lineNo}: hedef lokasyon bu operasyon için izinli değil`)
              }
            }
          }
        }

        // Giriş/Çıkış Koşulları: kapsamı eşleşen koşul sağlanmadıysa bloke (kırma izinli + geçerli şifre+neden ise logla-geç)
        if (condParams.length > 0) {
          for (const cp of condParams) {
            if (cp.exclude) continue
            const inScope = cariScopeMatches(cp.cariLinkType, cp.cariLinkId, doc.partnerId, docPartnerGroupId) &&
              materialScopeMatches(cp.materialLinkType, cp.materialLinkId, line.productId, product?.productGroupId ?? null)
            if (!inScope) continue
            let fails: boolean
            if (cp.controlType === 'MIN_SHELF_LIFE') {
              // kalan raf ömrü: satır partisinin stok expiryDate'i bugün+dayCount günden önce ise bloke
              fails = false
              if (cp.dayCount && line.batchNo) {
                const st = await tx.tBLSTOCK.findFirst({ where: { companyId: doc.companyId, productId: line.productId, batchNo: line.batchNo, expiryDate: { not: null } }, select: { expiryDate: true } })
                if (st?.expiryDate) fails = st.expiryDate < new Date(Date.now() + cp.dayCount * 86400000)
              }
            } else {
              fails = conditionFails(cp.controlType, line, doc.reasonId, cp.controlFieldName)
            }
            if (!fails) continue
            if (cp.conditionBreakAllowed && breakOk) {
              await tx.tBLCONDITIONBREAKLOG.create({ data: { companyId: doc.companyId, documentId: doc.id, conditionType: cp.dir, conditionParameterId: cp.id, breakReasonCode: breakOpts.breakReasonCode ?? null, userId: breakOpts.userId ?? null, note: `Satır ${line.lineNo}: ${cp.controlType}` } })
            } else {
              throw new MovementError(`Satır ${line.lineNo}: ${cp.dir === 'ENTRY' ? 'giriş' : 'çıkış'} koşulu sağlanmadı (${cp.controlType})${cp.conditionBreakAllowed ? ' — kırma şifresi+nedeni gerekli' : ''}`)
            }
          }
        }

        // Directed Putaway: ürünün yönlendirme kuralı varsa hedef lokasyon önerilen listede olmalı
        if ((dir === 'INBOUND' || dir === 'INTERNAL') && line.targetLocationId != null) {
          let allowed = putawayCache.get(line.productId)
          if (allowed === undefined) {
            allowed = new Set((await suggestPutawayLocations(doc.companyId, line.productId)).map((s) => s.id))
            putawayCache.set(line.productId, allowed)
          }
          if (allowed.size > 0 && !allowed.has(line.targetLocationId)) {
            throw new MovementError(`Satır ${line.lineNo}: hedef lokasyon ürünün yönlendirme kuralına uymuyor (directed putaway)`)
          }
        }

        // Operasyon Toleransı: referenceQty varsa miktar, tolerans bandı (± yüzde + ± mutlak) dışındaysa bloke
        if (toleranceRules.length > 0 && line.referenceQty != null) {
          const rule = toleranceRules.find((r) =>
            cariScopeMatches(r.cariLinkType as Scope, r.cariLinkId, doc.partnerId, docPartnerGroupId) &&
            materialScopeMatches(r.materialLinkType as Scope, r.materialLinkId, line.productId, product?.productGroupId ?? null))
          if (rule && (rule.tolerancePercent != null || rule.toleranceQty != null)) {
            const ref = line.referenceQty
            let allowed = new Prisma.Decimal(0)
            if (rule.tolerancePercent != null) allowed = allowed.add(ref.abs().mul(rule.tolerancePercent).div(100))
            if (rule.toleranceQty != null && rule.toleranceQty.greaterThan(allowed)) allowed = rule.toleranceQty
            if (line.quantity.sub(ref).abs().greaterThan(allowed)) {
              throw new MovementError(`Satır ${line.lineNo}: miktar (${line.quantity}) referans (${ref}) toleransı dışında (izin ±${allowed})`)
            }
          }
        }

        // Palet: aynı palet kullanımı kapalıysa, girişte zaten kullanımda olan palete ekleme engellenir
        if (dir === 'INBOUND' && line.palletId != null && !op.sameUsePallet) {
          const palletInUse = await tx.tBLSTOCK.findFirst({
            where: { companyId: doc.companyId, palletId: line.palletId, mainQty: { gt: 0 } },
            select: { id: true },
          })
          if (palletInUse) {
            throw new MovementError(`Satır ${line.lineNo}: palet zaten kullanımda — yeni palet gerekli (veya operasyonda 'aynı palet kullanılsın')`)
          }
        }

        const qty = line.quantity
        const common = {
          companyId: doc.companyId,
          productId: line.productId,
          batchNo: line.batchNo,
          serialNo: line.serialNo,
          palletId: line.palletId,
          customerId: line.customerId,
          poNo: line.poNo,
          poLine: line.poLine,
        }
        const moveCtx: MoveCtx = { direction: dir, documentId: doc.id, documentLineId: line.id, operationTypeId: op.id, userId: breakOpts.userId ?? null }

        // Çıkış: kaynak azalt
        if (dir === 'OUTBOUND' || dir === 'INTERNAL') {
          if (line.sourceLocationId == null || line.sourceStatusId == null) {
            throw new MovementError(`Satır ${line.lineNo}: kaynak lokasyon ve statü gerekli (${dir})`)
          }
          await adjustStock(
            tx,
            { ...common, locationId: line.sourceLocationId, statusId: line.sourceStatusId },
            line.unitId,
            qty.negated(),
            moveCtx,
          )
        }

        // Giriş: hedef artır
        if (dir === 'INBOUND' || dir === 'INTERNAL') {
          if (line.targetLocationId == null || line.targetStatusId == null) {
            throw new MovementError(`Satır ${line.lineNo}: hedef lokasyon ve statü gerekli (${dir})`)
          }
          await enforceCapacity(tx, doc.companyId, line.targetLocationId, line.productId, qty, line.lineNo)
          // Raf ömrü (opsiyonel): yalnız mal kabulde (INBOUND) ürünün raf ömrü gün sayısı tanımlıysa
          // SKT = bugün + gün. Transfer/INTERNAL'de kaynaktaki SKT korunur (yeniden hesaplanmaz).
          const inboundExpiry =
            dir === 'INBOUND' && product?.shelfLifeDays
              ? new Date(Date.now() + product.shelfLifeDays * 86400000)
              : undefined
          await adjustStock(
            tx,
            { ...common, locationId: line.targetLocationId, statusId: line.targetStatusId },
            line.unitId,
            qty,
            moveCtx,
            inboundExpiry,
          )
        }
      }
    }

    return tx.tBLDOCUMENT.update({
      where: { id: documentId },
      data: { status: 'COMPLETED', completedAt: new Date() },
      include: { lines: { orderBy: { lineNo: 'asc' } } },
    })
  })
}

/**
 * Tamamlanmış belgenin stok etkisini geri alır (ters kayıt) ve CANCELLED yapar.
 * Orijinalin tersi: hedef −qty (girişi geri al), kaynak +qty (çıkışı geri al).
 * Tek transaction; başka belge stoğu tükettiyse ters kayıt eksi'ye düşer → hata.
 */
export async function reverseDocument(documentId: number) {
  return prisma.$transaction(async (tx) => {
    const doc = await tx.tBLDOCUMENT.findUniqueOrThrow({
      where: { id: documentId },
      include: { operationType: true, lines: { orderBy: { lineNo: 'asc' }, include: { scopes: { orderBy: { scopeNo: 'asc' } } } } },
    })

    if (doc.status !== 'COMPLETED') throw new MovementError('Sadece COMPLETED belge ters kaydedilebilir')

    const dir = doc.operationType.direction

    if (doc.operationType.affectsStock) {
      for (const line of doc.lines) {
        // KAPSAM (okutma) belgesi: scope varsa her scope'un hareketini ters al (kaynak +, hedef −)
        if (line.scopes && line.scopes.length > 0) {
          const mCtx: MoveCtx = { direction: dir, documentId: doc.id, documentLineId: line.id, operationTypeId: doc.operationTypeId, userId: null }
          for (const sc of line.scopes) {
            const sCommon = { companyId: doc.companyId, productId: line.productId, batchNo: sc.batchNo, serialNo: sc.serialNo, palletId: sc.palletId, customerId: sc.customerId, poNo: sc.poNo, poLine: sc.poLine }
            if (dir === 'OUTBOUND' || dir === 'INTERNAL') await adjustStock(tx, { ...sCommon, locationId: sc.sourceLocationId!, statusId: sc.sourceStatusId! }, sc.unitId, sc.quantity, mCtx)
            if (dir === 'INBOUND' || dir === 'INTERNAL') await adjustStock(tx, { ...sCommon, locationId: sc.targetLocationId!, statusId: sc.targetStatusId! }, sc.unitId, sc.quantity.negated(), mCtx)
          }
          continue
        }
        const qty = line.quantity
        const common = {
          companyId: doc.companyId,
          productId: line.productId,
          batchNo: line.batchNo,
          serialNo: line.serialNo,
          palletId: line.palletId,
          customerId: line.customerId,
          poNo: line.poNo,
          poLine: line.poLine,
        }
        const moveCtx: MoveCtx = { direction: dir, documentId: doc.id, documentLineId: line.id, operationTypeId: doc.operationTypeId, userId: null }

        // Önce iadeleri (kaynak +) uygula, sonra azaltmaları (hedef −) — geçici eksiyi önler
        if (dir === 'OUTBOUND' || dir === 'INTERNAL') {
          await adjustStock(
            tx,
            { ...common, locationId: line.sourceLocationId!, statusId: line.sourceStatusId! },
            line.unitId,
            qty,
            moveCtx,
          )
        }
        if (dir === 'INBOUND' || dir === 'INTERNAL') {
          await adjustStock(
            tx,
            { ...common, locationId: line.targetLocationId!, statusId: line.targetStatusId! },
            line.unitId,
            qty.negated(),
            moveCtx,
          )
        }
      }
    }

    return tx.tBLDOCUMENT.update({
      where: { id: documentId },
      data: { status: 'CANCELLED' },
      include: { lines: { orderBy: { lineNo: 'asc' } } },
    })
  })
}
