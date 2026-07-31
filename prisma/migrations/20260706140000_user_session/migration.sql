-- Tek oturum (single-session): kullanıcının aktif oturum kimliği. JWT'deki sid ile eşleşmezse istek 401 olur.
ALTER TABLE wms."TBLUSER" ADD COLUMN "sessionId" VARCHAR(64);
