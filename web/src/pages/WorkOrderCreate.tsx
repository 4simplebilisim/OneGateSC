import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { App, Button, Card, Form, Input, InputNumber, Select, Space, Alert } from 'antd'
import { ArrowLeftOutlined, SaveOutlined, PlusOutlined, DeleteOutlined } from '@ant-design/icons'
import { axiosInstance } from '../providers/dataProvider'
import { PageHeader } from '../components/PageHeader'

type Opt = { value: number; label: string }

// Backend: src/routes/workOrders.ts → POST /api/work-orders
// type değerleri (backend `types`): PICK / PUTAWAY / COUNT / TRANSFER / REPLENISH
const WO_TYPES: { value: string; label: string }[] = [
  { value: 'PICK', label: 'Toplama (PICK)' },
  { value: 'PUTAWAY', label: 'Yerleştirme (PUTAWAY)' },
  { value: 'COUNT', label: 'Sayım (COUNT)' },
  { value: 'TRANSFER', label: 'Transfer (TRANSFER)' },
  { value: 'REPLENISH', label: 'Besleme (REPLENISH)' },
]

export const WorkOrderCreate = () => {
  const navigate = useNavigate()
  const { message } = App.useApp()
  const [form] = Form.useForm()
  const [warehouses, setWarehouses] = useState<Opt[]>([])
  const [products, setProducts] = useState<Opt[]>([])
  const [units, setUnits] = useState<Opt[]>([])
  const [locations, setLocations] = useState<Opt[]>([])
  const [statuses, setStatuses] = useState<Opt[]>([])
  const [users, setUsers] = useState<Opt[]>([])
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    const load = (url: string, label: (x: Record<string, unknown>) => string) =>
      axiosInstance.get(url, { params: { pageSize: 300 } }).then((r) => {
        const rows = Array.isArray(r.data) ? r.data : (r.data.data ?? [])
        return rows.map((x: Record<string, unknown>) => ({ value: x.id as number, label: label(x) }))
      })
    load('/api/warehouses', (x) => `${x.code} — ${x.name ?? ''}`).then(setWarehouses)
    load('/api/products', (x) => `${x.code} — ${x.name ?? ''}`).then(setProducts)
    load('/api/units', (x) => `${x.code}`).then(setUnits)
    load('/api/locations', (x) => `${x.code}`).then(setLocations)
    load('/api/statuses', (x) => `${x.code} — ${x.name ?? ''}`).then(setStatuses)
    // /api/users yalnız admin'e açık (requireAdmin) → 403 olursa atama dropdown'u boş kalır, form çalışır
    load('/api/users', (x) => `${x.username}${x.fullName ? ' — ' + x.fullName : ''}`).then(setUsers).catch(() => setUsers([]))
  }, [])

  const onFinish = async (values: Record<string, unknown>) => {
    setSubmitting(true)
    try {
      const res = await axiosInstance.post('/api/work-orders', values)
      message.success('İş emri oluşturuldu')
      navigate(`/work-orders/${res.data.id}`)
    } catch (e) {
      message.error((e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'İşlem başarısız')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="og-page" style={{ maxWidth: 1180 }}>
      <PageHeader
        title="İş Emri — Yeni"
        subtitle="Depo ve tip seçin, satırları girin. İş emri PLANLANDI olarak oluşur; tamamlandığında kaynak/hedef lokasyon ve statü tanımlı satırlar stok hareketi üretir."
        extra={<Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/work-orders')}>Liste</Button>}
      />
      <Form form={form} layout="vertical" onFinish={onFinish} initialValues={{ lines: [{}] }}>
        <Card className="og-section-card" size="small" title="Başlık">
          <Space wrap align="start" size={[16, 0]}>
            <Form.Item name="warehouseId" label="Depo" rules={[{ required: true, message: 'Zorunlu' }]}>
              <Select style={{ minWidth: 200 }} options={warehouses} showSearch optionFilterProp="label" placeholder="Depo" />
            </Form.Item>
            <Form.Item name="type" label="Tip">
              <Select style={{ minWidth: 200 }} options={WO_TYPES} showSearch optionFilterProp="label" placeholder="Tip (opsiyonel)" allowClear />
            </Form.Item>
            <Form.Item name="assignedToUserId" label="Atanan Kullanıcı">
              <Select style={{ minWidth: 200 }} options={users} showSearch optionFilterProp="label" placeholder="Atanan (opsiyonel)" allowClear />
            </Form.Item>
            <Form.Item name="priority" label="Öncelik">
              <InputNumber style={{ width: 110 }} placeholder="Öncelik" />
            </Form.Item>
            <Form.Item name="orderNo" label="İş Emri No (boş = otomatik)">
              <Input placeholder="otomatik (WO)" style={{ width: 170 }} />
            </Form.Item>
            <Form.Item name="note" label="Not">
              <Input placeholder="Not (opsiyonel)" style={{ width: 240 }} />
            </Form.Item>
          </Space>
        </Card>

        <Card className="og-section-card" size="small" title="Satırlar">
          <Alert
            type="info"
            showIcon
            style={{ marginBottom: 12 }}
            title="Tamamlama anında stok hareketi üretmek için kaynak/hedef lokasyon + statü doldurulmalı. COUNT tipinde hareket üretilmez."
          />
          <Form.List name="lines">
            {(rows, { add, remove }) => (
              <>
                {rows.map(({ key, name }, idx) => (
                  <div key={key} className="og-linecard" style={{ display: 'flex', alignItems: 'flex-end', gap: 12, flexWrap: 'wrap' }}>
                    <span className="og-linecard__no" style={{ alignSelf: 'center' }}>#{idx + 1}</span>
                    <Form.Item name={[name, 'productId']} label="Ürün" rules={[{ required: true, message: '!' }]} style={{ marginBottom: 0 }}>
                      <Select style={{ minWidth: 220 }} options={products} showSearch optionFilterProp="label" placeholder="Ürün" />
                    </Form.Item>
                    <Form.Item name={[name, 'unitId']} label="Birim" rules={[{ required: true, message: '!' }]} style={{ marginBottom: 0 }}>
                      <Select style={{ width: 100 }} options={units} showSearch optionFilterProp="label" placeholder="Birim" />
                    </Form.Item>
                    <Form.Item name={[name, 'quantity']} label="Miktar" rules={[{ required: true, message: '!' }]} style={{ marginBottom: 0 }}>
                      <InputNumber style={{ width: 100 }} placeholder="Miktar" min={0} />
                    </Form.Item>
                    <Form.Item name={[name, 'sourceLocationId']} label="Kaynak Lok." style={{ marginBottom: 0 }}>
                      <Select style={{ width: 130 }} options={locations} showSearch optionFilterProp="label" placeholder="—" allowClear />
                    </Form.Item>
                    <Form.Item name={[name, 'sourceStatusId']} label="Kaynak Statü" style={{ marginBottom: 0 }}>
                      <Select style={{ width: 130 }} options={statuses} showSearch optionFilterProp="label" placeholder="—" allowClear />
                    </Form.Item>
                    <Form.Item name={[name, 'targetLocationId']} label="Hedef Lok." style={{ marginBottom: 0 }}>
                      <Select style={{ width: 130 }} options={locations} showSearch optionFilterProp="label" placeholder="—" allowClear />
                    </Form.Item>
                    <Form.Item name={[name, 'targetStatusId']} label="Hedef Statü" style={{ marginBottom: 0 }}>
                      <Select style={{ width: 130 }} options={statuses} showSearch optionFilterProp="label" placeholder="—" allowClear />
                    </Form.Item>
                    <Form.Item name={[name, 'batchNo']} label="Parti" style={{ marginBottom: 0 }}>
                      <Input style={{ width: 110 }} placeholder="Parti" />
                    </Form.Item>
                    <Form.Item name={[name, 'serialNo']} label="Seri" style={{ marginBottom: 0 }}>
                      <Input style={{ width: 110 }} placeholder="Seri" />
                    </Form.Item>
                    <Button danger type="text" icon={<DeleteOutlined />} onClick={() => remove(name)} />
                  </div>
                ))}
                <Button onClick={() => add()} type="dashed" icon={<PlusOutlined />} block style={{ marginTop: 4 }}>Satır Ekle</Button>
              </>
            )}
          </Form.List>
        </Card>

        <div className="og-formbar">
          <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={submitting}>Kaydet</Button>
          <Button onClick={() => navigate('/work-orders')}>İptal</Button>
        </div>
      </Form>
    </div>
  )
}
