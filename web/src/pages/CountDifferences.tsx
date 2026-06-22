import { useEffect, useMemo, useState } from 'react'
import { App, Card, Select, Space, Switch, Table, Tag } from 'antd'
import { axiosInstance } from '../providers/dataProvider'
import { PageHeader } from '../components/PageHeader'

type Diff = {
  id: number
  sayimNo: string
  durum: string
  urun: string
  lokasyon: string
  sistemMiktar: string
  sayilanMiktar: string
  fark: string
}

// Eksik (sayılan < sistem, fark<0) → yeşil · Fazla (fark>0) → kırmızı
const rowBg = (fark: number) => (fark < 0 ? 'var(--og-diff-short, #e6f7ec)' : fark > 0 ? 'var(--og-diff-over, #fdecec)' : 'transparent')

export const CountDifferences = () => {
  const { message } = App.useApp()
  const [rows, setRows] = useState<Diff[]>([])
  const [loading, setLoading] = useState(true)
  const [onlyCompleted, setOnlyCompleted] = useState(false)
  const [countNo, setCountNo] = useState<string | undefined>()

  useEffect(() => {
    setLoading(true)
    axiosInstance.get('/api/count-differences', { params: onlyCompleted ? { completed: 'true' } : {} })
      .then((r) => setRows(Array.isArray(r.data) ? r.data : (r.data.data ?? [])))
      .catch((e) => message.error(e?.response?.data?.error ?? 'Yüklenemedi'))
      .finally(() => setLoading(false))
  }, [onlyCompleted, message])

  const countNos = useMemo(() => [...new Set(rows.map((r) => r.sayimNo))].map((v) => ({ value: v, label: v })), [rows])
  const shown = useMemo(() => (countNo ? rows.filter((r) => r.sayimNo === countNo) : rows), [rows, countNo])
  const eksik = shown.filter((r) => Number(r.fark) < 0).length
  const fazla = shown.filter((r) => Number(r.fark) > 0).length

  return (
    <div className="og-page">
      <PageHeader title="Sayım Fark" subtitle="Sayılan ile sistem miktarı farkları — Eksik (yeşil) / Fazla (kırmızı)" />

      <Card className="og-toolbar" size="small" style={{ marginBottom: 14 }} styles={{ body: { padding: '10px 14px' } }}>
        <Space wrap size={16}>
          <Space size={6}>
            <span style={{ color: 'var(--og-muted)', fontSize: 12.5 }}>Sayım Belge No</span>
            <Select style={{ minWidth: 180 }} allowClear showSearch optionFilterProp="label" placeholder="Hepsi" value={countNo} onChange={setCountNo} options={countNos} />
          </Space>
          <Space size={6}>
            <Switch checked={onlyCompleted} onChange={setOnlyCompleted} />
            <span style={{ fontSize: 12.5 }}>Sadece Onaylı (tamamlanmış)</span>
          </Space>
          {/* Renk açıklaması (StokBar: Depo Eşit/Eksik/Fazla) */}
          <Space size={10} style={{ marginLeft: 'auto' }}>
            <Tag color="green">Eksik · {eksik}</Tag>
            <Tag color="red">Fazla · {fazla}</Tag>
          </Space>
        </Space>
      </Card>

      <Card className="og-section-card" size="small" title={`Fark Satırları (${shown.length})`}>
        <Table<Diff>
          rowKey="id" size="small" loading={loading} dataSource={shown} pagination={{ pageSize: 25 }}
          locale={{ emptyText: 'Fark bulunamadı' }}
          onRow={(r) => ({ style: { background: rowBg(Number(r.fark)) } })}
          columns={[
            { title: 'Sayım No', dataIndex: 'sayimNo', width: 130 },
            { title: 'Durum', dataIndex: 'durum', width: 110, render: (v) => <Tag color={v === 'COMPLETED' ? 'green' : 'gold'}>{v === 'COMPLETED' ? 'Onaylı' : 'Açık'}</Tag> },
            { title: 'Lokasyon', dataIndex: 'lokasyon', width: 120 },
            { title: 'Ürün', dataIndex: 'urun' },
            { title: 'Sistem Miktar', dataIndex: 'sistemMiktar', align: 'right' as const },
            { title: 'Sayılan Miktar', dataIndex: 'sayilanMiktar', align: 'right' as const },
            { title: 'Fark', dataIndex: 'fark', align: 'right' as const, render: (v) => <strong style={{ color: Number(v) < 0 ? '#16a34a' : Number(v) > 0 ? '#dc2626' : undefined }}>{Number(v) > 0 ? `+${v}` : v}</strong> },
          ]}
        />
      </Card>
    </div>
  )
}
