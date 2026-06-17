import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { App, Button, Card, Col, DatePicker, Form, Input, InputNumber, Radio, Row, Select, Space } from 'antd'
import { ArrowLeftOutlined, SaveOutlined, PlusOutlined, DeleteOutlined } from '@ant-design/icons'
import type { Dayjs } from 'dayjs'
import { axiosInstance } from '../providers/dataProvider'
import { PageHeader } from '../components/PageHeader'

type Opt = { value: number; label: string }
type Mode = 'manual' | 'from-order'

function useOpts(path: string, labeler: (x: Record<string, unknown>) => string) {
  const [opts, setOpts] = useState<Opt[]>([])
  useEffect(() => {
    axiosInstance.get(`/api/${path}`, { params: { pageSize: 300 } }).then((r) => {
      const list = Array.isArray(r.data) ? r.data : (r.data.data ?? [])
      setOpts(list.map((x: Record<string, unknown>) => ({ value: x.id as number, label: labeler(x) })))
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path])
  return opts
}

const toISO = (d?: Dayjs) => (d ? d.toISOString() : undefined)

export const ShipmentCreate = () => {
  const navigate = useNavigate()
  const { message } = App.useApp()
  const [form] = Form.useForm()
  const [mode, setMode] = useState<Mode>('manual')
  const [submitting, setSubmitting] = useState(false)

  const vehicles = useOpts('vehicles', (x) => `${x.plateNo ?? x.id}${x.name ? ' — ' + x.name : ''}`)
  const partners = useOpts('partners', (x) => `${x.code ?? x.id}${x.name ? ' — ' + x.name : ''}`)
  const salesOrders = useOpts('sales-orders', (x) => `${x.orderNo ?? x.id}`)

  const onFinish = async (values: Record<string, unknown>) => {
    setSubmitting(true)
    try {
      if (mode === 'from-order') {
        // POST /api/shipments/from-sales-order — müşteri otomatik durak olur
        const payload: Record<string, unknown> = {
          salesOrderId: values.salesOrderId,
          vehicleId: values.vehicleId || undefined,
          driverName: (values.driverName as string)?.trim() || undefined,
          shipmentNo: (values.shipmentNo as string)?.trim() || undefined,
          plannedDate: toISO(values.plannedDate as Dayjs | undefined),
        }
        const r = await axiosInstance.post('/api/shipments/from-sales-order', payload)
        message.success(`Sevkiyat oluşturuldu: ${r.data?.shipmentNo ?? ''}`)
        navigate('/shipments')
        return
      }
      // POST /api/shipments — en az 1 durak zorunlu
      const stops = ((values.stops as Record<string, unknown>[]) ?? [])
        .filter((s) => s && s.partnerId)
        .map((s) => ({
          partnerId: s.partnerId,
          salesOrderId: s.salesOrderId || undefined,
          address: (s.address as string)?.trim() || undefined,
          note: (s.note as string)?.trim() || undefined,
        }))
      if (stops.length === 0) {
        message.error('En az bir durak ekleyin')
        setSubmitting(false)
        return
      }
      const payload: Record<string, unknown> = {
        shipmentNo: (values.shipmentNo as string)?.trim(),
        vehicleId: values.vehicleId || undefined,
        driverName: (values.driverName as string)?.trim() || undefined,
        note: (values.note as string)?.trim() || undefined,
        plannedDate: toISO(values.plannedDate as Dayjs | undefined),
        stops,
      }
      const r = await axiosInstance.post('/api/shipments', payload)
      message.success(`Sevkiyat oluşturuldu: ${r.data?.shipmentNo ?? ''}`)
      navigate('/shipments')
    } catch (e) {
      message.error((e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Sevkiyat oluşturulamadı')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="og-page" style={{ maxWidth: 1040 }}>
      <PageHeader
        title="Sevkiyat — Yeni"
        subtitle="Elle durak girerek ya da bir satış siparişinden türeterek sevkiyat oluşturun"
        extra={<Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/shipments')}>Liste</Button>}
      />

      <Radio.Group
        value={mode}
        onChange={(e) => setMode(e.target.value)}
        optionType="button"
        buttonStyle="solid"
        style={{ marginBottom: 16 }}
        options={[
          { label: 'Elle Oluştur', value: 'manual' },
          { label: 'Satış Siparişinden', value: 'from-order' },
        ]}
      />

      <Form form={form} layout="vertical" onFinish={onFinish} initialValues={{ stops: [{}] }}>
        <Card className="og-section-card" size="small" title="Başlık">
          <Row gutter={[20, 0]}>
            {mode === 'from-order' && (
              <Col xs={24} sm={8}>
                <Form.Item name="salesOrderId" label="Satış Siparişi" rules={[{ required: true, message: 'Zorunlu' }]}>
                  <Select options={salesOrders} showSearch optionFilterProp="label" placeholder="Seçiniz" />
                </Form.Item>
              </Col>
            )}
            <Col xs={24} sm={8}>
              <Form.Item
                name="shipmentNo"
                label={mode === 'from-order' ? 'Sevkiyat No (opsiyonel)' : 'Sevkiyat No'}
                rules={mode === 'manual' ? [{ required: true, message: 'Zorunlu' }] : []}
              >
                <Input maxLength={40} placeholder={mode === 'from-order' ? 'Boş → SHP-<sipariş no>' : ''} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item name="vehicleId" label="Araç">
                <Select options={vehicles} showSearch optionFilterProp="label" allowClear placeholder="Seçiniz" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item name="driverName" label="Sürücü">
                <Input maxLength={100} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item name="plannedDate" label="Planlanan Tarih">
                <DatePicker style={{ width: '100%' }} format="DD.MM.YYYY" />
              </Form.Item>
            </Col>
            {mode === 'manual' && (
              <Col xs={24} sm={8}>
                <Form.Item name="note" label="Not">
                  <Input maxLength={500} />
                </Form.Item>
              </Col>
            )}
          </Row>
        </Card>

        {mode === 'manual' && (
          <Card className="og-section-card" size="small" title="Duraklar">
            <Form.List name="stops">
              {(rows, { add, remove }) => (
                <>
                  {rows.map(({ key, name }, idx) => (
                    <div
                      key={key}
                      className="og-linecard"
                      style={{ display: 'flex', alignItems: 'flex-end', gap: 12, flexWrap: 'wrap' }}
                    >
                      <span className="og-linecard__no" style={{ alignSelf: 'center' }}>#{idx + 1}</span>
                      <Form.Item
                        name={[name, 'partnerId']}
                        label="Cari (Müşteri)"
                        rules={[{ required: true, message: '!' }]}
                        style={{ marginBottom: 0, minWidth: 220 }}
                      >
                        <Select options={partners} showSearch optionFilterProp="label" placeholder="Seçiniz" />
                      </Form.Item>
                      <Form.Item name={[name, 'salesOrderId']} label="Satış Siparişi" style={{ marginBottom: 0, minWidth: 180 }}>
                        <Select options={salesOrders} showSearch optionFilterProp="label" allowClear placeholder="Opsiyonel" />
                      </Form.Item>
                      <Form.Item name={[name, 'address']} label="Adres" style={{ marginBottom: 0, minWidth: 180 }}>
                        <Input maxLength={255} />
                      </Form.Item>
                      <Form.Item name={[name, 'note']} label="Not" style={{ marginBottom: 0, minWidth: 160 }}>
                        <Input maxLength={255} />
                      </Form.Item>
                      <Button danger type="text" icon={<DeleteOutlined />} onClick={() => remove(name)} />
                    </div>
                  ))}
                  <Button onClick={() => add()} type="dashed" icon={<PlusOutlined />} block style={{ marginTop: 4 }}>
                    Durak Ekle
                  </Button>
                </>
              )}
            </Form.List>
          </Card>
        )}

        <div className="og-formbar">
          <Space>
            <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={submitting}>Kaydet</Button>
            <Button onClick={() => navigate('/shipments')}>İptal</Button>
          </Space>
        </div>
      </Form>
    </div>
  )
}
