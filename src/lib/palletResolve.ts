import type { Prisma } from '@prisma/client'
import { prisma } from './prisma.js'

/**
 * PALET ÇÖZÜMLEME — okutmada gelen palet NUMARASINI palet KAYDINA bağlar.
 *
 * İlk mal kabulde palet sistemde YOKTUR: tedarikçinin etiketindeki palet no
 * (paletno/ürün/parti/SKT/adet/birim bileşik barkodundan gelir) ilk kez o
 * okutmada görülür. Girişte palet kaydı OTOMATİK açılır — operatör önce
 * "palet tanımla" ekranına gitmek zorunda kalmasın.
 *
 * Çıkışta/iç harekette otomatik açılmaz: olmayan bir paletten mal çıkarmak
 * ya da taşımak hatadır, sessizce yeni palet yaratmak veriyi bozar.
 *
 * Palet tipi sırayla: numaranın öneki ile eşleşen tip → operasyona bağlı tek tip
 * → firmadaki tek aktif tip. Hiçbiri belirlenemezse hata (tip seçtirilir).
 */

export class PalletResolveError extends Error {}

export interface PalletResolveResult {
  palletId: number
  palletNo: string
  created: boolean
  palletTypeCode: string
}

/** Palet no → palet tipi: önek eşleşmesi (en uzun önek kazanır), sonra operasyon, sonra tek tip. */
async function palletTypeFor(
  tx: Prisma.TransactionClient, companyId: number, palletNo: string, operationTypeId?: number | null,
) {
  const tipler = await tx.tBLPALLETTYPE.findMany({
    where: { companyId, isActive: true }, include: { sequence: { select: { prefix: true } } }, orderBy: { id: 'asc' },
  })
  if (!tipler.length) throw new PalletResolveError('Palet tipi tanımlı değil — Uyarlamalar › Genel › Palet Tipleri')

  // Önek: önce tipin SAYACININ öneki (numarayı o üretiyor), sonra tip kodu.
  // En uzun eşleşen önek kazanır (P ile PLT çakışmasın).
  const adaylar = tipler
    .flatMap((t) => [t.sequence?.prefix, t.code].filter((v): v is string => !!v).map((onek) => ({ t, onek })))
    .filter((x) => palletNo.toUpperCase().startsWith(x.onek.toUpperCase()))
    .sort((a, b) => b.onek.length - a.onek.length)
  if (adaylar[0]) return adaylar[0].t

  if (operationTypeId) {
    const baglar = await tx.tBLOPERATIONTYPEPALLETTYPE.findMany({
      where: { companyId, operationTypeId }, select: { palletTypeId: true },
    })
    const tekil = [...new Set(baglar.map((b) => b.palletTypeId))]
    if (tekil.length === 1) {
      const t = tipler.find((x) => x.id === tekil[0])
      if (t) return t
    }
  }

  if (tipler.length === 1) return tipler[0]!
  throw new PalletResolveError(
    `"${palletNo}" için palet tipi belirlenemedi — numara tanımlı öneklerin hiçbiriyle başlamıyor ` +
      `(${tipler.map((t) => `${t.code}${t.sequence?.prefix && t.sequence.prefix !== t.code ? ` [sayaç öneki ${t.sequence.prefix}]` : ''}`).join(', ')})`,
  )
}

/**
 * Palet numarasını çöz; girişte yoksa AÇ.
 * @param allowCreate INBOUND'da true — çıkış/iç harekette false (olmayan palet hata verir).
 */
export async function resolveOrCreatePallet(
  tx: Prisma.TransactionClient,
  companyId: number,
  rawPalletNo: string,
  opts: { allowCreate: boolean; operationTypeId?: number | null; baseUnitId?: number | null },
): Promise<PalletResolveResult> {
  const palletNo = rawPalletNo.trim()
  if (!palletNo) throw new PalletResolveError('Palet no boş')

  const mevcut = await tx.tBLPALLET.findFirst({
    where: { companyId, palletNo }, include: { palletType: { select: { code: true } } },
  })
  if (mevcut) return { palletId: mevcut.id, palletNo, created: false, palletTypeCode: mevcut.palletType?.code ?? '' }

  if (!opts.allowCreate) {
    throw new PalletResolveError(`Palet bulunamadı: ${palletNo} — var olmayan paletten çıkış/transfer yapılamaz`)
  }

  const tip = await palletTypeFor(tx, companyId, palletNo, opts.operationTypeId)
  const yeni = await tx.tBLPALLET.create({
    data: {
      companyId, palletNo, palletTypeId: tip.id,
      baseUnitId: opts.baseUnitId ?? undefined, isActive: true,
    },
  })
  return { palletId: yeni.id, palletNo, created: true, palletTypeCode: tip.code }
}
