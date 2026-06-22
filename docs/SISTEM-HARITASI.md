# OneGate WMS — Sistem Haritası (Atlas)

> **Sürüm:** 2026-06-20 · **Bu dosya GÜNCEL tek kaynaktır (source of truth).**
> Kapsam: tüm menü → sayfa → API → tablo eşlemesi · veri modeli envanteri · işleyiş özeti.
> **121 Prisma modeli · 36 enum · ~96 API kök endpoint · 47 backend route dosyası · 25 frontend sayfa · 5 DB şeması**
>
> ⚠️ **Eski dokümanlar bayat** (aşağıda §11). `onegate-genel-cerceve.md` (11 Haz, "57 tablo") ve
> `onegate-veri-modeli-harita.md` (9 Haz, "32 tablo") yazıldığından beri sistem ~2 katına çıktı.
> Çelişki olursa **bu dosya** geçerlidir.

---

## 0. Bu doküman nasıl kullanılır (Claude Code için)

Bu, sıfırdan/devam geliştirme yaparken **bağlam (context) dosyasıdır**. Amaç: yeni bir özellik
eklerken "bu menü hangi sayfaya, o sayfa hangi API'ye, o API hangi tabloya bağlı?" sorusunun
tek bakışta cevaplanması. Derinlik katmanları:

- **Tur 1 (bu dosya):** Sistem haritası — envanter + bağlantılar + işleyiş özeti. *(model seviyesi)*
- **Tur 2 (planlanan):** `VERI-MODELI.md` — her tablo alan-alan (kolon/tip/FK/index/enum). *(saha seviyesi)*
- **Tur 3 (planlanan):** `ISLEYIS.md` — her akışın adım-adım kuralları + edge case'ler.
- **Tur 4 (planlanan):** `KONFIG-MOTORU.md` — operasyon tipi + scope + koşul/yönlendirme matrisi.

---

## 1. Sistem nedir & teknoloji

OneGate, legacy **StokBar / PAN8RAMA** WMS'inin (MSSQL/VB6) modern, çok-kiracılı yeniden tasarımı.
**Belge-merkezli** bir depo yönetim platformu + çevre modüller (satınalma/satış/lojistik/finans).

| Katman | Teknoloji |
|---|---|
| API | **Fastify 5** · @fastify/jwt · cors · static · swagger (`/docs`) |
| ORM/DB | **Prisma 7.8 + @prisma/adapter-pg** · PostgreSQL 16 (Docker) · 5 şema |
| Auth | JWT bearer · RBAC (`ADMIN`/`OPERATOR`/`VIEWER` + super-admin) · multi-tenant (`companyId`) |
| Frontend | **React 19 + Refine 5 + Ant Design 6** · Vite · React-Router |
| Şemalar | `wms` (110 tablo) · `procurement` (2) · `sales` (3) · `logistics` (3) · `finance` (2) |

**Çalıştırma:** API `:3000` (`npm run dev`) · UI `:5173` (`web/ npm run dev`) · kontrat: `http://localhost:3000/docs`
**Giriş:** `admin/admin123` (super) · `operator/operator123` · `viewer/viewer123`

> ⚙️ **Prisma 7 notu:** runtime'da `@prisma/adapter-pg` zorunlu. `prisma migrate` CLI yeşil olması
> runtime'ın çalıştığı anlamına gelmez — driver adapter olmadan client patlar.

---

## 2. Çekirdek işleyiş modeli — her şey bunun etrafında döner

```
   ANA VERİ                OPERASYON TİPİ                  BELGE                      STOK
 (ürün, lokasyon,   ──►  "kuralların tanımı"      ──►  her stok hareketi    ──►   tek gerçek
  cari, palet,            yön + kontrol modu +          DRAFT→CONFIRMED→            (location × product
  statü, birim)           stok etkisi + scope'lu        COMPLETED→CANCELLED         × status × batch
                          koşul/tolerans/yönlendirme    (reverse ile)              × serial × pallet)
                                                              │                      mainQty + reservedQty
                                                              ▼
                                              STOK SADECE "complete" anında değişir
```

**Belge yaşam döngüsü** (UI etiketleri parantezde):

| Enum (DB) | UI etiketi | Stok etkisi |
|---|---|---|
| `DRAFT` | Bekliyor / Taslak | yok |
| `CONFIRMED` | Onay Bekliyor | yok |
| `COMPLETED` | Onaylandı | **uygulanır** (INBOUND +, OUTBOUND −, INTERNAL ±) |
| `CANCELLED` | İptal | ters kayıt (reverse) ile geri alınır |

**Yön (MovementDirection) → stok etkisi:**
- `INBOUND` (Giriş): hedef lokasyon/statü **+miktar**
- `OUTBOUND` (Çıkış): kaynak lokasyon/statü **−miktar** (yetersiz stok → hata)
- `INTERNAL` (Transfer): kaynak −, hedef + (tek transaction)
- `COUNT` (Sayım): ayrı motor (§ Sayım)

**Çekirdeğin etrafındaki kontrol katmanları** (hepsi operasyon tipine scope'lu bağlanır):
Giriş/Çıkış Koşulları (batch/seri/neden/raf-ömrü + "kırma şifresi" denetim izi) · Yönlendirme
(directed putaway) · Lokasyon Kapasite · Tolerans · Statü geçişi · Yasaklı ürün · Palet kuralı · Kalite.

---

## 3. Menü haritası (3 katman: SECTION → grup → kaynak)

Menü `web/src/resources.ts` içindeki `RESOURCES[]` dizisinden üretilir.
`apiName` verilmemişse `name` = API kaynağı. `filter` = listeye eklenen sabit query. `observe` = salt-okunur.

```
Pano (Dashboard)

Tanımlamalar  (master data)
├─ Ürün         → Ürünler · Ürün Grupları · Ürün Alt-Grupları · Ürün Tipleri · Ürün Detay Tipleri · Birimler
├─ Müşteriler   → Bölge · Müşteri · Müşteri Grup · Müşteri Ek Grup · Müşteri Ek Sahaları
├─ Lokasyon     → Tesisler · Depolar · Alanlar · Lokasyonlar · Lokasyon Grupları · Lokasyon Kapasite
├─ (grupsuz)    → Statüler · Palet Tipleri

İşlemler  (transaction)
├─ Giriş        → Belge · Gözlem(ro) · Giriş Öneri Listesi
├─ Çıkış        → Belge · Gözlem(ro) · Toplu İşlem · Çıkış Öneri Listesi · Yükleme Takip
├─ Transfer     → Belge · Gözlem(ro) · Rezervasyon · Stok Operasyon
├─ Entegrasyon  → Gelen Aktarım İzleme · Giden Aktarım İzleme · Entegrasyon Aktarım
├─ Sayım        → Sayım Girişi · Sayım Fark · Sayım Onayı İptal
├─ Palet        → Palet İşlemleri · Toplu Palet Güncelleme
└─ Diğer İşlemler → İş Emirleri · Satınalma Sip. · Satış Sip. · Sevkiyatlar · Araçlar · Faturalar · Stok (Durum)

Uyarlamalar  (configuration)
├─ Genel        → Sayaçlar · Parametreler · Barkod Tipleri · Yazıcılar · Dil · Ekran Rapor Bağlantı
│                 · Stok Kontrol Param. · Belge Planlama Param. · Toplama Emri Param. · Dashboard Rapor
├─ Operasyon    → Neden Kategori · Neden · Operasyon Tipi · Grup · Grup Bağlantı · Lokasyon · Statü
│                 · Tolerans · Yasaklı Ürün · Palet Tipi · Dönüşüm · Sıralı Operasyon
│                 · Otomatik Ref. Kontrollü Belge · Toplu İşlem Bağlantı
│                 · Ürün Bazında Toplama Bağlantı · Sefer Bazında Toplama Bağlantı
├─ Belge Tipleri → Belge Durumları · Belge Durum İşlem · Belge Durum Kriter · Belge Onay Tipi
├─ Saha Tanım.  → Ek Saha · Operasyon Tipi Saha Bağlantı
├─ Giriş Koşul. → Kırma Şifresi · Kırma Nedeni · Koşul Tipi · Koşul Tipi Operasyon · Koşul Parametre
├─ Çıkış Koşul. → Kontrol Sahası · Kırma Şifresi · Kırma Nedeni · Koşul Tipi · Koşul Tipi Operasyon · Koşul Parametre
├─ Yönlendirme  → Kontrol Sahası · Kırma Şifresi · Kırma Nedeni · Yönl. Tipi · Tipi Operasyon · Ürün Lokasyon · Kuralları
├─ Sayım        → Sayım Parametreleri · Sayım Kriter · Sayım Onay Kullanıcı Grubu
├─ Din. Etiket. → Etiket Tipleri · Menü Grubu
├─ İş Emri      → Depo Araç · Genel Parametre · Nedenleri · Referans Operasyon · Raf Besleme Parametre
└─ Rapor        → Rapor Başlık · Rapor Kriter · Rapor Saha

Raporlar
└─ Raporlar (metadata-driven rapor merkezi)
```

---

## 4. TAM EŞLEME: Kaynak → Sayfa → API → Tablo

> Sütunlar: **Kaynak** (resources.ts `name`) · **Etiket** · **Sayfa** (G=Generic, özel=custom dosya) ·
> **API kökü** (app.ts prefix) · **Birincil tablo(lar)**.
> Generic = `GenericList`/`GenericForm`/`GenericDetail` üçlüsü, metadata ile render.

### 4.1 Tanımlamalar

| Kaynak | Etiket | Sayfa | API kökü | Tablo |
|---|---|---|---|---|
| products | Ürünler | **ProductForm** | `/api/products` | TBLPRODUCT |
| product-groups | Ürün Grupları | G | `/api/product-groups` | TBLPRODUCTGROUP |
| product-subgroups | Ürün Alt-Grupları | G | `/api/product-subgroups` | TBLPRODUCTSUBGROUP |
| product-types | Ürün Tipleri | G | `/api/product-types` | TBLPRODUCTTYPE |
| product-detail-types | Ürün Detay Tipleri | G | `/api/product-detail-types` | TBLPRODUCTDETAILTYPE |
| units | Birimler | G | `/api/units` | TBLUNIT |
| regions | Bölge | G | `/api/regions` | TBLREGION |
| partners | Müşteri | **PartnerForm** | `/api/partners` | TBLBUSINESSPARTNER |
| partner-groups | Müşteri Grup | G | `/api/partner-groups` | TBLPARTNERGROUP |
| partner-extra-groups | Müşteri Ek Grup | G | `/api/partner-extra-groups` | TBLPARTNEREXTRAGROUP |
| partner-extra-field-defs | Müşteri Ek Sahaları | G | `/api/partner-extra-field-defs` | TBLPARTNEREXTRAFIELDDEF |
| facilities | Tesisler | G | `/api/facilities` | TBLFACILITY |
| warehouses | Depolar | G | `/api/warehouses` | TBLWAREHOUSE |
| areas | Alanlar | G | `/api/areas` | TBLAREA |
| locations | Lokasyonlar | G + **LocationBulkGenerate** | `/api/locations` | TBLLOCATION |
| location-groups | Lokasyon Grupları | G | `/api/location-groups` | TBLLOCATIONGROUP (+LINK) |
| location-capacities | Lokasyon Kapasite | G | `/api/location-capacities` | TBLLOCATIONCAPACITY |
| statuses | Statüler | G | `/api/statuses` | TBLSTATUS |
| pallet-types | Palet Tipleri | G | `/api/pallet-types` | TBLPALLETTYPE |

> Ürün düzenleme sekmelerinde (ayrı menü değil): Ölçü Birimleri (TBLPRODUCTUNIT, `/api/product-units` +
> **ProductUnitBarcodes** → TBLPRODUCTUNITBARCODE), Muadil (TBLPRODUCTSUBSTITUTE, `/api/product-substitutes`),
> Güvenli Stok (TBLINVENTORYRULE, `/api/inventory-rules`), Ek Gruplar (TBLPRODUCTADDITIONALGROUPLINK).
> Müşteri sekmeleri: Ek Grup link (`/api/partner-extra-group-links`), Ek Saha değer (`/api/partner-extra-fields`),
> Kabul Saatleri (`/api/partner-acceptance-times` → TBLPARTNERACCEPTANCETIME), Optimizasyon (`/api/partner-optimizations`).

### 4.2 İşlemler

| Kaynak | Etiket | Sayfa | API kökü | Tablo |
|---|---|---|---|---|
| documents | Belgeler (gizli kök) | **DocumentCreate** + GenericDetail | `/api/documents` | TBLDOCUMENT + TBLDOCUMENTLINE |
| documents-in / -in-obs | Belge / Gözlem (Giriş) | G (filter `direction=INBOUND`) | `/api/documents` | ↑ |
| putaway-suggest | Giriş Öneri Listesi | **SuggestList** | `/api/suggest-list` | (türetilen) |
| documents-out / -out-obs | Belge / Gözlem (Çıkış) | G (filter `OUTBOUND`) | `/api/documents` | ↑ |
| bulk-doc-ops | Toplu İşlem | **BulkDocOps** | `/api/documents` (action) | ↑ |
| pick-suggest | Çıkış Öneri Listesi | **SuggestList** | `/api/suggest-list` | (türetilen) |
| shipments-loading | Yükleme Takip | G | `/api/shipments` | TBLSHIPMENT |
| documents-tr / -tr-obs | Belge / Gözlem (Transfer) | G (filter `INTERNAL`) | `/api/documents` | ↑ |
| reservation | Rezervasyon | **Reservation** | `/api/stock` (reserve/release) | TBLSTOCK |
| stock-reclassify | Stok Operasyon | **StockReclassify** | `/api/stock/:id/reclassify` | TBLSTOCK |
| integration-in / -out | Gelen/Giden Aktarım İzleme | G (filter `direction`) | `/api/integration-logs` | TBLINTEGRATIONLOG |
| integration-logs | Entegrasyon Aktarım | G | `/api/integration-logs` | TBLINTEGRATIONLOG |
| stock-counts | Sayım Girişi | **StockCountCreate** + GenericDetail | `/api/stock-counts` | TBLSTOCKCOUNT + TBLSTOCKCOUNTLINE |
| count-differences | Sayım Fark | **CountDifferences** | `/api/count-differences` | TBLSTOCKCOUNTLINE |
| count-approval-cancel | Sayım Onayı İptal | G (filter `status=COMPLETED`) | `/api/stock-counts` | ↑ |
| pallets | Palet İşlemleri | **PalletOps** + PalletCreate | `/api/pallets` | TBLPALLET |
| pallets-bulk | Toplu Palet Güncelleme | **PalletBulkUpdate** | `/api/pallets` | TBLPALLET |
| work-orders | İş Emirleri | **WorkOrderCreate** + GenericDetail | `/api/work-orders` | TBLWORKORDER + TBLWORKORDERLINE |
| purchase-orders | Satınalma Siparişleri | **TxnCreate** + GenericDetail | `/api/purchase-orders` | TBLPURCHASEORDER (+LINE) |
| sales-orders | Satış Siparişleri | **TxnCreate** + GenericDetail | `/api/sales-orders` | TBLSALESORDER (+LINE, +ALLOCATION) |
| shipments | Sevkiyatlar | **ShipmentCreate** + GenericDetail | `/api/shipments` | TBLSHIPMENT + TBLSHIPMENTSTOP |
| vehicles | Araçlar | G | `/api/vehicles` | TBLVEHICLE |
| invoices | Faturalar | G | `/api/invoices` | TBLINVOICE + TBLINVOICELINE |
| stock | Stok (Durum) | G | `/api/stock` | TBLSTOCK |

### 4.3 Uyarlamalar — Genel

| Kaynak | Etiket | API kökü | Tablo |
|---|---|---|---|
| sequences | Sayaçlar | `/api/sequences` | TBLSEQUENCE |
| parameters | Parametreler | `/api/parameters` | TBLPARAMETER |
| barcode-types | Barkod Tipleri | `/api/barcode-types` | TBLBARCODETYPE |
| printers | Yazıcılar | `/api/printers` | TBLPRINTER |
| languages | Dil | `/api/languages` | TBLLANGUAGE |
| screen-report-links | Ekran Rapor Bağlantı | `/api/screen-report-links` | TBLSCREENREPORTLINK |
| stock-control-parameters | Stok Kontrol Parametre | `/api/stock-control-parameters` | TBLSTOCKCONTROLPARAMETER |
| document-planning-parameters | Belge Planlama Parametre | `/api/document-planning-parameters` | TBLDOCUMENTPLANNINGPARAMETER |
| pick-order-parameters | Toplama Emri Parametre | `/api/pick-order-parameters` | TBLPICKORDERPARAMETER |
| dashboard-reports | Dashboard Rapor | `/api/dashboard-reports` | TBLDASHBOARDREPORT |

### 4.4 Uyarlamalar — Operasyon (hareket motorunun beyni)

| Kaynak | Etiket | API kökü | Tablo |
|---|---|---|---|
| reason-categories | Neden Kategori | `/api/reason-categories` | TBLREASONCATEGORY |
| reasons | Neden | `/api/reasons` | TBLREASON |
| operation-types | Operasyon Tipi | **OperationTypeForm** · `/api/operation-types` | TBLOPERATIONTYPE |
| operation-groups | Grup | `/api/operation-groups` | TBLOPERATIONGROUP |
| operation-group-links | Grup Bağlantı | `/api/operation-group-links` | TBLOPERATIONGROUPLINK |
| operation-type-locations | Lokasyon | `/api/operation-type-locations` | TBLOPERATIONTYPELOCATION |
| operation-type-statuses | Statü | `/api/operation-type-statuses` | TBLOPERATIONTYPESTATUS |
| operation-tolerances | Tolerans | `/api/operation-tolerances` | TBLOPERATIONTYPETOLERANCE |
| operation-forbidden-products | Yasaklı Ürün | `/api/operation-forbidden-products` | TBLOPERATIONTYPEFORBIDDENPRODUCT |
| operation-type-pallet-types | Palet Tipi | `/api/operation-type-pallet-types` | TBLOPERATIONTYPEPALLETTYPE |
| operation-conversions | Dönüşüm | `/api/operation-conversions` | TBLOPERATIONTYPECONVERSION |
| sequential-operations | Sıralı Operasyon | `/api/sequential-operations` | TBLSEQUENTIALOPERATION |
| auto-reference-documents | Otomatik Ref. Kontrollü Belge | `/api/auto-reference-documents` | TBLAUTOREFERENCEDOCUMENT |
| operation-bulk-actions | Toplu İşlem Bağlantı | `/api/operation-bulk-actions` | TBLOPERATIONTYPEBULKACTION |
| product-based-collections | Ürün Bazında Toplama Bağlantı | `/api/product-based-collections` | TBLPRODUCTBASEDCOLLECTION |
| trip-based-collections | Sefer Bazında Toplama Bağlantı | `/api/trip-based-collections` | TBLTRIPBASEDCOLLECTION |
| (sekme) | Operasyon Tipi Neden | `/api/operation-type-reasons` | TBLOPERATIONTYPEREASON |

> **Operasyon Tipi**, hem `OperationTypeForm` sekmeli editöründe (Neden/Lokasyon/Statü/Tolerans/Palet
> junction'ları) HEM de yukarıdaki flat menüde ayrı ayrı yönetilir ("ikisi birden" — StokBar yerleşimi).

### 4.5 Uyarlamalar — Belge Tipleri / Saha / Koşullar / Yönlendirme / Sayım / Etiket / İş Emri / Rapor

| Kaynak | Etiket | API kökü | Tablo |
|---|---|---|---|
| document-statuses | Belge Durumları | `/api/document-statuses` | TBLDOCUMENTSTATUS |
| document-status-actions | Belge Durum İşlem | `/api/document-status-actions` | TBLDOCUMENTSTATUSACTION |
| document-status-criteria | Belge Durum Kriter | `/api/document-status-criteria` | TBLDOCUMENTSTATUSCRITERIA |
| document-approval-types | Belge Onay Tipi | `/api/document-approval-types` | TBLDOCUMENTAPPROVALTYPE |
| extra-fields | Ek Saha (Dinamik+Statik) | `/api/extra-fields` (+`/extra-field-options`) | TBLEXTRAFIELD + TBLEXTRAFIELDOPTION |
| operation-type-extra-fields | Operasyon Tipi Saha Bağlantı | `/api/operation-type-extra-fields` | TBLOPERATIONTYPEEXTRAFIELD |
| entry-condition-types | Giriş Koşul Tipi | `/api/entry-condition-types` | TBLENTRYCONDITIONTYPE |
| entry-condition-parameters | Giriş Koşul Parametre | `/api/entry-condition-parameters` | TBLENTRYCONDITIONPARAMETER |
| entry-condition-type-operations | Giriş Koşul Tipi Operasyon | `/api/entry-condition-type-operations` | TBLENTRYCONDITIONTYPEOPERATION |
| entry-condition-break-passwords | Giriş Koşul Kırma Şifresi | `/api/entry-condition-break-passwords` | TBLENTRYCONDITIONBREAKPASSWORD |
| entry-condition-break-reasons | Giriş Koşul Kırma Nedeni | `/api/entry-condition-break-reasons` | TBLENTRYCONDITIONBREAKREASON |
| exit-condition-types | Çıkış Koşul Tipi | `/api/exit-condition-types` | TBLEXITCONDITIONTYPE |
| exit-condition-parameters | Çıkış Koşul Parametre | `/api/exit-condition-parameters` | TBLEXITCONDITIONPARAMETER |
| exit-condition-control-fields | Çıkış Koşul Kontrol Sahası | `/api/exit-condition-control-fields` | TBLEXITCONDITIONCONTROLFIELD |
| exit-condition-type-operations | Çıkış Koşul Tipi Operasyon | `/api/exit-condition-type-operations` | TBLEXITCONDITIONTYPEOPERATION |
| exit-condition-break-passwords | Çıkış Koşul Kırma Şifresi | `/api/exit-condition-break-passwords` | TBLEXITCONDITIONBREAKPASSWORD |
| exit-condition-break-reasons | Çıkış Koşul Kırma Nedeni | `/api/exit-condition-break-reasons` | TBLEXITCONDITIONBREAKREASON |
| routing-types | Yönlendirme Tipi | `/api/routing-types` | TBLROUTINGTYPE |
| routing-rules | Yönlendirme Kuralları | `/api/routing-rules` | TBLROUTINGRULE |
| routing-product-locations | Yönlendirme Ürün Lokasyon | `/api/routing-product-locations` | TBLROUTINGPRODUCTLOCATION |
| routing-control-fields | Yönlendirme Kontrol Sahası | `/api/routing-control-fields` | TBLROUTINGCONTROLFIELD |
| routing-type-operations | Yönlendirme Tipi Operasyon | `/api/routing-type-operations` | TBLROUTINGTYPEOPERATION |
| routing-break-passwords / -reasons | Yönl. Kırma Şifresi/Nedeni | `/api/routing-break-passwords` · `.../routing-break-reasons` | TBLROUTINGBREAKPASSWORD · ...REASON |
| count-parameters | Sayım Parametreleri | `/api/count-parameters` | TBLCOUNTPARAMETER |
| count-criteria | Sayım Kriter | `/api/count-criteria` | TBLCOUNTCRITERIA |
| count-approval-user-groups | Sayım Onay Kullanıcı Grubu | `/api/count-approval-user-groups` | TBLCOUNTAPPROVALUSERGROUP |
| label-types | Etiket Tipleri | **LabelDesigner** · `/api/label-types` | TBLLABELTYPE |
| menu-groups | Menü Grubu | `/api/menu-groups` | TBLMENUGROUP |
| warehouse-vehicles | Depo Araç | `/api/warehouse-vehicles` | TBLWAREHOUSEVEHICLE |
| work-order-general-parameters | İş Emri Genel Parametre | `/api/work-order-general-parameters` | TBLWORKORDERGENERALPARAMETER |
| work-order-reasons | İş Emri Nedenleri | `/api/work-order-reasons` | TBLWORKORDERREASON |
| work-order-reference-operations | İş Emri Referans Operasyon | `/api/work-order-reference-operations` | TBLWORKORDERREFERENCEOPERATION |
| rack-feed-parameters | Raf Besleme Parametre | `/api/rack-feed-parameters` | TBLRACKFEEDPARAMETER |
| report-defs | Rapor Başlık | `/api/report-defs` | TBLREPORTDEF |
| report-criteria | Rapor Kriter | `/api/report-criteria` | TBLREPORTCRITERIA |
| report-fields | Rapor Saha | `/api/report-fields` | TBLREPORTFIELD |

### 4.6 Raporlar

| Kaynak | Etiket | Sayfa | API kökü | Tablo |
|---|---|---|---|---|
| report-center | Raporlar | **ReportCenter** | `/api/report-run` (+ `/report-run/:id/run`) | TBLREPORTDEF/CRITERIA/FIELD'den dinamik |

---

## 5. Veri modeli envanteri (120 model, domain gruplu)

> Model seviyesi (amaç + ana ilişkiler). Alan-alan detay → **Tur 2 / VERI-MODELI.md**.
> Tüm `wms` tabloları `companyId` taşır (multi-tenant). Cross-schema bağlar **gevşek** (id ile, FK yok).

### 5.1 Tenant & Yetki (wms)
`TBLCOMPANY` (kiracı kök) · `TBLUSER` · `TBLROLE` · `TBLUSERROLE` (M:N)

### 5.2 Lokasyon hiyerarşisi (wms)
`TBLFACILITY` (tesis) → `TBLWAREHOUSE` (depo) → `TBLAREA` (alan) → `TBLLOCATION` (ağaç, raf/göz) ·
`TBLLOCATIONGROUP` + `TBLLOCATIONGROUPLINK` (M:N) · `TBLLOCATIONCAPACITY` (kapasite kuralı) · `TBLREGION` (bölge)

### 5.3 Ürün & Birim (wms)
`TBLPRODUCT` · `TBLPRODUCTUNIT` (çevrim + batch/seri izleme bayrakları) · `TBLPRODUCTUNITBARCODE` (çoklu barkod) ·
`TBLUNIT` · `TBLPRODUCTGROUP` (ağaç) · `TBLPRODUCTSUBGROUP` · `TBLPRODUCTTYPE` · `TBLPRODUCTDETAILTYPE` ·
`TBLPRODUCTSUBSTITUTE` (muadil M:N) · `TBLPRODUCTADDITIONALGROUPLINK` · `TBLINVENTORYRULE` (min/max/reorder = MRP)

### 5.4 Cari (wms)
`TBLBUSINESSPARTNER` (müşteri+tedarikçi, ağaç=zincir) · `TBLPARTNERGROUP` · `TBLPARTNEREXTRAGROUP` (+LINK) ·
`TBLPARTNEREXTRAFIELDDEF` (+`TBLPARTNEREXTRAFIELD` değer) · `TBLPARTNERACCEPTANCETIME` (kabul saatleri) ·
`TBLPARTNEROPTIMIZATION` (taşıma optimizasyon, 1:1)

### 5.5 Stok — KALP (wms)
**`TBLSTOCK`** — unique anahtar: `company × location × product × status × batch × serial × pallet`; `mainQty` + `reservedQty` ·
`TBLSTATUS` (KARANTİNA/OK/BLOKE…) · `TBLINVENTORYRULE` (MRP) ·
**`TBLSTOCKLEDGER`** (legacy TBLSBLOGBELGE) — append-only hareket defteri; her mainQty değişimi (belge complete/reverse,
sayım eşitleme) işaretli `qtyDelta` ile yazılır. Stok kartı (`GET /api/stock/card`) ve `GET /api/stock-ledger` bundan okur.

### 5.6 Palet (wms)
`TBLPALLET` (palletNo unique, ağaç=iç palet) · `TBLPALLETTYPE` (prefix sequence, karışık/tek ürün, bölme/saklama davranışı)

### 5.7 Operasyon Tipi & konfig (wms) — hareket motorunun tanımı
`TBLOPERATIONTYPE` (yön + kontrol modu + stok etkisi + 30+ bayrak) · `TBLOPERATIONGROUP` (+`TBLOPERATIONGROUPLINK`) ·
junction'lar: `TBLOPERATIONTYPESTATUS` (statü geçişi) · `TBLOPERATIONTYPELOCATION` · `TBLOPERATIONTYPEREASON` ·
`TBLOPERATIONTYPEPALLETTYPE` · `TBLOPERATIONTYPETOLERANCE` · `TBLOPERATIONTYPEFORBIDDENPRODUCT` ·
`TBLOPERATIONTYPECONVERSION` · `TBLSEQUENTIALOPERATION` · `TBLAUTOREFERENCEDOCUMENT` · `TBLOPERATIONTYPEBULKACTION` ·
`TBLPRODUCTBASEDCOLLECTION` · `TBLTRIPBASEDCOLLECTION` · `TBLREASONCATEGORY` · `TBLREASON` · `TBLSEQUENCE` (sayaç)

### 5.8 Belge = stok hareketi (wms)
`TBLDOCUMENT` (başlık, yaşam döngüsü) · `TBLDOCUMENTLINE` (kaynak→hedef satır: product/unit/qty/batch/serial/pallet,
source+target location/status) · `TBLDOCUMENTSTATUS` (+`...ACTION`, `...CRITERIA`) · `TBLDOCUMENTAPPROVALTYPE`

### 5.9 Giriş/Çıkış Koşulları (wms) — operasyonel kontrol
`TBLENTRYCONDITIONTYPE` (+`...PARAMETER`, `...TYPEOPERATION`, `...BREAKPASSWORD`, `...BREAKREASON`) ·
`TBLEXITCONDITIONTYPE` (+aynı set + `...CONTROLFIELD`) · `TBLCONDITIONBREAKLOG` (kırma denetim izi)

### 5.10 Yönlendirme / Directed Putaway (wms)
`TBLROUTINGTYPE` · `TBLROUTINGRULE` (ürün/grup→lokasyon/grup, priority) · `TBLROUTINGPRODUCTLOCATION` ·
`TBLROUTINGCONTROLFIELD` · `TBLROUTINGTYPEOPERATION` · `TBLROUTINGBREAKPASSWORD` · `TBLROUTINGBREAKREASON`

### 5.11 Sayım (wms)
`TBLSTOCKCOUNT` (countNo, status) · `TBLSTOCKCOUNTLINE` (systemQty vs countedQty) · `TBLCOUNTPARAMETER` ·
`TBLCOUNTCRITERIA` · `TBLCOUNTAPPROVALUSERGROUP`

### 5.12 İş Emri (wms)
`TBLWORKORDER` (PICK/PUTAWAY/COUNT/TRANSFER/REPLENISH) · `TBLWORKORDERLINE` · `TBLWORKORDERGENERALPARAMETER` ·
`TBLWORKORDERREASON` · `TBLWORKORDERREFERENCEOPERATION` · `TBLRACKFEEDPARAMETER` · `TBLWAREHOUSEVEHICLE`

### 5.13 Kalite (wms)
`TBLQUALITYINSPECTION` (muayene → statü geçişi). *Not: ayrı modül değil — statü + operasyon-statü ile takip.*

### 5.14 Ek Sahalar / Dinamik alanlar (wms)
`TBLEXTRAFIELD` (DYNAMIC/STATIC, entityType, dataType) · `TBLEXTRAFIELDOPTION` · `TBLOPERATIONTYPEEXTRAFIELD`

### 5.15 Etiket / Entegrasyon / Rapor / Genel config (wms)
`TBLLABELTYPE` · `TBLMENUGROUP` · `TBLINTEGRATIONLOG` (IN/OUT, PENDING/SUCCESS/ERROR) ·
`TBLREPORTDEF` + `TBLREPORTCRITERIA` + `TBLREPORTFIELD` (metadata-driven rapor) ·
`TBLBARCODETYPE` · `TBLPRINTER` · `TBLPARAMETER` · `TBLLANGUAGE` · `TBLSHIFT` (vardiya, kullanılmıyor) ·
`TBLSCREENREPORTLINK` · `TBLSTOCKCONTROLPARAMETER` · `TBLDOCUMENTPLANNINGPARAMETER` · `TBLPICKORDERPARAMETER` ·
`TBLDASHBOARDREPORT`

### 5.16 Çevre modüller (ayrı şemalar — gevşek bağ)
- **procurement:** `TBLPURCHASEORDER` + `TBLPURCHASEORDERLINE`
- **sales:** `TBLSALESORDER` + `TBLSALESORDERLINE` + `TBLSALESALLOCATION` (FEFO ayırma → stockId gevşek)
- **logistics:** `TBLVEHICLE` + `TBLSHIPMENT` + `TBLSHIPMENTSTOP`
- **finance:** `TBLINVOICE` + `TBLINVOICELINE`

---

## 6. Enum kataloğu (36)

| Enum | Değerler |
|---|---|
| MovementDirection | INBOUND · OUTBOUND · INTERNAL · COUNT |
| ControlMode | UNCONTROLLED · CONTROLLED · REFERENCE_CONTROLLED |
| DocumentStatus | DRAFT · CONFIRMED · COMPLETED · CANCELLED |
| OperationDocumentType | STOCK_MOVEMENT · COUNT · PRODUCTION · ORDER · OTHER |
| LocationType | SHELF · FLOOR · RECEIVING · SHIPPING · STAGING · QUARANTINE |
| LocationStatus | ACTIVE · BLOCKED · FULL · MAINTENANCE |
| ProductType | STANDARD · RAW_MATERIAL · SEMI_FINISHED · FINISHED · SERVICE |
| ProductStatus | ACTIVE · PASSIVE · BLOCKED |
| UnitType | COUNT · WEIGHT · VOLUME · LENGTH · AREA |
| PalletKind | EURO · INDUSTRIAL · BOX · CUSTOM |
| PalletMixing | SINGLE_PRODUCT · MIXED |
| PartnerType | CUSTOMER · SUPPLIER · BOTH |
| LinkScope | ALL · GROUP · SPECIFIC |
| MaterialLinkType | PRODUCT · PRODUCT_GROUP |
| LocationLinkType | LOCATION · LOCATION_GROUP |
| BulkActionType | CONTROLLED_BULK · BULK · RESERVATION · SELECTED_DOCUMENT · BATCH_CHANGE |
| ConditionControlType | MANUAL · REQUIRE_BATCH · REQUIRE_SERIAL · REQUIRE_REASON · CONTROL_FIELD_REQUIRED · MIN_SHELF_LIFE |
| CapacityMessageType | ERROR · WARNING |
| CountStatus | DRAFT · COUNTING · COMPLETED · CANCELLED |
| QualityResult | PENDING · PASSED · FAILED |
| WorkOrderType | PICK · PUTAWAY · COUNT · TRANSFER · REPLENISH |
| WorkOrderStatus | PLANNED · IN_PROGRESS · COMPLETED · CANCELLED |
| ExtraFieldKind | DYNAMIC · STATIC |
| ExtraFieldEntity | MATERIAL · PARTNER · DOC_HEADER · DOC_DETAIL · DOC_SCOPE · PALLET · STOCK · PALLET_NOTIFY_HEADER · OPERATION_DOC_DETAIL |
| ExtraFieldDataType | TEXT · NUMERIC · DATE · LOOKUP · MULTI_SELECT_FIXED |
| PrinterType | IPP · ZPL · SYSTEM |
| IntegrationDirection | IN · OUT |
| IntegrationStatus | PENDING · SUCCESS · ERROR |
| PurchaseOrderStatus | DRAFT · SUBMITTED · APPROVED · REJECTED · COMPLETED · CANCELLED |
| SalesOrderStatus | DRAFT · SUBMITTED · APPROVED · REJECTED · COMPLETED · CANCELLED |
| VehicleType | TRUCK · VAN · CAR · MOTORCYCLE |
| ShipmentStatus | PLANNED · IN_TRANSIT · DELIVERED · CANCELLED |
| StopStatus | PENDING · DELIVERED · FAILED |
| InvoiceType | PURCHASE · SALES |
| InvoiceStatus | DRAFT · ISSUED · PAID · CANCELLED |
| InvoiceSource | PURCHASE_ORDER · SALES_ORDER |

---

## 7. Frontend sayfa envanteri (25 dosya)

**Metadata-driven çekirdek (3 sayfa tüm CRUD'u sürer):**
- `GenericList.tsx` — liste + filtre/segment + Yeni/Düzenle/Sil/İzle + TxnCreate yönlendirme
- `GenericForm.tsx` — `formConfig.ts`'ten alan render (text/number/bool/select/ref/color) + Kopyala
- `GenericDetail.tsx` — işlem detayı + `detailActions.ts`'ten durum-koşullu yaşam döngüsü butonları + koşul kırma modalı

**Özel iş ekranları:**
| Dosya | İşlev |
|---|---|
| Dashboard.tsx | Pano: stok/sipariş/fatura/MRP özeti |
| ProductForm.tsx | Ürün + sekmeler (Birimler/Muadil/Güvenli Stok/Ek Gruplar) |
| PartnerForm.tsx | Müşteri + sekmeler (Zincir/Ek Saha/Ek Grup/Kabul Saatleri/Optimizasyon) |
| OperationTypeForm.tsx | Operasyon Tipi sekmeli editör + junction bağlantıları |
| DocumentCreate.tsx | Belge oluşturma (başlık + satırlar) |
| TxnCreate.tsx | Sipariş oluşturma (sales/purchase: başlık + satırlar) |
| WorkOrderCreate.tsx | İş emri oluşturma |
| ShipmentCreate.tsx | Sevkiyat (araç + duraklar) |
| StockCountCreate.tsx | Sayım başlatma (otomatik countNo + depo/lokasyon/ürün filtre) |
| CountDifferences.tsx | Sayım fark analizi (eksik/fazla renk kodlu) |
| PalletOps.tsx | Palet listesi + bölme modalı |
| PalletCreate.tsx | Palet oluşturma |
| PalletBulkUpdate.tsx | Toplu palet güncelleme |
| BulkDocOps.tsx | Toplu belge aksiyonu (confirm/complete/cancel) |
| Reservation.tsx | Stok rezervasyon (reserve/release) |
| StockReclassify.tsx | Stok yeniden sınıflandırma (batch/seri/ürün değişimi + merge) |
| SuggestList.tsx | Giriş/çıkış öneri (putaway/pick) — salt görüntü |
| ReportCenter.tsx | Metadata-driven rapor merkezi |
| LabelDesigner.tsx | Etiket tasarımı (layout JSON) |
| LocationBulkGenerate.tsx | Seviye-bazlı toplu lokasyon üretimi |
| ProductUnitBarcodes.tsx | Ürün-birim çoklu barkod editörü |
| Login.tsx | Giriş (split-login) |
| Shell.tsx | Menü + header + tema + Outlet |

**Mobil rotalar (`/m/*`):** MobileHome · MobileStockQuery · MobileReceipt (Authenticated korumalı).

---

## 8. Backend route dosyaları (47) → endpoint kökleri

> Tek dosya birden fazla kök export edebilir (ör. `wmsMasters.ts` 16 master).
> Tam mount sırası: `src/app.ts`. Her endpoint URL'den otomatik Swagger tag'lenir (`/docs`).

| Route dosyası | Kapsam (kökler) |
|---|---|
| documents.ts | `/api/documents` (+ confirm/complete/reverse/lines) |
| stock.ts | `/api/stock` (+ card/reserve/release/:id/reclassify) |
| stockCounts.ts | `/api/stock-counts` · `/api/count-differences` |
| pallets.ts | `/api/pallets` |
| operationTypes.ts | `/api/operation-types` |
| operationLinks.ts | op-type-statuses/locations/reasons/pallet-types |
| operationConfig.ts | reason-categories · operation-group-links · tolerances · forbidden-products · conversions · sequential · auto-reference · bulk-actions · product/trip-based-collections · product-additional-groups |
| conditionConfig.ts | entry/exit-condition-parameters · condition-break-logs |
| wmsConfig.ts | entry/exit/routing break+operation kökleri · count-approval/criteria/parameter |
| genelConfig.ts | languages · shifts · screen-report-links · stock-control/document-planning/pick-order params · dashboard-reports · warehouse-vehicles · work-order params/reasons/ref-ops · rack-feed · menu-groups |
| documentTypes.ts | document-status-actions/criteria · document-approval-types |
| wmsMasters.ts | reasons · location-groups · operation-groups · label-types · product-subgroups · entry/exit-condition-types · routing-types · facilities · regions · partner-groups · statuses · pallet-types · barcode-types · parameters · document-statuses |
| businessPartners.ts | `/api/partners` |
| partnerConfig.ts | partner-extra-groups/field-defs/group-links/fields · acceptance-times · optimizations |
| products.ts · productUnits.ts · productTypes.ts · productDetailTypes.ts · productGroups.ts · productSubstitutes.ts | ürün ailesi |
| warehouses.ts · areas.ts · locations.ts · locationGroupLinks.ts · locationCapacity.ts | lokasyon ailesi |
| units.ts · sequences.ts · printers.ts · inventoryRules.ts | master |
| routing.ts | `/api/routing-rules` |
| extraFields.ts | extra-fields · extra-field-options · operation-type-extra-fields |
| integration.ts | `/api/integration-logs` |
| reportBuilder.ts | report-defs/criteria/fields · report-run (+`/:id/run`) |
| reports.ts | `/api/reports` (legacy/sabit raporlar) |
| suggestions.ts | `/api/suggest-list` |
| purchaseOrders.ts · salesOrders.ts · vehicles.ts · shipments.ts · invoices.ts | çevre modüller |
| workOrders.ts · qualityInspections.ts · inventory.ts | iş emri/kalite/MRP |
| auth.ts · users.ts · branding.ts · health.ts · lookup.ts | sistem |

---

## 9. Detay/aksiyon (lifecycle) matrisi — `detailActions.ts`

| Kaynak | Durum → Aksiyon (endpoint) |
|---|---|
| documents | DRAFT→`start-picking`/`confirm` · CONFIRMED→`complete` · DRAFT/CONFIRMED→`cancel` · COMPLETED→`reverse` |
| stock-counts | DRAFT/COUNTING→`complete`/`cancel` · COMPLETED→`reverse-equalize` |
| sales-orders | DRAFT→`submit` · SUBMITTED→`approve`/`reject` · APPROVED→`allocate`(FEFO)/`deallocate`/`create-pick-order`/`ship-allocated` |
| work-orders | PLANNED→`start` · IN_PROGRESS→`complete` |

> Aksiyon 409 "koşul kırma gerekli" dönerse → şifre + neden modalı → retry (denetim izi `TBLCONDITIONBREAKLOG`).

---

## 10. Uçtan uca akışlar (özet — detay Tur 3'te)

1. **Mal kabul (INBOUND):** Belge oluştur → yönlendirme hedef lokasyonu önerir → op-statü/QC hedef statüyü
   belirler (kalite varsa KARANTİNA) → confirm → complete → **stok girer** (lot/seri/kapasite/koşul enforce).
2. **Sevk (OUTBOUND):** Satış sip. → approve → **allocate (FEFO)** → toplama emri → topla → ship → **stok düşer** → fatura.
3. **Transfer (INTERNAL):** TR belge → complete (kaynak−/hedef+) → gerekirse reverse (geri al).
4. **Sayım (COUNT):** başlat (systemQty snapshot) → satır say (DRAFT→COUNTING) → complete (countedQty≠systemQty
   → stok düzelt) → fark raporu → gerekirse reverse-equalize.
5. **İş emri:** planla → ata → başla → toplananı raporla → tamamla (toplanan → INTERNAL hareket).
6. **Kurulum:** Tesis/depo/lokasyon (toplu üret) → ürün+birim+barkod → cari+zincir → operasyon tipi + scope konfig.

**Stok güncelleme çekirdeği (`adjustStock`):** anahtar = company×location×product×status×batch×serial×pallet.
`delta<0 && newQty<0` → "Yetersiz stok"; stok yoksa ve `delta<0` → "Stok bulunamadı"; `reservedQty>newQty` → kırpılır.

---

## 11. Mevcut doküman durumu (consolidation gerekli)

| Dosya | Tarih | Durum |
|---|---|---|
| **SISTEM-HARITASI.md** (bu) | 2026-06-20 | ✅ Güncel — tek kaynak |
| onegate-genel-cerceve.md | 2026-06-11 | ⚠️ Bayat (57 tablo / 146 endpoint — eksik); yönetici özeti hâlâ faydalı |
| onegate-veri-modeli-harita.md | 2026-06-09 | ⚠️ Çok bayat (32 tablo) ama **boşluk analizi (maliyet/cari hesap/ledger) hâlâ geçerli** |
| onegate-durum-akis.md / .html | — | Durum akış görseli — doğrula |
| onegate-durum-roadmap.md | — | Yol haritası — doğrula |
| onegate-wms-durum-raporu.md | — | Durum raporu — doğrula |
| wms-discovery-mapping.md | — | Legacy Excel → tablo eşleme (kaynak referansı) |
| onegate-refine-starter.md | — | Frontend starter notları |

**Hâlâ geçerli kritik boşluklar** (eski veri-modeli dokümanından, doğrulanmalı):
1. **Maliyet / stok değerleme** yok — stok değeri raporlanamıyor.
2. **Cari hesap defteri** yok — fatura var, bakiye/ekstre/tahsilat hareketi yok.
3. **Kalıcı stok hareket ledger** yok — stok kartı belge satırından türetiliyor.

---

## 12. Bilinen UI/davranış boşlukları (canlıdan)

- **Belge listesi**: `operationTypeId`, `warehouseId`, `partnerId`, `reasonId` kolonları **ham FK numarası**
  gösteriyor (1, 1, —) — etiket çözümlemesi (code/name) eksik. Generic list ref-kolon render'ı gerekiyor.
- **CLAUDE.md yok** — Claude Code'un otomatik okuyacağı kök bağlam dosyası eksik (bu dosyaya işaret etmeli).

---

## 13. Sonraki turlar (öneri)

- **Tur 2 — `VERI-MODELI.md`:** 120 tablo alan-alan (kolon · tip · null · default · FK · index · enum). Claude
  Code'un şema değişikliği yaparken bakacağı referans.
- **Tur 3 — `ISLEYIS.md`:** her akış adım-adım + tüm enforce kuralları + 409 senaryoları + edge case'ler.
- **Tur 4 — `KONFIG-MOTORU.md`:** operasyon tipi bayrakları × scope (cari/malzeme/lokasyon) × koşul/yönlendirme matrisi.
- **CLAUDE.md** oluştur → bu dosyaya + çalıştırma/kurallara işaret et.
```
