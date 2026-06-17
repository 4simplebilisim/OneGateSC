---
title: "Liste FK çözümleme — id yerine isim (formConfig ref'lerinden)"
type: run
status: completed
date: 2026-06-12
run_id: 2026-06-12T15-55-00-list-ref-resolve
manager: Tech Lead
crew: [[crew/frontend-engineer]]
topics: [liste, fk, ref, okunabilirlik, genericlist]
tags: [run/completed, frontend]
related_runs: [[runs/2026-06-12T15-40-00-stok-statu-kalite]]
---

# Run — Liste FK çözümleme

## Yapılan (kullanıcı: "stok statü gibi id yerine karşılığını göster")
- GenericList artık kaynağın `FORM_CONFIG`'indeki `type:'ref'` alanlarını okur → her `refResource` için `id → "kod — ad"` map'i yükler → kolonu çözümlü isimle render eder (çıplak id kalmaz).
- Kolon başlıkları da `formConfig` label'ından (`operationTypeId` → "Operasyon Tipi", `businessPartnerId` → "Cari").
- Stok statü rozeti (önceki run) korunur.

## Doğrulama
- web tsc ✅ · build ✅ · canlı: operation-tolerances başlıkları "Operasyon Tipi/Cari…"; satır **"TR — Transfer"** (id değil) ✅ · smoke ✅

## Etki
Tolerans · Sıralı Operasyon · Toplu İşlem · tüm op/koşul/yönlendirme config listeleri artık okunur (ek backend include gerekmedi).

## Sonraki
- StokBar kalan Uyarlamalar grupları · belge durumu WIRING · davranış bağlama
