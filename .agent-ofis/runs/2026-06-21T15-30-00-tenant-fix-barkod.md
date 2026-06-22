---
title: "Tenant izolasyon fix (GET auth + cross-tenant ref) + barkod/ana-birim tekilliği"
type: run
date: 2026-06-21
topics: [tenant, multi-tenant, companyId, izolasyon, auth, barkod, barcode, urun-birim, guvenlik, e2e]
status: completed
tags: [#run/completed, #tenant, #security, #fix]
related_runs: [[runs/2026-06-21T14-08-53-1413-ab-tenant-senaryo]]
aliases: [tenant-fix, barkod-tekillik]
---

# Tenant izolasyon hatalarını ayıkla + ürün-birim-barkod kuralı

İstek: A/B senaryosunda bulunan tenant hatalarını **düzelt**, sonra teste devam; ayrıca **ürün-birim-barkod** kombinasyonu — bir üründe N birim ama **tek ana birim**; **bir barkod tek kez** (başka ürün ya da aynı ürünün başka biriminde bile tanımlanamaz).

## Düzeltmeler (tenant)
1. **Okuma izolasyonu (finding #1)** — [[src/app.ts]] global `onRequest` hook: tüm `/api/*` (yalnız `/api/auth/*` + `/api/branding` hariç) JWT ister. Artık GET'lerde de `request.user` dolu → `getCompanyId` normal kullanıcıyı kendi firmasına kilitler; header ile tenant okuma kapandı. Eskiden GET'ler public idi.
2. **Cross-tenant satır referansı (finding #2)** — [[src/routes/documents.ts]] POST: header (depo/cari/neden) + satır (ürün/birim/lokasyon/statü/palet) id'leri `companyId` ile sayılıp doğrulanıyor; firma dışı referans → 400.
3. [[tests/smoke.ts]] auth'lu GET'e uyarlandı (login→token→tüm GET'ler bearer) + "token'sız GET→401" kontrolü.
4. [[src/lib/company.ts]] bayat yorum güncellendi (companyId zaten JWT'de; default yalnız super-admin header'sız).

## Ürün-birim-barkod
- **Tek ana birim**: zaten enforce ([[src/routes/productUnits.ts]] POST/PATCH yeni base eklenince eskiyi düşürüyor) — testle doğrulandı.
- **Barkod tekilliği**: app-level `assertBarcodeUnique` ([[src/lib/barcode.ts]]) zaten doğru (firma genelinde TBLPRODUCTUNITBARCODE'da tek). **DB-seviyesi garanti eklendi**: TBLPRODUCTUNITBARCODE'a `companyId` + `@@unique([companyId, barcode])` (migration `20260621204836`, backfill'li). Create companyId set + P2002→409. Tek yazma yolu (`/product-units/:id/barcodes`), tek okuma (lookup → barkod tablosu, tenant-filtre).

## Doğrulama (hepsi yeşil)
- backend tsc ✓ · prisma migrate+generate ✓ · **smoke PASSED** (token'sız GET→401 dahil) ✓
- **Senaryo `_scenario_ab.mjs` 29/29, 0 bulgu**:
  - Tenant fix: auth'suz GET→401 ✓; userA token'ı SADECE A'yı görüyor ✓; userA `x-company-id:B` ile B'ye ulaşamadı ✓; A belgesi B ürününü referans edemedi (400) ✓; cross PATCH/DELETE 404 ✓.
  - Barkod: ana birim TEK ✓; aynı barkod aynı-ürün-başka-birim 409 ✓; başka-ürün 409 ✓; **B firmasında aynı barkod serbest** (tenant başına tekil) ✓; lookup tenant-izole ✓.
  - İş kuralları (lot/batch+palet, seri qty1, statü, transfer, çıkış) 18/18 hâlâ ✓.
- UI: Ürünler sayfası token'la render (3 satır), token'sız GET 401, 0 konsol hatası — frontend zaten token gönderdiği için kırılmadı.

## Kalan (önerilmiş, kapsam dışı)
- `TBLUSER.companyId` super-admin dışı NOT NULL (b/d) · Postgres RLS (e) · tenant onboarding (companies API yok). Veri bırakıldı: A=2, B=3.
