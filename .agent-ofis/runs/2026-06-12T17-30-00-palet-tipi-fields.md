---
title: "Palet Tipi tam alan seti (legacy TBLSBPALETTIPI'ye sadık)"
type: run
status: completed
date: 2026-06-12
run_id: 2026-06-12T17-30-00-palet-tipi-fields
manager: Tech Lead
crew: [[crew/backend-engineer]], [[crew/frontend-engineer]]
topics: [palet, palet-tipi, schema, legacy, stok-takip, palet-ici-palet]
tags: [run/completed, backend, frontend]
related_runs: [[runs/2026-06-12T17-00-00-tab-konsolidasyon]]
aliases: ["palet-tipi-alanlar"]
---

# Run — Palet Tipi tam alan seti

## Bağlam (kullanıcı: "palet tipini yanlış kurmuşsun")
StokBar Palet Tipi ekranını gösterdi — bizde Tesis, Tip(Tek Ürün/Karma), palet-içi-palet ve transfer bayrakları eksikti.

## Eklenen (legacy TBLSBPALETTIPI'ye sadık)
- **mixingType** enum `PalletMixing` (Tek Ürün Palet / Karma Palet = BYTTIP) — paletin stok-takip yöntemi
- **facilityId** (Tesis = LNGDISTKOD)
- **palet içi palet + transfer bayrakları**: partialUse(parçalı kullanım) · newNoOnEdit · breakParentPallet(üst palet bozulsun) · breakPartialPallet(parçalı palet bozulsun) · breakPalletOnTransfer · removeFromPalletOnTransfer · keepFullPalletOnTransfer · logging · logControl · logControlWarningType

Korunan: code(=palet no öneki/prefix) · palletNoLength(uzunluk) · sequenceId(sayaç) · isDivisible(bölünebilir) · batchControl · singleProductControl. `kind` (bizim fiziksel tür icadımız) opsiyonel/gizli.

Form (formConfig pallet-types): Öneki/Tanım/Tesis ref/Sayaç ref/Uzunluk/**Tip select** + 13 bayrak → StokBar modaliyle birebir.

## Doğrulama
- backend tsc ✅ · migrate ✅ · create (tüm alanlar persist) ✅ · web tsc/build ✅ · canlı (6 alan + Tip select + 13 switch) ✅ · smoke ✅

## Sonraki
- Palet NO üretimi (prefix+sayaç+uzunluk) DAVRANIŞ · belge durumu WIRING
