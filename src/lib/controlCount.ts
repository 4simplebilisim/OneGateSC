import { Prisma } from '@prisma/client'
import { prisma } from './prisma.js'

/**
 * KONTROL SAYIM (TBLCONTROLCOUNT) — stok DEĞİŞTİRMEYEN doğrulama sayımı.
 *
 * Ekran vardı, elle satır girmekten başka bir şey yapmıyordu. Gerçek işi:
 * bir deponun anlık stoğunu FOTOĞRAFLAR (sistem miktarı), operatör sayar,
 * fark raporlanır. Normal sayımın aksine STOK DÜZELTMEZ — bu yüzden
 * "kontrol": tutarsızlığı görmek için, düzeltmek için değil. Düzeltme
 * gerekiyorsa gerçek sayım (TBLSTOCKCOUNT) açılır.
 */

export class ControlCountError extends Error {}

export interface ControlCountDiff {
  lineId: number
  productId: number
  productCode: string
  productName: string | null
  unitCode: string | null
  systemQty: string
  countedQty: string | null
  diff: string | null
  status: 'EKSİK' | 'FAZLA' | 'UYUMLU' | 'SAYILMADI'
}

/**
 * Depo stoğunu fotoğraflayarak kontrol sayımı aç.
 * Ürün kırılımı (lokasyon/parti/palet birleştirilir) — kontrol sayımı ürün toplamına bakar.
 */
export async function createControlCount(
  companyId: number,
  args: { warehouseId: number; code?: string | null; referenceCode?: string | null; note?: string | null },
) {
  const depo = await prisma.tBLWAREHOUSE.findFirst({ where: { id: args.warehouseId, companyId }, select: { id: true, code: true } })
  if (!depo) throw new ControlCountError('Depo bulunamadı')

  const lokasyonlar = await prisma.tBLLOCATION.findMany({ where: { companyId, warehouseId: depo.id }, select: { id: true } })
  if (!lokasyonlar.length) throw new ControlCountError('Depoda lokasyon yok')

  const stok = await prisma.tBLSTOCK.groupBy({
    by: ['productId', 'unitId'],
    where: { companyId, locationId: { in: lokasyonlar.map((l) => l.id) }, mainQty: { gt: 0 } },
    _sum: { mainQty: true },
  })
  if (!stok.length) throw new ControlCountError('Depoda stok yok — kontrol sayımı açılamaz')

  return prisma.tBLCONTROLCOUNT.create({
    data: {
      companyId, warehouseId: depo.id,
      code: args.code || `KS-${depo.code}`,
      referenceCode: args.referenceCode || null,
      note: args.note || null,
      lines: {
        create: stok.map((s, i) => ({
          companyId, lineNo: i + 1, productId: s.productId, unitId: s.unitId,
          mainQty: s._sum.mainQty ?? new Prisma.Decimal(0),
        })),
      },
    },
    include: { lines: { orderBy: { lineNo: 'asc' } } },
  })
}

/** Sayılan miktarı yaz. Onaylanmış kontrol sayımı değiştirilemez. */
export async function setControlCounted(companyId: number, id: number, lineId: number, countedQty: number) {
  const head = await prisma.tBLCONTROLCOUNT.findFirst({ where: { id, companyId } })
  if (!head) throw new ControlCountError('Kontrol sayımı bulunamadı')
  if (head.approvedAt) throw new ControlCountError('Onaylanmış kontrol sayımı değiştirilemez')
  const line = await prisma.tBLCONTROLCOUNTLINE.findFirst({ where: { id: lineId, controlCountId: id } })
  if (!line) throw new ControlCountError('Satır bulunamadı')
  return prisma.tBLCONTROLCOUNTLINE.update({ where: { id: lineId }, data: { countedQty } })
}

/** Onayla — kilitler. Stok DEĞİŞMEZ (kontrol sayımının tanımı bu). */
export async function approveControlCount(companyId: number, id: number) {
  const head = await prisma.tBLCONTROLCOUNT.findFirst({ where: { id, companyId }, include: { lines: true } })
  if (!head) throw new ControlCountError('Kontrol sayımı bulunamadı')
  if (head.approvedAt) throw new ControlCountError('Zaten onaylanmış')
  if (!head.lines.some((l) => l.countedQty != null)) throw new ControlCountError('Hiç satır sayılmamış')
  return prisma.tBLCONTROLCOUNT.update({ where: { id }, data: { approvedAt: new Date() } })
}

/** Sistem ↔ sayılan farkı. */
export async function controlCountDifferences(companyId: number, id: number): Promise<ControlCountDiff[]> {
  const head = await prisma.tBLCONTROLCOUNT.findFirst({
    where: { id, companyId },
    include: { lines: { orderBy: { lineNo: 'asc' } } },
  })
  if (!head) throw new ControlCountError('Kontrol sayımı bulunamadı')

  const urunler = await prisma.tBLPRODUCT.findMany({
    where: { id: { in: head.lines.map((l) => l.productId) } }, select: { id: true, code: true, name: true },
  })
  const birimIds = head.lines.map((l) => l.unitId).filter((v): v is number => v != null)
  const birimler = birimIds.length
    ? await prisma.tBLUNIT.findMany({ where: { id: { in: birimIds } }, select: { id: true, code: true } })
    : []
  const urunOf = new Map(urunler.map((u) => [u.id, u]))
  const birimOf = new Map(birimler.map((b) => [b.id, b.code]))

  return head.lines.map((l) => {
    const u = urunOf.get(l.productId)
    const fark = l.countedQty != null ? new Prisma.Decimal(l.countedQty).sub(l.mainQty) : null
    return {
      lineId: l.id, productId: l.productId,
      productCode: u?.code ?? `#${l.productId}`, productName: u?.name ?? null,
      unitCode: l.unitId != null ? (birimOf.get(l.unitId) ?? null) : null,
      systemQty: l.mainQty.toString(),
      countedQty: l.countedQty != null ? l.countedQty.toString() : null,
      diff: fark ? fark.toString() : null,
      status: fark == null ? 'SAYILMADI' : fark.isZero() ? 'UYUMLU' : fark.gt(0) ? 'FAZLA' : 'EKSİK',
    }
  })
}
