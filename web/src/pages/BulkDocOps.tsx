import { useCallback, useEffect, useState } from 'react'
import { App, Button, Card, Modal, Select, Space, Table, Tag } from 'antd'
import { ReloadOutlined, CheckCircleOutlined } from '@ant-design/icons'
import { axiosInstance } from '../providers/dataProvider'
import { PageHeader } from '../components/PageHeader'

type Doc = { id: number; documentNo: string; status: string; operationType?: { code?: string; direction?: string }; documentStatus?: { name?: string; color?: string }; _count?: { lines?: number } }

const DIRS = [{ value: 'INBOUND', label: 'Giriş' }, { value: 'OUTBOUND', label: 'Çıkış' }, { value: 'INTERNAL', label: 'Transfer' }]
const ACTIONS = [{ value: 'confirm', label: 'Onaya Gönder' }, { value: 'complete', label: 'Onayla (stok işle)' }, { value: 'cancel', label: 'İptal' }]

export const BulkDocOps = () => {
  const { message, modal } = App.useApp()
  const [dir, setDir] = useState<string | undefined>('OUTBOUND')
  const [rows, setRows] = useState<Doc[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<number[]>([])
  const [action, setAction] = useState<string>('confirm')
  const [busy, setBusy] = useState(false)

  const load = useCallback(() => {
    setLoading(true); setSelected([])
    axiosInstance.get('/api/documents', { params: { ...(dir ? { direction: dir } : {}), openOnly: 'true', pageSize: 200 } })
      .then((r) => setRows(Array.isArray(r.data) ? r.data : (r.data.data ?? [])))
      .finally(() => setLoading(false))
  }, [dir])
  useEffect(load, [load])

  const apply = () => {
    if (selected.length === 0) { message.warning('Belge seçin'); return }
    const label = ACTIONS.find((a) => a.value === action)?.label
    modal.confirm({
      title: `${selected.length} belgeye "${label}" uygulansın mı?`,
      onOk: async () => {
        setBusy(true)
        try {
          const r = await axiosInstance.post('/api/documents/bulk-action', { ids: selected, action })
          message.success(`${r.data.ok} başarılı, ${r.data.failedCount} başarısız`)
          if (r.data.failedCount) message.warning(r.data.failed.map((f: { id: number; error: string }) => `#${f.id}: ${f.error}`).join(' · '))
          load()
        } catch (e) {
          message.error((e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'İşlem başarısız')
        } finally { setBusy(false) }
      },
    })
  }

  return (
    <div className="og-page">
      <PageHeader title="Toplu İşlem" subtitle="Açık belgeleri seç → toplu yaşam-döngüsü aksiyonu uygula" />
      <Card className="og-toolbar" size="small" style={{ marginBottom: 14 }} styles={{ body: { padding: '10px 14px' } }}>
        <Space wrap size={12}>
          <Select style={{ width: 150 }} value={dir} onChange={setDir} allowClear placeholder="Yön (hepsi)" options={DIRS} />
          <Button icon={<ReloadOutlined />} onClick={load}>Yenile</Button>
          <span style={{ borderLeft: '1px solid var(--og-border)', height: 22 }} />
          <Select style={{ width: 200 }} value={action} onChange={setAction} options={ACTIONS} />
          <Button type="primary" icon={<CheckCircleOutlined />} loading={busy} disabled={selected.length === 0} onClick={apply}>
            Seçili {selected.length} Belgeye Uygula
          </Button>
        </Space>
      </Card>
      <Card className="og-section-card" size="small" title={`Açık Belgeler (${rows.length})`}>
        <Table<Doc>
          rowKey="id" size="small" loading={loading} dataSource={rows} pagination={{ pageSize: 20 }}
          rowSelection={{ selectedRowKeys: selected, onChange: (k) => setSelected(k as number[]) }}
          columns={[
            { title: 'Belge No', dataIndex: 'documentNo' },
            { title: 'Operasyon', dataIndex: ['operationType', 'code'], render: (v) => v ?? '—' },
            { title: 'Yön', dataIndex: ['operationType', 'direction'], render: (v) => DIRS.find((d) => d.value === v)?.label ?? v },
            { title: 'Durum', dataIndex: 'status', render: (v, r) => r.documentStatus?.name ? <Tag color={r.documentStatus.color || 'default'}>{r.documentStatus.name}</Tag> : <Tag>{v}</Tag> },
            { title: 'Satır', dataIndex: ['_count', 'lines'], align: 'right' as const, render: (v) => v ?? 0 },
          ]}
        />
      </Card>
    </div>
  )
}
