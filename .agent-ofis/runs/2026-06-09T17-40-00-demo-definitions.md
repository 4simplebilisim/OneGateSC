---
title: "Demo tanım kırılımları: Tesis · Ürün-birim+çoklu barkod · Bölge/Grup/Zincir müşteri"
type: run
status: completed
date: 2026-06-09
run_id: 2026-06-09T17-40-00-demo-definitions
manager: Tech Lead
topics: [demo, tesis, urun-birim, barkod, musteri, zincir, bolge]
tags: [run/completed, db, backend, ui]
related_runs: [[runs/2026-06-09T17-00-00-dashboard-doccreate]]
---

# Run — Demo tanım kırılımları (4 özellik)

Kullanıcı WMS demo kıvamı için 4'ünü de onayladı. Hepsi legacy'e sadık (Tesis hariç — bizim eklediğimiz, işaretli).

## Yapıldı (DB → API → UI → seed → test)
- 💾 4 yeni tablo: `TBLFACILITY` (tesis, bizim), `TBLPRODUCTUNITBARCODE` (legacy URUNBIRIMBARKOD), `TBLREGION` (legacy MSDBOLGE), `TBLPARTNERGROUP` (legacy MUSTERIGRUP). + TBLWAREHOUSE.facilityId, TBLBUSINESSPARTNER.{regionId,partnerGroupId,parentId(zincir)}, TBLPRODUCTUNIT.barcodes. Migration 21 → 50 tablo.
- ⚡ API: facilities/regions/partner-groups (factory, DELETE dahil); `/api/product-units` CRUD + `/:id/barcodes` çoklu barkod; warehouse(facilityId), partner(region/group/parent) şemaları genişledi.
- 🎨 UI: 4 yeni kaynak (Tesisler, Ürün Ölçü Birimleri, Bölgeler, Cari Grupları); partner formuna cari grup/bölge/üst cari(zincir) ref; warehouse formuna tesis ref; **çoklu barkod editörü** (/product-units/:id/barcodes — ekle/sil).
- 🌱 Seed: Merkez Tesis (WH01 bağlı), Marmara bölge, Perakende grup, CUST001'e bölge/grup + **zincir alt-şube CUST001-SB1**, PRD001 KOLI(12'li) barkod + 2 çoklu barkod.

## Doğrulama
- backend typecheck ✅ · migrate deploy ✅ (21) · seed ✅ · Demo E2E (tesis/bölge/grup/zincir/ürün-birim/çoklu barkod/ekle-sil) ✅ · smoke ✅ · UI build ✅
- **eval ile UI teyit:** 4 menü öğesi, product-units ekranı + Barkodlar butonu, barkod editöründe 2 barkod.

## Cevap (kullanıcının sorusu)
- Tenant: Company→**Tesis**→Depo→Alan→Lokasyon ✅ (artık tesis var)
- Ürün: Ürün+grup+altgrup+**ölçü birimi+birim barkodu+çoklu barkod** ✅
- Müşteri: cari+**grup+bölge+zincir(üst cari)** ✅ (minimal; tam kapsam satınalma birleştirmesiyle)
