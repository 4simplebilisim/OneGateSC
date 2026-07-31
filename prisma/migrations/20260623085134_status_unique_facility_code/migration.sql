-- Statü kod benzersizliği firma+TESİS bazına alındı: aynı kod farklı tesiste kullanılabilir.
DROP INDEX IF EXISTS wms."TBLSTATUS_companyId_code_key";
CREATE UNIQUE INDEX "TBLSTATUS_companyId_facilityId_code_key" ON wms."TBLSTATUS"("companyId", "facilityId", "code");
