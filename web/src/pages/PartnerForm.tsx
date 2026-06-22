import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { App, Button, Card, Col, Form, Input, InputNumber, Row, Select, Space, Switch, Table, Tabs, Typography } from 'antd'
import { ArrowLeftOutlined, SaveOutlined, PlusOutlined } from '@ant-design/icons'
import { axiosInstance } from '../providers/dataProvider'
import { PageHeader } from '../components/PageHeader'
import { LinkTab, type LF } from '../components/LinkTab'

type Opt = { value: number; label: string }

const DAY_OPTS = [
  { value: '1', label: 'Pazartesi' }, { value: '2', label: 'Salı' }, { value: '3', label: 'Çarşamba' },
  { value: '4', label: 'Perşembe' }, { value: '5', label: 'Cuma' }, { value: '6', label: 'Cumartesi' }, { value: '7', label: 'Pazar' },
]
const EKSAHA_FIELDS: LF[] = [
  { name: 'fieldDefId', label: 'Ek Saha', type: 'ref', ref: 'partner-extra-field-defs', required: true },
  { name: 'value', label: 'Değer', type: 'text' },
]
const GRUP_FIELDS: LF[] = [
  { name: 'extraGroupId', label: 'Ek Grup', type: 'ref', ref: 'partner-extra-groups', required: true },
  { name: 'sortOrder', label: 'Sıra', type: 'number' },
]
const KABUL_FIELDS: LF[] = [
  { name: 'day', label: 'Gün', type: 'select', required: true, options: DAY_OPTS },
  { name: 'minTime', label: 'Min. Saat', type: 'text' },
  { name: 'maxTime', label: 'Max. Saat', type: 'text' },
]
const OPT_FIELDS: LF[] = [
  { name: 'unloadPersonnelTime', label: 'Tahliye Personel Süresi', type: 'number' },
  { name: 'unloadPersonnelCost', label: 'Tahliye Personel Maliyeti', type: 'number' },
  { name: 'vehicleSize', label: 'Araç Büyüklüğü', type: 'text' },
  { name: 'serviceTime', label: 'Servis Süresi', type: 'number' },
]

// Zincir Mağaza — bu cariye bağlı alt cariler (parentId)
function ChainStores({ partnerId, allPartners }: { partnerId: string; allPartners: Opt[] }) {
  const { message } = App.useApp()
  const [children, setChildren] = useState<Record<string, unknown>[]>([])
  const [sel, setSel] = useState<number | undefined>()
  const [loading, setLoading] = useState(true)

  const load = useCallback(() => {
    setLoading(true)
    axiosInstance.get('/api/partners', { params: { parentId: partnerId } })
      .then((r) => setChildren(Array.isArray(r.data) ? r.data : (r.data.data ?? [])))
      .finally(() => setLoading(false))
  }, [partnerId])
  useEffect(load, [load])

  const attach = async () => {
    if (!sel) return
    try { await axiosInstance.patch(`/api/partners/${sel}`, { parentId: Number(partnerId) }); setSel(undefined); message.success('Eklendi'); load() }
    catch (e) { message.error((e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Eklenemedi') }
  }
  const detach = async (cid: number) => {
    try { await axiosInstance.patch(`/api/partners/${cid}`, { parentId: null }); message.success('Çıkarıldı'); load() }
    catch { message.error('Çıkarılamadı') }
  }

  const childIds = new Set(children.map((c) => c.id as number))
  const opts = allPartners.filter((p) => p.value !== Number(partnerId) && !childIds.has(p.value))

  return (
    <Space orientation="vertical" style={{ width: '100%' }} size={14}>
      <Card size="small" style={{ background: 'var(--og-sunken)' }} styles={{ body: { padding: '10px 14px' } }}>
        <Space>
          <Select style={{ minWidth: 280 }} value={sel} onChange={setSel} options={opts} showSearch optionFilterProp="label" allowClear placeholder="Alt cari seç" />
          <Button type="primary" icon={<PlusOutlined />} onClick={attach}>Ekle</Button>
        </Space>
      </Card>
      <Table size="small" rowKey="id" loading={loading} dataSource={children} pagination={false} locale={{ emptyText: 'Bağlı alt cari yok' }}
        columns={[
          { title: 'Kod', dataIndex: 'code' },
          { title: 'Ünvan', dataIndex: 'name' },
          { title: '', key: 'x', width: 70, render: (_, row) => <Typography.Link type="danger" onClick={() => detach(row.id as number)}>Çıkar</Typography.Link> },
        ]} />
    </Space>
  )
}

function useOpts(path: string) {
  const [opts, setOpts] = useState<Opt[]>([])
  useEffect(() => {
    axiosInstance.get(`/api/${path}`, { params: { pageSize: 500 } }).then((r) => {
      const list = Array.isArray(r.data) ? r.data : (r.data.data ?? [])
      setOpts(list.map((x: Record<string, unknown>) => ({ value: x.id as number, label: `${x.code ?? x.id}${x.name ? ' — ' + x.name : ''}` })))
    })
  }, [path])
  return opts
}

const TYPE_OPTS = [
  { value: 'CUSTOMER', label: 'Müşteri (Alıcı)' },
  { value: 'SUPPLIER', label: 'Tedarikçi (Satıcı)' },
  { value: 'BOTH', label: 'Alıcı ve Satıcı' },
]

export const PartnerForm = ({ mode }: { mode: 'create' | 'edit' }) => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { message } = App.useApp()
  const [form] = Form.useForm()
  const [submitting, setSubmitting] = useState(false)
  const [tab, setTab] = useState('def')

  const regions = useOpts('regions')
  const partnerGroups = useOpts('partner-groups')
  const partners = useOpts('partners')

  useEffect(() => {
    if (mode === 'edit' && id) axiosInstance.get(`/api/partners/${id}`).then((r) => form.setFieldsValue(r.data))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, id])

  const onFinish = async (values: Record<string, unknown>) => {
    setSubmitting(true)
    try {
      // boş string alanları gönderme (email .email() doğrulaması boş stringi reddeder)
      const clean = Object.fromEntries(Object.entries(values).filter(([, v]) => v !== '' && v !== undefined))
      if (mode === 'create') {
        const r = await axiosInstance.post('/api/partners', clean)
        message.success('Cari kaydedildi')
        navigate(`/partners/${r.data.id}/edit`)
      } else {
        const { code: _c, ...rest } = clean
        await axiosInstance.patch(`/api/partners/${id}`, rest)
        message.success('Güncellendi')
      }
    } catch (e) {
      message.error((e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'İşlem başarısız')
    } finally { setSubmitting(false) }
  }

  const num = (name: string, label: string) => (
    <Col xs={24} sm={8}><Form.Item name={name} label={label}><InputNumber style={{ width: '100%' }} /></Form.Item></Col>
  )
  const txt = (name: string, label: string, span = 8) => (
    <Col xs={24} sm={span}><Form.Item name={name} label={label}><Input /></Form.Item></Col>
  )

  const defTab = (
    <Form form={form} layout="vertical" onFinish={onFinish} initialValues={{ isActive: true, type: 'BOTH' }}>
      <Card className="og-section-card" size="small" title="Müşteri">
        <Row gutter={[20, 0]}>
          <Col xs={24} sm={6}><Form.Item name="code" label="Müşteri Kodu" rules={[{ required: true, message: 'Zorunlu' }]}><Input disabled={mode === 'edit'} /></Form.Item></Col>
          <Col xs={24} sm={12}><Form.Item name="name" label="Ünvan" rules={[{ required: true, message: 'Zorunlu' }]}><Input /></Form.Item></Col>
          <Col xs={24} sm={6}>
            <div className="og-switchrow" style={{ marginTop: 30 }}>
              <span className="og-switchrow__label">Aktif</span>
              <Form.Item name="isActive" valuePropName="checked" noStyle><Switch /></Form.Item>
            </div>
          </Col>
        </Row>
      </Card>

      <Card className="og-section-card" size="small" title="Genel Bilgiler">
        <Row gutter={[20, 0]}>
          {txt('shortName', 'Kısa Ad')}
          {txt('contactPerson', 'İlgili Kişi')}
          {txt('contactPerson2', 'İlgili Kişi 2')}
          {txt('specialCode', 'Özel Kod')}
          <Col xs={24} sm={8}><Form.Item name="type" label="Çalışma Tipi" rules={[{ required: true, message: 'Zorunlu' }]}><Select options={TYPE_OPTS} /></Form.Item></Col>
        </Row>
      </Card>

      <Card className="og-section-card" size="small" title="İletişim Bilgileri">
        <Row gutter={[20, 0]}>
          {txt('address', 'Adres', 12)}
          {txt('address2', 'Adres 2', 12)}
          {txt('city', 'Şehir')}
          {txt('district', 'İlçe')}
          {txt('postalCode', 'Posta Kodu')}
          {txt('country', 'Ülke')}
          {txt('phone', 'Telefon')}
          {txt('phone2', 'Telefon 2')}
          {txt('mobilePhone', 'Cep Tel No')}
          {txt('fax', 'Faks')}
          {txt('website', 'Web Adresi')}
          {txt('email', 'Email')}
        </Row>
      </Card>

      <Card className="og-section-card" size="small" title="Diğer">
        <Row gutter={[20, 0]}>
          <Col xs={24} sm={8}><Form.Item name="regionId" label="Bölge"><Select options={regions} showSearch optionFilterProp="label" allowClear placeholder="Seçiniz" /></Form.Item></Col>
          <Col xs={24} sm={8}><Form.Item name="partnerGroupId" label="Grup"><Select options={partnerGroups} showSearch optionFilterProp="label" allowClear placeholder="Seçiniz" /></Form.Item></Col>
          <Col xs={24} sm={8}><Form.Item name="parentId" label="Zincir / Üst Cari"><Select options={partners.filter((p) => String(p.value) !== id)} showSearch optionFilterProp="label" allowClear placeholder="Seçiniz" /></Form.Item></Col>
          {txt('taxOffice', 'Vergi Dairesi')}
          {txt('taxNumber', 'Vergi Numarası')}
          {txt('nationalId', 'TC Kimlik No')}
          {txt('licenseOffice', 'Ruhsat Daire')}
          {txt('licenseNo', 'Ruhsat No')}
          {num('priorityOrder', 'Öncelik Sıra')}
          {txt('minDeliveryTime', 'Min. Teslim Zamanı')}
          {txt('maxDeliveryTime', 'Max. Teslim Zamanı')}
          {txt('vehicleRestriction', 'Araç Kısıtlama')}
          <Col xs={24} sm={8}>
            <div className="og-switchrow" style={{ marginTop: 30 }}>
              <span className="og-switchrow__label">Paletli</span>
              <Form.Item name="palletized" valuePropName="checked" noStyle><Switch /></Form.Item>
            </div>
          </Col>
        </Row>
      </Card>

      <Card className="og-section-card" size="small" title="Adres Bilgileri">
        <Row gutter={[20, 0]}>
          {txt('street', 'Cadde')}
          {txt('streetName', 'Sokak')}
          {txt('neighborhood', 'Mahalle')}
          {txt('otherAddress', 'Diğer')}
          {txt('doorNo', 'Kapı No')}
          {num('mapCode', 'Harita Kodu')}
          {num('coordinateX', 'Koordinat X')}
          {num('coordinateY', 'Koordinat Y')}
        </Row>
      </Card>

      <div className="og-formbar">
        <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={submitting}>{mode === 'create' ? 'Kaydet ve Devam Et' : 'Kaydet'}</Button>
        <Button onClick={() => navigate('/partners')}>İptal</Button>
      </div>
    </Form>
  )

  const enabled = mode === 'edit' && !!id
  const items = [
    { key: 'def', label: 'Tanım', children: defTab },
    { key: 'eksaha', label: 'Ek Sahalar', disabled: !enabled, children: enabled ? <LinkTab ownerField="partnerId" ownerId={id!} resource="partner-extra-fields" fields={EKSAHA_FIELDS} /> : null },
    { key: 'gruplar', label: 'Gruplar', disabled: !enabled, children: enabled ? <LinkTab ownerField="partnerId" ownerId={id!} resource="partner-extra-group-links" fields={GRUP_FIELDS} /> : null },
    { key: 'zincir', label: 'Zincir Mağaza', disabled: !enabled, children: enabled ? <ChainStores partnerId={id!} allPartners={partners} /> : null },
    { key: 'kabul', label: 'Kabul Zamanı', disabled: !enabled, children: enabled ? <LinkTab ownerField="partnerId" ownerId={id!} resource="partner-acceptance-times" fields={KABUL_FIELDS} /> : null },
    { key: 'optim', label: 'Optimizasyon', disabled: !enabled, children: enabled ? <LinkTab ownerField="partnerId" ownerId={id!} resource="partner-optimizations" fields={OPT_FIELDS} /> : null },
  ]

  return (
    <div className="og-page" style={{ maxWidth: 1100 }}>
      <PageHeader
        title={`Cari — ${mode === 'create' ? 'Yeni' : 'Düzenle'}`}
        subtitle="Müşteri / tedarikçi kartı"
        extra={<Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/partners')}>Liste</Button>}
      />
      <Tabs activeKey={tab} onChange={setTab} items={items} />
    </div>
  )
}
