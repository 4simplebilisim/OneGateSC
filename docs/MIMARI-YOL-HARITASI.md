# OneGate — Mimari Yol Haritası (onaylı 3 yetenek)

> 2026-06-20 · Kaynak: [legacy/cekirdek-mimari-analiz.md](legacy/cekirdek-mimari-analiz.md) bulguları + kullanıcı onayı.
> Kapsam (onaylandı): **(A) KAPSAM/okutma katmanı · (B) Consignment/PO stok kimliği · (C) Ürün raf-ömrü + catch-weight**.
> Kapsam DIŞI: ERP entegrasyon alanları (erpCode/çoklu sevk adresi/e-fatura).
> Önerilen sıra: **C → B → A** (risk/derinlik artan). Her biri ayrı migration + typecheck + smoke ile.

> ⚠️ **Eşzamanlılık uyarısı:** Kod tabanı paralelde geliştiriliyor (yeni: TBLPALLETHISTORY, TBLCONTROLCOUNT,
> TBLPALLETNOTIFICATION, TBLDOCUMENTASSIGNMENT...). `schema.prisma` + `migrations/` üzerinde **çakışma riski**.
> Her şema düzenlemesinden hemen önce dosyayı yeniden oku; migration eklerken timestamp sıralamasına dikkat.

---

## C) Ürün raf-ömrü + catch-weight (en düşük risk, additive) — ✅ YAPILDI (2026-06-20)

> **Durum:** TBLPRODUCT'a 5 kolon (`shelfLifeControl`, `shelfLifeDays`, `catchWeight`, `minWeight`, `maxWeight`) +
> migration `20260620081555_product_shelflife_catchweight` + products.ts zod (create/update) + ProductForm "Raf Ömrü & Ağırlık" kartı.
> typecheck + smoke + API round-trip + UI doğrulandı. **TAM kısmı kaldı:** girişte otomatik SKT hesabı + catch-weight ağırlık bandı kontrolü (A/KAPSAM'daki ağırlık yakalamaya bağlı).

**Amaç:** Legacy `TBLURUN`'daki raf-ömrü süresi (otomatik SKT) + değişken ağırlık (et/gıda) yeteneği.

**Şema deltası — `TBLPRODUCT`'a additive kolonlar:**
```prisma
shelfLifeControl Boolean  @default(false) // legacy BYTRAFOMRU — raf ömrü takibi açık mı
shelfLifeDays    Int?                      // legacy LNGRAFOMRUDEGER (+BYTRAFOMRUBIRIM→güne çevrilmiş) — raf ömrü gün
catchWeight      Boolean  @default(false) // değişken ağırlıklı ürün (catch-weight)
minWeight        Decimal? @db.Decimal(18,4) // legacy DBLMINAGIRLIK — kabul/sevk alt bandı
maxWeight        Decimal? @db.Decimal(18,4) // legacy DBLMAXAGIRLIK — üst bandı
```

**Touchpoint'ler:**
- `prisma/schema.prisma` (TBLPRODUCT) + migration.
- `web/src/pages/ProductForm.tsx` — "Genel" sekmesine 5 alan (veya yeni "Takip/Ağırlık" sekmesi).
- `web/src/formConfig.ts` — products alanları (gerekiyorsa).
- **MVP:** kolonlar + form. **Tam:** (1) INBOUND posting'te `shelfLifeControl` açıksa `expiryDate = productionDate(+girişte) + shelfLifeDays` otomatik (`movement.ts`); (2) catch-weight ürünlerde hareket ağırlığı min/max bandında değilse uyarı/engel — **ağırlık yakalama KAPSAM (A) ile gelir**, bu yüzden tam catch-weight A'ya bağlı.

**Risk:** Düşük (additive). expiryDate auto-calc için satıra/kapsama productionDate girişi gerekir (şu an yok).

---

## B) Consignment / PO stok kimliği (orta risk) — ✅ YAPILDI (2026-06-20)

> **Durum:** TBLSTOCK unique anahtarı + cari/PO; TBLDOCUMENTLINE'a `customerId/poNo/poLine`; migration `20260620082637_consignment_po_stock_identity`.
> StockKey güncellendi: `movement.ts` (adjustStock + common×2 + ledger), `lib/stock.ts` (reserve/release normalize), `stock.ts` (reclassify + keySchema), `pallets.ts` (split), `documents.ts` (satır şeması + kopya). Sayım `stockId` ile çalıştığı için etkilenmedi.
> typecheck + smoke + uçtan uca doğrulandı: aynı ürün/lokasyon/parti farklı PO → **ayrı stok satırı**; aynı PO → **birleşir**. **KALAN:** belge satır UI'ında cari/PO girişi (DocumentCreate/TxnCreate — belge-ekran alanı, A ile/koordinasyonla).

**Amaç:** Legacy `TBLSBSTOKDURUM` kimliğinde olan **cari + PO** ayrımı — müşteri-sahipli (consignment) stok ve PO-bazlı izlenebilirlik.

**Şema deltası:**
```prisma
// TBLSTOCK — unique anahtara cari + PO ekle (kolonlar zaten var: customerId, poNo, poLine)
@@unique([companyId, locationId, productId, statusId, batchNo, serialNo, palletId, customerId, poNo, poLine])
// TBLDOCUMENTLINE — satıra cari/PO ekle (stok kimliğini besleyecek; şu an YOK)
customerId Int?
poNo       String? @db.VarChar(50)
poLine     String? @db.VarChar(50)
```

**Touchpoint'ler:**
- `prisma/schema.prisma` (TBLSTOCK unique + TBLDOCUMENTLINE alanları) + migration.
- `src/lib/movement.ts` — `StockKey`'e `customerId/poNo/poLine` ekle; `adjustStock` ve `common` bunları satırdan taşısın. `TBLSTOCKLEDGER`'a da yazılır (zaten poNo/poLine kolonları var; customerId eklenebilir).
- `src/lib/stock.ts` (`reserveStock`/`releaseStock` StockKey) + `src/routes/stock.ts` (reserve/release/reclassify) — yeni anahtar alanları.
- `src/lib/counting.ts` — sayım snapshot'ı yeni kimliği taşımalı (createCount stok satırı kopyası).
- UI: belge satırı oluşturma (DocumentCreate/TxnCreate) cari/PO girişi.

**Risk:** Orta. Unique anahtar genişlemesi additive (çakışma yaratmaz — daha fazla ayrım). Ama StockKey'i kullanan TÜM yerler (reserve/release/reclassify/count) güncellenmeli; atlanırsa stok eşleşmesi bozulur. `null` davranışı: Prisma `findFirst` ile null alanlar IS NULL eşleşir (mevcut desen korunur).

---

## A) KAPSAM / okutma katmanı (en derin, WMS'in çekirdeği) — ✅ BACKEND MVP YAPILDI (2026-06-20)

> **Durum (backend):** `TBLDOCUMENTLINESCOPE` modeli (satır-altı okutma, 1:N) + `TBLDOCUMENTLINE.collectedQty/preparedQty` · migration `20260620132732_document_line_scope`.
> Posting scope-aware: `completeDocument` — satırda scope varsa her scope = bir fiili hareket (yön bazlı adjustStock + kapasite + ledger), `collectedQty = Σ scope.quantity`; scope yoksa eski davranış (geriye uyumlu). `reverseDocument` de scope-aware. Scope CRUD API: `/api/document-line-scopes` (DRAFT guard + otomatik scopeNo).
> **Doğrulandı:** 1 satır (talep 10) → 2 okutma → 2 ayrı stok hareketi (6+4) + collectedQty=10; reverse her ikisini geri aldı. typecheck + smoke ✓.
> **KALAN (follow-up):** (1) **terminal okutma UI'ı** (belge detayında scope girişi — paralel ekran alanı, koordinasyonla); (2) scope yolunda **tam per-scope validasyon** (batch/seri/koşul/tolerans şu an satır-seviyesi atlanıyor, MVP); (3) catch-weight ağırlık bandı kontrolü (scope.netWeight + Feature C).

**Amaç:** Legacy 3 katman (BASLIK→DETAY→KAPSAM). DETAY = talep, KAPSAM = terminal okutmaları (1:N). Karışık palet, kısmi toplama, plan-vs-gerçek tolerans, toplanan/hazırlanan miktar.

**Şema deltası:**
```prisma
// TBLDOCUMENTLINE — fulfillment alanları (legacy DETAY)
collectedQty Decimal? @db.Decimal(28,8) // legacy DBLTOPLANANMIKTAR
preparedQty  Decimal? @db.Decimal(28,8) // legacy DBLHAZIRLANANMIKTAR

// YENİ: TBLDOCUMENTLINESCOPE — satır-altı okutma/kapsam (legacy TBLSBBELGEKAPSAM)
model TBLDOCUMENTLINESCOPE {
  id               Int      @id @default(autoincrement())
  documentLineId   Int
  scopeNo          Int
  quantity         Decimal  @db.Decimal(28,8)
  unitId           Int
  sourceLocationId Int?
  sourceStatusId   Int?
  targetLocationId Int?
  targetStatusId   Int?
  palletId         Int?
  batchNo          String?  @db.VarChar(50)
  serialNo         String?  @db.VarChar(50)
  poNo             String?  @db.VarChar(50)
  poLine           String?  @db.VarChar(50)
  customerId       Int?
  vehicleId        Int?     // legacy LNGKAMYON — sefer/araç
  netWeight        Decimal? @db.Decimal(28,8) // catch-weight (C ile birleşir)
  grossWeight      Decimal? @db.Decimal(28,8)
  reasonId         Int?
  createdAt        DateTime @default(now())
  @@unique([documentLineId, scopeNo])
  @@index([documentLineId])
  @@schema("wms")
}
```

**Davranış (movement.ts `completeDocument`):**
- Satırın **scope'u varsa** → her scope = bir hareket (scope'un kaynak→hedef'i ile `adjustStock`); satırın kendi source→target'ı yok sayılır. `collectedQty = Σ scope.quantity`.
- Scope **yoksa** → mevcut davranış (satır source→target). Geriye uyumlu.
- Tolerans: `quantity` (talep) vs `Σ scope` (gerçek) bandı.

**Touchpoint'ler:**
- `prisma/schema.prisma` (yeni model + DOCUMENTLINE alanları) + migration.
- `src/lib/movement.ts` — posting scope-aware; ledger her scope'u yazar.
- `src/routes/documents.ts` — scope CRUD (`/lines/:id/scopes`), complete scope toplamı.
- UI: belge detayında satır-altı **okutma girişi** ekranı (terminal benzeri: palet/batch/lokasyon okut → scope ekle). Yeni `pages/DocumentLineScopes.tsx` veya GenericDetail genişletmesi.
- `web/src/resources.ts` + `detailActions.ts`.

**Risk:** Yüksek. Posting motorunu (çekirdek) değiştirir; UI yeni okutma akışı ister. **Kendi odaklı turunda yapılmalı.** Geriye uyumluluk: scope opsiyonel → mevcut belgeler bozulmaz.

---

## Sıra & doğrulama
1. **C** (additive product) → migrate + typecheck + smoke + ProductForm doğrula.
2. **B** (stock identity) → migrate + StockKey kullanan tüm yerleri güncelle + smoke (reserve/release/count/reclassify) + canlı stok testi.
3. **A** (KAPSAM) → migrate + posting + scope UI + uçtan uca okutma→complete→ledger testi.

> Her adım bağımsız değer üretir; A'ya geçmeden C+B tamamlanmalı (A, C'nin catch-weight ağırlık yakalamasını ve B'nin cari/PO'sunu scope düzeyinde kullanır).

---

## Koordinasyon / çakışma haritası (2026-06-20)

Paralel geliştirme (agent-ofis `/yap` orkestratörü) bu oturumda **ekran inşası** yapıyor — `.agent-ofis/runs/`:
giriş, çıkış/transfer, sayım/palet ekranları. Eklediği tablolar/ekranlar:
- **TBLPALLETHISTORY** (palet ledger) → bu, analiz §3'teki palet ledger ihtiyacını **karşılıyor** (ayrıca yapmaya gerek yok).
- TBLCONTROLCOUNT/LINE (PPC kontrollü sayım), TBLPALLETNOTIFICATION/LINE (palet bildirim, net/brüt ağırlık), TBLCOUNTASSIGNMENT, TBLDOCUMENTASSIGNMENT (iş atama).
- Ekranlar: stock-entry, stock-exit, entry/exit-labeling, control-counts, pallet-notifications, count-approval.

| Yetenek | Çakışma | Karar |
|---|---|---|
| **C** Ürün raf-ömrü/catch-weight | ✅ Temiz (paralel iş ürün master'ına girmiyor) | Ne zaman istenirse güvenle. Önce `putaway_tolerance_shelflife` migration'ında üründe raf-ömrü var mı teyit et. |
| **B** Consignment/PO stok kimliği | 🟡 Tablo çakışması yok; movement/stock/counting.ts paylaşılan | Kısa senkron sonrası yapılabilir |
| **A** KAPSAM/okutma katmanı | 🔴 Yüksek — paralel iş belge/giriş/çıkış ekranlarını + belge modelini aynı anda işliyor | **Paralel ekran işi durulana kadar beklet**; kendi odaklı turunda |

**Net öneri:** A'yı beklet; C (ve kısa senkronla B) güvenle ilerletilebilir.
