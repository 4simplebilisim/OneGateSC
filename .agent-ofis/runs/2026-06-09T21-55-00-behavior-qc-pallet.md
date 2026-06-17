---
title: "Config → davranış (batch 3): qualityControl → KARANTİNA + sameUsePallet"
type: run
status: completed
date: 2026-06-09
run_id: 2026-06-09T21-55-00-behavior-qc-pallet
manager: Tech Lead
topics: [qualityControl, kalite, karantina, palet, sameUsePallet, davranis]
tags: [run/completed, backend, correctness]
related_runs: [[runs/2026-06-09T21-35-00-behavior-serial]]
---

# Run — qualityControl + sameUsePallet (batch 3)

## Bağlananlar
- **qualityControl** → mal kabulde (INBOUND) hedef statü otomatik **KARANTİNA** türetilir (op-statü geçişi yerine). Movement'ta bu durumda op-statü doğrulaması atlanır.
- **sameUsePallet** → kapalıysa, girişte zaten kullanımda olan palete (stoğu olan) ekleme engellenir (409). Açıksa izin (konsolidasyon).

## Doğrulama
- typecheck ✅ · QP E2E 4/4 (qualityControl→KARANTİNA türetildi + tamamlandı; kullanımda palet+false→409; true→izin) ✅ · smoke ✅

## Toplam bağlanan davranış: 8
reasonRequired · pasif ürün · op-statü geçişi · lokasyon kapasite · seri=1 · seri tekrar · qualityControl→KARANTİNA · sameUsePallet

## Kalan
- reverseOperationTypeId (ters/iptal belge op tipi)
- batchAssignment · materialBasedCollection · materialBasedQtyEdit
- detailLocationToCoverage · op↔palet tipi doğrulaması
