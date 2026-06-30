-- Toplama (kapsam) kaydına üretim tarihi + SKT — toplamada okutulup stok'a taşınır. Additive.
ALTER TABLE wms."TBLDOCUMENTLINESCOPE"
  ADD COLUMN "productionDate" DATE,
  ADD COLUMN "expiryDate" DATE;
