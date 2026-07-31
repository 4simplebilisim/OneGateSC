import type { DataProvider } from '@refinedev/core'
import axios from 'axios'

// Production build'de varsayılan SAME-ORIGIN ('' → /api nginx proxy'sine gider) — canlı bundle'a asla
// localhost gömülmesin (aksi hâlde canlı site kullanıcının makinesindeki API'ye bağımlı kalır — yaşandı).
// Dev'de Vite localhost:3000'e gider; VITE_API_URL her ikisini de ezebilir.
const API_URL = import.meta.env.VITE_API_URL ?? (import.meta.env.PROD ? '' : 'http://localhost:3000')
export const axiosInstance = axios.create({ baseURL: API_URL })

// Her isteğe JWT + firma (tenant) header'ı ekle
axiosInstance.interceptors.request.use((config) => {
  const token = localStorage.getItem('og_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  // İsteğe özel x-company-id verilmişse (ör. super-admin ürünü belirli firmaya kaydederken) ona dokunma;
  // yoksa global seçili firmayı (og_company) uygula.
  const companyId = localStorage.getItem('og_company')
  if (companyId && !config.headers['x-company-id']) config.headers['x-company-id'] = companyId
  return config
})

// 401 (geçersiz/eksik token) → oturumu temizle + login'e dön.
// Tüm GET'ler artık auth'lu; özel ekranlar axiosInstance'ı doğrudan kullandığından
// Refine onError'a güvenemeyiz — global ağ: geçersiz token'da app kilitlenmesin, login'e gitsin.
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status
    const url: string = error?.config?.url ?? ''
    if (status === 401 && !url.includes('/api/auth/')) {
      // Tek oturum: başka cihazda giriş yapıldıysa Login ekranında açıklama göster
      if (error?.response?.data?.code === 'SESSION_SUPERSEDED') {
        localStorage.setItem('og_session_msg', 'Hesabınız başka bir cihazda/oturumda açıldığı için buradaki oturumunuz kapatıldı.')
      }
      localStorage.removeItem('og_token')
      localStorage.removeItem('og_user')
      localStorage.removeItem('og_company')
      if (!window.location.pathname.startsWith('/login')) window.location.href = '/login'
    }
    return Promise.reject(error)
  },
)

// OneGate listeleri: dizi VEYA {data,total} → tek şekle indir
// (axios data 'any' olduğu için data:any[] — Refine'ın generic TData[] beklentisine uyar)
const normalize = (d: any): { data: any[]; total: number } => {
  if (Array.isArray(d)) return { data: d, total: d.length }
  return { data: d?.data ?? [], total: d?.total ?? d?.data?.length ?? 0 }
}

export const dataProvider: DataProvider = {
  getApiUrl: () => API_URL,
  getList: async ({ resource, pagination, filters }) => {
    const params: Record<string, unknown> = {}
    if (pagination) {
      params.page = pagination.currentPage
      params.pageSize = pagination.pageSize
    }
    const search = filters?.find((f) => 'field' in f && f.field === 'search') as { value?: unknown } | undefined
    if (search?.value) params.search = search.value
    const { data } = await axiosInstance.get(`/api/${resource}`, { params })
    return normalize(data)
  },
  getOne: async ({ resource, id }) => ({ data: (await axiosInstance.get(`/api/${resource}/${id}`)).data }),
  create: async ({ resource, variables }) => ({ data: (await axiosInstance.post(`/api/${resource}`, variables)).data }),
  update: async ({ resource, id, variables }) => ({ data: (await axiosInstance.patch(`/api/${resource}/${id}`, variables)).data }),
  deleteOne: async ({ resource, id }) => ({ data: (await axiosInstance.delete(`/api/${resource}/${id}`)).data }),
  custom: async ({ url, method, payload, query }) => ({
    data: (await axiosInstance.request({ url, method, data: payload, params: query })).data,
  }),
}
