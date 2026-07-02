import { prisma } from './prisma.js'

// Kanonik rapor tanımları (StokBar Raporları eşleniği). ReportCenter (Rapor Merkezi) bunları tüketir.
// Yeni rapor: REPORTS'a ekle + reportBuilder.ts'te sourceKey motorunu tanımla. Idempotent (seedReports tekrar çalıştırılabilir).

type CritDef = { fieldCode: string; label: string; type: 'TEXT' | 'NUMBER' | 'DATE' | 'SELECT' | 'REF'; refResource?: string; options?: string; required?: boolean; sortOrder: number }
type FieldDef = { fieldCode: string; label: string; align?: 'left' | 'right'; sortOrder: number }
type ReportDef = { code: string; name: string; sourceKey: string; category: string; criteria: CritDef[]; fields: FieldDef[] }

// Hareket analizi (Çıkış/Giriş/Transfer) ortak kriter + saha — StokBar ekranındaki filtrelerin birebiri (motorun desteklediği alt küme).
const MOVEMENT_CRITERIA: CritDef[] = [
  { fieldCode: 'facilityId', label: 'Tesis', type: 'REF', refResource: 'facilities', required: true, sortOrder: 1 },
  { fieldCode: 'operationTypeId', label: 'Operasyon Tipi', type: 'REF', refResource: 'operation-types', sortOrder: 2 },
  { fieldCode: 'documentNo', label: 'Belge No', type: 'TEXT', sortOrder: 3 },
  { fieldCode: 'userId', label: 'Kullanıcı', type: 'REF', refResource: 'users', sortOrder: 4 },
  { fieldCode: 'partnerId', label: 'Müşteri', type: 'REF', refResource: 'partners', sortOrder: 5 },
  { fieldCode: 'warehouseId', label: 'Depo', type: 'REF', refResource: 'warehouses', sortOrder: 6 },
  { fieldCode: 'areaId', label: 'Alan', type: 'REF', refResource: 'areas', sortOrder: 7 },
  { fieldCode: 'locationId', label: 'Lokasyon', type: 'REF', refResource: 'locations', sortOrder: 8 },
  { fieldCode: 'productId', label: 'Ürün', type: 'REF', refResource: 'products', sortOrder: 9 },
  { fieldCode: 'palletId', label: 'Palet No', type: 'REF', refResource: 'pallets', sortOrder: 10 },
  { fieldCode: 'batchNo', label: 'Batch No', type: 'TEXT', sortOrder: 11 },
  { fieldCode: 'statusId', label: 'Statü', type: 'REF', refResource: 'statuses', sortOrder: 12 },
  { fieldCode: 'dateFrom', label: 'Onay Tarihi Baş.', type: 'DATE', sortOrder: 13 },
  { fieldCode: 'dateTo', label: 'Onay Tarihi Bit.', type: 'DATE', sortOrder: 14 },
]
const MOVEMENT_FIELDS: FieldDef[] = [
  { fieldCode: 'tarih', label: 'Tarih', sortOrder: 1 },
  { fieldCode: 'belgeNo', label: 'Belge No', sortOrder: 2 },
  { fieldCode: 'operasyon', label: 'Operasyon', sortOrder: 3 },
  { fieldCode: 'cari', label: 'Cari', sortOrder: 4 },
  { fieldCode: 'urun', label: 'Ürün', sortOrder: 5 },
  { fieldCode: 'depo', label: 'Depo', sortOrder: 6 },
  { fieldCode: 'lokasyon', label: 'Lokasyon', sortOrder: 7 },
  { fieldCode: 'giris', label: 'Giriş', align: 'right', sortOrder: 8 },
  { fieldCode: 'cikis', label: 'Çıkış', align: 'right', sortOrder: 9 },
  { fieldCode: 'birim', label: 'Birim', sortOrder: 10 },
  { fieldCode: 'batch', label: 'Batch', sortOrder: 11 },
  { fieldCode: 'palet', label: 'Palet', sortOrder: 12 },
  { fieldCode: 'statu', label: 'Statü', sortOrder: 13 },
  { fieldCode: 'kullanici', label: 'Kullanıcı', sortOrder: 14 },
]

const REPORTS: ReportDef[] = [
  {
    code: 'ACIK-BELGE', name: 'Açık Belge Listesi', sourceKey: 'OPEN_DOCUMENTS', category: 'Belge',
    criteria: [
      { fieldCode: 'operationTypeId', label: 'Operasyon Tipi', type: 'REF', refResource: 'operation-types', sortOrder: 1 },
      { fieldCode: 'productId', label: 'Ürün', type: 'REF', refResource: 'products', sortOrder: 2 },
      { fieldCode: 'palletId', label: 'Palet No', type: 'REF', refResource: 'pallets', sortOrder: 3 },
      { fieldCode: 'batchNo', label: 'Batch No', type: 'TEXT', sortOrder: 4 },
    ],
    fields: [
      { fieldCode: 'belgeNo', label: 'Belge No', sortOrder: 1 },
      { fieldCode: 'operasyon', label: 'Operasyon', sortOrder: 2 },
      { fieldCode: 'yon', label: 'Yön', sortOrder: 3 },
      { fieldCode: 'cari', label: 'Cari', sortOrder: 4 },
      { fieldCode: 'durum', label: 'Durum', sortOrder: 5 },
      { fieldCode: 'tarih', label: 'Belge Tarihi', sortOrder: 6 },
      { fieldCode: 'satir', label: 'Satır', align: 'right', sortOrder: 7 },
    ],
  },
  // Çıkış Hareketleri Analizi — yalnız ÇIKIŞ (OUTBOUND) operasyonlarının ledger hareketleri.
  { code: 'HRK-CIKIS', name: 'Çıkış Hareketleri Analizi', sourceKey: 'MOVEMENTS_OUT', category: 'Hareket', criteria: MOVEMENT_CRITERIA, fields: MOVEMENT_FIELDS },
  // Giriş Hareketleri Analizi — yalnız GİRİŞ (INBOUND).
  { code: 'HRK-GIRIS', name: 'Giriş Hareketleri Analizi', sourceKey: 'MOVEMENTS_IN', category: 'Hareket', criteria: MOVEMENT_CRITERIA, fields: MOVEMENT_FIELDS },
  // Transfer Hareketleri Analizi — yalnız İÇ (INTERNAL) transfer (kaynak −, hedef +).
  { code: 'HRK-TRANSFER', name: 'Transfer Hareketleri Analizi', sourceKey: 'MOVEMENTS_TR', category: 'Hareket', criteria: MOVEMENT_CRITERIA, fields: MOVEMENT_FIELDS },
  // Palet İzleme — paletin ŞU ANKİ konumu (güncel stok, geçmiş değil).
  {
    code: 'PALET-IZLEME', name: 'Palet İzleme', sourceKey: 'PALLET_TRACK', category: 'Palet',
    criteria: [
      { fieldCode: 'facilityId', label: 'Tesis', type: 'REF', refResource: 'facilities', required: true, sortOrder: 1 },
      { fieldCode: 'warehouseId', label: 'Depo', type: 'REF', refResource: 'warehouses', sortOrder: 2 },
      { fieldCode: 'areaId', label: 'Alan', type: 'REF', refResource: 'areas', sortOrder: 3 },
      { fieldCode: 'locationId', label: 'Lokasyon', type: 'REF', refResource: 'locations', sortOrder: 4 },
      { fieldCode: 'palletId', label: 'Palet No', type: 'REF', refResource: 'pallets', sortOrder: 5 },
      { fieldCode: 'productId', label: 'Ürün', type: 'REF', refResource: 'products', sortOrder: 6 },
      { fieldCode: 'batchNo', label: 'Batch No', type: 'TEXT', sortOrder: 7 },
      { fieldCode: 'statusId', label: 'Statü', type: 'REF', refResource: 'statuses', sortOrder: 8 },
    ],
    fields: [
      { fieldCode: 'palet', label: 'Palet', sortOrder: 1 },
      { fieldCode: 'tesis', label: 'Tesis', sortOrder: 2 },
      { fieldCode: 'depo', label: 'Depo', sortOrder: 3 },
      { fieldCode: 'lokasyon', label: 'Lokasyon', sortOrder: 4 },
      { fieldCode: 'urun', label: 'Ürün', sortOrder: 5 },
      { fieldCode: 'batchNo', label: 'Batch', sortOrder: 6 },
      { fieldCode: 'statu', label: 'Statü', sortOrder: 7 },
      { fieldCode: 'miktar', label: 'Miktar', align: 'right', sortOrder: 8 },
      { fieldCode: 'birim', label: 'Birim', sortOrder: 9 },
    ],
  },
  // Palet Tarihçesi — paletin stok girişinden çıkışına kadarki hareket geçmişi (LEDGER, kronolojik giriş→çıkış).
  // Palet İzleme'den (STOCK, güncel konum) AYRI. Kaynak: ledger (Palet İzleme=güncel, Tarihçe=geçmiş).
  {
    code: 'PALET-TARIHCE', name: 'Palet Tarihçesi', sourceKey: 'PALLET_HISTORY', category: 'Palet',
    criteria: [
      { fieldCode: 'parentPalletId', label: 'Üst Palet No', type: 'REF', refResource: 'pallets', sortOrder: 1 },
      { fieldCode: 'palletId', label: 'Palet No', type: 'REF', refResource: 'pallets', sortOrder: 2 },
      { fieldCode: 'statusId', label: 'Durum', type: 'REF', refResource: 'statuses', sortOrder: 3 },
      { fieldCode: 'limit', label: 'Kayıt Sayısı', type: 'NUMBER', sortOrder: 4 },
    ],
    fields: [
      { fieldCode: 'tarih', label: 'Tarih', sortOrder: 1 },
      { fieldCode: 'palet', label: 'Palet', sortOrder: 2 },
      { fieldCode: 'ustPalet', label: 'Üst Palet', sortOrder: 3 },
      { fieldCode: 'operasyon', label: 'Operasyon', sortOrder: 4 },
      { fieldCode: 'belgeNo', label: 'Belge No', sortOrder: 5 },
      { fieldCode: 'depo', label: 'Depo', sortOrder: 6 },
      { fieldCode: 'lokasyon', label: 'Lokasyon', sortOrder: 7 },
      { fieldCode: 'giris', label: 'Giriş', align: 'right', sortOrder: 8 },
      { fieldCode: 'cikis', label: 'Çıkış', align: 'right', sortOrder: 9 },
      { fieldCode: 'birim', label: 'Birim', sortOrder: 10 },
      { fieldCode: 'statu', label: 'Statü', sortOrder: 11 },
      { fieldCode: 'kullanici', label: 'Kullanıcı', sortOrder: 12 },
    ],
  },
]

/** Bir firmaya kanonik raporları seed'ler (idempotent — kriter/saha sil-yeniden). Döner: seed'lenen rapor sayısı. */
export async function seedReports(companyId: number): Promise<number> {
  for (const r of REPORTS) {
    const def = await prisma.tBLREPORTDEF.upsert({
      where: { companyId_code: { companyId, code: r.code } },
      update: { name: r.name, sourceKey: r.sourceKey, category: r.category, isActive: true },
      create: { companyId, code: r.code, name: r.name, sourceKey: r.sourceKey, category: r.category, isActive: true },
    })
    await prisma.tBLREPORTCRITERIA.deleteMany({ where: { reportId: def.id } })
    await prisma.tBLREPORTFIELD.deleteMany({ where: { reportId: def.id } })
    if (r.criteria.length) await prisma.tBLREPORTCRITERIA.createMany({ data: r.criteria.map((c) => ({ reportId: def.id, companyId, ...c })) })
    if (r.fields.length) await prisma.tBLREPORTFIELD.createMany({ data: r.fields.map((f) => ({ reportId: def.id, companyId, ...f })) })
  }
  return REPORTS.length
}
