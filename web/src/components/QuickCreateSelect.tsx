import { useState } from 'react'
import { App, Button, ColorPicker, Divider, Form, Input, InputNumber, Modal, Select, Switch } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import { axiosInstance } from '../providers/dataProvider'
import { FORM_CONFIG, canWrite, type FieldDef } from '../formConfig'
import { RESOURCES } from '../resources'

type Opt = { value: number; label: string }

/**
 * Ref alanı + "Veri Yok" durumunda hızlı-ekle: dropdown footer'ında "+ Yeni Ekle" → modal (formConfig'i render eder)
 * → POST /api/<resource> (tenant/og_company örtük) → parent refetch + yeni kayıt otomatik seçilir.
 * Yalnız düz tanım varlıkları için (zorunlu iç-içe ref yoksa) hızlı-ekle açılır; aksi halde normal Select gibi davranır.
 */
export function QuickCreateSelect({ value, onChange, options, resource, onCreated, placeholder, disabled }: {
  value?: number
  onChange?: (v: number | undefined) => void
  options: Opt[]
  resource: string
  onCreated?: (newId: number) => void | Promise<void> // parent ref seçeneklerini yeniden çeker
  placeholder?: string
  disabled?: boolean
}) {
  const { message } = App.useApp()
  const [open, setOpen] = useState(false)
  const [selectOpen, setSelectOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [extraOpts, setExtraOpts] = useState<Opt[]>([]) // yeni eklenen kayıt parent refetch'i beklemeden anında seçilebilsin
  const [form] = Form.useForm()
  const mergedOptions = [...options, ...extraOpts.filter((e) => !options.some((o) => o.value === e.value))]
  const fields: FieldDef[] = FORM_CONFIG[resource] ?? []
  // Düz varlık şartı: formConfig var + zorunlu iç-içe ref yok (modalda nested ref çözmüyoruz)
  const hasRequiredRef = fields.some((f) => f.type === 'ref' && f.required)
  const canQuickAdd = !disabled && canWrite() && fields.length > 0 && !hasRequiredRef
  // Modalda yalnız düz alanlar (ref atlanır — opsiyonelse default kalır)
  const modalFields = fields.filter((f) => f.type !== 'ref')
  const label = RESOURCES.find((r) => r.name === resource)?.label ?? 'Kayıt'

  const submit = async () => {
    const vals = await form.validateFields()
    setSaving(true)
    try {
      const r = await axiosInstance.post(`/api/${resource}`, vals)
      message.success(`${label} eklendi`)
      setOpen(false)
      form.resetFields()
      // Yeni kaydı yerel seçeneklere ekle (anında görünür) + otomatik seç; parent refetch arka planda günceller
      const newOpt: Opt = { value: r.data.id, label: `${r.data.code ?? r.data.id}${r.data.name ? ' — ' + r.data.name : ''}` }
      setExtraOpts((p) => [...p, newOpt])
      onChange?.(r.data.id) // yeni kaydı otomatik seç
      onCreated?.(r.data.id) // parent ref seçeneklerini de tazele (await gerekmez)
    } catch (e) {
      message.error((e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Eklenemedi')
    } finally {
      setSaving(false)
    }
  }

  const ctrl = (f: FieldDef) => {
    if (f.type === 'number') return <InputNumber style={{ width: '100%' }} />
    if (f.type === 'select') return <Select options={f.options} allowClear placeholder="Seçiniz" />
    if (f.type === 'color') return <ColorPicker format="hex" showText />
    return <Input />
  }

  return (
    <>
      <Select
        value={value}
        onChange={onChange}
        options={mergedOptions}
        disabled={disabled}
        showSearch
        optionFilterProp="label"
        allowClear
        placeholder={placeholder ?? 'Seçiniz'}
        open={selectOpen}
        onOpenChange={setSelectOpen}
        popupRender={(menu) => (
          <>
            {menu}
            {canQuickAdd && (
              <>
                <Divider style={{ margin: '6px 0' }} />
                <Button type="text" icon={<PlusOutlined />} block style={{ textAlign: 'left' }} onMouseDown={(e) => e.preventDefault()} onClick={() => { setSelectOpen(false); setOpen(true) }}>
                  Yeni {label} Ekle
                </Button>
              </>
            )}
          </>
        )}
      />
      <Modal title={`Yeni ${label}`} open={open} onOk={submit} confirmLoading={saving} onCancel={() => setOpen(false)} okText="Kaydet" cancelText="İptal" destroyOnHidden>
        <Form form={form} layout="vertical" initialValues={modalFields.some((f) => f.name === 'isActive') ? { isActive: true } : undefined}>
          {modalFields.map((f) =>
            f.type === 'bool' ? (
              <Form.Item key={f.name} name={f.name} label={f.label} valuePropName="checked">
                <Switch />
              </Form.Item>
            ) : (
              <Form.Item key={f.name} name={f.name} label={f.label} rules={f.required ? [{ required: true, message: `${f.label} zorunlu` }] : []} getValueFromEvent={f.type === 'color' ? (c: unknown) => (typeof c === 'string' ? c : (c as { toHexString?: () => string })?.toHexString?.() ?? null) : undefined}>
                {ctrl(f)}
              </Form.Item>
            ),
          )}
        </Form>
      </Modal>
    </>
  )
}
