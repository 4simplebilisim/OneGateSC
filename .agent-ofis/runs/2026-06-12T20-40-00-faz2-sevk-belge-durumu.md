---
title: "DAVRANIŞ Faz 2 — sevk akışı + belge durumu tutarlılığı"
type: run
status: completed
date: 2026-06-12
run_id: 2026-06-12T20-40-00-faz2-sevk-belge-durumu
manager: Tech Lead
crew: [[crew/backend-engineer]]
topics: [sevk, sales, procurement, belge-durumu, davranis, faz2, fefo]
tags: [run/completed, backend, behavior]
related_runs: [[runs/2026-06-12T18-15-00-belge-durumu-wiring]]
---

# Run — Faz 2 (sevk akışı + belge durumu)

## Sorun
Sevk (`sales.ts`) ve mal kabul (`procurement.ts`) akışları OUTBOUND/INBOUND belgeyi doğrudan COMPLETED yapıyordu ama Faz 1'de eklenen **belge durumunu (Onaylandı) atamıyordu** → manuel akışla tutarsız (sevk belgeleri boş durum).

## Yapılan
- `sales.ts` (2 sevk yolu: shipOrder + shipAllocated) + `procurement.ts` (mal kabul): `completeDocument` sonrası **documentStatusId = Onaylandı** (`docStatusId` helper, ONY).
- **Sevk E2E doğrulandı**: Satış Siparişi → submit → approve → **allocate (FEFO rezerve)** → ship-allocated → **GI belgesi 'Onaylandı'** + stok **100→99**.

## Drift notu
- B (op-bağlantı scope: Tesis + Hepsi/Grup/Belirli) şeması zaten migrate edilmiş; DB=şema tutarlı (op-type-statuses GET 200, diff boş).

## Doğrulama
- backend tsc ✅ · drift (boş) ✅ · sevk E2E (GI Onaylandı + stok düştü) ✅ · smoke ✅

## Sonraki
- İş Emri belgeleri için de belge durumu · fatura (SO→fatura) demo · scope kurallarının motorda enforce'u
