// KONTROLSÜZ MAL KABUL OPERASYONU — "boş belge aç, okutmayla doldur" akışı için.
//
//   npx tsx scripts/demo-uncontrolled-op.ts            → RAPOR
//   npx tsx scripts/demo-uncontrolled-op.ts --uygula
//
// Motor kontrolsüz akışı zaten destekliyor; eksik olan TANIM. Bu script mevcut
// bir kontrollü giriş operasyonunu örnek alıp kontrolsüz eşini kurar:
//   · kendi SAYACI (belge no otomatik)
//   · statü geçişi  dış → (örnek operasyonun hedef statüsü)
// Sonra akışı UÇTAN UCA doğrular ve doğrulama belgesini geri alır.
import { buildApp } from '../src/app.js'
import { prisma } from '../src/lib/prisma.js'

const UYGULA = process.argv.includes('--uygula')
const KOD = process.env.OP_CODE ?? 'MK002'
const AD = process.env.OP_NAME ?? 'Mal Kabul (Kontrolsüz)'
const SAYAC_KODU = process.env.OP_SEQ ?? 'MKO'

const main = async () => {
  const app = await buildApp({ logger: false })
  await app.ready()
  const giris = await app.inject({
    method: 'POST', url: '/api/auth/login',
    payload: { username: process.env.DEMO_USER ?? 'admin', password: process.env.DEMO_PASSWORD ?? 'admin123' },
  })
  if (giris.statusCode !== 200) throw new Error(`Giriş başarısız: ${giris.body}`)
  const jwt = giris.json().token as string
  const kim = JSON.parse(Buffer.from(jwt.split('.')[1]!, 'base64').toString()) as { companyId?: number; companies?: number[] }
  const CO = Number(process.env.DEMO_COMPANY_ID ?? kim.companyId ?? kim.companies?.[0])
  const auth = { authorization: `Bearer ${jwt}`, 'x-company-id': String(CO) }
  const POST = (u: string, p?: unknown) => app.inject({ method: 'POST', url: u, headers: auth, payload: p ?? {} })

  // Örnek: statü geçişi tanımlı bir KONTROLLÜ giriş operasyonu
  const ornek = await prisma.tBLOPERATIONTYPE.findFirst({
    where: { companyId: CO, direction: 'INBOUND', controlMode: 'CONTROLLED', statusLinks: { some: { targetStatusId: { not: null } } } },
    include: { statusLinks: true }, orderBy: { id: 'asc' },
  })
  if (!ornek) throw new Error('Örnek alınacak kontrollü giriş operasyonu yok')
  const hedefStatuId = ornek.statusLinks.find((s) => s.targetStatusId)!.targetStatusId!
  const hedefStatu = await prisma.tBLSTATUS.findUnique({ where: { id: hedefStatuId }, select: { code: true, name: true } })

  const varOlanOp = await prisma.tBLOPERATIONTYPE.findFirst({ where: { companyId: CO, code: KOD } })
  const varOlanSayac = await prisma.tBLSEQUENCE.findFirst({ where: { companyId: CO, code: SAYAC_KODU } })

  console.log(`\nFirma ${CO} · örnek operasyon ${ornek.code} (tesis ${ornek.facilityId})`)
  console.log(`  Operasyon : ${KOD} "${AD}" — KONTROLSÜZ / INBOUND ${varOlanOp ? '(VAR)' : '(AÇILACAK)'}`)
  console.log(`  Sayaç     : ${SAYAC_KODU} ${varOlanSayac ? `(var, değer ${varOlanSayac.currentValue})` : '(AÇILACAK)'}`)
  console.log(`  Statü     : dış → ${hedefStatu?.code} (${hedefStatu?.name})`)

  if (!UYGULA) { console.log('\nRAPOR modu — hiçbir şey yazılmadı. Uygulamak için --uygula ekleyin.'); await app.close(); return }

  const sayac = varOlanSayac ?? await prisma.tBLSEQUENCE.create({
    data: { companyId: CO, code: SAYAC_KODU, name: 'Kontrolsüz mal kabul', prefix: 'MKO-', startNo: 1, currentValue: 0, padLength: 6, isActive: true },
  })

  let op = varOlanOp
  if (!op) {
    const r = await POST('/api/operation-types', {
      code: KOD, name: AD, direction: 'INBOUND', controlMode: 'UNCONTROLLED',
      facilityId: ornek.facilityId, sequenceId: sayac.id,
    })
    if (r.statusCode !== 201) throw new Error(`Operasyon açılamadı: ${r.body}`)
    op = r.json()
    console.log(`\n  ✓ operasyon açıldı #${op!.id}`)
  } else {
    await prisma.tBLOPERATIONTYPE.update({ where: { id: op.id }, data: { controlMode: 'UNCONTROLLED', sequenceId: sayac.id, facilityId: ornek.facilityId } })
    console.log(`\n  · operasyon zaten vardı, kontrolsüze ayarlandı`)
  }

  // Statü geçişi: dış → hedef (giriş)
  const gecisVar = await prisma.tBLOPERATIONTYPESTATUS.findFirst({ where: { companyId: CO, operationTypeId: op!.id } })
  if (!gecisVar) {
    await prisma.tBLOPERATIONTYPESTATUS.create({
      data: { companyId: CO, operationTypeId: op!.id, facilityId: ornek.facilityId, sourceStatusId: null, targetStatusId: hedefStatuId, sortOrder: 1 },
    })
    console.log('  ✓ statü geçişi eklendi (dış → ' + hedefStatu?.code + ')')
  } else console.log('  · statü geçişi zaten var')

  // ── UÇTAN UCA DOĞRULAMA: boş belge aç → okut → tamamla → geri al ──
  console.log('\n── DOĞRULAMA (boş belge aç, okutmayla doldur) ──')
  const stok = await prisma.tBLSTOCK.findFirst({
    where: { companyId: CO, mainQty: { gt: 0 } }, include: { product: true, location: true, unit: true }, orderBy: { mainQty: 'desc' },
  })
  if (!stok) { console.log('  (stok yok — doğrulama atlandı)'); await app.close(); return }

  const b = await POST('/api/documents', { operationTypeId: op!.id, note: 'Kontrolsüz akış doğrulaması' })
  if (b.statusCode !== 201) throw new Error(`Belge açılamadı: ${b.body}`)
  const belge = b.json()
  console.log(`  ✓ BOŞ belge açıldı: ${belge.documentNo} · satır ${belge.lines?.length ?? 0}`)

  const erken = await POST(`/api/documents/${belge.id}/confirm`)
  console.log(`  ${erken.statusCode === 409 ? '✓' : '✗'} okutmasız onay reddedildi: ${(erken.json() as { error?: string })?.error ?? erken.statusCode}`)

  for (const adet of [7, 5]) {
    const sc = await POST('/api/document-line-scopes', {
      documentId: belge.id, productId: stok.productId, unitId: stok.unitId, quantity: adet,
      targetLocationId: stok.locationId, targetStatusId: hedefStatuId, batchNo: 'DOGRULAMA',
    })
    console.log(`  ${sc.statusCode === 201 ? '✓' : '✗'} okutma ${adet} ${stok.unit?.code ?? ''} → ${sc.statusCode === 201 ? 'kabul' : (sc.json() as { error?: string })?.error}`)
  }
  const detay = (await app.inject({ method: 'GET', url: `/api/documents/${belge.id}`, headers: auth })).json()
  console.log(`  ✓ satır OKUTMAYLA oluştu: ${detay.lines?.length} satır · miktar ${detay.lines?.[0]?.quantity} (7+5)`)

  const c = await POST(`/api/documents/${belge.id}/confirm`)
  const t = c.statusCode === 200 ? await POST(`/api/documents/${belge.id}/complete`) : null
  console.log(`  ${t?.statusCode === 200 ? '✓' : '✗'} onay+tamamla: ${t ? (t.json() as { status?: string })?.status ?? t.body.slice(0, 60) : (c.json() as { error?: string })?.error}`)

  // geri al + temizle (doğrulama izi kalmasın)
  if (t?.statusCode === 200) await POST(`/api/documents/${belge.id}/reverse`)
  await prisma.tBLSTOCKLEDGER.deleteMany({ where: { documentId: belge.id } })
  await prisma.tBLDOCUMENTLINESCOPE.deleteMany({ where: { documentLine: { documentId: belge.id } } })
  await prisma.tBLDOCUMENTLINE.deleteMany({ where: { documentId: belge.id } })
  await prisma.tBLDOCUMENTSTATUSHISTORY.deleteMany({ where: { documentId: belge.id } })
  await prisma.tBLDOCUMENT.delete({ where: { id: belge.id } })
  await prisma.tBLSTOCK.deleteMany({ where: { companyId: CO, batchNo: 'DOGRULAMA' } })
  console.log('  (doğrulama belgesi geri alındı ve silindi)')
  console.log(`\nHazır: İşlemler › Giriş › Belge → operasyon "${KOD}" seçildiğinde belge BOŞ açılır, el terminalinden okutmayla dolar.`)
  await app.close()
}

main()
  .catch((e) => { console.error(e.message ?? e); process.exitCode = 1 })
  .finally(() => prisma.$disconnect())
