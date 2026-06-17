---
title: "Mal kabulde directed-putaway entegrasyonu (öneri → belge satırı)"
type: run
status: completed
date: 2026-06-09
run_id: 2026-06-09T15-45-00-suggest-receipt
manager: Tech Lead
topics: [wms, mal-kabul, directed-putaway, yonlendirme, belge]
tags: [run/completed, backend, wms]
related_runs: [[runs/2026-06-09T15-25-00-routing]]
---

# Run — Mal kabul suggest entegrasyonu

Yönlendirme önerisini belge oluşturmaya bağladık.

## Yapıldı
- ⚡ Backend — Belge create handler'ı operasyon tipini bir kez çekiyor (yön + sayaç). **INBOUND (mal kabul)** belgelerinde hedef lokasyon verilmemiş satırlara `suggestPutawayLocations` ile **öneri otomatik uygulanıyor** (`targetLocationId` doldurulur). Yanıtta `autoRoutedLines` döner. OUTBOUND/açık hedef etkilenmez.
- 🔍 QA — E2E: GR hedefsiz → autoRoutedLines=1 + satır hedefi R01-01 (öneriden); GR açık hedef → 0, RCV korunur; GI (OUTBOUND) → 0, hedef boş. smoke yeşil.

## Doğrulama
- typecheck ✅ · suggest-doc E2E (INBOUND) ✅ · GI OUTBOUND check ✅ · smoke ✅

## Ortam notu
Oturumda DB (Docker postgres) 2. kez düştü (turlar arası Docker Desktop kapanması) → kullanıcı Docker'ı açtı, container kaldırıldı, doğrulama tamamlandı. Dev server'lar yeniden başlatıldı.

## Sonraki (öneri)
- [ ] UI: belge oluşturma ekranı (suggest önizleme ile)
- [ ] WMS kapsam/durum raporu (tamamlandı noktası)
