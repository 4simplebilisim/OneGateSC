import { Prisma } from '@prisma/client'
import { prisma } from './prisma.js'

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

interface StockKey {
  companyId: number
  locationId: number
  productId: number
  statusId: number
  batchNo: string | null
  serialNo: string | null
  palletId: number | null
}

/**
 * Stok satırını izleme kırılımına (lokasyon×ürün×statü×batch×seri×palet) göre bulur
 * ve delta uygular. Nullable alanlar IS NULL olarak eşleşir (findFirst).
 * Yoksa ve delta>0 ise yeni satır açar; delta<0 ve satır yoksa/yetersizse hata.
 */
async function adjustStock(tx: Tx, key: StockKey, unitId: number, delta: Prisma.Decimal) {
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
    await tx.tBLSTOCK.create({ data: { ...key, unitId, mainQty: delta } })
  }
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

export async function completeDocument(documentId: number) {
  return prisma.$transaction(async (tx) => {
    const doc = await tx.tBLDOCUMENT.findUniqueOrThrow({
      where: { id: documentId },
      include: { operationType: true, lines: { orderBy: { lineNo: 'asc' } } },
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

    if (doc.operationType.affectsStock) {
      for (const line of doc.lines) {
        // Pasif ürün: operasyon izin vermiyorsa (passiveProductUse=false) pasif ürün hareket edemez
        const product = await tx.tBLPRODUCT.findUnique({ where: { id: line.productId }, select: { isActive: true, code: true, productGroupId: true } })
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
        }

        // Çıkış: kaynak azalt
        if (dir === 'OUTBOUND' || dir === 'INTERNAL') {
          if (line.sourceLocationId == null || line.sourceStatusId == null) {
            throw new MovementError(`Satır ${line.lineNo}: kaynak lokasyon ve statü gerekli (${dir})`)
          }
          await adjustStock(
            tx,
            { ...common, locationId: line.sourceLocationId, statusId: line.sourceStatusId },
            line.unitId,
            qty.negated(),          )
        }

        // Giriş: hedef artır
        if (dir === 'INBOUND' || dir === 'INTERNAL') {
          if (line.targetLocationId == null || line.targetStatusId == null) {
            throw new MovementError(`Satır ${line.lineNo}: hedef lokasyon ve statü gerekli (${dir})`)
          }
          await enforceCapacity(tx, doc.companyId, line.targetLocationId, line.productId, qty, line.lineNo)
          await adjustStock(
            tx,
            { ...common, locationId: line.targetLocationId, statusId: line.targetStatusId },
            line.unitId,
            qty,          )
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
      include: { operationType: true, lines: { orderBy: { lineNo: 'asc' } } },
    })

    if (doc.status !== 'COMPLETED') throw new MovementError('Sadece COMPLETED belge ters kaydedilebilir')

    const dir = doc.operationType.direction

    if (doc.operationType.affectsStock) {
      for (const line of doc.lines) {
        const qty = line.quantity
        const common = {
          companyId: doc.companyId,
          productId: line.productId,
          batchNo: line.batchNo,
          serialNo: line.serialNo,
          palletId: line.palletId,
        }

        // Önce iadeleri (kaynak +) uygula, sonra azaltmaları (hedef −) — geçici eksiyi önler
        if (dir === 'OUTBOUND' || dir === 'INTERNAL') {
          await adjustStock(
            tx,
            { ...common, locationId: line.sourceLocationId!, statusId: line.sourceStatusId! },
            line.unitId,
            qty,          )
        }
        if (dir === 'INBOUND' || dir === 'INTERNAL') {
          await adjustStock(
            tx,
            { ...common, locationId: line.targetLocationId!, statusId: line.targetStatusId! },
            line.unitId,
            qty.negated(),          )
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
