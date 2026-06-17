---
title: "Mobil El Terminali — /m arayüzü (Mal Kabul · Stok Sorgu · Toplama/Sayım stub)"
type: run
status: completed
date: 2026-06-16
manager: Tech Lead
crew: [[crew/frontend-engineer]], [[crew/backend-engineer]]
topics: [mobil, el-terminali, handheld, barkod, mal-kabul, stok-sorgu, lookup, belge-durumu, demo]
tags: [run/completed, frontend, backend, mobile]
related_runs: [[runs/2026-06-12T21-15-00-scope-enforce-wo-durum]]
aliases: ["mobil-el-terminali", "mobile-ui", "/m"]
---

# Run — Mobil El Terminali (/m)

> Tech Lead 🎯: Masaüstü demoya hazırdı ama depocunun cebinde 24" monitör taşımasını bekleyemezdik — el terminali geldi.

## Karar
- Kullanıcı seçimi: **"Aynı app içinde /m mobil arayüz"** (ayrı PWA/uygulama değil). Auth korumalı, **masaüstü Shell olmadan** koyu el-terminali kabuğu.

## Backend
- **Yeni** `src/routes/lookup.ts` → `GET /api/lookup/barcode?code=` : barkod çözümü 3 katman (ürün-birim çoklu barkod → ürün-birim.barcode → ürün.barcode), dönüş `{found, product, unit, stock[]}` (lokasyon/statü/parti/seri/miktar, ilk 50 satır).
- `app.ts`'e kayıt: `/api/lookup` prefix.

## Frontend (`web/src/mobile/`)
- `MobileShell.tsx` — koyu kabuk, sticky marka başlık, geri (→/m) + çıkış, maxWidth 520, dokunmatik.
- `MobileHome.tsx` — 4 kutucuk: Mal Kabul · Toplama · Sayım · Stok Sorgu.
- `MobileStockQuery.tsx` — autofocus barkod input → lookup → ürün kartı + stok satırları (statü renkli etiket).
- `MobileReceipt.tsx` — INBOUND op + depo seç (varsayılan **GR — Mal Kabul**), barkod okut → satır ekle (miktar/parti/seri inline), **Belgeyi Oluştur ve Onayla** → create→confirm→complete → başarı ekranı (belge no + **Onaylandı**).
- `MobileStub.tsx` — Toplama/Sayım için "yakında" yer tutucu.
- `App.tsx` — `/m` rota grubu (Authenticated, Shell YOK): index/home, stock, receipt, pick(stub), count(stub).

## Doğrulama (E2E gerçek tarayıcıda)
- backend `tsc` ✅ · web `tsc` ✅ · web `build` ✅ · `test:smoke` PASSED ✅ · konsol hatası yok ✅
- `/m` ana ekran 4 kutucuk render ✅
- **Stok Sorgu**: 8690000000028 → PRD001 / Demo Ürün 1 / PCS, R01-01 AVAILABLE B-2026-001 qty 99 ✅
- **Mal Kabul**: GR op + WH01, barkod okut → satır, qty 5 + parti B-DEMO-01 → **GR-000010 / Onaylandı** ✅; stok motoru gerçekten yazdı (B-DEMO-01 qty 10 @ R01-01/AVAILABLE) ✅
- lookup eksik barkod → `{found:false}` ✅

## Not / espri
> Frontend 🎨: "Barkod okutunca otomatik odak geri input'a dönüyor — depocu kafasını kaldırmadan 50 koli okutsun." Tech Lead: tam da el terminali budur, fareyle tıklatan WMS olmaz.

## Sonraki
- /m/pick (Toplama: SO/pick-list, rezervasyon) ve /m/count (Sayım: COUNT operasyonu) gerçek akışları
- Demo öncesi temiz re-seed · fatura akışı (Finans) · Görsel Depo
