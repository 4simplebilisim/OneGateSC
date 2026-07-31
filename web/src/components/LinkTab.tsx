import { useCallback, useEffect, useState } from 'react'
import { App, Badge, Button, Card, Form, Input, InputNumber, Select, Space, Switch, Table, Tooltip } from 'antd'
import { PlusOutlined, DeleteOutlined, EditOutlined, CopyOutlined, SaveOutlined, CloseOutlined } from '@ant-design/icons'
import { axiosInstance } from '../providers/dataProvider'
import { canWrite } from '../formConfig'

export type LF = { name: string; label: string; type: 'ref' | 'bool' | 'number' | 'text' | 'select'; ref?: string; required?: boolean; options?: { value: string; label: string }[]; disabled?: boolean; disabledWhen?: { field: string; equals: unknown } }
type Opt = { value: number; label: string }

/**
 * Bir master'a ait alt-kayıt sekmesi — listele + ekle + DÜZELT + KOPYALA + sil, anında kaydeder.
 * ownerField+ownerId ile filtreler/ekler (ör. operationTypeId, productId).
 * Düzelt/Kopyala VARSAYILAN açık (kullanıcı kuralı: kayıt eklenen her ekranda düzelt+kopyala olmalı).
 */
export function LinkTab({ ownerField, ownerId, resource, fields, defaults, confirmOn, extraActions, uniqueField }: {
  ownerField: string
  ownerId: string | number
  resource: string
  fields: LF[]
  defaults?: Record<string, unknown> // owner'dan devralınan örtük alanlar (ör. operasyon tipinin facilityId'si) — kullanıcı tekrar girmez
  confirmOn?: (vals: Record<string, unknown>, rows: Record<string, unknown>[]) => string | null // eklemeden önce onay gerekiyorsa mesaj döndür
  extraActions?: (row: Record<string, unknown>) => React.ReactNode
  uniqueField?: string // bu alan listede TEKİL olmalı (ör. unitId) — kullanılan değerler ekleme dropdown'ından çıkar + ekleme/düzeltmede engellenir
}) {
  const { message, modal } = App.useApp()
  const [form] = Form.useForm()
  const [rows, setRows] = useState<Record<string, unknown>[]>([])
  const [opts, setOpts] = useState<Record<string, Opt[]>>({})
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [vals, setVals] = useState<Record<string, unknown>>({}) // ekleme formu canlı değerleri — koşullu disable için (disabledWhen)
  const [editId, setEditId] = useState<number | null>(null) // null = yeni ekle; sayı = o kaydı düzenle (Güncelle)
  const writable = canWrite()
  // Bir alan disabled mı: doğrudan disabled VEYA disabledWhen koşulu (ör. Cari Bağ=Hepsi → Cari kapalı)
  const isDisabled = (f: LF) => !!f.disabled || (!!f.disabledWhen && vals[f.disabledWhen.field] === f.disabledWhen.equals)

  const load = useCallback(() => {
    setLoading(true)
    axiosInstance.get(`/api/${resource}`, { params: { [ownerField]: ownerId } })
      .then((r) => setRows(Array.isArray(r.data) ? r.data : (r.data.data ?? [])))
      .finally(() => setLoading(false))
  }, [resource, ownerField, ownerId])

  useEffect(() => {
    load()
    const refs = [...new Set(fields.filter((f) => f.type === 'ref').map((f) => f.ref!))]
    const cid = Number(localStorage.getItem('og_company')) || undefined // alt-kayıt ref'leri aktif firmaya scoped
    refs.forEach((rr) => {
      axiosInstance.get(`/api/${rr}`, { params: { pageSize: 300, companyId: cid } }).then((r) => {
        const list = Array.isArray(r.data) ? r.data : (r.data.data ?? [])
        setOpts((p) => ({ ...p, [rr]: list.map((x: Record<string, unknown>) => ({ value: x.id as number, label: `${x.code ?? x.id}${x.name ? ' — ' + x.name : ''}` })) }))
      })
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resource, ownerId])

  const labelOf = (ref: string, id: unknown) => (id == null ? '—' : opts[ref]?.find((o) => o.value === id)?.label ?? `#${id}`)

  // uniqueField için: forma yüklü/düzenlenen satır HARİÇ kullanılan değerler → dropdown'dan çıkarılır + ekleme/düzeltmede engellenir
  const usedUnique = uniqueField ? rows.filter((r) => r.id !== editId).map((r) => r[uniqueField!]) : []

  const resetForm = () => { form.resetFields(); setVals({}); setEditId(null) }

  const submit = async (formVals: Record<string, unknown>) => {
    const warn = confirmOn?.(formVals, rows)
    if (warn) {
      const proceed = await new Promise<boolean>((resolve) => {
        modal.confirm({ title: 'Onay gerekiyor', content: warn, okText: 'Evet, değiştir', cancelText: 'Vazgeç', onOk: () => resolve(true), onCancel: () => resolve(false) })
      })
      if (!proceed) return
    }
    // disabled alanları gönderme + number alanları sayıya zorla (Decimal API'den string gelebilir → zod "expected number" 400'ü önler)
    const clean: Record<string, unknown> = { ...formVals }
    fields.forEach((f) => {
      if (isDisabled(f)) { delete clean[f.name]; return }
      if (f.type === 'number' && typeof clean[f.name] === 'string' && clean[f.name] !== '') clean[f.name] = Number(clean[f.name])
    })
    // Tekillik: aynı değer (düzenlenen hariç) başka satırda varsa engelle
    if (uniqueField && clean[uniqueField] != null && usedUnique.includes(clean[uniqueField])) {
      message.error(`Bu ${fields.find((f) => f.name === uniqueField)?.label ?? uniqueField} zaten eklenmiş — aynı değerden ikinci satır olamaz`)
      return
    }
    setBusy(true)
    try {
      if (editId != null) {
        await axiosInstance.patch(`/api/${resource}/${editId}`, clean)
        message.success('Güncellendi')
      } else {
        await axiosInstance.post(`/api/${resource}`, { [ownerField]: Number(ownerId), ...(defaults ?? {}), ...clean })
        message.success('Eklendi')
      }
      resetForm()
      load()
    } catch (e) {
      message.error((e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'İşlem başarısız')
    } finally { setBusy(false) }
  }

  // API satırını form değerlerine çevir — yalnız form alanları + number'lar string'den sayıya (Decimal API'den string gelir)
  const toForm = (row: Record<string, unknown>) => {
    const out: Record<string, unknown> = {}
    fields.forEach((f) => {
      let v = row[f.name]
      if (f.type === 'number' && typeof v === 'string' && v !== '') v = Number(v)
      out[f.name] = v
    })
    return out
  }
  // Düzelt: satırı forma yükle, Güncelle moduna geç
  const startEdit = (row: Record<string, unknown>) => {
    setEditId(row.id as number)
    const fv = toForm(row)
    setVals(fv)
    form.setFieldsValue(fv)
  }
  // Kopyala: satırı forma yükle ama YENİ kayıt olarak (id yok) — tekil alan boş bırakılır (ikinci kez seçilemez)
  const startCopy = (row: Record<string, unknown>) => {
    setEditId(null)
    const fv = toForm(row)
    if (uniqueField) delete fv[uniqueField]
    setVals(fv)
    form.resetFields()
    form.setFieldsValue(fv)
  }
  const del = async (id: number) => {
    try { await axiosInstance.delete(`/api/${resource}/${id}`); message.success('Silindi'); if (editId === id) resetForm(); load() }
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
      title: '', key: 'x', width: 118,
      render: (_: unknown, row: Record<string, unknown>) => (
        <Space size={0}>
          <Tooltip title="Düzelt"><Button size="small" type="text" icon={<EditOutlined />} onClick={() => startEdit(row)} /></Tooltip>
          <Tooltip title="Kopyala"><Button size="small" type="text" icon={<CopyOutlined />} onClick={() => startCopy(row)} /></Tooltip>
          <Tooltip title="Sil"><Button size="small" type="text" danger icon={<DeleteOutlined />} onClick={() => del(row.id as number)} /></Tooltip>
        </Space>
      ),
    }] : []),
  ]

  const ctrl = (f: LF) =>
    f.type === 'bool' ? <Switch disabled={isDisabled(f)} />
      : f.type === 'number' ? <InputNumber style={{ width: 100 }} placeholder={f.label} disabled={isDisabled(f)} />
        : f.type === 'text' ? <Input style={{ width: 160 }} placeholder={f.label} disabled={isDisabled(f)} />
          : f.type === 'select' ? <Select style={{ minWidth: 130 }} options={f.options} allowClear placeholder={f.label} disabled={isDisabled(f)} />
            : <Select style={{ minWidth: 180 }} options={(opts[f.ref!] ?? []).filter((o) => f.name !== uniqueField || !usedUnique.includes(o.value))} showSearch optionFilterProp="label" allowClear placeholder={f.label} disabled={isDisabled(f)} />

  return (
    <Space orientation="vertical" style={{ width: '100%' }} size={14}>
      {writable && (
        <Card size="small" style={{ background: 'var(--og-sunken)', ...(editId != null ? { borderColor: 'var(--og-primary, #6D5DF6)' } : {}) }} styles={{ body: { padding: '10px 14px' } }}>
          <Form form={form} layout="inline" onFinish={submit} onValuesChange={(_, all) => setVals(all)} style={{ rowGap: 8 }}>
            {fields.map((f) => (
              <Form.Item key={f.name} name={f.name} label={f.label} valuePropName={f.type === 'bool' ? 'checked' : 'value'} rules={f.required && !isDisabled(f) ? [{ required: true, message: '!' }] : []} style={{ marginBottom: 4 }}>
                {ctrl(f)}
              </Form.Item>
            ))}
            <Form.Item style={{ marginBottom: 4 }}>
              <Space size={8}>
                <Button type="primary" htmlType="submit" icon={editId != null ? <SaveOutlined /> : <PlusOutlined />} loading={busy}>
                  {editId != null ? 'Güncelle' : 'Ekle'}
                </Button>
                {editId != null && <Button icon={<CloseOutlined />} onClick={resetForm}>Vazgeç</Button>}
              </Space>
            </Form.Item>
          </Form>
        </Card>
      )}
      <Table size="small" rowKey="id" loading={loading} dataSource={rows} columns={columns} pagination={false} locale={{ emptyText: 'Henüz kayıt yok' }} />
    </Space>
  )
}
