import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { App, Alert, Button, Card, Col, Form, Input, Row, Select } from 'antd'
import { ArrowLeftOutlined, SaveOutlined } from '@ant-design/icons'
import { axiosInstance } from '../providers/dataProvider'
import { PageHeader } from '../components/PageHeader'

type Opt = { value: number; label: string }

// Tarih bazlı varsayılan sayım no önerisi (SAY-YYYYMMDD-HHMM) — kullanıcı değiştirebilir
const suggestCountNo = () => {
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  return `SAY-${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`
}

export const StockCountCreate = () => {
  const navigate = useNavigate()
  const { message } = App.useApp()
  const [form] = Form.useForm()
  const [warehouses, setWarehouses] = useState<Opt[]>([])
  const [locations, setLocations] = useState<Opt[]>([])
  const [products, setProducts] = useState<Opt[]>([])
  const [submitting, setSubmitting] = useState(false)

  const defaultCountNo = useMemo(suggestCountNo, [])

  useEffect(() => {
    const mapOpts = (list: Record<string, unknown>[]) => list.map((x) => ({ value: x.id as number, label: `${x.code ?? x.id}${x.name ? ' — ' + x.name : ''}` }))
    const arr = (r: { data: unknown }) => (Array.isArray(r.data) ? r.data : ((r.data as { data?: unknown[] })?.data ?? [])) as Record<string, unknown>[]
    axiosInstance.get('/api/warehouses', { params: { pageSize: 300 } }).then((r) => setWarehouses(mapOpts(arr(r))))
    axiosInstance.get('/api/locations', { params: { pageSize: 500 } }).then((r) => setLocations(mapOpts(arr(r))))
    axiosInstance.get('/api/products', { params: { pageSize: 500 } }).then((r) => setProducts(mapOpts(arr(r))))
  }, [])

  const onFinish = async (values: { countNo: string; warehouseId: number; countType?: string; locationId?: number; productId?: number; note?: string }) => {
    setSubmitting(true)
    try {
      const r = await axiosInstance.post('/api/stock-counts', {
        countNo: values.countNo,
        warehouseId: values.warehouseId,
        countType: values.countType || undefined,
        locationId: values.locationId || undefined,
        productId: values.productId || undefined,
        note: values.note?.trim() || undefined,
      })
      message.success('Sayım başlatıldı — kapsamdaki stok satırlara alındı')
      navigate(`/stock-counts/${r.data.id}`)
    } catch (e) {
      message.error((e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Sayım başlatılamadı')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="og-page" style={{ maxWidth: 820 }}>
      <PageHeader
        title="Sayım Girişi — Yeni"
        subtitle="Depo + Sayım Tipi + kapsam (lokasyon/ürün) seç — kapsamdaki stok sayım satırlarına alınır"
        extra={<Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/stock-counts')}>Liste</Button>}
      />

      <Form form={form} layout="vertical" onFinish={onFinish} initialValues={{ countNo: defaultCountNo }}>
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 14 }}
          title="Sayım başlatıldığında deponun mevcut stoğu DRAFT sayım satırlarına kopyalanır. Ardından detayda sayılan miktarlar girilip 'Tamamla' ile stok düzeltilir."
        />
        <Card className="og-section-card" size="small" title="Sayım Başlat">
          <Row gutter={[20, 0]}>
            <Col xs={24} sm={12}>
              <Form.Item
                name="countNo"
                label="Sayım No"
                rules={[{ required: true, message: 'Zorunlu' }, { max: 40, message: 'En fazla 40 karakter' }]}
              >
                <Input placeholder="örn. SAY-20260616-1030" maxLength={40} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="warehouseId" label="Depo" rules={[{ required: true, message: 'Zorunlu' }]}>
                <Select options={warehouses} showSearch optionFilterProp="label" placeholder="Depo seçiniz" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="countType" label="Sayım Tipi">
                <Select allowClear placeholder="Seçiniz" options={[{ value: 'TAM', label: 'Tam Sayım' }, { value: 'KISMI', label: 'Kısmi Sayım' }, { value: 'ZSYM', label: 'ZSYM' }]} />
              </Form.Item>
            </Col>
            {/* Kapsam: belirli lokasyon ve/veya ürün (boş = tüm depo) */}
            <Col xs={24} sm={12}>
              <Form.Item name="locationId" label="Lokasyon (kapsam — boş=tüm depo)">
                <Select allowClear showSearch optionFilterProp="label" placeholder="Tüm depo" options={locations} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="productId" label="Ürün (kapsam — boş=tüm ürünler)">
                <Select allowClear showSearch optionFilterProp="label" placeholder="Tüm ürünler" options={products} />
              </Form.Item>
            </Col>
            <Col xs={24}>
              <Form.Item name="note" label="Not" rules={[{ max: 500, message: 'En fazla 500 karakter' }]}>
                <Input.TextArea rows={2} maxLength={500} placeholder="Opsiyonel açıklama" />
              </Form.Item>
            </Col>
          </Row>
        </Card>

        <div className="og-formbar">
          <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={submitting}>
            Sayımı Başlat
          </Button>
          <Button onClick={() => navigate('/stock-counts')}>İptal</Button>
        </div>
      </Form>
    </div>
  )
}
