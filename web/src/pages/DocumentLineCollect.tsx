import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { App, Button, Card, DatePicker, Form, Input, InputNumber, Progress, Select, Space, Table, Tag } from 'antd'
import { ArrowLeftOutlined, PlusOutlined, DeleteOutlined } from '@ant-design/icons'
import type { Dayjs } from 'dayjs'
import { axiosInstance } from '../providers/dataProvider'
import { PageHeader } from '../components/PageHeader'

type Opt = { value: number; label: string }
type Line = { id: number; quantity: string; collectedQty: string | null; unitId: number; product?: { code?: string; name?: string }; unit?: { code?: string } }
type Scope = { id: number; scopeNo: number; quantity: string; palletId: number | null; serialNo: string | null; batchNo: string | null; productionDate: string | null; expiryDate: string | null; sourceLocationId: number | null; targetLocationId: number | null }

// Belge satırı toplama (kapsam okutma): miktar + palet + seri + lot + üretim + SKT. Topladıkça collectedQty + belge durumu otomatik ilerler.
export const DocumentLineCollect = () => {
  const { id, lineId } = useParams()
  const navigate = useNavigate()
  const { message } = App.useApp()
  const [form] = Form.useForm()
  const [line, setLine] = useState<Line | null>(null)
  const [docStatus, setDocStatus] = useState('')
  const [direction, setDirection] = useState('') // INBOUND→hedef lok., OUTBOUND→kaynak lok.
  const [scopes, setScopes] = useState<Scope[]>([])
  const [pallets, setPallets] = useState<Opt[]>([])
  const [locations, setLocations] = useState<Opt[]>([])
  const [busy, setBusy] = useState(false)
  const [loading, setLoading] = useState(true)

  const load = () => {
    axiosInstance.get(`/api/documents/${id}`).then((r) => {
      setDocStatus(r.data.status)
      setDirection(r.data.operationType?.direction ?? '')
      setLine((r.data.lines ?? []).find((l: Line) => l.id === Number(lineId)) ?? null)
    })
    axiosInstance.get('/api/document-line-scopes', { params: { documentLineId: lineId } })
      .then((r) => setScopes(Array.isArray(r.data) ? r.data : (r.data.data ?? []))).finally(() => setLoading(false))
  }
  useEffect(() => {
    load()
    axiosInstance.get('/api/pallets', { params: { pageSize: 300 } }).then((r) => setPallets((r.data.data ?? r.data).map((x: { id: number; palletNo?: string }) => ({ value: x.id, label: x.palletNo ?? `#${x.id}` }))))
    axiosInstance.get('/api/locations', { params: { pageSize: 500 } }).then((r) => setLocations((r.data.data ?? r.data).map((x: { id: number; code: string }) => ({ value: x.id, label: x.code }))))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, lineId])

  const palletLabel = (pid: number | null) => (pid == null ? '—' : pallets.find((p) => p.value === pid)?.label ?? `#${pid}`)
  const locLabel = (lid: number | null) => (lid == null ? '—' : locations.find((l) => l.value === lid)?.label ?? `#${lid}`)

  const inbound = direction === 'INBOUND'
  const add = async (vals: { quantity: number; palletId?: number; serialNo?: string; batchNo?: string; productionDate?: Dayjs; expiryDate?: Dayjs; locationId?: number }) => {
    if (!line) return
    setBusy(true)
    try {
      const loc = vals.locationId ?? null // boş = satırdan miras (backend)
      await axiosInstance.post('/api/document-line-scopes', {
        documentLineId: Number(lineId), unitId: line.unitId, quantity: Number(vals.quantity),
        palletId: vals.palletId ?? null, serialNo: vals.serialNo || null, batchNo: vals.batchNo || null,
        productionDate: vals.productionDate ? vals.productionDate.format('YYYY-MM-DD') : null,
        expiryDate: vals.expiryDate ? vals.expiryDate.format('YYYY-MM-DD') : null,
        ...(inbound ? { targetLocationId: loc } : { sourceLocationId: loc }), // INBOUND→hedef, çıkış→kaynak
      })
      message.success('Toplama kaydedildi')
      form.resetFields()
      load()
    } catch (e) {
      message.error((e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Kaydedilemedi')
    } finally { setBusy(false) }
  }
  const del = async (sid: number) => {
    try { await axiosInstance.delete(`/api/document-line-scopes/${sid}`); message.success('Silindi'); load() }
    catch (e) { message.error((e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Silinemedi') }
  }

  const planned = Number(line?.quantity ?? 0)
  const collected = scopes.reduce((s, x) => s + Number(x.quantity), 0)
  const pct = planned > 0 ? Math.min(100, Math.round((collected / planned) * 100)) : 0
  const editable = docStatus === 'DRAFT'
  const unitCode = line?.unit?.code ?? ''

  const columns = [
    { title: '#', dataIndex: 'scopeNo', width: 50 },
    { title: 'Miktar', dataIndex: 'quantity', render: (q: string) => `${q} ${unitCode}` },
    { title: 'Palet', dataIndex: 'palletId', render: (v: number | null) => palletLabel(v) },
    { title: 'Seri No', dataIndex: 'serialNo', render: (v: string | null) => v ?? '—' },
    { title: 'Lot/Parti', dataIndex: 'batchNo', render: (v: string | null) => v ?? '—' },
    { title: 'Üretim', dataIndex: 'productionDate', render: (v: string | null) => (v ? v.slice(0, 10) : '—') },
    { title: 'SKT', dataIndex: 'expiryDate', render: (v: string | null) => (v ? v.slice(0, 10) : '—') },
    { title: inbound ? 'Hedef Lok.' : 'Kaynak Lok.', dataIndex: inbound ? 'targetLocationId' : 'sourceLocationId', render: (v: number | null) => locLabel(v) },
    ...(editable ? [{ title: '', key: 'x', width: 46, render: (_: unknown, r: Scope) => <Button size="small" type="text" danger icon={<DeleteOutlined />} onClick={() => del(r.id)} /> }] : []),
  ]

  return (
    <div className="og-page" style={{ maxWidth: 1100 }}>
      <PageHeader
        title={<Space>Toplama — {line?.product?.code ?? 'Satır'} {line?.product?.name && <span style={{ color: 'var(--og-muted)', fontWeight: 400 }}>{line.product.name}</span>}<Tag color="blue">#{lineId}</Tag></Space>}
        subtitle="Okutma kayıtları (kapsam): miktar + palet + seri + lot + üretim + SKT. Topladıkça belge durumu otomatik ilerler."
        extra={<Button icon={<ArrowLeftOutlined />} onClick={() => navigate(`/documents/${id}`)}>Belgeye Dön</Button>}
      />

      <Card className="og-section-card" size="small" title="İlerleme" style={{ marginBottom: 16 }}>
        <Space size={24} wrap>
          <span>Planlanan: <b>{planned} {unitCode}</b></span>
          <span>Toplanan: <b style={{ color: collected >= planned && planned > 0 ? 'var(--og-success, #16a34a)' : undefined }}>{collected} {unitCode}</b></span>
          <Progress percent={pct} style={{ width: 240 }} status={pct >= 100 ? 'success' : 'active'} />
          {!editable && <Tag color="orange">Belge {docStatus} — okutma kilitli (yalnız DRAFT'ta toplanır)</Tag>}
        </Space>
      </Card>

      {editable && (
        <Card size="small" style={{ background: 'var(--og-sunken)', marginBottom: 16 }} styles={{ body: { padding: '10px 14px' } }}>
          <Form form={form} layout="inline" onFinish={add} style={{ rowGap: 8 }}>
            <Form.Item name="quantity" label={`Miktar${unitCode ? ' (' + unitCode + ')' : ''}`} rules={[{ required: true, message: '!' }]} style={{ marginBottom: 4 }}>
              <InputNumber style={{ width: 110 }} min={0} placeholder="Miktar" />
            </Form.Item>
            <Form.Item name="palletId" label="Palet" style={{ marginBottom: 4 }}>
              <Select style={{ minWidth: 130 }} options={pallets} showSearch optionFilterProp="label" allowClear placeholder="Palet" />
            </Form.Item>
            <Form.Item name="serialNo" label="Seri No" style={{ marginBottom: 4 }}>
              <Input style={{ width: 120 }} placeholder="Seri" />
            </Form.Item>
            <Form.Item name="batchNo" label="Lot/Parti" style={{ marginBottom: 4 }}>
              <Input style={{ width: 120 }} placeholder="Lot" />
            </Form.Item>
            <Form.Item name="productionDate" label="Üretim" style={{ marginBottom: 4 }}>
              <DatePicker style={{ width: 140 }} format="YYYY-MM-DD" placeholder="Üretim tarihi" />
            </Form.Item>
            <Form.Item name="expiryDate" label="SKT" style={{ marginBottom: 4 }}>
              <DatePicker style={{ width: 140 }} format="YYYY-MM-DD" placeholder="SKT" />
            </Form.Item>
            <Form.Item name="locationId" label={inbound ? 'Hedef Lok.' : 'Kaynak Lok.'} style={{ marginBottom: 4 }}>
              <Select style={{ minWidth: 130 }} options={locations} showSearch optionFilterProp="label" allowClear placeholder="Boş = satırdan" />
            </Form.Item>
            <Form.Item style={{ marginBottom: 4 }}>
              <Button type="primary" htmlType="submit" icon={<PlusOutlined />} loading={busy}>Topla</Button>
            </Form.Item>
          </Form>
        </Card>
      )}

      <Card className="og-section-card" size="small" title={`Okutmalar (${scopes.length})`}>
        <Table size="small" rowKey="id" loading={loading} dataSource={scopes} columns={columns} pagination={false} locale={{ emptyText: 'Henüz okutma yok' }} />
      </Card>
    </div>
  )
}
