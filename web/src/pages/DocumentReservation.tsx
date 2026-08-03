import { useCallback, useEffect, useMemo, useState } from 'react'
import { App, Alert, Button, Card, Modal, Select, Space, Table, Tag } from 'antd'
import { ReloadOutlined, LockOutlined, UnlockOutlined, SettingOutlined } from '@ant-design/icons'
import { Link } from 'react-router-dom'
import { axiosInstance } from '../providers/dataProvider'
import { screenRight } from '../screenRight'
import { PageHeader } from '../components/PageHeader'

type Doc = { id: number; documentNo: string; status: string; operationTypeId?: number; operationType?: { code?: string }; documentStatus?: { name?: string; color?: string }; _count?: { lines?: number } }
type Op = { id: number; code: string; name?: string; direction: string; reservation?: boolean }
type ReserveLine = { lineNo: number; productCode: string; required: string; reserved: string; missing: string }

const arr = (d: unknown) => (Array.isArray(d) ? d : ((d as { data?: unknown[] })?.data ?? []))
const DIR_LABEL: Record<string, string> = { OUTBOUND: 'Çıkış', INTERNAL: 'Transfer' }

// Rezervasyon (legacy LNGREZERVEBELGEKOD) — yalnız operasyon tanımında 'Rezervasyon' işaretli operasyonların
// açık belgeleri listelenir; belgeye stok ayrılır → o stok YALNIZ o belgede okutulabilir. Yön-bağlı: Çıkış/Transfer.
export const DocumentReservation = ({ direction }: { direction: 'OUTBOUND' | 'INTERNAL' }) => {
  const { message } = App.useApp()
  // Yapılandırma yönergesi yalnız operasyon tipini düzenleyebilenlere gösterilir
  const canConfigureOps = screenRight('operation-types', 'edit')

  const [opId, setOpId] = useState<number>()
  const [rows, setRows] = useState<Doc[]>([])
  const [ops, setOps] = useState<Op[]>([])
  const [reserved, setReserved] = useState<Record<number, string>>({}) // docId → Σ rezerve
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<number | null>(null)
  const [result, setResult] = useState<{ documentNo: string; lines: ReserveLine[]; fullyReserved: boolean } | null>(null)

  useEffect(() => {
    axiosInstance.get('/api/operation-types', { params: { pageSize: 300 } }).then((r) => setOps(arr(r.data) as Op[]))
  }, [])

  const rezOps = useMemo(() => ops.filter((o) => o.reservation === true && o.direction === direction), [ops, direction])
  const rezOpIds = useMemo(() => new Set(rezOps.map((o) => o.id)), [rezOps])
  const rezOpOpts = useMemo(() => rezOps.map((o) => ({ value: o.id, label: `${o.code}${o.name ? ' — ' + o.name : ''}` })), [rezOps])

  const load = useCallback(() => {
    setLoading(true)
    axiosInstance.get('/api/documents', { params: { direction, openOnly: 'true', pageSize: 200 } })
      .then(async (r) => {
        const docs = arr(r.data) as Doc[]
        setRows(docs)
        const ids = docs.map((d) => d.id)
        if (ids.length) {
          const s = await axiosInstance.get('/api/documents/reservations/summary', { params: { ids: ids.join(',') } })
          setReserved(s.data ?? {})
        } else setReserved({})
      })
      .finally(() => setLoading(false))
  }, [direction])
  useEffect(load, [load])

  const visibleRows = useMemo(
    () => rows.filter((d) => { const oid = d.operationTypeId; return oid != null && rezOpIds.has(oid) && (!opId || oid === opId) }),
    [rows, rezOpIds, opId],
  )
  const noRezOps = ops.length > 0 && rezOpOpts.length === 0

  const reserve = async (d: Doc) => {
    setBusy(d.id)
    try {
      const r = await axiosInstance.post(`/api/documents/${d.id}/reserve`)
      setResult(r.data)
      load()
    } catch (e) {
      message.error((e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Rezervasyon başarısız')
    } finally { setBusy(null) }
  }
  const release = async (d: Doc) => {
    setBusy(d.id)
    try {
      await axiosInstance.post(`/api/documents/${d.id}/release-reservation`)
      message.success(`${d.documentNo} rezervi serbest bırakıldı`)
      load()
    } catch (e) {
      message.error((e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'İşlem başarısız')
    } finally { setBusy(null) }
  }

  return (
    <div className="og-page">
      <PageHeader title={`Rezervasyon — ${DIR_LABEL[direction]}`} subtitle="Operasyon tanımında 'Rezervasyon' işaretli operasyonların açık belgeleri — belgeye stok ayır: o stok YALNIZ o belgede okutulabilir" />

      <Card className="og-toolbar" size="small" style={{ marginBottom: 14 }} styles={{ body: { padding: '10px 14px' } }}>
        <Space wrap size={12}>
          <Select style={{ width: 240 }} value={opId} onChange={setOpId} allowClear showSearch optionFilterProp="label"
            placeholder="Operasyon (hepsi)" options={rezOpOpts} disabled={rezOpOpts.length === 0} />
          <Button icon={<ReloadOutlined />} onClick={load}>Yenile</Button>
        </Space>
      </Card>

      {noRezOps && (
        <Alert
          type="warning" showIcon style={{ marginBottom: 14 }}
          message={`${DIR_LABEL[direction]} yönünde 'Rezervasyon' işaretli operasyon yok`}
          description={canConfigureOps
            ? <span>Bir operasyonun burada görünmesi için tanımında <b>Rezervasyon</b> parametresi açık olmalıdır. <Link to="/operation-types"><SettingOutlined /> Uyarlamalar › Operasyon Tipi</Link>'nden işaretleyin.</span>
            : <span>Bu ekranın çalışması için operasyon tanımında ilgili parametre açık olmalıdır. Sistem yöneticinizden bu ayarı açmasını isteyin.</span>}
        />
      )}

      <Card className="og-section-card" size="small" title={`Açık Belgeler (${visibleRows.length})`}>
        <Table<Doc>
          rowKey="id" size="small" loading={loading} dataSource={visibleRows} pagination={{ pageSize: 20 }}
          locale={{ emptyText: noRezOps ? 'Rezervasyonlu operasyon yok' : 'Açık belge yok' }}
          columns={[
            { title: 'Belge No', dataIndex: 'documentNo' },
            { title: 'Operasyon', dataIndex: ['operationType', 'code'], render: (v) => v ?? '—' },
            { title: 'Durum', dataIndex: 'status', render: (v, r) => r.documentStatus?.name ? <Tag color={r.documentStatus.color || 'default'}>{r.documentStatus.name}</Tag> : <Tag>{v}</Tag> },
            { title: 'Satır', dataIndex: ['_count', 'lines'], align: 'right' as const, render: (v) => v ?? 0 },
            {
              title: 'Rezerve', key: 'rez', align: 'right' as const,
              render: (_, r) => reserved[r.id] ? <Tag color="gold" icon={<LockOutlined />}>{reserved[r.id]}</Tag> : <span style={{ color: 'var(--og-muted)' }}>—</span>,
            },
            {
              title: 'İşlem', key: 'act',
              render: (_, r) => (
                <Space size={6}>
                  <Button size="small" type="primary" ghost icon={<LockOutlined />} loading={busy === r.id} onClick={() => reserve(r)}>Rezerve Et</Button>
                  <Button size="small" icon={<UnlockOutlined />} disabled={!reserved[r.id]} loading={busy === r.id} onClick={() => release(r)}>Serbest Bırak</Button>
                </Space>
              ),
            },
          ]}
        />
      </Card>

      <Modal open={!!result} onCancel={() => setResult(null)} footer={<Button type="primary" onClick={() => setResult(null)}>Tamam</Button>}
        title={result?.fullyReserved ? `${result.documentNo} — tam rezerve edildi` : `${result?.documentNo} — KISMİ rezerve (stok yetersiz)`}>
        <Table size="small" pagination={false} rowKey="lineNo" dataSource={result?.lines ?? []}
          columns={[
            { title: 'Satır', dataIndex: 'lineNo', width: 60 },
            { title: 'Ürün', dataIndex: 'productCode' },
            { title: 'İstenen', dataIndex: 'required', align: 'right' as const },
            { title: 'Rezerve', dataIndex: 'reserved', align: 'right' as const, render: (v) => <b style={{ color: '#116329' }}>{v}</b> },
            { title: 'Eksik', dataIndex: 'missing', align: 'right' as const, render: (v) => v !== '0' ? <b style={{ color: '#B42318' }}>{v}</b> : '—' },
          ]} />
        {!result?.fullyReserved && <Alert style={{ marginTop: 10 }} type="warning" showIcon message="Eksik kalan miktar için stok girişi sonrası tekrar 'Rezerve Et' çalıştırılabilir (mevcut rezervin üzerine tamamlar)." />}
      </Modal>
    </div>
  )
}
