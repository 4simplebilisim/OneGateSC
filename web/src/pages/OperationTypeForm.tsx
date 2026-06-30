import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { App, Alert, Button, Card, Col, Form, Input, InputNumber, Row, Select, Switch, Tabs, Space } from 'antd'
import { ArrowLeftOutlined, SaveOutlined } from '@ant-design/icons'
import { axiosInstance } from '../providers/dataProvider'
import { PageHeader } from '../components/PageHeader'
import { LinkTab, type LF } from '../components/LinkTab'
import { QuickCreateSelect } from '../components/QuickCreateSelect'

type F = { n: string; l: string; t?: 'text' | 'number' | 'bool' | 'select' | 'ref'; req?: boolean; opts?: { value: string; label: string }[]; ref?: string; disabled?: boolean }
type Sec = { title: string; fields: F[] }

const SECTIONS: Sec[] = [
  {
    title: 'Genel',
    fields: [
      { n: 'facilityId', l: 'Tesis', t: 'ref', ref: 'facilities' },
      { n: 'code', l: 'Kod', t: 'text', req: true },
      { n: 'name', l: 'Tanım', t: 'text', req: true },
      { n: 'direction', l: 'Kategori', t: 'select', req: true, opts: [{ value: 'INBOUND', label: 'Giriş' }, { value: 'OUTBOUND', label: 'Çıkış' }, { value: 'INTERNAL', label: 'Transfer' }, { value: 'COUNT', label: 'Sayım' }] },
      { n: 'documentType', l: 'Belge Tipi', t: 'select', opts: [{ value: 'STOCK_MOVEMENT', label: 'Stok Hareketi' }, { value: 'COUNT', label: 'Sayım' }, { value: 'PRODUCTION', label: 'Üretim' }, { value: 'ORDER', label: 'Sipariş' }, { value: 'OTHER', label: 'Diğer' }] },
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
      { n: 'reasonRequired', l: 'Neden Girişi Zorunlu', t: 'bool' },
      { n: 'reasonInHeader', l: 'Neden Girişi Başlıkta', t: 'bool' },
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
      { n: 'partialUsage', l: 'Parçalı Kullanım Yapılsın', t: 'bool' },
    ],
  },
]

const REF_RESOURCES = [...new Set(SECTIONS.flatMap((s) => s.fields).filter((f) => f.t === 'ref').map((f) => f.ref!))]

// ── Bağlantı sekmesi alan tanımları (LF tipi paylaşılan LinkTab'ten) ──
// Bağlantı kapsamı (Hepsi/Grup/Belirli) + Tesis ortak deseni
const SCOPE: LF['options'] = [{ value: 'ALL', label: 'Hepsi' }, { value: 'GROUP', label: 'Grup' }, { value: 'SPECIFIC', label: 'Belirli' }]
// NOT: alt-sekmelerde Tesis sorulmaz — operasyon tipinin Tesis'i (facilityId) LinkTab defaults ile devralınır.
// Cari/Malzeme Bağ.='Hepsi' iken Cari/Ürün seçimi DISABLED (zaten hepsini kapsıyor) — tüm alt-tab'lara yansır
const CARI: LF[] = [{ name: 'cariLinkType', label: 'Cari Bağ.', type: 'select', options: SCOPE }, { name: 'cariLinkId', label: 'Cari', type: 'ref', ref: 'partners', disabledWhen: { field: 'cariLinkType', equals: 'ALL' } }]
const MALZEME: LF[] = [{ name: 'materialLinkType', label: 'Malzeme Bağ.', type: 'select', options: SCOPE }, { name: 'materialLinkId', label: 'Ürün', type: 'ref', ref: 'products', disabledWhen: { field: 'materialLinkType', equals: 'ALL' } }]

const STATUS_FIELDS: LF[] = [
  ...CARI, ...MALZEME,
  { name: 'sourceStatusId', label: 'Kaynak Statü (boş=dış)', type: 'ref', ref: 'statuses' },
  { name: 'targetStatusId', label: 'Hedef Statü', type: 'ref', ref: 'statuses', required: true },
  { name: 'sortOrder', label: 'Sıra', type: 'number' },
]
const LOCATION_FIELDS: LF[] = [
  ...CARI, ...MALZEME,
  { name: 'sourceLinkType', label: 'Kaynak Bağ.', type: 'select', options: SCOPE },
  { name: 'sourceLocationId', label: 'Kaynak Lokasyon', type: 'ref', ref: 'locations' },
  { name: 'targetLinkType', label: 'Hedef Bağ.', type: 'select', options: SCOPE },
  { name: 'targetLocationId', label: 'Hedef Lokasyon', type: 'ref', ref: 'locations' },
  { name: 'fixLocation', label: 'Lokasyon Sabit', type: 'bool' },
  { name: 'terminalFixSource', label: 'El Terminali Kaynak Sabit', type: 'bool' },
  { name: 'terminalFixTarget', label: 'El Terminali Hedef Sabit', type: 'bool' },
]
const REASON_FIELDS: LF[] = [
  { name: 'reasonCategoryId', label: 'Neden Kategori', type: 'ref', ref: 'reason-categories' },
  { name: 'reasonId', label: 'Neden', type: 'ref', ref: 'reasons', required: true },
  { name: 'isAutomatic', label: 'Otomatik', type: 'bool' },
]
const PALLET_FIELDS: LF[] = [
  { name: 'palletTypeId', label: 'Palet Tipi', type: 'ref', ref: 'pallet-types', required: true },
  { name: 'innerPalletTypeId', label: 'İç Palet Tipi', type: 'ref', ref: 'pallet-types' },
]
// Kurallar sekmesi (operasyona ait config)
const TOLERANCE_FIELDS: LF[] = [...CARI, ...MALZEME, { name: 'ignoreSplit', label: 'Bölme Dikkate Alınsın', type: 'bool' }]
const FORBIDDEN_FIELDS: LF[] = [...CARI, ...MALZEME]
const CONVERSION_FIELDS: LF[] = [
  { name: 'conversionCode', label: 'Dönüşüm Kodu', type: 'text', required: true },
  { name: 'statusId', label: 'Statü', type: 'ref', ref: 'statuses' },
  { name: 'outgoing', label: 'Giden', type: 'bool' },
  { name: 'sourceLocLinkType', label: 'Kaynak Lok. Bağ.', type: 'select', options: SCOPE },
  { name: 'sourceLocLinkId', label: 'Kaynak Lokasyon', type: 'ref', ref: 'locations' },
  { name: 'targetLocLinkType', label: 'Hedef Lok. Bağ.', type: 'select', options: SCOPE },
  { name: 'targetLocLinkId', label: 'Hedef Lokasyon', type: 'ref', ref: 'locations' },
]
const BULK_FIELDS: LF[] = [
  { name: 'bulkActionType', label: 'Toplu İşlem Tipi', type: 'select', options: [{ value: 'CONTROLLED_BULK', label: 'Kontrollü Toplu İşlem' }, { value: 'BULK', label: 'Toplu İşlem' }, { value: 'RESERVATION', label: 'Rezervasyon' }, { value: 'SELECTED_DOCUMENT', label: 'Seçimli Belge' }, { value: 'BATCH_CHANGE', label: 'Batch Değiştirme' }] },
  { name: 'description', label: 'Açıklama', type: 'text' },
]
const GROUPLINK_FIELDS: LF[] = [
  { name: 'operationGroupId', label: 'Operasyon Grubu', type: 'ref', ref: 'operation-groups', required: true },
  { name: 'businessPartnerId', label: 'Cari', type: 'ref', ref: 'partners' },
]

type Opt = { value: number; label: string }

export const OperationTypeForm = ({ mode }: { mode: 'create' | 'edit' }) => {
  const { id } = useParams()
  const [search] = useSearchParams()
  const copyFrom = search.get('copyFrom')
  const navigate = useNavigate()
  const { message } = App.useApp()
  const [form] = Form.useForm()
  // Operasyon yönü — Lokasyon alt-tab'ında kaynak/hedef alanlarını yöne göre filtrelemek için izlenir
  const direction = (Form.useWatch('direction', form) ?? 'INBOUND') as string
  const [refOpts, setRefOpts] = useState<Record<string, Opt[]>>({})
  const [submitting, setSubmitting] = useState(false)
  const [tab, setTab] = useState('def')

  // Firma (tenant) — companyId katmanı, tesisten AYRI. Önce firma seçilir; Tesis o firmaya ait tesisleri gösterir.
  // Super-admin yeni kayıtta firmayı seçer (og_company hizalanır → ref alanları, özellikle Tesis, o firmaya göre yeniden çekilir).
  const isSuper = (() => { try { return !!JSON.parse(localStorage.getItem('og_user') ?? 'null')?.isSuperAdmin } catch { return false } })()
  const [companies, setCompanies] = useState<{ id: number; code: string; name: string }[]>([])
  const [companyId, setCompanyId] = useState<number | null>(Number(localStorage.getItem('og_company')) || null)
  const [opFacilityId, setOpFacilityId] = useState<number | null>(null) // operasyon tipinin tesisi → alt-sekmeler devralır
  useEffect(() => {
    axiosInstance.get('/api/companies').then((r) => setCompanies((Array.isArray(r.data) ? r.data : (r.data.data ?? [])) as { id: number; code: string; name: string }[])).catch(() => { /* tek firma / yetki yok */ })
  }, [])
  const firmLabel = (() => { const c = companies.find((x) => x.id === companyId); return c ? `${c.code} — ${c.name}` : (companyId ? `#${companyId}` : '—') })()

  // Tek bir ref kaynağının seçeneklerini (yeniden) çek — hızlı-ekle sonrası da kullanılır
  const refetchRef = useCallback((rr: string) =>
    axiosInstance.get(`/api/${rr}`, { params: { pageSize: 300, companyId: companyId || undefined } }).then((r) => {
      const rows = Array.isArray(r.data) ? r.data : (r.data.data ?? [])
      setRefOpts((p) => ({ ...p, [rr]: rows.map((x: Record<string, unknown>) => ({ value: x.id as number, label: `${x.code}${x.name ? ' — ' + x.name : ''}` })) }))
    }), [companyId])

  useEffect(() => {
    REF_RESOURCES.forEach((rr) => refetchRef(rr))
    // companyId değişince (super-admin firma değiştirdi) Tesis dahil tüm ref'ler o firmaya göre yeniden çekilir
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId])

  useEffect(() => {
    if (mode === 'edit' && id) axiosInstance.get(`/api/operation-types/${id}`).then((r) => { form.setFieldsValue(r.data); if (r.data?.companyId) setCompanyId(r.data.companyId); setOpFacilityId(r.data?.facilityId ?? null) })
    else if (mode === 'create' && copyFrom) {
      // Kopyala: tanım alanlarını çek, kimlik/zaman/kod alanlarını at (bağlantı sekmeleri kopyalanmaz — kaydet sonrası eklenir)
      axiosInstance.get(`/api/operation-types/${copyFrom}`).then((r) => {
        const { id: _id, code: _code, createdAt: _c, updatedAt: _u, companyId: _co, createdById: _cb, ...rest } = r.data
        // null alanları ele — backend zod .optional() null kabul etmez
        form.setFieldsValue(Object.fromEntries(Object.entries(rest).filter(([, v]) => v !== null)))
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, id, copyFrom])

  // Super-admin firmayı değiştirince: tenant bağlamını (og_company) hizala (switcher yok) → Tesis dahil ref'ler
  // o firmaya göre yeniden çekilir; eski firmaya ait ref seçimlerini temizle.
  const onFirmaChange = (v: number) => {
    setCompanyId(v)
    localStorage.setItem('og_company', String(v))
    const refNames = SECTIONS.flatMap((s) => s.fields).filter((f) => f.t === 'ref').map((f) => f.n)
    if (refNames.length) form.resetFields(refNames)
  }

  const onFinish = async (values: Record<string, unknown>) => {
    setSubmitting(true)
    try {
      if (mode === 'create') {
        const cfg = isSuper && companyId ? { headers: { 'x-company-id': String(companyId) } } : undefined
        const r = await axiosInstance.post('/api/operation-types', values, cfg)
        if (isSuper && companyId) localStorage.setItem('og_company', String(companyId))
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
    if (f.t === 'bool') return <Switch disabled={f.disabled} />
    if (f.t === 'number') return <InputNumber style={{ width: '100%' }} disabled={f.disabled} />
    if (f.t === 'select') return <Select options={f.opts} allowClear disabled={f.disabled} />
    // Ref alanı: "Veri Yok" durumunda dropdown'dan hızlı-ekle (formConfig'i olan kaynaklarda) — kayıt sonrası refetch + otomatik seç
    if (f.t === 'ref') return <QuickCreateSelect resource={f.ref!} options={refOpts[f.ref!] ?? []} onCreated={() => refetchRef(f.ref!)} placeholder="Seçiniz" disabled={f.disabled} />
    return <Input disabled={(mode === 'edit' && f.n === 'code') || !!f.disabled} />
  }

  // "Stok İşlemleri" parametreleri operasyon YÖNÜNE göre filtrelenir:
  //   Giriş → Aynı Palet / Aynı Seri / Pasif Ürün / Orijinal Miktar Güncelle
  //   Çıkış + Transfer → Palet Bozma / Parçalı Kullanım
  const INBOUND_PARAMS = new Set(['sameUsePallet', 'sameUseSerial', 'passiveProductUse', 'originalQtyUpdate'])
  const OUT_TRANSFER_PARAMS = new Set(['palletBreaking', 'partialUsage'])
  // İlgisiz parametreler GİZLENMEZ — sadece disabled (tıklanamaz) olur
  const sections = SECTIONS.map((sec) =>
    sec.title !== 'Stok İşlemleri'
      ? sec
      : {
          ...sec,
          fields: sec.fields.map((f) => ({
            ...f,
            disabled: INBOUND_PARAMS.has(f.n)
              ? direction !== 'INBOUND'
              : OUT_TRANSFER_PARAMS.has(f.n)
                ? !(direction === 'OUTBOUND' || direction === 'INTERNAL')
                : false,
          })),
        },
  )

  const defTab = (
    <Form form={form} layout="vertical" onFinish={onFinish} initialValues={{ direction: 'INBOUND', documentType: 'STOCK_MOVEMENT', affectsStock: true, isActive: true }}>
      {mode === 'create' && (
        <Alert type="info" showIcon style={{ marginBottom: 14 }} title="Önce tanımı kaydedin — ardından Statü, Lokasyon, Neden ve Palet Tipi sekmeleri açılır." />
      )}
      {sections.map((sec) => (
        <Card key={sec.title} className="og-section-card" size="small" title={sec.title}>
          <Row gutter={[18, 0]}>
            {sec.title === 'Genel' && (
              <Col xs={24} sm={12} lg={8}>
                <Form.Item label="Firma (tenant)" tooltip={isSuper && mode === 'create' ? 'Önce firma seçin — Tesis bu firmaya göre listelenir' : 'Kaydın ait olduğu firma'}>
                  {isSuper && mode === 'create'
                    ? <Select value={companyId ?? undefined} onChange={onFirmaChange} options={companies.map((c) => ({ value: c.id, label: `${c.code} — ${c.name}` }))} showSearch optionFilterProp="label" placeholder="Firma seçiniz" />
                    : <Input value={firmLabel} disabled />}
                </Form.Item>
              </Col>
            )}
            {sec.fields.map((f) =>
              f.t === 'bool' ? (
                <Col xs={24} sm={12} lg={8} key={f.n} style={{ marginBottom: 12 }}>
                  <div className="og-switchrow" style={f.disabled ? { opacity: 0.5 } : undefined}>
                    <span className="og-switchrow__label">{f.l}</span>
                    <Form.Item name={f.n} valuePropName="checked" noStyle><Switch disabled={f.disabled} /></Form.Item>
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
  // Alt-sekme kayıtları operasyon tipinin tesisini (facilityId) devralır — kullanıcı tekrar girmez
  const linkDefaults = opFacilityId ? { facilityId: opFacilityId } : undefined
  // Lokasyon alt-tab'ı operasyon YÖNÜNE göre: Çıkış=yalnız Kaynak, Giriş=yalnız Hedef, Transfer=ikisi (ilgisiz alanlar gizlenir)
  const SRC_LOC = new Set(['sourceLinkType', 'sourceLocationId', 'terminalFixSource'])
  const TGT_LOC = new Set(['targetLinkType', 'targetLocationId', 'terminalFixTarget'])
  // İlgisiz Kaynak/Hedef alanları GİZLENMEZ — disabled (tıklanamaz) olur
  const locationFields = LOCATION_FIELDS.map((f) => ({
    ...f,
    disabled: (SRC_LOC.has(f.name) && direction === 'INBOUND') || (TGT_LOC.has(f.name) && direction === 'OUTBOUND'),
  }))
  // Statü alt-tab'ı da yöne göre: Çıkış→Hedef Statü disabled, Giriş→Kaynak Statü disabled, Transfer→ikisi aktif
  const statusFields = STATUS_FIELDS.map((f) => ({
    ...f,
    disabled: (f.name === 'sourceStatusId' && direction === 'INBOUND') || (f.name === 'targetStatusId' && direction === 'OUTBOUND'),
  }))
  const items = [
    { key: 'def', label: 'Tanım', children: defTab },
    { key: 'status', label: 'Statü', disabled: !linkTabsEnabled, children: linkTabsEnabled ? <LinkTab ownerField="operationTypeId" ownerId={id!} resource="operation-type-statuses" fields={statusFields} defaults={linkDefaults} /> : null },
    { key: 'loc', label: 'Lokasyon', disabled: !linkTabsEnabled, children: linkTabsEnabled ? <LinkTab ownerField="operationTypeId" ownerId={id!} resource="operation-type-locations" fields={locationFields} defaults={linkDefaults} /> : null },
    { key: 'reason', label: 'Neden', disabled: !linkTabsEnabled, children: linkTabsEnabled ? <LinkTab ownerField="operationTypeId" ownerId={id!} resource="operation-type-reasons" fields={REASON_FIELDS} defaults={linkDefaults} /> : null },
    { key: 'pallet', label: 'Palet Tipi', disabled: !linkTabsEnabled, children: linkTabsEnabled ? <LinkTab ownerField="operationTypeId" ownerId={id!} resource="operation-type-pallet-types" fields={PALLET_FIELDS} defaults={linkDefaults} /> : null },
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
              <LinkTab ownerField="operationTypeId" ownerId={id!} resource={res} fields={flds} defaults={linkDefaults}
                extraActions={res === 'operation-tolerances' ? (row) => <Button size="small" type="link" onClick={() => navigate(`/operation-tolerances/${(row as { id: number }).id}/details`)}>Birim Detayı →</Button> : undefined} />
            </div>
          ))}
        </Space>
      ) : null,
    },
  ]

  return (
    <div className="og-page" style={{ maxWidth: 1040 }}>
      <PageHeader
        title={`Operasyon Tipi — ${mode === 'create' ? (copyFrom ? 'Kopyala' : 'Yeni') : 'Düzenle'}`}
        subtitle={copyFrom ? `#${copyFrom} operasyonundan kopyalandı — yeni bir kod girip kaydedin (bağlantılar kopyalanmaz)` : 'Operasyon tanımı işin kalbi — tek ekranda tanım + statü/lokasyon/neden/palet tipi'}
        extra={<Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/operation-types')}>Liste</Button>}
      />
      <Tabs activeKey={tab} onChange={setTab} items={items} />
    </div>
  )
}
