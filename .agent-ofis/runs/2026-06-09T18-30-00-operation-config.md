---
title: "Operasyon konfig dünyası (op↔statü/lokasyon/neden/palet tipi) + mal kabul bug fix"
type: run
status: completed
date: 2026-06-09
run_id: 2026-06-09T18-30-00-operation-config
manager: Tech Lead
topics: [operasyon, statu, lokasyon, neden, palet-tipi, mal-kabul, bugfix]
tags: [run/completed, db, backend, ui]
related_runs: [[runs/2026-06-09T17-40-00-demo-definitions]]
---

# Run — Operasyon konfigürasyon dünyası + mal kabul fix

Kullanıcı: "operasyonların kendi dünyası/ekranları olmalı; neden/lokasyon/statü/palet tipi bağlayabilmeliyiz". + Demo provası bulduğu mal kabul statü bug'ı bununla DOĞRU şekilde çözüldü.

## Yapıldı (DB→API→UI→seed→test)
- 💾 4 yeni tablo (legacy birebir): `TBLOPERATIONTYPESTATUS` (kaynak→hedef statü geçişi), `TBLOPERATIONTYPELOCATION` (kaynak/hedef lokasyon), `TBLOPERATIONTYPEREASON` (op↔neden), `TBLOPERATIONTYPEPALLETTYPE` (op↔palet tipi). Migration 22 → 54 tablo.
- ⚡ API: statü yönetimi (/api/statuses) + palet tipi (/api/pallet-types) açıldı; 4 op-link route (operationTypeId filtreli CRUD, /api/operation-type-{statuses,locations,reasons,pallet-types}).
- 🎨 UI: Uyarlamalar/Operasyon altına 6 ekran (Statüler, Palet Tipleri, Op↔Statü/Lokasyon/Neden/Palet Tipi) — ref-form'lu, StokBar "Operasyon" menüsü gibi.
- 🌱 Seed: QUARANTINE/REJECTED statü, GR→AVAILABLE statü geçişi, GR→EUR palet tipi.
- 🔧 **MAL KABUL FIX:** documents.ts — INBOUND satırda hedef statü verilmemişse op-tipinin statü geçişinden TÜRETİLİR. Önceden mal kabul belgesi /complete'te 409 alıyordu (directed putaway statüyü doldurmuyordu); artık statü op-konfigden gelip stok giriyor.

## Doğrulama
- typecheck ✅ · migrate 22 ✅ · seed ✅ · OPCONFIG E2E 10/10 ✅ (op-link CRUD + RBAC + **mal kabul statü türetme→complete→stok**) · smoke ✅ · UI build ✅
- eval: 6 yeni menü öğesi render, op↔statü ekranı seed satırıyla geldi.

## Not
Bu, demo provasındaki #2 bulguyu (mal kabul statü) doğru mimariyle çözdü. Geriye demo riski olarak #1 (Docker/DB kararsızlığı) kaldı.
