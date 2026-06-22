# OneGate WMS — Genel Çerçeve & Hazır Durum

> ⚠️ **BAYAT (2026-06-11).** Sayılar güncel değil ("57 tablo / 146 endpoint" → bugün 120 model). Güncel tek
> kaynak: [`SISTEM-HARITASI.md`](SISTEM-HARITASI.md). Bu dosya yalnız *yönetici özeti / olgunluk yüzdeleri* için tutuluyor.

> Sürüm: 2026-06-11 · Kaynak: legacy "SB / PAN8RAMA" WMS Excel dökümü (459 tablo) → temiz yeniden tasarım
> **57 domain tablo · 146 API endpoint · 38 UI ekran · 25 migration · 11 davranış kuralı enforce**

---

## 1. Ne Yaptık? (Yönetici Özeti)

OneGate, eski "StokBar / PAN8RAMA" WMS'inin Excel tablo dökümünden türetilmiş, **modern, modüler, çok-kiracılı (multi-tenant)** bir Depo Yönetim + Satınalma/Satış platformudur.

- **Backend:** Fastify 5 + Prisma 7 (PostgreSQL, 5 şema) + JWT/RBAC
- **Frontend:** React 19 + Refine 5 + Ant Design 6 (OneGate marka kimliği)
- **Çekirdek hedef tamamlandı:** Tesisten lokasyona tanımlar, mal kabulden sevke akışlar, operasyon tipi konfigürasyonu ve **konfigürasyonun gerçek davranışa bağlanması.**

Legacy'ye **birebir sadık** (her tablo/kolon `tablo/_katalog.json`'dan doğrulandı); icat edilen şeyler (ör. Tesis seviyesi) işaretlendi.

---

## 2. Mimari & Teknoloji

| Katman | Teknoloji |
|---|---|
| API | Fastify 5 · @fastify/jwt · @fastify/cors · @fastify/static · @fastify/swagger (/docs) |
| ORM/DB | Prisma 7.8 + @prisma/adapter-pg · PostgreSQL 16 (Docker) · 5 şema: `wms · procurement · sales · logistics · finance` |
| Auth | JWT · RBAC (`ADMIN/OPERATOR/VIEWER` + super-admin) · multi-tenant (companyId) |
| UI | React 19 · Refine 5 (dataProvider+auth+access) · Ant Design 6 · Vite 8 |
| Test | smoke (her endpoint) + ~25 E2E paketi |
| Migration | `prisma migrate diff + deploy` runbook (UTC timestamp'li) |

---

## 3. Veri Modeli (57 Domain Tablo)

### WMS (47 tablo) — çekirdek
- **Tenant/Lokasyon:** Firma(tenant) · **Tesis** · Depo · Alan · Lokasyon(ağaç) · Lokasyon Grup + M-N link · **Lokasyon Kapasite**
- **Ürün:** Ürün · Ürün Grup · Alt-Grup · Birim · **Ürün Ölçü Birimi** (çevrim/boyut/ağırlık/parti-seri takip) · **Ürün-Birim Çoklu Barkod**
- **Cari:** Cari(müşteri/tedarikçi) · **Cari Grup** · **Bölge** · **Zincir** (üst cari self-ref)
- **Stok & Hareket:** Stok(lot/seri/palet/FEFO/rezerve) · Belge + Satır(kaynak→hedef) · Palet · Palet Tipi · Statü · Sayaç
- **Operasyon:** Operasyon Tipi (**zengin konfig, 30+ alan**) · Operasyon Grup · Neden · **Op↔Statü/Lokasyon/Neden/Palet Tipi** (4 M-N link)
- **İş emri/görev:** İş Emri + Satır (planla→ata→başla→raporla→tamamla)
- **Yönlendirme:** Yönlendirme Tipi + **Yönlendirme Kuralı** (ürün/grup→lokasyon/grup, directed putaway)
- **Koşul:** Giriş/Çıkış Koşul Tipi · Etiket Tipi · Alt-grup
- **Genel uyarlama:** **Barkod Tipi (parse)** · **Parametre**
- **Diğer:** Sayım(stocktake) · Kalite Muayene · Inventory Kuralı(MRP) · Kullanıcı/Rol/Kullanıcı-Rol

### Procurement (2), Sales (3), Logistics (3), Finance (2)
- **Satınalma:** Sipariş + Satır
- **Satış:** Sipariş + Satır + Allocation (FEFO rezervasyon)
- **Lojistik:** Araç + Sevkiyat + Durak
- **Finans:** Fatura + Satır

---

## 4. Modüller — Ne Yapıyor

| Modül | Olgunluk | Kapsam |
|---|---|---|
| **WMS Çekirdek** | %98 | Tesis→Depo→Alan→Lokasyon(ağaç+tip+barkod+rampa) · seviye-bazlı **toplu lokasyon üretme** |
| **Stok** | %92 | lot/batch/seri/palet · FEFO · rezerve · stok kartı |
| **Hareket Motoru** | %95 | Belge kaynak→hedef · giriş/çıkış/transfer · tamamla→stok · **ters kayıt** |
| **Operasyon Tipi (kalp)** | %90 | 5 bölümlü zengin konfig (Genel/Stok Hareketi/Entegrasyon/Kontrol/Stok İşlemleri) — 30+ alan |
| **İş Emri / Görev** | %85 | planla→ata→başla→raporla→tamamla + **stok köprüsü** (toplanan→INTERNAL hareket) |
| **Toplama Emri (picking)** | %85 | satıştan **yönlendirilmiş** pick (lokasyon/parti dolu) |
| **Yönlendirme (directed putaway)** | %80 | ürün/grup→lokasyon/grup kuralı · mal kabulde otomatik öneri |
| **Lokasyon Kapasite** | %80 | lokasyon/grup×malzeme kapasite (miktar/palet/boyut/ağırlık/tolerans) + **enforce** |
| **Sayım / Kalite** | %65 | snapshot→düzelt · muayene→statü geçişi |
| **Inventory / MRP** | %70 | min/max·reorder→taslak satınalma köprüsü |
| **Procurement** | %70 | sipariş→onay→mal kabul · finans(iskonto/vergi/döviz) |
| **Sales** | %88 | sipariş→onay→**allocate(FEFO)**→toplama→sevk · finans |
| **Logistics** | %80 | araç·sevkiyat·durak·sales-bağ |
| **Finance** | %65 | PO/SO→fatura→kesim→tahsilat · vade analizi |
| **Auth/RBAC** | %75 | JWT·rol enforcement·super-admin·kullanıcı CRUD |
| **UI (Refine)** | %75 | 38 ekran·CRUD·detay/aksiyon·çok-satırlı·Pano dashboard·marka |

### 🎯 Genel WMS olgunluk: **~%88**

---

## 5. Konfigürasyon → Gerçek Davranış (10 Kural Enforce)

Operasyon tipi ve tanımlar artık **boş laf değil** — akışı gerçekten yönetiyor:

| # | Kural | Davranış |
|---|---|---|
| 1 | **reasonRequired** | Op'ta açıksa belge neden'siz tamamlanamaz (409) |
| 2 | **passiveProductUse** | Kapalıysa pasif ürün hareket edemez (409) |
| 3 | **op↔statü geçişi** | Operasyonda geçiş tanımlıysa satır statüsü uygun olmalı (INBOUND hedef/OUTBOUND kaynak/INTERNAL ikisi) |
| 4 | **lokasyon kapasite** | Hedefe girişte limit aşımı: ERROR→409, WARNING→izin |
| 5 | **seri = 1 adet** | Seri takipli ürün hareketinde miktar 1 zorunlu |
| 6 | **seri tekrar engeli** | Girişte aynı seri varsa engel; sameUseSerial=true istisna |
| 7 | **lot/parti zorunlu** | Parti takipli ürün-birimde parti no zorunlu |
| 8 | **qualityControl** | Mal kabulde hedef statü otomatik **KARANTİNA** |
| 9 | **sameUsePallet** | Kullanımdaki palete girişte engel; açıksa konsolidasyon |
| 10 | **op↔neden / op↔palet tipi** | Op'a bağlı liste varsa belge nedeni / palet tipi uygun olmalı |
| 11 | **batchAssignment** | Parti takipli üründe parti yoksa: op açıksa otomatik parti üretir (`AUTO-…`), kapalıysa hata |

*Mantık: takip/kural kapalıysa serbest, açıksa enforce — geriye uyumlu.*

---

## 6. Tanım Kırılımları (Demo-Hazır)

- **Tenant:** Firma → **Tesis** → Depo → Alan → Lokasyon (ağaç)
- **Ürün:** Ürün → Grup → Alt-Grup → **Ölçü Birimi** (çevrim) → **Birim Barkodu** → **Çoklu Barkod**
- **Cari:** Cari → **Grup** → **Bölge** → **Zincir** (üst/alt müşteri)
- **Barkod Parse:** Müşteri/üretim barkodu parse kuralı (regex/ifade)
- **Parametre:** Genel sistem parametreleri

---

## 7. Uçtan Uca İş Akışları (Hepsi Çalışır)

1. **Mal kabul:** Belge → *yönlendirme önerisi hedef lokasyonu doldurur* → *op-statü/QC hedef statüyü belirler* → onayla → tamamla → **stok girer** (lot/seri/kapasite enforce)
2. **Sevk:** Satış sip. → onayla → **stok ayır (FEFO)** → **toplama emri** (yönlendirilmiş) → topla → sevk → **stok düşer** → fatura
3. **İş emri:** planla → ata → başla → toplananı raporla → tamamla → *toplanan miktar stoğu hareket ettirir*
4. **Transfer:** TR belge → tamamla → **ters kayıt** (geri al)
5. **Kurulum:** Tesis/depo/lokasyon (toplu üret) → ürün+birim+barkod → cari+zincir → operasyon tipi konfig

---

## 8. Arayüz (38 Ekran)

- **Marka:** OneGate gradient (#44d4e3→#4e86ff→#9b5cf6) + ikon logo · koyu navy header · yeni split-login
- **Menü:** 3-katmanlı (Tanımlamalar / İşlemler / Uyarlamalar) → tematik alt gruplar (StokBar mantığı) → arama
- **Toolbar:** renkli+ikonlu (Yenile/Yeni/İzle/Düzenle/Sil) + sıra seçimi + "Gösterilen: N"
- **Ekran tipleri:** liste · master form · işlem detay+aksiyon (lifecycle butonları) · çok-satırlı oluşturma (sipariş/belge) · **5-bölümlü operasyon tipi formu** · **seviye-bazlı toplu lokasyon** · **18-alanlı lokasyon kapasite** · çoklu barkod editörü · **Pano (dashboard)**

---

## 9. API (146 Endpoint) & Altyapı

- REST + JSON · JWT bearer · RBAC · sayfalama · tutarlı hata formatı
- **OpenAPI/Swagger:** `http://localhost:3000/docs` (canlı kontrat, codegen)
- **DB kalıcılık:** self-heal watchdog (login'de başlar, her 60sn Docker+container garanti) + AutoStart + restart:unless-stopped

---

## 10. Test & Kalite

- **smoke:** her endpoint + auth + RBAC + branding (her commit'te yeşil)
- **~25 E2E paketi:** mal kabul · sevk · iş emri · transfer/ters · yönlendirme · lot/seri · kapasite · op-link · demo tanımlar · davranış kuralları
- Her özellik: typecheck + migrate deploy + seed + E2E + smoke ile doğrulandı

---

## 11. Bilinçli Kapsam Dışı / Sonraki Adımlar

- Ayrı **satınalma DB'sinin birleştirilmesi** (kullanıcı: "ileride")
- `reverseOperationTypeId` → ters-belge üretme pattern'i (büyük)
- `batchAssignment` · `materialBasedCollection` (niş flag'ler)
- Koşul/yönlendirme alt-sisteminin kalan ~22 operasyonel tablosu (log/parametre)
- Cari hesap defteri · muhasebe/GL · maliyet
- **AI modülü** (kullanıcı: "en sona")

---

## 12. Çalıştırma

```bash
# 1) DB (otomatik gelir; gerekirse)
cd E:\onegate && docker compose up -d
# 2) API (:3000)  — kontrat: http://localhost:3000/docs
cd E:\onegate && npm run dev
# 3) UI (:5173)
cd E:\onegate\web && npm run dev
```
Tarayıcı: **http://localhost:5173** → `admin / admin123` (super) · `operator / operator123` · `viewer / viewer123`
