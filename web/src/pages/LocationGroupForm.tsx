import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { App, Alert, Button, Card, Col, Form, Input, Row, Select, Space, Switch, Table, Tabs, Tag } from 'antd'
import { SaveOutlined, DeleteOutlined, PlusOutlined } from '@ant-design/icons'
import { axiosInstance } from '../providers/dataProvider'
import { PageHeader } from '../components/PageHeader'

type Loc = { id: number; code: string; name?: string | null; warehouseId?: number | null }
type Opt = { value: number; label: string }
const errMsg = (e: unknown, f: string) => (e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? f
const arr = (d: unknown) => (Array.isArray(d) ? d : ((d as { data?: unknown[] })?.data ?? []))

/**
 * Lokasyon Grubu — tanım + ÜYELİK.
 * Grup tanımlanabiliyordu ama içine lokasyon eklenecek bir yer yoktu; uç
 * (/api/location-group-links/:id/locations) vardı, ekranı yoktu.
 * Grup üyeliği operasyon lokasyon kurallarında kullanılır (LOCATION_GROUP kapsamı).
 */
export const LocationGroupForm = ({ mode }: { mode: 'create' | 'edit' }) => {
  const { message, modal } = App.useApp()
  const navigate = useNavigate()
  const { id } = useParams()
  const [form] = Form.useForm()
  const [saving, setSaving] = useState(false)
  const [uyeler, setUyeler] = useState<Loc[]>([])
  const [depolar, setDepolar] = useState<Opt[]>([])
  const [depoId, setDepoId] = useState<number>()
  const [seciliLok, setSeciliLok] = useState<number[]>([])
  const [lokOpts, setLokOpts] = useState<Opt[]>([])
  const [ekliyor, setEkliyor] = useState(false)
  const duzenle = mode === 'edit' && !!id

  useEffect(() => {
    axiosInstance.get('/api/warehouses', { params: { pageSize: 300 } }).then((r) =>
      setDepolar((arr(r.data) as Record<string, unknown>[]).map((w) => ({ value: w.id as number, label: `${w.code} — ${w.name ?? ''}` }))))
    if (duzenle) {
      axiosInstance.get(`/api/location-groups/${id}`).then((r) => form.setFieldsValue(r.data))
      yenileUyeler()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  const yenileUyeler = () => {
    if (!id) return
    axiosInstance.get(`/api/location-group-links/${id}/locations`)
      .then((r) => setUyeler(arr(r.data) as Loc[]))
      .catch(() => setUyeler([]))
  }

  // Seçilebilir lokasyonlar: seçilen depodan, zaten üye olanlar hariç
  useEffect(() => {
    if (!depoId) { setLokOpts([]); return }
    axiosInstance.get('/api/locations', { params: { warehouseId: depoId, pageSize: 500 } }).then((r) => {
      const uyeIds = new Set(uyeler.map((u) => u.id))
      setLokOpts((arr(r.data) as Loc[]).filter((l) => !uyeIds.has(l.id)).map((l) => ({ value: l.id, label: l.code })))
    })
  }, [depoId, uyeler])

  const kaydet = async (vals: Record<string, unknown>) => {
    setSaving(true)
    try {
      if (duzenle) { await axiosInstance.patch(`/api/location-groups/${id}`, vals); message.success('Kaydedildi') }
      else {
        const r = await axiosInstance.post('/api/location-groups', vals)
        message.success('Oluşturuldu — şimdi lokasyon ekleyebilirsiniz')
        navigate(`/location-groups/${r.data.id}`)
      }
    } catch (e) { message.error(errMsg(e, 'Kaydedilemedi')) } finally { setSaving(false) }
  }

  const ekle = async () => {
    if (!seciliLok.length) return
    setEkliyor(true)
    let ok = 0
    const hatalar: string[] = []
    for (const locId of seciliLok) {
      try { await axiosInstance.post(`/api/location-group-links/${id}/locations`, { locationId: locId }); ok++ }
      catch (e) { hatalar.push(errMsg(e, `#${locId}`)) }
    }
    setEkliyor(false); setSeciliLok([]); yenileUyeler()
    message[hatalar.length ? 'warning' : 'success'](`${ok} lokasyon eklendi${hatalar.length ? ` — ${hatalar.length} atlandı (${hatalar[0]})` : ''}`)
  }

  const cikar = (l: Loc) => modal.confirm({
    title: `${l.code} gruptan çıkarılsın mı?`,
    okText: 'Çıkar', okButtonProps: { danger: true }, cancelText: 'Vazgeç',
    onOk: async () => {
      try { await axiosInstance.delete(`/api/location-group-links/${id}/locations/${l.id}`); message.success('Çıkarıldı'); yenileUyeler() }
      catch (e) { message.error(errMsg(e, 'Çıkarılamadı')) }
    },
  })

  const tanimTab = (
    <Card className="og-section-card" size="small" title="Bilgiler">
      <Row gutter={[20, 0]}>
        <Col xs={24} sm={8}><Form.Item name="code" label="Kod" rules={[{ required: true, message: 'Zorunlu' }]}><Input /></Form.Item></Col>
        <Col xs={24} sm={10}><Form.Item name="name" label="Ad" rules={[{ required: true, message: 'Zorunlu' }]}><Input /></Form.Item></Col>
        <Col xs={24} sm={6}>
          <div className="og-switchrow">
            <span className="og-switchrow__label">İş Emri Grubu</span>
            <Form.Item name="isWorkOrderGroup" valuePropName="checked" noStyle><Switch /></Form.Item>
          </div>
        </Col>
        <Col xs={24} sm={6}>
          <div className="og-switchrow">
            <span className="og-switchrow__label">Aktif</span>
            <Form.Item name="isActive" valuePropName="checked" initialValue noStyle><Switch /></Form.Item>
          </div>
        </Col>
      </Row>
    </Card>
  )

  const lokasyonTab = (
    <>
      <Card className="og-section-card" size="small" title="Gruba Lokasyon Ekle">
        <Alert type="info" showIcon style={{ marginBottom: 12 }}
          title="Grup üyeliği operasyon kurallarında kullanılır"
          description="Operasyon Tipi › Lokasyon sekmesinde bağlantı tipi 'Lokasyon Grubu' seçilirse, o operasyonda yalnız bu gruptaki lokasyonlar okutulabilir." />
        <Space wrap align="end">
          <div>
            <div style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>Depo</div>
            <Select style={{ minWidth: 220 }} showSearch optionFilterProp="label" placeholder="Önce depo seçin"
              value={depoId} onChange={setDepoId} options={depolar} />
          </div>
          <div>
            <div style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>Lokasyonlar (çoklu seçim)</div>
            <Select style={{ minWidth: 340 }} mode="multiple" showSearch optionFilterProp="label" allowClear
              placeholder={depoId ? 'Lokasyon seçin' : 'Önce depo'} disabled={!depoId}
              value={seciliLok} onChange={setSeciliLok} options={lokOpts} maxTagCount={6} />
          </div>
          <Button type="primary" icon={<PlusOutlined />} loading={ekliyor} disabled={!seciliLok.length} onClick={ekle}>
            {seciliLok.length ? `${seciliLok.length} Lokasyonu Ekle` : 'Ekle'}
          </Button>
        </Space>
      </Card>

      <Card className="og-section-card" size="small" title={<>Gruptaki Lokasyonlar <Tag color="blue">{uyeler.length}</Tag></>}>
        <Table<Loc> rowKey="id" size="small" dataSource={uyeler} pagination={{ pageSize: 15, size: 'small' }}
          locale={{ emptyText: 'Henüz lokasyon eklenmemiş — yukarıdan depo seçip ekleyin' }}
          columns={[
            { title: 'Kod', dataIndex: 'code' },
            { title: 'Ad', dataIndex: 'name', render: (v) => v ?? '—' },
            { title: '', width: 100, render: (_, r) => <Button size="small" danger type="text" icon={<DeleteOutlined />} onClick={() => cikar(r)}>Çıkar</Button> },
          ]} />
      </Card>
    </>
  )

  return (
    <div className="og-page" style={{ maxWidth: 1040 }}>
      <PageHeader title={`Lokasyon Grubu — ${duzenle ? 'Düzenle' : 'Yeni'}`}
        subtitle="Grup tanımı + hangi lokasyonların bu gruba dahil olduğu"
        extra={<Button onClick={() => navigate('/location-groups')}>← Liste</Button>} />
      <Form form={form} layout="vertical" onFinish={kaydet}>
        <Tabs items={[
          { key: 'def', label: 'Tanım', children: tanimTab },
          {
            key: 'lok', label: 'Lokasyonlar', disabled: !duzenle,
            children: duzenle ? lokasyonTab : null,
          },
        ]} />
        {!duzenle && <Alert type="info" showIcon style={{ marginBottom: 14 }} title="Önce grubu kaydedin — ardından Lokasyonlar sekmesi açılır." />}
        <div className="og-formbar">
          <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={saving}>Kaydet</Button>
          <Button onClick={() => navigate('/location-groups')}>İptal</Button>
        </div>
      </Form>
    </div>
  )
}
