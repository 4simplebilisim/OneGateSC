-- Kullanıcı > Grup override: kullanıcı seviyesinde bir yetkiyi YASAKLA (grubun verdiğini kaldırır)
ALTER TABLE wms."TBLUSERAUTHORIZATION" ADD COLUMN "deny" BOOLEAN NOT NULL DEFAULT false;
