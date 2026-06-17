---
title: "Operasyon Tipi çekirdek düzeltme — Kategori+Sayım, Tesis, Kontrollü İşlem enum"
type: run
status: completed
date: 2026-06-12
run_id: 2026-06-12T18-50-00-optype-kategori-kontrol-tesis
manager: Tech Lead
crew: [[crew/backend-engineer]], [[crew/frontend-engineer]]
topics: [operasyon-tipi, kategori, kontrollu-islem, tesis, enum, stokbar]
tags: [run/completed, backend, frontend]
related_runs: [[runs/2026-06-12T17-00-00-tab-konsolidasyon]]
---

# Run — Operasyon Tipi çekirdek (A)

## Bağlam (kullanıcı StokBar Operasyon Tipi ekranlarını gösterdi)
Çekirdekte 3 eksik: Kategori'de Sayım yok, Tesis yok, Kontrollü İşlem boolean (3-değerli olmalı).

## Yapılan (A)
- **Kategori**: `MovementDirection` enum'a **COUNT** (Sayım) → Giriş/Çıkış/Transfer/Sayım.
- **Tesis**: `facilityId` (op-type firma+tesis kapsamı).
- **Kontrollü İşlem**: `isControlled` boolean **kaldırıldı**, yerine `ControlMode` enum (**Kontrolsüz / Kontrollü / Referans Kontrollü** = legacy BYTKONTROLLU).
- Form: Genel'e Tesis + Kategori(Sayım); Stok Hareketi'ne Kontrollü İşlem select.

## Doğrulama
- backend tsc ✅ · migrate ✅ · create (COUNT/REFERENCE_CONTROLLED/facility persist) ✅ · web tsc/build ✅ · canlı (Genel: …Tesis…Kontrollü İşlem) ✅ · smoke ✅

## Not
- Motor `direction`'ı INBOUND/OUTBOUND/INTERNAL ile kullanıyor; COUNT eklendi ama sayım belgesi motor davranışı sonra (sayımlar stock-counts akışı).

## KALAN (B — kullanıcıya öneri)
Tüm op-bağlantılarında (Statü/Lokasyon/Neden/Palet/Tolerans/Yasaklı/Sıralı/Toplu) ortak desen: **Tesis + Cari/Malzeme/Lokasyon Bağlantı Tipi (Hepsi/Grup/Belirli enum) + Kod**. ~10 tablo → analiz+öneriyle, körlemesine değil.
