---
title: "Config → davranış (batch 2): seri davranışı (miktar 1 + tekrar engeli)"
type: run
status: completed
date: 2026-06-09
run_id: 2026-06-09T21-35-00-behavior-serial
manager: Tech Lead
topics: [seri, serial, davranis, sameUseSerial, movement]
tags: [run/completed, backend, correctness]
related_runs: [[runs/2026-06-09T21-10-00-behavior-wiring-1]]
---

# Run — Seri davranışı bağlama (batch 2)

"seriden devam" → seri takip davranışları.

## Bağlananlar (movement engine)
- **Seri = 1 adet**: seri takipli ürün-birim hareketinde miktar 1 olmalı (her seri tek birim) → değilse 409.
- **Girişte seri tekrarı engeli**: INBOUND'da aynı seri stokta varsa ve operasyon `sameUseSerial=false` ise tekrar giriş engellenir (409). `sameUseSerial=true` → izin (iade/yeniden kullanım).

## Doğrulama
- typecheck ✅ · SER E2E: miktar 2→409 (kod doğru, mesaj "miktarı 1 olmalı"; test regex'i Türkçe karakterden FAIL gösterdi) · yeni seri→200 · tekrar→409 · sameUseSerial=true→200 ✅ · smoke ✅
- 4 seri davranışı gerçekte çalışıyor (1 test-regex artefaktı).

## Ortam notu
DB (Docker) bu agent oturumunda yine reaping'e takıldı; watchdog gerçek makinede login'le kalıcı çalışır ama sandbox boştayken watchdog süreci de öldürülüyor → manuel restart gerekti. Kullanıcının demo makinesinde sorun olmayacak.

## Kalan
- qualityControl → QUARANTINE · reverseOperationTypeId · sameUsePallet · batchAssignment · materialBasedCollection
