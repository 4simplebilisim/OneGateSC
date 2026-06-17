import { useCallback, useEffect, useState } from 'react'
import { App, Badge, Button, Card, Form, Input, InputNumber, Select, Space, Switch, Table } from 'antd'
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons'
import { axiosInstance } from '../providers/dataProvider'
import { canWrite } from '../formConfig'

export type LF = { name: string; label: string; type: 'ref' | 'bool' | 'number' | 'text' | 'select'; ref?: string; required?: boolean; options?: { value: string; label: string }[] }
type Opt = { value: number; label: string }

/**
 * Bir master'a ait alt-kayıt sekmesi — listele + ekle + sil, anında kaydeder.
 * ownerField+ownerId ile filtreler/ekler (ör. operationTypeId, productId).
 */
export function LinkTab({ ownerField, ownerId, resource, fields, extraActions }: {
  ownerField: string
  ownerId: string | number
  resource: string
  fields: LF[]
  extraActions?: (row: Record<string, unknown>) => React.ReactNode
}) {
  const { message } = App.useApp()
  const [form] = Form.useForm()
  const [rows, setRows] = useState<Record<string, unknown>[]>([])
  const [opts, setOpts] = useState<Record<string, Opt[]>>({})
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const writable = canWrite()

  const load = useCallback(() => {
    setLoading(true)
    axiosInstance.get(`/api/${resource}`, { params: { [ownerField]: ownerId } })
      .then((r) => setRows(Array.isArray(r.data) ? r.data : (r.data.data ?? [])))
      .finally(() => setLoading(false))
  }, [resource, ownerField, ownerId])

  useEffect(() => {
    load()
    const refs = [...new Set(fields.filter((f) => f.type === 'ref').map((f) => f.ref!))]
    refs.forEach((rr) => {
      axiosInstance.get(`/api/${rr}`, { params: { pageSize: 300 } }).then((r) => {
        const list = Array.isArray(r.data) ? r.data : (r.data.data ?? [])
        setOpts((p) => ({ ...p, [rr]: list.map((x: Record<string, unknown>) => ({ value: x.id as number, label: `${x.code ?? x.id}${x.name ? ' — ' + x.name : ''}` })) }))
      })
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resource, ownerId])

  const labelOf = (ref: string, id: unknown) => (id == null ? '—' : opts[ref]?.find((o) => o.value === id)?.label ?? `#${id}`)

  const add = async (vals: Record<string, unknown>) => {
    setAdding(true)
    try {
      await axiosInstance.post(`/api/${resource}`, { [ownerField]: Number(ownerId), ...vals })
      message.success('Eklendi')
      form.resetFields()
      load()
    } catch (e) {
      message.error((e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Eklenemedi')
    } finally { setAdding(false) }
  }
  const del = async (id: number) => {
    try { await axiosInstance.delete(`/api/${resource}/${id}`); message.success('Silindi'); load() }
    catch { message.error('Silinemedi') }
  }

  const columns = [
    ...fields.map((f) => ({
      title: f.label, dataIndex: f.name,
      render: (v: unknown) =>
        f.type === 'bool' ? (v ? <Badge status="success" text="Evet" /> : <span style={{ color: 'var(--og-muted)' }}>—</span>)
          : f.type === 'ref' ? labelOf(f.ref!, v)
            : f.type === 'select' ? (f.options?.find((o) => o.value === v)?.label ?? (v as string) ?? <span style={{ color: 'var(--og-muted)' }}>—</span>)
              : (v ?? <span style={{ color: 'var(--og-muted)' }}>—</span>),
    })),
    ...(extraActions ? [{ title: '', key: 'extra', render: (_: unknown, row: Record<string, unknown>) => extraActions(row) }] : []),
    ...(writable ? [{
      title: '', key: 'x', width: 50,
      render: (_: unknown, row: Record<string, unknown>) => (
        <Button size="small" type="text" danger icon={<DeleteOutlined />} onClick={() => del(row.id as number)} />
      ),
    }] : []),
  ]

  const ctrl = (f: LF) =>
    f.type === 'bool' ? <Switch />
      : f.type === 'number' ? <InputNumber style={{ width: 100 }} placeholder={f.label} />
        : f.type === 'text' ? <Input style={{ width: 160 }} placeholder={f.label} />
          : f.type === 'select' ? <Select style={{ minWidth: 130 }} options={f.options} allowClear placeholder={f.label} />
            : <Select style={{ minWidth: 180 }} options={opts[f.ref!] ?? []} showSearch optionFilterProp="label" allowClear placeholder={f.label} />

  return (
    <Space orientation="vertical" style={{ width: '100%' }} size={14}>
      {writable && (
        <Card size="small" style={{ background: 'var(--og-sunken)' }} styles={{ body: { padding: '10px 14px' } }}>
          <Form form={form} layout="inline" onFinish={add} style={{ rowGap: 8 }}>
            {fields.map((f) => (
              <Form.Item key={f.name} name={f.name} label={f.label} valuePropName={f.type === 'bool' ? 'checked' : 'value'} rules={f.required ? [{ required: true, message: '!' }] : []} style={{ marginBottom: 4 }}>
                {ctrl(f)}
              </Form.Item>
            ))}
            <Form.Item style={{ marginBottom: 4 }}>
              <Button type="primary" htmlType="submit" icon={<PlusOutlined />} loading={adding}>Ekle</Button>
            </Form.Item>
          </Form>
        </Card>
      )}
      <Table size="small" rowKey="id" loading={loading} dataSource={rows} columns={columns} pagination={false} locale={{ emptyText: 'Henüz kayıt yok' }} />
    </Space>
  )
}
