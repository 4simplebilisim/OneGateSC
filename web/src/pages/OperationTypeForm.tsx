import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { App, Alert, Button, Card, Col, Form, Input, InputNumber, Row, Select, Switch, Tabs, Space } from 'antd'
import { ArrowLeftOutlined, SaveOutlined } from '@ant-design/icons'
import { axiosInstance } from '../providers/dataProvider'
import { PageHeader } from '../components/PageHeader'
import { LinkTab, type LF } from '../components/LinkTab'

type F = { n: string; l: string; t?: 'text' | 'number' | 'bool' | 'select' | 'ref'; req?: boolean; opts?: { value: string; label: string }[]; ref?: string }
type Sec = { title: string; fields: F[] }

const SECTIONS: Sec[] = [
  {
    title: 'Genel',
    fields: [
      { n: 'code', l: 'Kod', t: 'text', req: true },
      { n: 'name', l: 'Tanım', t: 'text', req: true },
      { n: 'direction', l: 'Kategori', t: 'select', req: true, opts: [{ value: 'INBOUND', label: 'Giriş' }, { value: 'OUTBOUND', label: 'Çıkış' }, { value: 'INTERNAL', label: 'Transfer' }, { value: 'COUNT', label: 'Sayım' }] },
      { n: 'documentType', l: 'Belge Tipi', t: 'select', opts: [{ value: 'STOCK_MOVEMENT', label: 'Stok Hareketi' }, { value: 'COUNT', label: 'Sayım' }, { value: 'PRODUCTION', label: 'Üretim' }, { value: 'ORDER', label: 'Sipariş' }, { value: 'OTHER', label: 'Diğer' }] },
      { n: 'facilityId', l: 'Tesis', t: 'ref', ref: 'facilities' },
      { n: 'sequenceId', l: 'Sayaç', t: 'ref', ref: 'sequences' },
      { n: 'operationSequenceId', l: 'Operasyon Sayaç', t: 'ref', ref: 'sequences' },
      { n: 'operationGroupId', l: 'Grup', t: 'ref', ref: 'operation-groups' },
      { n: 'affectsStock', l: 'Stok Etkiler', t: 'bool' },
      { n: 'emailSend', l: 'E-Posta Gönderilsin', t: 'bool' },
      { n: 'isActive', l: 'Aktif', t: 'bool' },
    ],
  },
  {
    title: 'Stok Hareketi',
    fields: [
      { n: 'controlMode', l: 'Kontrollü İşlem', t: 'select', opts: [{ value: 'UNCONTROLLED', label: 'Kontrolsüz' }, { value: 'CONTROLLED', label: 'Kontrollü İşlem' }, { value: 'REFERENCE_CONTROLLED', label: 'Referans Kontrollü' }] },
      { n: 'reverseOperationTypeId', l: 'Ters Operasyon', t: 'ref', ref: 'operation-types' },
      { n: 'cancelLocationId', l: 'İptal Lokasyon', t: 'ref', ref: 'locations' },
      { n: 'reasonRequired', l: 'Neden Girişi Zorunlu', t: 'bool' },
      { n: 'reasonInHeader', l: 'Neden Girişi Başlıkta', t: 'bool' },
      { n: 'equivalentApplication', l: 'Muadil Uygulaması', t: 'bool' },
      { n: 'materialBasedCollection', l: 'Mal Bazında Toplama', t: 'bool' },
      { n: 'materialBasedQtyEdit', l: 'Mal Bazında Miktar Düzenlensin', t: 'bool' },
      { n: 'batchAssignment', l: 'Batch Atama Yapılsın', t: 'bool' },
      { n: 'qualityControl', l: 'Kalite Kontrolü Yapılsın', t: 'bool' },
      { n: 'detailLocationToCoverage', l: 'Detay Lok. Kapsama Aktarılsın', t: 'bool' },
    ],
  },
  {
    title: 'Entegrasyon',
    fields: [
      { n: 'integration', l: 'Entegrasyon Yapılsın', t: 'bool' },
      { n: 'approvedDocUpdate', l: 'Onaylı Belge Güncellensin', t: 'bool' },
      { n: 'bulkSend', l: 'Toplu Gönderim', t: 'bool' },
    ],
  },
  {
    title: 'Kontrol / İşlem',
    fields: [
      { n: 'readBasedControl', l: 'Okutma Bazında Kontrol', t: 'bool' },
      { n: 'readBasedInfoMessage', l: 'Okutma Bazında Bilgi Mesajı', t: 'bool' },
      { n: 'logging', l: 'Loglama', t: 'bool' },
      { n: 'logControl', l: 'Log Kontrol', t: 'bool' },
      { n: 'logControlDays', l: 'Log Kontrol Gün Sayısı', t: 'number' },
      { n: 'grouping', l: 'Gruplama', t: 'bool' },
      { n: 'groupSequenceId', l: 'Grup Sayaç', t: 'ref', ref: 'sequences' },
    ],
  },
  {
    title: 'Stok İşlemleri',
    fields: [
      { n: 'sameUsePallet', l: 'Aynı Palet Kullanılsın', t: 'bool' },
      { n: 'sameUseSerial', l: 'Aynı Seri Kullanılsın', t: 'bool' },
      { n: 'passiveProductUse', l: 'Pasif Ürün Kullanılsın', t: 'bool' },
      { n: 'palletBreaking', l: 'Palet Bozma', t: 'bool' },
      { n: 'originalQtyUpdate', l: 'Orjinal Miktar Güncellensin', t: 'bool' },
      { n: 'reserveTransfer', l: 'Rezerve Transfer Edilsin', t: 'bool' },
    ],
  },
]

const REF_RESOURCES = [...new Set(SECTIONS.flatMap((s) => s.fields).filter((f) => f.t === 'ref').map((f) => f.ref!))]

// ── Bağlantı sekmesi alan tanımları (LF tipi paylaşılan LinkTab'ten) ──
// Bağlantı kapsamı (Hepsi/Grup/Belirli) + Tesis ortak deseni
const SCOPE: LF['options'] = [{ value: 'ALL', label: 'Hepsi' }, { value: 'GROUP', label: 'Grup' }, { value: 'SPECIFIC', label: 'Belirli' }]
const TESIS: LF = { name: 'facilityId', label: 'Tesis', type: 'ref', ref: 'facilities' }
const CARI: LF[] = [{ name: 'cariLinkType', label: 'Cari Bağ.', type: 'select', options: SCOPE }, { name: 'cariLinkId', label: 'Cari', type: 'ref', ref: 'partners' }]
const MALZEME: LF[] = [{ name: 'materialLinkType', label: 'Malzeme Bağ.', type: 'select', options: SCOPE }, { name: 'materialLinkId', label: 'Ürün', type: 'ref', ref: 'products' }]

const STATUS_FIELDS: LF[] = [
  TESIS, ...CARI, ...MALZEME,
  { name: 'sourceStatusId', label: 'Kaynak Statü (boş=dış)', type: 'ref', ref: 'statuses' },
  { name: 'targetStatusId', label: 'Hedef Statü', type: 'ref', ref: 'statuses', required: true },
  { name: 'sortOrder', label: 'Sıra', type: 'number' },
]
const LOCATION_FIELDS: LF[] = [
  TESIS, ...CARI, ...MALZEME,
  { name: 'sourceLinkType', label: 'Kaynak Bağ.', type: 'select', options: SCOPE },
  { name: 'sourceLocationId', label: 'Kaynak Lokasyon', type: 'ref', ref: 'locations' },
  { name: 'targetLinkType', label: 'Hedef Bağ.', type: 'select', options: SCOPE },
  { name: 'targetLocationId', label: 'Hedef Lokasyon', type: 'ref', ref: 'locations' },
  { name: 'fixLocation', label: 'Lokasyon Sabit', type: 'bool' },
  { name: 'terminalFixSource', label: 'El Terminali Kaynak Sabit', type: 'bool' },
  { name: 'terminalFixTarget', label: 'El Terminali Hedef Sabit', type: 'bool' },
]
const REASON_FIELDS: LF[] = [
  TESIS,
  { name: 'reasonCategoryId', label: 'Neden Kategori', type: 'ref', ref: 'reason-categories' },
  { name: 'reasonId', label: 'Neden', type: 'ref', ref: 'reasons', required: true },
  { name: 'isAutomatic', label: 'Otomatik', type: 'bool' },
]
const PALLET_FIELDS: LF[] = [
  TESIS,
  { name: 'palletTypeId', label: 'Palet Tipi', type: 'ref', ref: 'pallet-types', required: true },
  { name: 'innerPalletTypeId', label: 'İç Palet Tipi', type: 'ref', ref: 'pallet-types' },
]
// Kurallar sekmesi (operasyona ait config)
const TOLERANCE_FIELDS: LF[] = [TESIS, ...CARI, ...MALZEME, { name: 'ignoreSplit', label: 'Bölme Dikkate Alınsın', type: 'bool' }]
const FORBIDDEN_FIELDS: LF[] = [TESIS, ...CARI, ...MALZEME]
const CONVERSION_FIELDS: LF[] = [
  TESIS,
  { name: 'conversionCode', label: 'Dönüşüm Kodu', type: 'text', required: true },
  { name: 'statusId', label: 'Statü', type: 'ref', ref: 'statuses' },
  { name: 'outgoing', label: 'Giden', type: 'bool' },
  { name: 'sourceLocLinkType', label: 'Kaynak Lok. Bağ.', type: 'select', options: SCOPE },
  { name: 'sourceLocLinkId', label: 'Kaynak Lokasyon', type: 'ref', ref: 'locations' },
  { name: 'targetLocLinkType', label: 'Hedef Lok. Bağ.', type: 'select', options: SCOPE },
  { name: 'targetLocLinkId', label: 'Hedef Lokasyon', type: 'ref', ref: 'locations' },
]
const BULK_FIELDS: LF[] = [
  TESIS,
  { name: 'bulkActionType', label: 'Toplu İşlem Tipi', type: 'select', options: [{ value: 'CONTROLLED_BULK', label: 'Kontrollü Toplu İşlem' }, { value: 'BULK', label: 'Toplu İşlem' }, { value: 'RESERVATION', label: 'Rezervasyon' }, { value: 'SELECTED_DOCUMENT', label: 'Seçimli Belge' }, { value: 'BATCH_CHANGE', label: 'Batch Değiştirme' }] },
  { name: 'description', label: 'Açıklama', type: 'text' },
]
const GROUPLINK_FIELDS: LF[] = [
  TESIS,
  { name: 'operationGroupId', label: 'Operasyon Grubu', type: 'ref', ref: 'operation-groups', required: true },
  { name: 'businessPartnerId', label: 'Cari', type: 'ref', ref: 'partners' },
]

type Opt = { value: number; label: string }

export const OperationTypeForm = ({ mode }: { mode: 'create' | 'edit' }) => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { message } = App.useApp()
  const [form] = Form.useForm()
  const [refOpts, setRefOpts] = useState<Record<string, Opt[]>>({})
  const [submitting, setSubmitting] = useState(false)
  const [tab, setTab] = useState('def')

  useEffect(() => {
    REF_RESOURCES.forEach((rr) => {
      axiosInstance.get(`/api/${rr}`, { params: { pageSize: 300 } }).then((r) => {
        const rows = Array.isArray(r.data) ? r.data : (r.data.data ?? [])
        setRefOpts((p) => ({ ...p, [rr]: rows.map((x: Record<string, unknown>) => ({ value: x.id as number, label: `${x.code}${x.name ? ' — ' + x.name : ''}` })) }))
      })
    })
  }, [])

  useEffect(() => {
    if (mode === 'edit' && id) axiosInstance.get(`/api/operation-types/${id}`).then((r) => form.setFieldsValue(r.data))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, id])

  const onFinish = async (values: Record<string, unknown>) => {
    setSubmitting(true)
    try {
      if (mode === 'create') {
        const r = await axiosInstance.post('/api/operation-types', values)
        message.success('Tanım kaydedildi — şimdi sekmelerden statü/lokasyon/neden/palet bağlayabilirsiniz')
        navigate(`/operation-types/${r.data.id}/edit`)
      } else {
        const { code: _c, ...rest } = values
        await axiosInstance.patch(`/api/operation-types/${id}`, rest)
        message.success('Güncellendi')
      }
    } catch (e) {
      message.error((e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'İşlem başarısız')
    } finally {
      setSubmitting(false)
    }
  }

  const control = (f: F) => {
    if (f.t === 'bool') return <Switch />
    if (f.t === 'number') return <InputNumber style={{ width: '100%' }} />
    if (f.t === 'select') return <Select options={f.opts} allowClear />
    if (f.t === 'ref') return <Select options={refOpts[f.ref!] ?? []} showSearch optionFilterProp="label" allowClear placeholder="Seçiniz" />
    return <Input disabled={mode === 'edit' && f.n === 'code'} />
  }

  const defTab = (
    <Form form={form} layout="vertical" onFinish={onFinish} initialValues={{ direction: 'INBOUND', documentType: 'STOCK_MOVEMENT', affectsStock: true, isActive: true }}>
      {mode === 'create' && (
        <Alert type="info" showIcon style={{ marginBottom: 14 }} title="Önce tanımı kaydedin — ardından Statü, Lokasyon, Neden ve Palet Tipi sekmeleri açılır." />
      )}
      {SECTIONS.map((sec) => (
        <Card key={sec.title} className="og-section-card" size="small" title={sec.title}>
          <Row gutter={[18, 0]}>
            {sec.fields.map((f) =>
              f.t === 'bool' ? (
                <Col xs={24} sm={12} lg={8} key={f.n} style={{ marginBottom: 12 }}>
                  <div className="og-switchrow">
                    <span className="og-switchrow__label">{f.l}</span>
                    <Form.Item name={f.n} valuePropName="checked" noStyle><Switch /></Form.Item>
                  </div>
                </Col>
              ) : (
                <Col xs={24} sm={12} lg={8} key={f.n}>
                  <Form.Item name={f.n} label={f.l} rules={f.req ? [{ required: true, message: 'Zorunlu' }] : []}>
                    {control(f)}
                  </Form.Item>
                </Col>
              ),
            )}
          </Row>
        </Card>
      ))}
      <div className="og-formbar">
        <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={submitting}>
          {mode === 'create' ? 'Kaydet ve Devam Et' : 'Tanımı Kaydet'}
        </Button>
        <Button onClick={() => navigate('/operation-types')}>İptal</Button>
      </div>
    </Form>
  )

  const linkTabsEnabled = mode === 'edit' && !!id
  const items = [
    { key: 'def', label: 'Tanım', children: defTab },
    { key: 'status', label: 'Statü', disabled: !linkTabsEnabled, children: linkTabsEnabled ? <LinkTab ownerField="operationTypeId" ownerId={id!} resource="operation-type-statuses" fields={STATUS_FIELDS} /> : null },
    { key: 'loc', label: 'Lokasyon', disabled: !linkTabsEnabled, children: linkTabsEnabled ? <LinkTab ownerField="operationTypeId" ownerId={id!} resource="operation-type-locations" fields={LOCATION_FIELDS} /> : null },
    { key: 'reason', label: 'Neden', disabled: !linkTabsEnabled, children: linkTabsEnabled ? <LinkTab ownerField="operationTypeId" ownerId={id!} resource="operation-type-reasons" fields={REASON_FIELDS} /> : null },
    { key: 'pallet', label: 'Palet Tipi', disabled: !linkTabsEnabled, children: linkTabsEnabled ? <LinkTab ownerField="operationTypeId" ownerId={id!} resource="operation-type-pallet-types" fields={PALLET_FIELDS} /> : null },
    {
      key: 'rules', label: 'Kurallar', disabled: !linkTabsEnabled,
      children: linkTabsEnabled ? (
        <Space orientation="vertical" style={{ width: '100%' }} size={22}>
          {([
            ['Tolerans', 'operation-tolerances', TOLERANCE_FIELDS],
            ['Yasaklı Ürün', 'operation-forbidden-products', FORBIDDEN_FIELDS],
            ['Dönüşüm', 'operation-conversions', CONVERSION_FIELDS],
            ['Toplu İşlem', 'operation-bulk-actions', BULK_FIELDS],
            ['Grup Bağlantı', 'operation-group-links', GROUPLINK_FIELDS],
          ] as [string, string, LF[]][]).map(([title, res, flds]) => (
            <div key={res}>
              <div className="og-display" style={{ fontWeight: 700, fontSize: 14, color: 'var(--og-ink)', marginBottom: 8 }}>{title}</div>
              <LinkTab ownerField="operationTypeId" ownerId={id!} resource={res} fields={flds} />
            </div>
          ))}
        </Space>
      ) : null,
    },
  ]

  return (
    <div className="og-page" style={{ maxWidth: 1040 }}>
      <PageHeader
        title={`Operasyon Tipi — ${mode === 'create' ? 'Yeni' : 'Düzenle'}`}
        subtitle="Operasyon tanımı işin kalbi — tek ekranda tanım + statü/lokasyon/neden/palet tipi"
        extra={<Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/operation-types')}>Liste</Button>}
      />
      <Tabs activeKey={tab} onChange={setTab} items={items} />
    </div>
  )
}
