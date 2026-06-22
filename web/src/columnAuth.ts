// Kullanıcının kolon (alan) yetkileri — login yanıtındaki columnAuth'tan (og_user) okunur.
// Kayıt yoksa VISIBLE (görünür+düzenlenebilir). super-admin/ADMIN her zaman VISIBLE (bypass).
export type ColumnMode = 'VISIBLE' | 'READONLY' | 'HIDDEN'
type ColumnAuthMap = Record<string, Record<string, 'READONLY' | 'HIDDEN'>>

function currentUser(): { roles?: string[]; isSuperAdmin?: boolean; columnAuth?: ColumnAuthMap } | null {
  try { return JSON.parse(localStorage.getItem('og_user') ?? 'null') } catch { return null }
}

export function columnMode(resource: string, column: string): ColumnMode {
  const u = currentUser()
  if (!u || u.isSuperAdmin || (u.roles ?? []).includes('ADMIN')) return 'VISIBLE'
  return u.columnAuth?.[resource]?.[column] ?? 'VISIBLE'
}

// Bu ekranda gizlenecek kolon adları (HIDDEN). Admin/super-admin → boş.
export function hiddenColumns(resource: string): Set<string> {
  const u = currentUser()
  if (!u || u.isSuperAdmin || (u.roles ?? []).includes('ADMIN')) return new Set()
  const map = u.columnAuth?.[resource] ?? {}
  return new Set(Object.entries(map).filter(([, m]) => m === 'HIDDEN').map(([c]) => c))
}
