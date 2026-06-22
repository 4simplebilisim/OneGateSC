import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { App, Button, Card, Descriptions, Empty, Input, InputNumber, Space, Table, Typography, Spin, Tag } from 'antd'
import { ArrowLeftOutlined, PlusOutlined } from '@ant-design/icons'
import { axiosInstance } from '../providers/dataProvider'
import { PageHeader } from '../components/PageHeader'
import { canWrite, EXTRA_FIELD_KIND_OPTS, EXTRA_FIELD_DATATYPE_OPTS } from '../formConfig'

interface Option { id: number; code: string; description?: string | null; sortOrder?: number | null; reference?: string | null; isActive: boolean }
interface ExtraField { id: number; fieldKind: string; entityType: string; description: string; fieldDataType: string; trackingCode?: string | null }

const labelOf = (opts: { value: string | number; label: string }[], v: string) => opts.find((o) => String(o.value) === v)?.label ?? v

// Ek Saha Seçenek yönetimi — "Çoktan Seçmeli Sabit / Rehber" tipli sahalar için seçenek listesi (StokBar "Seçenek" butonu).
export const ExtraFieldOptions = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { message } = App.useApp()
  const [field, setField] = useState<ExtraField | null>(null)
  const [options, setOptions] = useState<Option[]>([])
  const [loading, setLoading] = useState(true)
  const [draft, setDraft] = useState<{ code: string; description: string; sortOrder?: number; reference: string }>({ code: '', description: '', reference: '' })
  const writable = canWrite()

  const load = useCallback(() => {
    setLoading(true)
    Promise.all([
      axiosInstance.get(`/api/extra-fields/${id}`),
      axiosInstance.get('/api/extra-field-options', { params: { extraFieldId: id } }),
    ])
      .then(([f, o]) => {
        setField(f.data)
        setOptions(Array.isArray(o.data) ? o.data : (o.data.data ?? []))
      })
      .catch((e) => message.error(e?.response?.data?.error ?? 'Yüklenemedi'))
      .finally(() => setLoading(false))
  }, [id, message])

  useEffect(load, [load])

  const add = async () => {
    if (!draft.code.trim()) { message.warning('Kod zorunlu'); return }
    try {
      await axiosInstance.post('/api/extra-field-options', {
        extraFieldId: Number(id), code: draft.code.trim(),
        description: draft.description.trim() || undefined,
        sortOrder: draft.sortOrder, reference: draft.reference.trim() || undefined,
      })
      setDraft({ code: '', description: '', reference: '' })
      message.success('Seçenek eklendi')
      load()
    } catch (e) {
      message.error((e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Eklenemedi')
    }
  }

  const remove = async (optId: number) => {
    try {
      await axiosInstance.delete(`/api/extra-field-options/${optId}`)
      message.success('Silindi')
      load()
    } catch {
      message.error('Silinemedi')
    }
  }

  if (loading || !field) return <div style={{ padding: 80, textAlign: 'center' }}><Spin size="large" /></div>

  const needsOptions = field.fieldDataType === 'MULTI_SELECT_FIXED' || field.fieldDataType === 'LOOKUP'

  return (
    <div className="og-page" style={{ maxWidth: 880 }}>
      <PageHeader
        title={`Ek Saha Seçenekleri — ${field.description}`}
        subtitle="Çoktan Seçmeli / Rehber tipli sahalar için seçenek tanımları"
        extra={<Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/extra-fields')}>Liste</Button>}
      />

      <Card className="og-section-card" size="small" title="Ek Saha">
        <Descriptions bordered size="small" column={{ xs: 1, sm: 2, lg: 3 }}>
          <Descriptions.Item label="Açıklama">{field.description}</Descriptions.Item>
          <Descriptions.Item label="Tip"><Tag>{labelOf(EXTRA_FIELD_KIND_OPTS, field.fieldKind)}</Tag></Descriptions.Item>
          <Descriptions.Item label="Ek Saha Özelliği"><Tag color={needsOptions ? 'blue' : 'default'}>{labelOf(EXTRA_FIELD_DATATYPE_OPTS, field.fieldDataType)}</Tag></Descriptions.Item>
          <Descriptions.Item label="Takip Kodu">{field.trackingCode ?? '—'}</Descriptions.Item>
        </Descriptions>
        {!needsOptions && (
          <div style={{ marginTop: 10, fontSize: 12.5, color: '#cf8a00' }}>
            Not: Bu saha "{labelOf(EXTRA_FIELD_DATATYPE_OPTS, field.fieldDataType)}" tipinde — seçenek genelde Çoktan Seçmeli Sabit / Rehber için kullanılır.
          </div>
        )}
      </Card>

      <Card className="og-section-card" size="small" title={`Seçenekler (${options.length})`}>
        {writable && (
          <Space wrap style={{ marginBottom: 12 }} align="end">
            <div>
              <div style={{ fontSize: 12, color: '#888', marginBottom: 3 }}>Kod *</div>
              <Input style={{ width: 130 }} placeholder="Kod" value={draft.code} onChange={(e) => setDraft((d) => ({ ...d, code: e.target.value }))} onPressEnter={add} />
            </div>
            <div>
              <div style={{ fontSize: 12, color: '#888', marginBottom: 3 }}>Açıklama</div>
              <Input style={{ width: 220 }} placeholder="Açıklama" value={draft.description} onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))} onPressEnter={add} />
            </div>
            <div>
              <div style={{ fontSize: 12, color: '#888', marginBottom: 3 }}>Sıra</div>
              <InputNumber style={{ width: 80 }} value={draft.sortOrder} onChange={(v) => setDraft((d) => ({ ...d, sortOrder: v ?? undefined }))} />
            </div>
            <div>
              <div style={{ fontSize: 12, color: '#888', marginBottom: 3 }}>Referans</div>
              <Input style={{ width: 140 }} placeholder="Referans" value={draft.reference} onChange={(e) => setDraft((d) => ({ ...d, reference: e.target.value }))} onPressEnter={add} />
            </div>
            <Button type="primary" icon={<PlusOutlined />} onClick={add}>Ekle</Button>
          </Space>
        )}
        {options.length === 0 ? <Empty description="Seçenek yok" /> : (
          <Table<Option> dataSource={options} rowKey="id" size="small" pagination={false}
            columns={[
              { title: '#', dataIndex: 'id', width: 56 },
              { title: 'Kod', dataIndex: 'code' },
              { title: 'Açıklama', dataIndex: 'description', render: (v) => v ?? '—' },
              { title: 'Sıra', dataIndex: 'sortOrder', width: 70, render: (v) => v ?? '—' },
              { title: 'Referans', dataIndex: 'reference', render: (v) => v ?? '—' },
              ...(writable ? [{ title: '', key: 'x', width: 60, render: (_: unknown, row: Option) => <Typography.Link type="danger" onClick={() => remove(row.id)}>Sil</Typography.Link> }] : []),
            ]} />
        )}
      </Card>
    </div>
  )
}
