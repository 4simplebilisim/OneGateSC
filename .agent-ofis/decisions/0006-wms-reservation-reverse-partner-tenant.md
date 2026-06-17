---
title: "WMS roadmap: rezervasyon + ters-kayıt + cari + JWT-tenant + FEFO stok sorgu"
type: decision
status: accepted
date: 2026-06-08
topics: [stok, rezervasyon, belge, cari, multi-tenant, api, fefo]
tags: [decision/accepted, db, wms, faz3]
aliases: [reservation, reverse, business-partner, jwt-tenant, fefo]
related_runs: [[runs/2026-06-08T17-27-16-ph3]]
related_decisions: [[decisions/0005-wms-phase2-movement]]
---

# 0006 — Rezervasyon / Ters-kayıt / Cari / JWT-tenant / FEFO

Faz 2 sonrası roadmap'in kalan 4 maddesi sırayla tamamlandı.

## ① Stok rezervasyonu
- `reserveStock`/`releaseStock` (`src/lib/stock.ts`): uygun = `mainQty − reservedQty`; rezerve guard'lı, serbest 0 altına inmez.
- `adjustStock` (movement): fiziksel miktar rezervenin altına düşerse rezerveyi kısar (sevk rezerveyi tüketir).
- API: `POST /api/stock/reserve`, `POST /api/stock/release`.

## ② Tamamlanmış belge iptali (ters kayıt)
- `reverseDocument` (`src/lib/movement.ts`): COMPLETED belgenin stok etkisini tersine uygular (hedef −, kaynak +), status → CANCELLED. Tek transaction; başka belge stoğu tükettiyse eksi'ye düşer → 409.
- API: `POST /api/documents/:id/reverse`.

## ③ Cari (müşteri/tedarikçi) + JWT tenant
- **TBLBUSINESSPARTNER** (yeni) + `PartnerType` enum (CUSTOMER/SUPPLIER/BOTH). API: `/api/partners`.
- `TBLDOCUMENT.partnerId?` (cari opsiyonel).
- `TBLUSER.companyId?` (nullable) eklendi; login JWT'ye `companyId` gömülüyor; `getCompanyId` artık önce JWT'den okur, yoksa `x-company-id` header / default.

## ④ FEFO stok sorgu
- `GET /api/stock`: filtre (productId/locationId/warehouseId/statusId/includeZero), `expiryDate asc` (FEFO), hesaplı `availableQty = mainQty − reservedQty`.

## Migration
`20260608212218_wms_phase3_partner_tenant` — TBLBUSINESSPARTNER + PartnerType + TBLUSER.companyId + TBLDOCUMENT.partnerId (hepsi nullable/yeni → reset gerekmedi, diff+deploy).

## Sonuç (doğrulandı)
5 migration, wms 18 domain tablo. typecheck ✅, seed ✅ (cari + admin.companyId), smoke 30/30 ✅, Faz3 E2E 13/13 ✅ (rezerve+guard, FEFO, JWT companyId, cari belge, ters-kayıt RCV 40→0 + CANCELLED).

## Açık / sonraki
- Rezervasyonun belge/siparişe bağlanması (şu an serbest soft-lock).
- companyId zorunlu kılınması (şimdilik TBLUSER.companyId nullable, super-admin = null).
- Procurement modülü (satınalma sipariş + onay akışı).
