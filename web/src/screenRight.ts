// Kullanıcının ekran hakları (aksiyon matrisi) — login yanıtındaki screenRights'tan (og_user) okunur.
// Kayıt yoksa tüm aksiyonlar serbest. super-admin/ADMIN her zaman serbest (bypass).
type Action = 'view' | 'add' | 'edit' | 'delete'
type Rights = { view: boolean; add: boolean; edit: boolean; delete: boolean }

function currentUser(): { roles?: string[]; isSuperAdmin?: boolean; screenRights?: Record<string, Rights> } | null {
  try { return JSON.parse(localStorage.getItem('og_user') ?? 'null') } catch { return null }
}

export function screenRight(resource: string, action: Action): boolean {
  const u = currentUser()
  if (!u || u.isSuperAdmin || (u.roles ?? []).includes('ADMIN')) return true
  const r = u.screenRights?.[resource]
  return r ? r[action] : true
}
