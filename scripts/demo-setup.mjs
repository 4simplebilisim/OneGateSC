// DEMO ORTAMI KURULUMU — müşteri sunumu için tutarlı bir depo senaryosu kurar.
// Idempotent: tekrar çalıştırılabilir, var olanı bozmaz.
//
//   npx tsx scripts/demo-setup.mjs           # ön izleme (hiçbir şey yazmaz)
//   npx tsx scripts/demo-setup.mjs --uygula
//
// Aşama 1 = temizlik + yapılandırma. Hareket geçmişi ayrı script (demo-history.mjs)
// çünkü o GERÇEK MOTORDAN geçmeli (stok/defter tutarlılığı garanti olsun).
import { prisma } from '../src/lib/prisma.js'

const uygula = process.argv.includes('--uygula')
const CO = Number(process.env.DEMO_COMPANY_ID ?? 10)
const log = (s) => console.log(s)
const yap = async (etiket, fn) => {
  if (!uygula) { log(`  · ${etiket}`); return null }
  const r = await fn()
  log(`  ✓ ${etiket}`)
  return r
}

log(`\n═══ DEMO KURULUMU (firma ${CO}) ${uygula ? '— UYGULANIYOR' : '— ÖN İZLEME'} ═══\n`)

// ── 1. TEMİZLİK: test kalıntıları ────────────────────────────────────────
log('1. Test kalıntılarını temizle')
{
  const testUrun = await prisma.tBLPRODUCT.findMany({
    where: { companyId: CO, OR: [{ code: { startsWith: 'E2E-' } }, { code: { startsWith: 'QC-' } }] },
    select: { id: true, code: true },
  })
  const testCari = await prisma.tBLBUSINESSPARTNER.findMany({
    where: { companyId: CO, OR: [{ code: { startsWith: 'E2E-' } }, { code: { startsWith: 'QC-' } }] },
    select: { id: true, code: true },
  })
  const testBelge = await prisma.tBLDOCUMENT.findMany({
    where: { companyId: CO, OR: [{ documentNo: { startsWith: 'E2E' } }, { documentNo: { startsWith: 'QC' } }, { documentNo: { startsWith: 'PROB' } }, { documentNo: { startsWith: 'DBG' } }] },
    select: { id: true, documentNo: true },
  })
  const iptalBelge = await prisma.tBLDOCUMENT.findMany({
    where: { companyId: CO, status: 'CANCELLED' }, select: { id: true },
  })
  log(`   ${testUrun.length} test ürünü, ${testCari.length} test carisi, ${testBelge.length} test belgesi, ${iptalBelge.length} iptal belge`)

  const belgeIds = [...new Set([...testBelge.map((d) => d.id), ...iptalBelge.map((d) => d.id)])]
  if (belgeIds.length) {
    await yap(`${belgeIds.length} belge (+satır/okutma/defter) silindi`, async () => {
      await prisma.tBLSTOCKLEDGER.deleteMany({ where: { documentId: { in: belgeIds } } })
      await prisma.tBLDOCUMENTLINESCOPE.deleteMany({ where: { documentLine: { documentId: { in: belgeIds } } } })
      await prisma.tBLDOCUMENTSTATUSHISTORY.deleteMany({ where: { documentId: { in: belgeIds } } })
      await prisma.tBLDOCUMENTLINE.deleteMany({ where: { documentId: { in: belgeIds } } })
      await prisma.tBLDOCUMENT.deleteMany({ where: { id: { in: belgeIds } } })
    })
  }
  if (testUrun.length) {
    await yap(`${testUrun.length} test ürünü silindi`, async () => {
      const ids = testUrun.map((p) => p.id)
      await prisma.tBLSTOCK.deleteMany({ where: { productId: { in: ids } } })
      await prisma.tBLSTOCKLEDGER.deleteMany({ where: { productId: { in: ids } } })
      await prisma.tBLPRODUCTUNIT.deleteMany({ where: { productId: { in: ids } } })
      await prisma.tBLPRODUCTAPPLICATION.deleteMany({ where: { productId: { in: ids } } })
      await prisma.tBLPRODUCT.deleteMany({ where: { id: { in: ids } } })
    })
  }
  if (testCari.length) {
    await yap(`${testCari.length} test carisi silindi`, () =>
      prisma.tBLBUSINESSPARTNER.deleteMany({ where: { id: { in: testCari.map((p) => p.id) } } }))
  }
}

// ── 2. STATÜ SADELEŞTİRME ────────────────────────────────────────────────
log('\n2. Statüleri sadeleştir (mükerrer: 01/Kullanılabilir ↔ SAGLAM, 02/Bloke ↔ BLOKE)')
{
  const sts = await prisma.tBLSTATUS.findMany({ where: { companyId: CO }, select: { id: true, code: true, name: true } })
  const bul = (c) => sts.find((s) => s.code === c)
  const ciftler = [[bul('01'), bul('SAGLAM')], [bul('02'), bul('BLOKE')]]
  for (const [eski, yeni] of ciftler) {
    if (!eski || !yeni) continue
    const kullanim = await prisma.tBLSTOCK.count({ where: { statusId: eski.id } })
      + await prisma.tBLDOCUMENTLINE.count({ where: { OR: [{ sourceStatusId: eski.id }, { targetStatusId: eski.id }] } })
    log(`   ${eski.code} "${eski.name}" → ${yeni.code} "${yeni.name}" (${kullanim} referans taşınacak)`)
    await yap(`${eski.code} birleştirildi`, async () => {
      await prisma.tBLSTOCK.updateMany({ where: { statusId: eski.id }, data: { statusId: yeni.id } })
      await prisma.tBLSTOCKLEDGER.updateMany({ where: { statusId: eski.id }, data: { statusId: yeni.id } })
      await prisma.tBLDOCUMENTLINE.updateMany({ where: { sourceStatusId: eski.id }, data: { sourceStatusId: yeni.id } })
      await prisma.tBLDOCUMENTLINE.updateMany({ where: { targetStatusId: eski.id }, data: { targetStatusId: yeni.id } })
      await prisma.tBLOPERATIONTYPESTATUS.updateMany({ where: { sourceStatusId: eski.id }, data: { sourceStatusId: yeni.id } }).catch(() => {})
      await prisma.tBLOPERATIONTYPESTATUS.updateMany({ where: { targetStatusId: eski.id }, data: { targetStatusId: yeni.id } }).catch(() => {})
      await prisma.tBLSTATUS.delete({ where: { id: eski.id } })
    })
  }
}

// ── 3. SAYAÇLAR ──────────────────────────────────────────────────────────
log('\n3. Sayaçlar')
const SAYACLAR = [
  { code: 'MK', name: 'Mal Kabul', prefix: 'MK-' },
  { code: 'SV', name: 'Sevkiyat', prefix: 'SV-' },
  { code: 'TR', name: 'Transfer', prefix: 'TR-' },
  { code: 'IA', name: 'İade Girişi', prefix: 'IA-' },
  { code: 'FR', name: 'Fire Çıkışı', prefix: 'FR-' },
]
const sayacId = {}
for (const s of SAYACLAR) {
  const mevcut = await prisma.tBLSEQUENCE.findFirst({ where: { companyId: CO, code: s.code } })
  if (mevcut) { sayacId[s.code] = mevcut.id; log(`   · ${s.code} zaten var`); continue }
  const r = await yap(`${s.code} (${s.name}) oluşturuldu`, () =>
    prisma.tBLSEQUENCE.create({ data: { companyId: CO, code: s.code, name: s.name, prefix: s.prefix, padLength: 6, isAutomatic: true } }))
  if (r) sayacId[s.code] = r.id
}

// ── 4. OPERASYON TİPLERİ ─────────────────────────────────────────────────
log('\n4. Operasyon tipleri (sayaç zorunlu — eksikleri tamamla, Mal Kabul yoksa aç)')
{
  const tesis = await prisma.tBLFACILITY.findFirst({ where: { companyId: CO, isAdministrative: false }, orderBy: { id: 'asc' } })
  const stSaglam = await prisma.tBLSTATUS.findFirst({ where: { companyId: CO, code: 'SAGLAM' } })

  // Mevcut operasyonlara sayaç ata
  const ESLEME = { ZC001: 'SV', ZT001: 'TR', ZI001: 'IA', ZF001: 'FR' }
  for (const [opKod, seqKod] of Object.entries(ESLEME)) {
    const op = await prisma.tBLOPERATIONTYPE.findFirst({ where: { companyId: CO, code: opKod } })
    if (!op) { log(`   · ${opKod} yok, atlandı`); continue }
    if (op.sequenceId) { log(`   · ${opKod} sayacı zaten var`); continue }
    if (!sayacId[seqKod]) { log(`   · ${opKod} için ${seqKod} sayacı yok (ön izleme)`); continue }
    await yap(`${opKod} → ${seqKod} sayacı bağlandı`, () =>
      prisma.tBLOPERATIONTYPE.update({ where: { id: op.id }, data: { sequenceId: sayacId[seqKod] } }))
  }

  // MAL KABUL operasyonu (demo senaryosunun ilk halkası — canlıda YOKTU)
  const mk = await prisma.tBLOPERATIONTYPE.findFirst({ where: { companyId: CO, code: 'MK001' } })
  if (mk) log('   · MK001 Mal Kabul zaten var')
  else {
    await yap('MK001 "Mal Kabul" (INBOUND, kontrollü) oluşturuldu', async () => {
      const op = await prisma.tBLOPERATIONTYPE.create({
        data: {
          companyId: CO, code: 'MK001', name: 'Mal Kabul', direction: 'INBOUND',
          controlMode: 'CONTROLLED', documentType: 'STOCK_MOVEMENT',
          facilityId: tesis?.id ?? null, sequenceId: sayacId.MK ?? null,
          affectsStock: true, isActive: true,
        },
      })
      // Giriş statü geçişi: (kaynak yok) → Sağlam
      if (stSaglam) {
        await prisma.tBLOPERATIONTYPESTATUS.create({
          data: { companyId: CO, operationTypeId: op.id, targetStatusId: stSaglam.id },
        }).catch(() => {})
      }
      return op
    })
  }
}

// ── 5. İKİNCİ DEPO (depolar arası transfer senaryosu) ────────────────────
log('\n5. İkinci depo + lokasyonlar (transfer anlatısı için)')
{
  const tesis = await prisma.tBLFACILITY.findFirst({ where: { companyId: CO, isAdministrative: false }, orderBy: { id: 'asc' } })
  const mevcut = await prisma.tBLWAREHOUSE.findFirst({ where: { companyId: CO, code: 'SEVK' } })
  if (mevcut) log('   · SEVK deposu zaten var')
  else {
    await yap('SEVK "Sevkiyat Deposu" + 30 lokasyon (S1-01..S3-10)', async () => {
      const wh = await prisma.tBLWAREHOUSE.create({
        data: { companyId: CO, code: 'SEVK', name: 'Sevkiyat Deposu', facilityId: tesis?.id ?? null, isActive: true },
      })
      const loc = []
      for (const koridor of ['S1', 'S2', 'S3']) {
        for (let i = 1; i <= 10; i++) {
          loc.push({ companyId: CO, warehouseId: wh.id, code: `${koridor}-${String(i).padStart(2, '0')}`, name: `${koridor} Raf ${i}`, isActive: true })
        }
      }
      await prisma.tBLLOCATION.createMany({ data: loc })
      return wh
    })
  }
}

// ── 6. PALET TİPİ + PALETLER ─────────────────────────────────────────────
log('\n6. Palet tipi + paletler (Palet İzleme/Tarihçe ekranları boş kalmasın)')
{
  let pt = await prisma.tBLPALLETTYPE.findFirst({ where: { companyId: CO, code: 'EUR' } })
  if (pt) log('   · EUR palet tipi zaten var')
  else {
    pt = await yap('EUR "Euro Palet" tipi oluşturuldu', () =>
      prisma.tBLPALLETTYPE.create({ data: { companyId: CO, code: 'EUR', name: 'Euro Palet', isActive: true } }))
  }
  const varOlan = await prisma.tBLPALLET.count({ where: { companyId: CO } })
  log(`   mevcut palet: ${varOlan}`)
  if (varOlan < 24 && pt) {
    await yap(`${24 - varOlan} palet oluşturuldu (EUR000001..)`, async () => {
      const yeni = []
      for (let i = varOlan + 1; i <= 24; i++) {
        yeni.push({ companyId: CO, palletNo: `EUR${String(i).padStart(6, '0')}`, palletTypeId: pt.id, isActive: true })
      }
      await prisma.tBLPALLET.createMany({ data: yeni, skipDuplicates: true })
    })
  }
}

// ── 7. EL TERMİNALİ MENÜSÜ ───────────────────────────────────────────────
log('\n7. El terminali menü grupları (canlıda 0 idi → mobil ekranlara girilemiyordu)')
{
  const varOlan = await prisma.tBLHANDHELDMENUGROUP.count({ where: { companyId: CO } })
  if (varOlan) log(`   · ${varOlan} grup zaten var`)
  else {
    await yap('4 menü grubu (Mal Kabul / Sevkiyat / Transfer / Sayım)', () =>
      prisma.tBLHANDHELDMENUGROUP.createMany({
        data: [
          { companyId: CO, code: 'MK', name: 'Mal Kabul', sortOrder: 1, isActive: true },
          { companyId: CO, code: 'SV', name: 'Sevkiyat', sortOrder: 2, isActive: true },
          { companyId: CO, code: 'TR', name: 'Transfer', sortOrder: 3, isActive: true },
          { companyId: CO, code: 'SY', name: 'Sayım', sortOrder: 4, isActive: true },
        ],
      }))
  }
}

// -- 8. ETIKET TIPI + YAZICI (baski zinciri demoda da calissin) ----------
log('\n8. Etiket tipi (tasarımlı) + yazıcı')
{
  const tesis = await prisma.tBLFACILITY.findFirst({ where: { companyId: CO, isAdministrative: false }, orderBy: { id: 'asc' } })
  const LAYOUT = {"widthMm": 50, "heightMm": 30, "elements": [{"id": "e1", "type": "field", "field": "productCode", "x": 2, "y": 1.5, "w": 46, "h": 6, "fontSize": 12, "bold": true, "align": "left"}, {"id": "e2", "type": "field", "field": "productName", "x": 2, "y": 7.5, "w": 46, "h": 4, "fontSize": 7, "align": "left"}, {"id": "e3", "type": "barcode", "field": "barcode", "x": 2, "y": 11.5, "w": 46, "h": 10}, {"id": "e4", "type": "line", "x": 2, "y": 22, "w": 46, "h": 0.3}, {"id": "e5", "type": "field", "field": "batchNo", "x": 2, "y": 23, "w": 24, "h": 4, "fontSize": 7, "align": "left"}, {"id": "e6", "type": "field", "field": "quantity", "x": 26, "y": 23, "w": 12, "h": 4, "fontSize": 8, "bold": true, "align": "right"}, {"id": "e7", "type": "field", "field": "unit", "x": 38, "y": 23, "w": 10, "h": 4, "fontSize": 7, "align": "left"}]}

  const et = await prisma.tBLLABELTYPE.findFirst({ where: { companyId: CO, code: 'URUN-50X30' } })
  if (et) log('   . URUN-50X30 etiket tipi zaten var')
  else {
    await yap('URUN-50X30 etiket tipi (kod+ad+barkod+parti+miktar, 50x30mm)', () =>
      prisma.tBLLABELTYPE.create({
        data: { companyId: CO, code: 'URUN-50X30', labelName: 'Urun Etiketi 50x30', screenTitle: 'Urun Etiketi', layoutJson: JSON.stringify(LAYOUT), isActive: true },
      }))
  }

  const yz = await prisma.tBLPRINTER.findFirst({ where: { companyId: CO, name: 'Depo Etiket Yazicisi' } })
  if (yz) log('   . Yazici zaten var')
  else if (tesis) {
    await yap('Depo Etiket Yazicisi (varsayilan)', () =>
      prisma.tBLPRINTER.create({
        data: { companyId: CO, facilityId: tesis.id, name: "Depo Etiket Yazicisi", address: "\\SRV-DEPO\ZEBRA-01", isDefault: true, isActive: true },
      }))
  }
}

log(`\n${'═'.repeat(60)}`)
log(uygula ? '✔ Kurulum tamam. Sonraki: demo-history.mjs (hareket geçmişi)' : 'ÖN İZLEME — hiçbir şey değişmedi. --uygula ile çalıştırın.')
await prisma.$disconnect()
