# Legacy StokBar (STOKBAR_UNI) ↔ OneGate Prisma — Eşleme (Crosswalk)

> **Sürüm:** 2026-06-20 · Kaynaklar: `docs/legacy/stokbar-uni-schema.md` (70 legacy tablo), `prisma/schema.prisma` (120 model), `docs/SISTEM-HARITASI.md`.
> Amaç: legacy STOKBAR_UNI WMS tabloları ile OneGate Prisma şeması arasında tablo-tablo eşleme, modellenmemiş tablolar, bizim eklediklerimiz ve kilit yapısal farklar.
>
> **Durum kodları:** ✅ birebir · 🔀 birleştirildi (birden çok legacy tablo → tek model, ya da tersi) · ⚠️ kısmi (alt küme / sadeleştirilmiş) · ❌ modellenmemiş.

---

## 1. İsimlendirme kılavuzu

### 1.1 Önek (prefix) kodları

| Önek | Anlam | SQL tip | Prisma karşılığı |
|---|---|---|---|
| `LNG` | Long/integer | `int` | `Int` (PK, FK, sayaç) |
| `TXT` | Text | `nvarchar` / `ntext` | `String` (`@db.VarChar` / `@db.Text`) |
| `DBL` | Double/decimal | `decimal(28,8)` | `Decimal @db.Decimal(28,8)` |
| `TRH` | Tarih (date/datetime) | `date` / `datetimeoffset` | `DateTime` (`@db.Date` ya da timestamp) |
| `BYT` | Byte/tinyint | `tinyint` | çoğu `Boolean`, bazıları küçük enum/`Int` |

**Anahtar kuralları:** PK her zaman `LNGKOD`. İş kodu alanı `TXTKOD`. Tanım/ad `TXTTANIMI` veya `TXTACIKLAMA`. Bizde PK = `id Int @id @default(autoincrement())`, kod = `code`, ad = `name`.

### 1.2 Ortak denetim kolonları (her legacy tabloda)

| Legacy kolon | Anlam | OneGate karşılığı |
|---|---|---|
| `TRHILKISLEMTARIHI` | İlk işlem (oluşturma) tarihi | `createdAt DateTime @default(now())` |
| `TRHSONISLEMTARIHI` | Son işlem (güncelleme) tarihi | `updatedAt DateTime @updatedAt` |
| `LNGILKKULLANICIKOD` | Oluşturan kullanıcı | ⚠️ **çoğu modelde yok** (sadece bazılarında `createdById`) |
| `LNGSONKULLANICIKOD` | Son değiştiren kullanıcı | ⚠️ **modellenmedi** (audit zayıflığı) |
| `BYTARSIV` | Arşiv = soft delete | ⚠️ **modellenmedi** → `isActive Boolean` ile yaklaşık (hard delete kullanılıyor) |
| `LNGDISTKOD` | Dağıtım/tenant/tesis kodu | 🔀 ikiye ayrıştırıldı: tenant → `companyId` (TBLCOMPANY), tesis → `facilityId` (TBLFACILITY) |
| `TXTSONISLEMHOST` | Son işlem yapan host | ❌ modellenmedi |

> **Önemli ayrım:** Legacy `LNGDISTKOD` hem "dağıtım/tenant" hem "tesis" anlamında aşırı yüklenmiş. OneGate bunu **iki kavrama** böldü: gerçek kiracılık `companyId` (yeni kök tablo `TBLCOMPANY`), fiziksel tesis `facilityId` (yeni `TBLFACILITY`).

---

## 2. Tablo eşleme tablosu (70 legacy tablo, domain gruplu)

### 2.1 Lokasyon / Depo

| Legacy tablo | OneGate model(ler) | Durum | Not |
|---|---|---|---|
| `TBLSBDEPO` | `TBLWAREHOUSE` | ✅ | Depo. Legacy `LNGTEDARIKCIMUSTERI` → bizde yok; `facilityId` eklendi. |
| `TBLSBALAN` | `TBLAREA` | ✅ | Alan (depo alt-bölge). |
| `TBLSBLOKASYON` | `TBLLOCATION` | ✅ | Lokasyon ağacı (`LNGUSTKOD`→`parentId`). Tip/durum legacy `BYTLOKASYONTIP`/`BYTDURUM` → `LocationType`/`LocationStatus` enum. |
| `TBLSBLOKASYONGRUP` | `TBLLOCATIONGROUP` | ✅ | `BYTISEMRIGRUBU`→`isWorkOrderGroup`. |
| `TBLSBLOKASYONKAPASITE` | `TBLLOCATIONCAPACITY` | ✅ | Lokasyon/grup × malzeme kapasite (miktar/palet/boyut/ağırlık + Hata/Uyarı). |

### 2.2 Ürün / Birim / Barkod

| Legacy tablo | OneGate model(ler) | Durum | Not |
|---|---|---|---|
| `TBLSBBIRIM` | `TBLUNIT` | ✅ | Birim. `BYTBIRIMTIP`→`UnitType`, `TXTREFERANSKODU`→`referenceCode`. |
| `TBLSBURUNOLCUBIRIM` | `TBLPRODUCTUNIT` | ✅ | Ürün-birim çevrim (çarpan/bölen + boyut/ağırlık + batch/seri izleme + min/max palet + satış birimi). |
| `TBLSBURUNBIRIMBARKOD` | `TBLPRODUCTUNITBARCODE` | ✅ | Ürün-birim çoklu barkod. `TXTETIKETADRESI`→`labelAddress`. |
| `TBLSBBARKODTIPI` | `TBLBARCODETYPE` | ✅ | Barkod parse. `TXTSCRIPT`→`parseScript`, `BYTURETIMBARKOD`→`isProductionBarcode`. |
| `TBLSBMUADILURUN` | `TBLPRODUCTSUBSTITUTE` | ✅ | Muadil ürün (M:N self-ref). |
| `TBLSBSTATU` | `TBLSTATUS` | ✅ | Stok statüsü (firma-bazlı tablo-driven). |
| *(URUN/CARI master — bu 70'te yok)* | `TBLPRODUCT`, `TBLPRODUCTGROUP`, `TBLPRODUCTSUBGROUP`, `TBLPRODUCTTYPE`, `TBLPRODUCTDETAILTYPE` | ⚠️ | **Ürün master Panorama8 ana ERP'sinde** (farklı önek, bu 70'te yok). OneGate WMS'i kendi içinde ürün ailesini tanımlar — legacy'de WMS yalnız koda göre bağlanırdı. |

### 2.3 Cari / Müşteri

| Legacy tablo | OneGate model(ler) | Durum | Not |
|---|---|---|---|
| *(CARI/MUSTERI master — bu 70'te yok)* | `TBLBUSINESSPARTNER` | ⚠️ | **Cari master ana ERP'de** (Panorama8). OneGate kendi `TBLBUSINESSPARTNER`'ını taşır; alanlar (TXTKISAAD/TXTILGILIKISI/TXTOZELKOD/adres/optimizasyon) legacy `TBLMUSTERI*` ailesinden modellenmiş. |
| *(TBLMUSTERIGRUP)* | `TBLPARTNERGROUP` | ⚠️ | Cari grup — legacy ana ERP tablosuna sadık. |
| *(TBLMUSTERIEKGRUP)* | `TBLPARTNEREXTRAGROUP` (+`TBLPARTNEREXTRAGROUPLINK`) | ⚠️ | Müşteri ek grup + bağlantı. |
| *(TBLMUSTERIEKSAHA)* | `TBLPARTNEREXTRAFIELDDEF` (+`TBLPARTNEREXTRAFIELD`) | ⚠️ | Cari ek saha tanımı + değer. |
| *(TBLSBMUSTERIKABULZAMAN)* | `TBLPARTNERACCEPTANCETIME` | ⚠️ | Kabul zamanı (gün × min/max). |
| *(TBLSBMUSTERIOPTIMIZASYONPARAMETRE)* | `TBLPARTNEROPTIMIZATION` | ⚠️ | Taşıma/teslim optimizasyonu (1:1). |
| *(TBLMSDBOLGE)* | `TBLREGION` | ⚠️ | Bölge. |

> Bu blok bilinçli: WMS'in 70 tablosunda cari/ürün master yok; OneGate bunları kendi içine taşıyıp ana ERP bağımlılığını gevşetti.

### 2.4 Belge — sipariş/planlama belgesi (BASLIK/KAPSAM/DETAY)

| Legacy tablo | OneGate model(ler) | Durum | Not |
|---|---|---|---|
| `TBLSBBELGEBASLIK` | `TBLDOCUMENT` | 🔀 | Sipariş/planlama belgesi başlığı. `TXTSIPARISNO`/`TXTIRSALIYENO`/`TXTSEFERNO`/sevkiyat/onay aşaması alanları → **kısmen taşındı** (sefer/irsaliye/onay aşaması alanları sadeleştirildi). |
| `TBLSBBELGEKAPSAM` | `TBLDOCUMENTLINE` (kısmen) | 🔀⚠️ | **KAPSAM (scope) ara katmanı yok.** Legacy 3 katman (BASLIK→KAPSAM→DETAY); OneGate 2 katman (header→line). Kapsam alanları (rezerve belge, üretim/SKT tarihleri palet bazında) satıra eridi. → §5. |
| `TBLSBBELGEDETAY` | `TBLDOCUMENTLINE` | 🔀 | Satır. Kaynak→hedef lokasyon/statü satırda (`source*`/`target*`). `DBLTOPLANANMIKTAR`/`DBLHAZIRLANANMIKTAR` → `referenceQty`/`quantity` ile sadeleşti. |
| `TBLSBBELGEDURUM` | `TBLDOCUMENTSTATUS` | ✅ | Belge durumu (Bekliyor→Toplanıyor→Onay Bekliyor→Onaylandı). `BYTRENK`→`color`. |
| `TBLSBBELGEONAYTIPI` | `TBLDOCUMENTAPPROVALTYPE` | ✅ | Operasyon bazında onay tipi + `BYTKONTROLTOPLAMA`→`controlCollection`. |
| `TBLSBBELGEPARAMETRE` | `TBLDOCUMENTPLANNINGPARAMETER` | ⚠️ | Belge planlama parametre (legacy boş 0 satır; bizde zenginleştirilmiş ayrı tablo). |
| `TBLSBBELGEBASLIKEKSAHA` | `TBLEXTRAFIELD` (entityType=DOC_HEADER) | 🔀 | Belge başlık ek saha → birleşik ek saha sistemine (entityType ile). |
| `TBLSBBELGEDETAYEKSAHA` | `TBLEXTRAFIELD` (entityType=DOC_DETAIL) | 🔀 | Belge detay ek saha. |
| `TBLSBBELGEKAPSAMEKSAHA` | `TBLEXTRAFIELD` (entityType=DOC_SCOPE) | 🔀 | Kapsam ek saha (enum'da DOC_SCOPE korunmuş ama kapsam tablosu yok). |
| `TBLSBPBELGETANIM` | — | ❌ | "P belge tanım" (entegrasyon belge eşleme; StokBar'da doğrudan oluşturma). Modellenmedi. |

### 2.5 Operasyon — fiili stok hareket belgesi + operasyon tipi

| Legacy tablo | OneGate model(ler) | Durum | Not |
|---|---|---|---|
| `TBLSBOPERASYONBELGEBASLIK` | `TBLDOCUMENT` | 🔀 | **Fiili stok hareketi başlığı.** Legacy'de sipariş belgesinden AYRI; OneGate'te ikisi tek `TBLDOCUMENT`'a birleşti. → §5. |
| `TBLSBOPERASYONBELGEDETAY` | `TBLDOCUMENTLINE` | 🔀 | Fiili hareket satırı: `BYTGIRISCIKIS` flag, tek lokasyon+statü, `DBLFIREMIKTARI` (fire). Bizde yön op-tipinden gelir, satırda source→target var, **fire miktarı modellenmedi** (⚠️). |
| `TBLSBOPERASYONTIPI` (74 kolon) | `TBLOPERATIONTYPE` (30+ bayrak) | ✅ | Hareket motorunun beyni. `BYTKATEGORI`→`direction`, `BYTKONTROLLU`→`controlMode`, `BYTBELGETIPI`→`documentType`, sayaç/grup/ters-op/iptal-lokasyon + onlarca bayrak taşındı. |
| `TBLSBOPERASYONGRUP` | `TBLOPERATIONGROUP` | ✅ | Operasyon grubu. |
| `TBLSBOPERASYONTIPILOKASYON` | `TBLOPERATIONTYPELOCATION` | ✅ | Op-tipi ↔ kaynak/hedef lokasyon kuralı + sabitleme bayrakları. |
| `TBLSBOPERASYONTIPIPALETTIPI` | `TBLOPERATIONTYPEPALLETTYPE` | ✅ | Op-tipi ↔ palet tipi (+iç palet). |
| `TBLSBOPERASYONTIPITOLERANS` | `TBLOPERATIONTYPETOLERANCE` | ✅ | Op-tipi tolerans (cari/malzeme scope + yüzde/miktar). |
| `TBLSBOPERASYONTIPIDONUSUM` | `TBLOPERATIONTYPECONVERSION` | ✅ | Statü/lokasyon dönüşümü. |
| `TBLSBOPERASYONTIPIPALETSTATU` | — | ❌ | DB'de 0 kolon (bulunamadı) — legacy'de boş/kaldırılmış; OneGate'te yok. |
| `TBLSBOPERASYONNEDEN` | `TBLOPERATIONTYPEREASON` + `TBLREASONCATEGORY` | 🔀 | Operasyon-neden bağlantısı + neden kategori. |
| `TBLSBGRUP` | `TBLOPERATIONGROUP` / `TBLLOCATIONGROUP` (generic grup) | ⚠️ | `BYTGRUPTIPI` ile çok-amaçlı grup; OneGate domain-özel gruplara böldü. |

> Ek (legacy'de bu 70'te tablo yok ama OneGate'te op-konfig olarak var): `TBLOPERATIONTYPESTATUS` (op-tipi↔statü geçişi), `TBLOPERATIONGROUPLINK`, `TBLOPERATIONTYPEFORBIDDENPRODUCT`, `TBLSEQUENTIALOPERATION`, `TBLAUTOREFERENCEDOCUMENT`, `TBLOPERATIONTYPEBULKACTION`, `TBLPRODUCTBASEDCOLLECTION`, `TBLTRIPBASEDCOLLECTION` — bunların legacy karşılıkları StokBar'ın bu 70'e dahil olmayan op-konfig tablolarıdır (TBLSBOPERASYONTIPISTATU, TBLSBSIRALIOPERASYON vb.).

### 2.6 Palet

| Legacy tablo | OneGate model(ler) | Durum | Not |
|---|---|---|---|
| `TBLSBPALET` | `TBLPALLET` | ✅ | Palet. `LNGUSTPALETKOD`→`parentPalletId` (iç palet ağacı), `TXTBEACONID`→`beaconId`, üretim/SKT tarihleri. |
| `TBLSBPALETTIPI` | `TBLPALLETTYPE` | ✅ | Palet tipi (24 kolon, tüm bölme/transfer/log bayrakları + `BYTTIP`→`mixingType`). |
| `TBLSBPALETTARIHCE` (19936 satır) | — | ❌ | **Palet hareket ledger.** OneGate'te KALICI palet tarihçesi yok. → §5 (en kritik eksik). |
| `TBLSBPALETBILDIRIMBASLIK` | — | ❌ | Palet bildirim başlık (üretimden palet bildirimi). Modellenmedi. |
| `TBLSBPALETBILDIRIMDETAY` | — | ❌ | Palet bildirim detay. Modellenmedi. |
| `TBLSBPALETEKSAHA` | `TBLEXTRAFIELD` (entityType=PALLET) | 🔀 | Palet ek saha → birleşik ek saha. |

### 2.7 Koşul (giriş/çıkış) + Yönlendirme

| Legacy tablo | OneGate model(ler) | Durum | Not |
|---|---|---|---|
| `TBLSBGIRISKOSULTIPI` | `TBLENTRYCONDITIONTYPE` | ✅ | Giriş koşul tipi. |
| `TBLSBGIRISKOSULPARAMETRE` | `TBLENTRYCONDITIONPARAMETER` | ⚠️ | `TXTSSP` (saklı yordam) → yerleşik `ConditionControlType` enum'a çevrildi (SSP yok). |
| `TBLSBGIRISKOSULTIPIOPERASYONTIPI` | `TBLENTRYCONDITIONTYPEOPERATION` | ✅ | Giriş koşul tipi ↔ op-tipi. |
| `TBLSBCIKISKOSULTIPI` | `TBLEXITCONDITIONTYPE` | ✅ | Çıkış koşul tipi. |
| `TBLSBCIKISKOSULPARAMETRE` | `TBLEXITCONDITIONPARAMETER` | ⚠️ | `TXTSSP`/`TXTONERISSP` → enum + tolerans/yüzde/gün alanları. Öneri-listesi SSP davranışı sadeleşti. |
| `TBLSBYONLENDIRMETIPI` | `TBLROUTINGTYPE` | ✅ | Yönlendirme (directed putaway) tipi. |
| `TBLSBYONLENDIRMEPARAMETRE` | `TBLROUTINGRULE` (+`TBLROUTINGCONTROLFIELD`) | 🔀⚠️ | `TXTSSP`/`BYTYONLENDIRMELISTESIUYGULA` → kural tablosu + kontrol sahası. Ürün→lokasyon kuralı `TBLROUTINGPRODUCTLOCATION`'a ayrıldı. |

> Ek OneGate koşul/yönlendirme tabloları (legacy'de bu 70'te yok ama StokBar'da var): `...BREAKPASSWORD`, `...BREAKREASON`, `TBLEXITCONDITIONCONTROLFIELD`, `TBLROUTINGTYPEOPERATION`, `TBLCONDITIONBREAKLOG` (kırma denetim izi — **bu OneGate'in eklediği değer**).

### 2.8 Sayım

| Legacy tablo | OneGate model(ler) | Durum | Not |
|---|---|---|---|
| `TBLSBSAYIMBELGEBASLIK` | `TBLSTOCKCOUNT` | ✅ | Sayım başlığı. `BYTDURUM`→`CountStatus`, `TXTSAYIMGRUPNO`/lokasyon/ürün bağlantı kısmen. |
| `TBLSBSAYIMBELGEDETAY` | `TBLSTOCKCOUNTLINE` | ✅ | Sayım satırı. `DBLDEPOMIKTAR`→`systemQty`, `DBLISLEMMIKTARI`/sayılan→`countedQty`. |
| `TBLSBSAYIMFARK` | `TBLSTOCKCOUNTLINE` (türetilir) + `count-differences` API | 🔀⚠️ | **Fark ayrı tablo değil**: `countedQty − systemQty` türetilir, CountDifferences ekranı hesaplar. Legacy fark tablosundaki ağırlık farkı/rezerve alanları yok. |
| `TBLSBSAYIMPARAMETRE` | `TBLCOUNTPARAMETER` | ✅ | Sayım parametreleri (eşitleme/parçalı palet/iç palet vb. bayraklar taşındı). |
| *(TBLSBSAYIMKRITER — 70'te yok, StokBar'da var)* | `TBLCOUNTCRITERIA` | ⚠️ | Sayım alan kriteri. |
| *(TBLSBSAYIMONAYKULLANICIGRUP)* | `TBLCOUNTAPPROVALUSERGROUP` | ⚠️ | Sayım onay kullanıcı grubu. |

### 2.9 Entegrasyon

| Legacy tablo | OneGate model(ler) | Durum | Not |
|---|---|---|---|
| `TBLSBENTEGRASYONADRES` (45 kolon) | `TBLINTEGRATIONLOG` (kısmen) | ⚠️❌ | **Entegrasyon adresi/bağlantı tanımı (FTP/proxy/DLL/SSP yolu) modellenmedi.** OneGate sadece IN/OUT aktarım **log/izleme** taşır. Adres tanımı eksik. |
| `TBLSBENTEGRASYONPAKET` | — | ❌ | Entegrasyon paketi (DB bağlantısı, Logo versiyonu, çoklu firma). Modellenmedi. |
| `TBLSBENTEGRASYONSORGU` | — | ❌ | Entegrasyon sorgusu (pakete bağlı SSP). Modellenmedi. |
| `TBLSBENTEGRASYONPARAMETRE` | — | ❌ | Entegrasyon belge düzenleme tipi. Modellenmedi. |
| `TBLSBENTYAZMAPARAMETRE` | — | ❌ | Entegrasyon yazma parametresi (palet/batch/seri aktarım). Modellenmedi. |
| `TBLSBENTEKALANDONUSUM` | — | ❌ | Entegrasyon alan dönüşümü (StokBar↔Panorama alan eşleme). Modellenmedi. |
| `TBLSBEKSAHABAGLANTI` | — | ❌ | Entegrasyon ek saha bağlantı (kaynak↔hedef saha). Modellenmedi. |
| *(TBLSBPBELGETANIM)* | — | ❌ | (bkz. §2.4) entegrasyon belge tanımı. |

> Entegrasyon bütün olarak **bilinçli sadeleştirildi**: legacy DB-DB SSP-tabanlı entegrasyon yerine OneGate uygulama-katmanı + log izleme yaklaşımı kullanacak. Adres/paket/sorgu tanımı henüz modellenmedi (eksik).

### 2.10 Etiket / Dinamik Etiket (DE) / PPC el-terminali

| Legacy tablo | OneGate model(ler) | Durum | Not |
|---|---|---|---|
| `TBLSBDEETIKETTIPI` | `TBLLABELTYPE` | ⚠️ | Etiket tipi. Kolon sayıları/uzunlukları taşındı + `layoutJson` (görsel tasarım — bizim eklediğimiz). |
| `TBLSBDEETIKETTIPIBUTTON` | — | ❌ | DE etiket buton (ekran butonu/işlev/web metod). Modellenmedi. |
| `TBLSBDEETIKETTIPIITEM` (51 kolon) | — | ❌ | DE etiket item — dinamik alan tasarımı (combo sorgu/change/autoload). `layoutJson`'a kısmen ama 1:1 değil. Modellenmedi. |
| `TBLSBDEETIKETTIPISORGU` | — | ❌ | DE etiket sorgusu. Modellenmedi. |
| `TBLSBDEETIKETTIPIYETKI` | — | ❌ | DE etiket yetkisi (kullanıcı/grup). Modellenmedi. |
| `TBLSBDEEKRANBAGLANTI` | — | ❌ | DE ekran bağlantı (PPC menü). Modellenmedi. |
| `TBLSBDEEKRANITEMBAGLANTI` | — | ❌ | DE ekran item bağlantı. Modellenmedi. |
| `TBLSBDEEKRANSAHABAGLANTI` | — | ❌ | DE ekran saha bağlantı. Modellenmedi. |
| `TBLSBPPCEKRAN` (45 satır) | — | ❌ | **PPC el-terminali ekranı.** Modellenmedi (OneGate mobil rotaları kod-tabanlı). |
| `TBLSBPPCEKRANPARAMETRE` (39 kolon) | — | ❌ | PPC ekran parametresi (batch/seri takip, miktar girişi, çoklu seri vb.). Modellenmedi. |
| `TBLSBPPCMENU` (15 satır) | `TBLMENUGROUP` (kısmen) | ⚠️❌ | PPC menü → menü grubu kısmen; tam PPC menü ağacı modellenmedi. |
| `TBLSBEKRANRAPORBAGLANTI` | `TBLSCREENREPORTLINK` | ✅ | Ekran-rapor bağlantı. |

> DE (dinamik etiket sistemi) ve PPC (el-terminali ekran konfigürasyonu) tüm aileleri **bilinçli atlandı**: bunlar VB6/eski-terminal motoruna özgü meta-konfigürasyon. OneGate modern React mobil + `layoutJson` etiket tasarımı ile yeniden yazılacak.

### 2.11 Parametre / Sayaç / Diğer config

| Legacy tablo | OneGate model(ler) | Durum | Not |
|---|---|---|---|
| `TBLSBSAYAC` | `TBLSEQUENCE` | ✅ | Numara serisi (önek/başlangıç/bitiş/değer). `TXTONEK2SSPADI`→`prefix2`. |
| `TBLSBPARAMETRE` | `TBLPARAMETER` | ✅ | Genel parametre (kod/tanım/değer). |
| `TBLSBLOGBELGE` (2543 satır) | — | ❌ | **Belge log/ledger** (belge satır bazında işlem izi: barkod, batch, seri, lokasyon, miktar, kullanıcı). OneGate'te KALICI belge log yok. → §5. |

---

## 3. Modellenmemiş legacy tablolar (özet liste)

Bizde **karşılığı olmayan** legacy tablolar, ne işe yaradıkları, bilinçli mi / eksik mi:

| Legacy tablo | İşlevi | Karar |
|---|---|---|
| `TBLSBPALETTARIHCE` | Palet hareket ledger (19936 satır) | ❌ **Eksik (kritik)** — kalıcı palet izlenebilirliği yok. |
| `TBLSBLOGBELGE` | Belge satır işlem log/ledger (2543 satır) | ❌ **Eksik (kritik)** — kalıcı stok/belge audit yok; stok kartı satırdan türetiliyor. |
| `TBLSBPALETBILDIRIMBASLIK` / `...DETAY` | Üretimden palet bildirimi | ❌ Eksik — üretim-WMS köprüsü modellenmedi. |
| `TBLSBSAYIMFARK` | Sayım fark snapshot (ağırlık farkı dahil) | 🔀 Türetiliyor — fark tablosu yerine hesaplama; ağırlık farkı kayboldu. |
| `TBLSBENTEGRASYONADRES` / `...PAKET` / `...SORGU` / `...PARAMETRE` / `TBLSBENTYAZMAPARAMETRE` / `TBLSBENTEKALANDONUSUM` / `TBLSBEKSAHABAGLANTI` | DB-DB SSP entegrasyon altyapısı (adres/paket/sorgu/alan dönüşüm) | ❌ Bilinçli atlandı — uygulama-katmanı entegrasyona geçilecek; adres/paket tanımı henüz yok (eksik). |
| `TBLSBDEETIKETTIPIBUTTON/ITEM/SORGU/YETKI` + `TBLSBDEEKRAN*` | Dinamik etiket (DE) meta-tasarım sistemi | ❌ Bilinçli atlandı — `layoutJson` ile yeniden yazılıyor. |
| `TBLSBPPCEKRAN` / `...PARAMETRE` / `TBLSBPPCMENU` | PPC el-terminali ekran konfigürasyonu | ❌ Bilinçli atlandı — React mobil ile yeniden yazılıyor. |
| `TBLSBPBELGETANIM` | Entegrasyon belge tanımı/eşleme | ❌ Bilinçli atlandı. |
| `TBLSBBELGEPARAMETRE` | Belge tipi parametre (legacy boş) | ⚠️ Sadeleştirildi → `TBLDOCUMENTPLANNINGPARAMETER`. |
| `TBLSBOPERASYONTIPIPALETSTATU` | (DB'de yok, 0 kolon) | ❌ Legacy'de zaten kaldırılmış. |
| `TBLSB*EKSAHA` (BELGEBASLIK/DETAY/KAPSAM/PALET) | Varlık-bazlı ek saha | 🔀 Birleştirildi → tek `TBLEXTRAFIELD` (entityType ile). |
| `TBLSBBELGEKAPSAM` (+EKSAHA) | Belge KAPSAM (scope) ara katmanı | 🔀 Eridi → satıra (2 katman). → §5. |

---

## 4. Bizde yeni olan (legacy'de bu 70'te olmayan) tablolar

OneGate'in eklediği, legacy WMS 70 tablosunda doğrudan karşılığı olmayan modeller:

### 4.1 Çevre modüller (ayrı şemalar — gevşek bağ)
- **procurement:** `TBLPURCHASEORDER`, `TBLPURCHASEORDERLINE` — satınalma siparişi.
- **sales:** `TBLSALESORDER`, `TBLSALESORDERLINE`, `TBLSALESALLOCATION` — satış siparişi + FEFO stok ayırma.
- **logistics:** `TBLVEHICLE`, `TBLSHIPMENT`, `TBLSHIPMENTSTOP` — araç/sevkiyat/durak.
- **finance:** `TBLINVOICE`, `TBLINVOICELINE` — fatura (PO/SO'dan).

### 4.2 wms içinde yeni eklenenler
- **Tenant kökü:** `TBLCOMPANY` (legacy `LNGDISTKOD`'dan ayrıştırılmış gerçek kiracılık).
- **Auth:** `TBLUSER`, `TBLROLE`, `TBLUSERROLE` (RBAC).
- **Tesis:** `TBLFACILITY` (legacy'de depo doğrudan firmaya bağlıydı; çok-tesis için).
- **İş emri:** `TBLWORKORDER`, `TBLWORKORDERLINE` (+ `TBLWORKORDERGENERALPARAMETER`, `TBLWORKORDERREASON`, `TBLWORKORDERREFERENCEOPERATION`, `TBLRACKFEEDPARAMETER`, `TBLWAREHOUSEVEHICLE`) — atanabilir depo görevi.
- **Kalite:** `TBLQUALITYINSPECTION` (muayene → statü geçişi).
- **MRP girdisi:** `TBLINVENTORYRULE` (min/max/reorder).
- **Rapor motoru (metadata-driven):** `TBLREPORTDEF`, `TBLREPORTCRITERIA`, `TBLREPORTFIELD` — SSP-siz `sourceKey` tabanlı.
- **Ek saha jenerik sistemi:** `TBLEXTRAFIELD`, `TBLEXTRAFIELDOPTION`, `TBLOPERATIONTYPEEXTRAFIELD` (dinamik+statik birleşik).
- **Koşul kırma denetim izi:** `TBLCONDITIONBREAKLOG` (legacy'de tam karşılığı yok — gerçek audit eklendi).
- **Entegrasyon izleme:** `TBLINTEGRATIONLOG` (sadeleştirilmiş IN/OUT log).
- **Yazıcı:** `TBLPRINTER` (IPP/ZPL/mDNS keşif — legacy Excel'de yok).
- **Belge durum işlem/kriter:** `TBLDOCUMENTSTATUSACTION`, `TBLDOCUMENTSTATUSCRITERIA`.
- **Genel config:** `TBLLANGUAGE`, `TBLSHIFT` (kullanılmıyor), `TBLSTOCKCONTROLPARAMETER`, `TBLDOCUMENTPLANNINGPARAMETER`, `TBLPICKORDERPARAMETER`, `TBLDASHBOARDREPORT`, `TBLMENUGROUP`.
- **Ürün ailesi master:** `TBLPRODUCT`/`GROUP`/`SUBGROUP`/`TYPE`/`DETAILTYPE` ve **cari ailesi** `TBLBUSINESSPARTNER`/grup/ek — legacy WMS'te ana ERP'deydi, OneGate kendi içine aldı.

---

## 5. Kilit yapısal farklar

### 5.1 ÇİFT belge modeli → TEK belge modeli (en kritik)
**Legacy:** İki ayrı belge ailesi:
- `TBLSBBELGEBASLIK/KAPSAM/DETAY` = **sipariş/planlama belgesi** (sipariş no, sevkiyat, sefer, toplanan/hazırlanan miktar, kaynak→hedef lokasyon).
- `TBLSBOPERASYONBELGEBASLIK/DETAY` = **fiili stok hareketi** (`BYTGIRISCIKIS` flag, tek lokasyon+statü, `DBLFIREMIKTARI` fire).

**OneGate:** İkisi tek `TBLDOCUMENT` + `TBLDOCUMENTLINE`'a birleşti; satırda `sourceLocation/Status` → `targetLocation/Status` her iki yönü taşır. Yön op-tipinden (`MovementDirection`) gelir.

> **Claude Code dikkat:** Legacy'den veri/davranış taşırken "bu sipariş belgesi mi, fiili hareket mi?" ayrımı OneGate'te **op-tipi + documentStatus** ile yapılır, ayrı tabloyla değil. Fire miktarı (`DBLFIREMIKTARI`) ve "toplanan vs hazırlanan" gibi iki-aşamalı miktar alanları **kayboldu** — bunlara ihtiyaç olursa satıra alan eklemek gerekir.

### 5.2 KAPSAM (scope) ara katmanının kaybı
**Legacy:** 3 katman — BASLIK → **KAPSAM** → DETAY. KAPSAM, palet/batch/seri/üretim-SKT kırılımını ve rezerve-belge bağını taşıyan ara katman.
**OneGate:** 2 katman — header → line. Kapsam alanları satıra eridi.

> **Claude Code dikkat:** Bir belge satırının altında **birden çok palet/batch kırılımı** gerektiğinde legacy KAPSAM bunu modelliyordu; OneGate'te bunun için **satır çoğaltmak** gerekir (her kırılım = ayrı line). Ek saha enum'ında `DOC_SCOPE` hâlâ var ama arkasında tablo yok — kafa karıştırıcı; kullanılmamalı.

### 5.3 Kalıcı ledger / audit yokluğu
**Legacy:** `TBLSBPALETTARIHCE` (palet hareket ledger, 19936 satır) + `TBLSBLOGBELGE` (belge satır işlem log, 2543 satır) + her tabloda `LNGSONKULLANICIKOD`/`BYTARSIV`.
**OneGate:** Kalıcı stok/palet hareket ledger **yok**; stok kartı (`TBLSTOCK`) belge satırından türetilir. `LNGSONKULLANICIKOD`/`BYTARSIV` çoğu modelde modellenmedi (`isActive` + hard delete).

> **Claude Code dikkat:** "Bu palet/stok ne zaman, kim tarafından, hangi belgeyle hareket etti?" sorusu OneGate'te **doğrudan cevaplanamıyor** — yalnız mevcut durum var. İzlenebilirlik gerekiyorsa bir `TBLSTOCKLEDGER`/`TBLPALLETLEDGER` eklenmeli (SISTEM-HARITASI §11 "kalıcı stok hareket ledger yok" boşluğu ile aynı). Soft delete (`BYTARSIV`) yerine hard delete riski: silinen kaydın geçmişi gider.

### 5.4 LNGDISTKOD'un ikiye bölünmesi
**Legacy:** `LNGDISTKOD` tek alanda hem tenant hem tesis.
**OneGate:** `companyId` (TBLCOMPANY = gerçek kiracı) + `facilityId` (TBLFACILITY = tesis) ayrı.

> **Claude Code dikkat:** Legacy `LNGDISTKOD` taşırken hangi anlamda kullanıldığına bak — bazı config tablolarında (ör. `TBLDOCUMENTSTATUSCRITERIA.businessPartnerId // LNGDISTKOD`) DISTKOD aslında **cari** anlamında bile kullanılmış. Tek tip eşleme yapma.

### 5.5 SSP (saklı yordam) → yerleşik kontrol/enum
**Legacy:** Koşul/yönlendirme/tolerans davranışı `TXTSSP` (ntext SQL saklı yordam adı) ile sürülürdü.
**OneGate:** `ConditionControlType` enum + yapılandırılmış parametre alanları (tolerans/yüzde/gün). SSP yok.

> **Claude Code dikkat:** Legacy'de "özel SSP ile" yapılan esnek kontroller OneGate'te **enum değerleriyle sınırlı** (MANUAL/REQUIRE_BATCH/REQUIRE_SERIAL/...). Yeni bir kontrol türü gerekiyorsa enum + motor kodu eklemek gerekir; "serbest SQL" esnekliği bilinçle terk edildi.

---

## 6. Sayısal özet

- **Legacy tablo sayısı:** 70 (bir tanesi — `TBLSBOPERASYONTIPIPALETSTATU` — DB'de zaten 0 kolon).
- **Eşleme durumu (legacy 70 tablo bazında, yaklaşık):**
  - ✅ birebir: ~22 (depo/alan/lokasyon/grup/kapasite, birim/ürün-birim/barkod/muadil/statü, op-tipi ve junction'ları, palet/palet-tipi, koşul/yönlendirme tipleri, sayaç/parametre, sayım başlık/detay/parametre, belge durum/onay, ekran-rapor).
  - 🔀 birleştirildi: ~12 (çift belge→tek belge, KAPSAM→satır, tüm `*EKSAHA`→tek ek saha, sayım fark→türetilen, neden→neden+kategori).
  - ⚠️ kısmi/sadeleştirildi: ~10 (koşul/yönlendirme parametre SSP→enum, etiket tipi, entegrasyon adres→sadece log, PPC menü→menü grubu, cari/ürün master ana-ERP'den taşınma).
  - ❌ modellenmemiş: ~26 (palet tarihçe, belge log, palet bildirim ×2, tüm entegrasyon altyapısı ×7, tüm DE etiket ×8, tüm PPC ×3, PBELGETANIM, OPERASYONTIPIPALETSTATU).

---

### Yönetici özeti

**En kritik 3 eksik (❌):**
1. `TBLSBPALETTARIHCE` (palet hareket ledger, 19936 satır) — kalıcı palet izlenebilirliği yok.
2. `TBLSBLOGBELGE` (belge satır işlem log, 2543 satır) — kalıcı stok/belge audit yok; stok satırdan türetiliyor.
3. Entegrasyon altyapısı tümü (`TBLSBENTEGRASYONADRES/PAKET/SORGU/...` 7 tablo) — dış sistem bağlantı tanımı yok, yalnız izleme logu var.

**En kritik 3 yapısal fark:**
1. **Çift belge → tek belge:** sipariş belgesi + fiili hareket belgesi tek `TBLDOCUMENT`'a birleşti (fire miktarı + toplanan/hazırlanan ayrımı kayboldu).
2. **KAPSAM ara katmanının kaybı:** 3 katman (BASLIK→KAPSAM→DETAY) → 2 katman (header→line); satır-altı çoklu palet/batch kırılımı için satır çoğaltmak gerekir.
3. **Kalıcı ledger/audit yokluğu + LNGDISTKOD'un ikiye bölünmesi:** geçmiş hareket sorgulanamıyor; `LNGDISTKOD` → `companyId` (tenant) + `facilityId` (tesis), ama bazı legacy tablolarda DISTKOD aslında cari demek (eşlerken dikkat).
