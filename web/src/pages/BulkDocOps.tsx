import { useCallback, useEffect, useMemo, useState } from 'react'
import { App, Alert, Button, Card, Select, Space, Table, Tag } from 'antd'
import { ReloadOutlined, CheckCircleOutlined, SettingOutlined, SendOutlined, RollbackOutlined, ClearOutlined, DeleteOutlined } from '@ant-design/icons'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { axiosInstance } from '../providers/dataProvider'
import { PageHeader } from '../components/PageHeader'

type Doc = { id: number; documentNo: string; status: string; operationTypeId?: number; operationType?: { code?: string; direction?: string }; documentStatus?: { name?: string; color?: string }; _count?: { lines?: number } }
type BulkLink = { id: number; operationTypeId: number; facilityId: number | null; bulkActionType: string | null; isActive: boolean }
type Op = { id: number; code: string; name?: string; direction: string }
type ActionDef = { value: string; label: string; icon: ReactNode; primary?: boolean; ghost?: boolean; danger?: boolean }

const arr = (d: unknown) => (Array.isArray(d) ? d : ((d as { data?: unknown[] })?.data ?? []))
const DIRS = [{ value: 'INBOUND', label: 'Giriş' }, { value: 'OUTBOUND', label: 'Çıkış' }, { value: 'INTERNAL', label: 'Transfer' }]
// StokBar gibi AYRI butonlar
const ACTIONS: ActionDef[] = [
  { value: 'confirm', label: 'Onaya Gönder', icon: <SendOutlined />, primary: true, ghost: true },
  { value: 'complete', label: 'Onay', icon: <CheckCircleOutlined />, primary: true },
  { value: 'reverse', label: 'Onay İptal', icon: <RollbackOutlined />, danger: true },
  { value: 'cancel-picking', label: 'Toplama İptal', icon: <ClearOutlined /> },
  { value: 'cancel', label: 'Sil', icon: <DeleteOutlined />, danger: true },
]
const BULK_TYPE_LABEL: Record<string, string> = { CONTROLLED_BULK: 'Kontrollü Toplu', BULK: 'Toplu İşlem', RESERVATION: 'Rezervasyon', SELECTED_DOCUMENT: 'Seçimli Belge', BATCH_CHANGE: 'Batch Değiştirme' }

// Toplu İşlem — yalnız "Toplu İşlem Bağlantı" (TBLOPERATIONTYPEBULKACTION) tanımlı operasyonların belgeleri görünür.
// Bağlantı yoksa operasyon burada GÖRÜNMEZ (StokBar BYTTOPLUISLEM bayrağı mantığı).
export const BulkDocOps = () => {
  const { message, modal } = App.useApp()
  const [dir, setDir] = useState<string | undefined>('OUTBOUND')
  const [opId, setOpId] = useState<number>() // bağlı operasyonlardan biri (boş = hepsi)
  const [rows, setRows] = useState<Doc[]>([])
  const [links, setLinks] = useState<BulkLink[]>([])
  const [ops, setOps] = useState<Op[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<number[]>([])
  const [busy, setBusy] = useState<string | null>(null) // hangi aksiyon yürüyor

  // Bağlantılar + operasyon tipleri (bir kez)
  useEffect(() => {
    axiosInstance.get('/api/operation-bulk-actions', { params: { pageSize: 300 } }).then((r) => setLinks(arr(r.data) as BulkLink[]))
    axiosInstance.get('/api/operation-types', { params: { pageSize: 300 } }).then((r) => setOps(arr(r.data) as Op[]))
  }, [])

  // Aktif bağlantısı olan operasyon id'leri + tip eşlemesi
  const linkedOpIds = useMemo(() => new Set(links.filter((l) => l.isActive).map((l) => l.operationTypeId)), [links])
  const bulkTypeByOp = useMemo(() => new Map(links.filter((l) => l.isActive).map((l) => [l.operationTypeId, l.bulkActionType])), [links])
  // Seçili yöne ait, toplu-işlem bağlantılı operasyonlar (operasyon süzgeci bunlardan dolar)
  const bulkOpOpts = useMemo(
    () => ops.filter((o) => linkedOpIds.has(o.id) && (!dir || o.direction === dir)).map((o) => ({ value: o.id, label: `${o.code}${o.name ? ' — ' + o.name : ''}` })),
    [ops, linkedOpIds, dir],
  )

  const load = useCallback(() => {
    setLoading(true); setSelected([])
    axiosInstance.get('/api/documents', { params: { ...(dir ? { direction: dir } : {}), openOnly: 'true', pageSize: 200 } })
      .then((r) => setRows(arr(r.data) as Doc[]))
      .finally(() => setLoading(false))
  }, [dir])
  useEffect(load, [load])

  // Görünür belgeler = yalnız bağlı operasyonlar (+ seçili operasyon süzgeci)
  const visibleRows = useMemo(
    () => rows.filter((d) => { const oid = d.operationTypeId; return oid != null && linkedOpIds.has(oid) && (!opId || oid === opId) }),
    [rows, linkedOpIds, opId],
  )
  const noBulkOps = ops.length > 0 && bulkOpOpts.length === 0 // bu yön için hiç bağlantı yok

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
      <PageHeader title="Toplu İşlem" subtitle="Yalnız 'Toplu İşlem Bağlantı' tanımlı operasyonların açık belgeleri — seç → toplu yaşam-döngüsü aksiyonu uygula" />

      <Card className="og-toolbar" size="small" style={{ marginBottom: 14 }} styles={{ body: { padding: '10px 14px' } }}>
        <Space wrap size={12}>
          <Select style={{ width: 150 }} value={dir} onChange={(v) => { setDir(v); setOpId(undefined); setSelected([]) }} allowClear placeholder="Yön (hepsi)" options={DIRS} />
          <Select style={{ width: 220 }} value={opId} onChange={(v) => { setOpId(v); setSelected([]) }} allowClear showSearch optionFilterProp="label"
            placeholder="Bağlı operasyon (hepsi)" options={bulkOpOpts} disabled={bulkOpOpts.length === 0} />
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
          message="Bu yön için 'Toplu İşlem Bağlantı' tanımlı operasyon yok"
          description={<span>Bir operasyon toplu işlemde görünmesi için önce bağlanmalıdır. <Link to="/operation-bulk-actions"><SettingOutlined /> Uyarlamalar › Operasyon › Toplu İşlem Bağlantı</Link>'dan ekleyin.</span>}
        />
      )}

      <Card className="og-section-card" size="small" title={`Açık Belgeler (${visibleRows.length})`}>
        <Table<Doc>
          rowKey="id" size="small" loading={loading} dataSource={visibleRows} pagination={{ pageSize: 20 }}
          rowSelection={{ selectedRowKeys: selected, onChange: (k) => setSelected(k as number[]) }}
          locale={{ emptyText: noBulkOps ? 'Bağlı operasyon yok' : 'Açık belge yok' }}
          columns={[
            { title: 'Belge No', dataIndex: 'documentNo' },
            { title: 'Operasyon', dataIndex: ['operationType', 'code'], render: (v) => v ?? '—' },
            { title: 'Yön', dataIndex: ['operationType', 'direction'], render: (v) => DIRS.find((d) => d.value === v)?.label ?? v },
            { title: 'Toplu Tip', key: 'btype', render: (_, r) => { const t = r.operationTypeId != null ? bulkTypeByOp.get(r.operationTypeId) : null; return t ? <Tag color="geekblue">{BULK_TYPE_LABEL[t] ?? t}</Tag> : '—' } },
            { title: 'Durum', dataIndex: 'status', render: (v, r) => r.documentStatus?.name ? <Tag color={r.documentStatus.color || 'default'}>{r.documentStatus.name}</Tag> : <Tag>{v}</Tag> },
            { title: 'Satır', dataIndex: ['_count', 'lines'], align: 'right' as const, render: (v) => v ?? 0 },
          ]}
        />
      </Card>
    </div>
  )
}
