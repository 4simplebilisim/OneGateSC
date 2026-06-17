---
title: "WMS Core Şema — 9 tablo + 3 enum"
type: decision
status: accepted
date: 2026-06-08
topics: [schema, migration, wms, auth, belge]
tags: [decision/accepted, db, wms]
aliases: [wms-core, core-schema]
related_runs: [[runs/2026-06-08T15-17-34-wms1]]
---

# 0001 — WMS Core Şema

## Bağlam
OneGate WMS modülünün çekirdek veri modeli gerekiyordu: auth, depo/lokasyon, ürün/birim, belge akışı.

## Karar
`wms` şemasında 9 tablo + 3 enum, hepsi **TBL + PascalCase İngilizce** konvansiyonu (TBLSB prefix YASAK):

- **Auth**: `TBLUSER`, `TBLROLE`, `TBLUSERROLE` (composite PK userId+roleId, cascade delete)
- **Depo**: `TBLWAREHOUSE`, `TBLLOCATION` (@@unique[warehouseId, code], LocationType enum)
- **Ürün**: `TBLUNIT`, `TBLPRODUCT` (barcode opsiyonel + index, unitId FK)
- **Belge**: `TBLDOCUMENT` (documentNo unique, DocumentType/DocumentStatus enum, createdBy→TBLUSER), `TBLDOCUMENTLINE` (@@unique[documentId, lineNo], quantity Decimal(18,3), location SetNull)

Enums: `LocationType` (SHELF/FLOOR/RECEIVING/SHIPPING/STAGING/QUARANTINE), `DocumentType` (RECEIPT/SHIPMENT/TRANSFER/ADJUSTMENT/COUNT), `DocumentStatus` (DRAFT/CONFIRMED/COMPLETED/CANCELLED).

## Gerekçe
- camelCase kolon adları, FK index'leri performans için elle eklendi.
- Belge başlık+satır ayrımı klasik WMS pattern; nested create ile lineNo otomatik.
- Ham SQL migration YASAK — yalnızca `prisma migrate dev`. multiSchema (wms+procurement) Prisma 7'de GA.

## Sonuç
Migration `20260608190311_wms_core_schema` uygulandı. `prisma migrate status` → up to date. `prisma validate` → valid.
