---
title: "Diğer İşlemler raf + Koşul Log + Yönlendirme Parametre"
type: run
date: 2026-06-20
topics: [ui, menu, kosul, yonlendirme, schema]
status: completed
tags: [#run/completed, #ui]
aliases: [yonlendirme-parametre, kosul-log]
---

# Diğer İşlemler raf + Koşul Log + Yönlendirme Parametre

İstek: Diğer İşlemler menüsünü rafa kaldır; Giriş/Çıkış Koşulları + Yönlendirme menülerine bak (StokBar Yönlendirme görselleri geldi).

## Yapıldı
- **Diğer İşlemler rafa kaldırıldı** — 8 öğeye `hidden:true` (rota+backend durur, menüde gizli; geri açmak için hidden kaldır). İş Emri/Sipariş/Lojistik/Finans/Stok demo sonrası geri gelebilir.
- **Giriş/Çıkış Koşul Log** — mevcut `TBLCONDITIONBREAKLOG` (conditionType ENTRY/EXIT) menüye eklendi (observe). `conditionBreakLogRoutes` GET'i conditionType+documentId filtreli custom route'a çevrildi (eski simpleCrud→custom).
- **Yönlendirme Parametre** (StokBar 4. görsel) — yeni `TBLROUTINGPARAMETER` (migration `20260620071500`; LinkScope+CapacityMessageType reuse). Alanlar: cari/malzeme scope, Kontrol Sahası(ref), Mesaj Tipi(Uyarı/Hata), Koşul Kırma, Yönlendirme Tipi(controlMode), SSP, Kontrol Tipi Açıklama, Sıra, Artan Sıralama. Backend [[src/routes/wmsConfig.ts]] (simpleCrud ownerField=routingTypeId). UI: routing-types listesinde **"Parametreler"** butonu → OwnerLines (/routing-types/:id/params).
- Mevcut Yönlendirme basit ekranları StokBar'a uygun doğrulandı (Kontrol Sahası=Kod+Saha Adı, Kırma Şifresi=Şifre+Aktif).

## Doğrulama
- tsc backend+web ✓ · prisma validate ✓ · smoke PASSED ✓
- E2E: Yönlendirme Parametre create+filter (routingTypeId), condition-break-logs?conditionType=ENTRY 200. Test verisi temizlendi.
- UI: Diğer İşlemler menüden YOK ✓ · Giriş Koşul Log (observe, sadece Yenile) ✓ · Yönlendirme Parametre sub-page (STD, tüm alanlar) ✓ · Parametreler butonu ✓

## Notlar / Kalan
- **Yönlendirme Log + Parametre** legacy tabloları katalogda KOLONSUZ → Log atlandı; Parametre StokBar GÖRSELİNDEN kuruldu (alan spec'i oradan).
- controlMode şu an text ("Serbest Kontrol") — StokBar dropdown değerleri netleşince select'e çevrilebilir.
- routing-break-reasons StokBar'da "Açıklama" alanı (bizde 'code' Kod) — küçük etiket farkı, ileride.
