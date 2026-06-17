---
title: "StokBar Giriş/Çıkış Koşulları + Yönlendirme + Sayım (15 config tablosu)"
type: run
status: completed
date: 2026-06-12
run_id: 2026-06-12T14-30-00-kosul-yonlendirme-sayim
manager: Tech Lead
crew: [[crew/backend-engineer]], [[crew/frontend-engineer]]
topics: [uyarlamalar, kosul, yonlendirme, sayim, config, stokbar, legacy]
tags: [run/completed, backend, frontend]
related_runs: [[runs/2026-06-12T13-45-00-operasyon-config]]
---

# Run — Giriş/Çıkış Koşulları + Yönlendirme + Sayım

## Yapılan (kullanıcı StokBar grup görsellerini + Sayım detay modallarını paylaştı)
15 legacy config tablosu sadık eklendi:
- **Giriş Koşulları**: Kırma Şifresi · Kırma Nedeni · Tipi Operasyon (+ mevcut Koşul Tipi)
- **Çıkış Koşulları**: Kontrol Sahası · Kırma Şifresi · Kırma Nedeni · Tipi Operasyon (+ mevcut Koşul Tipi)
- **Yönlendirme**: Kontrol Sahası · Kırma Şifresi · Kırma Nedeni · Tipi Operasyon · Ürün Lokasyon (+ mevcut Tipi/Kuralları)
- **Sayım**: **Parametreleri (21 alan)** · Kriter · Onay Kullanıcı Grubu

**Sayım Parametreleri** StokBar modaline birebir: operasyon + sayım tipi + giriş/çıkış/transfer operasyon + 14 toggle (eşitleme, ağırlık farkı, parçalı palet, iç palet gizleme, okutmada lokasyon sorulsun…).

Backend: `wmsConfig.ts` paylaşılan `simpleCrud`. 15 route.

## Doğrulama
- backend tsc ✅ · migrate (15 tablo) ✅ · 15 endpoint 200 / create 201 / delete 204 ✅ · web tsc/build ✅ · canlı (Sayım Parametreleri 4 ref+14 switch; Giriş Koşulları 4 öğe) ✅ · smoke ✅

## Kapsam notu
- companyId düz Int; byte/link-tipi alanları sayı; userGroupId/mail alanları number (ilgili master tablo yok).

## Sonraki
- Kalan Uyarlamalar grupları (Saha Tanımlamaları/El Terminali/Entegrasyon/Üretim/Kalite Yönetimi/Rota/Sevkedememe/Sepet/TMS/İş Emri/Kritik Aktivite/Görsel Depo/IOT) · belge yaşam döngüsü WIRING · gerçek etiket basım
