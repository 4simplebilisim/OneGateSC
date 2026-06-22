---
title: "Ürün-tesis kısıtı + ürün kartında Firma (tenant) görünürlüğü"
type: run
date: 2026-06-22
topics: [urun, product, tesis, facility, tenant, firma, kisit, enforcement]
status: completed
tags: [#run/completed, #backend, #ui, #schema]
aliases: [urun-tesis-kisit, product-facility]
---

# Ürün-tesis kısıtı + Firma görünürlüğü

Soru: "üründe tesis ve tenant ayrımını göremiyorum — ürün hangi tenant/tesiste kullanılabilir nasıl bileceğiz?"
Bulgu: **Tenant** üründe VAR (`TBLPRODUCT.companyId` = legacy `TBLURUN.LNGDISTKOD`) ama kartta gizliydi. **Tesis** ne bizde ne legacy'de (TBLURUN 131 kolon, tesis YOK) üründe değildi — fiziksel yer STOK ile belirlenir. Kullanıcı kararı: **ürünü tesislere KISITLA (yeni)** + Firma'yı göster.

## Yapıldı
- **Şema** (migration `...product_facility`): `TBLPRODUCTFACILITY` (companyId, productId, facilityId, `@@unique([productId,facilityId])`) — kısıtlama-listesi: kayıt yoksa ürün TÜM tesislerde; varsa yalnız listedekiler.
- **Backend** [[src/routes/products.ts]]: create/update `facilities[]` senkronu (firma-doğrulamalı `validFacilityIds`), GET/:id `facilities` döner + tenant-scope düzeltildi. **Enforcement** [[src/routes/documents.ts]]: belge oluştururken deponun `facilityId`'si, satırdaki ürünün izinli tesisleri içinde olmalı; değilse **400** (ürün kısıtsızsa serbest).
- **Frontend** [[web/src/pages/ProductForm.tsx]]: **"Firma (tenant)"** salt-okunur alan (companyId→firma adı, /api/companies) + **"Kullanılabilir Tesisler"** çoklu-seçim (boş=tümü).

## Doğrulama
backend+web tsc temiz · migration · smoke PASS · E2E 6/6 (kısıtsız→201, FAC2-kısıtlı ürün A-FAC deposunda→400, deponun tesisine izinli→201, GET.facilities). UI: ürün kartı Firma="ONEGATE — OneGate Demo Firma" + Kullanılabilir Tesisler çoklu-seçim. Test verisi temizlendi (0 kısıt/temp tesis/PF-belge).

## Müşteri (cari) — aynısı (kullanıcı: "aynısı müşteri için de geçerli")
- `TBLPARTNERFACILITY` (migration `...partner_facility`); [[src/routes/businessPartners.ts]] facilities senkronu + GET tenant-scope; [[web/src/pages/PartnerForm.tsx]] Firma + Kullanılabilir Tesisler. Enforcement [[src/routes/documents.ts]]: belgenin `partnerId`'si bu deponun tesisinde işlem yapabilmeli (kayıt yoksa serbest) → değilse 400. E2E 5/5 (FAC2-kısıtlı müşteri A-FAC deposunda→400). UI doğrulandı.

## Belge (kontrol et) — bulgu
`TBLDOCUMENT` zaten tenant (`companyId`) + tesis (`warehouseId`→`facility`) + `partnerId` taşıyor (legacy `TBLSBBELGEBASLIK.LNGDISTKOD`=firma). Belge bir İŞLEM → ayrıca "tesise kısıtlanmaz"; tersine **ENFORCEMENT NOKTASI**: deponun tesisi, satırdaki ürünün VE belgenin müşterisinin izinli tesisleri içinde olmalı. Yani belgede ayrı tesis alanı/kısıtı GEREKMEZ — tesis deposundan, tenant companyId'den gelir; kontroller belge create'te yapılır.

## Not
- Ürün/müşteri firma geneli (tenant=companyId); tesis kısıtı OPSİYONEL (boş=tümü). Enforcement belge oluşturmada (giriş/çıkış/transfer).
- Firma alanı: normal admin tek firmasını, super-admin x-company-id seçtiği firmayı görür (salt-okunur).
