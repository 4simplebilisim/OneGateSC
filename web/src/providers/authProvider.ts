import type { AuthProvider } from '@refinedev/core'
import { axiosInstance } from './dataProvider'

export const authProvider: AuthProvider = {
  login: async ({ username, password }) => {
    try {
      const { data } = await axiosInstance.post('/api/auth/login', { username, password })
      localStorage.setItem('og_token', data.token)
      localStorage.setItem('og_user', JSON.stringify(data.user))
      if (data.user.companyId) localStorage.setItem('og_company', String(data.user.companyId))
      // Mobil (el terminali) kullanıcı → backoffice yerine el terminaline düşer
      if (!data.user.isMobileUser) localStorage.setItem('og_notif_greet', '1') // ilk girişte zil popup'ı (backoffice)
      // Birden çok ürüne erişimi olan kullanıcı önce ürün seçer; "son kullandığıma git" işaretliyse atlanır
      const apps: { code: string; path: string }[] = data.user.apps ?? []
      const remembered = localStorage.getItem('og_app_remember') !== '0' ? localStorage.getItem('og_last_app') : null
      const target = remembered ? apps.find((a) => a.code === remembered) : null
      if (data.user.isMobileUser) return { success: true, redirectTo: '/m' }
      if (target && target.path !== '/') { window.location.href = target.path; return { success: true } }
      if (apps.length > 1 && !target) return { success: true, redirectTo: '/platform' }
      return { success: true, redirectTo: '/' }
    } catch {
      return { success: false, error: { name: 'Giriş hatası', message: 'Kullanıcı adı veya şifre hatalı' } }
    }
  },
  logout: async () => {
    localStorage.removeItem('og_token')
    localStorage.removeItem('og_user')
    localStorage.removeItem('og_company')
    return { success: true, redirectTo: '/login' }
  },
  check: async () =>
    localStorage.getItem('og_token') ? { authenticated: true } : { authenticated: false, redirectTo: '/login' },
  getIdentity: async () => {
    const raw = localStorage.getItem('og_user')
    return raw ? JSON.parse(raw) : null
  },
  getPermissions: async () => {
    const raw = localStorage.getItem('og_user')
    return raw ? (JSON.parse(raw).roles ?? []) : []
  },
  onError: async (error) => {
    const resp = (error as { response?: { status?: number; data?: { code?: string } } })?.response
    if (resp?.status === 401) {
      // Tek oturum: başka cihazda giriş yapıldıysa kullanıcıya açıkla (Login ekranı gösterir)
      if (resp.data?.code === 'SESSION_SUPERSEDED') {
        localStorage.setItem('og_session_msg', 'Hesabınız başka bir cihazda/oturumda açıldığı için buradaki oturumunuz kapatıldı.')
      }
      return { logout: true, redirectTo: '/login' }
    }
    return {}
  },
}
