---
title: "Uyarlamalar menüsü StokBar grup düzenine hizalandı"
type: run
status: completed
date: 2026-06-12
run_id: 2026-06-12T13-05-00-uyarlamalar-duzen
manager: Tech Lead
crew: [[crew/frontend-engineer]]
topics: [ui, menu, uyarlamalar, stokbar]
tags: [run/completed, ui, frontend]
related_runs: [[runs/2026-06-12T12-45-00-belge-tipleri]]
---

# Run — Uyarlamalar grup düzeni (StokBar)

## Yapılan (kullanıcı StokBar Uyarlamalar menüsü görselini paylaştı)
- `label-types` → grup **Dinamik Etiketleme**.
- Tek **Koşul/Yönlendirme** grubu üçe ayrıldı: **Giriş Koşulları**, **Çıkış Koşulları**, **Yönlendirme**.
- Grup sırası StokBar'ı izliyor: **Genel → Operasyon → Belge Tipleri → Giriş Koşulları → Çıkış Koşulları → Yönlendirme → Dinamik Etiketleme**.

## Doğrulama
- web tsc ✅ · build ✅ · canlı DOM ✅ (7 grup StokBar sırasında; eski Etiket/Koşul-Yönlendirme yok)

## StokBar'da olup bizde ekranı olmayan (boş → gösterilmiyor)
Malzeme · Palet Tipleri(grup) · Entegrasyon · Saha Tanımlamaları · El Terminali · Üretim · Kalite · Kalite Yönetimi · Sayım · Rota → eklenince otomatik görünür.

## Sonraki
- Eksik gruplar (tablo+ekran, onayla) · belge yaşam döngüsü WIRING · gerçek etiket basım
