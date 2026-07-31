-- AlterTable: Sayım kapsam kısıtları (StokBar Sayım Belge — Malzeme/Kullanıcı Bağlantı Tipi: Hepsi/Grup/Kod)
ALTER TABLE "TBLSTOCKCOUNT" ADD COLUMN     "materialLinkType" "LinkScope",
ADD COLUMN     "materialLinkId" INTEGER,
ADD COLUMN     "userLinkType" "LinkScope",
ADD COLUMN     "userLinkId" INTEGER;
