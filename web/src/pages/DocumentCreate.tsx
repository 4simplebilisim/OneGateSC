import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { App, Button, Card, Form, Input, InputNumber, Select, Space, Tag, Typography, Alert } from 'antd'
import { ArrowLeftOutlined, SaveOutlined, PlusOutlined, DeleteOutlined } from '@ant-design/icons'
import { axiosInstance } from '../providers/dataProvider'
import { PageHeader } from '../components/PageHeader'

type Opt = { value: number; label: string }
type Company = { id: number; code: string; name: string }
const arr = (d: unknown) => (Array.isArray(d) ? d : ((d as { data?: unknown[] })?.data ?? []))

// Belge oluşturma — kanonik sıra: Firma › Tesis › Operasyon (depo YOK; belge tesise/operasyona bağlı, stok satır lokasyonlarından)
export const DocumentCreate = () => {
  const navigate = useNavigate()
  const { message } = App.useApp()
  const [form] = Form.useForm()
  const [searchParams] = useSearchParams()
  const lineVals = Form.useWatch('lines', form) as ({ productId?: number } | undefined)[] | undefined

  // Firma (tenant): super-admin seçer, normal kullanıcıda kilitli (kendi firması)
  const isSuper = (() => { try { return !!JSON.parse(localStorage.getItem('og_user') ?? 'null')?.isSuperAdmin } catch { return false } })()
  const [companyId, setCompanyId] = useState<number | null>(Number(localStorage.getItem('og_company')) || null)
  const [companies, setCompanies] = useState<Company[]>([])
  const firmLabel = (() => { const c = companies.find((x) => x.id === companyId); return c ? `${c.code} — ${c.name}` : (companyId ? `#${companyId}` : '—') })()

  const [facilityId, setFacilityId] = useState<number>() // Tesis — operasyonları + lokasyonları süzer
  const [facilities, setFacilities] = useState<Opt[]>([])
  const [ops, setOps] = useState<(Opt & { direction: string; facilityId: number | null })[]>([])
  const [partners, setPartners] = useState<Opt[]>([])
  const [products, setProducts] = useState<Opt[]>([])
  const [productUnits, setProductUnits] = useState<Record<number, (Opt & { isBase?: boolean })[]>>({})
  const [locations, setLocations] = useState<Opt[]>([]) // seçili tesisin lokasyonları
  const [suggest, setSuggest] = useState<Record<number, { id: number; code: string }[]>>({}) // directed putaway
  const [submitting, setSubmitting] = useState(false)

  // Yön bağlamı: giriş/çıkış/transfer listesinden ?direction ile gelir → operasyonları yöne göre süz + iptal'de doğru listeye dön
  const direction = searchParams.get('direction') || undefined
  const backTo = direction === 'INBOUND' ? '/documents-in' : direction === 'OUTBOUND' ? '/documents-out' : direction === 'INTERNAL' ? '/documents-tr' : '/documents'

  // Firma listesi (bir kez) — firma adı/seçimi için
  useEffect(() => { axiosInstance.get('/api/companies').then((r) => setCompanies(arr(r.data) as Company[])).catch(() => { /* tek firma */ }) }, [])

  // Firma bağlamına göre kaynaklar (super-admin firma değiştirince yeniden çekilir; header x-company-id og_company'den)
  useEffect(() => {
    axiosInstance.get('/api/operation-types', { params: { pageSize: 300 } }).then((r) =>
      setOps((arr(r.data) as Record<string, unknown>[]).map((x) => ({ value: x.id as number, label: `${x.code}${x.name ? ' — ' + x.name : ''}`, direction: x.direction as string, facilityId: (x.facilityId as number) ?? null }))))
    axiosInstance.get('/api/facilities', { params: { pageSize: 300 } }).then((r) =>
      setFacilities((arr(r.data) as Record<string, unknown>[]).map((x) => ({ value: x.id as number, label: `${x.code}${x.name ? ' — ' + x.name : ''}` }))))
    axiosInstance.get('/api/products', { params: { pageSize: 300 } }).then((r) =>
      setProducts((arr(r.data) as Record<string, unknown>[]).map((x) => ({ value: x.id as number, label: `${x.code} — ${x.name}` }))))
    axiosInstance.get('/api/partners', { params: { pageSize: 300 } }).then((r) =>
      setPartners((arr(r.data) as Record<string, unknown>[]).map((x) => ({ value: x.id as number, label: `${x.code}${x.name ? ' — ' + x.name : ''}` }))))
  }, [companyId])

  // Tesis değişince lokasyonlar o tesise göre yüklenir (depoya değil — tesisin tüm depolarındaki lokasyonlar)
  useEffect(() => {
    if (!facilityId) { setLocations([]); return }
    axiosInstance.get('/api/locations', { params: { facilityId, pageSize: 500 } }).then((r) =>
      setLocations((arr(r.data) as { id: number; code: string }[]).map((x) => ({ value: x.id, label: x.code }))))
  }, [facilityId])

  // Operasyonlar: seçili tesise ait (veya tesis-bağımsız) + yöne göre
  const visibleOps = ops.filter((o) => (o.facilityId == null || o.facilityId === facilityId) && (!direction || o.direction === direction))

  const onFirmaChange = (v: number) => {
    setCompanyId(v)
    localStorage.setItem('og_company', String(v)) // global tenant bağlamı (dataProvider header'ı) hizalanır
    setFacilityId(undefined)
    form.resetFields(['operationTypeId', 'partnerId'])
  }
  const onFacilityChange = (v?: number) => {
    setFacilityId(v)
    form.setFieldValue('operationTypeId', undefined) // operasyonlar tesise bağlı → sıfırla
  }

  // Seçilen ürünün ölçü birimleri (TBLPRODUCTUNIT) — yalnız o ürüne tanımlı olanlar
  const loadProductUnits = async (productId: number) => {
    if (productUnits[productId]) return productUnits[productId]
    const r = await axiosInstance.get('/api/product-units', { params: { productId } })
    const rows = arr(r.data) as { unitId: number; isBaseUnit: boolean; unit?: { code?: string } }[]
    const opts = rows.map((pu) => ({ value: pu.unitId, label: pu.unit?.code ?? `#${pu.unitId}`, isBase: pu.isBaseUnit }))
    setProductUnits((prev) => ({ ...prev, [productId]: opts }))
    return opts
  }

  const fetchSuggest = (productId?: number) => {
    if (!productId || suggest[productId]) return
    axiosInstance.get('/api/routing-rules/suggest', { params: { productId } }).then((r) => {
      setSuggest((prev) => ({ ...prev, [productId]: (r.data ?? []).map((l: { id: number; code: string }) => ({ id: l.id, code: l.code })) }))
    })
  }

  const onFinish = async (values: Record<string, unknown>) => {
    setSubmitting(true)
    try {
      // warehouseId GÖNDERİLMEZ — belge tesise/operasyona bağlı (backend operationType.facilityId'den türetir)
      const res = await axiosInstance.post('/api/documents', values)
      const auto = res.data?.autoRoutedLines ?? 0
      message.success(auto > 0 ? `Belge oluşturuldu — ${auto} satır otomatik yönlendirildi` : 'Belge oluşturuldu')
      navigate(backTo)
    } catch (e) {
      message.error((e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'İşlem başarısız')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="og-page" style={{ maxWidth: 1100 }}>
      <PageHeader
        title="Belge — Yeni"
        subtitle="Firma › Tesis › Operasyon seçin, satırları girin — giriş belgelerinde hedef lokasyon otomatik yönlendirilebilir"
        extra={<Button icon={<ArrowLeftOutlined />} onClick={() => navigate(backTo)}>Liste</Button>}
      />
      <Form form={form} layout="vertical" onFinish={onFinish} initialValues={{ lines: [{}] }}>
        <Card className="og-section-card" size="small" title="Başlık">
          <Space wrap align="start" size={[16, 0]}>
            {isSuper ? (
              <Form.Item label="Firma" required>
                <Select style={{ minWidth: 200 }} showSearch optionFilterProp="label" placeholder="Firma" value={companyId ?? undefined}
                  options={companies.map((c) => ({ value: c.id, label: `${c.code} — ${c.name}` }))} onChange={onFirmaChange} />
              </Form.Item>
            ) : (
              <Form.Item label="Firma"><Input value={firmLabel} disabled style={{ width: 200 }} /></Form.Item>
            )}
            <Form.Item label="Tesis" required tooltip="Operasyon ve lokasyonlar seçili tesise göre süzülür">
              <Select style={{ minWidth: 180 }} options={facilities} showSearch optionFilterProp="label" placeholder="Tesis seçin"
                value={facilityId} onChange={onFacilityChange} />
            </Form.Item>
            <Form.Item name="operationTypeId" label="Operasyon" rules={[{ required: true, message: 'Zorunlu' }]}>
              <Select style={{ minWidth: 200 }} options={visibleOps} showSearch optionFilterProp="label"
                placeholder={facilityId ? 'Operasyon' : 'Önce tesis'} disabled={!facilityId} />
            </Form.Item>
            <Form.Item name="documentNo" label="Belge No (boş = otomatik)">
              <Input placeholder="otomatik" style={{ width: 150 }} />
            </Form.Item>
            <Form.Item name="partnerId" label="Cari">
              <Select style={{ minWidth: 200 }} options={partners} showSearch optionFilterProp="label" placeholder="Cari (opsiyonel)" allowClear />
            </Form.Item>
          </Space>
        </Card>

        <Card className="og-section-card" size="small" title="Satırlar">
          <Alert
            type="info"
            showIcon
            style={{ marginBottom: 12 }}
            title="Mal kabulde (giriş) hedef lokasyon boş bırakılırsa yönlendirme kuralından otomatik atanır — öneri satır altında gösterilir."
          />
          <Form.List name="lines">
            {(rows, { add, remove }) => (
              <>
                {rows.map(({ key, name }, idx) => (
                  <div key={key} className="og-linecard">
                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, flexWrap: 'wrap' }}>
                      <span className="og-linecard__no" style={{ alignSelf: 'center' }}>#{idx + 1}</span>
                      <Form.Item name={[name, 'productId']} label="Ürün" rules={[{ required: true, message: '!' }]} style={{ marginBottom: 0 }}>
                        <Select style={{ minWidth: 220 }} options={products} showSearch optionFilterProp="label" placeholder="Ürün"
                          onChange={async (v) => {
                            fetchSuggest(v as number)
                            const opts = await loadProductUnits(v as number)
                            const base = opts.find((u) => u.isBase) ?? opts[0]
                            form.setFieldValue(['lines', name, 'unitId'], base?.value) // ürünün ana birimi otomatik gelir
                          }} />
                      </Form.Item>
                      <Form.Item name={[name, 'unitId']} label="Birim" rules={[{ required: true, message: '!' }]} style={{ marginBottom: 0 }}>
                        <Select style={{ width: 120 }} options={productUnits[lineVals?.[name]?.productId as number] ?? []} showSearch optionFilterProp="label"
                          placeholder={lineVals?.[name]?.productId ? 'Birim' : 'Önce ürün'} disabled={!lineVals?.[name]?.productId} />
                      </Form.Item>
                      <Form.Item name={[name, 'quantity']} label="Miktar" rules={[{ required: true, message: '!' }]} style={{ marginBottom: 0 }}>
                        <InputNumber style={{ width: 100 }} placeholder="Miktar" min={0} />
                      </Form.Item>
                      <Form.Item name={[name, 'targetLocationId']} label="Hedef lok." style={{ marginBottom: 0 }}>
                        <Select style={{ width: 130 }} options={locations} showSearch optionFilterProp="label" placeholder={facilityId ? 'Otomatik' : 'Önce tesis'} allowClear disabled={!facilityId} />
                      </Form.Item>
                      <Form.Item name={[name, 'batchNo']} label="Parti" style={{ marginBottom: 0 }}>
                        <Input style={{ width: 120 }} placeholder="Parti (lot)" />
                      </Form.Item>
                      <Form.Item name={[name, 'serialNo']} label="Seri" style={{ marginBottom: 0 }}>
                        <Input style={{ width: 110 }} placeholder="Seri" />
                      </Form.Item>
                      <Button danger type="text" icon={<DeleteOutlined />} onClick={() => remove(name)} />
                    </div>
                    {/* Öneri önizleme */}
                    <Form.Item noStyle shouldUpdate>
                      {() => {
                        const pid = form.getFieldValue(['lines', name, 'productId']) as number | undefined
                        const sug = pid ? suggest[pid] : undefined
                        if (!sug?.length) return null
                        return (
                          <div style={{ marginLeft: 34, marginTop: 8 }}>
                            <Tag color="cyan">Öneri: {sug.map((s) => s.code).join(', ')}</Tag>
                            <Typography.Link onClick={() => form.setFieldValue(['lines', name, 'targetLocationId'], sug[0]!.id)}>
                              İlk öneriyi uygula ({sug[0]!.code})
                            </Typography.Link>
                          </div>
                        )
                      }}
                    </Form.Item>
                  </div>
                ))}
                <Button onClick={() => add()} type="dashed" icon={<PlusOutlined />} block style={{ marginTop: 4 }}>Satır Ekle</Button>
              </>
            )}
          </Form.List>
        </Card>

        <div className="og-formbar">
          <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={submitting}>Kaydet</Button>
          <Button onClick={() => navigate(backTo)}>İptal</Button>
        </div>
      </Form>
    </div>
  )
}
