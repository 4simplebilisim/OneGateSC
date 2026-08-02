-- İdari birim tesisi: depo operasyonu yürütülmez (merkez/HQ). Belge, stok, mal kabul
-- ekranlarında tesis olarak seçilemez; satınalma organizasyonu olarak kullanılabilir.
ALTER TABLE wms."TBLFACILITY" ADD COLUMN "isAdministrative" BOOLEAN NOT NULL DEFAULT false;
