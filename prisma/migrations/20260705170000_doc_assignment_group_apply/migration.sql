-- İş Atama: kullanıcı grubuna da atama (userId nullable + userGroupId) + operasyonda "İş Ataması Uygula" parametresi
ALTER TABLE wms."TBLDOCUMENTASSIGNMENT" ALTER COLUMN "userId" DROP NOT NULL;
ALTER TABLE wms."TBLDOCUMENTASSIGNMENT" ADD COLUMN "userGroupId" INTEGER;
CREATE INDEX IF NOT EXISTS "TBLDOCUMENTASSIGNMENT_userGroupId_idx" ON wms."TBLDOCUMENTASSIGNMENT"("userGroupId");

ALTER TABLE wms."TBLOPERATIONTYPE" ADD COLUMN "applyAssignment" BOOLEAN NOT NULL DEFAULT false;
