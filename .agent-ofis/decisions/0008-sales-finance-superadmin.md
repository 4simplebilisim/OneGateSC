---
title: "Satış modülü + sipariş finansı (iskonto/vergi/döviz) + super-admin tenant"
type: decision
status: accepted
date: 2026-06-09
topics: [sales, satis, sevk, finans, doviz, multi-tenant, super-admin, procurement]
tags: [decision/accepted, db, sales, auth]
aliases: [sales-order, sevk, super-admin, order-finance, exchange-rate]
related_runs: [[runs/2026-06-09T02-21-27-sales]]
related_decisions: [[decisions/0007-procurement-module]]
---

# 0008 — Satış + Finans + Super-admin

## ① Satış modülü (schema: sales)
- **TBLSALESORDER** + **TBLSALESORDERLINE** + **SalesOrderStatus** — procurement'ın simetriği, wms'e gevşek bağlı.
- `src/lib/sales.ts`: submit/approve/reject/cancel + **shipOrder** (APPROVED → WMS **OUTBOUND** belgesi + completeDocument stok DÜŞER + shippedQty + COMPLETED). Yetersiz stokta movement 409 + rollback.
- API: `/api/sales-orders` + submit/approve/reject/cancel/ship.
- Yeni `sales` şeması datasource'a ve manifest db_schemas'a eklendi.

## ② Sipariş finansı (satınalma + satış ortak)
- `src/lib/orderFinance.ts`: gross=miktar×fiyat, iskonto=gross×oran%, net=gross−iskonto, vergi=net×oran%, satırToplam=net+vergi (4 ondalık).
- Şema: PO/SO header'a `exchangeRate, subTotal, discountTotal, taxTotal`; satıra `discountRate, discountAmount, taxRate, taxAmount`.
- Doğrulandı: 10×50 %5 isk %18 KDV → satır 560.5, subTotal 475, tax 85.5.

## ③ companyId zorunlu + super-admin
- `TBLUSER.isSuperAdmin` (default false). JWT'ye gömülü.
- **getCompanyId politikası**: normal kullanıcı JWT'deki kendi companyId'sine KİLİTLİ (x-company-id yok sayılır); super-admin header ile firma seçebilir; anonim header/default.
- Seed: `admin` super-admin (admin123); yeni `operator` normal firma kullanıcısı (operator123, companyId=1).
- Doğrulandı: operator `x-company-id:999` header'ıyla bile companyId=1'e kilitli.

## Sonuç
7 migration. typecheck ✅, smoke 34/34 ✅, v4 E2E 18/18 ✅ (satış sevk 100→70+COMPLETED+yetersiz 409/rollback, finans hesapları, super-admin/tenant kilidi).

## Açık
- TBLUSER.companyId hâlâ nullable (super-admin null) — DB-zorunlu yerine app-katmanı kilidi.
- Satış sevki rezervasyon/tahsis ile entegre değil (sevk anında kaynak satırı belirtilir).
- Döviz: tutarlar sipariş para biriminde; exchangeRate saklı, baz-para çevrimi raporlamada.
