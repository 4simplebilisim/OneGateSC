---
title: "İşlemler menüsü StokBar domain grupları + gizli işlem ekranları (Sayım/Kalite/Fatura)"
type: run
status: completed
date: 2026-06-12
run_id: 2026-06-12T15-10-00-islemler-stokbar
manager: Tech Lead
crew: [[crew/frontend-engineer]], [[crew/qa-engineer]]
topics: [islemler, menu, stokbar, sayim, kalite, fatura, detay-aksiyon]
tags: [run/completed, frontend]
related_runs: [[runs/2026-06-12T14-30-00-kosul-yonlendirme-sayim]]
---

# Run — İşlemler StokBar + gizli işlem ekranları

## Yapılan (kullanıcı: "burada da eksiklerimiz var" — İşlemler menüsü)
- **İşlemler menüsü** StokBar domain gruplarına: **Belge · Sayım · Palet · Kalite · İş Emri · Stok · Sipariş · Lojistik · Finans** (9 grup).
- Backend'i olup menüde olmayan **3 işlem ekranı yüzeye çıkarıldı**: `stock-counts` (Sayımlar), `quality-inspections` (Kalite Muayeneleri), `invoices` (Faturalar) — **liste + detay + yaşam döngüsü aksiyonları**.
- `detailActions` tipi **body+key** destekleyecek genişletildi → quality decide `{pass:true/false}` (Onayla/Reddet); busy state `key` ile ayrışır.
- `GenericDetail` status'u `record.status ?? record.result`'a düşürür (quality `result` alanı kullanır); STATUS_COLOR yeni statülerle (COUNTING/PENDING/PASSED/FAILED/ISSUED/PAID).
- Aksiyonlar: stock-count **complete/cancel**, quality **decide onayla/reddet**, invoice **kes/iptal**.

**YENİ TABLO YOK** — mevcut backendler bağlandı.

## Doğrulama
- web tsc ✅ · build ✅ · canlı: İşlemler 9 grup ✅; quality muayene oluştur→detayda Onayla/Reddet→**decide {pass} backend'e ulaştı** (dönen 409 "seri gerekli" = hareket motoru kuralı, wiring doğru) ✅ · smoke ✅

## Karar
- İşlemler domain bazlı (StokBar). create ekranları (Sayım/Kalite/Fatura) ertelendi — önce list+detail+aksiyon.

## Sonraki
- Sayım/Kalite/Fatura zengin CREATE ekranları · Giriş/Çıkış/Transfer ayrı belge girişleri · Üretim/Görsel Depo/Entegrasyon · belge yaşam döngüsü WIRING · gerçek etiket basım
