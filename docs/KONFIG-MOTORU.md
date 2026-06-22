# OneGate — Konfigürasyon Motoru (Operasyon Tipi × Scope × Kurallar)

> Tur 4 · 2026-06-20 · Sistemin "nasıl uyarlanır" beyni.
> Referans: legacy `TBLSBOPERASYONTIPI` (74 kolon) · bizim `TBLOPERATIONTYPE` · enforce mantığı `src/lib/movement.ts`.
> İlgili: [SISTEM-HARITASI.md](SISTEM-HARITASI.md) · [ISLEYIS.md](ISLEYIS.md) · [VERI-MODELI.md](VERI-MODELI.md)

---

## 1. Temel mantık

OneGate'te davranış **kod içine gömülü değil, konfigürasyondan türer**. Üç eksen:

1. **Operasyon Tipi** = bir hareketin kim olduğu + hangi bayrakların açık olduğu (yön, kontrol modu, ~30 davranış bayrağı).
2. **Scope (kapsam)** = bir kuralın *kime* uygulandığı: `LinkScope = ALL | GROUP | SPECIFIC`, üç boyutta bağımsız: **cari** × **malzeme** × **lokasyon**.
3. **Junction/parametre tabloları** = operasyon tipine bağlı kural listeleri (statü geçişi, neden, palet tipi, tolerans, yasaklı ürün, koşul, yönlendirme).

> **Altın kural:** *kural/takip kapalıysa serbest, açıksa enforce.* (Geriye uyumlu — boş konfig = engel yok.)
> Tüm enforce `completeDocument` içinde, **stok yazılmadan önce**, tek transaction'da yapılır.

---

## 2. Scope sistemi (LinkScope) — kuralların hedeflenmesi

Her scope'lu kural satırı 1-3 boyutta `*LinkType` (ALL/GROUP/SPECIFIC) + `*LinkId` taşır. `movement.ts` eşleştirme:

| Boyut | Fonksiyon | ALL | GROUP | SPECIFIC |
|---|---|---|---|---|
| Malzeme | `materialScopeMatches` | hep eşleşir | linkId = ürün grubu | linkId = ürün |
| Cari | `cariScopeMatches` | hep eşleşir | linkId = cari grubu | linkId = cari |
| Lokasyon | `locationScopeMatches` | hep eşleşir | lokasyon o gruba üye | linkId = lokasyon |

`null`/`ALL` → serbest. Bir kural birden çok boyut taşıyorsa **hepsi** eşleşmeli (AND).
> ⚠️ Legacy'de scope çoğu yerde `LNGDISTKOD` + bağlantı-tipi alanlarıyla yapılır; `LNGDISTKOD` bazen **tesis**, bazen **cari** anlamında — körü körüne `companyId`'ye eşleme. Bkz. [VERI-MODELI.md §18].

---

## 3. Operasyon Tipi bayrak referansı (legacy 74 kolon → OneGate)

Durum: ✅ modellendi + enforce · 🟡 modellendi, enforce kısmi/yok · ❌ modellenmedi · ⛔ mimaride gereksiz (legacy SSP-hook).

### 3.1 Kimlik / yönlendirme
| Legacy kolon | OneGate alan | Durum | Not |
|---|---|---|---|
| TXTKOD / TXTTANIMI | code / name | ✅ | |
| BYTKATEGORI | direction (MovementDirection) | ✅ | Giriş/Çıkış/Transfer/Sayım |
| BYTBELGETIPI | documentType (OperationDocumentType) | ✅ | |
| BYTKONTROLLU | controlMode | ✅ | Kontrolsüz/Kontrollü/Referans |
| LNGSAYACKOD / LNGOPERASYONSAYACKOD / LNGGRUPSAYACKOD | sequenceId / operationSequenceId / groupSequenceId | 🟡 | yalnız sequenceId FK; diğer 2 düz Int |
| LNGKONTROLGRUPKOD | operationGroupId | ✅ | |
| LNGTERSOPERASYONKOD | reverseOperationTypeId | 🟡 | alan var, ters-belge ÜRETME pattern'i yok |
| LNGIPTALLOKASYONKOD | cancelLocationId | 🟡 | alan var, kullanımı sınırlı |
| LNGDISTKOD | facilityId | 🟡 | tenant/tesis/cari karışıklığı (§2) |
| BYTAKTIFPASIF | isActive | ✅ | |

### 3.2 Stok hareketi davranışı
| Legacy kolon | OneGate alan | Durum | Not |
|---|---|---|---|
| BYTMUADILUYGULAMASI | equivalentApplication | 🟡 | bayrak var, muadil ikame mantığı sınırlı |
| BYTMALBAZINDATOPLAMA | materialBasedCollection | 🟡 | |
| BYTMALBAZINDAMIKTARDUZENLENSIN | materialBasedQtyEdit | 🟡 | |
| BYTBATCHATAMA | batchAssignment | ✅ | parti yoksa AUTO-… üretir |
| BYTKLTKONTROLYAPILSIN | qualityControl | ✅ | mal kabulde hedef → KARANTİNA |
| BYTPASIFURUNKULLANILSIN | passiveProductUse | ✅ | kapalıysa pasif ürün bloke |
| BYTNEDENGIRISZORUNLU | reasonRequired | ✅ | |
| BYTNEDENGIRISIBASLIKTA | reasonInHeader | 🟡 | |
| BYTREZERVETRANSFEREDILSIN | reserveTransfer | 🟡 | rezerve ayrı endpoint'te |
| BYTORJMIKGUNCELLENSIN | originalQtyUpdate | 🟡 | |

### 3.3 Palet işlemleri — **en büyük boşluk kümesi**
| Legacy kolon | OneGate alan | Durum | Not |
|---|---|---|---|
| BYTAYNIPALETKULLANILSIN | sameUsePallet | ✅ | girişte kullanımdaki palete eklemeyi engeller |
| BYTAYNISERIKULLANILSIN | sameUseSerial | ✅ | seri tekrar girişi istisnası |
| BYTPALETBOZMA | palletBreaking | 🟡 | bayrak var, posting'te palet bozma YOK |
| BYTONAYDAPALETYARATILSIN | — | ❌ | onayda otomatik palet yaratma (posting'te `OPKATEGORI=1`) |
| BYTTRANSFERDEPALETTENCIKAR | — | ❌ | transferde paletten çıkar |
| BYTTRANSFERDEPALETIBOZ | — | ❌ | transferde paleti boz |
| BYTUSTPALETBOZULSUN | — | ❌ | üst (parent) paleti boz |
| BYTPARCALIPALETBOZ | — | ❌ | parçalı palet bozma |
| BYTPARCALIKULLANIM | — | ❌ | parçalı kullanım (posting `STOKHAREKETI_TRANSFER`'e geçer) |

> Bu küme, legacy `SSP_SBOPERASYONBELGEHAREKET`'in palet yaşam döngüsü + `TBLSBPALETTARIHCE` ledger
> mantığını sürer. OneGate `movement.ts` bunları yapmaz. Palet izlenebilirliği gerekiyorsa **önce bu küme** ele alınmalı.

### 3.4 Loglama / kontrol granülerliği (ledger boşluğuyla bağlı)
| Legacy kolon | OneGate alan | Durum |
|---|---|---|
| BYTLOGLAMA / BYTLOGKONTROL | logging / logControl | 🟡 (bayrak var, kalıcı log yok) |
| LNGLOGKONTROLGUNSAYISI | logControlDays | 🟡 |
| BYTLOGLAMATIPI / BYTLOGKONTROLUYARITIPI / BYTLOGKONTROLPALETSIZ | — | ❌ log granülerliği |
| BYTGRUPLAMA | grouping | 🟡 |
| BYTOPERASYONKONTROLLERIYAPILMASIN | — | ❌ tüm kontrolleri atla (bypass) |

### 3.5 Entegrasyon / okutma
| Legacy kolon | OneGate alan | Durum |
|---|---|---|
| BYTPARAMENTEGRASYON | integration | 🟡 (yalnız log) |
| BYTONAYLIBELGEGUNCELLENSIN | approvedDocUpdate | 🟡 |
| BYTTOPLUGONDERIM | bulkSend | 🟡 |
| BYTMAILGONDERILSIN | emailSend | 🟡 |
| BYTOKUTMABAZINDABILGILENDIRME / …MESAJIGOSTER | readBasedControl / readBasedInfoMessage | 🟡 |
| BYTOKUTMABAZINDAEKSAHAKONTROLU | — | ❌ |
| BYTBELGEDETAYLOKASYONUKAPSAMAKTARILSIN | detailLocationToCoverage | ⚠️ KAPSAM katmanı yok (bkz §6) |

### 3.6 Belge bölme / iş emri / sayım kontrol
| Legacy kolon | Durum | Not |
|---|---|---|
| BYTBOLMEDEBELGEYARATILSIN / BYTONAYDABELGEBOL / BYTTOPLANMAYANDETAYBELGEDEOLUSMASIN | ❌ | belge bölme mantığı modellenmedi |
| BYTISEMRINDEONAY / BYTONAYLISAYIMKONTROLU | ❌ | iş emri/sayım onay kontrolü |
| BYTSEVKEDEMEMENEDENGIRISI / BYTKASATIPIUYGULAMASI / BYTKONTROLBELGETIPKOD / BYTBELGEGUNCELLEME / LNGTOPLIPTALOPERASYONKOD / BYTREFERANSBELGEONAYIPTALEDILSIN | ❌ | niş kontroller |

### 3.7 SSP-hook alanları — ⛔ mimaride gereksiz
Legacy, davranışı **stored procedure adı** vererek özelleştirir (çağrılan SP adını kolonda tutar):
`TXTREFERANSDETAYSSP`, `TXTREFERANSBASLIKSSP`, `TXTONAYKONTROLSSPAD`, `TXTONAYIPTALKONTROLSSPAD`,
`TXTOKUTMABAZINDASSPADI`, `TXTBELGEBAGLANMAKONTROLSSPADI`, `TXTEKSAHAGETIRMESSPADI`, `TXTBELGEBOLMEKONTROLSSPAD`, `TXTKONTROLOPERASYON`.
→ Bu, legacy'nin müşteri-bazlı forklanmasının (`_BOGAZICI`, `_TNC`…) sebebi. OneGate'te karşılığı **kod + config bayrağı**;
bu alanları tablo olarak taşımıyoruz (bilinçli). Özel davranış gerekince koda + bayrağa çevir.

---

## 4. Scope-driven kural tabloları (operasyon tipine bağlı) — nasıl enforce edilir

`completeDocument` her satır için, operasyona bağlı şu kuralları sırayla uygular:

| Kural tablosu | Ne yapar | Enforce (movement.ts) |
|---|---|---|
| TBLOPERATIONTYPESTATUS | kaynak→hedef statü geçişi izinli mi | `transitions` — INBOUND hedef / OUTBOUND kaynak / INTERNAL ikisi |
| TBLOPERATIONTYPEREASON | belge nedeni bağlı listede mi | `allowedReasons` |
| TBLOPERATIONTYPEPALLETTYPE | satır paleti uygun tipte mi | `allowedPalletTypes` |
| TBLOPERATIONTYPEFORBIDDENPRODUCT | ürün bu op'ta yasaklı mı (cari×malzeme scope) | `forbiddenRules` |
| TBLOPERATIONTYPELOCATION | kaynak/hedef lokasyon izinli mi (scope) | `locationRules` |
| TBLOPERATIONTYPETOLERANCE | miktar referans toleransında mı (±% + ±adet) | `toleranceRules` (satırda referenceQty varsa) |
| TBLENTRY/EXITCONDITIONPARAMETER | batch/seri/neden/kontrol-saha/raf-ömrü koşulu | `condParams` + kırma (şifre+neden → `TBLCONDITIONBREAKLOG`) |
| TBLROUTINGRULE (suggestPutaway) | hedef lokasyon yönlendirme önerisinde mi | directed putaway cache |
| TBLLOCATIONCAPACITY | hedef lokasyon kapasite limiti | `enforceCapacity` (ERROR→hata, WARNING→izin) |

Ek olarak ürün-birim takip bayrakları (batchTracking/serialTracking) → parti/seri zorunluluğu + seri=1 + seri tekrar.

---

## 5. 11 davranış kuralı (enforce özeti)

| # | Kural | Tetik | Sonuç |
|---|---|---|---|
| 1 | reasonRequired | op bayrağı + neden boş | 409 |
| 2 | passiveProductUse kapalı | pasif ürün | 409 |
| 3 | op↔statü geçişi | tanımlı geçiş dışı statü | 409 |
| 4 | lokasyon kapasite | limit aşımı | ERROR→409 / WARNING→izin |
| 5 | seri = 1 adet | seri takipli, qty≠1 | 409 |
| 6 | seri tekrar engeli | girişte mevcut seri, sameUseSerial=false | 409 |
| 7 | lot/parti zorunlu | parti takipli, parti boş | 409 (batchAssignment açıksa AUTO üret) |
| 8 | qualityControl | mal kabul | hedef statü → KARANTİNA |
| 9 | sameUsePallet kapalı | kullanımdaki palete giriş | 409 |
| 10 | op↔neden / palet tipi / yasaklı ürün / lokasyon | bağlı liste ihlali | 409 |
| 11 | giriş/çıkış koşulu | koşul sağlanmadı | 409 (kırma: şifre+neden → log+geç) |

---

## 6. Kilit yapısal farklar (Claude Code dikkat)

1. **KAPSAM (DOC_SCOPE) katmanı yok.** Legacy 3 katman (BASLIK→KAPSAM→DETAY); biz 2 katman (header→line).
   `ExtraFieldEntity.DOC_SCOPE` enum'u ve `detailLocationToCoverage` bayrağı duruyor ama arkasında tablo YOK — kullanma.
2. **Palet yaşam döngüsü + ledger eksik** (§3.3). En öncelikli genişleme alanı.
3. **SSP-hook → kod.** Legacy özel davranışı SP adıyla enjekte eder; biz koda alırız. Fork klonlama.
4. **Sayaç/scope tam FK'li değil** — operationSequenceId/groupSequenceId düz Int; scope `LNGDISTKOD` çift-anlamlı.

## 7. Yeni operasyon davranışı eklerken — nereye dokunulur
1. **Bayrak** → `prisma/schema.prisma` `TBLOPERATIONTYPE` + migration + `web/src/pages/OperationTypeForm.tsx` (sekme).
2. **Scope'lu kural** → ilgili junction tablo + `src/routes/operationLinks.ts`/`operationConfig.ts` + `web/src/formConfig.ts`.
3. **Enforce** → `src/lib/movement.ts` `completeDocument` (doğru sırada, stok yazımından önce) + smoke testi.
4. **Doğrula** → `npm run typecheck && npm run migrate && npm run test:smoke`.
