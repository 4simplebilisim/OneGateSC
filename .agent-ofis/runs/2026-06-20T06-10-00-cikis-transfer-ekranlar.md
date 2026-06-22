---
title: "Çıkış + Transfer eksik ekranlar (StokBar parite)"
type: run
date: 2026-06-20
topics: [belge, ui, cikis, transfer, stok-cikis, etiketleme, isatama]
status: completed
tags: [#run/completed, #belge, #ui]
aliases: [stok-cikis, cikis-etiketleme]
---

# Çıkış + Transfer menüleri Giriş seviyesine

İstek: Çıkış/Transfer eksik ekranlarını StokBar'a göre tamamla (Çıkış görseli esas).

## Yapıldı
- **StockEntry** yöne göre genelleştirildi (`direction` prop) → Stok Giriş (INBOUND) + **Stok Çıkış** (OUTBOUND): ops yöne göre, lokasyon hedef/kaynak, complete stok yazar/düşer. Çıkışta **sourceStatusId=AVAILABLE** otomatik (movement.ts kaynak statü ister).
- **EntryLabeling** yöne göre genelleştirildi → Giriş Etiketleme + **Çıkış Etiketleme** (belge yöne göre süzülür).
- **İş Atama** Çıkış + Transfer'e bağlandı (`document-assignments-out`/`-tr`, apiName=document-assignments → ortak liste/form).
- Çıkış menü (8): Belge·Gözlem·**Çıkış Etiketleme**·Çıkış Öneri Listesi·Toplu İşlem·**Stok Çıkış**·**İş Atama**·Yükleme Takip. Transfer (5): Belge·Gözlem·Rezervasyon·Stok Operasyon·**İş Atama**.

## Doğrulama
- tsc backend+web ✓ · smoke PASSED ✓
- E2E: **Stok Çıkış** GI+sourceStatus → stok 5→4 (−1), reverse→5 ✓ (ilk deneme sourceStatusId eksik 409 → düzeltildi). Test verisi temizlendi.
- UI: Stok Çıkış (Operasyon Çıkış, Kaynak Lok) · Çıkış Etiketleme (Çıkış Belgesi) · Çıkış/Transfer İş Atama listeleri render ✓
- NOT: Vite bir ara GenericList HMR "failed reload" verdi (düzenleme-arası bayat); tam reload sonrası temiz, tsc geçiyor.

## Notlar
- Çıkışta movement.ts: kaynak lokasyon + **kaynak statü** zorunlu → StockEntry OUTBOUND otomatik AVAILABLE geçer.
- İş Atama 3 yönde ortak liste (document-assignments, yön filtresi yok) — ileride belge-yön süzgeci eklenebilir.
- Transfer "Stok Transfer" eklenmedi (Stok Operasyon + Rezervasyon zaten var).
