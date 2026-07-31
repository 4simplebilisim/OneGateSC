import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { App, Alert, Button, Card, Col, Form, Input, Row, Select } from 'antd'
import { ArrowLeftOutlined, SaveOutlined } from '@ant-design/icons'
import { axiosInstance } from '../providers/dataProvider'
import { PageHeader } from '../components/PageHeader'

type Opt = { value: number; label: string }
type Scope = 'ALL' | 'GROUP' | 'SPECIFIC'

// Bağlantı Tipi (StokBar): Hepsi=tümü, Kod=belirli kayıt, Grup=grup
const SCOPE_OPTS = [
  { value: 'ALL', label: 'Hepsi' },
  { value: 'SPECIFIC', label: 'Kod' },
  { value: 'GROUP', label: 'Grup' },
]

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
  const [productGroups, setProductGroups] = useState<Opt[]>([])
  const [users, setUsers] = useState<Opt[]>([])
  const [userGroups, setUserGroups] = useState<Opt[]>([])
  const [countOps, setCountOps] = useState<Opt[]>([]) // Sayım operasyonları (COUNT yönlü) → parametre kaynağı
  const [matType, setMatType] = useState<Scope>('ALL') // Malzeme Bağlantı Tipi
  const [userType, setUserType] = useState<Scope>('ALL') // Kullanıcı Bağlantı Tipi
  const [submitting, setSubmitting] = useState(false)

  const defaultCountNo = useMemo(suggestCountNo, [])

  useEffect(() => {
    const mapOpts = (list: Record<string, unknown>[]) => list.map((x) => ({ value: x.id as number, label: `${x.code ?? x.username ?? x.id}${x.name ? ' — ' + x.name : ''}` }))
    const arr = (r: { data: unknown }) => (Array.isArray(r.data) ? r.data : ((r.data as { data?: unknown[] })?.data ?? [])) as Record<string, unknown>[]
    axiosInstance.get('/api/warehouses', { params: { pageSize: 300 } }).then((r) => setWarehouses(mapOpts(arr(r))))
    axiosInstance.get('/api/locations', { params: { pageSize: 500 } }).then((r) => setLocations(mapOpts(arr(r))))
    axiosInstance.get('/api/products', { params: { pageSize: 500 } }).then((r) => setProducts(mapOpts(arr(r))))
    axiosInstance.get('/api/product-groups', { params: { pageSize: 300 } }).then((r) => setProductGroups(mapOpts(arr(r))))
    axiosInstance.get('/api/users', { params: { pageSize: 300 } }).then((r) => setUsers(mapOpts(arr(r))))
    axiosInstance.get('/api/user-groups', { params: { pageSize: 300 } }).then((r) => setUserGroups(mapOpts(arr(r))))
    axiosInstance.get('/api/operation-types', { params: { pageSize: 300 } }).then((r) => setCountOps(mapOpts(arr(r).filter((o) => o.direction === 'COUNT'))))
  }, [])

  const onFinish = async (values: { countNo: string; warehouseId: number; countType?: string; operationTypeId?: number; locationId?: number; materialLinkId?: number; userLinkId?: number; note?: string }) => {
    setSubmitting(true)
    try {
      const r = await axiosInstance.post('/api/stock-counts', {
        countNo: values.countNo,
        warehouseId: values.warehouseId,
        countType: values.countType || undefined,
        operationTypeId: values.operationTypeId || undefined,
        locationId: values.locationId || undefined,
        note: values.note?.trim() || undefined,
        // Bağlantı Tipi kapsamı — Hepsi ise id gönderilmez
        materialLinkType: matType,
        materialLinkId: matType === 'ALL' ? undefined : values.materialLinkId,
        userLinkType: userType,
        userLinkId: userType === 'ALL' ? undefined : values.userLinkId,
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
            {/* Sayım Operasyonu → parametreler (eşitleme vb.). Boş = eşitle (varsayılan). */}
            <Col xs={24} sm={12}>
              <Form.Item name="operationTypeId" label="Sayım Operasyonu (parametre)" tooltip="Operasyonun Sayım Parametreleri uygulanır — ör. Eşitleme kapalıysa tamamlamada stok düzeltilmez (yalnız fark raporu)">
                <Select allowClear showSearch optionFilterProp="label" placeholder="Varsayılan (eşitle)" options={countOps} />
              </Form.Item>
            </Col>
            {/* Kapsam: belirli lokasyon (boş = tüm depo) */}
            <Col xs={24} sm={12}>
              <Form.Item name="locationId" label="Lokasyon (kapsam — boş=tüm depo)">
                <Select allowClear showSearch optionFilterProp="label" placeholder="Tüm depo" options={locations} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} />

            {/* Malzeme Bağlantı Tipi (Hepsi/Kod/Grup) → snapshot ürün kapsamı */}
            <Col xs={24} sm={8}>
              <Form.Item label="Malzeme Bağlantı Tipi">
                <Select value={matType} onChange={(v: Scope) => { setMatType(v); form.setFieldValue('materialLinkId', undefined) }} options={SCOPE_OPTS} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={16}>
              {matType === 'SPECIFIC' && (
                <Form.Item name="materialLinkId" label="Ürün" rules={[{ required: true, message: 'Ürün seçiniz' }]}>
                  <Select showSearch optionFilterProp="label" placeholder="Ürün seçiniz" options={products} />
                </Form.Item>
              )}
              {matType === 'GROUP' && (
                <Form.Item name="materialLinkId" label="Ürün Grubu" rules={[{ required: true, message: 'Ürün grubu seçiniz' }]}>
                  <Select showSearch optionFilterProp="label" placeholder="Ürün grubu seçiniz" options={productGroups} />
                </Form.Item>
              )}
              {matType === 'ALL' && (
                <Form.Item label="Ürün"><Input disabled placeholder="Tüm ürünler (Hepsi)" /></Form.Item>
              )}
            </Col>

            {/* Kullanıcı Bağlantı Tipi (Hepsi/Kod/Grup) → belgede saklanır (atama/yetki) */}
            <Col xs={24} sm={8}>
              <Form.Item label="Kullanıcı Bağlantı Tipi">
                <Select value={userType} onChange={(v: Scope) => { setUserType(v); form.setFieldValue('userLinkId', undefined) }} options={SCOPE_OPTS} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={16}>
              {userType === 'SPECIFIC' && (
                <Form.Item name="userLinkId" label="Kullanıcı" rules={[{ required: true, message: 'Kullanıcı seçiniz' }]}>
                  <Select showSearch optionFilterProp="label" placeholder="Kullanıcı seçiniz" options={users} />
                </Form.Item>
              )}
              {userType === 'GROUP' && (
                <Form.Item name="userLinkId" label="Kullanıcı Grubu" rules={[{ required: true, message: 'Kullanıcı grubu seçiniz' }]}>
                  <Select showSearch optionFilterProp="label" placeholder="Kullanıcı grubu seçiniz" options={userGroups} />
                </Form.Item>
              )}
              {userType === 'ALL' && (
                <Form.Item label="Kullanıcı"><Input disabled placeholder="Tüm kullanıcılar (Hepsi)" /></Form.Item>
              )}
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
