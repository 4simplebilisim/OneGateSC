// Android el terminali menü tanımı — hem MobileHome render'ı hem kullanıcı ekran-yetkisi (SCREEN scope, 'm/...' anahtarı) bunu kullanır.
export type MobileMenuItem = { key: string; to: string; label: string }

export const MOBILE_MENU: MobileMenuItem[] = [
  { key: 'm/receipt', to: '/m/receipt', label: 'Mal Kabul' },
  { key: 'm/pick', to: '/m/pick', label: 'Toplama' },
  { key: 'm/count', to: '/m/count', label: 'Sayım' },
  { key: 'm/stock', to: '/m/stock', label: 'Stok Sorgu' },
]

// Kullanıcının el-terminali ekran yetkisi: 'm/' önekli SCREEN kodları. Boş = tümü serbest; super-admin/ADMIN bypass.
export function mobileScreenAllowed(menuKey: string, user: { roles?: string[]; isSuperAdmin?: boolean; screens?: string[] } | null | undefined): boolean {
  if (!user) return true
  if (user.isSuperAdmin || (user.roles ?? []).includes('ADMIN')) return true
  const mobile = (user.screens ?? []).filter((s) => s.startsWith('m/'))
  return mobile.length === 0 || mobile.includes(menuKey)
}
