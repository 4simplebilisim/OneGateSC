// OneGate kaynakları — menü 3 katmanlı: SECTION (üst) → group (tematik) → kaynak
// Mantık StokBar'dan: Tanımlamalar (master) / İşlemler (transaction) / Uyarlamalar (config)
export interface ResourceDef {
  name: string // API path (/api/<name>)
  label: string
  section: 'Tanımlamalar' | 'İşlemler' | 'Uyarlamalar'
  group: string
}

export const SECTIONS: ResourceDef['section'][] = ['Tanımlamalar', 'İşlemler', 'Uyarlamalar']

export const RESOURCES: ResourceDef[] = [
  // ── Tanımlamalar (master data) ──
  { name: 'products', label: 'Ürünler', section: 'Tanımlamalar', group: 'Ürün' },
  { name: 'product-groups', label: 'Ürün Grupları', section: 'Tanımlamalar', group: 'Ürün' },
  { name: 'product-subgroups', label: 'Ürün Alt-Grupları', section: 'Tanımlamalar', group: 'Ürün' },
  { name: 'product-types', label: 'Ürün Tipleri', section: 'Tanımlamalar', group: 'Ürün' },
  { name: 'product-detail-types', label: 'Ürün Detay Tipleri', section: 'Tanımlamalar', group: 'Ürün' },
  { name: 'units', label: 'Birimler', section: 'Tanımlamalar', group: 'Ürün' },
  // NOT: Ölçü Birimleri / Muadil / Güvenli St / Ek Gruplar → Ürün düzenleme sekmesi (ayrı menü değil).
  { name: 'partners', label: 'Cariler', section: 'Tanımlamalar', group: 'Cari' },
  { name: 'partner-groups', label: 'Cari Grupları', section: 'Tanımlamalar', group: 'Cari' },
  { name: 'regions', label: 'Bölgeler', section: 'Tanımlamalar', group: 'Cari' },
  // Lokasyon hiyerarşisi: Tesis → Depo → Alan → Lokasyon
  { name: 'facilities', label: 'Tesisler', section: 'Tanımlamalar', group: 'Lokasyon' },
  { name: 'warehouses', label: 'Depolar', section: 'Tanımlamalar', group: 'Lokasyon' },
  { name: 'areas', label: 'Alanlar', section: 'Tanımlamalar', group: 'Lokasyon' },
  { name: 'locations', label: 'Lokasyonlar', section: 'Tanımlamalar', group: 'Lokasyon' },
  { name: 'location-groups', label: 'Lokasyon Grupları', section: 'Tanımlamalar', group: 'Lokasyon' },
  { name: 'location-capacities', label: 'Lokasyon Kapasite', section: 'Tanımlamalar', group: 'Lokasyon' },
  // Statü / Neden / Palet Tipi = master tanımlar → grupsuz, doğrudan Tanımlamalar altında (tek tek)
  { name: 'statuses', label: 'Statüler', section: 'Tanımlamalar', group: '' },
  { name: 'reasons', label: 'Nedenler', section: 'Tanımlamalar', group: '' },
  { name: 'pallet-types', label: 'Palet Tipleri', section: 'Tanımlamalar', group: '' },

  // ── İşlemler (transaction) — StokBar domain grupları ──
  { name: 'documents', label: 'Belgeler', section: 'İşlemler', group: 'Belge' },
  { name: 'stock-counts', label: 'Sayımlar', section: 'İşlemler', group: 'Sayım' },
  { name: 'pallets', label: 'Paletler', section: 'İşlemler', group: 'Palet' },
  // NOT: Kalite ayrı modül değil — statü (QUARANTINE/BLOCKED) + operasyon-statü geçişleriyle takip edilir.
  { name: 'work-orders', label: 'İş Emirleri', section: 'İşlemler', group: 'İş Emri' },
  { name: 'stock', label: 'Stok (Durum)', section: 'İşlemler', group: 'Stok' },
  { name: 'purchase-orders', label: 'Satınalma Siparişleri', section: 'İşlemler', group: 'Sipariş' },
  { name: 'sales-orders', label: 'Satış Siparişleri', section: 'İşlemler', group: 'Sipariş' },
  { name: 'vehicles', label: 'Araçlar', section: 'İşlemler', group: 'Lojistik' },
  { name: 'shipments', label: 'Sevkiyatlar', section: 'İşlemler', group: 'Lojistik' },
  { name: 'invoices', label: 'Faturalar', section: 'İşlemler', group: 'Finans' },

  // ── Uyarlamalar (configuration) — grup düzeni StokBar Uyarlamalar menüsüne göre ──
  // Genel
  { name: 'sequences', label: 'Sayaçlar', section: 'Uyarlamalar', group: 'Genel' },
  { name: 'parameters', label: 'Parametreler', section: 'Uyarlamalar', group: 'Genel' },
  { name: 'barcode-types', label: 'Barkod Tipleri', section: 'Uyarlamalar', group: 'Genel' },
  { name: 'printers', label: 'Yazıcılar', section: 'Uyarlamalar', group: 'Genel' },
  { name: 'languages', label: 'Dil', section: 'Uyarlamalar', group: 'Genel' },
  { name: 'shifts', label: 'Vardiya', section: 'Uyarlamalar', group: 'Genel' },
  { name: 'screen-report-links', label: 'Ekran Rapor Bağlantı', section: 'Uyarlamalar', group: 'Genel' },
  { name: 'stock-control-parameters', label: 'Stok Kontrol Parametre', section: 'Uyarlamalar', group: 'Genel' },
  { name: 'document-planning-parameters', label: 'Belge Planlama Parametre', section: 'Uyarlamalar', group: 'Genel' },
  { name: 'pick-order-parameters', label: 'Toplama Emri Parametre', section: 'Uyarlamalar', group: 'Genel' },
  { name: 'dashboard-reports', label: 'Dashboard Rapor', section: 'Uyarlamalar', group: 'Genel' },
  // Operasyon  ("ikisi birden": Operasyon Tipleri sekmeli editör + bağlantılara düz menü erişimi de var) — StokBar Operasyon grubu
  { name: 'operation-types', label: 'Operasyon Tipleri', section: 'Uyarlamalar', group: 'Operasyon' },
  { name: 'operation-groups', label: 'Operasyon Grupları', section: 'Uyarlamalar', group: 'Operasyon' },
  { name: 'reason-categories', label: 'Neden Kategori', section: 'Uyarlamalar', group: 'Operasyon' },
  // NOT: operasyona AİT config'ler (Statü/Lokasyon/Neden/Palet + Tolerans/Yasaklı Ürün/Dönüşüm/Toplu İşlem/Grup Bağlantı)
  // ayrı menü DEĞİL — Operasyon Tipi tanım ekranında SEKME (Kurallar sekmesi dahil).
  // Aşağıdakiler İKİ operasyon arası junction (tek op'a ait değil) → menüde kalır:
  { name: 'sequential-operations', label: 'Sıralı Operasyon', section: 'Uyarlamalar', group: 'Operasyon' },
  { name: 'auto-reference-documents', label: 'Otomatik Ref. Kontrollü Belge', section: 'Uyarlamalar', group: 'Operasyon' },
  { name: 'product-based-collections', label: 'Ürün Bazında Toplama Bağlantı', section: 'Uyarlamalar', group: 'Operasyon' },
  { name: 'trip-based-collections', label: 'Sefer Bazında Toplama Bağlantı', section: 'Uyarlamalar', group: 'Operasyon' },
  // Belge Tipleri
  { name: 'document-statuses', label: 'Belge Durumları', section: 'Uyarlamalar', group: 'Belge Tipleri' },
  { name: 'document-status-actions', label: 'Belge Durum İşlem', section: 'Uyarlamalar', group: 'Belge Tipleri' },
  { name: 'document-status-criteria', label: 'Belge Durum Kriter', section: 'Uyarlamalar', group: 'Belge Tipleri' },
  { name: 'document-approval-types', label: 'Belge Onay Tipi', section: 'Uyarlamalar', group: 'Belge Tipleri' },
  // Giriş Koşulları (StokBar)
  { name: 'entry-condition-break-passwords', label: 'Giriş Koşul Kırma Şifresi', section: 'Uyarlamalar', group: 'Giriş Koşulları' },
  { name: 'entry-condition-break-reasons', label: 'Giriş Koşul Kırma Nedeni', section: 'Uyarlamalar', group: 'Giriş Koşulları' },
  { name: 'entry-condition-types', label: 'Giriş Koşul Tipi', section: 'Uyarlamalar', group: 'Giriş Koşulları' },
  { name: 'entry-condition-type-operations', label: 'Giriş Koşul Tipi Operasyon', section: 'Uyarlamalar', group: 'Giriş Koşulları' },
  // Çıkış Koşulları (StokBar)
  { name: 'exit-condition-control-fields', label: 'Çıkış Koşul Kontrol Sahası', section: 'Uyarlamalar', group: 'Çıkış Koşulları' },
  { name: 'exit-condition-break-passwords', label: 'Çıkış Koşul Kırma Şifresi', section: 'Uyarlamalar', group: 'Çıkış Koşulları' },
  { name: 'exit-condition-break-reasons', label: 'Çıkış Koşul Kırma Nedeni', section: 'Uyarlamalar', group: 'Çıkış Koşulları' },
  { name: 'exit-condition-types', label: 'Çıkış Koşul Tipi', section: 'Uyarlamalar', group: 'Çıkış Koşulları' },
  { name: 'exit-condition-type-operations', label: 'Çıkış Koşul Tipi Operasyon', section: 'Uyarlamalar', group: 'Çıkış Koşulları' },
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
  // Dinamik Etiketleme
  { name: 'label-types', label: 'Etiket Tipleri', section: 'Uyarlamalar', group: 'Dinamik Etiketleme' },
  { name: 'menu-groups', label: 'Menü Grubu', section: 'Uyarlamalar', group: 'Dinamik Etiketleme' },
  // İş Emri (uyarlama config)
  { name: 'warehouse-vehicles', label: 'Depo Araç', section: 'Uyarlamalar', group: 'İş Emri' },
  { name: 'work-order-general-parameters', label: 'İş Emri Genel Parametre', section: 'Uyarlamalar', group: 'İş Emri' },
  { name: 'work-order-reasons', label: 'İş Emri Nedenleri', section: 'Uyarlamalar', group: 'İş Emri' },
  { name: 'work-order-reference-operations', label: 'İş Emri Referans Operasyon', section: 'Uyarlamalar', group: 'İş Emri' },
  { name: 'rack-feed-parameters', label: 'Raf Besleme Parametre', section: 'Uyarlamalar', group: 'İş Emri' },
]

export const sectionOf = (name: string) => RESOURCES.find((r) => r.name === name)?.section ?? SECTIONS[0]
