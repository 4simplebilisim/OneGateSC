---
title: "Procurement modülü — satınalma sipariş + onay akışı + WMS mal kabul köprüsü"
type: decision
status: accepted
date: 2026-06-09
topics: [procurement, satinalma, onay, belge, stok, mal-kabul, multi-tenant]
tags: [decision/accepted, db, procurement]
aliases: [purchase-order, satinalma, procurement-core, mal-kabul]
related_runs: [[runs/2026-06-09T01-59-01-proc]]
related_decisions: [[decisions/0006-wms-reservation-reverse-partner-tenant]]
---

# 0007 — Procurement Modülü

## Bağlam
WMS Faz 1–3 sonrası manifest'in 2. modülü `procurement` (şema boştu) kuruldu.

## Karar — şema (migration: 20260609055515_procurement_core, schema: procurement)
- **TBLPURCHASEORDER**: companyId, orderNo, supplierId, warehouseId, status: PurchaseOrderStatus, orderDate, expectedDate, currency, totalAmount, createdById, approvedById/At.
- **TBLPURCHASEORDERLINE**: productId, unitId, quantity, receivedQty, unitPrice, lineTotal.
- Enum **PurchaseOrderStatus**: DRAFT/SUBMITTED/APPROVED/REJECTED/COMPLETED/CANCELLED.

## Mimari — GEVŞEK bağlama (önemli)
Procurement, wms entity'lerini (supplier/warehouse/product/unit/user) **id ile** referanslar; **cross-schema Prisma relation YOK**. Referans bütünlüğü uygulama katmanında doğrulanır (route create'te supplier/warehouse/product existence check). Gerekçe: modüller (onegate-wms / onegate-procurement) ayrı kalsın, wms modelleri procurement'a bağımlı olmasın → ayrı deploy edilebilir.

## Onay akışı + WMS köprüsü (src/lib/procurement.ts)
- Durum geçişleri: submit (DRAFT→SUBMITTED), approve (→APPROVED, approvedBy/At), reject, cancel.
- **receiveOrder** (procurement→WMS köprüsü): APPROVED siparişe mal kabul → WMS INBOUND (GR) belgesi oluştur + `completeDocument` ile stok'a işle + PO satır `receivedQty` artır + tüm satırlar tam alındıysa PO COMPLETED. Kısmi kabul desteklenir.

## API (src/routes/purchaseOrders.ts)
`/api/purchase-orders` GET/GET:id/POST · `/:id/submit|approve|reject|cancel|receive`.

## Sonuç (doğrulandı)
6 migration. procurement 2 tablo. typecheck ✅, smoke 32/32 ✅, Procurement E2E 14/14 ✅ (PO→submit→approve→kısmi(10)→tam(15)→stok 25 + COMPLETED, DRAFT/COMPLETED receive guard 409).

## Sonraki / açık
- Mal kabulün stok rezervasyonu/sipariş tahsisi ile ilişkisi.
- Satınalma fiyat/iskonto/vergi detayı, çoklu para birimi kuru.
- Satış siparişi (outbound) + sevk akışı (simetrik).
