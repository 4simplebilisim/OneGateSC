---
title: "Sayım + Palet ek ekranlar (StokBar parite)"
type: run
date: 2026-06-20
topics: [sayim, palet, ui, schema, isatama]
status: completed
tags: [#run/completed, #ui, #schema]
aliases: [kontrol-sayim, palet-bildirim, sayim-isatama, palet-tarihce]
---

# Sayım + Palet eksik ekranlar

İstek: "hepsini sırayla" — İşlemler menü parite tamamlama. Sayım/Palet'in StokBar ekranları.

## Yapıldı
- **Sayım Onayı** (menü) — stock-counts status=COUNTING (onay kuyruğu; detayda complete). Sayım yaşam-döngüsü tam: Girişi·Fark·Onayı·Onayı İptal.
- **6 yeni tablo** (legacy kolonlara sadık, migration `20260620064500`): `TBLCOUNTASSIGNMENT` (Sayım İş Atama), `TBLCONTROLCOUNT`+`...LINE` (Kontrol Sayım başlık+satır), `TBLPALLETNOTIFICATION`+`...LINE` (Palet Bildirim başlık+satır), `TBLPALLETHISTORY` (Palet Tarihçe).
- Backend [[src/routes/countPalletScreens.ts]] (6 simpleCrud; line route'ları ownerField filtreli).
- Menü: Sayım +Kontrol Sayım +Sayım İş Atama · Palet +Palet Bildirim +Palet Tarihçe(observe).
- UI: header'lar generic form/list; **satırlar** için yeni generic [[web/src/pages/OwnerLines.tsx]] (FORM_CONFIG'ten alan üretir, ownerField otomatik) — "Satırlar" butonu (Kontrol Sayım + Palet Bildirim).
- FK çözüm: stockCountId→stock-counts (+countNo fallback).

## Doğrulama
- tsc backend+web ✓ · prisma validate ✓ · smoke PASSED ✓
- E2E: Kontrol Sayım başlık+satır (filtre), Sayım İş Atama, Palet Bildirim başlık+satır, Palet Tarihçe → hepsi 201/200. Test verisi temizlendi.
- UI: Sayım menü(6)+Palet menü(4) render, Kontrol Sayım Satırları sub-page (PRD001/TRKSER ref çözüldü, sistem10/sayılan9) ✓

## Notlar / Kalan
- "Önce sor" kuralı: tablolar legacy katalogda VAR (uydurma değil) → kolonlarına sadık kuruldu.
- **Sayım Fark Rapor** atlandı (Sayım Fark ile örtüşüyor).
- Palet Tarihçe şu an manuel/boş — populasyon ileride hareket motorundan (split/move hook).
- Palet Bildirim "Çıkan Palet" (TBLSBPALETBILDIRIMCIKANPALET) eklenmedi.
