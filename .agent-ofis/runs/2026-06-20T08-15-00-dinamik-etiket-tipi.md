---
title: "Dinamik Etiket Tipi (item + sorgu form-builder)"
type: run
date: 2026-06-20
topics: [etiket, label, ui, schema, dinamik]
status: completed
tags: [#run/completed, #ui, #schema]
aliases: [etiket-tipi, label-template]
---

# Dinamik Etiket Tipi — StokBar TBLSBDE* analizi + kurulum

İstek: "etiket tipi ekranı, item ekleyeceğimiz, itemlara sorgular ekleyeceğimiz yapı. StokBar TBLSBDE* etiket tablolarını analiz et."

## Analiz (legacy katalog, 26 etiket tablosu)
Çekirdek: **TBLSBDEETIKETTIPI** (etiket tipi başlık) → **...ITEM** (form alanları, ~50 kolon) + **...SORGU** (sorgu kütüphanesi). Yan: BUTTON/PORT/GRIDKOLON/YETKI/DOKUMAN (şimdilik atlandı).

## Yapıldı
- **3 tablo** (migration `20260620081500`, item'da çekirdek alanlar): `TBLLABELTEMPLATE` (kod/ekran başlık/etiket adı/menü grup/kolon sayıları/şifre), `TBLLABELTEMPLATEITEM` (başlık/itemType/dizayn isim/sıra/zorunlu/görünür/genişlik/maxLen/varsayılan/**comboQuery**/lookupId), `TBLLABELTEMPLATEQUERY` (kod/sorgu başlık/**sorgu detay SQL**/bağlantı sahası).
- Backend [[src/routes/labelTemplate.ts]] (3 simpleCrud; item/sorgu ownerField=labelTemplateId).
- Frontend: **Etiket Tipi** başlık (generic list/form) + **Item** & **Sorgu** sub-ekranları (OwnerLines, routing-Parametreler deseni) → listede "Item"+"Sorgu" butonları. itemType select (Metin/Sayısal/Tarih/Combo/Rehber/Onay/Barkod/Etiket).
- Menü: Uyarlamalar > Dinamik Etiketleme = **Etiket Tipi** (yeni) + **Etiket Tasarımcı** (mevcut görsel TBLLABELTYPE, relabel) + Menü Grubu.

## Doğrulama
- tsc backend+web ✓ · prisma validate ✓ · smoke PASSED ✓
- E2E: Etiket Tipi başlık + Item (COMBO + comboQuery) + Sorgu (SQL+binding) + filtreler (labelTemplateId). Test verisi temizlendi.
- UI: menü (Etiket Tipi/Tasarımcı/Menü Grubu) · liste Item+Sorgu butonları · Item sub-page (ET-DEMO, 11 alan) ✓ · 0 konsol hatası
- NOT: item create ilk denemede 400 verdi → tsx watch reload zamanlaması (route henüz yüklenmemiş); reload sonrası OK.

## Kalan
- StokBar etiket yan tabloları (Button/Port/GridKolon/Yetki/Doküman/Resim) eklenmedi.
- Item'ın diğer ~40 alanı (print/integration) çekirdek dışı; gerekince eklenir.
- ~~Etiket Tipi'nin gerçek BASIM akışı (item formundan veri girişi → yazıcı)~~ → tamamlandı: [[2026-06-20T09-00-00-etiket-basim]] (sorgu-güdümlü COMBO/LOOKUP hâlâ kalan).
