---
title: "Op-bağlantı ortak deseni (B) — Tesis + LinkScope (Hepsi/Grup/Belirli) + Kod"
type: run
status: completed
date: 2026-06-12
run_id: 2026-06-12T19-30-00-op-baglanti-scope
manager: Tech Lead
crew: [[crew/backend-engineer]], [[crew/frontend-engineer]]
topics: [operasyon-baglanti, linkscope, tesis, enum, bulkaction, faithful]
tags: [run/completed, backend, frontend]
related_runs: [[runs/2026-06-12T18-50-00-optype-kategori-kontrol-tesis]]
aliases: ["op-baglanti-scope", "linkscope"]
---

# Run — Op-bağlantı ortak deseni (B)

## Bağlam (kullanıcı 5 StokBar bağlantı modalını gösterdi, "a"=tümü)
Tüm op-bağlantılarında ortak omurga: **Tesis + Bağlantı Tipi (Hepsi/Grup/Belirli) + Kod**. Bizimkiler çıplak sayı + Tesis yoktu.

## Yapılan
- **Enum**: `LinkScope` (ALL/GROUP/SPECIFIC = Hepsi/Grup/Belirli) + `BulkActionType` (Kontrollü Toplu İşlem/Toplu İşlem/Rezervasyon/Seçimli Belge/Batch Değiştirme).
- **10 op-bağlantı tablosu** (Statü/Lokasyon/Neden/Palet + Tolerans/Yasaklı/Dönüşüm/Sıralı/Toplu/Grup): `facilityId` (Tesis); çıplak link-tipi Int → `LinkScope`; cari/malzeme/lokasyon için **scope + ref** (partners/products/locations) çiftleri.
- Reasons → `reasonCategoryId` (Neden Kategori). Lokasyon → source/target `LinkScope` + `terminalFix` bayrakları. Bulk → `BulkActionType`.
- Migration: Int→enum **DROP+ADD** (config tabloları boş, güvenli).
- **LinkTab**'e `select` (enum) desteği; OperationTypeForm field defs ortak `TESIS/CARI/MALZEME` deseniyle yeniden; sequential formu `SCOPE_OPTS`.

## Doğrulama
- backend tsc ✅ · migrate (LinkScope+BulkActionType, 10 tablo) ✅ · create op-status (facility+cariLinkType ALL+materialLinkType GROUP persist) ✅ · web tsc/build ✅ · canlı: Statü sekmesi formu = Tesis/Cari Bağ.(scope)/Cari/Malzeme Bağ.(scope)/Ürün/Kaynak-Hedef Statü (StokBar modali) ✅ · smoke ✅

## Karar
- Tek paylaşılan `LinkScope` enum tüm link-tiplerinde. link-id = "belirli" entity ref'i (basitleştirme; Grup scope'ta da aynı ref).

## Sonraki
- DAVRANIŞ: scope+kod kurallarının hareket motorunda enforce edilmesi · Faz1: palet no üretimi + KARANTİNA
