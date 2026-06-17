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
  const [submitting, setSubmitting] = useState(false)

  const defaultCountNo = useMemo(suggestCountNo, [])

  useEffect(() => {
    axiosInstance.get('/api/warehouses', { params: { pageSize: 300 } }).then((r) => {
      const list = Array.isArray(r.data) ? r.data : (r.data.data ?? [])
      setWarehouses(
        list.map((x: Record<string, unknown>) => ({
          value: x.id as number,
          label: `${x.code ?? x.id}${x.name ? ' — ' + x.name : ''}`,
        })),
      )
    })
  }, [])

  const onFinish = async (values: { countNo: string; warehouseId: number; note?: string }) => {
    setSubmitting(true)
    try {
      const r = await axiosInstance.post('/api/stock-counts', {
        countNo: values.countNo,
        warehouseId: values.warehouseId,
        note: values.note?.trim() || undefined,
      })
      message.success('Sayım başlatıldı — depo stoğu satırlara alındı')
      navigate(`/stock-counts/${r.data.id}`)
    } catch (e) {
      message.error((e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Sayım başlatılamadı')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="og-page" style={{ maxWidth: 720 }}>
      <PageHeader
        title="Sayım — Yeni"
        subtitle="Depo seçin — o deponun mevcut stok satırları sayım satırı olarak otomatik oluşturulur"
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
                <Select
                  options={warehouses}
                  showSearch
                  optionFilterProp="label"
                  placeholder="Depo seçiniz"
                />
              </Form.Item>
            </Col>
            <Col xs={24}>
              <Form.Item name="note" label="Not" rules={[{ max: 500, message: 'En fazla 500 karakter' }]}>
                <Input.TextArea rows={3} maxLength={500} placeholder="Opsiyonel açıklama" />
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
