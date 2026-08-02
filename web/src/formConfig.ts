import { PARAM_CATALOG } from './paramCatalog'

// Hangi kaynakların create/edit formu var + alanları (API create şemalarına birebir)
export interface FieldDef {
  name: string
  label: string
  type?: 'text' | 'number' | 'bool' | 'select' | 'ref' | 'color' | 'textarea'
  required?: boolean
  options?: { value: string | number; label: string }[]
  refResource?: string // type 'ref' için seçenekleri buradan çeker
  refFilter?: (row: Record<string, unknown>) => boolean // ref seçeneklerini süz (ör. sadece COUNT operasyon tipi)
  dependsOn?: string // bu ref, başka alanın (ör. warehouseId) değerine bağlı: o değişince /api/<refResource>?<dependsOn>=<val> ile yeniden çekilir + sıfırlanır
  dependsOnParam?: string // dependsOn değerinin query param ADI farklıysa (ör. dependsOn:'materialLinkCode' → ?productId=<val>)
  dependsOnWhen?: { field: string; equals: unknown } // bağımlılık yalnız bu koşulda uygulanır; değilse parametresiz (tam liste) yüklenir
  refResourceBy?: { field: string; map: Record<string, string> } // ref KAYNAĞI başka alanın değerine göre seçilir (ör. Bağ. Tipi: LOCATION→locations, LOCATION_GROUP→location-groups); değer değişince seçenekler yenilenir + seçim sıfırlanır
  disabledWhen?: { field: string; equals: unknown } // başka alanın değeri eşitse bu alan tıklanamaz + kayıtta atılır (ör. Bağ.=Hepsi → Cari/Ürün seçilemez)
}

// Belge Durum İşlem — İşlem Tipi (BYTISLEMTIP, tinyint). Etiketler StokBar dropdown sırasına göre.
// NOT: int kodlar StokBar uygulama enum'unda; katalog yalnızca kolon tipini taşıyor → sıra-bazlı 1..16 atandı (gerekirse remap).
export const DOC_ACTION_TYPE_OPTS = [
  { value: 1, label: 'Toplama' },
  { value: 2, label: 'Topl. İptal' },
  { value: 3, label: 'Onay' },
  { value: 4, label: 'Güncelleme' },
  { value: 5, label: 'Silme' },
  { value: 6, label: 'Tamam Onayı' },
  { value: 7, label: 'Tamam Onayı İptal' },
  { value: 8, label: 'Onay İptal' },
  { value: 9, label: 'Bölme' },
  { value: 10, label: 'Batch Atama' },
  { value: 11, label: 'Palet Oluşturma' },
  { value: 12, label: 'Hazırlama' },
  { value: 13, label: 'Hazırlama İptal' },
  { value: 14, label: 'Kalite Numune Alımı' },
  { value: 15, label: 'Kalite Değer Girişi' },
  { value: 16, label: 'Nakliye Sevkiyat Planlama' },
]

// Bağlantı kapsamı (LinkScope) — Hepsi/Grup/Belirli
export const SCOPE_OPTS = [{ value: 'ALL', label: 'Hepsi' }, { value: 'GROUP', label: 'Grup' }, { value: 'SPECIFIC', label: 'Belirli' }]

// Belge Durum Kriter koşulları (Faz 2: veri-güdümlü kural — backend documentStatus.ts DocCondition ile birebir)
export const DOC_CONDITION_OPTS = [
  { value: 'CANCELLED', label: 'İptal edildi' },
  { value: 'COMPLETED', label: 'Tamamlandı' },
  { value: 'CONFIRMED', label: 'Onaya gönderildi' },
  { value: 'NONE_COLLECTED', label: 'Hiç toplanmadı' },
  { value: 'PARTIAL', label: 'Kısmi toplandı (eksik var)' },
  { value: 'FULLY_COLLECTED', label: 'Tam toplandı (eksik yok)' },
  { value: 'ANY_COLLECTED', label: 'Bir şey toplandı' },
]

// Giriş/Çıkış koşulu kontrol tipi (SSP yerine yerleşik kontroller)
export const CONDITION_CONTROL_OPTS = [
  { value: 'MANUAL', label: 'Manuel Onay (gate)' },
  { value: 'REQUIRE_BATCH', label: 'Parti No Zorunlu' },
  { value: 'REQUIRE_SERIAL', label: 'Seri No Zorunlu' },
  { value: 'REQUIRE_REASON', label: 'Neden Zorunlu' },
  { value: 'CONTROL_FIELD_REQUIRED', label: 'Kontrol Sahası Dolu (çıkış)' },
  { value: 'MIN_SHELF_LIFE', label: 'Min. Raf Ömrü — Gün (çıkış)' },
]

const codeName = (codeLabel = 'Kod', nameLabel = 'Ad'): FieldDef[] => [
  { name: 'code', label: codeLabel, type: 'text', required: true },
  { name: 'name', label: nameLabel, type: 'text', required: true },
  { name: 'isActive', label: 'Aktif', type: 'bool' },
]

// Operasyon junction'ları flat menüde — ortak alan parçaları (LinkTab ile aynı, +operationTypeId seçici)
const OP_TYPE_REF: FieldDef = { name: 'operationTypeId', label: 'Operasyon Tipi', type: 'ref', required: true, refResource: 'operation-types' }
const TESIS_REF: FieldDef = { name: 'facilityId', label: 'Tesis', type: 'ref', refResource: 'facilities' }
const CARI_SCOPE: FieldDef[] = [
  { name: 'cariLinkType', label: 'Cari Bağ.', type: 'select', options: SCOPE_OPTS },
  { name: 'cariLinkId', label: 'Cari', type: 'ref', refResource: 'partners', disabledWhen: { field: 'cariLinkType', equals: 'ALL' } },
]
const MAT_SCOPE: FieldDef[] = [
  { name: 'materialLinkType', label: 'Malzeme Bağ.', type: 'select', options: SCOPE_OPTS },
  { name: 'materialLinkId', label: 'Ürün', type: 'ref', refResource: 'products', disabledWhen: { field: 'materialLinkType', equals: 'ALL' } },
]
const BULK_ACTION_OPTS = [
  { value: 'CONTROLLED_BULK', label: 'Kontrollü Toplu İşlem' },
  { value: 'BULK', label: 'Toplu İşlem' },
  { value: 'RESERVATION', label: 'Rezervasyon' },
  { value: 'SELECTED_DOCUMENT', label: 'Seçimli Belge' },
  { value: 'BATCH_CHANGE', label: 'Batch Değiştirme' },
]

// Ek Saha (custom field) enum'ları — Dinamik/Statik birleşik
export const EXTRA_FIELD_KIND_OPTS = [
  { value: 'DYNAMIC', label: 'Dinamik' },
  { value: 'STATIC', label: 'Statik' },
]
export const EXTRA_FIELD_ENTITY_OPTS = [
  { value: 'MATERIAL', label: 'Malzeme' },
  { value: 'PARTNER', label: 'Cari' },
  { value: 'DOC_HEADER', label: 'Belge Başlık' },
  { value: 'DOC_DETAIL', label: 'Belge Detay' },
  { value: 'DOC_SCOPE', label: 'Belge Kapsam' },
  { value: 'PALLET', label: 'Palet' },
  { value: 'STOCK', label: 'Stok' },
  { value: 'PALLET_NOTIFY_HEADER', label: 'Palet Bildirim Başlık' },
  { value: 'OPERATION_DOC_DETAIL', label: 'Operasyon Belge Detay' },
]
export const EXTRA_FIELD_DATATYPE_OPTS = [
  { value: 'MULTI_SELECT_FIXED', label: 'Çoktan Seçmeli Sabit' },
  { value: 'TEXT', label: 'Metin' },
  { value: 'NUMERIC', label: 'Sayısal' },
  { value: 'DATE', label: 'Tarih' },
  { value: 'LOOKUP', label: 'Rehber' },
]
// Dinamik Etiket Tipi item tipi (StokBar BYTTIP)
export const LABEL_ITEM_TYPE_OPTS = [
  { value: 'TEXT', label: 'Metin' },
  { value: 'NUMBER', label: 'Sayısal' },
  { value: 'DATE', label: 'Tarih' },
  { value: 'COMBO', label: 'Combo (Sorgu)' },
  { value: 'LOOKUP', label: 'Rehber' },
  { value: 'CHECKBOX', label: 'Onay Kutusu' },
  { value: 'BARCODE', label: 'Barkod' },
  { value: 'LABEL', label: 'Etiket' },
]

export const FORM_CONFIG: Record<string, FieldDef[]> = {
  // ── Sistem ──
  // WMS ↔ Procurement entegrasyonu: kayıt yoksa entegrasyon KAPALI (ürünler bağımsız çalışır)
  'platform-integration': [
    { name: 'isActive', label: 'Entegrasyon Aktif', type: 'bool' },
    { name: 'facilityId', label: 'Tesis (boş = tüm tesisler)', type: 'ref', refResource: 'facilities' },
    { name: 'receiptOperationTypeId', label: 'Mal Kabul Operasyon Tipi', type: 'ref', refResource: 'operation-types' },
    { name: 'autoCreateReceipt', label: 'Sipariş onayında mal kabul belgesi oluştur', type: 'bool' },
    { name: 'updateOrderOnComplete', label: 'Mal kabul tamamlanınca siparişi güncelle', type: 'bool' },
    { name: 'note', label: 'Not', type: 'text' },
  ],
  'company-licenses': [
    { name: 'applicationId', label: 'Ürün', type: 'ref', refResource: 'applications', required: true },
    { name: 'isActive', label: 'Aktif', type: 'bool' },
    { name: 'validFrom', label: 'Başlangıç (GG.AA.YYYY)', type: 'text' },
    { name: 'validUntil', label: 'Bitiş (boş = süresiz)', type: 'text' },
    { name: 'userLimit', label: 'Kullanıcı Limiti (boş = sınırsız)', type: 'number' },
    { name: 'note', label: 'Not', type: 'text' },
  ],
  companies: [
    { name: 'code', label: 'Firma Kodu', type: 'text', required: true },
    { name: 'name', label: 'Firma Adı', type: 'text', required: true },
    { name: 'isActive', label: 'Aktif', type: 'bool' },
  ],
  'user-groups': [
    { name: 'code', label: 'Grup Kodu', type: 'text', required: true },
    { name: 'name', label: 'Grup Adı', type: 'text', required: true },
    { name: 'isActive', label: 'Aktif', type: 'bool' },
  ],
  // El Terminali dinamik menü (grup + item→operasyon kodu)
  'handheld-menu-groups': [
    { name: 'code', label: 'Kod', type: 'text', required: true },
    { name: 'name', label: 'Grup Adı', type: 'text', required: true },
    { name: 'facilityId', label: 'Tesis', type: 'ref', refResource: 'facilities' },
    { name: 'sortOrder', label: 'Sıra', type: 'number' },
    { name: 'isActive', label: 'Aktif', type: 'bool' },
  ],
  'handheld-menu-items': [
    { name: 'code', label: 'Kod', type: 'text', required: true },
    { name: 'name', label: 'Menü Adı', type: 'text', required: true },
    { name: 'screenType', label: 'Ekran', type: 'select', required: true, options: [{ value: 'RECEIPT', label: 'Mal Kabul' }, { value: 'PICK', label: 'Toplama' }, { value: 'COUNT', label: 'Sayım' }, { value: 'STOCK', label: 'Stok Sorgu' }] },
    { name: 'operationTypeId', label: 'Operasyon Tipi', type: 'ref', refResource: 'operation-types' },
    { name: 'sortOrder', label: 'Sıra', type: 'number' },
    { name: 'isActive', label: 'Aktif', type: 'bool' },
  ],
  // ── Ek Saha (Dinamik+Statik birleşik) — StokBar Ek Saha Tanımlama ekranı. Tesis=firma=companyId (örtük). ──
  'extra-fields': [
    { name: 'facilityId', label: 'Tesis', type: 'ref', refResource: 'facilities' },
    { name: 'fieldKind', label: 'Tip (Dinamik/Statik)', type: 'select', required: true, options: EXTRA_FIELD_KIND_OPTS },
    { name: 'entityType', label: 'Uygulama Yeri', type: 'select', required: true, options: EXTRA_FIELD_ENTITY_OPTS },
    { name: 'trackingCode', label: 'Takip Kodu', type: 'text' },
    { name: 'description', label: 'Açıklama', type: 'text', required: true },
    { name: 'fieldDataType', label: 'Ek Saha Özelliği', type: 'select', required: true, options: EXTRA_FIELD_DATATYPE_OPTS },
    { name: 'defaultValue', label: 'Varsayılan Değer', type: 'text' },
    { name: 'maxAnswerCount', label: 'Maksimum Cevap Sayısı', type: 'number' },
    { name: 'minLength', label: 'Min. Uzunluk (dinamik)', type: 'number' },
    { name: 'maxLength', label: 'Maks. Uzunluk (dinamik)', type: 'number' },
    { name: 'isRequired', label: 'Zorunlu', type: 'bool' },
    { name: 'useAsIncrementing', label: 'Ürün Bazında Artan Değer Olarak Kullanılsın', type: 'bool' },
    { name: 'transferOnDocSplit', label: 'Belge Bölme İşleminde Aktarılsın', type: 'bool' },
    { name: 'reference', label: 'Referans', type: 'text' },
    { name: 'isActive', label: 'Aktif', type: 'bool' },
  ],
  // Dinamik Etiket Tipi (StokBar) — başlık + Item + Sorgu alt-ekranları
  'label-templates': [
    { name: 'code', label: 'Kod', type: 'text', required: true },
    { name: 'screenTitle', label: 'Ekran Başlık', type: 'text' },
    { name: 'labelName', label: 'Etiket Adı', type: 'text' },
    { name: 'menuGroupId', label: 'Menü Grubu', type: 'ref', refResource: 'menu-groups' },
    { name: 'col1Count', label: 'Kolon 1 Sayı', type: 'number' },
    { name: 'col2Count', label: 'Kolon 2 Sayı', type: 'number' },
    { name: 'col3Count', label: 'Kolon 3 Sayı', type: 'number' },
    { name: 'password', label: 'Şifre', type: 'text' },
    { name: 'isActive', label: 'Aktif', type: 'bool' },
  ],
  'label-template-items': [
    { name: 'title', label: 'Başlık', type: 'text' },
    { name: 'itemType', label: 'Tip', type: 'select', options: LABEL_ITEM_TYPE_OPTS },
    { name: 'designName', label: 'Dizayn İsim', type: 'text' },
    { name: 'displayName', label: 'Görünüm İsim', type: 'text' },
    { name: 'sortOrder', label: 'Sıra', type: 'number' },
    { name: 'width', label: 'Genişlik', type: 'number' },
    { name: 'maxLength', label: 'Maks. Uzunluk', type: 'number' },
    { name: 'defaultValue', label: 'Varsayılan', type: 'text' },
    { name: 'comboQuery', label: 'Combo Sorgu', type: 'text' },
    { name: 'isRequired', label: 'Zorunlu', type: 'bool' },
    { name: 'isVisible', label: 'Görünür', type: 'bool' },
  ],
  'label-template-queries': [
    { name: 'code', label: 'Kod', type: 'text' },
    { name: 'queryTitle', label: 'Sorgu Başlık', type: 'text' },
    { name: 'queryDetail', label: 'Sorgu (SQL)', type: 'text' },
    { name: 'bindingField', label: 'Bağlantı Sahası', type: 'text' },
  ],
  // Ek Saha seçenekleri (Çoktan Seçmeli / Rehber için)
  'extra-field-options': [
    { name: 'extraFieldId', label: 'Ek Saha', type: 'ref', required: true, refResource: 'extra-fields' },
    { name: 'code', label: 'Kod', type: 'text', required: true },
    { name: 'description', label: 'Açıklama', type: 'text' },
    { name: 'sortOrder', label: 'Sıra', type: 'number' },
    { name: 'reference', label: 'Referans', type: 'text' },
    { name: 'isActive', label: 'Aktif', type: 'bool' },
  ],
  // Sayım/Palet ek ekranları
  'control-counts': [
    { name: 'code', label: 'Belge Kodu', type: 'text' },
    { name: 'referenceCode', label: 'Referans Belge', type: 'text' },
    { name: 'warehouseId', label: 'Depo', type: 'ref', refResource: 'warehouses' },
    { name: 'note', label: 'Not', type: 'text' },
    { name: 'isActive', label: 'Aktif', type: 'bool' },
  ],
  'control-count-lines': [
    { name: 'productId', label: 'Ürün', type: 'ref', required: true, refResource: 'products' },
    { name: 'mainQty', label: 'Sistem Miktar', type: 'number' },
    { name: 'unitId', label: 'Birim', type: 'ref', refResource: 'units' },
    { name: 'countedQty', label: 'Sayılan', type: 'number' },
  ],
  'count-assignments': [
    { name: 'stockCountId', label: 'Sayım', type: 'ref', required: true, refResource: 'stock-counts' },
    { name: 'userId', label: 'Kullanıcı', type: 'ref', required: true, refResource: 'users' },
    { name: 'note', label: 'Not', type: 'text' },
    { name: 'isActive', label: 'Aktif', type: 'bool' },
  ],
  'pallet-notifications': [
    { name: 'palletNo', label: 'Palet No', type: 'text' },
    { name: 'oldPalletNo', label: 'Eski Palet No', type: 'text' },
    { name: 'palletTypeId', label: 'Palet Tipi', type: 'ref', refResource: 'pallet-types' },
    { name: 'locationId', label: 'Lokasyon', type: 'ref', refResource: 'locations' },
    { name: 'statusId', label: 'Statü', type: 'ref', refResource: 'statuses' },
    { name: 'partnerId', label: 'Cari', type: 'ref', refResource: 'partners' },
    { name: 'tripNo', label: 'Sefer No', type: 'text' },
    { name: 'note', label: 'Not', type: 'text' },
    { name: 'isActive', label: 'Aktif', type: 'bool' },
  ],
  'pallet-notification-lines': [
    { name: 'productId', label: 'Ürün', type: 'ref', required: true, refResource: 'products' },
    { name: 'mainQty', label: 'Miktar', type: 'number' },
    { name: 'unitId', label: 'Birim', type: 'ref', refResource: 'units' },
    { name: 'batchNo', label: 'Parti', type: 'text' },
    { name: 'serialNo', label: 'Seri', type: 'text' },
  ],
  // İş Atama — belge ↔ kullanıcı eşleştirme
  'document-assignments': [
    { name: 'documentId', label: 'Belge', type: 'ref', required: true, refResource: 'documents' },
    { name: 'userId', label: 'Kullanıcı', type: 'ref', required: true, refResource: 'users' },
    { name: 'note', label: 'Not', type: 'text' },
    { name: 'isActive', label: 'Aktif', type: 'bool' },
  ],
  // Operasyon Tipi Saha Bağlantı
  'operation-type-extra-fields': [
    { name: 'operationTypeId', label: 'Operasyon Tipi', type: 'ref', required: true, refResource: 'operation-types' },
    { name: 'extraFieldId', label: 'Ek Saha', type: 'ref', required: true, refResource: 'extra-fields' },
    { name: 'isStatic', label: 'Statik', type: 'bool' },
    { name: 'sortOrder', label: 'Sıra', type: 'number' },
    { name: 'useInTerminal', label: 'El Terminalinde Kullanılsın', type: 'bool' },
    { name: 'useInApproval', label: 'Onayda Kullanılsın', type: 'bool' },
    { name: 'isActive', label: 'Aktif', type: 'bool' },
  ],
  // ── Operasyon junction'ları (flat menü) — backend zod şemalarına birebir ──
  'operation-type-reasons': [OP_TYPE_REF, TESIS_REF,
    { name: 'reasonCategoryId', label: 'Neden Kategori', type: 'ref', refResource: 'reason-categories' },
    { name: 'reasonId', label: 'Neden', type: 'ref', required: true, refResource: 'reasons' },
    { name: 'sortOrder', label: 'Sıra', type: 'number' },
    { name: 'isAutomatic', label: 'Otomatik', type: 'bool' },
  ],
  'operation-group-links': [OP_TYPE_REF, TESIS_REF,
    { name: 'operationGroupId', label: 'Operasyon Grubu', type: 'ref', required: true, refResource: 'operation-groups' },
    { name: 'businessPartnerId', label: 'Cari', type: 'ref', refResource: 'partners' },
  ],
  'operation-type-locations': [OP_TYPE_REF, TESIS_REF, ...CARI_SCOPE, ...MAT_SCOPE,
    { name: 'sourceLinkType', label: 'Kaynak Bağ.', type: 'select', options: SCOPE_OPTS },
    { name: 'sourceLocationId', label: 'Kaynak Lokasyon', type: 'ref', refResource: 'locations' },
    { name: 'targetLinkType', label: 'Hedef Bağ.', type: 'select', options: SCOPE_OPTS },
    { name: 'targetLocationId', label: 'Hedef Lokasyon', type: 'ref', refResource: 'locations' },
    { name: 'fixLocation', label: 'Lokasyon Sabit', type: 'bool' },
    { name: 'terminalFixSource', label: 'El Terminali Kaynak Sabit', type: 'bool' },
    { name: 'terminalFixTarget', label: 'El Terminali Hedef Sabit', type: 'bool' },
    { name: 'sortOrder', label: 'Sıra', type: 'number' },
  ],
  'operation-type-statuses': [OP_TYPE_REF, TESIS_REF, ...CARI_SCOPE, ...MAT_SCOPE,
    { name: 'sourceStatusId', label: 'Kaynak Statü (boş=dış)', type: 'ref', refResource: 'statuses' },
    { name: 'targetStatusId', label: 'Hedef Statü', type: 'ref', required: true, refResource: 'statuses' },
    { name: 'sortOrder', label: 'Sıra', type: 'number' },
  ],
  'operation-tolerances': [OP_TYPE_REF, TESIS_REF, ...CARI_SCOPE, ...MAT_SCOPE,
    { name: 'ignoreSplit', label: 'Bölme Dikkate Alınsın', type: 'bool' },
  ], // kademe %/miktar artık Detay'da (operation-tolerance-details)
  'operation-forbidden-products': [OP_TYPE_REF, TESIS_REF, ...CARI_SCOPE, ...MAT_SCOPE],
  'operation-type-pallet-types': [OP_TYPE_REF, TESIS_REF,
    { name: 'palletTypeId', label: 'Palet Tipi', type: 'ref', required: true, refResource: 'pallet-types' },
    { name: 'innerPalletTypeId', label: 'İç Palet Tipi', type: 'ref', refResource: 'pallet-types' },
  ],
  // Dönüşüm — ticari pakete/entegrasyona hangi HAREKET TİPİ koduyla bilgi gönderileceği eşlemesi.
  // Örn. SAP'de Dönüşüm Kodu "MO" → entegrasyon bacağında Move Order'a tekabül eder.
  'operation-conversions': [TESIS_REF, OP_TYPE_REF,
    { name: 'conversionCode', label: 'Dönüşüm Kodu (entegrasyon hareket tipi — ör. SAP "MO")', type: 'text', required: true },
    { name: 'outgoing', label: 'Giden', type: 'bool' },
  ],
  'operation-bulk-actions': [OP_TYPE_REF, TESIS_REF,
    { name: 'bulkActionType', label: 'Toplu İşlem Tipi', type: 'select', options: BULK_ACTION_OPTS },
    { name: 'description', label: 'Açıklama', type: 'text' },
  ],
  'document-statuses': [
    { name: 'code', label: 'Kod', type: 'text', required: true },
    { name: 'name', label: 'Tanım', type: 'text' },
    { name: 'color', label: 'Renk', type: 'color' },
    { name: 'isActive', label: 'Aktif', type: 'bool' },
  ], // StokBar TBLSBBELGEDURUM: kod/tanım/renk — sıra YOK (legacy-sadık)
  // ── Giriş Koşulları ──
  'entry-condition-break-passwords': [
    { name: 'businessPartnerId', label: 'Cari', type: 'ref', refResource: 'partners' },
    { name: 'password', label: 'Şifre', type: 'text' },
    { name: 'isActive', label: 'Aktif', type: 'bool' },
  ],
  'entry-condition-break-reasons': [
    { name: 'code', label: 'Kod', type: 'text', required: true },
    { name: 'businessPartnerId', label: 'Cari', type: 'ref', refResource: 'partners' },
    { name: 'isActive', label: 'Aktif', type: 'bool' },
  ],
  'entry-condition-type-operations': [
    { name: 'entryConditionTypeId', label: 'Giriş Koşul Tipi', type: 'ref', required: true, refResource: 'entry-condition-types' },
    { name: 'operationTypeId', label: 'Operasyon Tipi', type: 'ref', required: true, refResource: 'operation-types' },
    { name: 'isActive', label: 'Aktif', type: 'bool' },
  ],
  'entry-condition-parameters': [
    { name: 'entryConditionTypeId', label: 'Giriş Koşul Tipi', type: 'ref', required: true, refResource: 'entry-condition-types' },
    { name: 'controlType', label: 'Kontrol Tipi', type: 'select', required: true, options: CONDITION_CONTROL_OPTS },
    { name: 'cariLinkType', label: 'Cari Kapsam', type: 'select', options: SCOPE_OPTS },
    { name: 'cariLinkId', label: 'Cari', type: 'ref', refResource: 'partners' },
    { name: 'materialLinkType', label: 'Malzeme Kapsam', type: 'select', options: SCOPE_OPTS },
    { name: 'materialLinkId', label: 'Ürün/Grup', type: 'ref', refResource: 'products' },
    { name: 'conditionBreakAllowed', label: 'Koşul Kırma İzinli', type: 'bool' },
    { name: 'exclude', label: 'Hariç Tut', type: 'bool' },
    { name: 'sortOrder', label: 'Sıra', type: 'number' },
    { name: 'isActive', label: 'Aktif', type: 'bool' },
  ],
  // ── Çıkış Koşulları ──
  'exit-condition-control-fields': [
    { name: 'code', label: 'Kod', type: 'text', required: true },
    { name: 'tableName', label: 'Tablo Adı', type: 'text' },
    { name: 'fieldName', label: 'Saha Adı', type: 'text' },
    { name: 'isActive', label: 'Aktif', type: 'bool' },
  ],
  'exit-condition-break-passwords': [
    { name: 'password', label: 'Şifre', type: 'text' },
    { name: 'businessPartnerId', label: 'Cari', type: 'ref', refResource: 'partners' },
    { name: 'isActive', label: 'Aktif', type: 'bool' },
  ],
  'exit-condition-break-reasons': [
    { name: 'code', label: 'Kod', type: 'text', required: true },
    { name: 'businessPartnerId', label: 'Cari', type: 'ref', refResource: 'partners' },
    { name: 'isActive', label: 'Aktif', type: 'bool' },
  ],
  'exit-condition-type-operations': [
    { name: 'exitConditionTypeId', label: 'Çıkış Koşul Tipi', type: 'ref', required: true, refResource: 'exit-condition-types' },
    { name: 'operationTypeId', label: 'Operasyon Tipi', type: 'ref', required: true, refResource: 'operation-types' },
    { name: 'locationLinkType', label: 'Lokasyon Bağ. Tipi', type: 'number' },
    { name: 'locationId', label: 'Lokasyon Kodu', type: 'number' },
    { name: 'fifoCheckOnReverseScan', label: 'Geri Okutmada FIFO Kontrolü', type: 'bool' },
    { name: 'isActive', label: 'Aktif', type: 'bool' },
  ],
  'exit-condition-parameters': [
    { name: 'exitConditionTypeId', label: 'Çıkış Koşul Tipi', type: 'ref', required: true, refResource: 'exit-condition-types' },
    { name: 'controlType', label: 'Kontrol Tipi', type: 'select', required: true, options: CONDITION_CONTROL_OPTS },
    { name: 'cariLinkType', label: 'Cari Kapsam', type: 'select', options: SCOPE_OPTS },
    { name: 'cariLinkId', label: 'Cari', type: 'ref', refResource: 'partners' },
    { name: 'materialLinkType', label: 'Malzeme Kapsam', type: 'select', options: SCOPE_OPTS },
    { name: 'materialLinkId', label: 'Ürün/Grup', type: 'ref', refResource: 'products' },
    { name: 'controlFieldId', label: 'Kontrol Sahası', type: 'ref', refResource: 'exit-condition-control-fields' },
    { name: 'dayCount', label: 'Gün Sayısı', type: 'number' },
    { name: 'conditionBreakAllowed', label: 'Koşul Kırma İzinli', type: 'bool' },
    { name: 'exclude', label: 'Hariç Tut', type: 'bool' },
    { name: 'sortOrder', label: 'Sıra', type: 'number' },
    { name: 'isActive', label: 'Aktif', type: 'bool' },
  ],
  // ── Yönlendirme ──
  'routing-control-fields': [
    { name: 'code', label: 'Kod', type: 'text', required: true },
    { name: 'fieldName', label: 'Saha Adı', type: 'text' },
    { name: 'isActive', label: 'Aktif', type: 'bool' },
  ],
  'routing-break-passwords': [
    { name: 'password', label: 'Şifre', type: 'text' },
    { name: 'isActive', label: 'Aktif', type: 'bool' },
  ],
  'routing-break-reasons': [
    { name: 'code', label: 'Kod', type: 'text', required: true },
    { name: 'isActive', label: 'Aktif', type: 'bool' },
  ],
  // Yönlendirme Parametre — yönlendirme tipine bağlı (StokBar alt-ekranı)
  'routing-parameters': [
    { name: 'cariLinkType', label: 'Cari Bağ. Tipi', type: 'select', options: SCOPE_OPTS },
    { name: 'cariLinkId', label: 'Müşteri', type: 'ref', refResource: 'partners' },
    { name: 'materialLinkType', label: 'Malzeme Bağ. Tipi', type: 'select', options: SCOPE_OPTS },
    { name: 'materialLinkId', label: 'Ürün', type: 'ref', refResource: 'products' },
    { name: 'controlFieldId', label: 'Kontrol Sahası', type: 'ref', refResource: 'routing-control-fields' },
    { name: 'messageType', label: 'Mesaj Tipi', type: 'select', options: [{ value: 'WARNING', label: 'Uyarı' }, { value: 'ERROR', label: 'Hata' }] },
    { name: 'controlMode', label: 'Yönlendirme Tipi', type: 'select', options: [{ value: 'SIDE_BY_SIDE', label: 'Yan Yana Gelsin' }, { value: 'FREE_CONTROL', label: 'Serbest Kontrol' }, { value: 'PRODUCT_LOCATION', label: 'Ürün Lokasyon Bağlantı' }] },
    { name: 'conditionBreak', label: 'Koşul Kırma', type: 'bool' },
    { name: 'spName', label: 'SSP', type: 'text' },
    { name: 'controlTypeDescription', label: 'Kontrol Tipi Açıklama', type: 'text' },
    { name: 'sortOrder', label: 'Sıra', type: 'number' },
    { name: 'incrementalSort', label: 'Artan Sıralama Uygulansın', type: 'bool' },
    { name: 'isActive', label: 'Aktif', type: 'bool' },
  ],
  'routing-type-operations': [
    { name: 'facilityId', label: 'Tesis', type: 'ref', refResource: 'facilities' },
    { name: 'routingTypeId', label: 'Yönlendirme Tip Kod', type: 'ref', required: true, refResource: 'routing-types' },
    { name: 'operationTypeId', label: 'Operasyon Tipi', type: 'ref', required: true, refResource: 'operation-types' },
    { name: 'locationLinkType', label: 'Lok. Bağlantı Tipi', type: 'select', options: SCOPE_OPTS },
    { name: 'locationId', label: 'Lokasyon Kod', type: 'ref', refResource: 'locations' },
    { name: 'taskPlanId', label: 'Görev Kod', type: 'number' },
    { name: 'isActive', label: 'Aktif', type: 'bool' },
  ],
  'routing-product-locations': [
    { name: 'materialLinkType', label: 'Malzeme Bağ. Tipi', type: 'number' },
    { name: 'additionalGroupOrder', label: 'Ek Grup Sırası', type: 'number' },
    { name: 'materialLinkId', label: 'Malzeme Bağ. Kodu', type: 'number' },
    { name: 'locationLinkType', label: 'Lokasyon Bağ. Tipi', type: 'number' },
    { name: 'locationLinkId', label: 'Lokasyon Bağ. Kodu', type: 'number' },
    { name: 'isActive', label: 'Aktif', type: 'bool' },
  ],
  // ── Sayım ──
  'count-approval-user-groups': [
    { name: 'businessPartnerId', label: 'Cari', type: 'ref', refResource: 'partners' },
    { name: 'operationTypeId', label: 'Operasyon Tipi', type: 'ref', required: true, refResource: 'operation-types' },
    { name: 'userGroupId', label: 'Kullanıcı Grup Kodu', type: 'number', required: true },
    { name: 'sortOrder', label: 'Sıra', type: 'number' },
    { name: 'mailTemplateId', label: 'Mail Şablon', type: 'number' },
    { name: 'mailGroupId', label: 'Mail Grubu', type: 'number' },
    { name: 'mailSp', label: 'Mail SP', type: 'text' },
    { name: 'isActive', label: 'Aktif', type: 'bool' },
  ],
  'count-criteria': [
    { name: 'operationTypeId', label: 'Operasyon Tipi', type: 'ref', required: true, refResource: 'operation-types' },
    { name: 'fieldCode', label: 'Saha Kodu', type: 'text', required: true },
    { name: 'required', label: 'Zorunlu', type: 'bool' },
    { name: 'isActive', label: 'Aktif', type: 'bool' },
  ],
  // Alan SIRASI + etiketler StokBar "Sayım Parametreleri" (Kayıt Görüntüle) ekranıyla birebir hizalı.
  // NOT: Transfer Operasyon StokBar ekranında YOK → formda yok (legacy TBLSBSAYIMPARAMETRE.LNGTRANSFEROPERASYONTIPKOD kolonu DB'de durur).
  'count-parameters': [
    // Sayım operasyonu: yalnızca operasyon tipi "Sayım" (direction=COUNT) olanlar seçilebilir
    { name: 'operationTypeId', label: 'Sayım Operasyon Tipi', type: 'ref', required: true, refResource: 'operation-types', refFilter: (x) => x.direction === 'COUNT' },
    { name: 'countType', label: 'Sayım Tipi', type: 'select', options: [{ value: 1, label: 'Kör Sayım' }, { value: 2, label: 'Açık Sayım' }] },
    { name: 'entryOperationTypeId', label: 'Giriş Operasyon', type: 'ref', refResource: 'operation-types' },
    { name: 'exitOperationTypeId', label: 'Çıkış Operasyon', type: 'ref', refResource: 'operation-types' },
    { name: 'documentDetailCount', label: 'Belge Detay Sayısı', type: 'number' },
    { name: 'equalize', label: 'Eşitleme Yapılsın', type: 'bool' },
    { name: 'weightDiff', label: 'Ağırlık Farkı Alınsın', type: 'bool' },
    { name: 'palletQtyPartialEntry', label: 'Palet Miktarı Parçalı Giriş', type: 'bool' },
    { name: 'stacked', label: 'Miktar Girişi İstifli Olsun', type: 'bool' },
    { name: 'partialPallet', label: 'Parçalı Palet Kullanımı Yapılsın', type: 'bool' },
    { name: 'partialPalletWarning', label: 'Parçalı Palet Uyarısı Verilsin', type: 'bool' },
    { name: 'stockMoveOnActiveCount', label: 'Aktif Sayımda Stok Hareketi Yapılsın', type: 'bool' },
    { name: 'hideInnerPallets', label: 'İç Paletler Gösterilmesin', type: 'bool' },
    { name: 'hideMixedPallet', label: 'Karma Palet Gösterilmesin', type: 'bool' },
    { name: 'innerPalletCountCheck', label: 'Palet İçi Sayı Kontrolü', type: 'bool' },
    { name: 'dontRecountPallet', label: 'Palet Tekrar Sayılmasın', type: 'bool' },
    { name: 'hideInnerPalletStock', label: 'Palet İçi Stok Gösterilmesin', type: 'bool' },
    { name: 'countDays', label: 'Sayım Gün Sayısı', type: 'number' },
    { name: 'askLocationOnScan', label: 'Okutmada Lokasyon Sorulsun', type: 'bool' },
  ],
  // ── Genel ek · İş Emri · Dinamik Etiketleme (StokBar) ──
  languages: [
    { name: 'code', label: 'Kod', type: 'text', required: true },
    { name: 'isDefault', label: 'Varsayılan', type: 'bool' },
    { name: 'isActive', label: 'Aktif', type: 'bool' },
  ],
  'screen-report-links': [
    { name: 'screenButtonCode', label: 'Ekran Buton Kodu', type: 'text' },
    { name: 'reportCode', label: 'Rapor Kodu', type: 'text' },
    { name: 'businessPartnerId', label: 'Cari', type: 'ref', refResource: 'partners' },
    { name: 'isActive', label: 'Aktif', type: 'bool' },
  ],
  'stock-control-parameters': [
    { name: 'businessPartnerId', label: 'Cari', type: 'ref', refResource: 'partners' },
    { name: 'distributionType', label: 'Dağıtım Şekli', type: 'number' },
    { name: 'customerPriority', label: 'Müşteri Önceliği', type: 'number' },
    { name: 'shipmentPriority', label: 'Sevkiyat Önceliği', type: 'number' },
    { name: 'controlStatus', label: 'Kontrol Statü', type: 'text' },
    { name: 'controlLocation', label: 'Kontrol Lokasyon', type: 'text' },
    { name: 'askUser', label: 'Kullanıcıya Sorulsun', type: 'bool' },
    { name: 'dontUpdatePreparedQty', label: 'Hazırlanan Miktar Güncellenmesin', type: 'bool' },
    { name: 'errorOnAllSplit', label: 'Tümünü Bölmede Hata', type: 'bool' },
    { name: 'isActive', label: 'Aktif', type: 'bool' },
  ],
  'document-planning-parameters': [
    { name: 'plannedDocStatusId', label: 'Planlanacak Belge Durumu', type: 'ref', refResource: 'document-statuses' },
    { name: 'planningOperationTypeId', label: 'Planlama Operasyonu', type: 'ref', refResource: 'operation-types' },
    { name: 'templateOperationTypeId', label: 'Şablon Operasyon', type: 'ref', refResource: 'operation-types' },
    { name: 'businessPartnerId', label: 'Cari', type: 'ref', refResource: 'partners' },
    { name: 'partCount', label: 'Parça Sayısı', type: 'number' },
    { name: 'splitByProductGroup', label: 'Ürün Grup Bazında Parçalansın', type: 'bool' },
    { name: 'fieldEntry', label: 'Alan Girişi Yapılsın', type: 'bool' },
    { name: 'updateMainQty', label: 'Ana Miktar Güncellensin', type: 'bool' },
    { name: 'locationAssign', label: 'Lokasyon Atama', type: 'bool' },
    { name: 'isActive', label: 'Aktif', type: 'bool' },
  ],
  'pick-order-parameters': [
    { name: 'businessPartnerId', label: 'Cari', type: 'ref', refResource: 'partners' },
    { name: 'fullPalletOpId', label: 'Tam Palet Operasyonu', type: 'ref', refResource: 'operation-types' },
    { name: 'fullCaseOpId', label: 'Tam Koli Operasyonu', type: 'ref', refResource: 'operation-types' },
    { name: 'partialProductOpId', label: 'Parçalı Ürün Operasyonu', type: 'ref', refResource: 'operation-types' },
    { name: 'fullPalletUnitId', label: 'Tam Palet Birimi', type: 'ref', refResource: 'units' },
    { name: 'fullCaseUnitId', label: 'Tam Koli Birimi', type: 'ref', refResource: 'units' },
    { name: 'partialProductUnitId', label: 'Parçalı Ürün Birimi', type: 'ref', refResource: 'units' },
    { name: 'isActive', label: 'Aktif', type: 'bool' },
  ],
  'dashboard-reports': [
    { name: 'reportName', label: 'Rapor Tanım', type: 'text' },
    { name: 'reportSp', label: 'Rapor SP', type: 'text' },
    { name: 'type', label: 'Tip', type: 'number' },
    { name: 'defaultReport', label: 'Varsayılan Rapor', type: 'bool' },
    { name: 'isActive', label: 'Aktif', type: 'bool' },
  ],
  'warehouse-vehicles': [
    { name: 'code', label: 'Kod', type: 'text', required: true },
    { name: 'name', label: 'Tanım', type: 'text' },
    { name: 'status', label: 'Durum', type: 'number' },
    { name: 'workType', label: 'İş Tipi', type: 'number' },
    { name: 'quantity', label: 'Miktar', type: 'number' },
    { name: 'unitId', label: 'Birim', type: 'ref', refResource: 'units' },
    { name: 'businessPartnerId', label: 'Cari', type: 'ref', refResource: 'partners' },
    { name: 'ipAddress', label: 'IP Adresi', type: 'text' },
    { name: 'pallet', label: 'Palet', type: 'bool' },
    { name: 'isActive', label: 'Aktif', type: 'bool' },
  ],
  'work-order-general-parameters': [
    { name: 'businessPartnerId', label: 'Cari', type: 'ref', refResource: 'partners' },
    { name: 'alarmDuration', label: 'Alarm Süresi', type: 'number' },
    { name: 'alarmUnit', label: 'Alarm Süre Birimi', type: 'number' },
    { name: 'pickCancelOpId', label: 'Toplama İptal Operasyonu', type: 'ref', refResource: 'operation-types' },
    { name: 'rackFeedbackOpId', label: 'Raf Geri Besleme Operasyonu', type: 'ref', refResource: 'operation-types' },
    { name: 'askEntryLocation', label: 'Giriş Lokasyon Sorsun', type: 'bool' },
    { name: 'locationPriority', label: 'Lokasyon Önceliği', type: 'bool' },
    { name: 'isActive', label: 'Aktif', type: 'bool' },
  ],
  'work-order-reasons': [
    { name: 'code', label: 'Kod', type: 'text', required: true },
    { name: 'description', label: 'Açıklama', type: 'text' },
    { name: 'businessPartnerId', label: 'Cari', type: 'ref', refResource: 'partners' },
    { name: 'breakPassword', label: 'Kırma Şifresi', type: 'text' },
    { name: 'isCancel', label: 'İptal', type: 'bool' },
    { name: 'autoCreateOrder', label: 'Oto Emir Yarat', type: 'bool' },
    { name: 'createDocument', label: 'Belge Yarat', type: 'bool' },
    { name: 'clearSystemFault', label: 'Sistem Arızası Temizlensin', type: 'bool' },
    { name: 'isActive', label: 'Aktif', type: 'bool' },
  ],
  'work-order-reference-operations': [
    { name: 'operationTypeId', label: 'Operasyon Tipi', type: 'ref', required: true, refResource: 'operation-types' },
    { name: 'category', label: 'Kategori', type: 'number' },
    { name: 'businessPartnerId', label: 'Cari', type: 'ref', refResource: 'partners' },
    { name: 'headerId', label: 'Başlık Kodu', type: 'number' },
    { name: 'isActive', label: 'Aktif', type: 'bool' },
  ],
  'rack-feed-parameters': [
    { name: 'businessPartnerId', label: 'Cari', type: 'ref', refResource: 'partners' },
    { name: 'locationGroupId', label: 'Lokasyon Grubu', type: 'ref', refResource: 'location-groups' },
    { name: 'capacityPercent', label: 'Kapasite Yüzdesi', type: 'number' },
    { name: 'onStockEmpty', label: 'Stok Bitince', type: 'bool' },
    { name: 'palletBreaking', label: 'Palet Bozma', type: 'bool' },
    { name: 'isActive', label: 'Aktif', type: 'bool' },
  ],
  'menu-groups': [
    { name: 'code', label: 'Kod', type: 'text', required: true },
    { name: 'description', label: 'Açıklama', type: 'text' },
    { name: 'screenType', label: 'Ekran Tipi', type: 'number' },
    { name: 'isActive', label: 'Aktif', type: 'bool' },
  ],
  // ── Operasyon config (StokBar) ──
  // Tesis = firma (LNGDISTKOD) = companyId (örtük). StokBar: Tesis + Kod + Tanım → bizde Kod + Tanım.
  'reason-categories': [
    { name: 'code', label: 'Neden Kategori', type: 'text', required: true },
    { name: 'name', label: 'Tanımı', type: 'text' },
    { name: 'isActive', label: 'Aktif', type: 'bool' },
  ],
  'sequential-operations': [
    { name: 'facilityId', label: 'Tesis', type: 'ref', refResource: 'facilities' },
    { name: 'firstOperationId', label: 'İlk Operasyon', type: 'ref', required: true, refResource: 'operation-types' },
    { name: 'secondOperationId', label: 'İkinci Operasyon', type: 'ref', required: true, refResource: 'operation-types' },
    { name: 'cariLinkType', label: 'Cari Bağ. Tipi', type: 'select', options: SCOPE_OPTS },
    { name: 'cariLinkId', label: 'Cari', type: 'ref', refResource: 'partners' },
    { name: 'materialLinkType', label: 'Malzeme Bağ. Tipi', type: 'select', options: SCOPE_OPTS },
    { name: 'materialLinkId', label: 'Ürün', type: 'ref', refResource: 'products' },
    { name: 'locationLinkType', label: 'Lokasyon Bağ. Tipi', type: 'select', options: SCOPE_OPTS },
    { name: 'locationLinkId', label: 'Lokasyon', type: 'ref', refResource: 'locations' },
    { name: 'useInWorkOrder', label: 'İş Emrinde Kullanılsın', type: 'bool' },
    { name: 'spName', label: 'SP Adı', type: 'text' },
    { name: 'isActive', label: 'Aktif', type: 'bool' },
  ],
  // Referans Kontrollü eşleme — SADE: Firma › Kaynak Tesis › Kaynak Operasyon › (Tesis İçi | Hedef Tesis) › Hedef Operasyon.
  // "Tesis İçi" tikli → hareket aynı tesiste (hedef tesis kapalı, kaynakla aynı); tikli değilse hedef tesis ZORUNLU (backend zorlar).
  'auto-reference-documents': [
    { name: 'sourceFacilityId', label: 'Kaynak Tesis', type: 'ref', required: true, refResource: 'facilities' },
    { name: 'sourceOperationTypeId', label: 'Kaynak Operasyon (Çıkış)', type: 'ref', required: true, refResource: 'operation-types', refFilter: (x) => x.direction === 'OUTBOUND' },
    { name: 'facility', label: 'Tesis İçi (aynı tesiste hareket)', type: 'bool' },
    { name: 'targetFacilityId', label: 'Hedef Tesis (tesis içi değilse zorunlu)', type: 'ref', refResource: 'facilities', disabledWhen: { field: 'facility', equals: true } },
    { name: 'targetOperationTypeId', label: 'Hedef Operasyon (Giriş)', type: 'ref', required: true, refResource: 'operation-types', refFilter: (x) => x.direction === 'INBOUND' },
    { name: 'isActive', label: 'Aktif', type: 'bool' },
  ],
  'product-additional-groups': [
    { name: 'productId', label: 'Ürün', type: 'ref', required: true, refResource: 'products' },
    { name: 'groupId', label: 'Grup', type: 'ref', required: true, refResource: 'product-groups' },
    { name: 'sortOrder', label: 'Sıra', type: 'number' },
    { name: 'isActive', label: 'Aktif', type: 'bool' },
  ],
  'product-based-collections': [
    { name: 'businessPartnerId', label: 'Cari', type: 'ref', required: true, refResource: 'partners' },
    { name: 'sourceOperationTypeId', label: 'Kaynak Operasyon', type: 'ref', required: true, refResource: 'operation-types' },
    { name: 'targetOperationTypeId', label: 'Hedef Operasyon', type: 'ref', required: true, refResource: 'operation-types' },
    { name: 'exemptLocations', label: 'Muaf Lokasyonlar', type: 'text' },
    { name: 'isActive', label: 'Aktif', type: 'bool' },
  ],
  'trip-based-collections': [
    { name: 'businessPartnerId', label: 'Cari', type: 'ref', required: true, refResource: 'partners' },
    { name: 'sourceOperationTypeId', label: 'Kaynak Operasyon', type: 'ref', required: true, refResource: 'operation-types' },
    { name: 'targetOperationTypeId', label: 'Hedef Operasyon', type: 'ref', required: true, refResource: 'operation-types' },
    { name: 'isActive', label: 'Aktif', type: 'bool' },
  ],
  'document-status-actions': [
    { name: 'documentStatusId', label: 'Belge Durumu', type: 'ref', required: true, refResource: 'document-statuses' },
    { name: 'actionType', label: 'İşlem Tipi', type: 'select', required: true, options: DOC_ACTION_TYPE_OPTS },
    { name: 'isActive', label: 'Aktif', type: 'bool' },
  ],
  // Tesis = firma (LNGDISTKOD) = companyId (örtük). StokBar: Tesis + Operasyon Tipi + Kriter → bizde Operasyon + Kriter.
  // Faz 2: veri-güdümlü kural — operasyon (+ cari) için KOŞUL → hedef durum (öncelik sırasıyla; eşleşme yoksa yerleşik türetime düşülür)
  'document-status-criteria': [
    { name: 'operationTypeId', label: 'Operasyon Tipi', type: 'ref', required: true, refResource: 'operation-types' },
    { name: 'businessPartnerId', label: 'Cari (boş = tüm cariler)', type: 'ref', refResource: 'partners' },
    { name: 'condition', label: 'Koşul', type: 'select', required: true, options: DOC_CONDITION_OPTS },
    { name: 'targetStatusId', label: 'Hedef Durum', type: 'ref', required: true, refResource: 'document-statuses' },
    { name: 'priority', label: 'Öncelik (küçük önce)', type: 'number' },
    { name: 'isActive', label: 'Aktif', type: 'bool' },
  ],
  // Belge Onay Tipi — StokBar birebir, SADECE bu 3 alan (ekstra yok):
  // Toplama Ekranından Onay = okutma bitince İleri→"onay verilsin mi?" (genelde kontrolsüz)
  // Tek Aşamalı = kontrollüde kısmi toplama; İleri→Onayla/Böl seçenekleri
  // İki Aşamalı = önce mobilden onay, en sonda Gözlem ekranından son onay
  'document-approval-types': [
    { name: 'facilityId', label: 'Tesis', type: 'ref', required: true, refResource: 'facilities' },
    { name: 'operationTypeId', label: 'Operasyon Tipi', type: 'ref', required: true, refResource: 'operation-types' },
    { name: 'approvalType', label: 'Onay Tipi', type: 'select', required: true, options: [
      { value: 1, label: 'Toplama Ekranından Onay' },
      { value: 2, label: 'Tek Aşamalı Onay' },
      { value: 3, label: 'İki Aşamalı Onay' },
    ] },
  ],
  'label-types': [
    { name: 'code', label: 'Kod', type: 'text', required: true },
    { name: 'labelName', label: 'Etiket Adı', type: 'text' },
    { name: 'screenTitle', label: 'Ekran Başlığı', type: 'text' },
    { name: 'isActive', label: 'Aktif', type: 'bool' },
  ],
  units: codeName(),
  reasons: [...codeName(), { name: 'facilityId', label: 'Tesis', type: 'ref', refResource: 'facilities' }],
  'product-groups': codeName(),
  'product-subgroups': codeName(),
  'product-types': codeName(),
  'product-detail-types': codeName(),
  'operation-groups': codeName(),
  'partner-groups': codeName(),
  regions: [
    { name: 'facilityId', label: 'Tesis', type: 'ref', refResource: 'facilities' },
    { name: 'code', label: 'Bölge Kodu', type: 'text', required: true },
    { name: 'name', label: 'Tanımı', type: 'text', required: true },
    { name: 'isActive', label: 'Aktif', type: 'bool' },
  ],
  'partner-extra-groups': [
    { name: 'code', label: 'Kod', type: 'text', required: true },
    { name: 'name', label: 'Ad', type: 'text', required: true },
    { name: 'colorCode', label: 'Renk Kodu', type: 'color' },
    { name: 'reference', label: 'Referans', type: 'text' },
    { name: 'isActive', label: 'Aktif', type: 'bool' },
  ],
  'partner-extra-field-defs': [
    { name: 'code', label: 'Kod', type: 'text', required: true },
    { name: 'label', label: 'Etiket', type: 'text', required: true },
    { name: 'isActive', label: 'Aktif', type: 'bool' },
  ],
  // Palet Güncelleme — palletNo/tip değişmez; diğer alanlar (GenericForm edit)
  pallets: [
    { name: 'parentPalletId', label: 'Üst Palet', type: 'ref', refResource: 'pallets' },
    { name: 'baseUnitId', label: 'Ana Birim', type: 'ref', refResource: 'units' },
    { name: 'originalQty', label: 'Başlangıç Miktarı', type: 'number' },
    { name: 'expiryDate', label: 'Son Kullanma (YYYY-MM-DD)', type: 'text' },
    { name: 'beaconId', label: 'Beacon ID', type: 'text' },
    { name: 'isActive', label: 'Aktif', type: 'bool' },
  ],
  // Rapor tanım tabloları (metadata-driven motor)
  'report-defs': [
    { name: 'code', label: 'Kod', type: 'text', required: true },
    { name: 'name', label: 'Ad', type: 'text', required: true },
    { name: 'sourceKey', label: 'Veri Kaynağı', type: 'select', required: true, options: [{ value: 'STOCK', label: 'Stok' }, { value: 'DOCUMENTS', label: 'Belgeler' }, { value: 'PALLETS', label: 'Paletler' }] },
    { name: 'category', label: 'Kategori', type: 'text' },
    { name: 'isActive', label: 'Aktif', type: 'bool' },
  ],
  'report-criteria': [
    { name: 'reportId', label: 'Rapor', type: 'ref', required: true, refResource: 'report-defs' },
    { name: 'fieldCode', label: 'Alan Kodu', type: 'text', required: true },
    { name: 'label', label: 'Etiket', type: 'text', required: true },
    { name: 'type', label: 'Tip', type: 'select', required: true, options: [{ value: 'TEXT', label: 'Metin' }, { value: 'NUMBER', label: 'Sayı' }, { value: 'DATE', label: 'Tarih' }, { value: 'SELECT', label: 'Liste' }, { value: 'REF', label: 'Referans' }] },
    { name: 'refResource', label: 'Ref Kaynak (REF için)', type: 'text' },
    { name: 'options', label: 'Seçenekler (val:label,...)', type: 'text' },
    { name: 'required', label: 'Zorunlu', type: 'bool' },
    { name: 'sortOrder', label: 'Sıra', type: 'number' },
  ],
  'report-fields': [
    { name: 'reportId', label: 'Rapor', type: 'ref', required: true, refResource: 'report-defs' },
    { name: 'fieldCode', label: 'Alan Kodu', type: 'text', required: true },
    { name: 'label', label: 'Etiket', type: 'text', required: true },
    { name: 'align', label: 'Hizalama', type: 'select', options: [{ value: 'left', label: 'Sol' }, { value: 'right', label: 'Sağ' }] },
    { name: 'sortOrder', label: 'Sıra', type: 'number' },
  ],
  // Entegrasyon Aktarım — manuel tetikleme (kaydet = aktarım denemesi log'lanır)
  'integration-logs': [
    { name: 'direction', label: 'Yön', type: 'select', required: true, options: [{ value: 'IN', label: 'Gelen' }, { value: 'OUT', label: 'Giden' }] },
    { name: 'entityType', label: 'İşlem Tipi', type: 'select', required: true, options: [
      { value: 'MALZEME', label: 'Malzeme' }, { value: 'CARI', label: 'Cari' }, { value: 'SIPARIS', label: 'Sipariş' },
      { value: 'FATURA', label: 'Fatura' }, { value: 'ISEMRI', label: 'İş Emri' }, { value: 'DEPO', label: 'Depo' },
      { value: 'ZINCIR', label: 'Zincir' }, { value: 'URUN_AGACI', label: 'Ürün Ağacı' },
    ] },
    { name: 'referenceKey', label: 'Referans Anahtar', type: 'text' },
    { name: 'message', label: 'Mesaj', type: 'text' },
  ],
  statuses: [...codeName(), { name: 'facilityId', label: 'Tesis', type: 'ref', required: true, refResource: 'facilities' }],
  'pallet-types': [
    { name: 'code', label: 'Palet No Öneki (Kod)', type: 'text', required: true },
    { name: 'name', label: 'Tanım', type: 'text', required: true },
    { name: 'facilityId', label: 'Tesis', type: 'ref', refResource: 'facilities' },
    { name: 'sequenceId', label: 'Sayaç', type: 'ref', refResource: 'sequences' },
    { name: 'palletNoLength', label: 'Palet No Uzunluğu', type: 'number' },
    { name: 'mixingType', label: 'Tip', type: 'select', options: [{ value: 'SINGLE_PRODUCT', label: 'Tek Ürün Palet' }, { value: 'MIXED', label: 'Karma Palet' }] },
    { name: 'isDivisible', label: 'Bölünebilir', type: 'bool' },
    { name: 'partialUse', label: 'Parçalı Kullanım Yapılsın', type: 'bool' },
    { name: 'singleProductControl', label: 'Tek Ürün Kontrolü', type: 'bool' },
    { name: 'batchControl', label: 'Batch Kontrol Yapılsın', type: 'bool' },
    { name: 'newNoOnEdit', label: 'Düzenlemede Yeni No Alsın', type: 'bool' },
    { name: 'breakParentPallet', label: 'Üst Palet Bozulsun', type: 'bool' },
    { name: 'breakPartialPallet', label: 'Parçalı Palet Bozulsun', type: 'bool' },
    { name: 'breakPalletOnTransfer', label: 'Transferde Palet Bozulsun', type: 'bool' },
    { name: 'removeFromPalletOnTransfer', label: 'Transferde Paletten Çıkarılsın', type: 'bool' },
    { name: 'keepFullPalletOnTransfer', label: 'Transferde Tamamı Hareket Eden Üst Palet Bozulmasın', type: 'bool' },
    { name: 'logging', label: 'Loglama', type: 'bool' },
    { name: 'logControl', label: 'Log Kontrol', type: 'bool' },
    { name: 'isActive', label: 'Aktif', type: 'bool' },
  ],
  'location-capacities': [
    { name: 'locationLinkType', label: 'Lokasyon Bağ. Tipi', type: 'select', required: true, options: [{ value: 'LOCATION', label: 'Göz / Lokasyon' }, { value: 'LOCATION_GROUP', label: 'Lokasyon Grup' }] },
    { name: 'locationLinkCode', label: 'Lokasyon', type: 'ref', required: true, refResource: 'locations', refResourceBy: { field: 'locationLinkType', map: { LOCATION: 'locations', LOCATION_GROUP: 'location-groups' } } },
    { name: 'materialLinkType', label: 'Malzeme Bağ. Tipi', type: 'select', options: [{ value: 'PRODUCT', label: 'Ürün' }, { value: 'PRODUCT_GROUP', label: 'Ürün Grup' }] },
    { name: 'materialLinkCode', label: 'Ürün/Grup', type: 'ref', refResource: 'products', refResourceBy: { field: 'materialLinkType', map: { PRODUCT: 'products', PRODUCT_GROUP: 'product-groups' } } },
    { name: 'quantity', label: 'Miktar', type: 'number' },
    { name: 'unitId', label: 'Birim', type: 'ref', refResource: 'units', dependsOn: 'materialLinkCode', dependsOnParam: 'productId', dependsOnWhen: { field: 'materialLinkType', equals: 'PRODUCT' } },
    { name: 'palletQty', label: 'Palet Miktarı', type: 'number' },
    { name: 'toleranceQty', label: 'Tolerans Miktar', type: 'number' },
    { name: 'toleranceUnitId', label: 'Tolerans Birim', type: 'ref', refResource: 'units' },
    { name: 'width', label: 'En', type: 'number' },
    { name: 'length', label: 'Boy', type: 'number' },
    { name: 'height', label: 'Yükseklik', type: 'number' },
    { name: 'placementHeight', label: 'Yerleştirme Yüks.', type: 'number' },
    { name: 'dimensionUnitId', label: 'Boyut Birimi', type: 'ref', refResource: 'units' },
    { name: 'weight', label: 'Ağırlık', type: 'number' },
    { name: 'weightUnitId', label: 'Ağırlık Birim', type: 'ref', refResource: 'units' },
    { name: 'messageType', label: 'Mesaj Tipi', type: 'select', options: [{ value: 'ERROR', label: 'Hata' }, { value: 'WARNING', label: 'Uyarı' }] },
    { name: 'distributeToCells', label: 'Gözlere Dağıtılsın', type: 'bool' },
  ],
  'entry-condition-types': codeName('Kod', 'Açıklama'),
  'exit-condition-types': codeName('Kod', 'Açıklama'),
  'routing-types': codeName('Kod', 'Açıklama'),
  warehouses: [
    { name: 'code', label: 'Kod', type: 'text', required: true },
    { name: 'name', label: 'Ad', type: 'text', required: true },
    { name: 'facilityId', label: 'Tesis', type: 'ref', refResource: 'facilities' },
    { name: 'isActive', label: 'Aktif', type: 'bool' },
  ],
  // Hiyerarşi: Firma > Tesis > Depo > Alan. Tesis seçilince Depo o tesise göre filtrelenir (dependsOn).
  areas: [
    { ...TESIS_REF, required: true },
    { name: 'warehouseId', label: 'Depo', type: 'ref', required: true, refResource: 'warehouses', dependsOn: 'facilityId' },
    { name: 'code', label: 'Kod', type: 'text', required: true },
    { name: 'name', label: 'Ad', type: 'text' },
    { name: 'isActive', label: 'Aktif', type: 'bool' },
  ],
  // Hiyerarşi: Firma > Tesis > Depo > Alan > Lokasyon (her adım bir öncekine göre filtrelenir)
  locations: [
    { ...TESIS_REF, required: true },
    { name: 'warehouseId', label: 'Depo', type: 'ref', required: true, refResource: 'warehouses', dependsOn: 'facilityId' },
    { name: 'areaId', label: 'Alan', type: 'ref', refResource: 'areas', dependsOn: 'warehouseId' },
    { name: 'code', label: 'Kod', type: 'text', required: true },
    { name: 'name', label: 'Ad', type: 'text' },
    { name: 'barcode', label: 'Barkod (boş bırakılırsa otomatik atanır)', type: 'text' },
    { name: 'priority', label: 'Öncelik', type: 'number' },
    { name: 'isActive', label: 'Aktif', type: 'bool' },
  ],
  vehicles: [
    { name: 'plateNo', label: 'Plaka', type: 'text', required: true },
    { name: 'name', label: 'Ad', type: 'text' },
    { name: 'type', label: 'Tip', type: 'select', options: [
      { value: 'TRUCK', label: 'Kamyon' }, { value: 'VAN', label: 'Panelvan' }, { value: 'CAR', label: 'Otomobil' }, { value: 'MOTORCYCLE', label: 'Motosiklet' },
    ] },
    { name: 'capacityKg', label: 'Kapasite (kg)', type: 'number' },
    { name: 'capacityM3', label: 'Kapasite (m³)', type: 'number' },
    { name: 'isActive', label: 'Aktif', type: 'bool' },
  ],
  'routing-rules': [
    { name: 'routingTypeId', label: 'Yönlendirme Tipi', type: 'ref', refResource: 'routing-types' },
    { name: 'materialLinkType', label: 'Malzeme Bağ. Tipi', type: 'select', required: true, options: [{ value: 'PRODUCT', label: 'Ürün' }, { value: 'PRODUCT_GROUP', label: 'Ürün Grup' }] },
    { name: 'materialLinkCode', label: 'Ürün/Grup', type: 'ref', required: true, refResource: 'products' },
    { name: 'locationLinkType', label: 'Lokasyon Bağ. Tipi', type: 'select', required: true, options: [{ value: 'LOCATION', label: 'Göz / Lokasyon' }, { value: 'LOCATION_GROUP', label: 'Lokasyon Grup' }] },
    { name: 'locationLinkCode', label: 'Lokasyon/Grup', type: 'ref', required: true, refResource: 'locations' },
    { name: 'priority', label: 'Öncelik', type: 'number' },
    { name: 'isActive', label: 'Aktif', type: 'bool' },
  ],
  facilities: [
    { name: 'code', label: 'Kod', type: 'text', required: true },
    { name: 'name', label: 'Ad', type: 'text', required: true },
    { name: 'isActive', label: 'Aktif', type: 'bool' },
  ],
  'product-units': [
    { name: 'productId', label: 'Ürün', type: 'ref', required: true, refResource: 'products' },
    { name: 'unitId', label: 'Birim', type: 'ref', required: true, refResource: 'units' },
    { name: 'multiplier', label: 'Çarpan (baz birim adedi)', type: 'number' },
    { name: 'barcode', label: 'Barkod', type: 'text' },
    { name: 'isBaseUnit', label: 'Baz Birim', type: 'bool' },
    { name: 'batchTracking', label: 'Parti Takibi', type: 'bool' },
    { name: 'serialTracking', label: 'Seri Takibi', type: 'bool' },
  ],
  'location-groups': [
    { name: 'code', label: 'Kod', type: 'text', required: true },
    { name: 'name', label: 'Ad', type: 'text', required: true },
    { name: 'isWorkOrderGroup', label: 'İş Emri Grubu', type: 'bool' },
    { name: 'isActive', label: 'Aktif', type: 'bool' },
  ],
  sequences: [
    { name: 'code', label: 'Kod', type: 'text', required: true },
    { name: 'name', label: 'Tanım', type: 'text', required: true },
    { name: 'isAutomatic', label: 'Otomatik', type: 'bool' },
    { name: 'prefix', label: 'Ön Ek', type: 'text' },
    { name: 'padLength', label: 'Hane Sayısı', type: 'number' },
    { name: 'startNo', label: 'Başlangıç No', type: 'number' },
    { name: 'endNo', label: 'Bitiş No', type: 'number' },
  ],
  // Parametreler — Kod REHBERDEN seçilir (legacy TBLSBPARAMETRETANIM dökümü, StokBar davranışı);
  // listede kod "Kod — Tanım" olarak çözülür (selectLabelMap). Tanım ayrıca girilmez.
  parameters: [
    { name: 'code', label: 'Parametre (rehber)', type: 'select', required: true, options: PARAM_CATALOG },
    { name: 'value', label: 'Değer', type: 'text' },
  ],
  // Entegrasyon Paketi — form ÖZEL ekranda (IntegrationPackageForm: bağlantı profili + Adresler + Bağlantı Testi);
  // bu liste yalnız GenericList'i besler (hasForm + kolon başlıkları + tip çevirisi). Sır alanları listede gizli.
  'integration-packages': [
    { name: 'code', label: 'Kod', type: 'text', required: true },
    { name: 'name', label: 'Tanım', type: 'text' },
    { name: 'packageType', label: 'Paket Tipi', type: 'select', options: [
      { value: 'NETSIS_REST', label: 'Netsis REST' }, { value: 'LOGO_REST', label: 'Logo REST' }, { value: 'GENERIC_REST', label: 'Genel REST' },
    ] },
    { name: 'baseUrl', label: 'Sunucu Adresi', type: 'text' },
    { name: 'dbName', label: 'DB Adı', type: 'text' },
    { name: 'branchCode', label: 'Şube', type: 'text' },
    { name: 'firmNr', label: 'Firma No', type: 'text' },
    { name: 'periodNr', label: 'Dönem', type: 'text' },
    { name: 'logging', label: 'Log', type: 'bool' },
  ],
  // Entegrasyon Adres — StokBar Uyarlamalar › Entegrasyon › Entegrasyon Adres (düz ekran; paket formundaki
  // Adresler sekmesiyle aynı API). Tetikler legacy bayraklar: Yaratma/İlk Okutma/Onay/Kaydetme.
  'integration-addresses': [
    { name: 'packageId', label: 'Entegrasyon Paket', type: 'ref', required: true, refResource: 'integration-packages' },
    { name: 'operationTypeId', label: 'Operasyon Tipi', type: 'ref', refResource: 'operation-types' },
    { name: 'facilityId', label: 'Tesis', type: 'ref', refResource: 'facilities' },
    { name: 'name', label: 'Tanımı', type: 'text' },
    { name: 'path', label: 'Adres (path)', type: 'text', required: true },
    { name: 'sortOrder', label: 'Sıra', type: 'number' },
    { name: 'onCreate', label: 'Yaratma Entegrasyonu', type: 'bool' },
    { name: 'onFirstScan', label: 'İlk Okutma Entegrasyonu', type: 'bool' },
    { name: 'onConfirm', label: 'Onay Entegrasyonu', type: 'bool' },
    { name: 'onComplete', label: 'Kaydetme Entegrasyonu', type: 'bool' },
    { name: 'logging', label: 'Loglama', type: 'bool' },
  ],
  // Entegrasyon Okuma Sorgu — form ÖZEL ekranda (IntegrationQueryForm: sorgu + Kolon Dönüşüm sekmesi);
  // bu liste GenericList'i besler (hasForm + başlıklar + sorgu tipi çevirisi).
  'integration-queries': [
    { name: 'packageId', label: 'Entegrasyon Paket', type: 'ref', required: true, refResource: 'integration-packages' },
    { name: 'queryType', label: 'Sorgu Tipi', type: 'select', required: true, options: [
      { value: 'MALZEME', label: 'Malzeme' }, { value: 'CARI', label: 'Cari' }, { value: 'SIPARIS', label: 'Sipariş' },
      { value: 'FATURA', label: 'Fatura' }, { value: 'TALEP', label: 'Talep' },
    ] },
    { name: 'ordering', label: 'Sıralama', type: 'text' },
    { name: 'query', label: 'Sorgu', type: 'textarea', required: true },
  ],
  // Entegrasyon Yazma Parametre (legacy TBLSBENTYAZMAPARAMETRE) — GİDEN kırılım bayrakları
  'integration-write-params': [
    { name: 'facilityId', label: 'Tesis', type: 'ref', refResource: 'facilities' },
    { name: 'conversionId', label: 'Operasyon Tipi Dönüşüm', type: 'ref', refResource: 'operation-conversions' },
    { name: 'addressId', label: 'Entegrasyon Adres', type: 'ref', required: true, refResource: 'integration-addresses' },
    { name: 'bulkAction', label: 'Toplu İşlem', type: 'bool' },
    { name: 'batchTransfer', label: 'Batch Aktarımı', type: 'bool' },
    { name: 'palletBatchTransfer', label: 'Palet Batch Aktarımı', type: 'bool' },
    { name: 'serialTransfer', label: 'Seri Aktarımı', type: 'bool' },
  ],
  // Entegrasyon XML Convert (legacy TBLSBENTEGRASYONXMLCONVERT) — gövde dönüşüm şablonları
  'integration-xml-converts': [
    { name: 'name', label: 'Entegrasyon Adı', type: 'text', required: true },
    { name: 'xmlTemplate', label: 'XML Conversion', type: 'textarea' },
    { name: 'xslTemplate', label: 'XSL Conversion', type: 'textarea' },
  ],
  // Barkod Tipi — form ÖZEL ekranda (BarcodeTypeForm: eşleşme+mod+Segmentler+Test); bu liste yalnız
  // GenericList'i besler: buton görünürlüğü (hasForm) + kolon başlıkları (label) + mod değer çevirisi (select options).
  'barcode-types': [
    { name: 'code', label: 'Kod', type: 'text', required: true },
    { name: 'name', label: 'Tanım', type: 'text' },
    { name: 'sortOrder', label: 'Sıra', type: 'number' },
    { name: 'mode', label: 'Mod', type: 'select', options: [{ value: 'EAN', label: 'EAN — Ürün' }, { value: 'PALLET', label: 'Palet' }, { value: 'SEGMENT', label: 'Segment' }, { value: 'SCRIPT', label: 'Betik' }] },
    { name: 'matchPrefix', label: 'Önek', type: 'text' },
    { name: 'matchContains', label: 'İçerir', type: 'text' },
    { name: 'minLen', label: 'Min Uzunluk', type: 'number' },
    { name: 'maxLen', label: 'Max Uzunluk', type: 'number' },
    { name: 'separator', label: 'Ayraç', type: 'text' },
    { name: 'palletKeyLen', label: 'Palet No Uzunluğu', type: 'number' },
    { name: 'isProductionBarcode', label: 'Üretim Barkodu', type: 'bool' },
  ],
  // Legacy-sade (StokBar): Tesis + Yazıcı + Yazıcı Adresi. Firma EN ÜSTTE (GenericForm), sonra Tesis.
  printers: [
    { ...TESIS_REF, required: true },
    { name: 'name', label: 'Yazıcı', type: 'text', required: true },
    { name: 'address', label: 'Yazıcı Adresi (\\\\sunucu\\yazıcı veya IP)', type: 'text', required: true },
    { name: 'isDefault', label: 'Varsayılan', type: 'bool' },
    { name: 'isActive', label: 'Aktif', type: 'bool' },
  ],
  partners: [
    { name: 'code', label: 'Kod', type: 'text', required: true },
    { name: 'name', label: 'Ünvan', type: 'text', required: true },
    {
      name: 'type',
      label: 'Tip',
      type: 'select',
      options: [
        { value: 'CUSTOMER', label: 'Müşteri' },
        { value: 'SUPPLIER', label: 'Tedarikçi' },
        { value: 'BOTH', label: 'Her İkisi' },
      ],
    },
    { name: 'partnerGroupId', label: 'Cari Grubu', type: 'ref', refResource: 'partner-groups' },
    { name: 'regionId', label: 'Bölge', type: 'ref', refResource: 'regions' },
    { name: 'parentId', label: 'Üst Cari (zincir)', type: 'ref', refResource: 'partners' },
    { name: 'taxNumber', label: 'Vergi No', type: 'text' },
    { name: 'phone', label: 'Telefon', type: 'text' },
    { name: 'email', label: 'E-posta', type: 'text' },
    { name: 'city', label: 'Şehir', type: 'text' },
  ],
  products: [
    { name: 'code', label: 'Kod', type: 'text', required: true },
    { name: 'name', label: 'Ad', type: 'text', required: true },
    { name: 'unitId', label: 'Ana Birim', type: 'ref', required: true, refResource: 'units' },
    { name: 'barcode', label: 'Barkod', type: 'text' },
    { name: 'isActive', label: 'Aktif', type: 'bool' },
  ],
}

export const hasForm = (resource: string) => resource in FORM_CONFIG

export const canWrite = (): boolean => {
  try {
    const u = JSON.parse(localStorage.getItem('og_user') ?? '{}')
    return Boolean(u?.isSuperAdmin) || (u?.roles ?? []).some((r: string) => ['ADMIN', 'OPERATOR'].includes(r))
  } catch {
    return false
  }
}
