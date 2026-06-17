import { prisma } from './prisma.js'

export class BarcodeError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'BarcodeError'
  }
}

type ExcludeOpts = {
  excludeBarcodeRowId?: number // PATCH: kendi çoklu-barkod satırını hariç tut
}

/**
 * Bir barkod firma genelinde TEK olmalı. Tek kaynak = TBLPRODUCTUNITBARCODE (ölçü birimine bağlı çoklu barkod).
 * Aynı barkod farklı bir ürün/birimde tekrar edemez. Boş/null barkod kontrol edilmez.
 * Çakışma bulunursa BarcodeError fırlatır (route 409'a çevirir).
 */
export async function assertBarcodeUnique(companyId: number, barcode: string | null | undefined, opts: ExcludeOpts = {}): Promise<void> {
  if (!barcode) return

  const inMulti = await prisma.tBLPRODUCTUNITBARCODE.findFirst({
    where: { barcode, productUnit: { product: { companyId } }, ...(opts.excludeBarcodeRowId ? { id: { not: opts.excludeBarcodeRowId } } : {}) },
    select: { productUnit: { select: { product: { select: { code: true } }, unit: { select: { code: true } } } } },
  })
  if (inMulti) {
    const p = inMulti.productUnit
    throw new BarcodeError(`"${barcode}" barkodu zaten kullanılıyor (${p.product.code} / ${p.unit?.code ?? '—'})`)
  }
}
