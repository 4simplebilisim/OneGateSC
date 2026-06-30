# OneGate WMS — Test Case Kataloğu

> **Anlık görüntü:** 2026-06-23 (18:00). Kapsam = bu güne kadar geliştirilen tüm özellikler.
> **Sonraki adım:** Bu katalog otomasyonun girdisidir — `tests/` altında çalıştırılabilir testlere dönüştürülecek (§13).
> Çelişkide kaynak: [`SISTEM-HARITASI.md`](SISTEM-HARITASI.md) + ilgili `_scenario_*.mjs`.

## 0. Test ortamı & ön koşullar

| Öğe | Değer |
|---|---|
| API | `http://localhost:3000` (kontrat `/docs`) |
| UI | `http://localhost:5173` |
| DB | PostgreSQL 16 (docker), 5 şema: wms·procurement·sales·logistics·finance |
| Firmalar (tenant) | ONEGATE (1, super) · FIRMA-A (2, lot+palet) · FIRMA-B (3, seri) · FIRMA-C (14) |
| Kullanıcılar | `admin/admin123` (super) · `operator/operator123` · `viewer/viewer123` · `kullaniciC/parolaC1` (FIRMA-C admin) |
| Provizyon | `_create_tenant.mjs` (idempotent firma+tesis+depo+lokasyon+birim+statü+operasyon+admin) |

**Seviye:** API = endpoint sözleşmesi · DB = veri/kalıcılık · UI = ekran davranışı.
**Otomasyon sütunu:** ✅ mevcut senaryoda var · 🔲 yazılacak · 👁 UI (Playwright/preview gerekir).

---

## 1. Çok-kiracılık (tenant) izolasyonu — `_scenario_ab.mjs`

| ID | Senaryo | Beklenen | Seviye | Oto |
|---|---|---|---|---|
| TEN-01 | Token'sız `GET /api/products` | 401 | API | ✅ |
| TEN-02 | userA (companyId=2) GET products | yalnız FIRMA-A ürünleri | API | ✅ |
| TEN-03 | super-admin `x-company-id:3` ile GET | FIRMA-B verisi | API | ✅ |
| TEN-04 | A belgesinde B'nin ürünü (satır ref) | 400 (firma-dışı referans) | API | ✅ |
| TEN-05 | Aynı barkod, aynı firmada 2. ürün/birim | 409 (`@@unique([companyId,barcode])`) | DB | ✅ |
| TEN-06 | Aynı barkod, farklı firmada | 201 (tenant'lar arası serbest) | DB | ✅ |
| TEN-07 | Cross-tenant PATCH/DELETE (A→B kaydı) | 404 | API | ✅ |
| TEN-08 | 13 alt-kayıt tablosu companyId taşıyor (satır/junction) | 0 null, parent ile aynı | DB | 🔲 |
| TEN-09 | Belge/sipariş/sayım/iş-emri/fatura satırı create | satıra companyId set edilir | DB | 🔲 |

## 2. Kullanıcı yetkileri — `_scenario_screen.mjs` · `_scenario_rights.mjs` · `_scenario_groups.mjs` · `_scenario_columns.mjs`

| ID | Senaryo | Beklenen | Seviye | Oto |
|---|---|---|---|---|
| AUTH-01 | Kullanıcıya Tesis/Depo/Operasyon scope kısıtı (kısıtlama-listesi) | kayıt yoksa serbest; varsa yalnız listedekiler | API | ✅ |
| AUTH-02 | Yetkisiz depo ile belge oluşturma | 403 | API | ✅ |
| AUTH-03 | Yetkisiz operasyon tipi ile belge | 403 | API | ✅ |
| AUTH-04 | super-admin / ADMIN | tüm scope bypass | API | ✅ |
| AUTH-05 | Grup üyeliği → grup yetkisi devralma (union) | en kısıtlayıcı kazanır | API | ✅ |
| AUTH-06 | Kolon yetkisi READONLY | alan disabled | UI | 👁 |
| AUTH-07 | Kolon yetkisi HIDDEN | alan gizli | UI | 👁 |
| AUTH-08 | Ekran hakkı (İzle/Yeni/Düzenle/Sil) kapalı | ilgili buton görünmez/disable | UI | 👁 |
| AUTH-09 | Aksiyon hakkı union (kullanıcı+grup, false-öncelik) | en kısıtlayıcı | API | ✅ |
| AUTH-10 | Kullanıcı kartı B-alanları (tip/onay/cep/geçerlilik/alias) | kaydedilir + döner | API | ✅ |
| AUTH-11 | Parola politikaları (süresiz/değiştir/değiştiremez) | kaydedilir | API | ✅ |

## 3. Statü-tesis — `_scenario_status_facility.mjs` (10/10)

| ID | Senaryo | Beklenen | Seviye | Oto |
|---|---|---|---|---|
| STF-01 | Mevcut statüler (backfill) | her statü tek `facilityId` taşır | DB | ✅ |
| STF-02 | Statü tenant + tesis ayrı alanlar | companyId(tenant) ≠ facilityId(tesis) | DB | ✅ |
| STF-03 | facilityId'siz statü oluşturma | 400 (zorunlu) | API | ✅ |
| STF-04 | Başka tenant'ın tesisiyle statü | 400 (firmaya ait değil) | API | ✅ |
| STF-05 | Geçerli tesisle statü | 201, facilityId döner | API | ✅ |
| STF-06 | GET/:id + PATCH tek tesis senkron | güncellenir | API | ✅ |
| STF-07 | PATCH başka tenant tesisi | 400 | API | ✅ |
| STF-08 | A-FAC2 statüsü, A-FAC deposunda belge | 400 (statü-tesis kısıtı) | API | ✅ |
| STF-09 | Statü deponun tesisine alınınca belge | 201 | API | ✅ |
| STF-10 | UI: Statü formu Firma→Tesis (tekli, zorunlu) | sıra + tekli-seçim | UI | 👁 |

## 4. Ürün-tesis & Müşteri-tesis kısıtı — `_scenario_prodfac.mjs` · `_scenario_partnerfac.mjs`

| ID | Senaryo | Beklenen | Seviye | Oto |
|---|---|---|---|---|
| PFAC-01 | Kısıtsız ürün, herhangi tesiste belge | 201 (serbest) | API | ✅ |
| PFAC-02 | FAC2-kısıtlı ürün, A-FAC deposunda | 400 (ürün-tesis kısıtı) | API | ✅ |
| PFAC-03 | Deponun tesisine izinli ürün | 201 | API | ✅ |
| PFAC-04 | GET ürün → facilities[] döner | dizi | API | ✅ |
| CFAC-01 | FAC2-kısıtlı müşteri, A-FAC deposunda belge | 400 (müşteri-tesis kısıtı) | API | ✅ |
| CFAC-02 | Deponun tesisine izinli müşteri | 201 | API | ✅ |
| CFAC-03 | Cross-tenant tesis kısıt atama | filtrelenir (firma-dışı yok sayılır) | API | ✅ |

## 5. Ürün kartı: raf ömrü & ana birim — `_scenario_shelflife_baseunit.mjs` (16/16)

| ID | Senaryo | Beklenen | Seviye | Oto |
|---|---|---|---|---|
| PRD-01 | Raf ömrü gün=30 girilince | `shelfLifeControl` true türetilir | DB | ✅ |
| PRD-02 | Raf ömrü boş | shelfLifeControl false | DB | ✅ |
| PRD-03 | PATCH gün=10 | shelfLifeControl true | DB | ✅ |
| PRD-04 | Mal kabul (INBOUND) + raf ömrü tanımlı | stok SKT = giriş + gün | DB | ✅ |
| PRD-05 | Raf ömrüsüz ürün girişi | stok SKT = null | DB | ✅ |
| PRD-06 | İlk ölçü birimi (isBaseUnit göndermeden) | otomatik ana birim | API | ✅ |
| PRD-07 | İkinci birim | ana DEĞİL | API | ✅ |
| PRD-08 | Tek ana birimi doğrudan kaldırma | 400 | API | ✅ |
| PRD-09 | İkinciyi ana yap | eskisi otomatik düşer (tek ana) | API | ✅ |
| PRD-10 | Başka birim varken ana birimi silme | 400 | API | ✅ |
| PRD-11 | Ana-olmayan birim silme | 204 | API | ✅ |
| PRD-12 | Son (ana) birim silme | 204 (üründe birim kalmaz) | API | ✅ |
| PRD-13 | UI: kartta Üretici Kodu + Raf Ömrü Takibi kutusu | YOK | UI | 👁 |

## 6. Operasyon tipi — `_check_reverse` (5/5) · `_check_partial_eksaha` (kısmi)

| ID | Senaryo | Beklenen | Seviye | Oto |
|---|---|---|---|---|
| OPT-01 | `partialUsage=true` ile oluştur | 201 + persist (BYTPARCALIKULLANIM) | DB | 🔲 |
| OPT-02 | Giriş op + ters operasyon=giriş | 400 (ters yön çevirir) | API | 🔲 |
| OPT-03 | Giriş op + ters=çıkış | 201 | API | 🔲 |
| OPT-04 | PATCH giriş op'a ters=giriş | 400 | API | 🔲 |
| OPT-05 | Çıkış op'a ters=çıkış (simetrik) | 400 | API | 🔲 |
| OPT-06 | UI: kapsam-dışı alanlar (İptal Lokasyon, Muadil, Onaylı Belge, Toplu Gönderim) | formda YOK | UI | 👁 |
| OPT-07 | UI: Genel sıra Firma→Tesis→Kod→Tanım | doğru | UI | 👁 |
| OPT-08 | UI: alt-sekmeler (Statü/Lokasyon/Neden/Palet/Kurallar) | Tesis sorulmaz | UI | 👁 |
| OPT-09 | Alt-kayıt create | op'un facilityId'si devralınır (LinkTab defaults) | API | 🔲 |
| OPT-10 | super-admin Firma seçince | Tesis o firmaya göre yenilenir | UI | 👁 |

## 7. Ek saha & Neden — tesis — `_check_partial_eksaha`

| ID | Senaryo | Beklenen | Seviye | Oto |
|---|---|---|---|---|
| EXF-01 | Ek saha facilityId ile oluştur | 201, companyId+facilityId ayrı | DB | 🔲 |
| EXF-02 | Ek saha tesissiz | 201 (opsiyonel, boş=tüm tesisler) | DB | 🔲 |
| EXF-03 | UI: ek saha sıra Firma→Tesis→içerik→Aktif | doğru | UI | 👁 |
| RSN-01 | Neden facilityId ile oluştur | 201 + persist | DB | 🔲 |
| RSN-02 | Neden tesissiz | 201 (opsiyonel) | DB | 🔲 |

## 8. Firma/Tesis görünürlüğü & alan sırası

| ID | Senaryo | Beklenen | Seviye | Oto |
|---|---|---|---|---|
| UI-01 | super-admin yeni kayıt (Generic/Product/Partner/OpType) | Firma = seçilebilir Select (4 firma) | UI | 👁 |
| UI-02 | normal admin | Firma salt-okunur (kendi firması) | UI | 👁 |
| UI-03 | super-admin Firma değiştirince | og_company hizalanır + ref'ler yeniden çekilir | UI | 👁 |
| UI-04 | Düzenle modunda Firma | kaydın firması salt-okunur | UI | 👁 |
| UI-05 | Tüm tanımlama formları alan sırası | Firma→Tesis→Kod→Ad→Aktif | UI | 👁 |
| UI-06 | Yeni kayıtta "Aktif" toggle | varsayılan açık | UI | 👁 |

## 9. El terminali dinamik menü — `_scenario_handheld.mjs`

| ID | Senaryo | Beklenen | Seviye | Oto |
|---|---|---|---|---|
| HH-01 | `GET /api/handheld-menu` (grup+öğe tanımlı) | aktif gruplar+öğeler, sortOrder | API | ✅ |
| HH-02 | Tanım yokken | statik 4 kutuya fallback | UI | 👁 |
| HH-03 | Menü öğesi yetki filtresi | yetkisiz öğe gizli | UI | 👁 |

## 10. Hızlı-ekle (QuickCreateSelect)

| ID | Senaryo | Beklenen | Seviye | Oto |
|---|---|---|---|---|
| QA-01 | "Veri Yok" ref dropdown'ı (formConfig'i olan kaynak) | "+ Yeni … Ekle" footer görünür | UI | 👁 |
| QA-02 | Footer → modal | formConfig alanları render edilir | UI | 👁 |
| QA-03 | Modal kaydet | kayıt **og_company tenant'ında** oluşur | DB | ✅* |
| QA-04 | Kayıt sonrası | yeni kayıt dropdown'a eklenir + **otomatik seçilir** | UI | 👁 ⚠ |
| QA-05 | Zorunlu iç-içe ref'i olan kaynak | "+ Yeni Ekle" gizli (graceful) | UI | 👁 |
| QA-06 | RBAC: ekleme yetkisi yok | "+ Yeni Ekle" gizli | UI | 👁 |

> ⚠ **QA-04 açık bulgu:** çekirdek (oluşturma + doğru tenant) doğrulandı (OPSEQ-T1/T2 DB'de companyId=2). Otomatik-seçim görseli sentetik harness'ta teyit edilemedi; otomasyonda gerçek tıklamayla doğrulanacak.

## 11. Menü temizliği

| ID | Senaryo | Beklenen | Seviye | Oto |
|---|---|---|---|---|
| MENU-01 | Uyarlamalar > Operasyon alt-menüsü | Lokasyon, Statü, Yasaklı Ürün, Sefer Bazında Toplama YOK | UI | 👁 |
| MENU-02 | Operasyon alt-menüsü kalan öğeler | Neden Kat./Neden/Op Tipi/Grup/Grup Bağ./Tolerans/Palet/Dönüşüm/Sıralı/Oto Ref/Toplu İşlem/Ürün Bazında | UI | 👁 |

## 12. Çapraz / regresyon (her sürümde)

| ID | Senaryo | Beklenen | Oto |
|---|---|---|---|
| REG-01 | `npm run typecheck` (backend) | temiz | 🔲 |
| REG-02 | `web` typecheck + `vite build` | temiz | 🔲 |
| REG-03 | `npm run test:smoke` | PASS (tüm endpoint + auth + RBAC) | ✅ |
| REG-04 | `prisma migrate diff` (drift) | boş (DB=şema) | 🔲 |
| REG-05 | `npm run seed` taze DB | hatasız (statü/birim facilityId vb.) | 🔲 |

---

## 13. Otomasyon stratejisi (birlikte çalışacağımız sonraki adım)

**Mevcut durum:** 13 `_scenario_*.mjs` (kök, gitignore'lu) — `fetch` + `PrismaPg` ile API+DB doğruluyor, kendi temizliğini yapıyor. Bunlar otomasyonun çekirdeği.

**Önerilen yapı:**
```
tests/
  e2e/                    # API+DB senaryoları (mevcut .mjs'ler taşınır + standardize)
    _harness.mjs          # ortak: login, api(), arr(), ok(), cleanup
    tenant-isolation.mjs
    user-auth.mjs
    status-facility.mjs
    product-partner-facility.mjs
    product-card.mjs
    operation-type.mjs    # OPT + reverse + partial
    extrafield-reason.mjs
    handheld-menu.mjs
  ui/                     # Playwright (👁 işaretli case'ler — quick-add, alan sırası, menü, kolon yetki)
  run-all.mjs             # tüm e2e'yi sırayla + özet rapor (geçti/kaldı)
```

**Karar vermemiz gerekenler (birlikte):**
1. **Koşucu:** düz `node` (mevcut desen, sıfır bağımlılık) mı, yoksa `node:test`/`vitest` (assertion + rapor) mı?
2. **UI katmanı:** Playwright mı (👁 case'ler için gerçek tarayıcı — preview_eval'in flaky olduğu yerler), yoksa şimdilik yalnız API/DB mi?
3. **Veri stratejisi:** her test kendi verisini kurar+temizler (mevcut) mı, yoksa ortak fixture/seed snapshot mı?
4. **CI:** `npm run test:e2e` script'i + (ileride) GitHub Actions?

**Hızlı kazanım sırası (önerim):** mevcut .mjs'leri `tests/e2e/`'ye taşı + ortak harness'a indir → `run-all.mjs` özet rapor → OPT/EXF/RSN/QA için eksik API testlerini yaz (🔲) → en son Playwright ile 👁 case'ler.

> **Kapsam özeti:** ~75 test case · API/DB ≈ 50 (çoğu otomatik ✅/🔲) · UI 👁 ≈ 25 (Playwright ile otomatikleştirilecek). 1 açık bulgu: QA-04 otomatik-seçim görseli.
