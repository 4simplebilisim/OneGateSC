---
title: "StokBar Genel ek + İş Emri config + Menü Grubu (13 basit tablo)"
type: run
status: completed
date: 2026-06-12
run_id: 2026-06-12T16-20-00-genel-isemri-config
manager: Tech Lead
crew: [[crew/backend-engineer]], [[crew/frontend-engineer]]
topics: [uyarlamalar, genel, isemri, config, stokbar, legacy, batch]
tags: [run/completed, backend, frontend]
related_runs: [[runs/2026-06-12T15-55-00-list-ref-resolve]]
---

# Run — Genel ek + İş Emri config (13 tablo)

## Karar (kullanıcı: "basit tabloları batch'le + büyükleri ayır")
13 basit StokBar config tablosu legacy'e sadık eklendi:
- **Genel**: Dil · Vardiya · Ekran Rapor Bağlantı · Stok Kontrol Parametre · Belge Planlama Parametre · Toplama Emri Parametre · Dashboard Rapor
- **İş Emri** (yeni Uyarlamalar grubu): Depo Araç · İş Emri Genel Parametre · İş Emri Nedenleri · İş Emri Referans Operasyon · Raf Besleme Parametre
- **Dinamik Etiketleme**: Menü Grubu

`genelConfig.ts` paylaşılan `simpleCrud`. 13 route, formlar ref select'lerle (operasyon/cari/birim/lokasyon-grup/belge-durumu).

## Ertelendi (büyük/belirsiz)
- **Saha Tanımlamaları** = özel alan (custom-field) çatısı — ayrı tasarım
- **Çoklu Dil** = i18n
- "İş Emri Parametre" (legacy'de net karşılık yok), DE-etiket alt-link'leri (Etiket Tipi Bağlantı/Import-Export/Ekran-Etiket — DE çatısı gerek)

## Doğrulama
- backend tsc ✅ · migrate (13 tablo) ✅ · 13 endpoint 200 / create 201 / delete 204 ✅ · web tsc/build ✅ · canlı (Genel +7, İş Emri grubu) ✅ · smoke ✅

## Sonraki
- Saha Tanımlamaları (custom-field çatısı) · Çoklu Dil (i18n) · belge durumu WIRING / davranış
