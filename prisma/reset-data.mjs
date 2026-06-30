// Veri sıfırlama — 5 şemadaki (wms/procurement/sales/logistics/finance) TÜM TBL* tablolarını
// TRUNCATE CASCADE eder (identity sequence'leri de sıfırlar). Şema + migration geçmişi KORUNUR.
// Kullanım: npm run reset  (bu + bootstrap)  ·  ya da  node prisma/reset-data.mjs
import 'dotenv/config'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) })

await prisma.$executeRawUnsafe(`
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT schemaname, tablename FROM pg_tables
    WHERE schemaname IN ('wms','procurement','sales','logistics','finance')
      AND tablename LIKE 'TBL%'
  LOOP
    EXECUTE 'TRUNCATE TABLE ' || quote_ident(r.schemaname) || '.' || quote_ident(r.tablename) || ' RESTART IDENTITY CASCADE';
  END LOOP;
END $$;`)

console.log('✓ Tüm iş verisi temizlendi (TRUNCATE CASCADE + identity reset). Şema ve migration geçmişi korundu.')
await prisma.$disconnect()
