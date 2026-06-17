import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { App, Alert, Button, Card, Col, DatePicker, Form, Input, InputNumber, Row, Select, Switch } from 'antd'
import { ArrowLeftOutlined, SaveOutlined } from '@ant-design/icons'
import type { Dayjs } from 'dayjs'
import { axiosInstance } from '../providers/dataProvider'
import { PageHeader } from '../components/PageHeader'

type Opt = { value: number; label: string }

// /api/<path> -> {value,label} listesi (code [— name] etiketi). Dizi ya da {data:[]} döner.
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

// DatePicker (Dayjs) -> ISO string; backend new Date(string) ile parse ediyor
const toISO = (d?: Dayjs) => (d ? d.toISOString() : undefined)

export const PalletCreate = () => {
  const navigate = useNavigate()
  const { message } = App.useApp()
  const [form] = Form.useForm()
  const [submitting, setSubmitting] = useState(false)

  const palletTypes = useOpts('pallet-types', (x) => `${x.code ?? x.id}${x.name ? ' — ' + x.name : ''}`)
  const units = useOpts('units', (x) => `${x.code ?? x.id}${x.name ? ' — ' + x.name : ''}`)
  const pallets = useOpts('pallets', (x) => `${x.palletNo ?? x.id}`)

  const onFinish = async (values: Record<string, unknown>) => {
    setSubmitting(true)
    try {
      // boş palletNo gönderme — backend palet tipinin sayacından üretsin
      const payload: Record<string, unknown> = {
        palletTypeId: values.palletTypeId,
        palletNo: (values.palletNo as string)?.trim() || undefined,
        parentPalletId: values.parentPalletId || undefined,
        baseUnitId: values.baseUnitId || undefined,
        originalQty: values.originalQty ?? undefined,
        beaconId: (values.beaconId as string)?.trim() || undefined,
        isActive: values.isActive,
        productionDate: toISO(values.productionDate as Dayjs | undefined),
        expiryDate: toISO(values.expiryDate as Dayjs | undefined),
      }
      const r = await axiosInstance.post('/api/pallets', payload)
      message.success(`Palet oluşturuldu: ${r.data?.palletNo ?? ''}`)
      navigate('/pallets')
    } catch (e) {
      message.error((e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Palet oluşturulamadı')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="og-page" style={{ maxWidth: 880 }}>
      <PageHeader
        title="Palet — Yeni"
        subtitle="Palet tipini seçin; palet no boş bırakılırsa tipin sayacından üretilir"
        extra={<Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/pallets')}>Liste</Button>}
      />
      <Form form={form} layout="vertical" onFinish={onFinish} initialValues={{ isActive: true }}>
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 14 }}
          title="Palet no boş bırakılırsa, seçilen palet tipinin öneki + sayaç değeriyle otomatik üretilir."
        />
        <Card className="og-section-card" size="small" title="Palet Bilgileri">
          <Row gutter={[20, 0]}>
            <Col xs={24} sm={12}>
              <Form.Item name="palletTypeId" label="Palet Tipi" rules={[{ required: true, message: 'Zorunlu' }]}>
                <Select options={palletTypes} showSearch optionFilterProp="label" placeholder="Seçiniz" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="palletNo" label="Palet No (opsiyonel)">
                <Input maxLength={40} placeholder="Boş bırak → otomatik üret" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="parentPalletId" label="Üst Palet">
                <Select options={pallets} showSearch optionFilterProp="label" allowClear placeholder="Seçiniz" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="baseUnitId" label="Ana Birim">
                <Select options={units} showSearch optionFilterProp="label" allowClear placeholder="Seçiniz" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="originalQty" label="Başlangıç Miktarı">
                <InputNumber style={{ width: '100%' }} min={0} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="beaconId" label="Beacon ID">
                <Input maxLength={200} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="productionDate" label="Üretim Tarihi">
                <DatePicker style={{ width: '100%' }} format="DD.MM.YYYY" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="expiryDate" label="Son Kullanma Tarihi">
                <DatePicker style={{ width: '100%' }} format="DD.MM.YYYY" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <div className="og-switchrow" style={{ marginTop: 4 }}>
                <span className="og-switchrow__label">Aktif</span>
                <Form.Item name="isActive" valuePropName="checked" noStyle><Switch /></Form.Item>
              </div>
            </Col>
          </Row>
        </Card>
        <div className="og-formbar">
          <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={submitting}>Kaydet</Button>
          <Button onClick={() => navigate('/pallets')}>İptal</Button>
        </div>
      </Form>
    </div>
  )
}
