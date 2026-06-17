---
title: "Operasyon Tipi zengin konfig — WMS'in kalbi (30 alan, 5 section'lı form)"
type: run
status: completed
date: 2026-06-09
run_id: 2026-06-09T20-25-00-operation-type-config
manager: Tech Lead
topics: [operasyon-tipi, konfig, davranis-flag, form, section]
tags: [run/completed, db, backend, ui]
related_runs: [[runs/2026-06-09T18-30-00-operation-config]]
---

# Run — Operasyon Tipi zengin konfigürasyon

Kullanıcı: "operasyon tanımı işin kalbi" — StokBar SbOperasyonTipi ekranı (74 kol, 5 section'lı dev form).

## Yapıldı
- 💾 TBLOPERATIONTYPE'a **30 kolon** (legacy 74'ün anlamlı çekirdeği): documentType enum + 5 ref (ters op, op/grup sayaç, iptal lokasyon, log gün) + **24 davranış flag'i** (BYT*): isControlled, qualityControl, batchAssignment, reasonRequired/InHeader, equivalentApplication, materialBased*, integration, approvedDocUpdate, bulkSend, readBased*, logging/logControl, grouping, sameUsePallet/Serial, passiveProductUse, palletBreaking, originalQtyUpdate, reserveTransfer, detailLocationToCoverage. Migration 24 (SSP metin alanları atlandı).
- ⚡ operationTypes route: createSchema genişledi + GET /:id + PATCH + DELETE eklendi.
- 🎨 `OperationTypeForm.tsx`: **5 section'lı** (Genel/Stok Hareketi/Entegrasyon/Kontrol-İşlem/Stok İşlemleri) zengin form — StokBar dialoğu birebir. operation-types create/edit bu forma bağlandı; liste Yeni/Düzenle/Sil.

## Doğrulama
- typecheck ✅ · OPTYPE E2E 6/6 (flag'ler/documentType/logGün kaydedildi, GET/:id, PATCH) ✅ · smoke ✅ · UI build ✅
- eval: 5 section, 26 switch, 37 alan render; Kontrollü İşlem/Kalite/Ters Operasyon/Belge Tipi hepsi var.

## Not
24 davranış flag'i tanım olarak duruyor; davranışın stok hareketine BAĞLANMASI (ör. qualityControl→QC zorunlu, sameUsePallet kontrolü) ayrı entegrasyon işi.
