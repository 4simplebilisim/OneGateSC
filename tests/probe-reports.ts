import { buildApp } from '../src/app.js'
import { prisma } from '../src/lib/prisma.js'

/**
 * RAPOR PROBU — tanımlı her raporu GERÇEKTEN ÇALIŞTIRIR.
 *
 * "Ekran var" ≠ "rapor çalışıyor". Motor tanımadığı sourceKey için sessizce []
 * dönüyor — yani boş rapor, bozuk raporla aynı görünüyor. Bu prob ikisini ayırır:
 *   MOTOR YOK   → sourceKey runReport'ta hiç ele alınmıyor (her zaman boş)
 *   VERİ YOK    → motor var, bu firmada uygun kayıt yok
 *   ÇALIŞIYOR   → satır döndü
 *   HATA        → çalıştırma patladı
 */
const CO = Number(process.env.DEMO_COMPANY_ID ?? 2)

// runReport'un tanıdığı kaynaklar (reportBuilder.ts ile senkron tutulmalı)
const MOTORLU = new Set([
  'STOCK', 'PALLET_TRACK', 'DOCUMENTS', 'OPEN_DOCUMENTS', 'PALLETS',
  'MOVEMENTS_OUT', 'MOVEMENTS_IN', 'MOVEMENTS_TR', 'PALLET_HISTORY',
  'OCCUPANCY', 'SHIPMENTS', 'RETURNS', 'DOC_LOG', 'OPERATION_MOVEMENTS',
  'PRODUCT_LEDGER', 'EXPIRY_RISK', 'BATCH_TRACK', 'RESERVATIONS', 'COUNT_DIFF',
])

const app = await buildApp({ logger: false })
await app.ready()
const login = await app.inject({ method: 'POST', url: '/api/auth/login', payload: { username: process.env.DEMO_USER ?? 'admin', password: process.env.DEMO_PASSWORD ?? 'admin123' } })
if (login.statusCode !== 200) throw new Error('login: ' + login.body)
const auth = { authorization: `Bearer ${login.json().token as string}`, 'x-company-id': String(CO) }

const defs = await prisma.tBLREPORTDEF.findMany({
  where: { companyId: CO, isActive: true },
  include: { fields: true, criteria: true },
  orderBy: { id: 'asc' },
})

console.log(`\n╔═ RAPOR PROBU · firma ${CO} · ${defs.length} tanımlı rapor\n`)
const sonuc: Array<{ ad: string; kaynak: string; durum: string; detay: string }> = []

for (const d of defs) {
  const motorVar = MOTORLU.has(d.sourceKey)
  const r = await app.inject({ method: 'POST', url: `/api/report-defs/${d.id}/run`, headers: auth, payload: {} })
  let durum: string, detay: string
  if (r.statusCode !== 200) {
    durum = 'HATA'
    detay = `${r.statusCode} ${(r.json() as { error?: string })?.error ?? r.body.slice(0, 70)}`
  } else {
    const j = r.json() as { rows?: unknown[]; truncated?: boolean; cap?: number }
    const n = j.rows?.length ?? 0
    if (!motorVar) { durum = 'MOTOR YOK'; detay = `sourceKey "${d.sourceKey}" runReport'ta ele alınmıyor — her zaman boş döner` }
    else if (n === 0) { durum = 'VERİ YOK'; detay = 'motor var, bu firmada uygun kayıt yok' }
    else { durum = 'ÇALIŞIYOR'; detay = `${n} satır${j.truncated ? ` (üst sınır ${j.cap} — kırpıldı)` : ''}` }
  }
  sonuc.push({ ad: d.name, kaynak: d.sourceKey, durum, detay })
  const im = durum === 'ÇALIŞIYOR' ? '✓' : durum === 'VERİ YOK' ? '·' : '✗'
  console.log(`  ${im} ${d.name.padEnd(28)} [${d.sourceKey.padEnd(20)}] ${durum.padEnd(10)} ${detay}`)
  // Kolon tanımı da kontrol: alansız rapor ekranda boş tablo gösterir
  if (durum === 'ÇALIŞIYOR' && d.fields.length === 0) {
    console.log(`      ⚠ KOLON TANIMI YOK — ekranda tablo boş görünür`)
    sonuc[sonuc.length - 1]!.detay += ' · KOLON TANIMI YOK'
  }
}

console.log('\n╔═══ ÖZET')
for (const durum of ['ÇALIŞIYOR', 'VERİ YOK', 'MOTOR YOK', 'HATA']) {
  const grup = sonuc.filter((s) => s.durum === durum)
  if (grup.length) console.log(`  ${durum}: ${grup.length}${durum === 'ÇALIŞIYOR' ? '' : ' → ' + grup.map((g) => g.kaynak).join(', ')}`)
}
const kolonsuz = sonuc.filter((s) => s.detay.includes('KOLON TANIMI YOK'))
if (kolonsuz.length) console.log(`  KOLONSUZ: ${kolonsuz.length} → ${kolonsuz.map((k) => k.kaynak).join(', ')}`)

// Motorda VAR ama hiçbir firmada TANIMLI OLMAYAN kaynaklar
const tanimli = new Set(defs.map((d) => d.sourceKey))
const tanimsiz = [...MOTORLU].filter((k) => !tanimli.has(k))
if (tanimsiz.length) console.log(`  MOTOR VAR / RAPOR TANIMI YOK: ${tanimsiz.join(', ')}`)
console.log('╚═══')

await app.close()
await prisma.$disconnect()
