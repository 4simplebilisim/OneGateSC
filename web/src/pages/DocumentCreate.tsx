import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { App, Button, Card, Form, Input, InputNumber, Select, Space, Tag, Typography, Alert } from 'antd'
import { ArrowLeftOutlined, SaveOutlined, PlusOutlined, DeleteOutlined } from '@ant-design/icons'
import { axiosInstance } from '../providers/dataProvider'
import { PageHeader } from '../components/PageHeader'

type Opt = { value: number; label: string }

export const DocumentCreate = () => {
  const navigate = useNavigate()
  const { message } = App.useApp()
  const [form] = Form.useForm()
  const [ops, setOps] = useState<Opt[]>([])
  const [warehouses, setWarehouses] = useState<Opt[]>([])
  const [products, setProducts] = useState<Opt[]>([])
  const [units, setUnits] = useState<Opt[]>([])
  const [locations, setLocations] = useState<Opt[]>([])
  // ürün → önerilen lokasyonlar (directed putaway)
  const [suggest, setSuggest] = useState<Record<number, { id: number; code: string }[]>>({})
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    const load = (url: string, label: (x: Record<string, unknown>) => string) =>
      axiosInstance.get(url, { params: { pageSize: 300 } }).then((r) => {
        const rows = Array.isArray(r.data) ? r.data : (r.data.data ?? [])
        return rows.map((x: Record<string, unknown>) => ({ value: x.id as number, label: label(x) }))
      })
    load('/api/operation-types', (x) => `${x.code} · ${x.direction}`).then(setOps)
    load('/api/warehouses', (x) => `${x.code} — ${x.name}`).then(setWarehouses)
    load('/api/products', (x) => `${x.code} — ${x.name}`).then(setProducts)
    load('/api/units', (x) => `${x.code}`).then(setUnits)
    load('/api/locations', (x) => `${x.code}`).then(setLocations)
  }, [])

  const fetchSuggest = (productId?: number) => {
    if (!productId || suggest[productId]) return
    axiosInstance.get('/api/routing-rules/suggest', { params: { productId } }).then((r) => {
      setSuggest((prev) => ({ ...prev, [productId]: (r.data ?? []).map((l: { id: number; code: string }) => ({ id: l.id, code: l.code })) }))
    })
  }

  const onFinish = async (values: Record<string, unknown>) => {
    setSubmitting(true)
    try {
      const res = await axiosInstance.post('/api/documents', values)
      const auto = res.data?.autoRoutedLines ?? 0
      message.success(auto > 0 ? `Belge oluşturuldu — ${auto} satır otomatik yönlendirildi` : 'Belge oluşturuldu')
      navigate('/documents')
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
        subtitle="Operasyon + depo seçin, satırları girin — giriş belgelerinde hedef lokasyon otomatik yönlendirilebilir"
        extra={<Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/documents')}>Liste</Button>}
      />
      <Form form={form} layout="vertical" onFinish={onFinish} initialValues={{ lines: [{}] }}>
        <Card className="og-section-card" size="small" title="Başlık">
          <Space wrap align="start" size={[16, 0]}>
            <Form.Item name="operationTypeId" label="Operasyon Tipi" rules={[{ required: true, message: 'Zorunlu' }]}>
              <Select style={{ minWidth: 200 }} options={ops} showSearch optionFilterProp="label" placeholder="Operasyon tipi" />
            </Form.Item>
            <Form.Item name="warehouseId" label="Depo" rules={[{ required: true, message: 'Zorunlu' }]}>
              <Select style={{ minWidth: 180 }} options={warehouses} showSearch optionFilterProp="label" placeholder="Depo" />
            </Form.Item>
            <Form.Item name="documentNo" label="Belge No (boş = otomatik)">
              <Input placeholder="otomatik" style={{ width: 160 }} />
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
                        <Select style={{ minWidth: 220 }} options={products} showSearch optionFilterProp="label" placeholder="Ürün" onChange={(v) => fetchSuggest(v as number)} />
                      </Form.Item>
                      <Form.Item name={[name, 'unitId']} label="Birim" rules={[{ required: true, message: '!' }]} style={{ marginBottom: 0 }}>
                        <Select style={{ width: 100 }} options={units} showSearch optionFilterProp="label" placeholder="Birim" />
                      </Form.Item>
                      <Form.Item name={[name, 'quantity']} label="Miktar" rules={[{ required: true, message: '!' }]} style={{ marginBottom: 0 }}>
                        <InputNumber style={{ width: 100 }} placeholder="Miktar" min={0} />
                      </Form.Item>
                      <Form.Item name={[name, 'targetLocationId']} label="Hedef lok." style={{ marginBottom: 0 }}>
                        <Select style={{ width: 130 }} options={locations} showSearch optionFilterProp="label" placeholder="Otomatik" allowClear />
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
          <Button onClick={() => navigate('/documents')}>İptal</Button>
        </div>
      </Form>
    </div>
  )
}
