import type { Prisma } from '@prisma/client'

/**
 * PALET KURALLARI — palet tipi bayrakları + operasyonun "aynı palet kullanılsın"ı.
 *
 * Dört tanım ekranda vardı ama hiçbir kod okumuyordu:
 *   · mixingType / singleProductControl → TEK ÜRÜN PALET (BYTTIP / BYTTEKURUNKONTROLU)
 *   · batchControl                      → PARTİ KONTROLÜ (BYTBATCHKONTROL)
 *   · isDivisible / partialUse          → BÖLÜNEBİLİRLİK (BYTBOLUNEMEZ / BYTPARCALIKULLANIM)
 * Operasyon tarafında:
 *   · sameUsePallet                     → AYNI PALET KULLANILSIN (BYTAYNIPALETKULLANILSIN)
 *
 * Hepsi KISITLAMA-LİSTESİ deseninde: bayrak kapalıysa hiçbir şey değişmez.
 *
 * NOT: bu kontrol OKUTMADA çalışır. movement.ts'te okutmalı satırlar erken
 * `continue` ile çıktığı için oradaki palet kontrolü okutma akışında hiç
 * çalışmıyordu — kural artık operatörün karşısına anında çıkıyor.
 */

export interface PalletCheckInput {
  companyId: number
  palletId: number
  productId: number
  /** Okutulan parti (yoksa satırdan miras) */
  batchNo?: string | null
  /** INBOUND / OUTBOUND / INTERNAL */
  direction: 'INBOUND' | 'OUTBOUND' | 'INTERNAL' | 'COUNT'
  /** Operasyon: aynı palet kullanılsın açık mı */
  sameUsePallet: boolean
  /** Çıkış/transferde paletten çekilecek miktar (kısmi mi tam mı) */
  quantity?: Prisma.Decimal | number | null
}

/** Kural ihlali varsa Türkçe hata metni, yoksa null. */
export async function checkPalletRules(
  tx: Prisma.TransactionClient, input: PalletCheckInput,
): Promise<string | null> {
  const palet = await tx.tBLPALLET.findFirst({
    where: { id: input.palletId, companyId: input.companyId },
    include: { palletType: true },
  })
  if (!palet) return null // palet çözümlemesi ayrı yerde hata veriyor
  const tip = palet.palletType

  const icerik = await tx.tBLSTOCK.findMany({
    where: { companyId: input.companyId, palletId: palet.id, mainQty: { gt: 0 } },
    select: { productId: true, batchNo: true, mainQty: true, product: { select: { code: true } } },
  })

  // ── GİRİŞ: palete yeni mal konuyor ──
  if (input.direction === 'INBOUND' || input.direction === 'INTERNAL') {
    // 1) Aynı palet kullanılsın KAPALI → dolu palete ekleme yok
    if (input.direction === 'INBOUND' && !input.sameUsePallet && icerik.length) {
      return `Palet ${palet.palletNo} zaten kullanımda (${icerik.length} satır) — yeni palet gerekli. ` +
        'Aynı palete eklemek için Operasyon Tipi › "Aynı Palet Kullanılsın" açılmalı.'
    }
    // 2) Tek ürün paleti → farklı ürün eklenemez
    const tekUrun = tip?.mixingType === 'SINGLE_PRODUCT' || tip?.singleProductControl
    if (tekUrun) {
      const baska = icerik.find((s) => s.productId !== input.productId)
      if (baska) {
        return `Palet ${palet.palletNo} TEK ÜRÜN paleti (${tip?.code}) — üzerinde ${baska.product?.code ?? baska.productId} var, ` +
          'farklı ürün eklenemez.'
      }
    }
    // 3) Parti kontrolü → palette tek parti
    if (tip?.batchControl) {
      const gelen = (input.batchNo ?? '').trim()
      const farkli = icerik.find((s) => (s.batchNo ?? '') !== gelen)
      if (farkli) {
        return `Palet ${palet.palletNo} PARTİ KONTROLLÜ (${tip.code}) — üzerinde "${farkli.batchNo ?? '(partisiz)'}" partisi var, ` +
          `"${gelen || '(partisiz)'}" eklenemez.`
      }
    }
  }

  // ── ÇIKIŞ/TRANSFER: paletten mal alınıyor ──
  if (input.direction === 'OUTBOUND' || input.direction === 'INTERNAL') {
    const bolunemez = tip && !tip.isDivisible && !tip.partialUse
    if (bolunemez && input.quantity != null && icerik.length) {
      const eldeki = icerik
        .filter((s) => s.productId === input.productId)
        .reduce((t, s) => t.add(s.mainQty), icerik[0]!.mainQty.sub(icerik[0]!.mainQty)) // Decimal(0)
      const cekilen = typeof input.quantity === 'number' ? input.quantity : Number(input.quantity)
      if (Number(eldeki) > 0 && cekilen < Number(eldeki)) {
        return `Palet ${palet.palletNo} BÖLÜNEMEZ (${tip.code}) — palette ${eldeki} var, ${cekilen} çekilemez. ` +
          'Tamamını alın ya da palet tipinde "Parçalı Kullanım"/"Bölünebilir" açın.'
      }
    }
  }

  return null
}
