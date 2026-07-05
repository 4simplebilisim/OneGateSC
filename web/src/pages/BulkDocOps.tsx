import { useCallback, useEffect, useMemo, useState } from 'react'
import { App, Alert, Button, Card, Select, Space, Table, Tag } from 'antd'
import { ReloadOutlined, CheckCircleOutlined, SettingOutlined, SendOutlined, RollbackOutlined, ClearOutlined, DeleteOutlined } from '@ant-design/icons'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { axiosInstance } from '../providers/dataProvider'
import { PageHeader } from '../components/PageHeader'

type Doc = { id: number; documentNo: string; status: string; operationTypeId?: number; operationType?: { code?: string; direction?: string }; documentStatus?: { name?: string; color?: string }; _count?: { lines?: number } }
type Op = { id: number; code: string; name?: string; direction: string; bulkAction?: boolean }
type ActionDef = { value: string; label: string; icon: ReactNode; primary?: boolean; ghost?: boolean; danger?: boolean }

const arr = (d: unknown) => (Array.isArray(d) ? d : ((d as { data?: unknown[] })?.data ?? []))
const DIR_LABEL: Record<string, string> = { INBOUND: 'Giriş', OUTBOUND: 'Çıkış', INTERNAL: 'Transfer' }
// StokBar gibi AYRI butonlar
const ACTIONS: ActionDef[] = [
  { value: 'confirm', label: 'Onaya Gönder', icon: <SendOutlined />, primary: true, ghost: true },
  { value: 'complete', label: 'Onay', icon: <CheckCircleOutlined />, primary: true },
  { value: 'reverse', label: 'Onay İptal', icon: <RollbackOutlined />, danger: true },
  { value: 'cancel-picking', label: 'Toplama İptal', icon: <ClearOutlined /> },
  { value: 'cancel', label: 'Sil', icon: <DeleteOutlined />, danger: true },
]

// Toplu İşlem — yalnız operasyon tanımında 'Toplu İşlem' parametresi (legacy BYTTOPLUISLEM) işaretli
// operasyonların belgeleri görünür. Ekran yön-bağlıdır: Giriş/Çıkış/Transfer menülerinin her birinde kendi yönü.
export const BulkDocOps = ({ direction }: { direction: 'INBOUND' | 'OUTBOUND' | 'INTERNAL' }) => {
  const { message, modal } = App.useApp()
  const [opId, setOpId] = useState<number>() // toplu-işlemli operasyonlardan biri (boş = hepsi)
  const [rows, setRows] = useState<Doc[]>([])
  const [ops, setOps] = useState<Op[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<number[]>([])
  const [busy, setBusy] = useState<string | null>(null) // hangi aksiyon yürüyor

  useEffect(() => {
    axiosInstance.get('/api/operation-types', { params: { pageSize: 300 } }).then((r) => setOps(arr(r.data) as Op[]))
  }, [])

  // Bu yönde 'Toplu İşlem' işaretli operasyonlar
  const bulkOps = useMemo(() => ops.filter((o) => o.bulkAction === true && o.direction === direction), [ops, direction])
  const bulkOpIds = useMemo(() => new Set(bulkOps.map((o) => o.id)), [bulkOps])
  const bulkOpOpts = useMemo(() => bulkOps.map((o) => ({ value: o.id, label: `${o.code}${o.name ? ' — ' + o.name : ''}` })), [bulkOps])

  const load = useCallback(() => {
    setLoading(true); setSelected([])
    axiosInstance.get('/api/documents', { params: { direction, openOnly: 'true', pageSize: 200 } })
      .then((r) => setRows(arr(r.data) as Doc[]))
      .finally(() => setLoading(false))
  }, [direction])
  useEffect(load, [load])

  // Görünür belgeler = yalnız toplu-işlemli operasyonlar (+ seçili operasyon süzgeci)
  const visibleRows = useMemo(
    () => rows.filter((d) => { const oid = d.operationTypeId; return oid != null && bulkOpIds.has(oid) && (!opId || oid === opId) }),
    [rows, bulkOpIds, opId],
  )
  const noBulkOps = ops.length > 0 && bulkOpOpts.length === 0 // bu yönde toplu-işlemli operasyon yok

  const apply = (a: ActionDef) => {
    if (selected.length === 0) { message.warning('Belge seçin'); return }
    modal.confirm({
      title: `${selected.length} belgeye "${a.label}" uygulansın mı?`,
      okText: a.label, cancelText: 'Vazgeç', okButtonProps: { danger: a.danger },
      onOk: async () => {
        setBusy(a.value)
        try {
          const r = await axiosInstance.post('/api/documents/bulk-action', { ids: selected, action: a.value })
          message.success(`${r.data.ok} başarılı, ${r.data.failedCount} başarısız`)
          if (r.data.failedCount) message.warning(r.data.failed.map((f: { id: number; error: string }) => `#${f.id}: ${f.error}`).join(' · '))
          load()
        } catch (e) {
          message.error((e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'İşlem başarısız')
        } finally { setBusy(null) }
      },
    })
  }

  return (
    <div className="og-page">
      <PageHeader title={`Toplu İşlem — ${DIR_LABEL[direction]}`} subtitle="Operasyon tanımında 'Toplu İşlem' işaretli operasyonların açık belgeleri — seç → toplu yaşam-döngüsü aksiyonu uygula" />

      <Card className="og-toolbar" size="small" style={{ marginBottom: 14 }} styles={{ body: { padding: '10px 14px' } }}>
        <Space wrap size={12}>
          <Select style={{ width: 220 }} value={opId} onChange={(v) => { setOpId(v); setSelected([]) }} allowClear showSearch optionFilterProp="label"
            placeholder="Operasyon (hepsi)" options={bulkOpOpts} disabled={bulkOpOpts.length === 0} />
          <Button icon={<ReloadOutlined />} onClick={load}>Yenile</Button>
          <span style={{ borderLeft: '1px solid var(--og-border)', height: 22 }} />
          <span style={{ fontSize: 12.5, color: 'var(--og-muted)' }}>Seçili <b style={{ color: 'var(--og-ink)' }}>{selected.length}</b>:</span>
          {ACTIONS.map((a) => (
            <Button key={a.value} type={a.primary ? 'primary' : 'default'} ghost={a.ghost} danger={a.danger} icon={a.icon}
              disabled={selected.length === 0} loading={busy === a.value} onClick={() => apply(a)}>
              {a.label}
            </Button>
          ))}
        </Space>
      </Card>

      {noBulkOps && (
        <Alert
          type="warning" showIcon style={{ marginBottom: 14 }}
          message={`${DIR_LABEL[direction]} yönünde 'Toplu İşlem' işaretli operasyon yok`}
          description={<span>Bir operasyonun burada görünmesi için tanımında <b>Toplu İşlem</b> parametresi açık olmalıdır. <Link to="/operation-types"><SettingOutlined /> Uyarlamalar › Operasyon Tipi</Link>'nden işaretleyin.</span>}
        />
      )}

      <Card className="og-section-card" size="small" title={`Açık Belgeler (${visibleRows.length})`}>
        <Table<Doc>
          rowKey="id" size="small" loading={loading} dataSource={visibleRows} pagination={{ pageSize: 20 }}
          rowSelection={{ selectedRowKeys: selected, onChange: (k) => setSelected(k as number[]) }}
          locale={{ emptyText: noBulkOps ? 'Toplu işlemli operasyon yok' : 'Açık belge yok' }}
          columns={[
            { title: 'Belge No', dataIndex: 'documentNo' },
            { title: 'Operasyon', dataIndex: ['operationType', 'code'], render: (v) => v ?? '—' },
            { title: 'Durum', dataIndex: 'status', render: (v, r) => r.documentStatus?.name ? <Tag color={r.documentStatus.color || 'default'}>{r.documentStatus.name}</Tag> : <Tag>{v}</Tag> },
            { title: 'Satır', dataIndex: ['_count', 'lines'], align: 'right' as const, render: (v) => v ?? 0 },
          ]}
        />
      </Card>
    </div>
  )
}
