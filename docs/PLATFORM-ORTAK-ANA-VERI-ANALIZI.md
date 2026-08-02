# Ortak Ana Veri: Ürün ve Cari Nasıl Paylaşılmalı? (Analiz — 2026-08-02)

İki ürünü (OneGate WMS + OneGate Procurement) birlikte kullanan bir firmada ürün ve cari kartlarının nasıl paylaşılacağı, kapsamın firma mı tesis mi olacağı sorusunun analizi. **Bu bir karar dokümanıdır; uygulama yapılmadı.**

## 1. Bugünkü durum (canlı veriden)

| Ölçüm | Değer | Yorum |
|---|---|---|
| Ürün (TBLPRODUCT) | **209** | Tek tablo, `companyId + code` tekil |
| — satınalma profili olan | **187** | 4Proc'tan taşınanlar (`TBLPRODUCTPROCPROFILE`) |
| — profili olmayan | **22** | WMS'te açılmış kalemler |
| — stok kaydı olan | 7 | Gerçekten depoda duran |
| — WMS belgesinde geçen | 10 | |
| — satınalma siparişinde geçen | 3 | |
| Cari (TBLBUSINESSPARTNER) | 27 SUPPLIER · 6 CUSTOMER · **2 BOTH** | |
| — Procurement'ta görünen | **27** | 🔴 BOTH tipi 2 cari **görünmüyor** |
| Tesis | 3 (K-FAC · Tesis02 · **HQ**) | |
| Ürün–tesis bağı | **0** | Tablo var (`TBLPRODUCTFACILITY`), kullanılmıyor |
| Cari–tesis bağı | **0** | Tablo var (`TBLPARTNERFACILITY`), kullanılmıyor |

**Anlamı:** bugün her ürün ve her tedarikçi, her tesiste, her iki üründe görünüyor. 209 kalemde sorun değil; 10 binlerde her iki tarafta da gürültü olur.

---

## 2. Soru 1 — Ürünü nasıl "ortak" gösterelim?

Ürün tablosu zaten tek. Asıl soru **her ürün her iki üründe de görünmeli mi?** Cevap hayır: kesişim büyük ama eşit değil.

- WMS'in umursadığı: stoklanan, barkodlu, raf ömürlü **fiziksel** kalem.
- Procurement'ın umursadığı: **satın alınabilen** kalem — danışmanlık, kira, bakım gibi hiç stoklanmayanlar dahil (`ProductType.SERVICE` zaten var).
- Ambalaj/palet gibi kalemler WMS'te kritik, satınalma aramalarında gürültü. Hizmet kalemleri ise WMS ürün listesinde anlamsız.

### Seçenekler

| | Yaklaşım | Artı | Eksi |
|---|---|---|---|
| S1 | **Filtre yok** (bugünkü) | Sıfır iş | Her iki tarafta gürültü; kullanıcı yanlış kalemi seçer |
| S2 | **Kullanım görünümü** (önerilen) | Ürün kartı ortak; her ürün kullanılacağı üründe "açılır". Satınalma görünümü = `TBLPRODUCTPROCPROFILE` satırı (**zaten var, 187 kayıt**) | Depo görünümü için karşılık gerekiyor |
| S3 | **Ürün tipine göre kural** | Basit (Hammadde→satınalma, Ambalaj→ikisi, Hizmet→yalnız satınalma) | Katı; istisna yönetimi zor |

### Öneri: S2, S3 ile doldurulmuş

1. **Satınalma görünümü** = `procurement.TBLPRODUCTPROCPROFILE` satırının varlığı. Yeni kolon gerekmez; SAP'deki "malzemeyi satınalma görünümüne genişletme" mantığının aynısı.
2. **Depo görünümü** = `TBLPRODUCTFACILITY` satırının varlığı (tablo hazır, boş). **Kural: satır yoksa "tüm tesislerde geçerli"** — OneGate'in kısıtlama-listesi deseni; böylece bugünkü davranış hiç bozulmaz.
3. İlk doldurma **ürün tipine göre toplu** yapılır (S3), sonra istisnalar elle düzenlenir.
4. Her iki üründe listeler varsayılan olarak **kendi görünümünü** gösterir; "Tümünü göster" anahtarı kalır (arama yaparken kayıp hissi olmasın).

### Kod tekilliği ve sahiplik (kritik)
Kod alanı tek (`companyId + code`). İki taraftan da ürün açılabildiği için **aynı fiziksel ürüne iki farklı kod** açılması gerçek risk. Öneri:
- Yeni malzeme açarken **önce mevcut ürünü arat** (kod / ad / üretici parça no) — 4Proc "yeni malzeme" ekranına zorunlu adım.
- Kod üretimi tek yerden (mevcut `TBLSEQUENCE` sayaç motoru).
- Kim açarsa açsın kart anında diğer üründe görünür (aynı tablo) — bu zaten çalışıyor.

---

## 3. Soru 2 — "Tedarikçi" ve "Hepsi" tipindeki carileri Procurement nasıl değerlendirmeli?

### 🔴 Bulgu: bugün eksik çalışıyor
Uyumluluk view'ı `type = 'SUPPLIER'` filtreliyor. `BOTH` ("hepsi") tipindeki **2 cari Procurement'ta hiç görünmüyor** — hem müşterisi hem tedarikçisi olan firmalar (fason, takas, grup içi ticaret) tam da kurumsal hayatta en sık karşılaşılan durum.

### Önerilen kural
| Ekran | Görünen tipler |
|---|---|
| Procurement — Tedarikçiler | `SUPPLIER` + **`BOTH`** |
| WMS/Satış — Müşteriler | `CUSTOMER` + **`BOTH`** |

**Rol yükseltme kuralı:** Procurement'ta yeni tedarikçi eklenirken aynı kod `CUSTOMER` olarak varsa → **yeni kayıt açma, tipi `BOTH`'a yükselt**. Tersi de geçerli (WMS'te müşteri eklenirken `SUPPLIER` varsa → `BOTH`). Böylece tek cari kartı, iki rol; bakiye/iletişim/vergi bilgisi tek yerde kalır.

**Ek alanlar:** tedarikçiye özgü bilgiler (banka, ödeme koşulu, risk skoru, onboarding) zaten `TBLPARTNERPROCPROFILE`'da — `BOTH` cari için de aynı şekilde çalışır, çekirdek kart kirlenmez.

---

## 4. Soru 3 — Firma bazlı mı, tesis bazlı mı?

**Cevap: ikisi de — ama farklı katmanlarda.** Tek eksen seçmek her iki yönde de yanlış:
- Yalnız firma → çok tesisli müşteride her tesis birbirinin ürününü/tedarikçisini görür, seçim listeleri şişer.
- Yalnız tesis → aynı ürün her tesiste ayrı kart olur; kod karmaşası, raporlar toplanamaz.

| Katman | Eksen | Gerekçe |
|---|---|---|
| **Kimlik** (ürün kodu, cari kodu, birim, para birimi) | **FİRMA** | Aynı ürün iki tesiste iki kart olmamalı. Mevcut `companyId + code` tekilliği doğru — değişmemeli |
| **Kullanım / yetki** (hangi tesiste seçilebilir) | **TESİS** | `TBLPRODUCTFACILITY` · `TBLPARTNERFACILITY` (hazır, boş). Kural: **satır yok = tüm tesisler** |
| **İşlem** (belge, sipariş, stok, mal kabul) | **TESİS** | WMS belgeleri zaten tesis eksenli; 4Proc `Order.OrganizationId` = tesis |
| **Lisans / erişim** | **FİRMA** (+ kullanıcı kısıtı) | `TBLCOMPANYLICENSE` mevcut |
| **Fiyat / koşul** (sözleşme, ratecard) | **FİRMA**, istisnası tesis | Anlaşmalar firma geneli yapılır; tesise özel fiyat istisnadır |

**Kullanıcı yetkisi zaten tesis eksenli** (`TBLUSERAUTHORIZATION` FACILITY kapsamı) — yani ürün/cari tesis bağı kurulunca yetki motoruyla doğal olarak birleşir.

---

## 5. Yan bulgu — tesis uçurumu (köprü fazının ön koşulu)

27 satınalma siparişinin **tamamı HQ (id 46)** tesisinde; WMS operasyonu **K-FAC (39)**'ta yürüyor. "Onaylı sipariş → otomatik mal kabul belgesi" köprüsü kurulduğunda sipariş bir tesiste, mal kabul başka tesiste olacak.

Çözüm seçenekleri:
1. Sipariş satırındaki **teslim yeri** alanını kullan (4Proc'ta `GRLocationId` / `WareHouseId` var, `TBLLOCATION`/`TBLWAREHOUSE`'a eşlendi) → mal kabul o tesiste doğar. **Önerilen.**
2. Organization→Facility eşlemesini gözden geçir (HQ gerçekten ayrı bir tesis mi, yoksa idari birim mi?).

Bu netleşmeden PO→mal kabul köprüsü yazılmamalı.

---

## 6. Önerilen paket (uygulama sırası)

| # | İş | Etki | Emek |
|---|---|---|---|
| 1 | Cari view'ını `SUPPLIER + BOTH`'a aç | 🔴 Bugün eksik olan davranış düzelir | Küçük |
| 2 | Rol yükseltme kuralı (aynı kod → `BOTH`) | Mükerrer cari önlenir | Orta |
| 3 | Ürün "kullanım görünümü" filtresi + "Tümünü göster" anahtarı | Her iki tarafta gürültü biter | Orta |
| 4 | Tip bazlı toplu görünüm doldurma (tek seferlik) | 209 kalem doğru sınıflanır | Küçük |
| 5 | Ürün/cari tesis bağı ekranı (boş = tüm tesisler) | Çok tesisli müşteriye hazırlık | Orta |
| 6 | Tesis uçurumu kararı → PO→mal kabul köprüsü | Asıl entegrasyon değeri | Büyük |

1–2 hemen yapılabilir (davranış düzeltmesi). 3–5 çok tesisli/çok kalemli müşteriye geçmeden önce. 6 ayrı faz.

---

## 7. Karar bekleyen sorular

1. **Ürün görünümü**: profili olmayan 22 WMS ürünü satınalmada **gizlensin mi**, yoksa görünüp uyarı mı versin?
2. **HQ tesisi**: gerçek bir tesis mi, yoksa idari birim mi? (Köprü tasarımını belirler.)
3. **Tesis bağı**: şimdi kurulsun mu, yoksa ikinci tesis gerçekten devreye girene kadar "tümü serbest" mi kalsın?
4. **Hizmet kalemleri**: satınalmada hizmet kalemi açılacak mı? (Açılacaksa WMS ürün listelerinden gizlenmeli.)
