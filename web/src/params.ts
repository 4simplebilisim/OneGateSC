import { axiosInstance } from './providers/dataProvider'

// Genel parametre okuyucu (frontend) — Parametreler ekranındaki değerleri davranışa bağlar.
// Modül-seviyesi cache: firma değişimi zaten sayfayı yenilediğinden (CompanySwitcher reload) güvenli.
let cache: Record<string, string> | null = null

export async function fetchParams(): Promise<Record<string, string>> {
  if (cache) return cache
  try {
    const r = await axiosInstance.get('/api/parameters', { params: { pageSize: 500 } })
    const rows = (Array.isArray(r.data) ? r.data : (r.data.data ?? [])) as { code: string; value?: string | null; isActive?: boolean }[]
    cache = Object.fromEntries(rows.filter((x) => x.isActive !== false).map((x) => [x.code, (x.value ?? '').trim()]))
  } catch { cache = {} }
  return cache
}

export async function paramInt(code: string): Promise<number | null> {
  const v = (await fetchParams())[code]
  if (!v) return null
  const n = Number(v.replace(',', '.'))
  return Number.isFinite(n) ? n : null
}
