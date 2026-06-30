// Ortak E2E harness — login, api(), reporter, prisma, tenant temizliği.
// Düz node (sıfır bağımlılık). Tüm testler bunu kullanır.
import 'dotenv/config'

export const BASE = process.env.E2E_BASE ?? 'http://localhost:3000'

export const api = async (m, p, { body, token, companyId } = {}) => {
  const h = {}
  if (body) h['Content-Type'] = 'application/json'
  if (token) h.Authorization = 'Bearer ' + token
  if (companyId) h['x-company-id'] = String(companyId)
  const r = await fetch(BASE + p, { method: m, headers: h, body: body ? JSON.stringify(body) : undefined })
  let d
  const t = await r.text()
  try { d = JSON.parse(t) } catch { d = t }
  return { status: r.status, data: d }
}

export const arr = (d) => (Array.isArray(d) ? d : (d?.data ?? []))
export const msg = (r) => (r.data && (r.data.error || r.data.message)) || r.status

export const login = async (username = 'admin', password = 'admin123') =>
  (await api('POST', '/api/auth/login', { body: { username, password } })).data.token

/** Basit raporlayıcı — ok(koşul, etiket, detay) + done() → {name,P,F,fails}. */
export function reporter(name) {
  let P = 0, F = 0
  const fails = []
  return {
    ok(cond, label, detail = '') {
      console.log((cond ? '  ✓ ' : '  ✗ ') + label + (detail ? ' — ' + detail : ''))
      cond ? P++ : (F++, fails.push(label))
    },
    section(t) { console.log('\n  ─ ' + t) },
    done() { return { name, P, F, fails } },
  }
}

export const prismaClient = async () => {
  const { PrismaPg } = await import('@prisma/adapter-pg')
  const { PrismaClient } = await import('@prisma/client')
  return new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) })
}

/**
 * Bir test firmasının (companyId) TÜM verisini FK-güvenli sırada siler, sonra firmayı siler.
 * Önceki başarısız koşulardan kalan kirliliği de temizler (idempotent reset).
 */
export async function purgeCompany(prisma, companyId) {
  if (!companyId) return
  const docs = await prisma.tBLDOCUMENT.findMany({ where: { companyId }, select: { id: true } })
  const docIds = docs.map((d) => d.id)
  const del = async (fn) => { try { await fn() } catch { /* yoksa geç */ } }
  if (docIds.length) {
    await del(() => prisma.tBLSTOCKLEDGER.deleteMany({ where: { documentId: { in: docIds } } }))
    await del(() => prisma.tBLDOCUMENTLINE.deleteMany({ where: { documentId: { in: docIds } } }))
  }
  await del(() => prisma.tBLSTOCKLEDGER.deleteMany({ where: { companyId } }))
  await del(() => prisma.tBLSTOCK.deleteMany({ where: { companyId } }))
  await del(() => prisma.tBLDOCUMENT.deleteMany({ where: { companyId } }))
  await del(() => prisma.tBLPRODUCTUNIT.deleteMany({ where: { companyId } }))
  await del(() => prisma.tBLPRODUCTFACILITY.deleteMany({ where: { companyId } }))
  await del(() => prisma.tBLPARTNERFACILITY.deleteMany({ where: { companyId } }))
  await del(() => prisma.tBLOPERATIONTYPE.deleteMany({ where: { companyId } }))
  await del(() => prisma.tBLSTATUS.deleteMany({ where: { companyId } })) // facility FK'sından ÖNCE
  await del(() => prisma.tBLPRODUCT.deleteMany({ where: { companyId } }))
  await del(() => prisma.tBLBUSINESSPARTNER.deleteMany({ where: { companyId } }))
  await del(() => prisma.tBLLOCATION.deleteMany({ where: { companyId } }))
  await del(() => prisma.tBLAREA.deleteMany({ where: { companyId } }))
  await del(() => prisma.tBLWAREHOUSE.deleteMany({ where: { companyId } })) // facility FK'sından ÖNCE
  await del(() => prisma.tBLUNIT.deleteMany({ where: { companyId } }))
  await del(() => prisma.tBLFACILITY.deleteMany({ where: { companyId } }))
  await del(() => prisma.tBLCOMPANY.delete({ where: { id: companyId } }))
}

/** Kod ile mevcut test firmasını bul + tüm verisini temizle (önceki koşu kalıntısı). */
export async function resetTestCompanyByCode(prisma, code) {
  const c = await prisma.tBLCOMPANY.findFirst({ where: { code }, select: { id: true } })
  if (c) await purgeCompany(prisma, c.id)
}
