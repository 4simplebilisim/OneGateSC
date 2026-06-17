---
title: "WMS Faz 2 — belge kaynak→hedef hareket motoru + stok kaydı"
type: decision
status: accepted
date: 2026-06-08
topics: [schema, migration, wms, belge, hareket, stok, operasyon]
tags: [decision/accepted, db, wms, faz2]
aliases: [wms-phase2, hareket-motoru, movement-engine, operationtype]
related_runs: [[runs/2026-06-08T17-13-33-ph2]]
related_decisions: [[decisions/0004-wms-phase1-schema]]
---

# 0005 — WMS Faz 2 Hareket Motoru

## Bağlam
Faz 1 (stok tablosu) sonrası kullanıcı "Faz 2 ile devam" dedi. Hedef: legacy BELGEBASLIK/DETAY kaynak→hedef hareket modeli + OPERASYONTIPI.

## Karar — şema (migration: 20260608210646_wms_phase2_movement)
- **Yeni TBLOPERATIONTYPE** ← OPERASYONTIPI: `direction: MovementDirection` (INBOUND/OUTBOUND/INTERNAL) + `affectsStock`. Belge davranışını sürer.
- **TBLDOCUMENT yeniden** (donduruldu→aktif): +companyId, +operationTypeId, +completedAt; `type DocumentType` KALDIRILDI (operationType belirler); `documentNo` unique tenant-scoped.
- **TBLDOCUMENTLINE → hareket modeli**: `sourceLocationId/targetLocationId`, `sourceStatusId/targetStatusId`, `batchNo/serialNo/palletId` (taşınan stok), `quantity Decimal(28,8)`, `unitId`. Eski `locationId/quantity(18,3)` çıkarıldı.
- Enum: `MovementDirection` eklendi, `DocumentType` kaldırıldı.

## Motor (src/lib/movement.ts)
`completeDocument(id)` — tek `$transaction`:
- INBOUND → hedef +qty · OUTBOUND → kaynak −qty · INTERNAL → kaynak −qty + hedef +qty.
- Stok satırı izleme kırılımıyla bulunur (findFirst, nullable=IS NULL); yoksa açılır.
- Yetersiz/eksik stok → `MovementError` (route 409), transaction rollback.
- Belge CONFIRMED değilse tamamlanamaz.

## API (src/routes/documents.ts, operationTypes.ts)
- `/api/operation-types` GET/POST.
- `/api/documents` GET(filtre: warehouse/status/opType) · GET/:id · POST(DRAFT) · POST/:id/confirm · POST/:id/complete(→stok) · POST/:id/cancel.
- companyId context (`x-company-id`/default 1).

## Sonuç (doğrulandı)
4 migration, wms 18 tablo. typecheck ✅, seed ✅ (GR/GI/TR), smoke 26/26 ✅, motor E2E 10/10 ✅ (GR+30→TR(10/20)→GI(15), yetersiz stok 409+rollback, DRAFT-complete 409).

## Sonraki / açık
- Stok rezervasyonu (reservedQty) henüz hareketlerde kullanılmıyor.
- COMPLETED belge iptali stok ters-kaydı gerektirir (şimdilik engellendi).
- Cari (müşteri/tedarikçi), companyId→JWT, batch dönüşümü (kaynak≠hedef batch) Faz 3.
