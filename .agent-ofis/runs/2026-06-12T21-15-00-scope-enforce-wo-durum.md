---
title: "Scope (Hepsi/Grup/Belirli) enforce — Yasaklı Ürün + İş Emri belge durumu"
type: run
status: completed
date: 2026-06-12
manager: Tech Lead
crew: [[crew/backend-engineer]]
topics: [scope, linkscope, yasakli-urun, enforce, motor, isemri, belge-durumu, davranis]
tags: [run/completed, backend, behavior]
related_runs: [[runs/2026-06-12T20-40-00-faz2-sevk-belge-durumu]]
aliases: ["scope-enforce", "forbidden-product-enforce"]
---

# Run — Scope enforce + İş Emri belge durumu

## (3) Scope enforce — Yasaklı Ürün
- `movement.ts`'e **kapsam eşleştirme**: `cariScopeMatches` / `materialScopeMatches` (Hepsi=her zaman, Grup=ürün/cari grubu eşleşir, Belirli=ürün/cari eşleşir).
- `completeDocument`'ta **Yasaklı Ürün** (`TBLOPERATIONTYPEFORBIDDENPRODUCT`) enforce: operasyonun yasaklı kurallarından biri belgenin **cari kapsamı** + satırın **malzeme kapsamı** ile eşleşirse hareket **bloke** ("ürün bu operasyonda yasaklı").
- E2E: **Belirli** (SPECIFIC PRD001) + **Grup** (GROUP grup-1) kapsamında PRD001 bloke edildi ✅.
- Helper'lar diğer scope kuralları için **paylaşımlı**.

## (1) İş Emri belge durumu
- `workOrder.ts` otomatik stok-hareket belgesi `completeDocument` sonrası **documentStatusId=Onaylandı** atıyor.
- Artık **dört akış** belge durumuyla tutarlı: manuel · mal kabul (PO) · sevk (SO) · **iş emri**.

## Doğrulama
- backend tsc ✅ · forbidden SPECIFIC E2E ✅ · forbidden GROUP E2E ✅ · smoke ✅

## Sonraki
- Diğer scope kuralları (tolerans miktar, op-statü/lokasyon kapsamı) · fatura (Finans) · COUNT operasyonu davranışı
