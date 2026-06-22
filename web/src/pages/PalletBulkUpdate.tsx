import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { App, Button, Card, Col, DatePicker, Form, Input, Row, Select, Switch, Table } from 'antd'
import { ArrowLeftOutlined, CheckOutlined } from '@ant-design/icons'
import { axiosInstance } from '../providers/dataProvider'
import { PageHeader } from '../components/PageHeader'

type Pallet = {
  id: number
  palletNo: string
  isActive: boolean
  originalQty?: string | null
  productionDate?: string | null
  expiryDate?: string | null
  palletType?: { code?: string }
}

const dt = (v?: string | null) => (v ? String(v).slice(0, 10) : '—')

export const PalletBulkUpdate = () => {
  const navigate = useNavigate()
  const { message } = App.useApp()
  const [form] = Form.useForm()
  const [rows, setRows] = useState<Pallet[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<number[]>([])
  const [saving, setSaving] = useState(false)
  // filtreler (StokBar: Palet No / Malzeme / Batch / Seri / PO — bizde palet-seviyesi: no + durum)
  const [fNo, setFNo] = useState('')
  const [fStatus, setFStatus] = useState<string | undefined>()

  const load = () => {
    setLoading(true)
    axiosInstance.get('/api/pallets', { params: { pageSize: 500 } })
      .then((r) => setRows(Array.isArray(r.data) ? r.data : (r.data.data ?? [])))
      .finally(() => setLoading(false))
  }
  useEffect(load, [])

  const filtered = useMemo(() => rows.filter((p) =>
    (!fNo || p.palletNo.toLocaleLowerCase('tr').includes(fNo.toLocaleLowerCase('tr'))) &&
    (fStatus === undefined || (fStatus === 'active' ? p.isActive : !p.isActive)),
  ), [rows, fNo, fStatus])

  const apply = async (vals: Record<string, unknown>) => {
    if (selected.length === 0) { message.warning('En az bir palet seçin'); return }
    const data: Record<string, unknown> = {}
    if (vals.isActive !== undefined && vals.isActive !== null) data.isActive = vals.isActive
    if (vals.beaconId) data.beaconId = vals.beaconId
    if (vals.parentPalletId) data.parentPalletId = vals.parentPalletId
    if (vals.expiryDate) data.expiryDate = (vals.expiryDate as { toISOString: () => string }).toISOString()
    if (Object.keys(data).length === 0) { message.warning('Güncellenecek en az bir alan girin'); return }
    setSaving(true)
    try {
      const r = await axiosInstance.post('/api/pallets/bulk-update', { ids: selected, data })
      message.success(`${r.data.updated} palet güncellendi`)
      setSelected([])
      load()
    } catch (e) {
      message.error((e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Güncellenemedi')
    } finally { setSaving(false) }
  }

  return (
    <div className="og-page" style={{ maxWidth: 1100 }}>
      <PageHeader
        title="Toplu Palet Güncelleme"
        subtitle="Filtrele → seç → ortak alanları uygula"
        extra={<Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/pallets')}>Palet İşlemleri</Button>}
      />

      {/* Filtreler */}
      <Card className="og-toolbar" size="small" style={{ marginBottom: 14 }} styles={{ body: { padding: '10px 14px' } }}>
        <Row gutter={[12, 8]}>
          <Col xs={24} sm={8}><Input allowClear placeholder="Palet No ara" value={fNo} onChange={(e) => setFNo(e.target.value)} /></Col>
          <Col xs={24} sm={6}><Select style={{ width: '100%' }} allowClear placeholder="Durum (hepsi)" value={fStatus} onChange={setFStatus} options={[{ value: 'active', label: 'Aktif' }, { value: 'passive', label: 'Pasif' }]} /></Col>
        </Row>
      </Card>

      {/* Uygulanacak alanlar */}
      <Card className="og-section-card" size="small" title={`Uygulanacak Alanlar (${selected.length} palet seçili)`}>
        <Form form={form} layout="vertical" onFinish={apply}>
          <Row gutter={[20, 0]}>
            <Col xs={24} sm={6}>
              <div className="og-switchrow" style={{ marginTop: 30 }}>
                <span className="og-switchrow__label">Aktif</span>
                <Form.Item name="isActive" valuePropName="checked" noStyle><Switch /></Form.Item>
              </div>
            </Col>
            <Col xs={24} sm={6}><Form.Item name="expiryDate" label="Son Kullanma"><DatePicker style={{ width: '100%' }} /></Form.Item></Col>
            <Col xs={24} sm={6}><Form.Item name="parentPalletId" label="Üst Palet"><Select allowClear showSearch optionFilterProp="label" placeholder="Seçiniz" options={rows.map((p) => ({ value: p.id, label: p.palletNo }))} /></Form.Item></Col>
            <Col xs={24} sm={6}><Form.Item name="beaconId" label="Beacon ID"><Input /></Form.Item></Col>
          </Row>
          <Button type="primary" htmlType="submit" icon={<CheckOutlined />} loading={saving} disabled={selected.length === 0}>Seçili Paletlere Uygula</Button>
        </Form>
      </Card>

      <Card className="og-section-card" size="small" title={`Paletler (${filtered.length})`}>
        <Table<Pallet>
          rowKey="id" size="small" loading={loading} dataSource={filtered} pagination={{ pageSize: 20 }} scroll={{ x: true }}
          rowSelection={{ selectedRowKeys: selected, onChange: (keys) => setSelected(keys as number[]) }}
          columns={[
            { title: 'Palet No', dataIndex: 'palletNo' },
            { title: 'Tip', dataIndex: ['palletType', 'code'], render: (v) => v ?? '—' },
            { title: 'Durum', dataIndex: 'isActive', render: (v) => (v ? 'Aktif' : 'Pasif') },
            { title: 'Orijinal Miktar', dataIndex: 'originalQty', align: 'right' as const, render: (v) => v ?? '—' },
            { title: 'Üretim Tarihi', dataIndex: 'productionDate', render: dt },
            { title: 'Son Kullanma', dataIndex: 'expiryDate', render: dt },
          ]}
        />
      </Card>
    </div>
  )
}
