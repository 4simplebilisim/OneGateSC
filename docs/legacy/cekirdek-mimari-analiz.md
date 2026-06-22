# OneGate — Çekirdek Tablolar Mimari Analizi (legacy ↔ OneGate)

> 2026-06-20 · Kaynak: STOKBAR_UNI canlı + [cekirdek-tablolar-schema.md](cekirdek-tablolar-schema.md) (tam kolon dökümü).
> Kapsam: Belge trio (BASLIK/KAPSAM/DETAY) · STOKDURUM · PALET · TBLURUN · TBLMUSTERI.
> **Bunlar sistemin mimari belkemiği — birleştirme/sadeleştirme kararlarının doğru olup olmadığı burada belli olur.**

---

## 1. Belge modeli — EN KRİTİK FARK: DETAY ≠ KAPSAM (1:N)

### Legacy: 3 katman + ayrı operasyon belgesi
```
TBLSBBELGEBASLIK   (29 kol)  → planlama/sipariş başlığı: op tipi, cari, sipariş no, irsaliye,
                               sevkiyat tarihi, sefer no, plaka, nakliye firma, onay aşaması, bölünme
   └─ TBLSBBELGEDETAY (33 kol) → SATIR = NE isteniyor (plan): ürün, işlem miktarı, ana miktar,
                               TOPLANANMIKTAR, HAZIRLANANMIKTAR, referans, teslim tarihi
        └─ TBLSBBELGEKAPSAM (29 kol) → KAPSAM = NASIL/NEREYE gerçekleşti (okutma kırılımı):
                               palet, batch, seri, PO, KAYNAK→HEDEF lokasyon/statü, KAMYON, neden
                               → bir DETAY satırına KARŞILIK N adet KAPSAM (çoklu palet/batch/parça)

(paralel) TBLSBOPERASYONBELGEBASLIK/DETAY → fiili stok hareketi (GIRISCIKIS flag, fire miktarı)
```

**KAPSAM'ın kritik rolü:** Kaynak→hedef lokasyon/statü ve palet/batch/seri/kamyon kırılımı **DETAY'da değil KAPSAM'da**. Yani:
- DETAY = "10 adet X ürünü" (talep)
- KAPSAM = "3 adet A paleti batch-1'den raf R01'e + 7 adet B paleti batch-2'den raf R02'ye" (gerçekleşen okutmalar, N satır)

### OneGate: 2 katman, DETAY+KAPSAM birleşik
```
TBLDOCUMENT       → başlık (op tipi, cari, depo, durum)
   └─ TBLDOCUMENTLINE → satır: ürün + qty + KAYNAK→HEDEF lokasyon/statü + palet/batch/seri (tek satırda)
        └─ TBLSTOCK (complete anında)
```
Biz **DETAY ile KAPSAM'ı tek satıra indirdik** (+ ayrı operasyon belgesini de TBLDOCUMENT'a kattık).

### Mimari sonuç (DİKKAT)
| Konu | Legacy (DETAY+KAPSAM) | OneGate (tek satır) | Etki |
|---|---|---|---|
| Karışık palet / split batch | 1 DETAY → N KAPSAM | N ayrı DOCUMENTLINE | Talep↔gerçekleşme gruplaması kaybolur |
| Kısmi toplama | DETAY.TOPLANANMIKTAR / HAZIRLANANMIKTAR | alan yok | "ne kadarı toplandı" izlenemez |
| Tolerans | DETAY (plan) vs KAPSAM (gerçek) karşılaştırması | referenceQty tek satırda | plan-vs-gerçek doğal değil |
| Sefer/kamyon kırılımı | KAPSAM.LNGKAMYON | yok | satır-altı araç ataması yok |

> **Karar noktası:** Karışık palet, kısmi toplama ve plan-vs-gerçek tolerans gerçek ihtiyaçsa,
> **satır-altı bir "kapsam/okutma" katmanı** (ör. `TBLDOCUMENTLINESCOPE` veya DOCUMENTLINE'a `parentLineId` +
> `collectedQty`/`preparedQty`) gerekebilir. Şu anki model basit senaryolar için yeterli ama
> WMS'in en ayırt edici özelliği (terminalde çoklu okutma) bu katmanı ister.
> *(Not: `ExtraFieldEntity.DOC_SCOPE` enum'u zaten KAPSAM için ayrılmış — arkasında tablo yok.)*

---

## 2. STOKDURUM — stok kimliği (legacy ↔ TBLSTOCK)

`TBLSBSTOKDURUM` (23 kol) — anahtar alanlar:
```
LNGLOKASYONKOD + LNGMALZEMEKOD + LNGSTATUKOD + TXTBATCHNO + TXTSERINO + LNGPALETID
  + TXTPO + TXTPOLINE + LNGMUSTERIKOD          ← legacy stok kimliğinde PO ve CARİ de var
miktar: DBLANAMIKTAR + DBLREZERVEMIKTAR ; ağırlık (net/brüt) ; SKT/üretim ; rezerve belge
```

**OneGate `TBLSTOCK`** unique anahtar: `location × product × status × batch × serial × pallet`.
`customerId`, `poNo`, `poLine` **kolonları var ama unique anahtarda DEĞİL.**

| Fark | Sonuç |
|---|---|
| Legacy: PO/PO-line/cari stok kimliğine dahil (uygulama mantığında) | OneGate aynı lokasyon+ürün+...+farklı PO/cari stoğu **birleştirir** |
| Müşteri malı (consignment), PO-bazlı izlenebilirlik | OneGate'te ayrıştırılamaz |

> **Karar noktası:** Müşteri-sahipli stok (consignment) veya PO-bazlı stok izlenebilirliği gerekiyorsa
> `TBLSTOCK` unique anahtarına `customerId` (+ gerekiyorsa poNo/poLine) eklenmeli. Aksi halde bu kolonlar
> yanıltıcı (dolu ama kimliğe etkisiz). **Demo/sade senaryoda mevcut hâli daha temiz.**
> Veri kalitesi notu: legacy'de çift kolon var — `DBLBRUTAGIRLIK` + `DBLBRUTAGRLIK` (yazım hatası); kopyalama.

---

## 3. PALET — TBLSBPALET (18 kol) ↔ TBLPALLET

| Legacy kolon | OneGate | Not |
|---|---|---|
| TXTPALETNO, LNGPALETTIPIKOD, BYTAKTIF | palletNo, palletTypeId, isActive | ✅ |
| LNGUSTPALETKOD (doğrudan üst) | parentPalletId | ✅ |
| **LNGANAPALETKOD (kök palet)** | — | ❌ kök-palet referansı yok (2 seviyeli hiyerarşi: üst + kök) |
| **DBLORJINALMIKTAR (orijinal miktar)** | — | ❌ palet açılış miktarı tutulmuyor |
| **LNGURETIMREFERANSKOD** | — | ❌ üretim referansı (palet hangi üretimden) |
| TXTBEACONID | beaconId | ✅ (IoT beacon) |
| SKT/üretim tarihi, BYTARSIV | expiry/production, (soft delete yok) | kısmi |

> Palet yaşam döngüsü (yarat/boz/üst-kök) zaten [KONFIG-MOTORU §3.3] ve [ISLEYIS] boşluğu. Kök-palet +
> orijinal-miktar, palet ledger (`PALETTARIHCE`) ile birlikte ele alınmalı.

---

## 4. TBLURUN — ürün master (131 kol) ↔ TBLPRODUCT

Legacy URUN dev bir ERP master'ı; WMS yalnız bir altkümesini kullanır. WMS-ilgili alanlar:

| Legacy | OneGate | Mimari not |
|---|---|---|
| TXTKOD, TXTAD, TXTKISAAD | code, name, shortName | ✅ |
| TXTURUNGRUPKOD, TXTURUNEKGRUPKOD (KOD ile) | productGroupId (FK) + ek grup link | OneGate id-bazlı (daha sağlam) |
| **TXTBIRIM1-5 + TXTBARKOD1-5 (satır içi 5 slot)** | TBLPRODUCTUNIT + TBLPRODUCTUNITBARCODE | ✅ OneGate **normalize** (legacy denormalize — bizim desen daha iyi) |
| BYTSERITAKIPVARMI, BYTSERITAKIPTIP, BYTSERICHECKDIGIT, LNGSERIKARAKTERSAYISI | serialTracking (product-unit'te) | OneGate seri takip ürün-birimde; legacy üründe + check-digit/karakter sayısı detayı YOK |
| **LNGRAFOMRUSURESI/BYTRAFOMRUBIRIM/BYTRAFOMRU/LNGRAFOMRUDEGER (raf ömrü süresi)** | — | ❌ üründe raf-ömrü SÜRESİ config yok (sadece stokta expiryDate + MIN_SHELF_LIFE koşulu) → otomatik SKT hesabı yapılamaz |
| DBLMIN/MAXAGIRLIK (değişken ağırlık / catch-weight) | — | ❌ değişken ağırlıklı ürün desteği yok |
| DBLKOLIICIADET, DBLKDVORAN, DBLAGIRLIK, DBLHACIM | (kısmi) vatRate/weight/volume | kısmi |
| **batch/lot takip flag'i URUN'da net YOK (sadece seri)** | batchTracking (product-unit) | OneGate batch takibi ekledik — legacy'de parti string alan, master flag farklı |

**WMS→ERP bağı:** Belge/stok ürüne **LNGKOD (int)** ile bağlanır (DETAY.LNGMALZEMEKOD → URUN.LNGKOD).
OneGate ürünü kendi şemasına **içselleştirdi** (ayrı ERP'ye referans yerine) — sade, self-contained tercih.

---

## 5. TBLMUSTERI — cari master (184 kol) ↔ TBLBUSINESSPARTNER

En büyük master (184 kol). WMS-ilgili / dikkat çeken alanlar:

| Legacy | OneGate | Not |
|---|---|---|
| TXTKOD, TXTUNVAN | code, name | ✅ |
| **LNGERPKOD/TXTERPKOD** | — | ❌ dış ERP eşleştirme kodu yok (entegrasyon için gerekebilir) |
| TXTADRES1 (2200!), ADRES2, SEHIR, ILCE, POSTAKOD | tek adres alanları | OneGate sade; **çoklu adres yok** |
| **TBLMUSTERISEVKADRES (ayrı tablo, 33 kol)** | — | ❌ çoklu sevk adresi yok |
| TXTGRUPKOD, TXTEKGRUPKOD, LNGBOLGEKOD, BYTTIP | partnerGroup, extraGroup, region, type | ✅ (partner zenginleştirme ile) |
| CRRKREDILIMIT1/2 | — | ❌ kredi limiti yok (finans/cari hesap kapsamı) |
| **TXTEIRSALIYE/EFATURAVARSAYILANPK** | — | ❌ e-irsaliye/e-fatura (TR) entegrasyon anahtarları yok |
| **TXTASILALICI* / TXTASILSATICI* + BYTSEVKVEFATURAADRESAYNI** | — | ❌ asıl alıcı/satıcı (drop-ship / 3. taraf fatura) yok |
| BYTODEMETIPI, BYTDOVIZTIP, LNGTESLIMATSEKLIKOD | — | ödeme/döviz/teslim — ERP/finans kapsamı |

**WMS→ERP bağı:** Belge cariye **LNGCARIKOD**, stok **LNGMUSTERIKOD** (int) ile. OneGate cariyi içselleştirdi.
ERP master'ın taşıdığı kredi/e-fatura/çoklu-adres/asıl-alıcı **WMS'in işi değil** (finans/ERP) — doğru sadeleştirme;
ama **entegrasyon** yapılacaksa `erpCode` (LNGERPKOD/TXTERPKOD karşılığı) eklenmeli.

---

## 6. Özet — mimari kararlar tablosu

| # | Bulgu | OneGate durumu | Öneri / karar |
|---|---|---|---|
| 1 | **DETAY ↔ KAPSAM (1:N)** okutma katmanı | Tek satıra birleşik | **En önemli.** Karışık palet/kısmi toplama/plan-vs-gerçek gerekiyorsa satır-altı kapsam katmanı ekle |
| 2 | STOKDURUM kimliğinde PO/cari | Kolon var, anahtarda yok | Consignment/PO izlenebilirlik gerekirse unique anahtara ekle |
| 3 | Palet kök-ref + orijinal miktar + üretim ref | Yok | Palet ledger + yaşam döngüsüyle birlikte ele al |
| 4 | Ürün raf-ömrü SÜRESİ config | Yok (sadece expiryDate) | Otomatik SKT hesabı için üründe shelf-life eklenebilir |
| 5 | Değişken ağırlık (catch-weight) | Yok | Gıda/et sektörü gerekiyorsa min/max ağırlık |
| 6 | Cari `erpCode` + çoklu sevk adresi + e-fatura | Yok | Entegrasyon/e-fatura kapsamında değerlendir |
| 7 | 5-slot birim/barkod denormalizasyonu | Normalize ✅ | OneGate deseni daha iyi — koru |
| 8 | Bölge-bazlı parçalı stok (TBLSTKANADOLU/IZMIR/...) | Tek TBLSTOCK ✅ | OneGate deseni daha iyi — koru |

> **Felsefe (memory: "klonlama değil, mantık uygula"):** OneGate'in sadeleştirmeleri (tek belge, normalize birim,
> birleşik stok) çoğunlukla **doğru ve daha iyi**. İki yerde dikkat: **(1) DETAY↔KAPSAM** okutma katmanı —
> WMS'in çekirdek davranışı; **(2) stok kimliğinde cari/PO** — consignment senaryosu. Diğerleri kapsam/sektör kararı.
