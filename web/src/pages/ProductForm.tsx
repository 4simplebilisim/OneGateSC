import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { App, Alert, Button, Card, Col, Divider, Drawer, Form, Input, InputNumber, Row, Select, Space, Switch, Table, Tabs, Typography } from 'antd'
import { ArrowLeftOutlined, SaveOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons'
import { axiosInstance } from '../providers/dataProvider'
import { PageHeader } from '../components/PageHeader'
import { LinkTab, type LF } from '../components/LinkTab'

// Sadece tablo için gösterilecek kolonlar (ekle formu da bunları kullanır)
// Barkod yok — barkodlar ölçü birimine bağlı ÇOKLU, Düzenle drawer'ında yönetilir
const UNIT_FIELDS: LF[] = [
  { name: 'unitId', label: 'Birim', type: 'ref', ref: 'units', required: true },
  { name: 'isBaseUnit', label: 'Ana Birim', type: 'bool' },
  { name: 'multiplier', label: 'Çarpan', type: 'number' },
  { name: 'divisor', label: 'Bölen', type: 'number' },
  { name: 'batchTracking', label: 'Batch', type: 'bool' },
  { name: 'serialTracking', label: 'Seri', type: 'bool' },
]

const EKGRUP_FIELDS: LF[] = [
  { name: 'groupId', label: 'Grup', type: 'ref', ref: 'product-groups', required: true },
  { name: 'sortOrder', label: 'Sıra', type: 'number' },
]

const MUADIL_FIELDS: LF[] = [
  { name: 'substituteProductId', label: 'Muadil Ürün', type: 'ref', ref: 'products', required: true },
]

const GUVENLI_ST_FIELDS: LF[] = [
  { name: 'warehouseId', label: 'Depo', type: 'ref', ref: 'warehouses', required: true },
  { name: 'minQty', label: 'Min. Miktar', type: 'number' },
  { name: 'maxQty', label: 'Max. Miktar', type: 'number' },
  { name: 'reorderPoint', label: 'Sipariş Noktası', type: 'number' },
  { name: 'reorderQty', label: 'Sipariş Miktarı', type: 'number' },
  { name: 'isActive', label: 'Aktif', type: 'bool' },
]

type Opt = { value: number; label: string }

function useOpts(path: string, companyId?: number | null) {
  const [opts, setOpts] = useState<Opt[]>([])
  useEffect(() => {
    const params: Record<string, unknown> = { pageSize: 300 }
    if (companyId) params.companyId = companyId // ref'ler seçili firmaya scoped (super-admin liste tüm firmalar olsa da)
    axiosInstance.get(`/api/${path}`, { params }).then((r) => {
      const list = Array.isArray(r.data) ? r.data : (r.data.data ?? [])
      setOpts(list.map((x: Record<string, unknown>) => ({ value: x.id as number, label: `${x.code ?? x.id}${x.name ? ' — ' + x.name : ''}` })))
    })
  }, [path, companyId])
  return opts
}

// ── Ölçü birimine bağlı ÇOKLU barkod (tek kaynak: TBLPRODUCTUNITBARCODE) ────
interface UBarcode { id: number; barcode: string; labelAddress?: string | null }
function UnitBarcodes({ unitId }: { unitId: number }) {
  const { message } = App.useApp()
  const [rows, setRows] = useState<UBarcode[]>([])
  const [val, setVal] = useState('')
  const [loading, setLoading] = useState(true)

  const load = useCallback(() => {
    setLoading(true)
    axiosInstance.get(`/api/product-units/${unitId}/barcodes`)
      .then((r) => setRows(r.data))
      .finally(() => setLoading(false))
  }, [unitId])
  useEffect(load, [load])

  const add = async () => {
    if (!val.trim()) return
    try {
      await axiosInstance.post(`/api/product-units/${unitId}/barcodes`, { barcode: val.trim() })
      setVal(''); message.success('Barkod eklendi'); load()
    } catch (e) {
      message.error((e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Eklenemedi')
    }
  }
  const remove = async (bid: number) => {
    try { await axiosInstance.delete(`/api/product-units/${unitId}/barcodes/${bid}`); message.success('Silindi'); load() }
    catch { message.error('Silinemedi') }
  }

  return (
    <>
      <Space.Compact style={{ width: '100%', maxWidth: 360, marginBottom: 12 }}>
        <Input placeholder="Yeni barkod" value={val} onChange={(e) => setVal(e.target.value)} onPressEnter={add} />
        <Button type="primary" icon={<PlusOutlined />} onClick={add}>Ekle</Button>
      </Space.Compact>
      <Table<UBarcode>
        dataSource={rows} rowKey="id" size="small" loading={loading} pagination={false}
        locale={{ emptyText: 'Henüz barkod yok' }}
        columns={[
          { title: 'Barkod', dataIndex: 'barcode' },
          { title: 'Etiket Adresi', dataIndex: 'labelAddress', render: (v) => v ?? '—' },
          { title: '', key: 'x', width: 60, render: (_, row) => <Typography.Link type="danger" onClick={() => remove(row.id)}>Sil</Typography.Link> },
        ]}
      />
    </>
  )
}

// ── Ölçü Birimi tam-alan drawer ────────────────────────────────────────────
function ProductUnitDrawer({
  unitRow,
  units,
  onClose,
  onSaved,
}: {
  unitRow: Record<string, unknown> | null
  units: Opt[]
  onClose: () => void
  onSaved: () => void
}) {
  const { message, modal } = App.useApp()
  const [form] = Form.useForm()
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (unitRow) form.setFieldsValue(unitRow)
    else form.resetFields()
  }, [unitRow, form])

  const save = async (vals: Record<string, unknown>) => {
    if (!unitRow) return
    // Ana birim DEĞİŞİMİ (bu birim ana değilken ana yapılıyorsa) → onay sor (backend stok/belge varsa zaten engeller)
    if (vals.isBaseUnit && !unitRow.isBaseUnit) {
      const proceed = await new Promise<boolean>((resolve) => {
        modal.confirm({
          title: 'Onay gerekiyor',
          content: 'Bu ürünün zaten bir ana birimi var. Ana birimi bununla değiştirmek istediğinize emin misiniz? (Stok/belge hareketi varsa değiştirilemez.)',
          okText: 'Evet, değiştir',
          cancelText: 'Vazgeç',
          onOk: () => resolve(true),
          onCancel: () => resolve(false),
        })
      })
      if (!proceed) return
    }
    setSaving(true)
    try {
      await axiosInstance.patch(`/api/product-units/${unitRow.id}`, vals)
      message.success('Kaydedildi')
      onSaved()
    } catch (e) {
      message.error((e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Hata')
    } finally { setSaving(false) }
  }

  return (
    <Drawer
      title={`Ölçü Birimi — ${(unitRow?.unit as { code?: string })?.code ?? ''}`}
      open
      onClose={onClose}
      size="large"
      extra={<Button type="primary" icon={<SaveOutlined />} loading={saving} onClick={() => form.submit()}>Kaydet</Button>}
    >
      <Form form={form} layout="vertical" onFinish={save}>
        <Row gutter={[16, 0]}>
          {/* Sol kolon */}
          <Col xs={24} sm={12}>
            <Form.Item name="unitId" label="Birim" rules={[{ required: true, message: 'Zorunlu' }]}>
              <Select options={units} showSearch optionFilterProp="label" placeholder="Seçiniz" disabled />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <div className="og-switchrow" style={{ marginTop: 30 }}>
              <span className="og-switchrow__label">Ana Birim</span>
              <Form.Item name="isBaseUnit" valuePropName="checked" noStyle><Switch /></Form.Item>
            </div>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item name="multiplier" label="Çarpan">
              <InputNumber style={{ width: '100%' }} min={0} />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item name="divisor" label="Bölen">
              <InputNumber style={{ width: '100%' }} min={0} />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item name="width" label="En">
              <InputNumber style={{ width: '100%' }} min={0} />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item name="length" label="Boy">
              <InputNumber style={{ width: '100%' }} min={0} />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item name="height" label="Yükseklik">
              <InputNumber style={{ width: '100%' }} min={0} />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item name="area" label="Alan">
              <InputNumber style={{ width: '100%' }} min={0} />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item name="volume" label="Hacim">
              <InputNumber style={{ width: '100%' }} min={0} />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item name="minPalletQty" label="Min. Palet Miktarı">
              <InputNumber style={{ width: '100%' }} min={0} />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item name="maxPalletQty" label="Max. Palet Miktarı">
              <InputNumber style={{ width: '100%' }} min={0} />
            </Form.Item>
          </Col>

          {/* Sağ kolon — ağırlık */}
          <Col xs={24} sm={12}>
            <Form.Item name="netWeight" label="Net Ağırlık">
              <InputNumber style={{ width: '100%' }} min={0} />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item name="grossWeight" label="Brüt Ağırlık">
              <InputNumber style={{ width: '100%' }} min={0} />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item name="weightUnitId" label="Ağırlık Birimi">
              <Select options={units} showSearch optionFilterProp="label" allowClear placeholder="Seçiniz" />
            </Form.Item>
          </Col>

          {/* Toggle'lar */}
          <Col xs={24} sm={8}>
            <div className="og-switchrow" style={{ marginTop: 4 }}>
              <span className="og-switchrow__label">Batch İzleme</span>
              <Form.Item name="batchTracking" valuePropName="checked" noStyle><Switch /></Form.Item>
            </div>
          </Col>
          <Col xs={24} sm={8}>
            <div className="og-switchrow" style={{ marginTop: 4 }}>
              <span className="og-switchrow__label">Seri İzleme</span>
              <Form.Item name="serialTracking" valuePropName="checked" noStyle><Switch /></Form.Item>
            </div>
          </Col>
          <Col xs={24} sm={8}>
            <div className="og-switchrow" style={{ marginTop: 4 }}>
              <span className="og-switchrow__label">Satış Birimi</span>
              <Form.Item name="isSalesUnit" valuePropName="checked" noStyle><Switch /></Form.Item>
            </div>
          </Col>
        </Row>
      </Form>

      <Divider titlePlacement="left" style={{ marginTop: 8 }}>Barkodlar</Divider>
      {unitRow?.id ? <UnitBarcodes unitId={unitRow.id as number} /> : null}
    </Drawer>
  )
}

// ── Ana bileşen ────────────────────────────────────────────────────────────
export const ProductForm = ({ mode }: { mode: 'create' | 'edit' }) => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { message } = App.useApp()
  const [form] = Form.useForm()
  const [submitting, setSubmitting] = useState(false)
  const [tab, setTab] = useState('def')
  const [editUnit, setEditUnit] = useState<Record<string, unknown> | null>(null)
  const [unitKey, setUnitKey] = useState(0)

  // Firma (tenant) — ürün hangi firmaya ait: edit'te üründen, create'te seçili firmadan (og_company)
  // Super-admin yeni üründe firmayı KARTTAN seçebilir; normal admin tek firmasına kilitli (salt-okunur).
  const isSuper = (() => { try { return !!JSON.parse(localStorage.getItem('og_user') ?? 'null')?.isSuperAdmin } catch { return false } })()
  const [companies, setCompanies] = useState<{ id: number; code: string; name: string }[]>([])
  const [companyId, setCompanyId] = useState<number | null>(Number(localStorage.getItem('og_company')) || null)

  // Ref'ler SEÇİLİ FİRMAYA göre — firma değişince hepsi yeniden çekilir (liste tüm firmalar; formda seçili firma)
  const units = useOpts('units', companyId)
  const productGroups = useOpts('product-groups', companyId)
  const productSubGroups = useOpts('product-subgroups', companyId)
  const productTypes = useOpts('product-types', companyId)
  const productDetailTypes = useOpts('product-detail-types', companyId)
  const facilities = useOpts('facilities', companyId)
  useEffect(() => {
    axiosInstance.get('/api/companies').then((r) => setCompanies((Array.isArray(r.data) ? r.data : (r.data.data ?? [])) as { id: number; code: string; name: string }[])).catch(() => { /* boş */ })
  }, [])
  const firmLabel = (() => { const c = companies.find((x) => x.id === companyId); return c ? `${c.code} — ${c.name}` : (companyId ? `#${companyId}` : '—') })()

  useEffect(() => {
    if (mode === 'edit' && id) axiosInstance.get(`/api/products/${id}`).then((r) => {
      // facilities: [{facilityId}] → çoklu-seçim için id dizisi
      form.setFieldsValue({ ...r.data, facilities: (r.data.facilities ?? []).map((f: { facilityId: number }) => f.facilityId) })
      if (r.data.companyId) setCompanyId(r.data.companyId)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, id])

  const onFinish = async (values: Record<string, unknown>) => {
    setSubmitting(true)
    try {
      if (mode === 'create') {
        // Super-admin kartta firma seçtiyse o firmaya kaydet (x-company-id override).
        const cfg = isSuper && companyId ? { headers: { 'x-company-id': String(companyId) } } : undefined
        const r = await axiosInstance.post('/api/products', values, cfg)
        // Düzenle ekranı + alt sekmeler (ölçü birimi/ek grup) global og_company üstünden çalışır;
        // seçilen firmaya hizala ki ürünün devamı doğru tenant'ta yönetilsin.
        if (isSuper && companyId) localStorage.setItem('og_company', String(companyId))
        message.success('Ürün kaydedildi — şimdi ölçü birimleri ve ek gruplar eklenebilir')
        navigate(`/products/${r.data.id}/edit`)
      } else {
        const { code: _c, ...rest } = values
        await axiosInstance.patch(`/api/products/${id}`, rest)
        message.success('Güncellendi')
      }
    } catch (e) {
      message.error((e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'İşlem başarısız')
    } finally { setSubmitting(false) }
  }

  const defTab = (
    <Form form={form} layout="vertical" onFinish={onFinish} initialValues={{ isActive: true, usageScope: 'BOTH' }}>
      {mode === 'create' && (
        <Alert type="info" showIcon style={{ marginBottom: 14 }} title="Önce ürünü kaydedin — ardından Ölçü Birimleri ve Ek Gruplar sekmeleri açılır." />
      )}
      <Card className="og-section-card" size="small" title="Ürün Tanımı">
        <Row gutter={[20, 0]}>
          {/* Firma + Tesisler EN ÜSTTE — önce bunlar seçilir, diğer alanlar (grup/tip) seçilen firmaya göre gelir */}
          <Col xs={24} sm={8}><Form.Item label="Firma (tenant)" tooltip={isSuper && mode === 'create' ? 'Önce firmayı seçin — grup/tip/birim o firmaya göre listelenir' : 'Ürünün ait olduğu firma'}>
            {isSuper && mode === 'create'
              ? <Select value={companyId ?? undefined} onChange={(v) => { setCompanyId(v); form.resetFields(['productGroupId', 'productSubGroupId', 'productTypeId', 'detailTypeId', 'facilities']) }} options={companies.map((c) => ({ value: c.id, label: `${c.code} — ${c.name}` }))} showSearch optionFilterProp="label" placeholder="Firma seçiniz" />
              : <Input value={firmLabel} disabled />}
          </Form.Item></Col>
          <Col xs={24} sm={16}><Form.Item name="facilities" label="Kullanılabilir Tesisler (boş = tüm tesisler)"><Select mode="multiple" options={facilities} showSearch optionFilterProp="label" allowClear placeholder="Boş bırakılırsa ürün tüm tesislerde kullanılabilir" /></Form.Item></Col>
          <Col xs={24} sm={8}><Form.Item name="code" label="Ürün Kodu" rules={[{ required: true, message: 'Zorunlu' }]}><Input disabled={mode === 'edit'} /></Form.Item></Col>
          <Col xs={24} sm={10}><Form.Item name="name" label="Tanım" rules={[{ required: true, message: 'Zorunlu' }]}><Input /></Form.Item></Col>
          <Col xs={24} sm={6}><Form.Item name="shortName" label="Kısa Ad"><Input maxLength={50} /></Form.Item></Col>
          <Col xs={24} sm={8}><Form.Item name="productGroupId" label="Ürün Grubu"><Select options={productGroups} showSearch optionFilterProp="label" allowClear placeholder="Seçiniz" /></Form.Item></Col>
          <Col xs={24} sm={8}><Form.Item name="productSubGroupId" label="Ürün Alt-Grubu"><Select options={productSubGroups} showSearch optionFilterProp="label" allowClear placeholder="Seçiniz" /></Form.Item></Col>
          <Col xs={24} sm={8}><Form.Item name="productTypeId" label="Ürün Tipi"><Select options={productTypes} showSearch optionFilterProp="label" allowClear placeholder="Seçiniz" /></Form.Item></Col>
          <Col xs={24} sm={8}><Form.Item name="detailTypeId" label="Detay Tipi"><Select options={productDetailTypes} showSearch optionFilterProp="label" allowClear placeholder="Seçiniz" /></Form.Item></Col>
          <Col xs={24} sm={8}>
            <Form.Item
              name="usageScope"
              label="Kullanım Alanı"
              tooltip="Ürün hangi platformlarda kullanılabilir? Her ikisi seçiliyse tüm ürünlerde görünür; tek platform seçilirse yalnız orada listelenir."
            >
              <Select
                placeholder="Her ikisi"
                options={[
                  { value: 'BOTH', label: 'Her ikisi (WMS + Procurement)' },
                  { value: 'WMS', label: 'Yalnız WMS' },
                  { value: 'PROC', label: 'Yalnız Procurement' },
                ]}
              />
            </Form.Item>
          </Col>
          <Col xs={24} sm={8}>
            <div className="og-switchrow" style={{ marginTop: 30 }}>
              <span className="og-switchrow__label">Aktif</span>
              <Form.Item name="isActive" valuePropName="checked" noStyle><Switch /></Form.Item>
            </div>
          </Col>
        </Row>
      </Card>
      <Card className="og-section-card" size="small" title="Raf Ömrü & Ağırlık" style={{ marginTop: 14 }}>
        <Row gutter={[20, 0]}>
          <Col xs={24} sm={8}><Form.Item name="shelfLifeDays" label="Raf Ömrü (gün)" tooltip="Opsiyonel. Girilirse mal kabulde SKT = giriş tarihi + bu gün sayısı; boş bırakılırsa raf ömrü takip edilmez."><InputNumber style={{ width: '100%' }} min={0} placeholder="Opsiyonel" /></Form.Item></Col>
          <Col xs={24} sm={8}>
            <div className="og-switchrow" style={{ marginTop: 30 }}>
              <span className="og-switchrow__label">Değişken Ağırlık (catch-weight)</span>
              <Form.Item name="catchWeight" valuePropName="checked" noStyle><Switch /></Form.Item>
            </div>
          </Col>
          <Col xs={24} sm={8}><Form.Item name="minWeight" label="Min. Ağırlık"><InputNumber style={{ width: '100%' }} min={0} /></Form.Item></Col>
          <Col xs={24} sm={8}><Form.Item name="maxWeight" label="Max. Ağırlık"><InputNumber style={{ width: '100%' }} min={0} /></Form.Item></Col>
        </Row>
      </Card>
      <div className="og-formbar">
        <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={submitting}>{mode === 'create' ? 'Kaydet ve Devam Et' : 'Kaydet'}</Button>
        <Button onClick={() => navigate('/products')}>İptal</Button>
      </div>
    </Form>
  )

  const enabled = mode === 'edit' && !!id
  const items = [
    { key: 'def', label: 'Tanım', children: defTab },
    {
      key: 'units', label: 'Ölçü Birimleri', disabled: !enabled,
      children: enabled ? (
        <LinkTab
          key={unitKey}
          ownerField="productId"
          ownerId={id!}
          resource="product-units"
          fields={UNIT_FIELDS}
          confirmOn={(vals, rows) => (vals.isBaseUnit && rows.some((r) => r.isBaseUnit) ? 'Bu ürünün zaten bir ana birimi var. Ana birimi bununla değiştirmek istediğinize emin misiniz? (Stok/belge hareketi varsa değiştirilemez.)' : null)}
          extraActions={(row) => (
            <Button size="small" type="text" icon={<EditOutlined />} onClick={() => setEditUnit(row)}>Düzenle</Button>
          )}
        />
      ) : null,
    },
    { key: 'ekgrup', label: 'Ek Gruplar', disabled: !enabled, children: enabled ? <LinkTab ownerField="productId" ownerId={id!} resource="product-additional-groups" fields={EKGRUP_FIELDS} /> : null },
    { key: 'muadil', label: 'Muadil', disabled: !enabled, children: enabled ? <LinkTab ownerField="productId" ownerId={id!} resource="product-substitutes" fields={MUADIL_FIELDS} /> : null },
    { key: 'guvenli', label: 'Güvenli St.', disabled: !enabled, children: enabled ? <LinkTab ownerField="productId" ownerId={id!} resource="inventory-rules" fields={GUVENLI_ST_FIELDS} /> : null },
  ]

  return (
    <div className="og-page" style={{ maxWidth: 1040 }}>
      <PageHeader
        title={`Ürün — ${mode === 'create' ? 'Yeni' : 'Düzenle'}`}
        subtitle="Tek ekranda ürün + ölçü birimleri (barkodlar) + ek gruplar"
        extra={<Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/products')}>Liste</Button>}
      />
      <Tabs activeKey={tab} onChange={setTab} items={items} />
      {editUnit && (
        <ProductUnitDrawer
          unitRow={editUnit}
          units={units}
          onClose={() => setEditUnit(null)}
          onSaved={() => { setEditUnit(null); setUnitKey((k) => k + 1) }}
        />
      )}
    </div>
  )
}
