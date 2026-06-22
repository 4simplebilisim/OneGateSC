# OneGate WMS — İşleyiş (Akış) Dokümanı

> **Amaç:** Her çekirdek WMS akışını **LEGACY StokBar** (stored procedure) ile **OneGate** (TypeScript `src/lib/*`) implementasyonu **yan yana** karşılaştırmak.
> **Kapsam:** Legacy SP'ler müşteri-bazlı forklanmıştır; burada yalnız **kanonik** (`_ANA` / `_ORJ` / `_ORIJINAL`) mantık anlatılır. Müşteri-özel sapmalar yok sayılır.
> **Format:** Her akış 4 parça → **Legacy** · **OneGate** · **Fark/Uyum** · **Dikkat (Claude Code için)**.
> **Bağlam:** `SISTEM-HARITASI.md` §2 (çekirdek model) ve §10 (uçtan uca akışlar), `VERI-MODELI.md` §18 (bilinen boşluklar).
> **Emin olunmayan noktalar** `⚠️ DOĞRULANMALI` ile işaretlenmiştir.

---

## 0. Kavram köprüsü (legacy ↔ OneGate terimleri)

| Legacy (StokBar) | OneGate | Not |
|---|---|---|
| `TBLSBSTOKDURUM` (`DBLANAMIKTAR` / `DBLREZERVEMIKTAR`) | `TBLSTOCK` (`mainQty` / `reservedQty`) | Stok kalbi. Anahtar aynı kırılım. |
| `TBLSBOPERASYONBELGEBASLIK` + `TBLSBBELGEBASLIK` | `TBLDOCUMENT` (birleşik) | İki ayrı başlık tek tabloya indi. |
| `TBLSBOPERASYONBELGEDETAY` + `TBLSBBELGEDETAY` | `TBLDOCUMENTLINE` (birleşik) | İki ayrı detay tek tabloya indi. |
| `BYTGIRISCIKIS` (1=giriş, 2=çıkış) — satır TEK yönlü | `MovementDirection` (INBOUND/OUTBOUND/INTERNAL) — satır KAYNAK→HEDEF | **En temel model farkı** (bkz. Akış 1). |
| `TRHONAYTARIHI IS NULL` = belge henüz onaylanmamış | `status` enum (DRAFT/CONFIRMED/COMPLETED/CANCELLED) | Legacy'de "onay tarihi var mı" boolean'ı. |
| `LNGDISTKOD` | çoğu yerde `companyId`, config'te `businessPartnerId` (=CARİ) | VERI-MODELI §18.4: DISTKOD körü körüne companyId'ye eşlenmemeli. |
| `TBLSBPALETTARIHCE` (palet ledger) | **YOK** | VERI-MODELI §18.6 kritik boşluk. |
| `TBLSBLOGBELGE` (belge satır log) | **YOK** | VERI-MODELI §18.6 kritik boşluk. |
| `BYTPARCALIKULLANIM` (parçalı/aynı kullanım) | `sameUsePallet` / `sameUseSerial` (ayrışmış) | Legacy'de tek bayrak, bizde ikiye bölünmüş ⚠️ DOĞRULANMALI eşleme. |

---

## Akış 1 — Belge yaşam döngüsü + stok posting (ÇEKİRDEK / ÇAPA)

**SP'ler:** `SSP_SBOPERASYONBELGEHAREKET`, `SSP_SBOPERASYONDETAYLARIGIRISCIKIS`, `SSP_SBONAYIPTALSTOKKONTROL`
**OneGate:** `movement.ts` → `completeDocument` / `reverseDocument` (+ `adjustStock`)

### Legacy

**`SSP_SBOPERASYONBELGEHAREKET`** (asıl posting motoru):
1. Operasyon başlığından bayrakları al: `BYTPARCALIKULLANIM`, `BYTTRANSFERDEPALETTENCIKAR`, `BYTPALETBOZMA`, `BYTKATEGORI`.
2. `@REZERVEGUNCELLE` = (BELGETIPI 4 veya 1) ise 1, değilse 0 → **rezerve güncelleme belge tipine bağlı**.
3. Operasyon detay satırlarını `@OPERASYONDETAY` tablo değişkenine al, **CURSOR ile döner**. Her satırın `BYTGIRISCIKIS` alanı var → **satır TEK yönlü** (1=giriş, 2=çıkış).
4. Her satırda **zengin palet yaşam döngüsü**:
   - **Çıkışta (2):** palet bul; transferde-paletten-çıkar koşulu sağlanıyorsa paletten çıkar; `BYTPALETBOZMA=1` ise paleti pasifle (`BYTAKTIF=0`); üst-palet bağını çöz.
   - **Girişte (1) palet yoksa:** operasyon tipinin palet tipinden (`TBLSBOPERASYONTIPIPALETTIPI`) **yeni palet YARAT**; yoksa `RAISERROR`. Üst-palete bağla (`@OLUSACAKUSTPALET`).
5. Asıl stok güncellemesini alt-prosedüre delege eder: `EXEC SSP_SBSTOKHAREKETI_TRANSFER ...`. Dönen mesaj tablosunda `MESSAGETYPE='E'` varsa `RAISERROR` + `RETURN`.
6. Hareket sonrası paletin stoğu kalmadıysa (`NOT EXISTS TBLSBSTOKDURUM`) paleti pasifle; varsa aktif bırak.
7. Her palet değişikliğini **`TBLSBPALETTARIHCE`'ye (ledger) yazar**.

**`SSP_SBOPERASYONDETAYLARIGIRISCIKIS`** (görünüm/eşleme):
- Aynı belgenin **giriş (1) ve çıkış (2)** satırlarını `LNGREFBELGEDETAYNO` üzerinden `FULL OUTER JOIN` ile eşleştirir → tek satırda "giriş lokasyonu + çıkış lokasyonu" üretir. Yani **transfer'i iki tek-yönlü satırdan tek mantıksal satıra çevirir** (raporlama/onay için). İşlem birimini ana miktardan çarpan/bölen ile hesaplar.

**`SSP_SBONAYIPTALSTOKKONTROL`** (onay öncesi yeterlilik):
- Belgenin giriş (`BYTGIRISCIKIS=1`) satırları için `TBLSBSTOKDURUM`'da **(uygun = anaMiktar − rezerve − talep) ≥ 0** olup olmadığını döndürür (`BYTUYGUN`). Stok anahtarı: ürün × palet × lokasyon × batch × seri × po × poline. Tüm satırlar uygunsa 1.

### OneGate

**`completeDocument(documentId, breakOpts)`** — tek `prisma.$transaction`:
1. Belgeyi `operationType` + satırlar (lineNo asc) ile çek. Statü geçişi: yalnız `CONFIRMED` → `COMPLETED` (DRAFT/COMPLETED/CANCELLED reddedilir).
2. **Posting ÖNCESİ tüm doğrulamayı tek yerde** (config-driven) hazırla: reasonRequired, op-statü geçişleri, izinli neden, izinli palet tipi, yasaklı ürün kuralları, lokasyon kapsamı, giriş/çıkış koşul parametreleri, kırma şifresi geçerliliği, tolerans kuralları, putaway cache.
3. `affectsStock` ise her satır için sırayla doğrula (bkz. Akış 4–8 ve 9 tablosu) ve **`adjustStock`** uygula:
   - `OUTBOUND` / `INTERNAL`: kaynak lokasyon/statü **−qty**.
   - `INBOUND` / `INTERNAL`: hedef lokasyon/statü **+qty** (önce `enforceCapacity`).
4. Belgeyi `COMPLETED` + `completedAt` yap.

**`adjustStock(tx, key, unitId, delta)`** — stok çekirdeği:
- Anahtar = `companyId × locationId × productId × statusId × batchNo × serialNo × palletId` (nullable alanlar IS NULL eşleşir, `findFirst`).
- Satır varsa: `newQty = mainQty + delta`; `newQty < 0` → "Yetersiz stok". `reservedQty > newQty` → **rezerve kırpılır** (sevk rezerveyi tüketir).
- Satır yoksa: `delta < 0` → "Stok bulunamadı"; `delta > 0` → yeni satır yarat.

**`reverseDocument(documentId)`** — ters kayıt:
- Yalnız `COMPLETED` belge. Orijinalin tersi: önce kaynak **+qty** (iade), sonra hedef **−qty** (geçici eksiyi önler). Belgeyi `CANCELLED` yap. Başka belge stoğu tükettiyse ters kayıt eksiye düşer → hata.

### Fark/Uyum

| Boyut | Legacy | OneGate |
|---|---|---|
| Satır yön modeli | TEK yönlü (`BYTGIRISCIKIS`); transfer = 2 satır + `GIRISCIKIS` view ile birleştirme | KAYNAK→HEDEF tek satır; INTERNAL doğrudan ikisi |
| Palet yaşam döngüsü | **Zengin**: yarat/boz/üst-palet bağla-çöz, boşalınca pasifle | **YOK** (palet kaydı pasifleştirme/oluşturma yok) — boşluk |
| Palet/belge ledger | `TBLSBPALETTARIHCE` + `TBLSBLOGBELGE` yazılır | **YOK** (VERI-MODELI §18.6) — kritik izlenebilirlik boşluğu |
| Doğrulama yeri | SP'lere dağılmış (alt-prosedürler, mesaj tablosu) | **Konsolide/declarative** tek transaction, config-driven |
| Ağırlık (net/brüt) | Taşınır (`@NETAGIRLIK`, `@BRUTAGIRLIK`, ağırlık birimi) | **Taşınmaz** |
| Rezerve güncelleme | Belge tipine bağlı (`BELGETIPI 1/4` → güncelle) | Çıkışta `adjustStock` rezerveyi otomatik kırpar; sevk akışları rezerveyi açıkça tüketir (sales.ts) |
| Onay öncesi yeterlilik | Ayrı SP (`...ONAYIPTALSTOKKONTROL`) önden BYTUYGUN döner | Ayrı ön-kontrol yok; `completeDocument` posting anında "Yetersiz stok" fırlatır (atomik rollback) |
| Atomiklik | T-SQL transaction + RAISERROR | `prisma.$transaction` + `MovementError` (route'ta 409) |

### Dikkat (Claude Code için)
- **Palet yaşam döngüsü + ledger** OneGate'te yoktur. Palet bozma/oluşturma/üst-palet veya stok hareket geçmişi gerekirse bu **yeni geliştirme**dir (VERI-MODELI §18.6'da `TBLPALLETLEDGER`/`TBLSTOCKLEDGER` önerisi).
- Legacy'nin "iki tek-yönlü satır" modelini taklit etme; OneGate satırı zaten kaynak+hedef taşır. `OPERASYONDETAYLARIGIRISCIKIS`'in birleştirme işi OneGate'te gereksizdir.
- `reverseDocument` SADECE `COMPLETED` belgeyi geri alır; legacy'deki `@TERSOPERASYON` bayrağına denk düşer ama palet tarafı eksiktir.

---

## Akış 2 — Mal kabul + Directed Putaway (yönlendirme)

**SP'ler:** `SSP_SBMALKABULYONLENDIRME_ANA`, `SSP_SBYONLENDIRMEKONTROL_ORIJINAL`
**OneGate:** `routing.ts` → `suggestPutawayLocations` (+ `movement.ts` directed-putaway enforce bloğu)

### Legacy

**`SSP_SBMALKABULYONLENDIRME_ANA`** (yer önerme — depo-topolojisine gömülü):
1. **Kapsam kontrolü** (`#KAPSAMKONTROL`): bu malzeme için hedef lokasyonu olan, durumu 7 / op-tipi 1241 / dist 8 belgelerden hedef lokasyonları topla (hard-coded `LNGDISTKOD=8`).
2. **Boş lokasyonlar** (`#BOSLOKASYONLAR`): kapasite (`DBLPALETMIKTAR`) − mevcut stok paleti − kapsamda rezerve = boş yer; toplama gözleri (`SUBSTRING(...,6,2)='01'`) hariç.
3. **Stok durumu** (`#STOKDURUM`): ürün hâlihazırda hangi raflarda.
4. Karar ağacı:
   - **Ürün stokta var + palet okutulmadı** → toplama gözüne (`...='01'`) yönlendir.
   - **Ürün stokta var + palet okutuldu** → aynı sütunda boş raf varsa en üst rafı öner; yoksa **lokasyon koduna gömülü blok/sütun mesafesiyle en yakın boş rafı** bul (`SUBSTRING` + harf→sayı CASE; A..Z=1..23).
   - **Ürün stokta yok ama kapsamda var** → benzer mesafe mantığı.
   - **Hiçbiri** → "STOKTA YOK".

**`SSP_SBYONLENDIRMEKONTROL_ORIJINAL`** (kapasite-farkında yer kontrolü, dinamik SQL):
- `FNC_SBLOKASYON(@LNGLOKASYON, tip, 1)` ile lokasyon/grup ağacını al.
- Her lokasyon için **kapasite − (stok + açık kapsam) ≥ okutulan** mı; ayrıca **palet-adedi kapasitesi** (`DBLPALETMIKTAR`) kontrolü; malzeme bağlantısı (ürün / ek-grup / hepsi=99). Uygun lokasyonları `KAYITDURUM` (ürün hâli orada mı) + lokasyon sırasıyla döner.

### OneGate

**`suggestPutawayLocations(companyId, productId)`** — saf kural-tabanlı:
1. Ürünü çek (yoksa boş).
2. `TBLROUTINGRULE` (aktif) → malzeme eşleşmesi: `PRODUCT` (doğrudan) veya `PRODUCT_GROUP` (ürün grubu). `priority asc, id asc`.
3. Her kural için hedef: `LOCATION` (tek lokasyon) ya da `LOCATION_GROUP` (grup üyelerini `TBLLOCATIONGROUPLINK`'ten genişlet).
4. Tekilleştirilmiş öneri listesi (`viaRuleId`, `matchedBy`, `viaLocationGroupId` ile).

**Enforce** (`movement.ts`, INBOUND/INTERNAL satırda): ürünün önerilen lokasyon kümesi boş değilse hedef o kümede olmalı; değilse "directed putaway" hatası. (Ürün bazında `putawayCache`.)

### Fark/Uyum
- **Legacy: stok-farkında + topoloji-farkında öneri** (mevcut stok rafı, boş yer, blok/sütun mesafesi, toplama-gözü ayrımı). OneGate: **saf kural eşleştirme** (ürün/grup → lokasyon/grup), priority sıralı. Mesafe/doluluk/toplama-gözü mantığı **yok**.
- Legacy lokasyon kodunun **karakter konumuna** (substring) ve harf→sayı haritasına gömülü; OneGate ilişkisel (grup linkleri). OneGate yaklaşımı daha temiz ama "en yakın boş raf" üretmez.
- Legacy kapasite kontrolünü öneri anında yapar; OneGate kapasiteyi ayrı `enforceCapacity` ile **posting anında** uygular (Akış 4).
- `LNGDISTKOD=8` gibi hard-code'lar müşteri-fork artığıdır → **kanonik mantığa dahil değil**.

### Dikkat (Claude Code için)
- OneGate putaway **öneri kümesi vs. izin kümesi** olarak çalışır: öneri varsa hedef o kümede olmak zorundadır (enforce). "Yumuşak öneri" değil sert kısıttır.
- Legacy'nin "en yakın boş raf / sütun mesafesi / toplama gözü" sezgiselleri OneGate'te **yoktur** → istenirse yeni özellik. Lokasyon kodunu parse etme (substring) desenini taşıma; ilişkisel grup modelini kullan.
- `suggestPutawayLocations` boş dönerse enforce devre dışı kalır (her hedef serbest) — bu kasıtlı.

---

## Akış 3 — Çıkış FEFO/FIFO + Toplama/Sepet

**SP'ler:** `SSP_SBCKFIFOLIFO`, `SSP_SBSEPETDAGIT_ORJ`, `SSP_SBTOPLAMAEMRIDETAY`, `SSP_SBHAZIRLANANMIKTAR`
**OneGate:** `sales.ts` → `allocateOrder` (FEFO) / `createPickOrder` / `shipAllocatedOrder` / `shipOrder`

### Legacy

**`SSP_SBCKFIFOLIFO`** (çıkış için uygun stok seçimi — dinamik SQL):
- `@BYTKONTROLTIPI` → operatör (1=FIFO `<` ASC, 2=LIFO `>` DESC, 5=`<`). Lokasyon **veya** lokasyon grubu (recursive CTE ile alt-ağaç) seç.
- Filtreler: malzeme, statü, **uygun = `DBLANAMIKTAR − DBLREZERVEMIKTAR > 0`**, batch/seri/po/poline/palet, müşteri (`FIFOEZILSIN='E'` ise rezerve müşterisi mantığı).
- **Raf ömrü** (`@LNGRAFOMRUSURESI` + `@LNGYUZDEDEGER`): kalan ömür yüzdesi eşiğin altındaysa eler. `@LNGTOLERANS` saat→gün (`@GUN`) dönüşümü ile kontrol-sahası tarihine tolerans ekler.
- **Onaylı sayım kontrolü** (`BYTONAYLISAYIMKONTROLU=1`): `TBLSBSAYIMFARKONAY` ile join; onaysız/farklı sayım kayıtlarını eler.
- Sonuç `#STOKLAR`'a; FEFO'ya uygun stok yoksa ve `FIFOEZILSIN<>'E'` → `RAISERROR('Fifoya uygun degil!')`. Sıralama kontrol sahasına göre ASC/DESC.

**`SSP_SBSEPETDAGIT_ORJ`** (sepet/araç dağıtımı — hacim tabanlı bin-packing):
- Plaka bazlı döner; belgeleri/detayları toplar (ürün grup + hacim). Dağıtım yönü (`H`/`R`/`L`) parametreye göre zorunlu olabilir.
- Araç tipi → sepet tipi → sepet sayısı (`#SEPETLER`); araç hacmi < belge hacmi → hata.
- **Çok-geçişli yerleştirme:** önce ürün grubu+yön uyan en dolu sepete, sonra üst-grup, sonra herhangi sepet; boşta kalan R ve L yönlü siparişler için ek geçişler; sığmayan detayları **bölerek** sepetlere dağıt (`DBLKALANMIKTAR` döngüsü).

**`SSP_SBTOPLAMAEMRIDETAY`** (toplama emri satırı üretimi):
- Dinamik rota başlık/detay + belge detayından, rampa hedef lokasyonu ile **malzeme bazında gruplanmış** toplama satırları üretir (`DBLTOPLANANMIKTAR=0`, `DBLHAZIRLANANMIKTAR=0` başlangıç). Hedef = rampa lokasyonu (`BYTRAMPA=1`).

**`SSP_SBHAZIRLANANMIKTAR`** (çift-sayım önleme):
- Verilen malzeme(ler) için, **bu belge(ler) HARİÇ**, onaylanmamış (`TRHONAYTARIHI IS NULL`) ve yükleme emrine bağlı belgelerdeki `DBLHAZIRLANANMIKTAR` toplamını döner → aynı stok iki kez toplanmasın.

### OneGate

**`allocateOrder(orderId)`** — FEFO rezerve (tek transaction):
- Yalnız `APPROVED` sipariş. Her satır için kalan = `quantity − shippedQty − allocatedQty`.
- Deponun ürün stoklarını **`expiryDate asc, id asc` (FEFO)** ile gez; her satırda `avail = mainQty − reservedQty`; `take = min(avail, remaining)` → `reservedQty += take`, `TBLSALESALLOCATION` kaydı, `allocatedQty += take`.
- Kalan > 0 → "yetersiz uygun stok" (rollback).

**`createPickOrder(orderId, userId)`** — toplama emri:
- `APPROVED` + ayrılmış sipariş → allocation'lardan PICK `TBLWORKORDER` üretir; her allocation = bir satır (kaynak lokasyon/statü/batch/seri/palet allocation'ın stoğundan). Hedef yok (stok hareketi sevkte). Aktif PICK varsa engeller.

**`shipAllocatedOrder` / `shipOrder`** — sevk → OUTBOUND belge → `completeDocument` (stok düşer) → satır `shippedQty++` → hepsi sevk edildiyse sipariş `COMPLETED` (bkz. Akış 1 posting). `shipAllocatedOrder` allocation'dan okur ve rezerveyi tüketir; `shipOrder` manuel kaynak alır.

### Fark/Uyum
- **Seçim kriteri:** Legacy FIFO/LIFO/raf-ömrü/onaylı-sayım **konfigüre edilebilir** (dinamik SQL). OneGate yalnız **FEFO** (`expiryDate asc`) — sabit; LIFO/FIFO-by-giriş-tarihi/raf-ömrü yüzdesi/onaylı-sayım filtresi **yok**.
- **Sepet/araç dağıtımı (`SEPETDAGIT`)** OneGate'te **tamamen yok** — hacim tabanlı bin-packing, dağıtım yönü, araç/sepet tipleri modellenmemiş (logistics modülü gevşek bağlı). ⚠️ DOĞRULANMALI: logistics şemasında kısmi karşılık olabilir, ama bu SP'nin paketleme mantığı yoktur.
- **İki-aşamalı miktar** (`DBLTOPLANANMIKTAR` / `DBLHAZIRLANANMIKTAR` / fire) OneGate'te kayboldu (VERI-MODELI §18.7). `HAZIRLANANMIKTAR`'ın çift-toplama önleme rolü OneGate'te **allocation+reservedQty** ile sağlanır (farklı mekanizma, aynı amaç).
- **Toplama emri:** Legacy malzeme bazında gruplar (rota+rampa). OneGate allocation bazında satır üretir (lokasyon/parti/palet kırılımı korunur) — OneGate daha granüler ve izlenebilir.

### Dikkat (Claude Code için)
- OneGate sevk zinciri: **approve → allocate (FEFO) → (opsiyonel pick order) → shipAllocatedOrder**. Rezerve `allocate`'te alınır, `ship`'te tüketilir. Manuel sevk için `shipOrder` ayrı yol.
- LIFO / raf-ömrü-yüzde / onaylı-sayım filtresi gerekirse `allocateOrder`'ın `orderBy`'ı ve `where`'i genişletilmeli (legacy `CKFIFOLIFO` parametreleri referans).
- `SEPETDAGIT` çok karmaşık ve müşteri-özel kokuyor; **birebir port etme** — gerekirse hacim/araç/sepet modeli önce tasarlanmalı.

---

## Akış 4 — Kapasite kontrol

**SP'ler:** `SSP_SBLOKASYONKAPASITEKONTROL`, `SSP_SBKAPASITEORAN`
**OneGate:** `movement.ts` → `enforceCapacity`

### Legacy

**`SSP_SBLOKASYONKAPASITEKONTROL`** (giriş öncesi tek-lokasyon kontrolü):
- İki mod:
  - **Palet-adedi modu** (`@DBLPALETMIKTAR>0`): lokasyondaki **distinct palet sayısı** + açık kapsam paleti + 1 (okutulan) ≤ palet kapasitesi + tolerans.
  - **Miktar modu**: `stok miktarı + açık kapsam miktarı + okutulan ≤ kapasite + tolerans`. `@BYTTUMMALZEMELER=0` → sadece o malzeme; `=1` → tüm malzemeler.
- "Açık kapsam" = onaylanmamış belgelerin (`TRHONAYTARIHI IS NULL`) o lokasyona yönelik rezerve ettiği miktar/palet (gelecekteki dolum).
- Uygunsa `SELECT 'TRUE' AS KAPASITEUYGUN`.

**`SSP_SBKAPASITEORAN`** (doluluk raporu):
- Üst lokasyon altındaki alt-lokasyonlarda recursive CTE + cursor ile **doluluk oranı %** hesaplar (stok / kapasite × 100), kullanıcı yetki (dist) filtreli. Raporlama amaçlı; posting'i bloklamaz.

### OneGate

**`enforceCapacity(tx, companyId, locationId, productId, incomingQty, lineNo)`** — INBOUND/INTERNAL hedefe giriş öncesi:
- Ürünün grup id'sini ve hedef lokasyonun gruplarını al.
- `TBLLOCATIONCAPACITY` (aktif, `quantity != null`) kuralları: lokasyon-eşleşme (`LOCATION` = lokasyon id veya `LOCATION_GROUP` = lokasyon grupları) **AND** malzeme-eşleşme (`materialLinkType null` = tümü / `PRODUCT` / `PRODUCT_GROUP`).
- Her kural için mevcut yük = `TBLSTOCK` toplamı (malzeme kapsamına göre filtreli); `current + incomingQty > quantity` ise: `messageType=ERROR` → hata fırlat, `WARNING` → izin ver.

### Fark/Uyum
- **Açık kapsam (in-transit/planlı dolum) OneGate'te HESABA KATILMAZ** — sadece mevcut fiili stok. Legacy onaylanmamış belgelerin rezervini de sayar → **OneGate kapasiteyi olduğundan boş görebilir** (eşzamanlı planlı girişlerde over-allocation riski). ⚠️ Önemli davranış farkı.
- **Palet-adedi kapasitesi** OneGate'te yok; yalnız **miktar** kapasitesi (`quantity`). Legacy'nin `DBLPALETMIKTAR` modu modellenmemiş.
- OneGate'in `WARNING` vs `ERROR` (`messageType`) ayrımı legacy'de yok (legacy ya uygun ya değil).
- **Tolerans:** legacy `@DBLTOLERANSMIKTAR` eklerken OneGate kapasite kuralında ayrı tolerans alanı yok (tolerans Akış 5'te ayrı, miktar-referans toleransı için).
- `KAPASITEORAN` (doluluk %) OneGate'te yok → rapor motoru (`reportBuilder`) ile yapılabilir ama hazır değil. ⚠️ DOĞRULANMALI.

### Dikkat (Claude Code için)
- `enforceCapacity` **yalnız fiili stoğa** bakar. Eşzamanlı planlı girişlerde legacy'deki "açık kapsam" güvenliği yoktur — istenirse CONFIRMED/DRAFT belgelerin hedef miktarlarını da toplamaya eklemek gerekir.
- Palet-adedi limiti gerekiyorsa `TBLLOCATIONCAPACITY`'ye palet-sayısı alanı + ayrı kontrol eklenmeli.

---

## Akış 5 — Tolerans + Stok kontrol

**SP'ler:** `SSP_SBDETAYTOLERANS`, `SSP_SBSTOKKONTROLU`, `SSP_SBBELGEPLANLAMA`
**OneGate:** `movement.ts` tolerans bloğu + `adjustStock` (stok kontrol) + `stock.ts`

### Legacy

**`SSP_SBDETAYTOLERANS`** (belge detayını referansla göster):
- Belge no + dist + malzeme + (opsiyonel) detay → belge satırını **kaynak/hedef statü tanımları, işlem miktarı, birim** ile döndürür. Sıralama: kalan miktar > 0 olanlar önce. Aslında tolerans değerini hesaplamaz; tolerans karşılaştırması için **veri hazırlar** (UI/üst katman karşılaştırır). ⚠️ DOĞRULANMALI: tolerans bandı asıl başka katmanda uygulanıyor olabilir.

**`SSP_SBSTOKKONTROLU`** (terminal okutma — adım-adım eleme):
- Müşteri/malzeme/statü/palet/batch/seri/lokasyon/miktar/rezerve-belge/po/poline kriterlerini **sırayla** `#TEMP`'e uygular; her adımda sonuç 0'a düşerse o adıma özel **MSGNO** döner (1=malzeme yok, 2=statü yok, 3=palet yok, 4=batch, 5=seri, 6=miktar yetersiz [+okutulan belge/palet bildirimi], 7=lokasyon, 8=rezerveli, 9=rezerve tip, 10=po, 11=poline, 12=müşteri). El terminalinde "neden okutamadın" mesajı için.

**`SSP_SBBELGEPLANLAMA`** (planlama görünümü):
- Belge satırlarını ürün/grup/birim + parça alanları + ek sahalar + (NULL) stok miktarı ile döndürür — planlama ekranı için düz veri. İş mantığı yok.

### OneGate

**Tolerans bloğu** (`completeDocument`, satır başına):
- `TBLOPERATIONTYPETOLERANCE` (aktif) içinden cari+malzeme kapsamı eşleşen kural; satırda `referenceQty != null` ise:
  - izin = `referenceQty.abs() × tolerancePercent/100`, ve `toleranceQty` daha büyükse onu kullan.
  - `|quantity − referenceQty| > izin` → "tolerans dışında" hatası.

**Stok kontrol** = `adjustStock` (Akış 1): çıkışta yetersizse "Yetersiz stok" / "Stok bulunamadı". Terminal-tarzı adım-adım eleme yok; tek negatif kontrol.

**`stock.ts`** → `reserveStock` / `releaseStock`: uygun = `mainQty − reservedQty`; yetersizse hata; serbest bırakırken 0 altına inmez.

### Fark/Uyum
- **Tolerans:** OneGate **deklaratif kural** (yüzde + mutlak, cari/malzeme scope, posting'te enforce). Legacy `DETAYTOLERANS` sadece veriyi hazırlar; karşılaştırma üst katmanda → OneGate daha bütünleşik.
- **Stok kontrol mesajları:** Legacy 12 ayrı `MSGNO` ile granüler "neden yok" geri bildirimi verir; OneGate tek genel "Yetersiz/Bulunamadı" mesajı → **terminal UX detayı OneGate'te yok**.
- `BELGEPLANLAMA` / `DETAYTOLERANS`'ın "düz veri döndür" rolü OneGate'te REST endpoint + frontend ile karşılanır (SP değil).

### Dikkat (Claude Code için)
- Tolerans için `referenceQty` satırda **dolu olmalı**; yoksa kontrol atlanır. Legacy'de referans = `TRHTESLIMTARIHI`'li sipariş miktarı; OneGate'te `referenceQty` alanını besleyen akış (PO/SO bağı) doğru doldurulmalı.
- El terminali için granüler stok-yok kodları gerekiyorsa `adjustStock` öncesi ayrı bir "neden bulunamadı" tanılama fonksiyonu yazılmalı (legacy `STOKKONTROLU` adımları referans).

---

## Akış 6 — Sayım

**SP:** `SSP_SBPPCKONTROLLUSAYIM`
**OneGate:** `counting.ts` → `createCount` / `setCounted` / `completeCount` / `cancelCount` / `reverseEqualize` / `countDifferences`

### Legacy

**`SSP_SBPPCKONTROLLUSAYIM`** (kontrollü sayım farkı — dinamik SQL):
- Sevk belgesi detayını (malzeme × işlem miktarı = `DBLSEVKIYATMIKTAR`) ile **kontrol-sayım** (`TBLSBKONTROLSAYIMBASLIK/DETAY`) sayılan miktarını join eder.
- `@TXTREFBELGEKOD` varsa ref-belge üzerinden, yoksa belge kodu üzerinden eşler. Çıktı: ürün, sevkiyat miktarı, **sayılan miktar**, **fark = sevkiyat − sayılan**.
- Yani: sevk öncesi/PPC bağlamında belge ile fiziki sayımı karşılaştıran **fark raporu**. Stok düzeltmesi yapmaz (rapor).

### OneGate

**`createCount(companyId, warehouseId, countNo, userId, opts)`**: deponun mevcut `TBLSTOCK` satırlarını **snapshot** alıp her birine sayım satırı (`systemQty`) açar. Kapsam: opsiyonel `locationId` / `productId` filtresi; `countType`. Statü `DRAFT`. Sayım no çakışması → hata.

**`setCounted(countId, lineId, countedQty)`**: satıra sayılan yaz; ilk yazımda `DRAFT → COUNTING`. Kapalı (COMPLETED/CANCELLED) sayım reddedilir.

**`completeCount(countId, now)`** (tek transaction): aktif zorunlu kriter (`TBLCOUNTCRITERIA.required`) varsa sayılmamış satır kalmışsa engelle; `countedQty ≠ systemQty` olan satırlarda **stok `mainQty`'yi sayılan değere çeker** (stok düzeltme!). `COMPLETED` + sayısı döner.

**`reverseEqualize(id)`**: tamamlanmış sayımın stok düzeltmelerini geri al (`mainQty → systemQty`), sayımı `CANCELLED` yap.

**`countDifferences(companyId, onlyCompleted)`**: `countedQty ≠ systemQty` satırları (ürün/lokasyon kodlarıyla zenginleştirilmiş) → fark raporu.

### Fark/Uyum
- **Asıl model farkı:** Legacy `PPCKONTROLLUSAYIM` **belge (sevkiyat) ↔ sayım farkı** raporudur ve **stok GÜNCELLEMEZ**. OneGate sayımı **fiziksel stok sayımı + eşitleme** akışıdır (`completeCount` stok `mainQty`'yi sayılan değere çeker). → İki farklı amaç; tam örtüşmez. ⚠️ DOĞRULANMALI: legacy'de stok eşitlemesini başka bir SP (`SAYIMFARKONAY` / eşitleme) yapıyor olabilir; bu SP yalnız PPC fark görünümü.
- OneGate'in **systemQty snapshot + reverse-equalize** modeli legacy'de doğrudan görünmüyor (legacy fark onay + `TBLSBSAYIMFARKONAY` tabanlı, `CKFIFOLIFO`'da onaylı-sayım filtresi olarak da kullanılıyor — Akış 3).
- OneGate sayımı bağımsız (belgeye bağlı değil); legacy PPC sayımı sevk belgesine bağlı.

### Dikkat (Claude Code için)
- OneGate'te **`completeCount` doğrudan stoğu değiştirir** — geri almak için `reverseEqualize` var. Bu bir stok hareketi belgesi ÜRETMEZ (movement engine devre dışı) → ledger/audit izi yine yok (VERI-MODELI §18.6).
- Legacy'nin "onaylı sayım" filtresinin sevk akışını (`CKFIFOLIFO`) etkilediğini unutma; OneGate'te sayım sevk seçimini etkilemez.
- Belge-bazlı PPC fark raporu (sevk vs sayılan) gerekirse bu **yeni** bir rapordur; `countDifferences` stok-bazlıdır, belge-bazlı değil.

---

## Akış 7 — İş Emri

**SP:** `SSP_SBISEMRIBELGEHAZIRLA`
**OneGate:** `workOrder.ts` → `assignWorkOrder` / `startWorkOrder` / `reportLine` / `completeWorkOrder` / `cancelWorkOrder`

### Legacy

**`SSP_SBISEMRIBELGEHAZIRLA`** (sevkiyat iş emri = stok→rampa/elleçleme atama):
1. Ön kontrol: seçilen belgeler için zaten iş emri var mı (`BYTONAYASAMA<>0`) → hata; nakliyeci bilgisi (`_nakliyeci_bilgileri`) eksikse → hata.
2. **Drop point** listesi (`RL`/`EL` grupları = rampa/elleçleme) + her drop'un mevcut yük sayısı.
3. Belge detaylarını topla (`#BUTUNDETAYLAR`): malzeme × miktar × sefer × cari × max-palet-ağırlığı × kargo-parsiyel bayrağı.
4. **Tam palet hesabı:** her ihtiyaç için `SSP_SBISEMRIONERI` (öneri) çağır → tam palete eşit stokları rampaya ata, kullanılan stokları işaretle (`#KULLANILANSTOKLAR`), ihtiyaçtan düş.
5. **Elleçleme:** kalan ihtiyaç için (ZT36 op'unda elleçleme stoğunu önce düş) öneri listesinden FEFO-benzeri (`TRHURETIMTARIHI ASC`) palet ata.
6. Yetersiz stok → detaylı `RAISERROR` (eksik ürün listesi). Sonuç: kaynak lokasyon → hedef drop (rampa/elleçleme) ataması.

### OneGate

**`completeWorkOrder(id, userId, now)`** (köprü → movement engine):
- Yalnız `IN_PROGRESS`. Hareket üretecek satırlar: `type != COUNT` ve `collectedQty > 0` ve kaynak+hedef lokasyon/statü dolu.
- Bu satırlardan **INTERNAL** belge (`direction='INTERNAL'` op'u) oluştur → `completeDocument` (stok hareketi). Hata → belgeyi temizle, iş emri `IN_PROGRESS` kalır (`WorkOrderError`).
- İş emrini `COMPLETED` + `endDate`; üretilen belge id'sini döner.

Yaşam döngüsü: `assignWorkOrder` (kapalı değilse ata) → `startWorkOrder` (PLANNED→IN_PROGRESS, atanmış olmalı) → `reportLine` (IN_PROGRESS'te `collectedQty` yaz) → `completeWorkOrder`. PICK iş emri ayrıca `sales.createPickOrder` ile üretilir (Akış 3).

### Fark/Uyum
- **Legacy: planlama/atama ZEKASI** (tam palet + elleçleme + rampa drop seçimi + nakliyeci + kargo parsiyel + öneri SP entegrasyonu). OneGate: iş emri **manuel doldurulan** kaynak/hedef satırlardan ibaret; **stok→rampa otomatik atama yok**. Atama akıllılığı OneGate'te yok.
- **Köprü:** OneGate iş emri tamamlanınca **gerçek INTERNAL stok hareketi** üretir (movement engine üzerinden, tüm enforce'larla). Legacy `ISEMRIBELGEHAZIRLA` öneri/atama üretir; stok hareketini ayrı belge onayı yapar.
- OneGate iş emri tipleri: PICK / COUNT / INTERNAL-hareket. Legacy bu SP sevkiyat-toplama odaklı (rampa/elleçleme).
- Nakliyeci/sefer/kargo-parsiyel/elleçleme alanları OneGate iş emri modelinde **yok** (logistics gevşek bağlı).

### Dikkat (Claude Code için)
- OneGate `completeWorkOrder` **COUNT tipini hareket dışı** tutar; PICK/INTERNAL için kaynak+hedef dolu satırlar hareket eder. Hata olursa iş emri açık kalır (yarım belge silinir) — idempotent yeniden deneme güvenli.
- Legacy'nin tam-palet/elleçleme/drop-point atama zekâsı **yeni geliştirme**dir; `routing.suggestPutawayLocations` bir başlangıç ama rampa/sefer/ağırlık mantığı içermez.
- `INTERNAL` op tipi (`TR` vb.) tanımlı olmalı; yoksa `completeWorkOrder` hata verir.

---

## Akış 8 — Kalite (serbest geçiş / muayene)

**SP:** `SSP_SBKLTSERBESTGECISKONTROL`
**OneGate:** `quality.ts` → `decideInspection`

### Legacy

**`SSP_SBKLTSERBESTGECISKONTROL`** (kaliteyi atlayabilen satırları seç):
- Operasyon belgesinin giriş satırlarını (ürün × batch × statü) cursor ile döner.
- Her ürün için `TBLSBKLTSERBESTGECISTANIM`'da **cari + malzeme kapsamı** (99=hepsi / 0=belirli / >0=grup) eşleşen "serbest geçiş" tanımı var mı sayar (`@SAYAC`).
- Eşleşenler `@SERBESTGECIS`'e; sonunda bu satırları **kalite op-tipi** (`TBLSBKLTPARAMETRE.LNGOKOPERASYONTIPKOD`) ile bir sonraki harekete hazır olarak döndürür. Yani "bu ürün/cari kombinasyonu kaliteden muaf, doğrudan serbest geçsin".

### OneGate

**`decideInspection(id, pass, userId, now)`** (muayene → statü geçişi):
- `PENDING` muayene → hedef statü: `pass` ? `AVAILABLE` : `BLOCKED`.
- Hedef ≠ mevcut statü ise **INTERNAL belge** (aynı lokasyon, kaynak statü → hedef statü) + `completeDocument` → stok kaynak statüden hedefe taşınır (yetersizse `QualityError`). Muayene sonucu `PASSED`/`FAILED` + denetçi/tarih yazılır.
- Mal kabulde kalite: `operationType.qualityControl` → INBOUND hedef **KARANTİNA**'ya zorlanır (movement.ts; SISTEM-HARITASI §10.1).

### Fark/Uyum
- **Yön farkı:** Legacy "serbest geçiş" = **kaliteyi ATLATMA kuralı** (muaf ürün/cari → doğrudan geç). OneGate `decideInspection` = **muayene SONUCUNU uygulama** (PASS→AVAILABLE, FAIL→BLOCKED statü hareketi). İkisi kalite akışının farklı uçları:
  - Legacy: "kim muayeneye girmesin?" (ön eleme).
  - OneGate: "muayene bittiğinde stok nereye gitsin?" (sonuç uygulama).
- OneGate'te legacy'nin **kapsam-bazlı kalite muafiyeti** (serbest geçiş tanımı tablosu) **yok** ⚠️ DOĞRULANMALI — `qualityControl` bayrağı operasyon tipinde açık/kapalı (tüm-veya-hiç), ürün/cari bazlı muafiyet kuralı modellenmemiş.
- OneGate kalite = gerçek stok statü hareketi (movement engine, ledger izi yok §18.6). Legacy serbest geçiş yalnız satır seçer; hareketi başka op yapar.

### Dikkat (Claude Code için)
- OneGate'te kalite muafiyeti **operasyon tipi seviyesinde** (`qualityControl` on/off). Ürün/cari bazlı "serbest geçiş" gerekirse legacy `KLTSERBESTGECISTANIM` benzeri kapsam-tablosu + INBOUND'da kontrol eklenmeli.
- `decideInspection` hedef statü kodları (`AVAILABLE`/`BLOCKED`/`KARANTİNA`) firma bazında tanımlı olmalı; yoksa hata.

---

## Akış 9 — Enforce kuralları özeti (OneGate davranış kuralları ↔ legacy karşılığı)

`movement.ts` → `completeDocument` posting'i öncesi uygulanan **konsolide davranış kuralları** ve her birinin legacy SP/tablo karşılığı. (OneGate'te hepsi tek transaction'da, config-driven; legacy'de SP'lere/parametrelere dağılmış.)

| # | OneGate kuralı (movement.ts) | Tetikleyen config | Legacy karşılığı (SP / mekanizma) |
|---|---|---|---|
| 1 | **Neden zorunlu** (reasonRequired → reasonId şart; izinli neden listesi) | `OPERATIONTYPE.reasonRequired`, `TBLOPERATIONTYPEREASON` | Operasyon tipi neden bayrağı + `TBLSBOPERASYONNEDEN*` (SP'lerde `LNGOPERASYONNEDENKOD`) |
| 2 | **Statü geçişi** (op-tanımlı kaynak/hedef statü kombinasyonu) | `TBLOPERATIONTYPESTATUS` | `BELGEHAREKET` içinde statü; `DETAYTOLERANS` kaynak/hedef statü gösterir |
| 3 | **İzinli palet tipi** (satır palet tipi op'a bağlı listede olmalı) | `TBLOPERATIONTYPEPALLETTYPE` | `TBLSBOPERASYONTIPIPALETTIPI` (`BELGEHAREKET` palet yaratırken kullanır) |
| 4 | **Yasaklı ürün** (cari+malzeme kapsamı eşleşirse bloke) | `TBLOPERATIONTYPEFORBIDDENPRODUCT` | ⚠️ DOĞRULANMALI — net SP yok; muhtemelen op-parametre/kapsam kontrolü |
| 5 | **Lokasyon kapsamı** (kaynak/hedef izinli liste) | `TBLOPERATIONTYPELOCATION` | `TBLSBOPERASYONTIPILOKASYON` (`HAZIRLANANMIKTAR`'da görülür); `YONLENDIRMEKONTROL` |
| 6 | **Giriş/Çıkış koşulları** (batch/seri/neden/kontrol-saha/raf-ömrü; kırma şifresi+neden ile log'lu geç) | `TBLENTRY/EXITCONDITIONTYPEOPERATION` + `...PARAMETER` + `...BREAKPASSWORD` + `TBLCONDITIONBREAKLOG` | `TBLSBGIRIS/CIKISKOSUL*`; raf-ömrü `CKFIFOLIFO`; kırma şifresi legacy'de var, **kırma LOG'u (`TBLCONDITIONBREAKLOG`) bizim eklediğimiz** (VERI-MODELI §10) |
| 7 | **Directed putaway** (hedef, önerilen lokasyon kümesinde olmalı) | `TBLROUTINGRULE` (+ `routing.ts`) | `MALKABULYONLENDIRME_ANA`, `YONLENDIRMEKONTROL_ORIJINAL` (Akış 2) |
| 8 | **Lokasyon kapasite** (mevcut+gelen > limit → ERROR/WARNING) | `TBLLOCATIONCAPACITY` (+ `enforceCapacity`) | `LOKASYONKAPASITEKONTROL` (Akış 4) — legacy açık-kapsamı da sayar |
| 9 | **Tolerans** (referenceQty'ye göre ± yüzde/mutlak bant) | `TBLOPERATIONTYPETOLERANCE` | `DETAYTOLERANS` (veri hazırlar; karşılaştırma üst katman) — Akış 5 |
| 10 | **Pasif ürün** (passiveProductUse=false ise pasif ürün hareket edemez) | `OPERATIONTYPE.passiveProductUse`, `PRODUCT.isActive` | Legacy `BYTARSIV`/aktiflik bayrağı (OneGate soft-delete yok, `isActive` — §18.5) |
| 11 | **Batch/seri zorunlu + seri=1 + seri tekrar + sameUsePallet/sameUseSerial** | `PRODUCTUNIT.batchTracking/serialTracking`, `OPERATIONTYPE.batchAssignment/sameUseSerial/sameUsePallet` | Lot/seri legacy stok anahtarında; `BYTPARCALIKULLANIM` (`BELGEHAREKET`); otomatik batch atama OneGate'e özgü |

**Ek (posting çekirdeği, kural değil):** `adjustStock` yetersiz-stok / stok-bulunamadı / rezerve-kırpma (Akış 1, SISTEM-HARITASI §10).

---

## Özet — Genel desen ve en kritik farklar

1. **Satır yön modeli (Akış 1):** Legacy `BYTGIRISCIKIS` tek-yönlü + view ile birleştirme ↔ OneGate KAYNAK→HEDEF tek satır. Tüm akışların altında yatan en temel fark.
2. **Doğrulama mimarisi (Akış 9):** Legacy mantık SP'lere/parametrelere dağılmış ↔ OneGate `completeDocument` içinde **konsolide, declarative, tek transaction**. OneGate'in en güçlü tarafı.
3. **Üç büyük boşluk (OneGate'te YOK):**
   - **Palet yaşam döngüsü + `TBLSBPALETTARIHCE` ledger** (Akış 1) — VERI-MODELI §18.6.
   - **Kalıcı stok/belge hareket ledger (`TBLSBLOGBELGE`)** — sayım/kalite/iş-emri stok değişiklikleri de iz bırakmıyor.
   - **Sepet/araç dağıtımı (`SEPETDAGIT`) ve iş-emri atama zekâsı (`ISEMRIBELGEHAZIRLA`)** (Akış 3, 7) — lojistik/planlama otomasyonu.
4. **Seçim/kapasite incelikleri:**
   - FEFO sabit; **LIFO/raf-ömrü-%/onaylı-sayım filtresi yok** (Akış 3, legacy `CKFIFOLIFO`).
   - Kapasite **açık kapsamı (planlı dolum) saymıyor** + **palet-adedi limiti yok** (Akış 4).
5. **Amaç kayması (dikkat):**
   - Sayım: legacy `PPCKONTROLLUSAYIM` = belge↔sayım fark raporu (stok değişmez) ↔ OneGate = fiziksel sayım + stok eşitleme (Akış 6).
   - Kalite: legacy `KLTSERBESTGECIS` = muafiyet ön-eleme ↔ OneGate `decideInspection` = muayene sonucu statü hareketi (Akış 8).
6. **OneGate'in eklediği değer:** kırma denetim izi (`TBLCONDITIONBREAKLOG`), otomatik batch atama, RBAC, kapasite ERROR/WARNING ayrımı, kalite = gerçek statü hareketi, iş-emri → movement engine köprüsü.

### Doğrulanması gereken noktalar (⚠️)
- **Akış 1:** `BYTPARCALIKULLANIM` ↔ `sameUsePallet`/`sameUseSerial` eşlemesi (legacy tek bayrak, OneGate iki).
- **Akış 3:** logistics şemasında sepet/araç dağıtımının kısmî karşılığı olup olmadığı.
- **Akış 4:** doluluk oranı raporunun (`KAPASITEORAN`) rapor motoruyla karşılanabilirliği.
- **Akış 5:** tolerans bandının asıl nerede uygulandığı (legacy `DETAYTOLERANS` yalnız veri mi hazırlıyor).
- **Akış 6:** legacy stok eşitlemesini `PPCKONTROLLUSAYIM`'ın mı yoksa `SAYIMFARKONAY` tabanlı başka SP'nin mi yaptığı.
- **Akış 8:** kapsam-bazlı kalite muafiyetinin (serbest geçiş tanımı) OneGate'te gerçekten olmadığı.
- **Akış 9 / kural 4:** yasaklı ürünün legacy'de hangi SP/parametre ile uygulandığı (net SP bulunamadı).
- `SSP_SBISEMRIONERI` (legacy iş-emri öneri alt-SP'si) ve `SSP_SBSTOKHAREKETI_TRANSFER` (asıl stok güncelleme alt-SP'si) bu klasörde **yok** — davranışları çağıran SP'lerden çıkarıldı, doğrudan okunamadı.
