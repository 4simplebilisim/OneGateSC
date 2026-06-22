# OneGate WMS — Veri Modeli Referansı (Alan-Alan)

> **Sürüm:** 2026-06-20 · Kaynak: `prisma/schema.prisma` (120 model + 36 enum), `docs/legacy/legacy-OneGate-eslesme.md`, `docs/legacy/stokbar-uni-schema.md`.
> **Amaç:** Şema değişikliği yaparken bakılacak alan-alan referans. Çekirdek tablolar tam detay (alan · tip · null · default · FK · legacy kolon); uzun kuyruk kompakt (amaç + anahtar alanlar).
>
> **Çok-kiracılık notu:** Tüm `wms` şeması tabloları `companyId` taşır (tenant = `TBLCOMPANY`). Çevre modüller (`procurement`/`sales`/`logistics`/`finance`) ayrı şemada; `wms`'e **gevşek bağlı** — id ile referans, **cross-schema FK yok**, referans bütünlüğü uygulama katmanında doğrulanır.
>
> **Legacy eşleme kuralları:** PK `LNGKOD` → `id Int @id`; `TXTKOD` → `code`; `TXTTANIMI`/`TXTACIKLAMA` → `name`; `TRHILKISLEMTARIHI` → `createdAt`; `TRHSONISLEMTARIHI` → `updatedAt`; `BYTARSIV` (soft delete) → çoğunlukla `isActive` (hard delete riski). `LNGDISTKOD` ikiye bölünmüş: tenant → `companyId`, tesis → `facilityId` (bazı tablolarda DISTKOD = **cari** demektir → `businessPartnerId`).

---

## İÇİNDEKİLER

1. [Tenant / Auth](#1-tenant--auth)
2. [Lokasyon / Depo](#2-lokasyon--depo)
3. [Ürün / Birim / Barkod](#3-ürün--birim--barkod)
4. [Cari / Müşteri](#4-cari--müşteri)
5. [Statü](#5-statü)
6. [Palet](#6-palet)
7. [Stok](#7-stok)
8. [Operasyon Tipi + Konfigürasyon](#8-operasyon-tipi--konfigürasyon)
9. [Belge Akışı](#9-belge-akışı)
10. [Koşul (Giriş/Çıkış) + Yönlendirme](#10-koşul-girişçıkış--yönlendirme)
11. [Sayım](#11-sayım)
12. [İş Emri](#12-iş-emri)
13. [Kalite](#13-kalite)
14. [Ek Saha / Etiket / Entegrasyon / Rapor / Genel Config](#14-ek-saha--etiket--entegrasyon--rapor--genel-config)
15. [Çevre Modüller (procurement/sales/logistics/finance)](#15-çevre-modüller)
16. [Enum Bölümü (36 enum, tam değer)](#16-enum-bölümü)
17. [Çekirdek İlişki Haritası](#17-çekirdek-ilişki-haritası)
18. [Şüpheli / Tutarsız Noktalar](#18-şüpheli--tutarsız-noktalar)

---

## 1. Tenant / Auth

### TBLCOMPANY — Firma / kiracı kökü (legacy `LNGDIST`'ten ayrıştırılmış)
Çok-kiracılık kökü. Tüm wms tabloları buna `companyId` ile bağlanır.

| Alan | Tip | Null | Default | İlişki/Not |
|---|---|---|---|---|
| id | Int | – | autoincrement | PK |
| code | String VarChar(40) | – | – | @unique |
| name | String VarChar(150) | – | – | |
| taxNumber | String VarChar(20) | ✓ | – | |
| isActive | Boolean | – | true | |
| createdAt | DateTime | – | now() | |
| updatedAt | DateTime | – | @updatedAt | |

> Çok sayıda 1:N koleksiyon ilişkisi (warehouses, products, stocks, documents, operationTypes, businessPartners, … 40+ relation).

### TBLUSER — Kullanıcı (Faz 1: companyId opsiyonel; süper-admin tenant-bağımsız)

| Alan | Tip | Null | Default | İlişki/Not |
|---|---|---|---|---|
| id | Int | – | autoincrement | PK |
| companyId | Int | ✓ | – | → TBLCOMPANY (opsiyonel) |
| username | String VarChar(50) | – | – | @unique |
| email | String VarChar(150) | – | – | @unique |
| passwordHash | String VarChar(255) | – | – | |
| fullName | String VarChar(150) | – | – | |
| isActive | Boolean | – | true | |
| isSuperAdmin | Boolean | – | false | |
| lastLoginAt | DateTime | ✓ | – | |
| createdAt / updatedAt | DateTime | | now() / @updatedAt | |

İlişki: `userRoles[]`, `documents[]` (DocumentCreatedBy).

### TBLROLE / TBLUSERROLE — RBAC (bizim eklediğimiz; legacy'de yok)
- **TBLROLE:** id · code @unique VarChar(40) · name VarChar(100) · description? · isActive · timestamps. → `userRoles[]`.
- **TBLUSERROLE:** kompozit PK `(userId, roleId)` · assignedAt. FK'ler `onDelete: Cascade`.

---

## 2. Lokasyon / Depo

### TBLWAREHOUSE — Depo (legacy TBLSBDEPO)

| Alan | Tip | Null | Default | İlişki/Legacy |
|---|---|---|---|---|
| id | Int | – | autoincrement | PK |
| companyId | Int | – | – | → TBLCOMPANY |
| facilityId | Int | ✓ | – | → TBLFACILITY (**bizim ek** — legacy'de yok) |
| code | String VarChar(20) | – | – | legacy TXTKOD |
| name | String VarChar(100) | – | – | legacy TXTTANIMI |
| isActive | Boolean | – | true | |
| createdAt / updatedAt | DateTime | | now() / @updatedAt | |

@@unique([companyId, code]). İlişki: areas[], locations[], documents[], inventoryRules[]. *Legacy `LNGTEDARIKCIMUSTERI` → bizde yok.*

### TBLAREA — Alan / depo alt-bölge (legacy TBLSBALAN)
id · companyId → TBLCOMPANY · warehouseId → TBLWAREHOUSE · code VarChar(40) · name? VarChar(100) · isActive · timestamps. @@unique([companyId, code]). → locations[].

### TBLLOCATION — Lokasyon ağacı (legacy TBLSBLOKASYON)

| Alan | Tip | Null | Default | İlişki/Legacy |
|---|---|---|---|---|
| id | Int | – | autoincrement | PK |
| companyId | Int | – | – | → TBLCOMPANY |
| warehouseId | Int | – | – | → TBLWAREHOUSE |
| areaId | Int | ✓ | – | → TBLAREA |
| parentId | Int | ✓ | – | self-ref "LocationTree" (legacy LNGUSTKOD) |
| code | String VarChar(40) | – | – | legacy TXTLOKASYONKOD |
| name | String VarChar(100) | ✓ | – | legacy TXTTANIMI |
| type | LocationType | – | SHELF | legacy BYTLOKASYONTIP |
| status | LocationStatus | – | ACTIVE | legacy BYTDURUM |
| barcode | String VarChar(60) | ✓ | – | legacy TXTBARKOD (index'li) |
| isRamp | Boolean | – | false | legacy BYTRAMPA |
| priority | Int | ✓ | – | legacy LNGONCELIK |
| isActive | Boolean | – | true | |
| createdAt / updatedAt | DateTime | | now() / @updatedAt | |

@@unique([companyId, warehouseId, code]). İlişki: children[] (LocationTree), stocks[], sourceDocumentLines[]/targetDocumentLines[], groupLinks[].

### TBLLOCATIONGROUP — Lokasyon grubu (legacy TBLSBLOKASYONGRUP)
id · companyId · code VarChar(16) · name VarChar(100) · **isWorkOrderGroup** Boolean=false (legacy BYTISEMRIGRUBU) · isActive · timestamps. → locationLinks[].

### TBLLOCATIONGROUPLINK — Lokasyon ↔ grup (M:N, legacy TBLSBLOKASYONGRUPBAGLANTI)
id · companyId · locationId → TBLLOCATION · locationGroupId → TBLLOCATIONGROUP · createdAt. @@unique([locationId, locationGroupId]). FK'ler Cascade.

### TBLLOCATIONCAPACITY — Lokasyon/grup × malzeme kapasite (legacy TBLSBLOKASYONKAPASITE, kompakt)
Amaç: göz/grup başına miktar/palet/boyut/ağırlık limiti + aşımda Hata/Uyarı. Anahtar alanlar: `locationLinkType` (LocationLinkType) + `locationLinkCode`; `materialLinkType?` (MaterialLinkType, null=Hepsi) + `materialLinkCode?`; quantity/unitId, palletQty, toleranceQty/toleranceUnitId, width/length/height/placementHeight/dimensionUnitId, weight/weightUnitId, **messageType** CapacityMessageType=ERROR, distributeToCells. → TBLCOMPANY.

---

## 3. Ürün / Birim / Barkod

### TBLUNIT — Birim (legacy TBLSBBIRIM)
id · companyId · code VarChar(20) · name VarChar(50) · **type** UnitType? (legacy BYTBIRIMTIP) · **referenceCode**? VarChar(50) (legacy TXTREFERANSKODU) · isActive · timestamps. @@unique([companyId, code]). İlişki: products[], productUnits[] (ProductUnitMeasure), weightProductUnits[] (ProductUnitWeight), pallets[], stocks[], documentLines[].

### TBLPRODUCT — Ürün (legacy WMS'te yok; ana ERP'den taşındı)

| Alan | Tip | Null | Default | İlişki/Not |
|---|---|---|---|---|
| id | Int | – | autoincrement | PK |
| companyId | Int | – | – | → TBLCOMPANY |
| code | String VarChar(40) | – | – | @@unique([companyId, code]) |
| name | String VarChar(240) | – | – | |
| shortName | String VarChar(50) | ✓ | – | |
| productGroupCode | String VarChar(20) | ✓ | – | (kod, ayrıca productGroupId FK var) |
| productGroupId | Int | ✓ | – | → TBLPRODUCTGROUP |
| productSubGroupId | Int | ✓ | – | → TBLPRODUCTSUBGROUP |
| productTypeId | Int | ✓ | – | → TBLPRODUCTTYPE |
| detailTypeId | Int | ✓ | – | → TBLPRODUCTDETAILTYPE |
| manufacturerCode | String VarChar(60) | ✓ | – | |
| barcode | String VarChar(50) | ✓ | – | index'li |
| gtin | String VarChar(20) | ✓ | – | |
| unitId | Int | ✓ | – | → TBLUNIT (ana birim) |
| vatRate | Decimal(5,2) | ✓ | – | KDV |
| weight | Decimal(18,4) | ✓ | – | |
| volume | Decimal(18,4) | ✓ | – | |
| type | ProductType | – | STANDARD | |
| status | ProductStatus | – | ACTIVE | |
| isActive | Boolean | – | true | |
| createdAt / updatedAt | DateTime | | now() / @updatedAt | |

İlişki: productUnits[], stocks[], documentLines[], inventoryRules[], substitutes[]/substituteOf[] (ProductSubstitute*).

### TBLPRODUCTUNIT — Ürün-birim çevrim (legacy TBLSBURUNOLCUBIRIM)

| Alan | Tip | Null | Default | Legacy |
|---|---|---|---|---|
| id | Int | – | autoincrement | PK |
| productId | Int | – | – | → TBLPRODUCT (Cascade) |
| unitId | Int | – | – | → TBLUNIT (ProductUnitMeasure) |
| isBaseUnit | Boolean | – | false | BYTANAOLCUBIRIMI |
| multiplier | Decimal(28,8) | – | 1 | DBLCARPAN |
| divisor | Decimal(28,8) | – | 1 | DBLBOLEN |
| barcode | String VarChar(50) | ✓ | – | index'li |
| length/width/height | Decimal(18,4) | ✓ | – | DBLBOY/DBLEN/DBLYUKSEKLIK |
| area | Decimal(18,4) | ✓ | – | DBLALAN |
| volume | Decimal(18,4) | ✓ | – | DBLHACIM |
| netWeight/grossWeight | Decimal(18,4) | ✓ | – | DBLNETAGIRLIK/DBLBRUTAGIRLIK |
| weightUnitId | Int | ✓ | – | → TBLUNIT (ProductUnitWeight) |
| batchTracking | Boolean | – | false | BYTBATCHIZLEME |
| serialTracking | Boolean | – | false | BYTSERIIZLEME |
| minPalletQty/maxPalletQty | Decimal(28,8) | ✓ | – | DBLMINPALETMIKTARI/DBLMAXPALETMIKTARI |
| isSalesUnit | Boolean | – | false | BYTSATISBIRIMI |
| createdAt / updatedAt | DateTime | | now() / @updatedAt | |

@@unique([productId, unitId]). → barcodes[] (TBLPRODUCTUNITBARCODE).

### TBLPRODUCTUNITBARCODE — Ürün-birim çoklu barkod (legacy TBLSBURUNBIRIMBARKOD)
id · productUnitId → TBLPRODUCTUNIT (Cascade) · barcode VarChar(100) (index'li) · **labelAddress**? VarChar(100) (legacy TXTETIKETADRESI) · isActive · timestamps.

### TBLBARCODETYPE — Barkod parse (legacy TBLSBBARKODTIPI)
id · companyId · code VarChar(20) · name? · **parseScript**? Text (legacy TXTSCRIPT — barkod parse mantığı) · **isProductionBarcode** Boolean=false (legacy BYTURETIMBARKOD) · isActive · timestamps.

### TBLPRODUCTGROUP — Ürün grubu ağacı (legacy TBLURUNGRUP)
id · companyId · code VarChar(20) · name VarChar(100) · parentId? (self-ref "ProductGroupTree") · isActive · timestamps. → children[], products[].

### TBLPRODUCTSUBGROUP — Ürün alt-grubu (legacy TBLURUNEKGRUP)
id · companyId · code · name VarChar(120) · reference? · imagePath? VarChar(500) · sortOrder? · colorCode? VarChar(14) · isActive · timestamps. → products[].

### TBLPRODUCTTYPE / TBLPRODUCTDETAILTYPE — Ürün tipi / detay tipi (legacy TBLSBURUNTIPI / TBLSBURUNDETAYTIPI)
Basit kod listeleri: id · companyId · code · name · isActive · timestamps. → products[].

### TBLPRODUCTSUBSTITUTE — Muadil ürün (M:N self-ref, legacy TBLSBMUADILURUN)
id · productId → TBLPRODUCT (ProductSubstituteMain, Cascade) · substituteProductId → TBLPRODUCT (ProductSubstituteSub) · createdAt. @@unique([productId, substituteProductId]).

### TBLPRODUCTADDITIONALGROUPLINK — Ürün ek grup bağlantı (legacy TBLSBURUNEKGRUPBAGLANTI, kompakt)
id · companyId · productId · groupId · sortOrder=0 · isActive · timestamps. (FK'siz gevşek bağ.)

---

## 4. Cari / Müşteri

### TBLBUSINESSPARTNER — Cari (müşteri/tedarikçi; legacy ana ERP'den taşındı, TBLMUSTERI* ailesinden)

| Alan | Tip | Null | Default | Legacy/Not |
|---|---|---|---|---|
| id | Int | – | autoincrement | PK |
| companyId | Int | – | – | → TBLCOMPANY |
| code | String VarChar(40) | – | – | @@unique([companyId, code]) |
| name | String VarChar(200) | – | – | |
| type | PartnerType | – | CUSTOMER | |
| regionId | Int | ✓ | – | → TBLREGION (legacy TBLMSDBOLGE) |
| partnerGroupId | Int | ✓ | – | → TBLPARTNERGROUP (legacy TBLMUSTERIGRUP) |
| parentId | Int | ✓ | – | self-ref "PartnerChain" (zincir müşteri) |
| taxNumber | String VarChar(20) | ✓ | – | |
| phone / phone2 | String VarChar(20) | ✓ | – | TXTTELEFON2 |
| mobilePhone / fax | String VarChar(20) | ✓ | – | TXTCEPTELNO / TXTFAKS |
| email | String VarChar(150) | ✓ | – | |
| website | String VarChar(150) | ✓ | – | TXTWWW |
| city / district | String VarChar(60) | ✓ | – | / TXTILCE |
| address / address2 | String VarChar(255) | ✓ | – | / TXTADRES2 |
| postalCode | String VarChar(20) | ✓ | – | TXTPOSTAKOD |
| country | String VarChar(60) | ✓ | – | TXTULKE |
| shortName | String VarChar(50) | ✓ | – | TXTKISAAD |
| contactPerson / contactPerson2 | String VarChar(100) | ✓ | – | TXTILGILIKISI / TXTILGILIKISI2 |
| specialCode | String VarChar(40) | ✓ | – | TXTOZELKOD |
| taxOffice | String VarChar(100) | ✓ | – | TXTVD |
| nationalId | String VarChar(20) | ✓ | – | TXTTCKIMLIKNO |
| licenseOffice / licenseNo | String | ✓ | – | TXTRUHSATDAIRE / TXTRUHSATNO |
| priorityOrder | Int | ✓ | – | LNGONCELIKSIRA |
| palletized | Boolean | – | false | BYTPALETLI |
| minDeliveryTime / maxDeliveryTime | String VarChar(10) | ✓ | – | TXTMINSERVISZAMANI / TXTMAXSERVISZAMANI |
| vehicleRestriction | String VarChar(255) | ✓ | – | TXTARACKISITLAMA |
| street / streetName / neighborhood | String VarChar(100) | ✓ | – | TXTCADDE / TXTSOKAK / TXTMAHALLE |
| otherAddress | String VarChar(255) | ✓ | – | TXTDIGER |
| doorNo | String VarChar(20) | ✓ | – | TXTKAPINO |
| mapCode | Int | ✓ | – | LNGHARITAKOD |
| coordinateX / coordinateY | Decimal(18,8) | ✓ | – | DBLKOORDINATX / DBLKOORDINATY |
| isActive | Boolean | – | true | |
| createdAt / updatedAt | DateTime | | now() / @updatedAt | |

İlişki: children[] (PartnerChain), documents[], extraGroupLinks[], extraFields[], acceptanceTimes[], optimization[].

### TBLPARTNERGROUP — Cari grup (legacy TBLMUSTERIGRUP)
id · companyId · code VarChar(20) · name VarChar(60) · isActive · timestamps. → partners[].

### TBLREGION — Bölge (legacy TBLMSDBOLGE)
id · companyId · code VarChar(20) · name VarChar(60) · **facilityId**? → TBLFACILITY (legacy LNGDISTKOD) · isActive · timestamps. → partners[].

### Cari ek grup / ek saha / kabul zamanı / optimizasyon (kompakt)
- **TBLPARTNEREXTRAGROUP** (legacy TBLMUSTERIEKGRUP): master. id · companyId · code VarChar(10) · name VarChar(60) · colorCode? (TXTRENKKODU) · reference? (TXTREFERANS) · isActive · timestamps. → links[].
- **TBLPARTNEREXTRAGROUPLINK** (legacy TBLSBMUSTERIEKGRUPBAGLANTI): cari↔ek grup. partnerId (Cascade) · extraGroupId · sortOrder? (LNGSIRANO). @@unique([partnerId, extraGroupId]).
- **TBLPARTNEREXTRAFIELDDEF**: ek saha slot tanımı. id · companyId · code VarChar(20) · label VarChar(100) · isActive · timestamps. → values[].
- **TBLPARTNEREXTRAFIELD** (legacy TBLMUSTERIEKSAHA): değer. partnerId (Cascade) · fieldDefId · value? VarChar(400) (TXTEKSAHAACIKLAMA). @@unique([partnerId, fieldDefId]).
- **TBLPARTNERACCEPTANCETIME** (legacy TBLSBMUSTERIKABULZAMAN): partnerId (Cascade) · day Int (1=Pzt..7=Paz) · minTime?/maxTime? VarChar(10).
- **TBLPARTNEROPTIMIZATION** (legacy TBLSBMUSTERIOPTIMIZASYONPARAMETRE, 1:1): partnerId @unique (Cascade) · unloadPersonnelTime? · unloadPersonnelCost? Decimal(18,4) · vehicleSize? VarChar(20) · serviceTime?.

---

## 5. Statü

### TBLSTATUS — Stok statüsü (legacy TBLSBSTATU) — firma-bazlı tablo-driven
id · companyId · code VarChar(20) · name VarChar(100) · isActive · timestamps. @@unique([companyId, code]). İlişki: stocks[], sourceDocumentLines[]/targetDocumentLines[] (LineSourceStatus/LineTargetStatus). *Stok statüsü enum DEĞİL, tablo-driven — firma kendi statülerini tanımlar.*

---

## 6. Palet

### TBLPALLETTYPE — Palet tipi (legacy TBLSBPALETTIPI, 24 kolon)

| Alan | Tip | Null | Default | Legacy |
|---|---|---|---|---|
| id | Int | – | autoincrement | PK |
| companyId | Int | – | – | → TBLCOMPANY |
| code | String VarChar(20) | – | – | palet no öneki (prefix) |
| name | String VarChar(100) | – | – | TXTTANIMI |
| kind | PalletKind | ✓ | – | **bizim ek** (EURO/INDUSTRIAL…) |
| mixingType | PalletMixing | ✓ | – | BYTTIP (Tek Ürün / Karma) |
| facilityId | Int | ✓ | – | LNGDISTKOD (Tesis) |
| palletNoLength | Int | ✓ | – | LNGPALETNOUZUNLUK |
| sequenceId | Int | ✓ | – | → TBLSEQUENCE (LNGSAYACKOD) |
| isDivisible | Boolean | – | true | !BYTBOLUNEMEZ |
| partialUse | Boolean | – | false | BYTPARCALIKULLANIM |
| batchControl | Boolean | – | false | BYTBATCHKONTROL |
| singleProductControl | Boolean | – | false | BYTTEKURUNKONTROLU |
| newNoOnEdit | Boolean | – | false | BYTDUZENLEMEDEYENINOALSIN |
| breakParentPallet | Boolean | – | false | BYTUSTPALETBOZULSUN |
| breakPartialPallet | Boolean | – | false | BYTPARCALIPALETBOZ |
| breakPalletOnTransfer | Boolean | – | false | BYTTRANSFERDEPALETIBOZ |
| removeFromPalletOnTransfer | Boolean | – | false | BYTTRANSFERDEPALETTENCIKAR |
| keepFullPalletOnTransfer | Boolean | – | false | BYTTRANSFERTUMPALETKORU |
| logging / logControl | Boolean | – | false | BYTLOGLAMA / BYTLOGKONTROL |
| logControlWarningType | Int | ✓ | – | BYTLOGKONTROLUYARITIPI |
| isActive | Boolean | – | true | |
| createdAt / updatedAt | DateTime | | now() / @updatedAt | |

@@unique([companyId, code]). → pallets[].

### TBLPALLET — Palet (legacy TBLSBPALET)

| Alan | Tip | Null | Default | Legacy |
|---|---|---|---|---|
| id | Int | – | autoincrement | PK |
| companyId | Int | – | – | → TBLCOMPANY |
| palletNo | String VarChar(40) | – | – | TXTPALETNO; @@unique([companyId, palletNo]) |
| palletTypeId | Int | – | – | → TBLPALLETTYPE (LNGPALETTIPIKOD) |
| parentPalletId | Int | ✓ | – | self-ref "PalletNesting" (LNGUSTPALETKOD — iç palet) |
| baseUnitId | Int | ✓ | – | → TBLUNIT (LNGANAOLCUBIRIMI) |
| originalQty | Decimal(28,8) | ✓ | – | DBLORJINALMIKTAR |
| productionDate | DateTime @db.Date | ✓ | – | TRHURETIMTARIHI |
| expiryDate | DateTime @db.Date | ✓ | – | TRHSONKULLANMATARIHI |
| beaconId | String VarChar(200) | ✓ | – | TXTBEACONID |
| isActive | Boolean | – | true | BYTAKTIF |
| createdAt / updatedAt | DateTime | | now() / @updatedAt | |

İlişki: childPallets[] (PalletNesting), stocks[], documentLines[].

> **EKSİK:** legacy `TBLSBPALETTARIHCE` (palet hareket ledger, 19936 satır) **modellenmedi** — kalıcı palet izlenebilirliği yok. `TBLSBPALETBILDIRIMBASLIK/DETAY` (üretimden palet bildirimi) de modellenmedi.

---

## 7. Stok

### TBLSTOCK — Stok durumu / "stok kalbi" (legacy TBLSBSTOKDURUM)
lokasyon × ürün × statü × batch × seri × palet kırılımı.

| Alan | Tip | Null | Default | İlişki/Not |
|---|---|---|---|---|
| id | Int | – | autoincrement | PK |
| companyId | Int | – | – | → TBLCOMPANY |
| locationId | Int | – | – | → TBLLOCATION |
| productId | Int | – | – | → TBLPRODUCT |
| statusId | Int | – | – | → TBLSTATUS |
| palletId | Int | ✓ | – | → TBLPALLET |
| batchNo | String VarChar(100) | ✓ | – | parti/lot no |
| serialNo | String VarChar(100) | ✓ | – | seri no |
| customerId | Int | ✓ | – | **cari soft ref (FK yok)** |
| poNo / poLine | String VarChar(100) | ✓ | – | satınalma sipariş no/satır |
| mainQty | Decimal(28,8) | – | 0 | ana miktar |
| reservedQty | Decimal(28,8) | – | 0 | rezerve miktar |
| unitId | Int | – | – | → TBLUNIT |
| netWeight / grossWeight | Decimal(28,8) | ✓ | – | |
| productionDate / expiryDate | DateTime @db.Date | ✓ | – | expiryDate index'li (FEFO) |
| createdAt / updatedAt | DateTime | | now() / @updatedAt | |

**@@unique([companyId, locationId, productId, statusId, batchNo, serialNo, palletId])** — stok birleştirme anahtarı.

> **Stok hareket geçmişi:** `TBLSTOCKLEDGER` (legacy `TBLSBLOGBELGE` karşılığı, 2026-06-20 eklendi) — append-only; her mainQty değişiminde işaretli `qtyDelta` yazılır (belge complete/reverse, sayım eşitleme). Stok kartı bundan türer. `TBLSTOCK` yalnız anlık durum. (legacy `TBLSBPALETTARIHCE` palet ledger HÂLÂ modellenmedi.)

### TBLINVENTORYRULE — Min/max stok + reorder (MRP girdisi; bizim eklediğimiz)
id · companyId · productId → TBLPRODUCT · warehouseId → TBLWAREHOUSE · minQty/maxQty/reorderPoint/reorderQty Decimal(28,8)=0 · isActive · timestamps. @@unique([companyId, productId, warehouseId]).

---

## 8. Operasyon Tipi + Konfigürasyon

### TBLOPERATIONTYPE — Operasyon tipi (legacy TBLSBOPERASYONTIPI, 74 kolon → 30+ bayrak) — hareket motorunun beyni

| Alan | Tip | Null | Default | Legacy |
|---|---|---|---|---|
| id | Int | – | autoincrement | PK |
| companyId | Int | – | – | → TBLCOMPANY |
| code | String VarChar(20) | – | – | TXTKOD; @@unique([companyId, code]) |
| name | String VarChar(100) | – | – | TXTTANIMI |
| **direction** | MovementDirection | – | – | BYTKATEGORI (Giriş/Çıkış/Transfer/Sayım) |
| facilityId | Int | ✓ | – | LNGDISTKOD (Tesis) |
| **controlMode** | ControlMode | – | UNCONTROLLED | BYTKONTROLLU |
| **documentType** | OperationDocumentType | – | STOCK_MOVEMENT | BYTBELGETIPI |
| affectsStock | Boolean | – | true | stok etkiler mi |
| sequenceId | Int | ✓ | – | → TBLSEQUENCE (LNGSAYACKOD — belge no) |
| operationSequenceId | Int | ✓ | – | LNGOPERASYONSAYACKOD |
| groupSequenceId | Int | ✓ | – | LNGGRUPSAYACKOD |
| operationGroupId | Int | ✓ | – | → TBLOPERATIONGROUP (LNGKONTROLGRUPKOD) |
| reverseOperationTypeId | Int | ✓ | – | LNGTERSOPERASYONKOD |
| cancelLocationId | Int | ✓ | – | LNGIPTALLOKASYONKOD |
| logControlDays | Int | ✓ | – | LNGLOGKONTROLGUNSAYISI |
| emailSend | Boolean | – | false | BYTMAILGONDERILSIN |
| equivalentApplication | Boolean | – | false | BYTMUADILUYGULAMASI |
| materialBasedCollection | Boolean | – | false | BYTMALBAZINDATOPLAMA |
| materialBasedQtyEdit | Boolean | – | false | BYTMALBAZINDAMIKTARDUZENLENSIN |
| batchAssignment | Boolean | – | false | BYTBATCHATAMA |
| qualityControl | Boolean | – | false | BYTKLTKONTROLYAPILSIN |
| detailLocationToCoverage | Boolean | – | false | BYTBELGEDETAYLOKASYONUKAPSAMAKTARILSIN |
| integration | Boolean | – | false | BYTPARAMENTEGRASYON |
| approvedDocUpdate | Boolean | – | false | BYTONAYLIBELGEGUNCELLENSIN |
| bulkSend | Boolean | – | false | BYTTOPLUGONDERIM |
| readBasedControl | Boolean | – | false | BYTOKUTMABAZINDABILGILENDIRME |
| readBasedInfoMessage | Boolean | – | false | BYTOKUTMABAZINDABILGIMESAJIGOSTER |
| logging / logControl | Boolean | – | false | BYTLOGLAMA / BYTLOGKONTROL |
| grouping | Boolean | – | false | BYTGRUPLAMA |
| reasonRequired | Boolean | – | false | BYTNEDENGIRISZORUNLU |
| reasonInHeader | Boolean | – | false | BYTNEDENGIRISIBASLIKTA |
| sameUsePallet | Boolean | – | false | BYTAYNIPALETKULLANILSIN |
| sameUseSerial | Boolean | – | false | BYTAYNISERIKULLANILSIN |
| passiveProductUse | Boolean | – | false | BYTPASIFURUNKULLANILSIN |
| palletBreaking | Boolean | – | false | BYTPALETBOZMA |
| originalQtyUpdate | Boolean | – | false | BYTORJMIKGUNCELLENSIN |
| reserveTransfer | Boolean | – | false | BYTREZERVETRANSFEREDILSIN |
| isActive | Boolean | – | true | BYTAKTIFPASIF |
| createdAt / updatedAt | DateTime | | now() / @updatedAt | |

İlişki: sequence?, operationGroup?, documents[], statusLinks[], locationLinks[], reasonLinks[], palletTypeLinks[].

### Operasyon konfig junction'ları (kompakt)
Ortak desen: `companyId` · `operationTypeId` (çoğu Cascade) · `facilityId?` · `cariLinkType/cariLinkId` (LinkScope = Hepsi/Grup/Belirli) · `materialLinkType/materialLinkId` · `sortOrder?` · isActive · timestamps.

| Model | Legacy | Amaç / ayırt edici alanlar |
|---|---|---|
| TBLOPERATIONTYPESTATUS | TBLSBOPERASYONTIPISTATU | statü geçişi: `sourceStatusId?` → `targetStatusId` (boş kaynak = mal kabul) |
| TBLOPERATIONTYPELOCATION | TBLSBOPERASYONTIPILOKASYON | kaynak/hedef lokasyon kuralı: `sourceLinkType/sourceLocationId`, `targetLinkType/targetLocationId`, `fixLocation`, `terminalFixSource/Target` |
| TBLOPERATIONTYPEREASON | TBLSBOPERASYONNEDEN | op-neden bağ: `reasonCategoryId?`, `reasonId`, `isAutomatic` |
| TBLOPERATIONTYPEPALLETTYPE | TBLSBOPERASYONTIPIPALETTIPI | `palletTypeId`, `innerPalletTypeId?` (iç palet) |
| TBLOPERATIONTYPETOLERANCE | TBLSBOPERASYONTIPITOLERANS | `ignoreSplit`, `tolerancePercent`, `toleranceQty` |
| TBLOPERATIONTYPECONVERSION | TBLSBOPERASYONTIPIDONUSUM | `statusId?`, `conversionCode`, `outgoing`, kaynak/hedef lokasyon link |
| TBLOPERATIONTYPEFORBIDDENPRODUCT | TBLSBOPERASYONTIPIYASAKLIURUN | yasaklı ürün (cari/malzeme scope) |
| TBLOPERATIONTYPEBULKACTION | TBLSBOPERASYONTIPITOPLUISLEMBAGLANTI | `bulkActionType` (BulkActionType), `description?` |
| TBLOPERATIONGROUPLINK | TBLSBOPERASYONGRUPBAGLANTI | `operationGroupId`, `businessPartnerId?` |
| TBLSEQUENTIALOPERATION | TBLSBSIRALIOPERASYON | `firstOperationId` → `secondOperationId`, lokasyon link, `useInWorkOrder`, `spName?` |
| TBLAUTOREFERENCEDOCUMENT | TBLSBOTOMATIKREFERANSLIBELGE | `sourcePartnerId/sourceOperationTypeId` → `targetPartnerId/targetOperationTypeId`, `facility` |
| TBLPRODUCTBASEDCOLLECTION | TBLSBURUNBAZTOPLAMABAGLANTI | `businessPartnerId`, source→target op, `exemptLocations?` |
| TBLTRIPBASEDCOLLECTION | TBLSBSEFERBAZTOPLAMABAGLANTI | sefer bazlı toplama: source→target op |

### TBLOPERATIONGROUP — Operasyon grubu (legacy TBLSBOPERASYONGRUP)
id · companyId · code VarChar(16) · name VarChar(100) · isActive · timestamps. → operationTypes[].

### TBLREASON / TBLREASONCATEGORY — Neden / neden kategori (legacy TBLSBNEDEN / TBLSBNEDENKATEGORI)
- **TBLREASON:** id · companyId · code VarChar(10) · name VarChar(100) · isActive · timestamps. → documents[].
- **TBLREASONCATEGORY:** id · companyId · code VarChar(10) · name? · businessPartnerId? (LNGDISTKOD) · isActive · timestamps. (FK'siz)

### TBLSEQUENCE — Sayaç / numara serisi (legacy TBLSBSAYAC)
id · companyId · code VarChar(20) · name VarChar(100) · isAutomatic=true · prefix? VarChar(20) · **prefix2**? VarChar(200) (legacy TXTONEK2SSPADI) · padLength=6 · startNo=1 · endNo? · currentValue=0 · isActive · timestamps. → operationTypes[], palletTypes[].

---

## 9. Belge Akışı

> **EN KRİTİK YAPISAL FARK:** Legacy'de İKİ belge ailesi vardı: `TBLSBBELGEBASLIK/KAPSAM/DETAY` (sipariş/planlama) + `TBLSBOPERASYONBELGEBASLIK/DETAY` (fiili hareket). OneGate'te **ikisi tek `TBLDOCUMENT`+`TBLDOCUMENTLINE`'a birleşti**. Yön op-tipinden gelir; sipariş/fiili ayrımı op-tipi + documentStatus ile yapılır. **KAPSAM ara katmanı (3.→2. katman) eridi** — satır-altı çoklu palet/batch kırılımı için satır çoğaltmak gerekir. `DBLFIREMIKTARI` (fire) ve toplanan/hazırlanan ayrımı **kayboldu**.

### TBLDOCUMENT — Belge başlığı (legacy TBLSBBELGEBASLIK + TBLSBOPERASYONBELGEBASLIK birleşik)

| Alan | Tip | Null | Default | İlişki/Not |
|---|---|---|---|---|
| id | Int | – | autoincrement | PK |
| companyId | Int | – | – | → TBLCOMPANY |
| documentNo | String VarChar(40) | – | – | @@unique([companyId, documentNo]) |
| operationTypeId | Int | – | – | → TBLOPERATIONTYPE |
| **status** | DocumentStatus | – | DRAFT | iç motor yaşam döngüsü (DRAFT/CONFIRMED/COMPLETED/CANCELLED) |
| documentStatusId | Int | ✓ | – | → TBLDOCUMENTSTATUS (kullanıcı-yüzlü durum) |
| warehouseId | Int | – | – | → TBLWAREHOUSE |
| createdById | Int | – | – | → TBLUSER (DocumentCreatedBy) |
| partnerId | Int | ✓ | – | → TBLBUSINESSPARTNER |
| reasonId | Int | ✓ | – | → TBLREASON (LNGOPERASYONNEDENKOD) |
| documentDate | DateTime | – | now() | |
| completedAt | DateTime | ✓ | – | |
| note | String VarChar(500) | ✓ | – | |
| createdAt / updatedAt | DateTime | | now() / @updatedAt | |

İlişki: lines[], conditionBreakLogs[]. Index: warehouseId, operationTypeId, partnerId, status.

> **İKİ statü alanı dikkat:** `status` (DocumentStatus enum — iç motor) + `documentStatusId` (TBLDOCUMENTSTATUS FK — kullanıcı-yüzlü Bekliyor/Toplanıyor/...). İkisi farklı amaçlı; karıştırma.

### TBLDOCUMENTLINE — Belge satırı (legacy TBLSBBELGEDETAY + TBLSBOPERASYONBELGEDETAY birleşik)

| Alan | Tip | Null | Default | İlişki/Not |
|---|---|---|---|---|
| id | Int | – | autoincrement | PK |
| documentId | Int | – | – | → TBLDOCUMENT (Cascade) |
| lineNo | Int | – | – | @@unique([documentId, lineNo]) |
| productId | Int | – | – | → TBLPRODUCT |
| unitId | Int | – | – | → TBLUNIT |
| quantity | Decimal(28,8) | – | – | işlem/hazırlanan miktar |
| referenceQty | Decimal(28,8) | ✓ | – | beklenen/referans miktar (tolerans kontrolü) |
| sourceLocationId | Int | ✓ | – | → TBLLOCATION (LineSourceLocation) |
| sourceStatusId | Int | ✓ | – | → TBLSTATUS (LineSourceStatus) |
| targetLocationId | Int | ✓ | – | → TBLLOCATION (LineTargetLocation) |
| targetStatusId | Int | ✓ | – | → TBLSTATUS (LineTargetStatus) |
| palletId | Int | ✓ | – | → TBLPALLET |
| batchNo / serialNo | String VarChar(100) | ✓ | – | |
| note | String VarChar(255) | ✓ | – | |
| createdAt / updatedAt | DateTime | | now() / @updatedAt | |

> Kaynak→hedef her iki yönü satırda taşır (`source*` → `target*`). Yön op-tipinin `direction`'ından gelir.

### Belge durum / onay config (kompakt)
- **TBLDOCUMENTSTATUS** (legacy TBLSBBELGEDURUM): kullanıcı-yüzlü durum. id · companyId · code VarChar(20) · name? · **color**? VarChar(20) (hex, legacy BYTRENK) · sortOrder? · isActive · timestamps. → documents[].
- **TBLDOCUMENTSTATUSACTION** (legacy TBLSBBELGEDURUMISLEM): durumda izinli işlem. `documentStatusId`, `actionType` Int (BYTISLEMTIP).
- **TBLDOCUMENTSTATUSCRITERIA** (legacy TBLSBBELGEDURUMKRITER): operasyon(+cari) bazında durum kriteri. `operationTypeId`, `businessPartnerId?` (**LNGDISTKOD = cari!**), `criteria` Text.
- **TBLDOCUMENTAPPROVALTYPE** (legacy TBLSBBELGEONAYTIPI): `operationTypeId`, `approvalType` Int (BYTONAYTIPI), `controlCollection` (BYTKONTROLTOPLAMA).
- **TBLDOCUMENTPLANNINGPARAMETER** (legacy TBLSBBELGEPLANLAMAPARAMETRE): planlama parametre (zenginleştirilmiş; legacy boş). plannedDocStatusId/planningOperationTypeId/partCount/splitByProductGroup/templateOperationTypeId + extraField11..52 slot çiftleri.
- **TBLDOCUMENTASSIGNMENT**: belge↔kullanıcı atama (terminalde kullanıcıya atanmış belgeler). `documentId`, `userId`, `note?`.

---

## 10. Koşul (Giriş/Çıkış) + Yönlendirme

> **SSP → enum:** Legacy `TXTSSP` (saklı yordam) yerine OneGate `ConditionControlType` enum + yapılandırılmış parametre alanları kullanır. "Serbest SQL" esnekliği bilinçle terk edildi.

### TBLENTRYCONDITIONTYPE / TBLEXITCONDITIONTYPE — Giriş/çıkış koşul tipi (legacy TBLSBGIRISKOSULTIPI / TBLSBCIKISKOSULTIPI)
id · companyId · code VarChar(20) · name? VarChar(100) (TXTACIKLAMA) · isActive · timestamps. → parameters[].

### TBLENTRYCONDITIONPARAMETER — Giriş koşul parametresi (legacy TBLSBGIRISKOSULPARAMETRE)
id · companyId · entryConditionTypeId → TBLENTRYCONDITIONTYPE (Cascade) · cariLinkType?/cariLinkId? (LinkScope) · materialLinkType?/materialLinkId? · **controlType** ConditionControlType=MANUAL · **conditionBreakAllowed**=true (BYTKOSULKIRMA) · exclude=false (BYTHARIC) · sortOrder? · isActive · timestamps.

### TBLEXITCONDITIONPARAMETER — Çıkış koşul parametresi (legacy TBLSBCIKISKOSULPARAMETRE)
Giriş ile aynı + ek alanlar: `controlFieldId?` (LNGKONTROLSAHASI) · `toleranceValue?` Decimal(18,4) · `percentValue?` Decimal(9,4) · `dayCount?` (min raf ömrü gün).

### TBLCONDITIONBREAKLOG — Koşul kırma denetim izi (**bizim eklediğimiz değer**)
id · companyId · documentId → TBLDOCUMENT (Cascade) · conditionType VarChar(10) ('ENTRY'|'EXIT') · conditionParameterId? · breakReasonCode? · userId? · note? · createdAt.

### TBLROUTINGTYPE / TBLROUTINGRULE — Yönlendirme (directed putaway) (legacy TBLSBYONLENDIRMETIPI / ...PARAMETRE)
- **TBLROUTINGTYPE:** id · companyId · code VarChar(20) · name? · isActive · timestamps. → rules[].
- **TBLROUTINGRULE:** id · companyId · routingTypeId? → TBLROUTINGTYPE · **materialLinkType** (MaterialLinkType) + materialLinkCode · **locationLinkType** (LocationLinkType) + locationLinkCode · priority? · isActive · timestamps.

### Koşul/yönlendirme yan tabloları (kompakt, çoğu FK'siz gevşek)
- **TBLENTRYCONDITIONBREAKPASSWORD / TBLENTRYCONDITIONBREAKREASON** — giriş koşul kırma şifre/neden.
- **TBLENTRYCONDITIONTYPEOPERATION** (legacy TBLSBGIRISKOSULTIPIOPERASYONTIPI) — koşul tipi ↔ op-tipi.
- **TBLEXITCONDITIONCONTROLFIELD** — çıkış kontrol sahası (tableName/fieldName).
- **TBLEXITCONDITIONBREAKPASSWORD / TBLEXITCONDITIONBREAKREASON** — çıkış kırma şifre/neden.
- **TBLEXITCONDITIONTYPEOPERATION** — çıkış koşul tipi ↔ op-tipi + `fifoCheckOnReverseScan`.
- **TBLROUTINGCONTROLFIELD** — yönlendirme kontrol sahası.
- **TBLROUTINGBREAKPASSWORD / TBLROUTINGBREAKREASON** — yönlendirme kırma şifre/neden.
- **TBLROUTINGTYPEOPERATION** — yönlendirme tipi ↔ op-tipi + `taskPlanId?`.
- **TBLROUTINGPRODUCTLOCATION** (legacy TBLSBYONLENDIRMEURUNLOKASYONBAGLANTI) — ürün/grup → lokasyon/grup kuralı + `additionalGroupOrder?`.

---

## 11. Sayım

### TBLSTOCKCOUNT — Sayım başlığı (legacy TBLSBSAYIMBELGEBASLIK)
id · companyId · countNo VarChar(40) · warehouseId · **countType**? VarChar(20) (Sayım Tipi, ör. ZSYM) · **status** CountStatus=DRAFT (legacy BYTDURUM) · countDate=now() · note? · createdById · completedAt? · timestamps. @@unique([companyId, countNo]). → lines[].

### TBLSTOCKCOUNTLINE — Sayım satırı (legacy TBLSBSAYIMBELGEDETAY)
id · countId → TBLSTOCKCOUNT (Cascade) · lineNo · stockId? (gevşek) · locationId · productId · statusId · unitId · batchNo? · serialNo? · palletId? · **systemQty** Decimal(28,8)=0 (DBLDEPOMIKTAR) · **countedQty**? Decimal(28,8) (sayılan). @@unique([countId, lineNo]).

> **Fark türetilir:** `countedQty − systemQty` hesaplanır (legacy `TBLSBSAYIMFARK` ayrı tablo değil; CountDifferences ekranı hesaplar). Legacy ağırlık farkı/rezerve alanları yok.

### Sayım config (kompakt)
- **TBLCOUNTPARAMETER** (legacy TBLSBSAYIMPARAMETRE): operationTypeId · countType? (BYTSAYIMTIP, kör sayım) · entry/exit/transferOperationTypeId? · equalize/weightDiff/stacked/partialPallet/... onlarca bayrak.
- **TBLCOUNTCRITERIA** (legacy TBLSBSAYIMKRITER): operationTypeId · fieldCode · required.
- **TBLCOUNTAPPROVALUSERGROUP** (legacy TBLSBSAYIMONAYKULLANICIGRUP): operationTypeId · userGroupId · mail* alanları.

---

## 12. İş Emri

> **Bizim eklediğimiz** (legacy TBLSBISEMRIBASLIK/DETAY). Atanabilir depo görevi.

### TBLWORKORDER — İş emri başlığı

| Alan | Tip | Null | Default | Legacy/Not |
|---|---|---|---|---|
| id | Int | – | autoincrement | PK |
| companyId | Int | – | – | → TBLCOMPANY |
| orderNo | String VarChar(40) | – | – | @@unique([companyId, orderNo]) |
| type | WorkOrderType | – | PICK | |
| status | WorkOrderStatus | – | PLANNED | |
| warehouseId | Int | – | – | |
| salesOrderId | Int | ✓ | – | → sales.TBLSALESORDER (gevşek) |
| assignedToUserId | Int | ✓ | – | LNGKULLANICIKOD |
| priority | Int | ✓ | – | |
| startDate / endDate | DateTime | ✓ | – | TRHBASLAMATARIHI / TRHBITISTARIHI |
| note | String VarChar(500) | ✓ | – | |
| createdById | Int | – | – | |
| createdAt / updatedAt | DateTime | | now() / @updatedAt | |

→ lines[].

### TBLWORKORDERLINE — İş emri satırı
id · workOrderId → TBLWORKORDER (Cascade) · lineNo · productId · unitId · quantity · **collectedQty**=0 (DBLTOPLANANMIKTAR) · sourceLocationId?/targetLocationId? · sourceStatusId?/targetStatusId? · palletId? · batchNo?/serialNo? · reasonId? · note?. @@unique([workOrderId, lineNo]).

### İş emri config (kompakt)
- **TBLWORKORDERGENERALPARAMETER** (legacy TBLSBISEMRIGENELPARAMETRE): alarm/iptal-op/raf-besleme-op + askEntryLocation/locationPriority.
- **TBLWORKORDERREASON** (legacy TBLSBISEMRINEDENLERI): code · description · isCancel · autoCreateOrder · createDocument · breakPassword.
- **TBLWORKORDERREFERENCEOPERATION** (legacy TBLSBISEMRIOPERASYONTIPI): category? · operationTypeId · headerId?.
- **TBLRACKFEEDPARAMETER** (legacy TBLSBRAFBESLEMEPARAMETRE): locationGroupId? · onStockEmpty · capacityPercent · palletBreaking.
- **TBLWAREHOUSEVEHICLE** (legacy TBLSBDEPOARAC): depo içi araç. code · status? · pallet · workType? · quantity/unitId · ipAddress?.

---

## 13. Kalite

### TBLQUALITYINSPECTION — Kalite muayene (**bizim eklediğimiz**) — muayene → statü geçişi
id · companyId · inspectionNo VarChar(40) · productId · locationId · **statusId** (kaynak statü, ör. QUARANTINE) · unitId · batchNo?/serialNo?/palletId? · quantity Decimal(28,8) · **result** QualityResult=PENDING · note? · createdById · inspectedById? · inspectedAt? · timestamps. @@unique([companyId, inspectionNo]). *FK'siz (gevşek Int ref'ler).*

---

## 14. Ek Saha / Etiket / Entegrasyon / Rapor / Genel Config

### Ek Saha jenerik sistemi (legacy TBLEKSAHATANIMLAMA + TBLSBSTATIKSAHATANIMLAMA birleşik)
- **TBLEXTRAFIELD:** dinamik+statik birleşik tanım. id · companyId · **fieldKind** ExtraFieldKind=DYNAMIC · **entityType** ExtraFieldEntity (BYTTIP — uygulama yeri) · trackingCode? · description VarChar(200) (zorunlu) · **fieldDataType** ExtraFieldDataType · defaultValue? · maxAnswerCount? · isRequired · minLength?/maxLength? · useAsIncrementing · transferOnDocSplit · reference? · isActive · timestamps. → options[].
- **TBLEXTRAFIELDOPTION:** Çoktan Seçmeli/Rehber seçenekleri. extraFieldId → TBLEXTRAFIELD · code · description? · sortOrder? · reference?.
- **TBLOPERATIONTYPEEXTRAFIELD** (legacy TBLSBPPCGORUNTULENECEKSAHALAR): op-tipi ↔ ek saha. operationTypeId · extraFieldId · isStatic · sortOrder? · useInTerminal · useInApproval.

### TBLLABELTYPE — Etiket tipi (legacy TBLSBDEETIKETTIPI)
id · companyId · code VarChar(50) · labelName? · screenTitle? · displayType? · reportType? · col1Count/col2Count/col3Count? · col1Length/col2Length? · **layoutJson**? Text (görsel etiket tasarımı — **bizim eklediğimiz**) · isActive · timestamps.

> DE (dinamik etiket meta-tasarım: BUTTON/ITEM/SORGU/YETKI) ve PPC el-terminali ekran aileleri **bilinçli atlandı** — React mobil + layoutJson ile yeniden yazılıyor.

### TBLINTEGRATIONLOG — Entegrasyon izleme (legacy TBLSBENTEGRASYONAKTARIM, sadeleştirilmiş)
id · companyId · **direction** IntegrationDirection (IN/OUT) · entityType VarChar(40) (MALZEME/CARI/SIPARIS/...) · **status** IntegrationStatus=SUCCESS · referenceKey? · message? · createdAt · processedAt?.

> **EKSİK:** legacy entegrasyon altyapısı (TBLSBENTEGRASYONADRES/PAKET/SORGU/PARAMETRE + ENTYAZMAPARAMETRE + ENTEKALANDONUSUM + EKSAHABAGLANTI, 7 tablo) **modellenmedi** — dış sistem bağlantı/adres tanımı yok, yalnız IN/OUT log var.

### Rapor motoru (metadata-driven, SSP-siz, `sourceKey` tabanlı)
- **TBLREPORTDEF:** id · companyId · code · name · **sourceKey** VarChar(40) (STOCK/DOCUMENTS/PALLETS → motor sorgusu) · category? · isActive · timestamps. → criteria[], fields[].
- **TBLREPORTCRITERIA:** filtre alanı (UI form). reportId → TBLREPORTDEF · fieldCode · label · type VarChar(20) (TEXT/NUMBER/DATE/SELECT/REF) · refResource? · options? · required · sortOrder?.
- **TBLREPORTFIELD:** sonuç kolonu. reportId · fieldCode · label · align? · sortOrder?.

### TBLFACILITY — Tesis (**bizim eklediğimiz** — legacy LNGDISTKOD'un tesis ayrıştırması)
id · companyId · code VarChar(20) · name VarChar(100) · city? · address? · isActive · timestamps. → warehouses[], regions[].

### TBLPRINTER — Yazıcı (**bizim eklediğimiz** — legacy Excel'de yok)
id · companyId · code VarChar(40) · name? · **type** PrinterType=IPP · host?/port?/path? · location? · isDefault · discovered (mDNS) · isActive · timestamps.

### TBLPARAMETER — Genel parametre (legacy TBLSBPARAMETRE)
id · companyId · code VarChar(100) · name? VarChar(200) · value? VarChar(510) (TXTDEGERI) · isActive · timestamps. @@unique([companyId, code]).

### Diğer genel config (kompakt)
- **TBLLANGUAGE** (legacy TBLSBDIL): code · isDefault.
- **TBLSHIFT** (legacy TBLSBVARDIYA, *kullanılmıyor*): code · name? · startTime?/endTime? · businessPartnerId?.
- **TBLSCREENREPORTLINK** (legacy TBLSBEKRANRAPORBAGLANTI): screenButtonCode? · reportCode?.
- **TBLSTOCKCONTROLPARAMETER** (legacy TBLSBSTOKKONTROLPARAMETRE): distributionType/customerPriority/shipmentPriority · controlStatus · controlLocation.
- **TBLPICKORDERPARAMETER** (legacy TBLSBTOPLAMAEMRIPARAMETRE): fullPallet/fullCase/partialProduct op + birim id'leri.
- **TBLDASHBOARDREPORT** (legacy TBLSBDASHBOARDREPORT): type? · reportSp? · defaultReport · reportName · userLink.
- **TBLMENUGROUP** (legacy TBLSBDEMENUGRUP): code · description? · screenType?.

---

## 15. Çevre Modüller

> Ayrı PostgreSQL şemaları (`procurement`/`sales`/`logistics`/`finance`). wms'e **gevşek bağlı**: id ile referans, **cross-schema FK yok**, bütünlük uygulama katmanında.

### procurement — Satınalma
- **TBLPURCHASEORDER:** companyId · orderNo · `supplierId` (→ wms.TBLBUSINESSPARTNER) · `warehouseId` (→ wms.TBLWAREHOUSE) · status PurchaseOrderStatus=DRAFT · orderDate/expectedDate? · currency=TRY/exchangeRate · subTotal/discountTotal/taxTotal/totalAmount · `createdById`/`approvedById?` (→ wms.TBLUSER) · approvedAt?. → lines[]. @@unique([companyId, orderNo]).
- **TBLPURCHASEORDERLINE:** orderId (Cascade) · lineNo · `productId`/`unitId` (→ wms) · quantity · receivedQty=0 · unitPrice/discountRate/discountAmount/taxRate/taxAmount/lineTotal.

### sales — Satış (procurement simetriği, OUTBOUND)
- **TBLSALESORDER:** companyId · orderNo · `customerId` (→ wms.TBLBUSINESSPARTNER) · `warehouseId` · status SalesOrderStatus=DRAFT · orderDate/requestedDate? · currency/exchangeRate · tutar alanları · createdById/approvedById?. → lines[].
- **TBLSALESORDERLINE:** orderId (Cascade) · lineNo · productId/unitId · quantity · shippedQty=0 · **allocatedQty**=0 · fiyat/iskonto/vergi alanları. → allocations[].
- **TBLSALESALLOCATION:** stok ayırma (FEFO). orderLineId (Cascade) · `stockId` (→ wms.TBLSTOCK, gevşek) · quantity.

### logistics — Sevkiyat/araç/rota
- **TBLVEHICLE:** companyId · plateNo · name? · type VehicleType=TRUCK · capacityKg?/capacityM3?. → shipments[]. @@unique([companyId, plateNo]).
- **TBLSHIPMENT:** companyId · shipmentNo · vehicleId? → TBLVEHICLE · driverName? · status ShipmentStatus=PLANNED · plannedDate?/dispatchedAt?/deliveredAt? · `createdById` (→ wms.TBLUSER). → stops[].
- **TBLSHIPMENTSTOP:** shipmentId (Cascade) · sequence · `partnerId` (→ wms) · `salesOrderId?` (→ sales) · address? · status StopStatus=PENDING · arrivedAt?. @@unique([shipmentId, sequence]).

### finance — Fatura (PO/SO'dan)
- **TBLINVOICE:** companyId · invoiceNo · type InvoiceType · `partnerId` (→ wms) · sourceOrderType InvoiceSource?/sourceOrderId? · status InvoiceStatus=DRAFT · invoiceDate/dueDate? · currency/exchangeRate · subTotal/discountTotal/taxTotal/totalAmount/**paidAmount** · createdById. → lines[].
- **TBLINVOICELINE:** invoiceId (Cascade) · lineNo · productId/unitId · quantity · unitPrice/discountRate/discountAmount/taxRate/taxAmount/lineTotal.

---

## 16. Enum Bölümü

**Schema = wms** (aksi belirtilmedikçe):

| Enum | Değerler |
|---|---|
| LocationType | SHELF, FLOOR, RECEIVING, SHIPPING, STAGING, QUARANTINE |
| LocationStatus | ACTIVE, BLOCKED, FULL, MAINTENANCE |
| UnitType | COUNT, WEIGHT, VOLUME, LENGTH, AREA |
| ProductType | STANDARD, RAW_MATERIAL, SEMI_FINISHED, FINISHED, SERVICE |
| ProductStatus | ACTIVE, PASSIVE, BLOCKED |
| PalletKind | EURO, INDUSTRIAL, BOX, CUSTOM |
| PalletMixing | SINGLE_PRODUCT (Tek Ürün Palet), MIXED (Karma Palet) |
| MovementDirection | INBOUND (Giriş), OUTBOUND (Çıkış), INTERNAL (Transfer), COUNT (Sayım) |
| ControlMode | UNCONTROLLED (Kontrolsüz), CONTROLLED (Kontrollü), REFERENCE_CONTROLLED (Referans Kontrollü) |
| LinkScope | ALL (Hepsi), GROUP (Grup), SPECIFIC (Belirli) |
| BulkActionType | CONTROLLED_BULK, BULK, RESERVATION, SELECTED_DOCUMENT, BATCH_CHANGE |
| OperationDocumentType | STOCK_MOVEMENT, COUNT, PRODUCTION, ORDER, OTHER |
| PartnerType | CUSTOMER, SUPPLIER, BOTH |
| DocumentStatus | DRAFT, CONFIRMED, COMPLETED, CANCELLED |
| ConditionControlType | MANUAL, REQUIRE_BATCH, REQUIRE_SERIAL, REQUIRE_REASON, CONTROL_FIELD_REQUIRED, MIN_SHELF_LIFE |
| IntegrationDirection | IN (Gelen), OUT (Giden) |
| IntegrationStatus | PENDING, SUCCESS, ERROR |
| MaterialLinkType | PRODUCT, PRODUCT_GROUP |
| LocationLinkType | LOCATION, LOCATION_GROUP |
| CapacityMessageType | ERROR, WARNING |
| PrinterType | IPP, ZPL, SYSTEM |
| QualityResult | PENDING, PASSED, FAILED |
| CountStatus | DRAFT, COUNTING, COMPLETED, CANCELLED |
| WorkOrderType | PICK, PUTAWAY, COUNT, TRANSFER, REPLENISH |
| WorkOrderStatus | PLANNED, IN_PROGRESS, COMPLETED, CANCELLED |
| ExtraFieldKind | DYNAMIC (Dinamik), STATIC (Statik) |
| ExtraFieldEntity | MATERIAL, PARTNER, DOC_HEADER, DOC_DETAIL, DOC_SCOPE, PALLET, STOCK, PALLET_NOTIFY_HEADER, OPERATION_DOC_DETAIL |
| ExtraFieldDataType | MULTI_SELECT_FIXED, TEXT, NUMERIC, DATE, LOOKUP |
| PurchaseOrderStatus *(procurement)* | DRAFT, SUBMITTED, APPROVED, REJECTED, COMPLETED, CANCELLED |
| SalesOrderStatus *(sales)* | DRAFT, SUBMITTED, APPROVED, REJECTED, COMPLETED, CANCELLED |
| VehicleType *(logistics)* | TRUCK, VAN, CAR, MOTORCYCLE |
| ShipmentStatus *(logistics)* | PLANNED, IN_TRANSIT, DELIVERED, CANCELLED |
| StopStatus *(logistics)* | PENDING, DELIVERED, FAILED |
| InvoiceType *(finance)* | PURCHASE, SALES |
| InvoiceStatus *(finance)* | DRAFT, ISSUED, PAID, CANCELLED |
| InvoiceSource *(finance)* | PURCHASE_ORDER, SALES_ORDER |

**Toplam: 36 enum** (wms: 28, procurement: 1, sales: 1, logistics: 3, finance: 3).

---

## 17. Çekirdek İlişki Haritası

Çekirdek tablolar arası gerçek FK'ler (wms şeması içi):

```
TBLCOMPANY (tenant kökü)
  ├─< TBLWAREHOUSE ─(facilityId)→ TBLFACILITY
  │     ├─< TBLAREA ─< TBLLOCATION (parentId self-ref ağaç)
  │     └─< TBLINVENTORYRULE ─(productId)→ TBLPRODUCT
  ├─< TBLPRODUCT ─(unitId)→ TBLUNIT
  │     ├─(productGroupId)→ TBLPRODUCTGROUP (parentId self-ref)
  │     ├─(productSubGroupId)→ TBLPRODUCTSUBGROUP
  │     ├─(productTypeId)→ TBLPRODUCTTYPE
  │     ├─(detailTypeId)→ TBLPRODUCTDETAILTYPE
  │     └─< TBLPRODUCTUNIT ─(unitId/weightUnitId)→ TBLUNIT
  │            └─< TBLPRODUCTUNITBARCODE
  ├─< TBLBUSINESSPARTNER ─(regionId)→ TBLREGION ─(partnerGroupId)→ TBLPARTNERGROUP
  │     └─(parentId self-ref zincir müşteri)
  ├─< TBLSTATUS
  ├─< TBLPALLETTYPE ─(sequenceId)→ TBLSEQUENCE
  │     └─< TBLPALLET (parentPalletId self-ref iç palet) ─(baseUnitId)→ TBLUNIT
  │
  ├─< TBLSTOCK  [STOK KALBİ]
  │     ├─(locationId)→ TBLLOCATION
  │     ├─(productId)→ TBLPRODUCT
  │     ├─(statusId)→ TBLSTATUS
  │     ├─(palletId)→ TBLPALLET
  │     ├─(unitId)→ TBLUNIT
  │     └─ customerId (soft ref, FK YOK)
  │     UNIQUE(companyId, location, product, status, batchNo, serialNo, palletId)
  │
  ├─< TBLOPERATIONTYPE ─(sequenceId)→ TBLSEQUENCE
  │     ├─(operationGroupId)→ TBLOPERATIONGROUP
  │     └─< [statusLinks/locationLinks/reasonLinks/palletTypeLinks + 13 config junction]
  │
  └─< TBLDOCUMENT ─(operationTypeId)→ TBLOPERATIONTYPE
        ├─(documentStatusId)→ TBLDOCUMENTSTATUS
        ├─(warehouseId)→ TBLWAREHOUSE
        ├─(createdById)→ TBLUSER
        ├─(partnerId)→ TBLBUSINESSPARTNER
        ├─(reasonId)→ TBLREASON
        ├─< TBLCONDITIONBREAKLOG
        └─< TBLDOCUMENTLINE  (Cascade)
              ├─(productId)→ TBLPRODUCT
              ├─(unitId)→ TBLUNIT
              ├─(sourceLocationId/targetLocationId)→ TBLLOCATION
              ├─(sourceStatusId/targetStatusId)→ TBLSTATUS
              └─(palletId)→ TBLPALLET

TBLSTOCKCOUNT ─< TBLSTOCKCOUNTLINE (Cascade)   [satır içi ref'ler gevşek Int]
TBLWORKORDER  ─< TBLWORKORDERLINE  (Cascade)   [satır içi ref'ler gevşek Int]
TBLQUALITYINSPECTION  [tüm ref'ler gevşek Int, FK yok]
```

**Gevşek bağ (FK YOK) — uygulama katmanı doğrular:**
- `TBLSTOCK.customerId` → cari
- Çevre modüller (procurement/sales/logistics/finance) → wms (supplierId/customerId/productId/unitId/warehouseId/createdById/stockId)
- TBLSTOCKCOUNTLINE / TBLWORKORDERLINE / TBLQUALITYINSPECTION içindeki locationId/productId/statusId/palletId
- Tüm op-konfig junction'larındaki `*LinkId` çiftleri (cari/malzeme/lokasyon — legacy byte+int desenine sadık)

---

## 18. Şüpheli / Tutarsız Noktalar

Şema değişikliği yaparken dikkat edilecek noktalar:

1. **`TBLDOCUMENT` iki statü alanı:** `status` (DocumentStatus enum, iç motor) + `documentStatusId` (TBLDOCUMENTSTATUS FK, kullanıcı-yüzlü). Birini güncellerken diğerini unutma; ikisi farklı yaşam döngüsü.

2. **`TBLPRODUCT.productGroupCode` (VarChar) + `productGroupId` (FK) ikisi birden var.** Aynı kavram için hem denormalize kod hem FK; senkron tutulmazsa tutarsızlık riski.

3. **`ExtraFieldEntity.DOC_SCOPE` enum değeri var ama arkasında KAPSAM tablosu YOK.** (Çift→tek belge birleşmesinde kapsam katmanı eridi.) Yeni ek saha tanımında `DOC_SCOPE` kullanılmamalı — kafa karıştırıcı.

4. **`businessPartnerId` çoğu config tablosunda `LNGDISTKOD` karşılığı = CARİ demek**, tenant değil. (TBLDOCUMENTSTATUSCRITERIA, TBLREASONCATEGORY, TBLOPERATIONTYPETOLERANCE, vb.) Legacy DISTKOD'u körü körüne `companyId`'ye eşleme.

5. **Soft delete yok:** legacy `BYTARSIV` yerine `isActive` + hard delete. Silinen kaydın geçmişi gider; `LNGSONKULLANICIKOD`/`LNGILKKULLANICIKOD` audit çoğu modelde modellenmedi (yalnız bazılarında `createdById`).

6. **Stok hareket ledger'ı EKLENDİ (2026-06-20):** `TBLSTOCKLEDGER` (legacy `TBLSBLOGBELGE` karşılığı) — append-only, her mainQty değişimini işaretli `qtyDelta` ile yazar (belge complete/reverse, sayım eşitleme); stok kartı bundan türer; `GET /api/stock-ledger` + "Stok Hareket Defteri" menüsü. **KALAN:** palet hareket ledger'ı `TBLSBPALETTARIHCE` (19936 satır) hâlâ modellenmedi — palet izlenebilirliği gerekiyorsa `TBLPALLETLEDGER` eklenmeli.

7. **Fire miktarı (`DBLFIREMIKTARI`) ve toplanan/hazırlanan iki-aşamalı miktar kayboldu** (çift→tek belge birleşmesinde). İhtiyaç olursa `TBLDOCUMENTLINE`'a alan eklemek gerekir.

8. **Entegrasyon altyapısı eksik:** 7 legacy entegrasyon tablosu (adres/paket/sorgu/parametre/yazma/alan-dönüşüm/ek-saha-bağlantı) modellenmedi; yalnız `TBLINTEGRATIONLOG` izleme var. Dış sistem bağlantı tanımı yapılamaz.

9. **`TBLOPERATIONTYPE` üç ayrı sayaç alanı** (sequenceId/operationSequenceId/groupSequenceId) — yalnız `sequenceId` FK ilişkili (→TBLSEQUENCE); diğer ikisi düz Int (FK yok). Tutarsız modelleme.

10. **`TBLSHIFT` "kullanılmıyor"** notlu (legacy eşlemede de belirtilmiş) — ölü tablo adayı.

11. **Çevre modül `*Total` alanları denormalize** (subTotal/taxTotal/totalAmount satırlardan türetilebilir) — satır değişiminde başlık toplamlarının elle güncellenmesi gerekir.

12. **`TBLPALLET.expiryDate`/`productionDate` hem palette hem `TBLSTOCK`'ta var** — aynı parti için iki kaynak; hangisinin otorite olduğu net değil.

---

### Sayısal özet
- **Tam-detaylı (alan-alan tablo):** 15 çekirdek model — TBLCOMPANY, TBLUSER, TBLWAREHOUSE, TBLLOCATION, TBLPRODUCT, TBLPRODUCTUNIT, TBLBUSINESSPARTNER, TBLSTATUS, TBLPALLETTYPE, TBLPALLET, TBLSTOCK, TBLOPERATIONTYPE, TBLDOCUMENT, TBLDOCUMENTLINE, TBLSTOCKCOUNT (+ TBLWORKORDER, TBLQUALITYINSPECTION yarı-detay).
- **Kompakt (amaç + anahtar alan):** ~105 model (config/junction/parametre/çevre modül).
- **Toplam:** 120 model + 36 enum, 5 PostgreSQL şeması (wms / procurement / sales / logistics / finance).
