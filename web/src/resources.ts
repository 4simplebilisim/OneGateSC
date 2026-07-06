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
  // Ek Grup + Ek Saha: cari kartının "Gruplar"/"Ek Sahalar" sekmelerinin beslediği MASTER tanımlar (boş ama ölü değil)
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
  // Statüler + Palet Tipleri: Tanımlamalar'dan Uyarlamalar › Genel'e taşındı (operasyon uyarlamasının parçası)
  { name: 'statuses', label: 'Statüler', section: 'Uyarlamalar', group: 'Genel' },
  { name: 'pallet-types', label: 'Palet Tipleri', section: 'Uyarlamalar', group: 'Genel' },
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
  { name: 'bulk-doc-ops-in', label: 'Toplu İşlem', section: 'İşlemler', group: 'Giriş' },
  { name: 'doc-assign-in', label: 'İş Atama', section: 'İşlemler', group: 'Giriş' },
  { name: 'documents-out', label: 'Belge', section: 'İşlemler', group: 'Çıkış', apiName: 'documents', filter: { direction: 'OUTBOUND' } },
  { name: 'documents-out-obs', label: 'Gözlem', section: 'İşlemler', group: 'Çıkış', apiName: 'documents', filter: { direction: 'OUTBOUND' }, observe: true },
  { name: 'exit-labeling', label: 'Çıkış Etiketleme', section: 'İşlemler', group: 'Çıkış' },
  { name: 'pick-suggest', label: 'Çıkış Öneri Listesi', section: 'İşlemler', group: 'Çıkış' },
  { name: 'bulk-doc-ops', label: 'Toplu İşlem', section: 'İşlemler', group: 'Çıkış' },
  { name: 'doc-assign-out', label: 'İş Atama', section: 'İşlemler', group: 'Çıkış' },
  { name: 'stock-exit', label: 'Stok Çıkış', section: 'İşlemler', group: 'Çıkış' },
  { name: 'shipments-loading', label: 'Yükleme Takip', section: 'İşlemler', group: 'Çıkış', apiName: 'shipments' },
  { name: 'documents-tr', label: 'Belge', section: 'İşlemler', group: 'Transfer', apiName: 'documents', filter: { direction: 'INTERNAL' } },
  { name: 'documents-tr-obs', label: 'Gözlem', section: 'İşlemler', group: 'Transfer', apiName: 'documents', filter: { direction: 'INTERNAL' }, observe: true },
  { name: 'reservation', label: 'Rezervasyon', section: 'İşlemler', group: 'Transfer' },
  { name: 'bulk-doc-ops-tr', label: 'Toplu İşlem', section: 'İşlemler', group: 'Transfer' },
  { name: 'doc-assign-tr', label: 'İş Atama', section: 'İşlemler', group: 'Transfer' },
  { name: 'stock-reclassify', label: 'Stok Operasyon', section: 'İşlemler', group: 'Transfer' },
  // Entegrasyon (Gelen/Giden İzleme + Aktarım): menüden kaldırıldı (altı boş — entegrasyon bacağı henüz yok);
  // entegrasyon geldiğinde geri açılır — API/kod durur (integration-logs; Dönüşüm kodu eşlemesi hazır)
  // Sayım
  { name: 'stock-counts', label: 'Sayım Girişi', section: 'İşlemler', group: 'Sayım' },
  { name: 'count-differences', label: 'Sayım Fark', section: 'İşlemler', group: 'Sayım' },
  { name: 'count-approval', label: 'Sayım Onayı', section: 'İşlemler', group: 'Sayım', apiName: 'stock-counts', filter: { status: 'COUNTING' } },
  { name: 'count-approval-cancel', label: 'Sayım Onayı İptal', section: 'İşlemler', group: 'Sayım', apiName: 'stock-counts', filter: { status: 'COMPLETED' } },
  // Kontrol Sayım + Sayım İş Atama: menüden kaldırıldı (altı boş, davranış bağlanmadı) — API/kod durur
  { name: 'pallets', label: 'Palet İşlemleri', section: 'İşlemler', group: 'Palet' },
  { name: 'pallets-bulk', label: 'Toplu Palet Güncelleme', section: 'İşlemler', group: 'Palet' },
  // Palet Bildirim: menüden kaldırıldı (altı boş) — API/kod durur
  // Palet Tarihçe: menüden kaldırıldı (tablo boş — gerçek tarihçe Rapor Merkezi › Palet Tarihçesi, LEDGER'dan)
  // Diğer İşlemler — çekirdek WMS dışı modüller tek grupta (sadeleştirme: İş Emri/Stok/Sipariş/Lojistik/Finans)
  // NOT: Kalite ayrı modül değil — statü (QUARANTINE/BLOCKED) + operasyon-statü geçişleriyle takip edilir.
  // RAFA KALDIRILDI (2026-06-20): "Diğer İşlemler" menüde fazla duruyordu → hidden:true (rota+backend durur, menüde gizli).
  // Geri açmak için hidden'ları kaldır. WMS-dışı modüller (İş Emri/Sipariş/Lojistik/Finans) demo sonrası geri gelebilir.
  { name: 'work-orders', label: 'İş Emirleri', section: 'İşlemler', group: 'Diğer İşlemler' },
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
  // NOT: Vardiya (shifts) kaldırıldı — üretim modülü kapsam dışı, içeriği boştu.
  // Altı boş + davranış bağlanmadı → menüden kaldırıldı (API/kod durur): Yazıcılar, Dil, Ekran Rapor Bağlantı,
  // Stok Kontrol Parametre, Belge Planlama Parametre, Toplama Emri Parametre, Dashboard Rapor
  // Operasyon  ("ikisi birden": Operasyon Tipleri sekmeli editör + bağlantılara düz menü erişimi de var) — StokBar Operasyon grubu
  // StokBar Operasyon menü sırası — junction'lar HEM Operasyon Tipi tanım sekmesinde HEM flat menüde (ikisi birden).
  { name: 'reason-categories', label: 'Neden Kategori', section: 'Uyarlamalar', group: 'Operasyon' },
  { name: 'reasons', label: 'Neden', section: 'Uyarlamalar', group: 'Operasyon' },
  // NOT: "Operasyon Neden" (operation-type-reasons) menüden çıkarıldı — Operasyon Tipi tanım ekranı > Neden sekmesinde zaten var.
  { name: 'operation-types', label: 'Operasyon Tipi', section: 'Uyarlamalar', group: 'Operasyon' },
  // Grup + Grup Bağlantı: menüden kaldırıldı (altı boş; Grup ref'i op formundan hızlı-ekleyle, bağlantı Kurallar sekmesinde) — API/kod durur
  // NOT: "Lokasyon" + "Statü" (operation-type-locations/statuses) menüden çıkarıldı — Operasyon Tipi tanım ekranı sekmelerinde zaten var.
  { name: 'operation-tolerances', label: 'Tolerans', section: 'Uyarlamalar', group: 'Operasyon' },
  { name: 'operation-type-pallet-types', label: 'Palet Tipi', section: 'Uyarlamalar', group: 'Operasyon' },
  { name: 'operation-conversions', label: 'Dönüşüm', section: 'Uyarlamalar', group: 'Operasyon' },
  // Sıralı Operasyon: ayrı menü değil — Operasyon Tipi formunun "Sıralı Operasyon" sekmesi (API: sequential-operations)
  { name: 'auto-reference-documents', label: 'Otomatik Ref. Kontrollü Belge', section: 'Uyarlamalar', group: 'Operasyon' },
  // Toplu İşlem Bağlantı: ayrı ekran değil — Operasyon Tipi tanımındaki 'Toplu İşlem'/'Rezervasyon' parametreleri
  // Ürün Bazında Toplama: menüden kaldırıldı (kullanılmıyor) — API/kod durur (product-based-collections)
  // Belge Tipleri
  { name: 'document-statuses', label: 'Belge Durumları', section: 'Uyarlamalar', group: 'Belge Tipleri' },
  { name: 'document-status-actions', label: 'Belge Durum İşlem', section: 'Uyarlamalar', group: 'Belge Tipleri' },
  { name: 'document-status-criteria', label: 'Belge Durum Kriter', section: 'Uyarlamalar', group: 'Belge Tipleri' },
  { name: 'document-approval-types', label: 'Belge Onay Tipi', section: 'Uyarlamalar', group: 'Belge Tipleri' },
  // Saha Tanımlamaları (Ek Saha + Operasyon Tipi Saha Bağlantı): menüden kaldırıldı (altı boş, ek-saha motoru bağlanmadı) — API/kod durur
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
  // Yönlendirme (StokBar) — motor yalnız Tip + Kural tüketiyor (directed putaway); diğerleri menüden kaldırıldı (altı boş):
  // Kontrol Sahası / Kırma Şifresi / Kırma Nedeni / Tipi Operasyon / Ürün Lokasyon — API/kod durur
  { name: 'routing-types', label: 'Yönlendirme Tipi', section: 'Uyarlamalar', group: 'Yönlendirme' },
  { name: 'routing-rules', label: 'Yönlendirme Kuralları', section: 'Uyarlamalar', group: 'Yönlendirme' },
  // Sayım (StokBar)
  { name: 'count-parameters', label: 'Sayım Parametreleri', section: 'Uyarlamalar', group: 'Sayım' },
  { name: 'count-criteria', label: 'Sayım Kriter', section: 'Uyarlamalar', group: 'Sayım' },
  // Sayım Onay Kullanıcı Grubu: menüden kaldırıldı (altı boş, davranış bağlanmadı) — API/kod durur
  // Dinamik Etiketleme — Etiket Tasarımcı Etiketleme ekranlarınca TÜKETİLİYOR (kalır);
  // Etiket Tipi + Menü Grubu menüden kaldırıldı (altı boş) — API/kod durur
  { name: 'label-types', label: 'Etiket Tasarımcı', section: 'Uyarlamalar', group: 'Dinamik Etiketleme' },
  // İş Emri config grubu (Depo Araç / Genel Parametre / Nedenler / Referans Operasyon / Raf Besleme):
  // menüden kaldırıldı — İş Emri modülü zaten rafta (work-orders hidden), altı boş — API/kod durur
  // Rapor tanım tabloları (metadata-driven motor: Başlık + Kriter + Saha)
  { name: 'report-defs', label: 'Rapor Başlık', section: 'Uyarlamalar', group: 'Rapor' },
  { name: 'report-criteria', label: 'Rapor Kriter', section: 'Uyarlamalar', group: 'Rapor' },
  { name: 'report-fields', label: 'Rapor Saha', section: 'Uyarlamalar', group: 'Rapor' },

  // ── El Terminali (Android) dinamik menü ──
  { name: 'handheld-menu-groups', label: 'El Terminali Menü', section: 'Uyarlamalar', group: 'El Terminali' },

  // ── Sistem (firma + kullanıcı yönetimi + yetkiler) — ADMIN/super-admin ──
  { name: 'companies', label: 'Firma', section: 'Uyarlamalar', group: 'Sistem' },
  { name: 'users', label: 'Kullanıcılar', section: 'Uyarlamalar', group: 'Sistem' },
  { name: 'user-groups', label: 'Kullanıcı Grup', section: 'Uyarlamalar', group: 'Sistem' },
  { name: 'auth-center', label: 'Ekran Yetkileri', section: 'Uyarlamalar', group: 'Sistem' },

  // ── Raporlar ──
  { name: 'stock-report', label: 'Stok Raporu', section: 'Raporlar', group: '' },
  // metadata-driven rapor merkezi (Başlık/Kriter/Saha'dan dinamik)
  { name: 'report-center', label: 'Rapor Merkezi', section: 'Raporlar', group: '' },
]

export const sectionOf = (name: string) => RESOURCES.find((r) => r.name === name)?.section ?? SECTIONS[0]
