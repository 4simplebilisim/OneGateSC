---
title: "Config → davranış (batch 4): op↔neden + op↔palet tipi doğrulaması"
type: run
status: completed
date: 2026-06-09
run_id: 2026-06-09T22-15-00-behavior-oplinks
manager: Tech Lead
topics: [op-neden, op-palet-tipi, dogrulama, davranis, movement]
tags: [run/completed, backend, correctness]
related_runs: [[runs/2026-06-09T21-55-00-behavior-qc-pallet]]
---

# Run — op↔neden + op↔palet tipi doğrulama (batch 4)

Operasyon konfig link'lerini (op↔neden, op↔palet tipi) davranışa bağladık.

## Bağlananlar (movement engine)
- **op↔neden**: operasyona bağlı neden listesi varsa, belge nedeni bunlardan biri olmalı (değilse 409). Liste yoksa serbest.
- **op↔palet tipi**: operasyona bağlı palet tipi listesi varsa, satır paletinin tipi uygun olmalı (değilse 409). Liste yoksa serbest.

## Doğrulama
- typecheck ✅ · OPL E2E 4/4 (bağlı olmayan neden→409, bağlı→200; izinsiz palet tipi→409, izinli→200) ✅ · smoke ✅

## reverseOperationTypeId — ertelendi
reverseDocument şu an in-place (yeni belge üretmiyor). reverseOp düzgün bağlanması için "ters belge üretme" pattern'i gerek (büyük değişiklik) — sonraya bırakıldı.

## Toplam bağlanan davranış: 10
reasonRequired · pasif ürün · op-statü geçişi · lokasyon kapasite · seri=1 · seri tekrar · qualityControl→KARANTİNA · sameUsePallet · op↔neden · op↔palet tipi

## Kalan
- reverseOperationTypeId (ters belge pattern'i)
- batchAssignment · materialBasedCollection/QtyEdit · detailLocationToCoverage
