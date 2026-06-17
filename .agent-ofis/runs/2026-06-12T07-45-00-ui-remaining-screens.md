---
title: "UI redesign 3. dalga — kalan işlem/detay ekranları"
type: run
status: completed
date: 2026-06-12
run_id: 2026-06-12T07-45-00-ui-remaining-screens
manager: Tech Lead
crew: [[crew/frontend-engineer]]
topics: [ui, ux, arayuz, frontend, tasarim, form, detay, theme]
tags: [run/completed, ui, frontend]
related_runs: [[runs/2026-06-12T07-10-00-ui-forms-login]]
---

# Run — UI redesign 3. dalga (kalan ekranlar)

## Yapılan (kullanıcı: "devam et")
- **DocumentCreate + TxnCreate** — başlık (og-section-card) + satırlar kartı; her satır **etiketli alanlı mini-kart** (#n + Sil ikonu); tam-genişlik "Satır Ekle"; **sticky kaydet çubuğu**. (StokBar belge-girişi hissi)
- **LocationBulkGenerate** — og-page + PageHeader + matris kartı (başlıklı/yuvarlatılmış seviye tablosu) + sticky "Üret".
- **GenericDetail** — PageHeader (durum tag inline) + işlem toolbar (primary ghost) + **3-kolon bordered Descriptions** (PRETTY etiketler) + boolean→Evet/Hayır rozet.
- **ProductUnitBarcodes** — PageHeader + bilgi kartı (rozet) + Space.Compact barkod ekleme.
- **AntD 6 uyumu** — tüm `Alert message=` → `title=` (deprecation temiz).

## Doğrulama
- web tsc ✅ · web build ✅ · **canlı DOM** ✅ (DocumentCreate/TxnCreate/LocationBulkGenerate başlık+bölüm+sticky bar; Alert title render) · smoke ✅

## Karar
- Çok-satırlı işlem ekranı satırı = **etiketli alanlı mini-kart** deseni.

## Durum
- **38 ekranın tamamı artık tek tasarım sisteminde.** Sıradaki yalnız istek bazlı: StokBar ekran-başı birebir parite / koyu mod (token hazır).
