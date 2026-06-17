import type { DataProvider } from '@refinedev/core'
import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'
export const axiosInstance = axios.create({ baseURL: API_URL })

// Her isteğe JWT + firma (tenant) header'ı ekle
axiosInstance.interceptors.request.use((config) => {
  const token = localStorage.getItem('og_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  const companyId = localStorage.getItem('og_company')
  if (companyId) config.headers['x-company-id'] = companyId
  return config
})

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
