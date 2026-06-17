---
title: "Operasyon menüsü StokBar'a (ikisi birden) + 11 operasyon config tablosu"
type: run
status: completed
date: 2026-06-12
run_id: 2026-06-12T13-45-00-operasyon-config
manager: Tech Lead
crew: [[crew/backend-engineer]], [[crew/frontend-engineer]]
topics: [operasyon, config, stokbar, menu, schema, legacy, tolerans, donusum, toplama]
tags: [run/completed, backend, frontend]
related_runs: [[runs/2026-06-12T13-05-00-uyarlamalar-duzen]]
aliases: ["operasyon-config", "operation-config-tables"]
---

# Run — Operasyon config (ikisi birden + 11 tablo)

## Karar (kullanıcı: "ikisi birden")
Operasyon Tipleri **sekmeli editör KALDI** + op↔X bağlantılarına **düz menü erişimi GERİ** + StokBar Operasyon grubundaki **11 eksik config tablosu** eklendi.

## Yeni tablolar (hepsi legacy TBLSB* karşılığı, sadık)
Neden Kategori · Operasyon Grup Bağlantı · Tolerans · Yasaklı Ürün · Dönüşüm · Sıralı Operasyon · Otomatik Ref. Kontrollü Belge · Toplu İşlem Bağlantı · Ürün Ek Grup Bağlantı · Ürün Bazında Toplama · Sefer Bazında Toplama.

Backend: `operationConfig.ts` — **paylaşılan simpleCrud** (documentTypes.ts'ten export). 11 route, companyId düz Int (tenant app-katmanı). Frontend: Operasyon grubu artık **17 öğe** (sekmeli Op Tipleri + düz bağlantı + 11 yeni); formlar ref select'lerle.

## Doğrulama
- backend tsc ✅ · migrate (11 tablo) ✅ · 11 endpoint 200 / create 201 (FK) / delete 204 ✅ · web tsc/build ✅ · canlı (Operasyon 17 öğe; auto-ref form 4 ref+2 switch) ✅ · smoke ✅

## Kararlar / kapsam notu
- companyId bu config tablolarında **relation yok, düz Int** (tenant app-katmanı).
- byte/bağlantı-tipi alanları **sayı** olarak — legacy semantik icat edilmedi.
- **Tolerans detay** alt-tablosu (TBLSBOPERASYONTIPITOLERANSDETAY) ertelendi.

## Sonraki
- Diğer Uyarlamalar grupları (Saha Tanımlamaları/El Terminali/Entegrasyon/Üretim/Kalite Yönetimi/Rota) · belge yaşam döngüsü WIRING · gerçek etiket basım · bağlantı-tipi alanlarını select+ref'e çevir (semantik netleşince)
