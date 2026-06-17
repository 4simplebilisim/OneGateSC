---
title: "WMS Faz 1 şema — fiziksel çekirdek + stok (çok-kiracılı)"
type: decision
status: accepted
date: 2026-06-08
topics: [schema, migration, wms, stok, multi-tenant]
tags: [decision/accepted, db, wms, faz1]
aliases: [wms-phase1, phase1-schema, stok-tablosu]
related_runs: [[runs/2026-06-08T16-50-47-ph1]]
related_decisions: [[decisions/0003-wms-legacy-redesign]]
---

# 0004 — WMS Faz 1 Şema

## Bağlam
[[decisions/0003-wms-legacy-redesign]] keşfi sonrası kullanıcı "tabloları FK/index ile oluştur" dedi. Varsayılan kararlar onaylandı: Decimal(28,8), Status tablo-driven, cari Faz 2, mevcut TBLDOCUMENT donduruldu, çok-kiracılı baştan.

## Karar — eklenen/revize tablolar (migration: 20260608204421_wms_phase1_core)
**Yeni (7):** TBLCOMPANY(tenant), TBLAREA, TBLPRODUCTUNIT(batch/seri flag + çevrim), TBLSTATUS, TBLPALLETTYPE, TBLPALLET(iç içe), **TBLSTOCK** (stok kalbi).
**Revize:** TBLWAREHOUSE/TBLLOCATION/TBLUNIT/TBLPRODUCT → +companyId; TBLLOCATION +areaId/+parentId(ağaç)/+barcode/+isRamp/+status/+priority; TBLPRODUCT derinleştirildi.
**Enum (5 yeni):** LocationStatus, UnitType, ProductType, ProductStatus, PalletKind.

## Konvansiyon kararları
- Çok-kiracılık: her ana tabloda `companyId` + `@@index`; doğal kod tenant-scoped `@@unique([companyId, code])`.
- TBLSTOCK izleme: `@@unique([companyId, locationId, productId, statusId, batchNo, serialNo, palletId])` + FEFO index `[expiryDate]`. Miktar Decimal(28,8).
- Auth (USER/ROLE) Faz 1'de global (tenant-bağımsız) bırakıldı.
- Audit: createdAt/updatedAt (createdBy/updatedBy Faz 2).
- API companyId context: `x-company-id` header / default 1 (`src/lib/company.ts`). Faz 2'de JWT'ye taşınacak.

## Migration notu (önemli — runbook)
Prisma 7 `migrate dev` AI-non-interactive ortamda uyarıda durdu. Akış:
1. `migrate reset --force` (kullanıcı onayı + `PRISMA_USER_CONSENT_FOR_DANGEROUS_AI_ACTION`).
2. `migrate diff --from-config-datasource --to-schema --script` → migration.sql (Prisma üretti, elle SQL değil).
3. Klasör adı UTC timestamp (>önceki migration; sıralama kritik).
4. `migrate deploy` + `generate`.

## Sonuç (doğrulandı)
wms şeması: **17 tablo (16 domain + _prisma_migrations), 32 FK, 66 index.** typecheck ✅, seed ✅ (firma+stok dahil), smoke 16/16 ✅. Stok satırı 6 ilişkiyle join, lokasyon ağacı çalışıyor.

## Sonraki
- Faz 2: belge kaynak→hedef hareket modeli + OperationType; cari (müşteri/tedarikçi); companyId→JWT.
- Yeni entity route'ları (companies/areas/statuses/pallet-types/pallets/stock CRUD).
