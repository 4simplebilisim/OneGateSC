---
title: "WMS legacy yeniden tasarım — yaklaşım ve 4 mimari karar"
type: decision
status: accepted
date: 2026-06-08
topics: [schema, wms, migration, stok, multi-tenant]
tags: [decision/accepted, db, wms, legacy]
aliases: [wms-redesign, legacy-mapping, sb-wms]
related_runs: [[runs/2026-06-08T15-50-26-disc]]
---

# 0003 — WMS Legacy Yeniden Tasarım

## Bağlam
Kullanıcı mevcut "SB" WMS'in tam SQL Server şema dökümünü verdi (`tablo/tablolar.xlsx`): **460 tablo, 6.247 kolon, 581 FK**. Tümü `TBLSB*` prefix (OneGate'te yasak). Hedef: legacy'yi referans alıp OneGate'i modernize etmek.

## Çözülen konvansiyonlar
- Hungarian prefix: `LNG`=int (LNGKOD=PK identity, LNG…KOD=FK), `TXT`=varchar, `TRH`=datetimeoffset/date, `BYT`=tinyint (bayrak/tip), `DBL`=decimal(28,8).
- Evrensel desen: surrogate PK `LNGKOD` + doğal kod `TXTKOD`; 4'lü audit; multi-tenant `LNGDIST`; arşiv `(BYTARSIV,LNGKOD)`; EAV `EkSaha`.
- Stok kalbi `TBLSBSTOKDURUM`: lokasyon×ürün×statü×batch×seri×palet kırılımı + rezerve + SKT.
- Belge `BELGEBASLIK/DETAY`: kaynak→hedef hareket modeli.

## Karar (4 çatal — kullanıcı onayı)
1. **Yaklaşım:** Önce keşif (mapping dokümanı) → sonra temiz çekirdek + artımlı derinlik. Birebir port YOK.
2. **Stok izleme:** Lot/batch/seri + SKT (tam WMS stok).
3. **Çok-kiracılık:** Baştan aktif — her ana tabloda `companyId` (yeni `TBLCOMPANY` tenant; cari/iş-ortağı ayrıştırıldı).
4. **Dinamik alan (EAV):** Şimdilik yok, tiplenmiş kolon.

## Sonuç
Keşif dokümanı yazıldı: [[docs/wms-discovery-mapping]] (repo: `docs/wms-discovery-mapping.md`). Faz 1 hedef ER (Company, Warehouse, Area, Location-ağaç, Unit, ProductUnit, Product, Status, PalletType, Pallet, Stock) tanımlandı. Modelleme (schema.prisma + migrate) bir sonraki adımda, bu haritaya göre.

## Açık (modellemeden önce)
- Decimal hassasiyeti (28,8 vs 18,3), cari Faz1 mi Faz2 mi, Status enum mu tablo mu, mevcut TBLDOCUMENT'in kaderi.
