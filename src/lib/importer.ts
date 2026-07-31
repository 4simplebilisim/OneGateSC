// Excel/toplu içe aktarma yardımcıları. Frontend Excel'i parse edip KANONİK anahtarlı satırlar gönderir
// (ör. {code, name, unitCode}); backend kodları id'ye çözer, satır-satır oluşturur, satır-bazlı hata döner.

export type ImportResult = { created: number; total: number; errors: { row: number; error: string }[] }

/** Satırları tek tek işler; her satır bağımsız (biri hata verse diğerleri devam eder). row = Excel satır no (başlık +1). */
export async function importRows<T>(rows: T[], perRow: (row: T, index: number) => Promise<void>): Promise<ImportResult> {
  const errors: { row: number; error: string }[] = []
  let created = 0
  for (let i = 0; i < rows.length; i++) {
    try { await perRow(rows[i] as T, i); created++ }
    catch (e) { errors.push({ row: i + 2, error: e instanceof Error ? e.message : 'Bilinmeyen hata' }) }
  }
  return { created, total: rows.length, errors }
}

/** Hücre değerini string'e indir (Excel sayı/boşluk toleranslı). */
export const str = (v: unknown): string => (v == null ? '' : String(v).trim())
/** Eşleştirme için normalize (TR küçük harf). */
export const norm = (v: unknown): string => str(v).toLocaleLowerCase('tr')
/** Excel'den boolean: boş/1/evet/true/aktif → true varsayılanı; 0/hayır/false/pasif → false. */
export function parseBool(v: unknown, def = true): boolean {
  const s = norm(v)
  if (s === '') return def
  if (['0', 'hayir', 'hayır', 'false', 'pasif', 'no', 'h'].includes(s)) return false
  if (['1', 'evet', 'true', 'aktif', 'yes', 'e'].includes(s)) return true
  return def
}

type CodeDelegate = { findMany(a: { where: { companyId: number }; select: { id: true; code: true } }): Promise<{ id: number; code: string }[]> }
/** Bir tanım tablosunun code→id haritası (firma-scope). Satır döngüsünden ÖNCE bir kez çekilir (N+1 önlenir). */
export async function codeMap(delegate: CodeDelegate, companyId: number): Promise<Map<string, number>> {
  const rows = await delegate.findMany({ where: { companyId }, select: { id: true, code: true } })
  return new Map(rows.map((r) => [norm(r.code), r.id]))
}

/** Koddan id çöz: boşsa undefined (opsiyonel FK); doluysa ama bulunamazsa hata; required ise boş da hata. */
export function resolveCode(map: Map<string, number>, code: unknown, label: string, required = false): number | undefined {
  const c = norm(code)
  if (!c) { if (required) throw new Error(`${label} zorunlu`); return undefined }
  const id = map.get(c)
  if (id == null) throw new Error(`${label} bulunamadı: ${str(code)}`)
  return id
}
