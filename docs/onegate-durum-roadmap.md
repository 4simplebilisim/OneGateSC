# OneGate — Durum Özeti & Roadmap

> 2026-06-09 · Kaynak: legacy `tablo/tablolar.xlsx` (459 tablo) → temiz yeniden tasarım

## 📊 Mevcut durum (gerçek sayılar)

| Ölçü | Değer |
|---|---|
| Domain tablo | **40** (wms 30 · procurement 2 · sales 3 · logistics 3 · finance 2) |
| Foreign key | **69** |
| API endpoint | **111** |
| Route dosyası | 26 · Servis (lib) | 17 |
| Migration | 17 |
| Şema | 5 (wms · procurement · sales · logistics · finance) |
| Test | smoke (her endpoint) + ~12 E2E paketi, hepsi yeşil |

## ✅ Tamamlanan modüller

| Modül | Kapsam | Olgunluk |
|---|---|---|
| **WMS çekirdek** | Depo·Alan·Lokasyon(ağaç)·Birim·Ürün·ProductUnit·Statü·PaletTipi·Palet | %95 |
| **Stok** | TBLSTOCK: lot/batch/seri/palet·FEFO·rezerve | %90 |
| **Hareket motoru** | Belge kaynak→hedef·giriş/çıkış/transfer·ters-kayıt·completeDocument | %90 |
| **Sayım / Kalite** | Stocktake (snapshot→düzelt)·muayene→statü geçişi | %65 |
| **WMS tanım** | Sayaç(otomatik no)·neden·lokasyon/operasyon grup·etiket·alt-grup·M-N link | %80 |
| **Inventory** | min/max·MRP·→taslak satınalma köprüsü | %70 |
| **Procurement** | Sipariş→onay→mal kabul·finans(iskonto/vergi/döviz) | %70 |
| **Sales** | Sipariş→onay→allocate(FEFO)→sevk·finans | %85 |
| **Logistics** | Araç·sevkiyat·durak·sales-bağ | %80 |
| **Finance** | PO/SO→fatura→kesim→tahsilat | %65 |
| **Auth / RBAC** | JWT·rol enforcement(ADMIN/OPERATOR/VIEWER)·super-admin·kullanıcı CRUD | %75 |
| **Altyapı** | pagination·PATCH·raporlar·marka/favicon·CORS | %80 |

## ⚠️ Bilinen boşluklar (öncelik sırasız)
- WMS 2. grup işlem tabloları: **iş emri / toplama emri** (depo görev yönetimi)
- Giriş/çıkış koşulu · yönlendirme (directed putaway)
- Cari hesap defteri · maliyet/değerleme · muhasebe/GL (legacy'de de yoktu — ayrı modül)
- **API dokümantasyonu (OpenAPI/Swagger) YOK** ← UI için kritik
- Ayrı **satınalma DB**'sinin birleştirilmesi (kullanıcı: ileride)

---

## 🗺️ Roadmap

### Faz A — UI Hazırlık (kısa, UI'dan önce önerilen)
1. **OpenAPI/Swagger** (`@fastify/swagger` + `@fastify/swagger-ui`) → `/docs` canlı API kontratı. Frontend bunsuz zorlanır.
2. **Liste yanıt standardizasyonu** — bazı listeler `{data,total,...}`, bazıları düz dizi; UI için tek şekil.
3. **CORS prod ayarı** (şu an `origin:true` — geliştirme için açık).
4. Hata formatı zaten tutarlı (`{error, details}`) ✅

### Faz B — UI (frontend)
1. **Tech stack kararı** (React+Vite / Vue / Next?) — kullanıcı kararı.
2. Auth akışı (login → JWT → role-based menü).
3. Ana ekranlar: Stok sorgu/kart · Belge (mal kabul/sevk/transfer) · Sipariş (PO/SO) · Raporlar · Tanımlar (master CRUD).
4. Marka kiti hazır (`/api/branding` renkler + logo).

### Faz C — WMS derinleştirme (UI ile paralel)
1. İş emri / toplama emri (2. grup)
2. Giriş/çıkış koşulu · yönlendirme
3. Sayım/kalite UI akışları

### Faz D — İleride
1. Ayrı satınalma DB birleştirme
2. Cari hesap / muhasebe / maliyet
3. AI modülü (en sonda)

---

## 🎨 UI hazırlık değerlendirmesi (özet)
**Backend fonksiyonel olarak UI'a HAZIR:** REST/JSON · JWT+RBAC · CORS · pagination · tutarlı hata · 111 endpoint · marka kiti.
**Önerilen tek ön-koşul:** OpenAPI/Swagger (Faz A.1) — frontend ekibine canlı kontrat verir, geliştirmeyi hızlandırır. Bu ~yarım günlük ek; UI'a paralel de yapılabilir.
