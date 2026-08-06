import { buildApp } from '../src/app.js'
import { prisma } from '../src/lib/prisma.js'

/**
 * STATÜ UYGUNLUĞU PROBU — "operasyon BLOKE statüde iş yapmıyor" kuralı
 * her yolda tutuyor mu?
 *
 * Okutma ucunda kontrol var (validateScopeAgainstOperation) ama TEK çağrı yeri o.
 * Bu prob, okutmadan geçmeyen yolları da dener: rezervasyon, toplu işlem,
 * iş emri, raf besleme, satır mirası.
 */
const CO = Number(process.env.DEMO_COMPANY_ID ?? 2)
const bulgular: string[] = []
const yaz = (no: string, senaryo: string, korundu: boolean, detay: string, bilgi = false) => {
  if (!korundu && !bilgi) bulgular.push(`${no} ${senaryo} → ${detay}`)
  console.log(`  ${bilgi ? '·' : korundu ? '✓' : '✗'} ${no} ${senaryo}\n      ${detay}`)
}

const app = await buildApp({ logger: false })
await app.ready()
const login = await app.inject({ method: 'POST', url: '/api/auth/login', payload: { username: process.env.DEMO_USER ?? 'admin', password: process.env.DEMO_PASSWORD ?? 'admin123' } })
if (login.statusCode !== 200) throw new Error('login: ' + login.body)
const auth = { authorization: `Bearer ${login.json().token as string}`, 'x-company-id': String(CO) }
const POST = (u: string, p?: unknown) => app.inject({ method: 'POST', url: u, headers: auth, payload: p ?? {} })

const damga = Date.now().toString(36).toUpperCase().slice(-6)
const belgeler: number[] = []
const PARTI = `STA-${damga}`

const lok = await prisma.tBLLOCATION.findFirstOrThrow({ where: { companyId: CO } })
const urun = await prisma.tBLPRODUCT.findFirstOrThrow({ where: { companyId: CO, unitId: { not: null } } })
const birim = urun.unitId!
const statuler = await prisma.tBLSTATUS.findMany({ where: { companyId: CO }, orderBy: { id: 'asc' } })
if (statuler.length < 2) throw new Error('en az 2 statü gerekli')

// Çıkış operasyonu: YALNIZ ilk statüden çıkışa izin veriyor
const opCik = await prisma.tBLOPERATIONTYPE.findFirstOrThrow({
  where: { companyId: CO, direction: 'OUTBOUND', controlMode: 'CONTROLLED' },
  include: { statusLinks: true }, orderBy: { id: 'asc' },
})
const izinli = statuler.find((s) => opCik.statusLinks.some((t) => t.sourceStatusId === s.id)) ?? statuler[0]!
const BLOKE = statuler.find((s) => s.id !== izinli.id)!
console.log(`\n╔═ STATÜ UYGUNLUĞU PROBU · çıkış ${opCik.code}`)
console.log(`   izinli statü: ${izinli.code} (${izinli.name}) · YASAK statü: ${BLOKE.code} (${BLOKE.name})\n`)

// Test stoğu: hem izinli hem BLOKE statüde stok yarat (motoru atlamadan, doğrudan — prob verisi)
const stokYap = async (statusId: number, qty: number) =>
  prisma.tBLSTOCK.create({ data: { companyId: CO, locationId: lok.id, productId: urun.id, statusId, unitId: birim, batchNo: PARTI, mainQty: qty, reservedQty: 0 } })
const sIzinli = await stokYap(izinli.id, 100)
const sBloke = await stokYap(BLOKE.id, 100)
const stokIds = [sIzinli.id, sBloke.id]

const cikisBelgesi = async (o: { sourceStatusId?: number | null; qty?: number }) => {
  const r = await POST('/api/documents', {
    documentNo: `STA-${damga}-${Math.floor(Math.random() * 1e5)}`, operationTypeId: opCik.id,
    lines: [{
      productId: urun.id, unitId: birim, quantity: o.qty ?? 10,
      sourceLocationId: lok.id, batchNo: PARTI,
      ...(o.sourceStatusId !== undefined && o.sourceStatusId !== null ? { sourceStatusId: o.sourceStatusId } : {}),
    }],
  })
  if (r.statusCode === 201) belgeler.push(r.json().id)
  return r
}

console.log('① OKUTMA YOLU')
{
  const b = await cikisBelgesi({ sourceStatusId: BLOKE.id })
  if (b.statusCode !== 201) yaz('S1', 'yasak statülü satırla belge açma', true, `belge açılmadı: ${b.json()?.error}`)
  else {
    const sc = await POST('/api/document-line-scopes', {
      documentLineId: b.json().lines[0].id, unitId: birim, quantity: 10,
      sourceLocationId: lok.id, sourceStatusId: BLOKE.id, batchNo: PARTI,
    })
    yaz('S1', 'YASAK statüyü açıkça okutma', sc.statusCode >= 400, sc.statusCode >= 400 ? `${sc.statusCode} ${sc.json()?.error}` : 'KABUL EDİLDİ — bloke stok okutuldu')
  }
}
{
  // Satırda BLOKE, okutmada statü VERİLMEZ → satırdan miras alınmalı ve reddedilmeli
  const b = await cikisBelgesi({ sourceStatusId: BLOKE.id })
  if (b.statusCode === 201) {
    const sc = await POST('/api/document-line-scopes', {
      documentLineId: b.json().lines[0].id, unitId: birim, quantity: 10, sourceLocationId: lok.id, batchNo: PARTI,
    })
    yaz('S2', 'satırda YASAK statü, okutmada statü verilmez (miras)', sc.statusCode >= 400, sc.statusCode >= 400 ? `${sc.statusCode} ${sc.json()?.error}` : 'KABUL EDİLDİ — miras kontrol edilmedi')
  }
}

console.log('\n② REZERVASYON YOLU (okutmadan geçmez)')
{
  const b = await cikisBelgesi({ sourceStatusId: null, qty: 150 }) // satırda statü YOK → rezervasyon serbest kalır mı
  if (b.statusCode !== 201) yaz('S3', 'statüsüz satırla belge', true, `belge açılmadı: ${b.json()?.error}`)
  else {
    const r = await POST(`/api/documents/${b.json().id}/reserve`)
    const blokeRez = await prisma.tBLSTOCK.findUnique({ where: { id: sBloke.id } })
    const rezerveEdildi = Number(blokeRez?.reservedQty ?? 0) > 0
    yaz('S3', 'satırda statü YOKKEN rezervasyon — BLOKE stok rezerve ediliyor mu', !rezerveEdildi,
      rezerveEdildi ? `BLOKE stoktan ${blokeRez?.reservedQty} rezerve edildi (operasyon bu statüye izin vermiyor)` : `bloke stoğa dokunulmadı (rezerv ${blokeRez?.reservedQty ?? 0})`)
    if (r.statusCode === 200) await POST(`/api/documents/${b.json().id}/release-reservation`)
  }
}

console.log('\n③ TOPLU İŞLEM YOLU')
{
  const r = await POST('/api/stock/bulk-action', { operationTypeId: opCik.id, stockIds: [sBloke.id] })
  const cevap = JSON.stringify(r.json())
  const islendi = (r.json() as { applied?: unknown[] })?.applied?.length ?? 0
  const olusan = (r.json() as { documentId?: number })?.documentId
  if (olusan) belgeler.push(olusan)
  yaz('S4', 'Toplu İşlem ile BLOKE stok üzerinde işlem', islendi === 0, `${r.statusCode} işlenen=${islendi} · ${cevap.slice(0, 160)}`)
}

console.log('\n④ İŞ EMRİ YOLU (belgeyi doğrudan CONFIRMED açar, okutma yok)')
{
  const depo = await prisma.tBLWAREHOUSE.findFirst({ where: { companyId: CO } })
  const kul = await prisma.tBLUSER.findFirst({ where: { companyId: CO } })
  const opIc = await prisma.tBLOPERATIONTYPE.findFirst({
    where: { companyId: CO, direction: 'INTERNAL' }, include: { statusLinks: true }, orderBy: { code: 'asc' },
  })
  if (!depo || !kul || !opIc) console.log('    (depo/kullanıcı/iç operasyon yok — atlandı)')
  else {
    const izinliIc = opIc.statusLinks.some((t) => t.sourceStatusId === BLOKE.id)
    const wo = await prisma.tBLWORKORDER.create({
      data: {
        companyId: CO, orderNo: `STAWO-${damga}`, warehouseId: depo.id, type: 'TRANSFER', status: 'IN_PROGRESS', createdById: kul.id,
        lines: { create: [{ companyId: CO, lineNo: 1, productId: urun.id, unitId: birim, quantity: 5, collectedQty: 5, batchNo: PARTI, sourceLocationId: lok.id, sourceStatusId: BLOKE.id, targetLocationId: lok.id, targetStatusId: izinli.id }] },
      },
    })
    const r = await POST(`/api/work-orders/${wo.id}/complete`)
    const woSonuc = r.json() as { generatedDocumentId?: number; error?: string }
    if (woSonuc?.generatedDocumentId) belgeler.push(woSonuc.generatedDocumentId)
    yaz('S5', `iş emriyle BLOKE statüden hareket (iç operasyon ${opIc.code} bu statüye ${izinliIc ? 'İZİNLİ' : 'İZİNSİZ'})`,
      izinliIc || r.statusCode >= 400, `${r.statusCode} ${JSON.stringify(woSonuc).slice(0, 130)}`, izinliIc)
    await prisma.tBLWORKORDERLINE.deleteMany({ where: { workOrderId: wo.id } })
    await prisma.tBLWORKORDER.delete({ where: { id: wo.id } }).catch(() => undefined)
  }
}

console.log('\n⑤ ÖNERİ / RAF BESLEME (bloke stoğu kaynak gösteriyor mu)')
{
  const b = await cikisBelgesi({ sourceStatusId: izinli.id, qty: 10 })
  if (b.statusCode === 201) {
    const r = await app.inject({ method: 'GET', url: `/api/suggest-list?documentId=${b.json().id}`, headers: auth })
    if (r.statusCode !== 200) yaz('S6', 'çıkış önerisi', false, `öneri ucu ${r.statusCode}: ${r.body.slice(0, 100)} — ÖLÇÜLEMEDİ`)
    else {
      const satirlar = ((r.json() as { rows?: Array<{ stokMiktari: string }> }).rows ?? [])
      const izinliToplam = Number((await prisma.tBLSTOCK.aggregate({ where: { companyId: CO, productId: urun.id, statusId: izinli.id, mainQty: { gt: 0 } }, _sum: { mainQty: true } }))._sum.mainQty ?? 0)
      const gosterilen = Number(satirlar[0]?.stokMiktari ?? -1)
      yaz('S6', 'çıkış önerisi BLOKE stoğu da sayıyor mu', gosterilen >= 0 && gosterilen <= izinliToplam,
        gosterilen < 0 ? 'öneri satırı yok — ÖLÇÜLEMEDİ'
          : `öneri ${gosterilen} birim gösteriyor · izinli statüde ${izinliToplam} var${gosterilen > izinliToplam ? ' → BLOKE stok da sayılmış' : ''}`)
    }
  }
}

// ── temizlik ──
for (const id of [...belgeler].reverse()) {
  const d = await prisma.tBLDOCUMENT.findUnique({ where: { id } })
  if (d?.status === 'COMPLETED') await POST(`/api/documents/${id}/reverse`)
}
await prisma.tBLSTOCKLEDGER.deleteMany({ where: { documentId: { in: belgeler } } })
await prisma.tBLDOCUMENTLINESCOPE.deleteMany({ where: { documentLine: { documentId: { in: belgeler } } } })
await prisma.tBLDOCUMENTLINE.deleteMany({ where: { documentId: { in: belgeler } } })
await prisma.tBLDOCUMENTSTATUSHISTORY.deleteMany({ where: { documentId: { in: belgeler } } })
await prisma.tBLDOCUMENT.deleteMany({ where: { id: { in: belgeler } } })
await prisma.tBLSTOCK.deleteMany({ where: { companyId: CO, batchNo: PARTI } })
await prisma.tBLSTOCKLEDGER.deleteMany({ where: { companyId: CO, batchNo: PARTI } })

console.log(`\n╔═══ ÖZET · ${bulgular.length} BULGU`)
for (const b of bulgular) console.log(`  ✗ ${b}`)
console.log('╚═══ (prob verisi silindi)')
void stokIds
await app.close()
await prisma.$disconnect()
