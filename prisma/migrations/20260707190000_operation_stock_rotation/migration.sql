-- Çıkış toplama stok rotasyonu (FIFO/FEFO/NONE) — operasyon tipinde
CREATE TYPE wms."StockRotation" AS ENUM ('NONE', 'FIFO', 'FEFO');
ALTER TABLE wms."TBLOPERATIONTYPE" ADD COLUMN "stockRotation" wms."StockRotation" NOT NULL DEFAULT 'NONE';
