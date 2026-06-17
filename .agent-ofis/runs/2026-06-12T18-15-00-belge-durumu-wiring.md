---
title: "DAVRANIŞ Faz 1 — belge durumu yaşam döngüsü WIRING (Bekliyor→Onaylandı)"
type: run
status: completed
date: 2026-06-12
run_id: 2026-06-12T18-15-00-belge-durumu-wiring
manager: Tech Lead
crew: [[crew/backend-engineer]], [[crew/frontend-engineer]], [[crew/qa-engineer]]
topics: [belge-durumu, yasam-dongusu, wiring, davranis, document-status, lifecycle]
tags: [run/completed, backend, frontend, behavior]
related_runs: [[runs/2026-06-12T12-15-00-belge-durum]]
aliases: ["belge-durumu-wiring", "document-lifecycle"]
---

# Run — Belge durumu yaşam döngüsü WIRING (davranış faz 1)

## Bağlam
Parite ~bitti, "tanım var davranış yok" borcu büyüktü. Önerilen ilk davranış: belge durumu yaşam döngüsünü gerçek akışa bağlamak (operasyonun belkemiği, en görünür).

## Yapılan
- **Şema**: `TBLDOCUMENT.documentStatusId` (→ Belge Durumu master) + ilişki; migration.
- **İç enum korundu** (DRAFT/CONFIRMED/COMPLETED — motor ona bağlı), üstüne kullanıcı-yüzlü **Belge Durumu** map'lendi (`src/lib/documentStatus.ts` → `docStatusId` firma bazında çözer):
  - create → **Bekliyor** (BKL)
  - yeni `start-picking` "Toplamaya Başla" → **Toplanıyor** (TPL)
  - confirm "Onaya Gönder" → **Onay Bekliyor** (OBK)
  - complete "Onayla" → **Onaylandı** (ONY) — stok işlenir, **motor kuralları enforce**
  - cancel/reverse → **İptal** (IPT)
- GET list/detail `documentStatus` include eder.
- **UI**: detailActions (Toplamaya Başla/Onaya Gönder/Onayla); belge listesinde + detay başlığında **master renginde rozet** (ham enum gizli).

## Doğrulama
- backend tsc ✅ · migrate ✅ · **API uçtan uca**: Bekliyor→Toplanıyor→Onay Bekliyor→Onaylandı(stok)→reverse→İptal ✅; complete'te seri kuralı (qty=1) **gerçekten devreye girdi** ✅ · web tsc/build ✅ · canlı: liste renkli kolon, detay rozet+aksiyon, UI Toplamaya Başla→Toplanıyor ✅ · smoke ✅

## Karar
- İç enum + üstüne Belge Durumu (geriye uyumlu); Toplanıyor için "Toplamaya Başla" aksiyonu (tam okutma UI'ı henüz yok).

## Sonraki (Faz 1 devamı)
- **Palet no üretimi** (öneki+sayaç+uzunluk) · **KARANTİNA akışı** (qualityControl→stok statüsü = kalite) · PO/SO/İş Emri için de döngü
