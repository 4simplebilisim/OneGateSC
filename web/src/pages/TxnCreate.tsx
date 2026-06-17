import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { App, Button, Card, Form, Input, InputNumber, Select, Space } from 'antd'
import { ArrowLeftOutlined, SaveOutlined, PlusOutlined, DeleteOutlined } from '@ant-design/icons'
import { axiosInstance } from '../providers/dataProvider'
import { PageHeader } from '../components/PageHeader'
import { TXN_CONFIG, type TxnField } from '../txnConfig'

type RefOpts = Record<string, { value: number; label: string }[]>

export const TxnCreate = ({ resource }: { resource: string }) => {
  const cfg = TXN_CONFIG[resource]!
  const navigate = useNavigate()
  const { message } = App.useApp()
  const [form] = Form.useForm()
  const [refOpts, setRefOpts] = useState<RefOpts>({})
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    const refResources = [...new Set([...cfg.header, ...cfg.line].filter((f) => f.type === 'ref').map((f) => f.refResource!))]
    refResources.forEach((rr) => {
      axiosInstance.get(`/api/${rr}`, { params: { pageSize: 300 } }).then((r) => {
        const rows = Array.isArray(r.data) ? r.data : (r.data.data ?? [])
        setRefOpts((prev) => ({
          ...prev,
          [rr]: rows.map((x: Record<string, unknown>) => ({ value: x.id as number, label: `${x.code} — ${x.name ?? ''}` })),
        }))
      })
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resource])

  const control = (f: TxnField, width = 180) => {
    if (f.type === 'ref') return <Select style={{ minWidth: width }} options={refOpts[f.refResource!] ?? []} showSearch optionFilterProp="label" placeholder={f.label} />
    if (f.type === 'number') return <InputNumber style={{ width: 110 }} placeholder={f.label} />
    return <Input placeholder={f.label} />
  }

  const onFinish = async (values: Record<string, unknown>) => {
    setSubmitting(true)
    try {
      await axiosInstance.post(`/api/${resource}`, values)
      message.success('Oluşturuldu')
      navigate(`/${resource}`)
    } catch (e) {
      message.error((e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'İşlem başarısız')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="og-page" style={{ maxWidth: 1040 }}>
      <PageHeader
        title={`${cfg.label} — Yeni`}
        subtitle="Başlık bilgilerini girip satırları ekleyin"
        extra={<Button icon={<ArrowLeftOutlined />} onClick={() => navigate(`/${resource}`)}>Liste</Button>}
      />
      <Form form={form} layout="vertical" onFinish={onFinish} initialValues={{ lines: [{}] }}>
        <Card className="og-section-card" size="small" title="Başlık">
          <Space wrap align="start" size={[16, 0]}>
            {cfg.header.map((f) => (
              <Form.Item key={f.name} name={f.name} label={f.label} rules={f.required ? [{ required: true, message: 'Zorunlu' }] : []}>
                {control(f)}
              </Form.Item>
            ))}
          </Space>
        </Card>

        <Card className="og-section-card" size="small" title="Satırlar">
          <Form.List name="lines">
            {(rows, { add, remove }) => (
              <>
                {rows.map(({ key, name }, idx) => (
                  <div
                    key={key}
                    className="og-linecard"
                    style={{ display: 'flex', alignItems: 'flex-end', gap: 12, flexWrap: 'wrap' }}
                  >
                    <span className="og-linecard__no" style={{ alignSelf: 'center' }}>#{idx + 1}</span>
                    {cfg.line.map((lf) => (
                      <Form.Item key={lf.name} name={[name, lf.name]} label={lf.label} rules={lf.required ? [{ required: true, message: '!' }] : []} style={{ marginBottom: 0 }}>
                        {control(lf, 160)}
                      </Form.Item>
                    ))}
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
          <Button onClick={() => navigate(`/${resource}`)}>İptal</Button>
        </div>
      </Form>
    </div>
  )
}
