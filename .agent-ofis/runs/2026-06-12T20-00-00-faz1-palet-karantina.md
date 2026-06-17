---
title: "DAVRANIŞ Faz 1 tamam — palet no üretimi + KARANTİNA akışı (kalite=stok statüsü)"
type: run
status: completed
date: 2026-06-12
run_id: 2026-06-12T20-00-00-faz1-palet-karantina
manager: Tech Lead
crew: [[crew/backend-engineer]]
topics: [palet-no, karantina, kalite, stok-statusu, davranis, faz1]
tags: [run/completed, backend, behavior]
related_runs: [[runs/2026-06-12T18-15-00-belge-durumu-wiring]]
---

# Run — Faz 1 devamı (palet no + KARANTİNA)

## Yapılan
- **PALET NO ÜRETİMİ**: `pallets` POST artık palet no'yu **palet tipinin öne­ki (code) + sayaç değeri (palletNoLength'e sıfır-dolgulu)** ile üretiyor (önceden sadece sayacın formatını kullanıyordu). → **PX000001 / PX000002**. Palet Tipi alanları (code=prefix, palletNoLength) artık anlamlı.
- **KARANTİNA AKIŞI (kalite = stok statüsü)** — uçtan uca doğrulandı:
  - Giriş (zaten bağlıydı): `op.qualityControl` açıksa mal kabulde hedef statü otomatik **QUARANTINE**. E2E: qualityControl GR → complete → stok **QUARANTINE**.
  - Onay: INTERNAL "Kalite Onay" op + op-statü geçişi QUARANTINE→AVAILABLE → transfer belgesi tamamlanınca stok **QUARANTINE→AVAILABLE**. Motor zaten destekliyor; E2E doğrulandı.

## Sonuç — tam mal-kabul→kalite hikayesi
Belge: Bekliyor → … → **Onaylandı** (belge durumu) · Stok: **QUARANTINE → AVAILABLE** (kalite = stok statüsü). İki eksen birlikte çalışıyor.

## Doğrulama
- backend tsc ✅ · palet no (PX000001/2) ✅ · KARANTİNA giriş (stok QUARANTINE) ✅ · KARANTİNA onay (stok AVAILABLE) ✅ · smoke ✅

## Sonraki
- (ops.) paletli mal kabulde tamamlamada otomatik palet+no üret · scope kurallarının motorda enforce'u · PO/SO/İş Emri belge durumu döngüsü
