---
title: "Süzgeç: sekme konsolidasyonu — Operasyon Kurallar + Ürün editörü"
type: run
status: completed
date: 2026-06-12
run_id: 2026-06-12T17-00-00-tab-konsolidasyon
manager: Tech Lead
crew: [[crew/frontend-engineer]], [[crew/backend-engineer]]
topics: [konsolidasyon, sekme, operasyon, urun, linktab, mantik, refactor]
tags: [run/completed, frontend, backend, refactor]
related_runs: [[runs/2026-06-12T16-20-00-genel-isemri-config]]
aliases: ["tab-konsolidasyon", "linktab-ownerfield"]
---

# Run — Sekme konsolidasyonu (#1 + #2)

## Bağlam (kullanıcı geri bildirimi)
"Ne gördüysen yapmayı bırak, mantık ekle." → süzgeç analizi: **master + ona ait FK config'ler ayrı menü değil, master'ın sekmeli editörü** olmalı (Operasyon Tipi'ndeki gibi).

## Yapılan
**#1 Operasyon Tipi — "Kurallar" sekmesi**: Tolerans · Yasaklı Ürün · Dönüşüm · Toplu İşlem · Grup Bağlantı tek tabda (5 alt-bölüm). Bu 5 + op↔neden/lokasyon/statü/palet düz menüleri Operasyon grubundan kaldırıldı (zaten sekme).

**#2 Ürün — sekmeli editör (`ProductForm`)**: Tanım · Ölçü Birimleri (+ satırdan Barkodlar) · Ek Gruplar. `product-units` menüden kalktı.

**Altyapı**:
- `LinkTab` → `web/src/components/LinkTab.tsx` (paylaşılan; `ownerField`+`ownerId` generic; `text` alan; `extraActions`).
- Backend `simpleCrud(...,ownerField)` GET'i o alana göre filtreler → sekme sadece o master'ın kayıtlarını gösterir. 6 route'a uygulandı.
- Junction'lar (sıralı operasyon, ürün/sefer toplama = iki op) tek sahibi yok → menüde kaldı.

## Doğrulama
- backend tsc ✅ · ownerField filtre (op3→1, filtresiz→2) ✅ · web tsc/build ✅ · canlı: Op Tipi 6 sekme (Kurallar 5 bölüm, op-filtreli); Ürün 3 sekme (Ölçü Birimleri 3 satır + Barkodlar) ✅ · menü temizlendi ✅ · smoke ✅

## Karar
- Süzgeç deseni kalıcı: master-ait config → sekme (LinkTab+ownerField). Geri bildirim hafızaya işlendi ([[stokbar-klonlama-degil-mantik]]).

## Sonraki
- (ince) Koşul/Yönlendirme Tipi + Belge Durumu sekme konsolidasyonu · **DAVRANIŞ: belge durumu WIRING**
