# CLAUDE.md — OneGate WMS

OneGate, legacy **StokBar / Panorama8** WMS'inin (MSSQL/VB6) modern, çok-kiracılı yeniden tasarımı.
**Belge-merkezli** depo yönetim platformu + çevre modüller (satınalma/satış/lojistik/finans).

> **Önce oku:** [`docs/SISTEM-HARITASI.md`](docs/SISTEM-HARITASI.md) — menü→sayfa→API→tablo tam haritası + işleyiş özeti.
> Çelişkide o dosya güncel tek kaynaktır. Diğer doküman haritası aşağıda §Dokümanlar.

---

## Teknoloji
- **Backend:** Fastify 5 + Prisma 7.8 (`@prisma/adapter-pg` zorunlu) + PostgreSQL 16 (Docker), 5 şema (`wms · procurement · sales · logistics · finance`). TypeScript ESM, `tsx`.
- **Frontend:** React 19 + Refine 5 + Ant Design 6 + Vite (`web/`).
- **Auth:** JWT + RBAC (`ADMIN/OPERATOR/VIEWER` + super-admin) + multi-tenant (`companyId`).

## Çalıştırma
```bash
# DB (gerekirse)
docker compose up -d
# API :3000  (kontrat: http://localhost:3000/docs)
npm run dev
# UI :5173
cd web && npm run dev
```
Giriş: `admin/admin123` (super) · `operator/operator123` · `viewer/viewer123`

| Komut (kök) | İş |
|---|---|
| `npm run dev` | API (tsx watch) |
| `npm run typecheck` | tsc --noEmit |
| `npm run test:smoke` | her endpoint + auth + RBAC smoke |
| `npm run migrate` | prisma migrate dev |
| `npm run generate` | prisma generate |
| `npm run seed` | demo veri (`src/seed.ts`) |

> ⚠️ **Dev sunucuları hep açık tutulur** (preview MCP + `.claude/launch.json`: api+web). Süreçleri öldürme/pkill yapma.

## Mimari yönelim
- **Backend:** `src/app.ts` (route mount) · `src/routes/*` (47 dosya, endpoint) · `src/lib/*` (iş mantığı).
  - Çekirdek iş mantığı: `src/lib/movement.ts` (belge→stok hareketi), `counting.ts` (sayım), `stock.ts`,
    `routing.ts` (directed putaway), `sequence.ts` (otomatik no), `documentStatus.ts`, `quality.ts`,
    `workOrder.ts`, `sales.ts`/`procurement.ts`/`logistics.ts`/`invoicing.ts` (çevre modüller), `rbac.ts`.
  - Veri: `prisma/schema.prisma` (121 model, 36 enum) · `prisma/migrations/*`.
- **Frontend:** `web/src/` — **metadata-driven**. Üç jenerik sayfa tüm CRUD'u sürer:
  - `resources.ts` (menü/kaynak tanımı) → `GenericList` / `GenericForm` / `GenericDetail`
  - `formConfig.ts` (form alanları) · `detailActions.ts` (durum-bazlı lifecycle butonları)
  - Özel ekranlar: `pages/*` (ProductForm, PartnerForm, OperationTypeForm, DocumentCreate, TxnCreate, ...).

## Çekirdek model (kısa)
Ana veri → **Operasyon Tipi** (kurallar) → **Belge** (`DRAFT→CONFIRMED→COMPLETED→CANCELLED`) → **Stok**
(`location×product×status×batch×serial×pallet`, `mainQty`+`reservedQty`). **Stok yalnız `complete` anında değişir.**
Yön: INBOUND +, OUTBOUND −, INTERNAL ±, COUNT (ayrı motor).

## Çalışma kuralları (bu projeye özel)
1. **Legacy'e sadık kal.** Yeni tablo/kolon eklemeden önce legacy referansı kontrol et:
   `docs/legacy/stokbar-uni-schema.md` (gerçek StokBar şeması) + `docs/legacy/legacy-OneGate-eslesme.md` (eşleme).
   Legacy'de yoksa **eklemeden önce sor** (lot/serial/ledger hataları tekrarlanmasın).
2. **Klonlama değil, mantık uygula.** StokBar'ı birebir kopyalama; bizim daha sade/iyi desenimizi koru
   (ör. çift belge → tek `TBLDOCUMENT`). Legacy SP'leri müşteri-bazlı forklanmış — kanonik (base/`_ORJ`) mantığı al.
3. **Prisma 7:** runtime'da driver adapter (`@prisma/adapter-pg`) zorunlu — CLI yeşil ≠ runtime çalışıyor.
4. **Her özellik:** typecheck + migrate + (gerekirse) seed + smoke ile doğrula.

## Legacy referans (StokBar / Panorama8)
- **DB:** `TEKINOKTAY\SQLEXPRESS` / `STOKBAR_UNI` (Windows auth). İş mantığı **`SSP_SB*` stored procedure'larında** (~245).
- **WMS tabloları:** 71 (TBLSB* öneki). İsimlendirme: LNG=int, TXT=nvarchar, DBL=decimal, TRH=date, BYT=tinyint; PK=LNGKOD.
- Dökümler: `docs/legacy/`.

## Dokümanlar
| Dosya | İçerik |
|---|---|
| `docs/SISTEM-HARITASI.md` | ✅ Güncel tek kaynak — menü/sayfa/API/tablo haritası + işleyiş özeti |
| `docs/VERI-MODELI.md` | (Tur 2) tablo alan-alan referansı + legacy eşleme |
| `docs/ISLEYIS.md` | (Tur 3) akış adım-adım + legacy SP karşılaştırması |
| `docs/KONFIG-MOTORU.md` | (Tur 4) operasyon tipi × scope × koşul/yönlendirme |
| `docs/legacy/*` | legacy şema dökümü + eşleme + (Tur 3) SP dökümleri |
| `docs/onegate-*` (eski) | ⚠️ Bayat (9-11 Haz) — yalnız boşluk analizi geçerli; SISTEM-HARITASI önceliklidir |
