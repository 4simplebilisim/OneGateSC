---
title: "Lot/seri takip zorunluluğu — izlemeli ürün stoklaşırken parti/seri zorunlu"
type: run
status: completed
date: 2026-06-09
run_id: 2026-06-09T18-50-00-lot-serial-enforcement
manager: Tech Lead
topics: [lot, batch, seri, serial, takip, stok, movement, zorunluluk]
tags: [run/completed, backend, ui]
related_runs: [[runs/2026-06-09T18-30-00-operation-config]]
---

# Run — Lot/seri takip zorunluluğu

Kullanıcı kuralı: "normalde batch/seri zorunlu değil (null serbest), ama ürün(-birim) batch/seri izlemesi açıksa stoklaşırken zorunlu."

## Bulgu (önce)
- Lot/seri takibi `TBLPRODUCTUNIT.batchTracking/serialTracking`'te (ürün-birim bazında), ürün kartında değil.
- Hareket motoru bu flag'leri KONTROL ETMİYORDU → izlemeli üründe parti/seri olmadan stok girebiliyordu (GAP).

## Yapıldı
- ⚡ `movement.ts` completeDocument: stok işleyen her satırda ürün-birim çekilir; `batchTracking && !batchNo → 409`, `serialTracking && !serialNo → 409`. Takip kapalıysa null serbest. (reverseDocument'a eklenmedi — bilinçli.)
- 🎨 `DocumentCreate`: satır editörüne **Parti (lot)** + **Seri** girişi eklendi.

## Doğrulama (E2E)
- parti takipli + partisiz → 409 ✅ · parti var → 200 ✅
- seri takipli + serisiz → 409 ✅ · seri var → 200 ✅
- **takipsiz + null → 200 (serbest)** ✅
- typecheck ✅ · smoke ✅ · UI build ✅

## Demo notu
Seed'de PRD001 (PCS+KOLI) **parti takipli** — mal kabulde artık parti no girilmeli (UI alanı eklendi). İstenirse seed'de takip kapatılıp "en basit" akış da gösterilebilir.
