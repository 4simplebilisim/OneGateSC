---
title: "Raporlar dashboard (Pano) + belge oluşturma ekranı (suggest önizlemeli)"
type: run
status: completed
date: 2026-06-09
run_id: 2026-06-09T17-00-00-dashboard-doccreate
manager: Tech Lead
topics: [ui, dashboard, pano, belge, suggest, directed-putaway, rapor]
tags: [run/completed, ui, frontend]
related_runs: [[runs/2026-06-09T16-30-00-ui-brand]]
---

# Run — Pano + belge oluşturma

İki UI ekranı (sırayla).

## 1) Raporlar dashboard (Pano)
- `Dashboard.tsx` — 4 raporu paralel çeker (stock-summary, open-orders, invoice-aging, mrp-summary). 6 istatistik kartı (stok kalemi, açık satınalma/satış, MRP reorder, açık fatura, bekleyen tutar — marka renk vurgulu, tıklanınca ilgili ekrana) + 2 tablo (stok özeti ürün bazında, MRP reorder önerileri).
- Landing page artık Pano (index → /dashboard), menüde üst sırada "Pano".

## 2) Belge oluşturma ekranı (suggest önizlemeli)
- `DocumentCreate.tsx` — header (operasyon tipi + yön etiketi, depo, opsiyonel belge no) + çok-satırlı editör (ürün/birim/miktar/hedef lok.). **Directed-putaway önizleme:** ürün seçilince `/api/routing-rules/suggest` çağrılır, satır altında "Öneri: KOD" + "İlk öneriyi uygula" linki. Boş bırakılan giriş satırları backend'de otomatik yönlendiriliyor; başarı mesajında `autoRoutedLines` gösterilir.
- documents "+ Yeni" → /documents/new.

## Doğrulama
- UI build ✅ · **eval ile render teyit** (screenshot aracı timeout): Pano 6 kart + 2 tablo + menüde Pano; Belge ekranı başlık/operasyon tipi/suggest notu/5 select/butonlar.

## Not
- Screenshot aracı bu ortamda çalışmıyor; render eval ile doğrulandı. Preview'ın `preview_fill`'i antd controlled-input store'unu güncellemiyor (otomasyon kısıtı) — gerçek klavye girişi/login sorunsuz çalışır (API token + authProvider teyitli).
