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
      return { success: true, redirectTo: data.user.isMobileUser ? '/m' : '/' }
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
    if ((error as { response?: { status?: number } })?.response?.status === 401) {
      return { logout: true, redirectTo: '/login' }
    }
    return {}
  },
}
