-- Sayım kapsam lokasyonu (null = tüm depo) — aktif-sayım donması (stockMoveOnActiveCount) kapsamı için
ALTER TABLE wms."TBLSTOCKCOUNT" ADD COLUMN "locationId" INTEGER;
