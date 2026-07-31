-- Kullanıcı: El terminali (mobil) kullanıcısı bayrağı (Tip/Merkez-Şube yerine)
ALTER TABLE wms."TBLUSER" ADD COLUMN "isMobileUser" BOOLEAN NOT NULL DEFAULT false;
