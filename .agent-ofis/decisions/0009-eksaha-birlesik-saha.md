---
title: "Ek Saha: Dinamik+Statik tek tabloda birleşik"
type: decision
date: 2026-06-20
status: accepted
topics: [saha, eksaha, custom-field, schema]
related_runs: [[runs/2026-06-20T05-07-48-saha]]
tags: [#decision/accepted, #saha, #schema]
aliases: [eksaha-birlesik, extra-field-merge]
---

# 0009 — Ek Saha birleşik tablo

## Bağlam
Legacy'de Ek Saha 2 ayrı tablo: `TBLEKSAHATANIMLAMA` (Dinamik, 32 kol) + `TBLSBSTATIKSAHATANIMLAMA` (Statik, 14 kol). Kullanıcı: "ek saha ve statik ek saha diye 2 menü var ancak biz bunları TEK yapalım, içinde Tip=Dinamik/Statik seçilebilir/zorunlu olsun".

## Karar
TEK tablo **`TBLEXTRAFIELD`**, `fieldKind` (DYNAMIC/STATIC) ayırt-edici (zorunlu). Statik'te olmayan alanlar (min/max uzunluk, ürün-bazında-artan, belge-bölme-aktar) dinamik için opsiyonel; ortak alanlar (entityType=BYTTIP, description, fieldDataType=BYTEKSAHAOZELLIK, defaultValue, maxAnswerCount, isRequired) her ikisinde. Seçenekler ayrı `TBLEXTRAFIELDOPTION`. Operasyon Tipi Saha Bağlantı `TBLOPERATIONTYPEEXTRAFIELD` (legacy TBLSBPPCGORUNTULENECEKSAHALAR, LNGOPERASYONTIPI+LNGSAHAKOD).

## Gerekçe
- [[stokbar-klonlama-degil-mantik]] — 2 tablo gereksiz duplikasyon; tek tablo + discriminator daha temiz, bizim daha iyi desenimiz.
- TBL+İngilizce konvansiyon (TBLSB prefix YASAK).
- "Tesis" = firma = `companyId` (örtük, LNGDISTKOD/BYTFIRMA/TXTDIST) — fiziksel facility kolonu eklenmedi.
- byte enum'lar string enum'a (ExtraFieldKind/Entity/DataType) — int kod icat edilmedi.

## Sonuç
3 model + 3 enum, migration `20260620050748` uygulandı, 4 endpoint (extra-fields / options / op-link / documents copy), UI tek-ekran. tsc/prisma/smoke/E2E yeşil.
