import { useEffect, useState } from 'react'
import { Select, Tooltip } from 'antd'
import { BankOutlined } from '@ant-design/icons'
import { axiosInstance } from '../providers/dataProvider'

type Co = { id: number; code: string; name: string }

// Firma (tenant) switcher — süper-admin veya çok-firmalı kullanıcıda görünür.
// og_company'yi değiştirir (dataProvider x-company-id header'ı) → sayfayı yeniler (tüm veri yeni firmaya göre).
export const CompanySwitcher = ({ color }: { color: string }) => {
  const [cos, setCos] = useState<Co[]>([])
  const [cur, setCur] = useState<number | undefined>(Number(localStorage.getItem('og_company')) || undefined)

  useEffect(() => {
    axiosInstance.get('/api/companies').then((r) => setCos((Array.isArray(r.data) ? r.data : (r.data.data ?? [])) as Co[])).catch(() => setCos([]))
  }, [])

  // Süper-admin (çok firma görür) ya da >1 erişilebilir firma varsa göster
  if (cos.length <= 1) return null

  const change = (v: number) => {
    localStorage.setItem('og_company', String(v))
    setCur(v)
    window.location.reload() // aktif firma değişti → tüm listeler/formlar yeni firmadan çekilsin
  }

  return (
    <Tooltip title="Aktif firma (tenant)">
      <Select
        size="small" variant="borderless" value={cur} onChange={change}
        suffixIcon={<BankOutlined style={{ color }} />}
        style={{ minWidth: 150 }} popupMatchSelectWidth={false}
        options={cos.map((c) => ({ value: c.id, label: `${c.code} — ${c.name}` }))}
      />
    </Tooltip>
  )
}
