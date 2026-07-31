-- Tolerans kademe detayı sadeleştirme: kademe aralığı + 3 birim (tier/lower/upper) KALDIRILDI.
-- Yeni model: satır başına TEK birim + Alt Yüzde + Üst Yüzde (kg %10, adet %15). Tablo 0 satır → güvenli.
ALTER TABLE wms."TBLOPERATIONTYPETOLERANCEDETAIL"
  DROP COLUMN IF EXISTS "lowerTier",
  DROP COLUMN IF EXISTS "upperTier",
  DROP COLUMN IF EXISTS "tierUnitId",
  DROP COLUMN IF EXISTS "lowerIsPercent",
  DROP COLUMN IF EXISTS "lowerValue",
  DROP COLUMN IF EXISTS "lowerUnitId",
  DROP COLUMN IF EXISTS "upperIsPercent",
  DROP COLUMN IF EXISTS "upperValue",
  DROP COLUMN IF EXISTS "upperUnitId",
  ADD COLUMN "unitId" INTEGER,
  ADD COLUMN "lowerPercent" DECIMAL(28,8),
  ADD COLUMN "upperPercent" DECIMAL(28,8);
