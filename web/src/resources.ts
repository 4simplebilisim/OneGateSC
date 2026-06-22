// OneGate kaynakları — menü 3 katmanlı: SECTION (üst) → group (tematik) → kaynak
// Mantık StokBar'dan: Tanımlamalar (master) / İşlemler (transaction) / Uyarlamalar (config)
export interface ResourceDef {
  name: string // route path + menü anahtarı
  label: string
  section: 'Tanımlamalar' | 'İşlemler' | 'Uyarlamalar' | 'Raporlar'
  group: string
  apiName?: string // API kaynağı (verilmezse name) — yön-filtreli görünümler için
  filter?: Record<string, string> // liste GET'ine eklenen sabit query (ör. direction)
  hidden?: boolean // menüde gösterilmez ama rota üretilir (detay/all-list için)
  observe?: boolean // Gözlem modu — salt-okunur (Yeni/Kopyala/Düzenle/Sil gizli), sadece izleme
}

export const SECTIONS: ResourceDef['section'][] = ['Tanımlamalar', 'İşlemler', 'Uyarlamalar', 'Raporlar']

export const RESOURCES: ResourceDef[] = [
  // ── Tanımlamalar (master data) ──
  { name: 'products', label: 'Ürünler', section: 'Tanımlamalar', group: 'Ürün' },
  { name: 'product-groups', label: 'Ürün Grupları', section: 'Tanımlamalar', group: 'Ürün' },
  { name: 'product-subgroups', label: 'Ürün Alt-Grupları', section: 'Tanımlamalar', group: 'Ürün' },
  { name: 'product-types', label: 'Ürün Tipleri', section: 'Tanımlamalar', group: 'Ürün' },
  { name: 'product-detail-types', label: 'Ürün Detay Tipleri', section: 'Tanımlamalar', group: 'Ürün' },
  { name: 'units', label: 'Birimler', section: 'Tanımlamalar', group: 'Ürün' },
  // NOT: Ölçü Birimleri / Muadil / Güvenli St / Ek Gruplar → Ürün düzenleme sekmesi (ayrı menü değil).
  { name: 'regions', label: 'Bölge', section: 'Tanımlamalar', group: 'Müşteriler' },
  { name: 'partners', label: 'Müşteri', section: 'Tanımlamalar', group: 'Müşteriler' },
  { name: 'partner-groups', label: 'Müşteri Grup', section: 'Tanımlamalar', group: 'Müşteriler' },
  { name: 'partner-extra-groups', label: 'Müşteri Ek Grup', section: 'Tanımlamalar', group: 'Müşteriler' },
  { name: 'partner-extra-field-defs', label: 'Müşteri Ek Sahaları', section: 'Tanımlamalar', group: 'Müşteriler' },
  // Lokasyon hiyerarşisi: Tesis → Depo → Alan → Lokasyon
  { name: 'facilities', label: 'Tesisler', section: 'Tanımlamalar', group: 'Lokasyon' },
  { name: 'warehouses', label: 'Depolar', section: 'Tanımlamalar', group: 'Lokasyon' },
  { name: 'areas', label: 'Alanlar', section: 'Tanımlamalar', group: 'Lokasyon' },
  { name: 'locations', label: 'Lokasyonlar', section: 'Tanımlamalar', group: 'Lokasyon' },
  { name: 'location-groups', label: 'Lokasyon Grupları', section: 'Tanımlamalar', group: 'Lokasyon' },
  { name: 'location-capacities', label: 'Lokasyon Kapasite', section: 'Tanımlamalar', group: 'Lokasyon' },
  // Statü / Neden / Palet Tipi = master tanımlar → grupsuz, doğrudan Tanımlamalar altında (tek tek)
  { name: 'statuses', label: 'Statüler', section: 'Tanımlamalar', group: '' },
  { name: 'pallet-types', label: 'Palet Tipleri', section: 'Tanımlamalar', group: '' },
  // NOT: Neden (reasons) → Uyarlamalar > Operasyon altına taşındı (StokBar yerleşimi).

  // ── İşlemler (transaction) — StokBar gibi: Giriş/Çıkış/Transfer her biri GRUP. Her grupta TEK "Belgeler"
  // (durum filtresi — Tümü/Açık/Tamamlanmış — liste içi segment; ayrı "Açık Belgeler"/"Gözlem" menüsü YOK).
  { name: 'documents', label: 'Belgeler', section: 'İşlemler', group: '', hidden: true }, // detay+all-list rotası (menüde gizli)
  // Her yön grubunda: Belge (yönetim+kopyalama) + Gözlem (salt-okunur izleme) — StokBar gibi
  { name: 'documents-in', label: 'Belge', section: 'İşlemler', group: 'Giriş', apiName: 'documents', filter: { direction: 'INBOUND' } },
  { name: 'documents-in-obs', label: 'Gözlem', section: 'İşlemler', group: 'Giriş', apiName: 'documents', filter: { direction: 'INBOUND' }, observe: true },
  { name: 'entry-labeling', label: 'Giriş Etiketleme', section: 'İşlemler', group: 'Giriş' },
  { name: 'putaway-suggest', label: 'Giriş Öneri Listesi', section: 'İşlemler', group: 'Giriş' },
  { name: 'stock-entry', label: 'Stok Giriş', section: 'İşlemler', group: 'Giriş' },
  { name: 'document-assignments', label: 'İş Atama', section: 'İşlemler', group: 'Giriş' },
  { name: 'documents-out', label: 'Belge', section: 'İşlemler', group: 'Çıkış', apiName: 'documents', filter: { direction: 'OUTBOUND' } },
  { name: 'documents-out-obs', label: 'Gözlem', section: 'İşlemler', group: 'Çıkış', apiName: 'documents', filter: { direction: 'OUTBOUND' }, observe: true },
  { name: 'exit-labeling', label: 'Çıkış Etiketleme', section: 'İşlemler', group: 'Çıkış' },
  { name: 'pick-suggest', label: 'Çıkış Öneri Listesi', section: 'İşlemler', group: 'Çıkış' },
  { name: 'bulk-doc-ops', label: 'Toplu İşlem', section: 'İşlemler', group: 'Çıkış' },
  { name: 'stock-exit', label: 'Stok Çıkış', section: 'İşlemler', group: 'Çıkış' },
  { name: 'document-assignments-out', label: 'İş Atama', section: 'İşlemler', group: 'Çıkış', apiName: 'document-assignments' },
  { name: 'shipments-loading', label: 'Yükleme Takip', section: 'İşlemler', group: 'Çıkış', apiName: 'shipments' },
  { name: 'documents-tr', label: 'Belge', section: 'İşlemler', group: 'Transfer', apiName: 'documents', filter: { direction: 'INTERNAL' } },
  { name: 'documents-tr-obs', label: 'Gözlem', section: 'İşlemler', group: 'Transfer', apiName: 'documents', filter: { direction: 'INTERNAL' }, observe: true },
  { name: 'reservation', label: 'Rezervasyon', section: 'İşlemler', group: 'Transfer' },
  { name: 'stock-reclassify', label: 'Stok Operasyon', section: 'İşlemler', group: 'Transfer' },
  { name: 'document-assignments-tr', label: 'İş Atama', section: 'İşlemler', group: 'Transfer', apiName: 'document-assignments' },
  // Entegrasyon: izleme (Gelen/Giden) + manuel tetikleme (Entegrasyon Aktarım) — hepsi /api/integration-logs
  { name: 'integration-in', label: 'Gelen Aktarım İzleme', section: 'İşlemler', group: 'Entegrasyon', apiName: 'integration-logs', filter: { direction: 'IN' } },
  { name: 'integration-out', label: 'Giden Aktarım İzleme', section: 'İşlemler', group: 'Entegrasyon', apiName: 'integration-logs', filter: { direction: 'OUT' } },
  { name: 'integration-logs', label: 'Entegrasyon Aktarım', section: 'İşlemler', group: 'Entegrasyon' },
  // Sayım
  { name: 'stock-counts', label: 'Sayım Girişi', section: 'İşlemler', group: 'Sayım' },
  { name: 'count-differences', label: 'Sayım Fark', section: 'İşlemler', group: 'Sayım' },
  { name: 'count-approval', label: 'Sayım Onayı', section: 'İşlemler', group: 'Sayım', apiName: 'stock-counts', filter: { status: 'COUNTING' } },
  { name: 'count-approval-cancel', label: 'Sayım Onayı İptal', section: 'İşlemler', group: 'Sayım', apiName: 'stock-counts', filter: { status: 'COMPLETED' } },
  { name: 'control-counts', label: 'Kontrol Sayım', section: 'İşlemler', group: 'Sayım' },
  { name: 'count-assignments', label: 'Sayım İş Atama', section: 'İşlemler', group: 'Sayım' },
  { name: 'pallets', label: 'Palet İşlemleri', section: 'İşlemler', group: 'Palet' },
  { name: 'pallets-bulk', label: 'Toplu Palet Güncelleme', section: 'İşlemler', group: 'Palet' },
  { name: 'pallet-notifications', label: 'Palet Bildirim', section: 'İşlemler', group: 'Palet' },
  { name: 'pallet-history', label: 'Palet Tarihçe', section: 'İşlemler', group: 'Palet', observe: true },
  // Diğer İşlemler — çekirdek WMS dışı modüller tek grupta (sadeleştirme: İş Emri/Stok/Sipariş/Lojistik/Finans)
  // NOT: Kalite ayrı modül değil — statü (QUARANTINE/BLOCKED) + operasyon-statü geçişleriyle takip edilir.
  // RAFA KALDIRILDI (2026-06-20): "Diğer İşlemler" menüde fazla duruyordu → hidden:true (rota+backend durur, menüde gizli).
  // Geri açmak için hidden'ları kaldır. WMS-dışı modüller (İş Emri/Sipariş/Lojistik/Finans) demo sonrası geri gelebilir.
  { name: 'work-orders', label: 'İş Emirleri', section: 'İşlemler', group: 'Diğer İşlemler', hidden: true },
  { name: 'purchase-orders', label: 'Satınalma Siparişleri', section: 'İşlemler', group: 'Diğer İşlemler', hidden: true },
  { name: 'sales-orders', label: 'Satış Siparişleri', section: 'İşlemler', group: 'Diğer İşlemler', hidden: true },
  { name: 'shipments', label: 'Sevkiyatlar', section: 'İşlemler', group: 'Diğer İşlemler', hidden: true },
  { name: 'vehicles', label: 'Araçlar', section: 'İşlemler', group: 'Diğer İşlemler', hidden: true },
  { name: 'invoices', label: 'Faturalar', section: 'İşlemler', group: 'Diğer İşlemler', hidden: true },
  { name: 'stock', label: 'Stok (Durum)', section: 'İşlemler', group: 'Diğer İşlemler', hidden: true },
  { name: 'stock-ledger', label: 'Stok Hareket Defteri', section: 'İşlemler', group: 'Diğer İşlemler', hidden: true, observe: true },

  // ── Uyarlamalar (configuration) — grup düzeni StokBar Uyarlamalar menüsüne göre ──
  // Genel
  { name: 'sequences', label: 'Sayaçlar', section: 'Uyarlamalar', group: 'Genel' },
  { name: 'parameters', label: 'Parametreler', section: 'Uyarlamalar', group: 'Genel' },
  { name: 'barcode-types', label: 'Barkod Tipleri', section: 'Uyarlamalar', group: 'Genel' },
  { name: 'printers', label: 'Yazıcılar', section: 'Uyarlamalar', group: 'Genel' },
  { name: 'languages', label: 'Dil', section: 'Uyarlamalar', group: 'Genel' },
  // NOT: Vardiya (shifts) kaldırıldı — üretim modülü kapsam dışı, içeriği boştu.
  { name: 'screen-report-links', label: 'Ekran Rapor Bağlantı', section: 'Uyarlamalar', group: 'Genel' },
  { name: 'stock-control-parameters', label: 'Stok Kontrol Parametre', section: 'Uyarlamalar', group: 'Genel' },
  { name: 'document-planning-parameters', label: 'Belge Planlama Parametre', section: 'Uyarlamalar', group: 'Genel' },
  { name: 'pick-order-parameters', label: 'Toplama Emri Parametre', section: 'Uyarlamalar', group: 'Genel' },
  { name: 'dashboard-reports', label: 'Dashboard Rapor', section: 'Uyarlamalar', group: 'Genel' },
  // Operasyon  ("ikisi birden": Operasyon Tipleri sekmeli editör + bağlantılara düz menü erişimi de var) — StokBar Operasyon grubu
  // StokBar Operasyon menü sırası — junction'lar HEM Operasyon Tipi tanım sekmesinde HEM flat menüde (ikisi birden).
  { name: 'reason-categories', label: 'Neden Kategori', section: 'Uyarlamalar', group: 'Operasyon' },
  { name: 'reasons', label: 'Neden', section: 'Uyarlamalar', group: 'Operasyon' },
  // NOT: "Operasyon Neden" (operation-type-reasons) menüden çıkarıldı — Operasyon Tipi tanım ekranı > Neden sekmesinde zaten var.
  { name: 'operation-types', label: 'Operasyon Tipi', section: 'Uyarlamalar', group: 'Operasyon' },
  { name: 'operation-groups', label: 'Grup', section: 'Uyarlamalar', group: 'Operasyon' },
  { name: 'operation-group-links', label: 'Grup Bağlantı', section: 'Uyarlamalar', group: 'Operasyon' },
  { name: 'operation-type-locations', label: 'Lokasyon', section: 'Uyarlamalar', group: 'Operasyon' },
  { name: 'operation-type-statuses', label: 'Statü', section: 'Uyarlamalar', group: 'Operasyon' },
  { name: 'operation-tolerances', label: 'Tolerans', section: 'Uyarlamalar', group: 'Operasyon' },
  { name: 'operation-forbidden-products', label: 'Yasaklı Ürün', section: 'Uyarlamalar', group: 'Operasyon' },
  { name: 'operation-type-pallet-types', label: 'Palet Tipi', section: 'Uyarlamalar', group: 'Operasyon' },
  { name: 'operation-conversions', label: 'Dönüşüm', section: 'Uyarlamalar', group: 'Operasyon' },
  { name: 'sequential-operations', label: 'Sıralı Operasyon', section: 'Uyarlamalar', group: 'Operasyon' },
  { name: 'auto-reference-documents', label: 'Otomatik Ref. Kontrollü Belge', section: 'Uyarlamalar', group: 'Operasyon' },
  { name: 'operation-bulk-actions', label: 'Toplu İşlem Bağlantı', section: 'Uyarlamalar', group: 'Operasyon' },
  { name: 'product-based-collections', label: 'Ürün Bazında Toplama Bağlantı', section: 'Uyarlamalar', group: 'Operasyon' },
  { name: 'trip-based-collections', label: 'Sefer Bazında Toplama Bağlantı', section: 'Uyarlamalar', group: 'Operasyon' },
  // Belge Tipleri
  { name: 'document-statuses', label: 'Belge Durumları', section: 'Uyarlamalar', group: 'Belge Tipleri' },
  { name: 'document-status-actions', label: 'Belge Durum İşlem', section: 'Uyarlamalar', group: 'Belge Tipleri' },
  { name: 'document-status-criteria', label: 'Belge Durum Kriter', section: 'Uyarlamalar', group: 'Belge Tipleri' },
  { name: 'document-approval-types', label: 'Belge Onay Tipi', section: 'Uyarlamalar', group: 'Belge Tipleri' },
  // Saha Tanımlamaları — Ek Saha (Dinamik+Statik TEK ekran, Tip ile ayrışır) + Operasyon Tipi Saha Bağlantı
  { name: 'extra-fields', label: 'Ek Saha', section: 'Uyarlamalar', group: 'Saha Tanımlamaları' },
  { name: 'operation-type-extra-fields', label: 'Operasyon Tipi Saha Bağlantı', section: 'Uyarlamalar', group: 'Saha Tanımlamaları' },
  // Giriş Koşulları (StokBar)
  { name: 'entry-condition-break-passwords', label: 'Giriş Koşul Kırma Şifresi', section: 'Uyarlamalar', group: 'Giriş Koşulları' },
  { name: 'entry-condition-break-reasons', label: 'Giriş Koşul Kırma Nedeni', section: 'Uyarlamalar', group: 'Giriş Koşulları' },
  { name: 'entry-condition-types', label: 'Giriş Koşul Tipi', section: 'Uyarlamalar', group: 'Giriş Koşulları' },
  { name: 'entry-condition-type-operations', label: 'Giriş Koşul Tipi Operasyon', section: 'Uyarlamalar', group: 'Giriş Koşulları' },
  { name: 'entry-condition-parameters', label: 'Giriş Koşul Parametre', section: 'Uyarlamalar', group: 'Giriş Koşulları' },
  { name: 'entry-condition-logs', label: 'Giriş Koşul Log', section: 'Uyarlamalar', group: 'Giriş Koşulları', apiName: 'condition-break-logs', filter: { conditionType: 'ENTRY' }, observe: true },
  // Çıkış Koşulları (StokBar)
  { name: 'exit-condition-control-fields', label: 'Çıkış Koşul Kontrol Sahası', section: 'Uyarlamalar', group: 'Çıkış Koşulları' },
  { name: 'exit-condition-break-passwords', label: 'Çıkış Koşul Kırma Şifresi', section: 'Uyarlamalar', group: 'Çıkış Koşulları' },
  { name: 'exit-condition-break-reasons', label: 'Çıkış Koşul Kırma Nedeni', section: 'Uyarlamalar', group: 'Çıkış Koşulları' },
  { name: 'exit-condition-types', label: 'Çıkış Koşul Tipi', section: 'Uyarlamalar', group: 'Çıkış Koşulları' },
  { name: 'exit-condition-type-operations', label: 'Çıkış Koşul Tipi Operasyon', section: 'Uyarlamalar', group: 'Çıkış Koşulları' },
  { name: 'exit-condition-parameters', label: 'Çıkış Koşul Parametre', section: 'Uyarlamalar', group: 'Çıkış Koşulları' },
  { name: 'exit-condition-logs', label: 'Çıkış Koşul Log', section: 'Uyarlamalar', group: 'Çıkış Koşulları', apiName: 'condition-break-logs', filter: { conditionType: 'EXIT' }, observe: true },
  // Yönlendirme (StokBar)
  { name: 'routing-control-fields', label: 'Yönlendirme Tipi Kontrol Sahası', section: 'Uyarlamalar', group: 'Yönlendirme' },
  { name: 'routing-break-passwords', label: 'Yönlendirme Tipi Kırma Şifresi', section: 'Uyarlamalar', group: 'Yönlendirme' },
  { name: 'routing-break-reasons', label: 'Yönlendirme Tipi Kırma Nedeni', section: 'Uyarlamalar', group: 'Yönlendirme' },
  { name: 'routing-types', label: 'Yönlendirme Tipi', section: 'Uyarlamalar', group: 'Yönlendirme' },
  { name: 'routing-type-operations', label: 'Yönlendirme Tipi Operasyon', section: 'Uyarlamalar', group: 'Yönlendirme' },
  { name: 'routing-product-locations', label: 'Yönlendirme Ürün Lokasyon', section: 'Uyarlamalar', group: 'Yönlendirme' },
  { name: 'routing-rules', label: 'Yönlendirme Kuralları', section: 'Uyarlamalar', group: 'Yönlendirme' },
  // Sayım (StokBar)
  { name: 'count-parameters', label: 'Sayım Parametreleri', section: 'Uyarlamalar', group: 'Sayım' },
  { name: 'count-criteria', label: 'Sayım Kriter', section: 'Uyarlamalar', group: 'Sayım' },
  { name: 'count-approval-user-groups', label: 'Sayım Onay Kullanıcı Grubu', section: 'Uyarlamalar', group: 'Sayım' },
  // Dinamik Etiketleme — Etiket Tipi (StokBar item+sorgu form-builder) + Etiket Tasarımcı (görsel layout) + Menü Grubu
  { name: 'label-templates', label: 'Etiket Tipi', section: 'Uyarlamalar', group: 'Dinamik Etiketleme' },
  { name: 'label-types', label: 'Etiket Tasarımcı', section: 'Uyarlamalar', group: 'Dinamik Etiketleme' },
  { name: 'menu-groups', label: 'Menü Grubu', section: 'Uyarlamalar', group: 'Dinamik Etiketleme' },
  // İş Emri (uyarlama config)
  { name: 'warehouse-vehicles', label: 'Depo Araç', section: 'Uyarlamalar', group: 'İş Emri' },
  { name: 'work-order-general-parameters', label: 'İş Emri Genel Parametre', section: 'Uyarlamalar', group: 'İş Emri' },
  { name: 'work-order-reasons', label: 'İş Emri Nedenleri', section: 'Uyarlamalar', group: 'İş Emri' },
  { name: 'work-order-reference-operations', label: 'İş Emri Referans Operasyon', section: 'Uyarlamalar', group: 'İş Emri' },
  { name: 'rack-feed-parameters', label: 'Raf Besleme Parametre', section: 'Uyarlamalar', group: 'İş Emri' },
  // Rapor tanım tabloları (metadata-driven motor: Başlık + Kriter + Saha)
  { name: 'report-defs', label: 'Rapor Başlık', section: 'Uyarlamalar', group: 'Rapor' },
  { name: 'report-criteria', label: 'Rapor Kriter', section: 'Uyarlamalar', group: 'Rapor' },
  { name: 'report-fields', label: 'Rapor Saha', section: 'Uyarlamalar', group: 'Rapor' },

  // ── Sistem (kullanıcı yönetimi + yetkiler) — ADMIN ──
  { name: 'users', label: 'Kullanıcılar', section: 'Uyarlamalar', group: 'Sistem' },

  // ── Raporlar — metadata-driven rapor merkezi (Başlık/Kriter/Saha'dan dinamik) ──
  { name: 'report-center', label: 'Raporlar', section: 'Raporlar', group: '' },
]

export const sectionOf = (name: string) => RESOURCES.find((r) => r.name === name)?.section ?? SECTIONS[0]
