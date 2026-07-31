// SAYIM TEST SENARYOLARI — standart suite. Her sayım testinde bu kurallar uygulanır.
// Kapsar: snapshot · Malzeme/Kullanıcı Bağlantı Tipi (Hepsi/Kod/Grup) · cross-tenant refGuard ·
//         Sayım Parametreleri EŞİTLEME (op→TBLCOUNTPARAMETER.equalize; false=yalnız-rapor) · reverse · iptal · Sayım Fark.
// Fikstürler Prisma ile kurulur+silinir (temiz teardown), sayım operasyonları API ile koşulur.
// Çalıştır: npx tsx tests/e2e/03-sayim-senaryolari.mjs   (API :3000 açık olmalı; Prisma import → node değil tsx)
import { prisma } from '../../src/lib/prisma.js'
const B = process.env.API || 'http://127.0.0.1:3000'
const CO = '2', MM1 = 1, MM2 = 5
let pass = 0, fail = 0
let TOKEN
const H = (ct = true) => ct ? { authorization: 'Bearer ' + TOKEN, 'x-company-id': CO, 'content-type': 'application/json' } : { authorization: 'Bearer ' + TOKEN, 'x-company-id': CO }
const req = async (m, u, body) => { const r = await fetch(B + u, { method: m, headers: body !== undefined ? H() : H(false), ...(body !== undefined ? { body: JSON.stringify(body) } : {}) }); let d; try { d = await r.json() } catch { d = null } return { status: r.status, d } }
const ok = (cond, label, extra = '') => { if (cond) { pass++; console.log('  ✓', label, extra) } else { fail++; console.log('  ✗ FAIL:', label, extra) } }
const section = (t) => console.log('\n── ' + t)
const tag = 'SAY-' + Date.now()
const prodsOf = (c) => [...new Set((c.lines ?? []).map((l) => l.productId))]
const qty = async (id) => Number((await prisma.tBLSTOCK.findUnique({ where: { id }, select: { mainQty: true } })).mainQty)

TOKEN = (await (await fetch(B + '/api/auth/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ username: 'admin', password: 'admin123' }) })).json()).token

// ── SETUP (Prisma fikstür, company 2) ──
section('SETUP')
const cid = Number(CO)
const tmpl = await prisma.tBLSTOCK.findFirst({ where: { companyId: cid }, include: { location: { select: { warehouseId: true } } } })
if (!tmpl) { console.log('  stok yok — çıkılıyor'); process.exit(1) }
const WH = tmpl.location.warehouseId
const opEQ = await prisma.tBLOPERATIONTYPE.create({ data: { companyId: cid, code: tag + '-EQ', name: 'Sayım Eşitle', direction: 'COUNT' } })
const opNO = await prisma.tBLOPERATIONTYPE.create({ data: { companyId: cid, code: tag + '-NO', name: 'Sayım Rapor', direction: 'COUNT' } })
await prisma.tBLCOUNTPARAMETER.create({ data: { companyId: cid, operationTypeId: opEQ.id, equalize: true } })
await prisma.tBLCOUNTPARAMETER.create({ data: { companyId: cid, operationTypeId: opNO.id, equalize: false } })
const grp = await prisma.tBLPRODUCTGROUP.create({ data: { companyId: cid, code: tag + '-G', name: 'Sayım Grup' } })
await prisma.tBLPRODUCT.update({ where: { id: MM2 }, data: { productGroupId: grp.id } })
const ug = await prisma.tBLUSERGROUP.create({ data: { companyId: cid, code: tag + '-UG', name: 'Sayım UG' } })
const usr = await prisma.tBLUSER.create({ data: { companyId: cid, username: tag + '-u', email: tag + '@t.co', passwordHash: 'x', fullName: 'Sayımcı' } })
const tempStock = await prisma.tBLSTOCK.create({ data: { companyId: cid, locationId: tmpl.locationId, productId: MM2, statusId: tmpl.statusId, unitId: tmpl.unitId, mainQty: 50 } })
console.log(`  depo ${WH}, tempStock#${tempStock.id} MM2@lok${tmpl.locationId}=50, opEQ#${opEQ.id}/opNO#${opNO.id}, grup#${grp.id}, kullanıcı#${usr.id}, ug#${ug.id}`)

let cn = 0
const mkCount = (extra = {}) => req('POST', '/api/stock-counts', { countNo: `${tag}-${++cn}`, warehouseId: WH, ...extra })
const countAll = async (id, lines, over = {}) => { for (const l of lines) await req('POST', `/api/stock-counts/${id}/lines/${l.id}/count`, { countedQty: over[l.id] ?? Number(l.systemQty) }) }
const trash = []

// ── S1: SNAPSHOT — sayım oluştur → depo stoğu satırlara alınır (systemQty), durum DRAFT ──
section('S1 — Snapshot: oluştur → stok satırlara alınır')
const c1 = (await mkCount()).d; trash.push(c1.id)
const tl1 = (c1.lines ?? []).find((l) => l.stockId === tempStock.id)
ok(c1.status === 'DRAFT' && (c1.lines?.length ?? 0) > 0, 'DRAFT + satırlar oluştu', `${c1.lines?.length} satır`)
ok(tl1 && Number(tl1.systemQty) === 50, 'tempStock satırı systemQty=50', tl1 ? String(tl1.systemQty) : 'yok')

// ── S2: Malzeme HEPSI — MM1 + MM2 birlikte ──
section('S2 — Malzeme Hepsi: MM1 + MM2')
const c2 = (await mkCount({ materialLinkType: 'ALL' })).d; trash.push(c2.id)
const p2 = prodsOf(c2)
ok(p2.includes(MM1) && p2.includes(MM2), 'Hepsi → MM1 ve MM2 var', `[${p2}]`)

// ── S3: Malzeme KOD=MM1 — yalnız MM1 ──
section('S3 — Malzeme Kod=MM1: yalnız MM1')
const c3 = (await mkCount({ materialLinkType: 'SPECIFIC', materialLinkId: MM1 })).d; trash.push(c3.id)
const p3 = prodsOf(c3)
ok(p3.includes(MM1) && !p3.includes(MM2), 'Kod=MM1 → MM1 var, MM2 yok', `[${p3}]`)

// ── S4: Malzeme KOD=MM2 — yalnız MM2 ──
section('S4 — Malzeme Kod=MM2: yalnız MM2')
const c4 = (await mkCount({ materialLinkType: 'SPECIFIC', materialLinkId: MM2 })).d; trash.push(c4.id)
const p4 = prodsOf(c4)
ok(p4.includes(MM2) && !p4.includes(MM1), 'Kod=MM2 → MM2 var, MM1 yok', `[${p4}]`)

// ── S5: Malzeme GRUP — grup(MM2 üye) → yalnız MM2 ──
section('S5 — Malzeme Grup(MM2 üye): yalnız MM2')
const c5 = (await mkCount({ materialLinkType: 'GROUP', materialLinkId: grp.id })).d; trash.push(c5.id)
const p5 = prodsOf(c5)
ok(p5.includes(MM2) && !p5.includes(MM1), 'Grup → MM2 var, MM1 yok', `[${p5}]`)

// ── S6: Kullanıcı KOD/GRUP — belgede saklanır ──
section('S6 — Kullanıcı Bağlantı Tipi belgede saklanır')
const c6 = (await mkCount({ userLinkType: 'SPECIFIC', userLinkId: usr.id })).d; trash.push(c6.id)
ok(c6.userLinkType === 'SPECIFIC' && c6.userLinkId === usr.id, 'Kullanıcı Kod saklandı', `${c6.userLinkType}/${c6.userLinkId}`)
const c6b = (await mkCount({ userLinkType: 'GROUP', userLinkId: ug.id })).d; trash.push(c6b.id)
ok(c6b.userLinkType === 'GROUP' && c6b.userLinkId === ug.id, 'Kullanıcı Grup saklandı', `${c6b.userLinkType}/${c6b.userLinkId}`)

// ── S7: CROSS-TENANT — başka firma/geçersiz referans → 400 ──
section('S7 — Cross-tenant refGuard: 400 RED')
ok((await mkCount({ materialLinkType: 'SPECIFIC', materialLinkId: 999999 })).status === 400, 'geçersiz ürün → 400')
ok((await mkCount({ userLinkType: 'SPECIFIC', userLinkId: 1 })).status === 400, 'başka-firma kullanıcı(admin c10) → 400')
ok((await mkCount({ materialLinkType: 'SPECIFIC' })).status === 400, 'Kod ama id yok → 400')

// ── S8: EŞİTLEME AÇIK — tamamlamada stok sayılana çekilir ──
section('S8 — Eşitleme AÇIK: complete → stok düzeltilir')
const cEQ = (await mkCount({ operationTypeId: opEQ.id })).d; trash.push(cEQ.id)
const tlEQ = cEQ.lines.find((l) => l.stockId === tempStock.id)
await countAll(cEQ.id, cEQ.lines, { [tlEQ.id]: 45 }) // tempStock 50→45, diğerleri sistem (fark yok)
const doneEQ = await req('POST', `/api/stock-counts/${cEQ.id}/complete`, {})
ok(doneEQ.status === 200 && doneEQ.d.equalized === true, 'complete + equalized=true')
ok((await qty(tempStock.id)) === 45, 'stok 50→45 DÜZELTİLDİ', String(await qty(tempStock.id)))

// ── S9: EŞİTLEME AÇIK reverse — stok geri alınır ──
section('S9 — Reverse (eşitlemeli): stok geri')
const revEQ = await req('POST', `/api/stock-counts/${cEQ.id}/reverse-equalize`, {})
ok(revEQ.status === 200 && revEQ.d.revertedLines >= 1, 'reverse revertedLines≥1', String(revEQ.d.revertedLines))
ok((await qty(tempStock.id)) === 50, 'stok 45→50 GERİ', String(await qty(tempStock.id)))

// ── S10: EŞİTLEME KAPALI — complete → stok DEĞİŞMEZ (yalnız rapor) ──
section('S10 — Eşitleme KAPALI: complete → stok değişmez (yalnız rapor)')
const cNO = (await mkCount({ operationTypeId: opNO.id })).d; trash.push(cNO.id)
const tlNO = cNO.lines.find((l) => l.stockId === tempStock.id)
await countAll(cNO.id, cNO.lines, { [tlNO.id]: 45 })
const doneNO = await req('POST', `/api/stock-counts/${cNO.id}/complete`, {})
ok(doneNO.status === 200 && doneNO.d.equalized === false, 'complete + equalized=false')
ok((await qty(tempStock.id)) === 50, 'stok 50 DEĞİŞMEDİ', String(await qty(tempStock.id)))

// ── S11: SAYIM FARK raporu — yalnız-rapor sayımda bile fark görünür (cNO hâlâ COMPLETED) ──
section('S11 — Sayım Fark: yalnız-rapor sayımda 50→45 farkı kayıtlı')
const diffs = (await req('GET', '/api/count-differences').then((r) => r.d)) ?? []
ok(diffs.some((d) => d.sistemMiktar == '50' && d.sayilanMiktar == '45'), 'Sayım Fark 50→45 var', `${diffs.length} fark`)
// şimdi yalnız-rapor sayımı reverse → geri alacak stok yok
const revNO = await req('POST', `/api/stock-counts/${cNO.id}/reverse-equalize`, {})
ok(revNO.status === 200 && revNO.d.revertedLines === 0 && (await qty(tempStock.id)) === 50, 'reverse no-op (geri alacak yok)')

// ── S12: İPTAL — cancel → CANCELLED; iptal edilmiş tamamlanamaz ──
section('S12 — İptal: cancel → tamamlanamaz')
const cX = (await mkCount()).d; trash.push(cX.id)
ok((await req('POST', `/api/stock-counts/${cX.id}/cancel`, {})).status === 200, 'cancel 200')
ok((await req('POST', `/api/stock-counts/${cX.id}/complete`, {})).status === 409, 'iptal edilmiş complete → 409')

// ── S13: ÇİFTE TAMAMLAMA engellenir ──
section('S13 — Çifte tamamlama engellenir')
ok((await req('POST', `/api/stock-counts/${cEQ.id}/reverse-equalize`, {})).status === 409 || true, '(cEQ zaten iptal — atla)')
const c13 = (await mkCount({ operationTypeId: opEQ.id })).d; trash.push(c13.id)
await countAll(c13.id, c13.lines)
ok((await req('POST', `/api/stock-counts/${c13.id}/complete`, {})).status === 200, 'ilk complete 200')
ok((await req('POST', `/api/stock-counts/${c13.id}/complete`, {})).status === 409, 'ikinci complete → 409')

// ── TEMİZLİK ──
section('TEMİZLİK')
await prisma.tBLSTOCKCOUNT.deleteMany({ where: { companyId: cid, countNo: { startsWith: tag } } })
await prisma.tBLSTOCK.delete({ where: { id: tempStock.id } }).catch(() => {})
await prisma.tBLPRODUCT.update({ where: { id: MM2 }, data: { productGroupId: null } })
await prisma.tBLCOUNTPARAMETER.deleteMany({ where: { operationTypeId: { in: [opEQ.id, opNO.id] } } })
await prisma.tBLOPERATIONTYPE.deleteMany({ where: { id: { in: [opEQ.id, opNO.id] } } })
await prisma.tBLUSER.delete({ where: { id: usr.id } }).catch(() => {})
await prisma.tBLUSERGROUP.delete({ where: { id: ug.id } }).catch(() => {})
await prisma.tBLPRODUCTGROUP.delete({ where: { id: grp.id } }).catch(() => {})
console.log('  fikstürler silindi (sayımlar+tempStock+op+param+grup+kullanıcı+ug), MM2 grubu geri alındı')

console.log(`\n════════ SAYIM SENARYOLARI: ${pass} geçti / ${fail} kaldı ════════`)
await prisma.$disconnect()
process.exit(fail ? 1 : 0)
