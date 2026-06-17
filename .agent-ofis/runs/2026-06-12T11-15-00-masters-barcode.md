---
title: "Master taşıma (Statü/Neden/Palet → Tanımlamalar) + zorunluluk kaldırma + gerçek Code128"
type: run
status: completed
date: 2026-06-12
run_id: 2026-06-12T11-15-00-masters-barcode
manager: Tech Lead
crew: [[crew/frontend-engineer]]
topics: [ui, menu, master, barkod, code128, etiket, operasyon]
tags: [run/completed, ui, frontend]
related_runs: [[runs/2026-06-12T10-45-00-op-tabbed-editor]]
---

# Run — master taşıma + zorunluluk + gerçek barkod

## Yapılan
1. **Master taşıma** — Statü/Neden/Palet Tipi *tanım* ekranları Uyarlamalar/Operasyon'dan çıkıp **Tanımlamalar > "Statü, Neden, Palet"** grubuna geçti. Uyarlamalar/Operasyon'da yalnız Operasyon Tipleri + Grupları kaldı.
2. **Zorunluluk kalktı** — OperationTypeForm LinkTab'te neden/palet ekleme `required` kaldırıldı (operasyon bu bağlantıları zorunlu kılmıyor; lokasyon zaten opsiyoneldi).
3. **Gerçek Code128** — `web/src/code128.ts` (bağımsız, harici kütüphane yok): tasarımcı önizlemesi artık **taranabilir** barkod (101 modül / 28 çubuk doğrulandı), yazdırma/PDF çıktısı gerçek barkod SVG basıyor.

## Doğrulama
- web tsc ✅ · web build ✅ · canlı DOM ✅ (Statüler yeni grup altında; barkod SVG Code128 yapısı doğru)

## Açık konu (kullanıcıya soruldu)
- **Yazıcı mimarisi**: etiket nereden basılacak, network yazıcı otomatik tanıma nasıl olacak → browser print / mDNS-IPP ağ keşfi / manuel ZPL-TCP seçenekleri sunuldu.

## Sonraki
- Yazıcı tanımı + basım (karara göre) · belge satırından gerçek veriyle etiket bas
