import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { App, Button, Card, Empty, Input, InputNumber, Select, Space, Spin, Switch, Table, Typography } from 'antd'
import { ArrowLeftOutlined, PlusOutlined } from '@ant-design/icons'
import { axiosInstance } from '../providers/dataProvider'
import { PageHeader } from '../components/PageHeader'
import { canWrite, FORM_CONFIG, type FieldDef } from '../formConfig'

type Opt = { value: number; label: string }
type Cfg = { resource: string; ownerField: string; ownerResource: string; backTo: string; title: string; subtitle?: string }

// Genel "sahip kayıt + satırları" yöneticisi — Kontrol Sayım / Palet Bildirim satırları için (ExtraFieldOptions deseninin generic hali).
export const OwnerLines = ({ resource, ownerField, ownerResource, backTo, title, subtitle }: Cfg) => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { message } = App.useApp()
  const fields = (FORM_CONFIG[resource] ?? []).filter((f) => f.name !== ownerField && f.name !== 'isActive')
  const [rows, setRows] = useState<Record<string, unknown>[]>([])
  const [owner, setOwner] = useState<Record<string, unknown> | null>(null)
  const [refOpts, setRefOpts] = useState<Record<string, Opt[]>>({})
  const [draft, setDraft] = useState<Record<string, unknown>>({})
  const [loading, setLoading] = useState(true)
  const writable = canWrite()

  const load = useCallback(() => {
    setLoading(true)
    Promise.all([
      axiosInstance.get(`/api/${ownerResource}/${id}`).catch(() => ({ data: null })),
      axiosInstance.get(`/api/${resource}`, { params: { [ownerField]: id } }),
    ])
      .then(([o, l]) => {
        setOwner(o.data)
        setRows(Array.isArray(l.data) ? l.data : (l.data.data ?? []))
      })
      .catch((e) => message.error(e?.response?.data?.error ?? 'Yüklenemedi'))
      .finally(() => setLoading(false))
  }, [id, resource, ownerResource, ownerField, message])

  useEffect(load, [load])
  useEffect(() => {
    fields.filter((f) => f.type === 'ref' && f.refResource).forEach((f) => {
      axiosInstance.get(`/api/${f.refResource}`, { params: { pageSize: 500 } }).then((r) => {
        const list = Array.isArray(r.data) ? r.data : (r.data.data ?? [])
        setRefOpts((p) => ({ ...p, [f.name]: list.map((x: Record<string, unknown>) => ({ value: x.id as number, label: `${x.code ?? x.id}${x.name ? ' — ' + x.name : ''}` })) }))
      })
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resource])

  const add = async () => {
    const required = fields.filter((f) => f.required).find((f) => draft[f.name] == null || draft[f.name] === '')
    if (required) { message.warning(`${required.label} zorunlu`); return }
    try {
      await axiosInstance.post(`/api/${resource}`, { [ownerField]: Number(id), ...draft })
      setDraft({})
      message.success('Satır eklendi')
      load()
    } catch (e) {
      message.error((e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Eklenemedi')
    }
  }

  const remove = async (rid: number) => {
    try { await axiosInstance.delete(`/api/${resource}/${rid}`); message.success('Silindi'); load() } catch { message.error('Silinemedi') }
  }

  const control = (f: FieldDef) => {
    const v = draft[f.name]
    if (f.type === 'number') return <InputNumber style={{ width: 110 }} value={v as number} onChange={(x) => setDraft((d) => ({ ...d, [f.name]: x ?? undefined }))} />
    if (f.type === 'bool') return <Switch checked={!!v} onChange={(x) => setDraft((d) => ({ ...d, [f.name]: x }))} />
    if (f.type === 'select') return <Select style={{ minWidth: 130 }} allowClear options={f.options} value={v as string} onChange={(x) => setDraft((d) => ({ ...d, [f.name]: x }))} />
    if (f.type === 'ref') return <Select style={{ minWidth: 180 }} showSearch optionFilterProp="label" allowClear options={refOpts[f.name] ?? []} value={v as number} onChange={(x) => setDraft((d) => ({ ...d, [f.name]: x }))} placeholder="Seçiniz" />
    return <Input style={{ width: 130 }} value={v as string} onChange={(e) => setDraft((d) => ({ ...d, [f.name]: e.target.value }))} />
  }

  if (loading) return <div style={{ padding: 80, textAlign: 'center' }}><Spin size="large" /></div>

  const cell = (f: FieldDef, row: Record<string, unknown>) => {
    const v = row[f.name]
    if (v == null || v === '') return '—'
    if (f.type === 'ref') return (refOpts[f.name]?.find((o) => o.value === v)?.label) ?? `#${v}`
    if (f.type === 'bool') return v ? 'Evet' : 'Hayır'
    if (f.type === 'select') return f.options?.find((o) => String(o.value) === String(v))?.label ?? String(v)
    return String(v)
  }

  return (
    <div className="og-page" style={{ maxWidth: 1000 }}>
      <PageHeader
        title={`${title}${owner?.code ? ' — ' + owner.code : owner?.palletNo ? ' — ' + owner.palletNo : ` #${id}`}`}
        subtitle={subtitle ?? 'Satır yönetimi'}
        extra={<Button icon={<ArrowLeftOutlined />} onClick={() => navigate(backTo)}>Liste</Button>}
      />
      <Card className="og-section-card" size="small" title={`Satırlar (${rows.length})`}>
        {writable && (
          <Space wrap align="end" style={{ marginBottom: 12 }}>
            {fields.map((f) => (
              <div key={f.name}>
                <div style={{ fontSize: 12, color: '#888', marginBottom: 3 }}>{f.label}{f.required ? ' *' : ''}</div>
                {control(f)}
              </div>
            ))}
            <Button type="primary" icon={<PlusOutlined />} onClick={add}>Ekle</Button>
          </Space>
        )}
        {rows.length === 0 ? <Empty description="Satır yok" /> : (
          <Table dataSource={rows} rowKey="id" size="small" pagination={false} scroll={{ x: true }}
            columns={[
              { title: '#', dataIndex: 'id', width: 56 },
              ...fields.map((f) => ({ title: f.label, key: f.name, render: (_: unknown, row: Record<string, unknown>) => cell(f, row) })),
              ...(writable ? [{ title: '', key: 'x', width: 56, render: (_: unknown, row: Record<string, unknown>) => <Typography.Link type="danger" onClick={() => remove(row.id as number)}>Sil</Typography.Link> }] : []),
            ]} />
        )}
      </Card>
    </div>
  )
}
