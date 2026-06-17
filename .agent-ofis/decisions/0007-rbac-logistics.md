---
title: "RBAC enforcement + kullanıcı CRUD + Logistics modülü"
type: decision
status: accepted
date: 2026-06-09
topics: [rbac, auth, yetki, logistics, sevkiyat, araç]
tags: [decision/accepted, security, logistics, api]
aliases: [rbac, role-guard, logistics, shipment, vehicle]
related_runs: [[runs/2026-06-09T05-16-47-rbac-log]]
---

# 0007 — RBAC + Logistics

## ① RBAC (rol-bazlı yetki enforcement)
- `src/lib/rbac.ts` `requireRole(...roles)` preHandler — authenticate'ten sonra; super-admin bypass, yetkisiz 403.
- app.decorate: `requireWrite` = ADMIN/OPERATOR, `requireAdmin` = ADMIN.
- **Politika:** tüm yazma endpoint'leri (`POST` create/transition/ship/receive/reserve...) → `[authenticate, requireWrite]` (11 route dosyası, ~30 endpoint). GET'ler public kaldı. Kullanıcı yönetimi → `requireAdmin`.
- **Kullanıcı CRUD** `src/routes/users.ts` (ADMIN-only): list/get/create; passwordHash asla dönülmez; rol ataması.
- Seed: admin(super-admin), operator(OPERATOR), **viewer(VIEWER)** kullanıcıları.

## ② Logistics modülü (schema: logistics — yeni)
- **TBLVEHICLE** (plaka, tip, kapasite), **TBLSHIPMENT** (sevkiyatNo, araç, durum, sürücü), **TBLSHIPMENTSTOP** (sıra, müşteri, salesOrder gevşek bağ, durum).
- Enum: VehicleType, ShipmentStatus (PLANNED→IN_TRANSIT→DELIVERED/CANCELLED), StopStatus.
- Servis `logistics.ts`: dispatch (araç şart), deliverStop (tüm duraklar bitince DELIVERED), cancel.
- API: `/api/vehicles`, `/api/shipments` (+/:id/dispatch, /stops/:stopId/deliver, /cancel).
- wms/sales'e gevşek bağ (id, cross-schema FK yok) — modüler.

## Sonuç (doğrulandı)
10 migration, 4 şema (wms/procurement/sales/logistics), 27 domain tablo. typecheck ✅, smoke ✅, RBAC E2E 10/10 ✅, Logistics E2E 8/8 ✅.

## Açık / sonraki
- VIEWER bazı GET'lerde de kısıtlanabilir (şu an GET public).
- Logistics ↔ sales sevki otomatik bağ (ship-allocated sonrası otomatik shipment oluştur).
- AI modülü.
