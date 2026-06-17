---
title: "DB kalıcılık (Docker AutoStart) + WMS kapsam/durum raporu"
type: run
status: completed
date: 2026-06-09
run_id: 2026-06-09T16-00-00-db-persist-status
manager: Tech Lead
topics: [docker, db, durum-raporu, akis-semasi, wms]
tags: [run/completed, infra, rapor]
related_runs: [[runs/2026-06-09T15-45-00-suggest-receipt]]
---

# Run — DB kalıcılık + WMS durum raporu

İki adım sırayla (kullanıcı onaylı).

## 1) DB kalıcılık
- `docker-compose.yml`'de `restart: unless-stopped` zaten vardı (container kendini geri açar).
- Asıl sorun: **Docker Desktop'ın kendisi** turlar arası kapanıyordu → `settings-store.json` `"AutoStart": false → true`. Artık Docker Desktop oturum açılışında otomatik başlar; container restart policy ile DB otomatik gelir.

## 2) WMS kapsam/durum raporu
- `docs/onegate-wms-durum-raporu.md` — metrikler (46 tablo · ~135 endpoint · 20 migration · 25+ UI ekran), modül olgunlukları (genel **~%87**), 4 uçtan uca akış, kapsam-dışı/ertelenenler.
- Görsel: Visio-tarzı uçtan uca akış şeması (mal kabul / sevk / iş emri; yeşil=çalışıyor, teal=yeni eklenen) — chat'te render edildi.

## Doğrulama
- API/UI/DB ayakta (200/200/up) doğrulandı.

## Sonraki (öneri)
- [ ] UI belge oluşturma ekranı (suggest önizleme)
- [ ] Sayım/kalite UI · raporlar dashboard
- [ ] (ileride) satınalma DB birleştirme · AI
