import { useEffect, useState } from 'react'
import { useNavigate, useParams, useSearchParams, useLocation } from 'react-router-dom'
import { App, Button, Card, Col, Form, Input, InputNumber, Row, Select, Switch, ColorPicker } from 'antd'
import { ArrowLeftOutlined, SaveOutlined } from '@ant-design/icons'
import { axiosInstance } from '../providers/dataProvider'
import { PageHeader } from '../components/PageHeader'
import { columnMode } from '../columnAuth'
import { FORM_CONFIG } from '../formConfig'
import { RESOURCES } from '../resources'

type RefOpts = Record<string, { value: number; label: string }[]>

export const GenericForm = ({ resource, mode }: { resource: string; mode: 'create' | 'edit' }) => {
  const { id } = useParams()
  const [search] = useSearchParams()
  const copyFrom = search.get('copyFrom')
  const location = useLocation()
  const navigate = useNavigate()
  const { message } = App.useApp()
  const [form] = Form.useForm()
  const fields = FORM_CONFIG[resource] ?? []
  const label = RESOURCES.find((r) => r.name === resource)?.label ?? resource
  const [refOptions, setRefOptions] = useState<RefOpts>({})
  const [submitting, setSubmitting] = useState(false)

  // Firma (tenant) — çok-kiracılık katmanı (companyId). Legacy LNGDISTKOD=TESİS'ten AYRI bir boyut:
  // farklı firmalar aynı DB'yi paylaşır → tenant ayrı, tesis ayrı.
  // Super-admin yeni kayıtta firmayı seçebilir; normal admin tek firmasına kilitli (salt-okunur).
  const isSuper = (() => { try { return !!JSON.parse(localStorage.getItem('og_user') ?? 'null')?.isSuperAdmin } catch { return false } })()
  const [companies, setCompanies] = useState<{ id: number; code: string; name: string }[]>([])
  const [companyId, setCompanyId] = useState<number | null>(Number(localStorage.getItem('og_company')) || null)
  useEffect(() => {
    axiosInstance.get('/api/companies').then((r) => setCompanies((Array.isArray(r.data) ? r.data : (r.data.data ?? [])) as { id: number; code: string; name: string }[])).catch(() => { /* tek firma / yetki yok */ })
  }, [])
  const firmLabel = (() => { const c = companies.find((x) => x.id === companyId); return c ? `${c.code} — ${c.name}` : (companyId ? `#${companyId}` : '—') })()

  useEffect(() => {
    fields
      .filter((f) => f.type === 'ref' && f.refResource)
      .forEach((f) => {
        axiosInstance.get(`/api/${f.refResource}`, { params: { pageSize: 200 } }).then((r) => {
          const raw = Array.isArray(r.data) ? r.data : (r.data.data ?? [])
          const rows = f.refFilter ? raw.filter(f.refFilter) : raw
          setRefOptions((prev) => ({
            ...prev,
            // code/name yoksa description/trackingCode'a düş (ör. Ek Saha)
            [f.name]: rows.map((x: Record<string, unknown>) => ({
              value: x.id as number,
              label: x.code ? `${x.code}${x.name ? ' — ' + x.name : ''}` : String(x.palletNo ?? x.documentNo ?? x.countNo ?? x.orderNo ?? x.username ?? x.description ?? x.trackingCode ?? `#${x.id}`),
            })),
          }))
        })
      })
    // companyId değişince (super-admin firma değiştirdi) ref seçenekleri o firmaya göre yeniden çekilir
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resource, companyId])

  useEffect(() => {
    if (mode === 'edit' && id) {
      axiosInstance.get(`/api/${resource}/${id}`).then((r) => { form.setFieldsValue(r.data); if (r.data?.companyId) setCompanyId(r.data.companyId) })
    } else if (mode === 'create' && copyFrom) {
      // Kopyala: kimlik/zaman/kod alanlarını at → kod yeni girilsin. Kaynak satır state ile geldiyse refetch yok
      // (çoğu liste-kaynağında GET /:id yok); gelmemişse (deep-link) GET /:id'e düş.
      const apply = (data: Record<string, unknown>) => {
        const { id: _id, code: _code, createdAt: _c, updatedAt: _u, companyId: _co, createdById: _cb, ...rest } = data
        // null alanları ele — backend zod .optional() null kabul etmez (boş bırakılırsa undefined gider)
        form.setFieldsValue(Object.fromEntries(Object.entries(rest).filter(([, v]) => v !== null)))
      }
      const src = (location.state as { copySource?: Record<string, unknown> } | null)?.copySource
      if (src) apply(src)
      else axiosInstance.get(`/api/${resource}/${copyFrom}`).then((r) => apply(r.data)).catch(() => { /* GET /:id yoksa boş başla */ })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, id, resource, copyFrom])

  // Super-admin firmayı değiştirince: global tenant bağlamını (og_company) hizala — switcher yok —
  // ki ref alanları (Tesisler vb.) seçilen firmaya göre yeniden çekilsin; eski firmaya ait seçimleri temizle.
  const onFirmaChange = (v: number) => {
    setCompanyId(v)
    localStorage.setItem('og_company', String(v))
    const refNames = fields.filter((f) => f.type === 'ref').map((f) => f.name)
    if (refNames.length) form.resetFields(refNames)
  }

  const onFinish = async (values: Record<string, unknown>) => {
    setSubmitting(true)
    try {
      if (mode === 'create') {
        await axiosInstance.post(`/api/${resource}`, values)
        message.success('Oluşturuldu')
      } else {
        const { code: _code, ...rest } = values
        await axiosInstance.patch(`/api/${resource}/${id}`, rest)
        message.success('Güncellendi')
      }
      navigate(`/${resource}`)
    } catch (e) {
      message.error((e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'İşlem başarısız')
    } finally {
      setSubmitting(false)
    }
  }

  const control = (f: (typeof fields)[number], ro: boolean) => {
    if (f.type === 'number') return <InputNumber style={{ width: '100%' }} disabled={ro} />
    if (f.type === 'bool') return <Switch disabled={ro} />
    if (f.type === 'color') return <ColorPicker format="hex" showText disabled={ro} />
    if (f.type === 'select') return <Select options={f.options} allowClear disabled={ro} />
    if (f.type === 'ref') return <Select options={refOptions[f.name] ?? []} showSearch optionFilterProp="label" placeholder="Seçiniz" disabled={ro} />
    return <Input disabled={ro || (mode === 'edit' && f.name === 'code')} />
  }

  // Ekranda kanonik alan sırası: Firma (üstte, ayrı) → Tesis → Kod → Ad → Aktif → (diğerleri config sırası).
  // İlk sorulan bilgiler tutarlı olsun diye tüm tanımlama formlarında aynı düzen.
  const FIELD_ORDER: Record<string, number> = { facilityId: 10, code: 20, name: 30, isActive: 40 }
  // Kolon yetkisi: HIDDEN alanlar gizlenir, READONLY alanlar disabled (admin/super-admin bypass)
  const visibleFields = fields
    .filter((f) => columnMode(resource, f.name) !== 'HIDDEN')
    .sort((a, b) => (FIELD_ORDER[a.name] ?? 100) - (FIELD_ORDER[b.name] ?? 100))
  const isReadonly = (name: string) => columnMode(resource, name) === 'READONLY'

  // ColorPicker onChange bir Color nesnesi verir → hex string'e çevir (backend string bekliyor)
  const toHex = (c: unknown) => (typeof c === 'string' ? c : (c as { toHexString?: () => string })?.toHexString?.() ?? null)

  // Yeni kayıtta "Aktif" toggle açık başlasın (tanımlamalar varsayılan aktif)
  const createDefaults: Record<string, unknown> = {}
  if (mode === 'create' && fields.some((f) => f.name === 'isActive' && f.type === 'bool')) createDefaults.isActive = true

  return (
    <div className="og-page" style={{ maxWidth: 820 }}>
      <PageHeader
        title={`${label} — ${mode === 'create' ? (copyFrom ? 'Kopyala' : 'Yeni kayıt') : 'Düzenle'}`}
        subtitle={mode === 'create' ? (copyFrom ? `#${copyFrom} kaydından kopyalandı — yeni bir kod girip kaydedin` : 'Alanları doldurup kaydedin') : `#${id} kaydı düzenleniyor`}
        extra={<Button icon={<ArrowLeftOutlined />} onClick={() => navigate(`/${resource}`)}>Liste</Button>}
      />
      <Form form={form} layout="vertical" onFinish={onFinish} initialValues={createDefaults}>
        <Card className="og-section-card" size="small" title="Bilgiler">
          <Row gutter={[20, 0]}>
            <Col xs={24} sm={12}>
              <Form.Item label="Firma (tenant)" tooltip={isSuper && mode === 'create' ? 'Kaydın ait olacağı firmayı (kiracı) seçin — tesisten ayrı boyut' : 'Kaydın ait olduğu firma (kiracı)'}>
                {isSuper && mode === 'create'
                  ? <Select value={companyId ?? undefined} onChange={onFirmaChange} options={companies.map((c) => ({ value: c.id, label: `${c.code} — ${c.name}` }))} showSearch optionFilterProp="label" placeholder="Firma seçiniz" />
                  : <Input value={firmLabel} disabled />}
              </Form.Item>
            </Col>
            {visibleFields.map((f) =>
              f.type === 'bool' ? (
                <Col xs={24} sm={12} key={f.name} style={{ marginBottom: 14 }}>
                  <div className="og-switchrow">
                    <span className="og-switchrow__label">{f.label}</span>
                    <Form.Item name={f.name} valuePropName="checked" noStyle>
                      <Switch disabled={isReadonly(f.name)} />
                    </Form.Item>
                  </div>
                </Col>
              ) : (
                <Col xs={24} sm={12} key={f.name}>
                  <Form.Item
                    name={f.name}
                    label={f.label}
                    rules={f.required ? [{ required: true, message: `${f.label} zorunlu` }] : []}
                    getValueFromEvent={f.type === 'color' ? toHex : undefined}
                  >
                    {control(f, isReadonly(f.name))}
                  </Form.Item>
                </Col>
              ),
            )}
          </Row>
        </Card>
        <div className="og-formbar">
          <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={submitting}>Kaydet</Button>
          <Button onClick={() => navigate(`/${resource}`)}>İptal</Button>
        </div>
      </Form>
    </div>
  )
}
