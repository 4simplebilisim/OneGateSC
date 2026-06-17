---
title: "Kalite = stok statü kolonu — doğrulandı + renkli rozetle görünür"
type: run
status: completed
date: 2026-06-12
run_id: 2026-06-12T15-40-00-stok-statu-kalite
manager: Tech Lead
crew: [[crew/frontend-engineer]]
topics: [kalite, stok, statu, gorunurluk, model]
tags: [run/completed, frontend]
related_runs: [[runs/2026-06-12T15-25-00-kalite-cikar]]
---

# Run — Kalite = stok statü kolonu

## Netleştirme (kullanıcı)
İki ayrı eksen:
- **Belge durumu** (TBLDOCUMENTSTATUS): Bekliyor→Toplanıyor→Onay Bekliyor→Onaylandı — belge yaşam döngüsü
- **Stok statüsü** (TBLSTOCK.statusId → TBLSTATUS): AVAILABLE/QUARANTINE/BLOCKED/DAMAGED — **KALİTE buradan**

## Doğrulama (zaten yerinde)
- TBLSTOCK.statusId var; hareket motoru her yazımda source/targetStatusId ayarlar; op-statü geçişleri; qualityControl→QUARANTINE.

## Yapılan (görünürlük)
- Stok route zaten `status:{id,code}` döndürüyordu ama liste çıplak `statusId` (sayı) gösteriyordu.
- GenericList genel iyileştirme: `status:{code}` ilişkisi varsa **'Statü' renkli rozet** kolonu, çıplak statusId gizlenir. STATUS_COLOR'a AVAILABLE(yeşil)/QUARANTINE(sarı)/BLOCKED(kırmızı)/DAMAGED.

## Doğrulama
- web tsc ✅ · build ✅ · canlı: /stock 'Statü' kolonu, AVAILABLE yeşil rozet, çıplak statusId yok ✅ · konsol temiz

## Sonraki
- **Belge durumu yaşam döngüsü WIRING** (documentStatusId: Bekliyor→Toplanıyor→Onay Bekliyor→Onaylandı) · gerçek etiket basım
