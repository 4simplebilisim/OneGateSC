import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { App, Button, Card, Descriptions, InputNumber, Space, Spin, Table, Tag, Typography } from 'antd'
import { ArrowLeftOutlined, SaveOutlined, CheckCircleOutlined, CloseCircleOutlined, RollbackOutlined } from '@ant-design/icons'
import { axiosInstance } from '../providers/dataProvider'
import { PageHeader } from '../components/PageHeader'

type Line = { id: number; lineNo: number; productCode?: string; productName?: string; locationCode?: string; unitCode?: string; batchNo?: string | null; serialNo?: string | null; systemQty: string | number; countedQty: string | number | null }
type Count = { id: number; countNo: string; status: string; countType?: string | null; warehouseCode?: string; warehouseName?: string; lines: Line[] }
const errMsg = (e: unknown, f = 'İşlem başarısız') => (e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? f
const STATUS: Record<string, { c: string; t: string }> = { DRAFT: { c: 'default', t: 'Taslak' }, COUNTING: { c: 'processing', t: 'Sayılıyor' }, COMPLETED: { c: 'success', t: 'Tamamlandı' }, CANCELLED: { c: 'error', t: 'İptal' } }

// Sayım GİRİŞ ekranı: satırlara "Sayılan" gir → kaydet (/lines/:lineId/count) → Tamamla (stok düzelt). Backend motoru hazırdı, UI eksikti.
export const StockCountEntry = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { message, modal } = App.useApp()
  const [count, setCount] = useState<Count | null>(null)
  const [loading, setLoading] = useState(true)
  const [edits, setEdits] = useState<Record<number, number | null>>({})
  const [saving, setSaving] = useState(false)
  const [busy, setBusy] = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    axiosInstance.get(`/api/stock-counts/${id}`).then((r) => { setCount(r.data); setEdits({}) })
      .catch((e) => message.error(errMsg(e, 'Sayım yüklenemedi'))).finally(() => setLoading(false))
  }, [id, message])
  useEffect(load, [load])

  if (loading || !count) return <div style={{ padding: 80, textAlign: 'center' }}><Spin size="large" /></div>
  const editable = count.status === 'DRAFT' || count.status === 'COUNTING'
  const st = STATUS[count.status] ?? { c: 'default', t: count.status }
  const valOf = (l: Line) => (l.id in edits ? edits[l.id] : (l.countedQty != null ? Number(l.countedQty) : null))
  const dirty = Object.keys(edits).length > 0
  const countedN = count.lines.filter((l) => valOf(l) != null).length

  const saveCounts = async () => {
    const changed = Object.entries(edits)
    if (!changed.length) return
    setSaving(true)
    let okc = 0
    for (const [lineId, qty] of changed) {
      try { await axiosInstance.post(`/api/stock-counts/${id}/lines/${lineId}/count`, { countedQty: Number(qty ?? 0) }); okc++ }
      catch (e) { message.error(`Satır ${lineId}: ${errMsg(e, 'kaydedilemedi')}`) }
    }
    if (okc) message.success(`${okc} satır kaydedildi`)
    load()
    setSaving(false)
  }

  const doAction = (action: string, title: string, danger = false) => modal.confirm({
    title, okText: 'Onayla', okButtonProps: danger ? { danger: true } : undefined, cancelText: 'Vazgeç',
    onOk: async () => {
      setBusy(true)
      try { await axiosInstance.post(`/api/stock-counts/${id}/${action}`); message.success('İşlem tamamlandı'); load() }
      catch (e) { message.error(errMsg(e)) } finally { setBusy(false) }
    },
  })

  // KÖR SAYIM (Sayım Parametreleri › Sayım Tipi = Kör): sayıcı sistem miktarını GÖRMEZ — Sistem/Fark kolonları gizli
  const blind = (count as { blindCount?: boolean }).blindCount === true
  const columns = [
    { title: 'Sıra', dataIndex: 'lineNo', width: 60 },
    { title: 'Ürün', render: (_: unknown, l: Line) => <span>{l.productCode ?? l.id}{l.productName ? <Typography.Text type="secondary"> — {l.productName}</Typography.Text> : null}</span> },
    { title: 'Lokasyon', dataIndex: 'locationCode', width: 120 },
    { title: 'Parti/Seri', width: 130, render: (_: unknown, l: Line) => [l.batchNo, l.serialNo].filter(Boolean).join(' / ') || '—' },
    { title: 'Birim', dataIndex: 'unitCode', width: 80 },
    ...(blind ? [] : [{ title: 'Sistem', dataIndex: 'systemQty', width: 100, align: 'right' as const, render: (v: unknown) => Number(v) }]),
    {
      title: 'Sayılan', width: 130, align: 'right' as const, render: (_: unknown, l: Line) => editable
        ? <InputNumber min={0} style={{ width: 110 }} value={valOf(l)} placeholder="—"
            onChange={(v) => setEdits((e) => ({ ...e, [l.id]: v as number | null }))} />
        : (valOf(l) ?? '—'),
    },
    ...(blind ? [] : [{
      title: 'Fark', width: 90, align: 'right' as const, render: (_: unknown, l: Line) => {
        const c = valOf(l); if (c == null) return <Typography.Text type="secondary">—</Typography.Text>
        const d = c - Number(l.systemQty)
        return <Typography.Text type={d === 0 ? 'success' : 'danger'}>{d > 0 ? `+${d}` : d}</Typography.Text>
      },
    }]),
  ]

  return (
    <div className="og-page">
      <PageHeader title={`Sayım — ${count.countNo}`} subtitle="Satırlara sayılan miktarı girin → kaydedin → tamamlayın (stok sayılan değerlere göre düzeltilir)"
        extra={<Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/stock-counts')}>Liste</Button>} />
      <Card className="og-section-card" size="small" style={{ marginBottom: 12 }}>
        <Descriptions size="small" column={{ xs: 1, sm: 2, md: 4 }}>
          <Descriptions.Item label="Durum"><Tag color={st.c}>{st.t}</Tag>{blind && <Tag color="purple">KÖR SAYIM</Tag>}</Descriptions.Item>
          <Descriptions.Item label="Depo">{count.warehouseCode ?? '—'}{count.warehouseName ? ` — ${count.warehouseName}` : ''}</Descriptions.Item>
          <Descriptions.Item label="Satır">{count.lines.length}</Descriptions.Item>
          <Descriptions.Item label="Sayılan">{countedN}/{count.lines.length}</Descriptions.Item>
        </Descriptions>
      </Card>
      <div className="og-toolbar" style={{ marginBottom: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {editable && <Button type="primary" icon={<SaveOutlined />} loading={saving} disabled={!dirty} onClick={saveCounts}>Sayılanları Kaydet</Button>}
        {editable && <Button icon={<CheckCircleOutlined />} loading={busy} onClick={() => doAction('complete', 'Sayım tamamlansın mı? Stok, sayılan değerlere göre düzeltilir. Kaydedilmemiş değişiklikler önce kaydedilmeli.')}>Tamamla (stok düzelt)</Button>}
        {editable && <Button danger icon={<CloseCircleOutlined />} loading={busy} onClick={() => doAction('cancel', 'Sayım iptal edilsin mi?', true)}>İptal</Button>}
        {count.status === 'COMPLETED' && <Button danger icon={<RollbackOutlined />} loading={busy} onClick={() => doAction('reverse-equalize', 'Sayım onayı iptal edilsin mi? Eşitleme (stok düzeltmesi) geri alınır.', true)}>Onay İptal</Button>}
        {dirty && <Typography.Text type="warning" style={{ alignSelf: 'center' }}>Kaydedilmemiş değişiklik var</Typography.Text>}
      </div>
      <Table size="small" rowKey="id" dataSource={count.lines} columns={columns} pagination={{ pageSize: 20, size: 'small' }} scroll={{ x: 'max-content' }} />
    </div>
  )
}
