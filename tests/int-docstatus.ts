// refreshDocStatus entegrasyon testi — gerçek DB, stok'a DOKUNMAZ (yalnız DRAFT→CONFIRMED status alanı + refresh).
// Çalıştır: npx tsx tests/int-docstatus.ts
import { prisma } from '../src/lib/prisma.js'
import { refreshDocStatus } from '../src/lib/documentStatus.js'

let fail = 0
const expect = (name: string, got: unknown, exp: unknown) => {
  if (got === exp) console.log(`  ✓ ${name} → ${got}`)
  else { fail++; console.log(`  ✗ ${name} → beklenen ${exp}, gelen ${got}`) }
}

async function main() {
  // Veri olan firmayı bul (op+wh+prod+unit+user + OBK statüsü)
  const company = await prisma.tBLDOCUMENTSTATUS.findFirst({ where: { code: 'OBK' }, select: { companyId: true } })
  if (!company) { console.log('OBK statüsü olan firma yok — atlandı'); return }
  const companyId = company.companyId
  const [op, wh, prod, unit, user] = await Promise.all([
    prisma.tBLOPERATIONTYPE.findFirst({ where: { companyId } }),
    prisma.tBLWAREHOUSE.findFirst({ where: { companyId } }),
    prisma.tBLPRODUCT.findFirst({ where: { companyId } }),
    prisma.tBLUNIT.findFirst({ where: { companyId } }),
    prisma.tBLUSER.findFirst(), // createdById: herhangi geçerli kullanıcı (FK)
  ])
  if (!op || !wh || !prod || !unit || !user) { console.log(`firma ${companyId} master verisi eksik — atlandı`); return }

  const doc = await prisma.tBLDOCUMENT.create({
    data: {
      companyId, documentNo: `TEST-DOCSTATUS-${Date.now()}`, operationTypeId: op.id, warehouseId: wh.id,
      createdById: user.id, status: 'DRAFT',
      lines: { create: [{ companyId, lineNo: 1, productId: prod.id, unitId: unit.id, quantity: 10 }] },
    },
  })
  try {
    console.log(`refreshDocStatus — gerçek belge yaşam döngüsü (firma ${companyId}, stok'a dokunmadan):`)
    const persistedCode = async () =>
      (await prisma.tBLDOCUMENT.findUnique({ where: { id: doc.id }, include: { documentStatus: true } }))?.documentStatus?.code
    // DRAFT, hiç toplanmadı → BKL (kanonik hizalama sonrası company 2'de artık çözülüyor)
    expect('DRAFT → BKL (compute)', await refreshDocStatus(prisma, doc.id), 'BKL')
    expect('DRAFT → BKL (DB)', await persistedCode(), 'BKL')
    // CONFIRMED → OBK (kapı)
    await prisma.tBLDOCUMENT.update({ where: { id: doc.id }, data: { status: 'CONFIRMED' } })
    expect('CONFIRMED → OBK', await refreshDocStatus(prisma, doc.id), 'OBK')
    expect('OBK (DB)', await persistedCode(), 'OBK')
    // CANCELLED → IPT (yeni eklenen kod)
    await prisma.tBLDOCUMENT.update({ where: { id: doc.id }, data: { status: 'CANCELLED' } })
    expect('CANCELLED → IPT', await refreshDocStatus(prisma, doc.id), 'IPT')
    expect('IPT (DB)', await persistedCode(), 'IPT')
    // Faz 3 audit: 3 gerçek geçiş → 3 history satırı (null→BKL, BKL→OBK, OBK→IPT)
    const hist = await prisma.tBLDOCUMENTSTATUSHISTORY.findMany({ where: { documentId: doc.id }, orderBy: { id: 'asc' } })
    expect('audit: 3 geçiş kaydı', hist.length, 3)
    expect('audit: ilk null→BKL', `${hist[0]?.fromCode ?? 'null'}→${hist[0]?.toCode}`, 'null→BKL')
    expect('audit: son OBK→IPT', `${hist.at(-1)?.fromCode}→${hist.at(-1)?.toCode}`, 'OBK→IPT')
  } finally {
    await prisma.tBLDOCUMENTSTATUSHISTORY.deleteMany({ where: { documentId: doc.id } })
    await prisma.tBLDOCUMENTLINE.deleteMany({ where: { documentId: doc.id } })
    await prisma.tBLDOCUMENT.delete({ where: { id: doc.id } })
    console.log('  (test belgesi + audit temizlendi)')
  }

  // Faz 2 — Kriter override: bu operasyonda CONFIRMED → ONY (varsayılan OBK yerine)
  console.log('\nveri-güdümlü Kriter — override (CONFIRMED varsayılan OBK → kriterle ONY):')
  const ony = await prisma.tBLDOCUMENTSTATUS.findFirst({ where: { companyId, code: 'ONY' } })
  if (!ony) { console.log('  ONY statüsü yok — kriter testi atlandı'); console.log(fail === 0 ? '\nGEÇTI' : `\n${fail} KALDI`); await prisma.$disconnect(); return }
  const crit = await prisma.tBLDOCUMENTSTATUSCRITERIA.create({ data: { companyId, operationTypeId: op.id, condition: 'CONFIRMED', targetStatusId: ony.id, priority: 1, isActive: true } })
  const doc2 = await prisma.tBLDOCUMENT.create({
    data: {
      companyId, documentNo: `TEST-CRIT-${Date.now()}`, operationTypeId: op.id, warehouseId: wh.id,
      createdById: user.id, status: 'CONFIRMED',
      lines: { create: [{ companyId, lineNo: 1, productId: prod.id, unitId: unit.id, quantity: 5 }] },
    },
  })
  try {
    expect('Kriter CONFIRMED → ONY (override)', await refreshDocStatus(prisma, doc2.id), 'ONY')
    const persisted = (await prisma.tBLDOCUMENT.findUnique({ where: { id: doc2.id }, include: { documentStatus: true } }))?.documentStatus?.code
    expect('override DB\'ye yazıldı', persisted, 'ONY')
    // audit: override geçişi de kaynak 'criteria' ile loglandı mı
    const h2 = await prisma.tBLDOCUMENTSTATUSHISTORY.findFirst({ where: { documentId: doc2.id }, orderBy: { id: 'desc' } })
    expect('audit: override source=criteria', h2?.source, 'criteria')
  } finally {
    await prisma.tBLDOCUMENTSTATUSHISTORY.deleteMany({ where: { documentId: doc2.id } })
    await prisma.tBLDOCUMENTLINE.deleteMany({ where: { documentId: doc2.id } })
    await prisma.tBLDOCUMENT.delete({ where: { id: doc2.id } })
    await prisma.tBLDOCUMENTSTATUSCRITERIA.delete({ where: { id: crit.id } })
    console.log('  (kriter + test belgesi temizlendi)')
  }

  console.log(fail === 0 ? '\nGEÇTI' : `\n${fail} KALDI`)
  if (fail > 0) process.exitCode = 1
}
main().finally(() => prisma.$disconnect())
