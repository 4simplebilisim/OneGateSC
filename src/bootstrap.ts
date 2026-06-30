// Minimal bootstrap — boş DB'ye yalnız giriş için gerekenleri koyar:
// ONEGATE firma + ADMIN/OPERATOR/VIEWER rolleri + admin/admin123 (super-admin).
// Demo iş verisi (ürün/statü/tesis/depo...) OLUŞTURULMAZ — kullanıcı sıfırdan tanımlar.
// Kullanım: npx prisma migrate reset --force --skip-seed && npx tsx src/bootstrap.ts
import bcrypt from 'bcryptjs'
import { prisma } from './lib/prisma.js'

async function main() {
  const company = await prisma.tBLCOMPANY.upsert({
    where: { code: 'ONEGATE' },
    update: {},
    create: { code: 'ONEGATE', name: 'OneGate' },
  })
  const companyId = company.id

  for (const role of [
    { code: 'ADMIN', name: 'Administrator', description: 'Tam yetki' },
    { code: 'OPERATOR', name: 'Operator', description: 'Operasyon kullanıcısı' },
    { code: 'VIEWER', name: 'Viewer', description: 'Salt okunur erişim' },
  ]) {
    await prisma.tBLROLE.upsert({ where: { code: role.code }, update: {}, create: role })
  }

  const adminRole = await prisma.tBLROLE.findUniqueOrThrow({ where: { code: 'ADMIN' } })
  const passwordHash = await bcrypt.hash('admin123', 10)
  await prisma.tBLUSER.upsert({
    where: { username: 'admin' },
    update: { companyId, isSuperAdmin: true, passwordHash },
    create: {
      companyId,
      username: 'admin',
      email: 'admin@onegate.local',
      passwordHash,
      fullName: 'System Administrator',
      isSuperAdmin: true,
      userRoles: { create: { roleId: adminRole.id, companyId } },
    },
  })

  console.log('✓ Minimal bootstrap hazır:')
  console.log('  • Firma: ONEGATE')
  console.log('  • Roller: ADMIN · OPERATOR · VIEWER')
  console.log('  • Giriş: admin / admin123 (super-admin)')
  console.log('  → Demo iş verisi yok. Sıfırdan firma/tesis/depo/alan/lokasyon tanımlayabilirsin.')
  await prisma.$disconnect()
}

main().catch((e) => { console.error(e); process.exit(1) })
