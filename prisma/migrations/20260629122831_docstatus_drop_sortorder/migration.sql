-- Belge Durumu (TBLDOCUMENTSTATUS) sıra/sortOrder KALDIRILDI.
-- Legacy StokBar TBLSBBELGEDURUM'da sıra kolonu yok (kod/tanım/renk) + bizde hiçbir yerde sıralama için kullanılmıyordu.
ALTER TABLE wms."TBLDOCUMENTSTATUS" DROP COLUMN IF EXISTS "sortOrder";
