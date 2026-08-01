// 4Proc'un KENDİ Prisma istemcisiyle ortak çekirdek okuma/ilişki testi (salt okunur + tek geri alınan yazma).
import { PrismaClient } from '@prisma/client'
const db = new PrismaClient()
const ok = (n, v) => console.log(`  ✓ ${n}: ${v}`)
try {
  console.log('── ortak masterlar (uyumluluk view\'ları)')
  ok('kullanıcı', await db.user.count())
  ok('tedarikçi', await db.supplier.count())
  ok('malzeme', await db.material.count())
  ok('birim', await db.unit.count())
  ok('para birimi', await db.currency.count())
  ok('ödeme koşulu', await db.paymentTerm.count())
  ok('teslim şekli', await db.incoterm.count())
  ok('rol', await db.role.count())
  ok('firma', await db.company.count())
  ok('organizasyon', await db.organization.count())

  console.log('── platform tabloları (procurement)')
  ok('sipariş', await db.order.count())
  ok('sipariş satırı', await db.orderDetail.count())
  ok('sözleşme', await db.contract.count())
  ok('bütçe', await db.budget.count())
  ok('katalog kalemi', await db.catalogItem.count())

  console.log('── İLİŞKİLİ sorgular (view ⋈ tablo — asıl sınav)')
  const u = await db.user.findFirst({ where: { Position: { not: null } }, include: { department: true, jobGroup: true } })
  ok('kullanıcı+departman', `${u?.Code} · ${u?.FirstName} ${u?.LastName} · ${u?.Position} · dept=${u?.department?.Name ?? '-'}`)

  const s = await db.supplier.findFirst({ include: { currency: true, paymentTerm: true, supplierType: true } })
  ok('tedarikçi+para/ödeme/tip', `${s?.Code} · ${s?.Name} · ${s?.currency?.Code ?? '-'} · ${s?.paymentTerm?.Code ?? '-'} · ${s?.supplierType?.Name ?? '-'}`)

  const m = await db.material.findFirst({ include: { unit: true, materialType: true, materialGroup: true } })
  ok('malzeme+birim/tip/grup', `${m?.Code} · ${(m?.Name ?? '').slice(0, 30)} · ${m?.unit?.Code ?? '-'} · ${m?.materialType?.Name ?? '-'}`)

  const o = await db.order.findFirst({ include: { supplier: true, currency: true, paymentTerm: true, creator: true, details: { include: { material: true } } } })
  ok('SİPARİŞ tam zincir', `${o?.OrderNo ?? o?.Id} · ted=${o?.supplier?.Name ?? '-'} · ${o?.currency?.Code ?? '-'} · ödeme=${o?.paymentTerm?.Code ?? '-'} · açan=${o?.creator?.Code ?? '-'} · ${o?.details?.length ?? 0} satır · ilk ürün=${o?.details?.[0]?.material?.Code ?? '-'} `)

  const ur = await db.userRole.findFirst({ include: { user: true, role: true } })
  ok('kullanıcı-rol', `${ur?.user?.Code ?? '-'} → ${ur?.role?.Name ?? '-'}`)

  console.log('── YAZMA testi (oluştur → oku → sil)')
  const nu = await db.unit.create({ data: { Code: 'ZZP4SMOKE', Name: 'Duman testi', IsActive: true } })
  const re = await db.unit.findUnique({ where: { Id: nu.Id } })
  ok('birim oluştur+oku', `Id=${re?.Id} ${re?.Code} ${re?.Name}`)
  await db.unit.update({ where: { Id: nu.Id }, data: { Name: 'Duman testi 2' } })
  ok('güncelle', (await db.unit.findUnique({ where: { Id: nu.Id } }))?.Name)
  await db.unit.delete({ where: { Id: nu.Id } })
  ok('sil', (await db.unit.findUnique({ where: { Id: nu.Id } })) === null ? 'temizlendi' : 'KALDI!')

  console.log('── DDL koruması (başarısız OLMALI)')
  try {
    await db.$executeRawUnsafe('CREATE TABLE procurement.zz_should_fail(x int)')
    console.log('  ✗ DDL GEÇTİ — KORUMA YOK!')
  } catch (e) {
    ok('DDL reddedildi', String(e.message).split('\n').find((l) => /denied|izin|permission/i.test(l))?.trim() ?? 'permission denied')
  }
  console.log('\n══ TÜMÜ BAŞARILI')
} catch (e) {
  console.error('\n✗ HATA:', e.message)
  process.exitCode = 1
} finally {
  await db.$disconnect()
}
