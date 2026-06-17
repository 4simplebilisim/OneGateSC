---
title: "Lokasyon Kapasite (StokBar SbLokasyonKapasite) — kapasite kuralı + 18 alanlı form"
type: run
status: completed
date: 2026-06-09
run_id: 2026-06-09T20-00-00-location-capacity
manager: Tech Lead
topics: [lokasyon, kapasite, kural, boyut, agirlik, tolerans]
tags: [run/completed, db, backend, ui]
related_runs: [[runs/2026-06-09T19-40-00-location-bulk]]
---

# Run — Lokasyon Kapasite

Kullanıcı StokBar "Lokasyon Kapasite" ekranını gösterdi (dolu grid + ekle/izle/düzelt 18 alanlı dialog). Legacy TBLSBLOKASYONKAPASITE (22 kol) birebir.

## Yapıldı
- 💾 `TBLLOCATIONCAPACITY` (legacy birebir) + `CapacityMessageType` enum. Lokasyon/grup × malzeme(ürün/grup/Hepsi) için: miktar+birim, palet miktarı, tolerans miktar+birim, en/boy/yükseklik/yerleştirme yüksekliği+boyut birimi, ağırlık+birim, mesaj tipi (Hata/Uyarı), gözlere dağıtılsın. Migration 23 → 55 tablo.
- ⚡ `/api/location-capacities` CRUD.
- 🎨 UI: Tanımlamalar/Lokasyon altına "Lokasyon Kapasite" — **18 alanlı form** (StokBar dialoğu birebir) + dolu grid (auto kolonlar) + DELETE.

## Doğrulama
- typecheck ✅ · CAP E2E 5/5 (tüm alanlar, Hepsi/null malzeme, RBAC 403) ✅ · smoke ✅ · UI build ✅
- eval: form 18 alan, Lokasyon/Malzeme Bağ. Tipi · Palet Miktarı · Yerleştirme Yüks. · Mesaj Tipi · Gözlere Dağıtılsın hepsi render.

## Not
Kapasite kuralının stok hareketinde ZORLANMASI (aşımda Hata/Uyarı) henüz yok — şu an tanım. İstenirse movement'a kontrol eklenebilir (lot/seri zorlaması gibi).
