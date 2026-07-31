import { useCallback, useEffect, useState } from 'react'
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
  // Koşullu disable (disabledWhen): tetikleyici alanların güncel değerini izle → bağımlı alan tıklanamaz olsun (ör. Bağ.=Hepsi → Cari/Ürün)
  const [formVals, setFormVals] = useState<Record<string, unknown>>({})

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

  // Bir ref alanının seçeneklerini (opsiyonel parent filtresiyle: dependsOn) çek
  const loadRefOptions = useCallback((f: (typeof fields)[number], parentValue?: unknown) => {
    if (!f.refResource) return
    const params: Record<string, unknown> = { pageSize: 200 }
    // Ref'leri SEÇİLİ FİRMAYA göre daralt — liste tüm firmaları gösterir ama formda yalnız seçili firmanın kayıtları seçilebilir.
    // Super-admin firmayı değiştirince companyId değişir → ref'ler o firmaya göre yeniden çekilir.
    if (companyId) params.companyId = companyId
    if (f.dependsOn && parentValue != null) params[f.dependsOn] = parentValue
    axiosInstance.get(`/api/${f.refResource}`, { params }).then((r) => {
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId])

  useEffect(() => {
    // Bağımsız ref'leri yükle; bağımlı (dependsOn) olanlar parent seçilince (onValuesChange) / edit'te yüklenir
    fields.filter((f) => f.type === 'ref' && f.refResource && !f.dependsOn).forEach((f) => loadRefOptions(f))
    // companyId değişince (super-admin firma değiştirdi) ref seçenekleri o firmaya göre yeniden çekilir
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resource, companyId])

  useEffect(() => {
    if (mode === 'edit' && id) {
      axiosInstance.get(`/api/${resource}/${id}`).then((r) => {
        form.setFieldsValue(r.data)
        setFormVals(r.data ?? {})
        if (r.data?.companyId) setCompanyId(r.data.companyId)
        // bağımlı ref'leri (ör. Alan) parent değerine (Depo) göre yükle — seçili değer korunsun
        fields.filter((f) => f.type === 'ref' && f.dependsOn).forEach((f) => loadRefOptions(f, r.data?.[f.dependsOn!]))
      }).catch(() => message.error('Kayıt yüklenemedi — form boş açıldı (uç eksik ya da kayıt erişilemez)'))
    } else if (mode === 'create' && copyFrom) {
      // Kopyala: kimlik/zaman/kod alanlarını at → kod yeni girilsin. Kaynak satır state ile geldiyse refetch yok
      // (çoğu liste-kaynağında GET /:id yok); gelmemişse (deep-link) GET /:id'e düş.
      const apply = (data: Record<string, unknown>) => {
        const { id: _id, code: _code, createdAt: _c, updatedAt: _u, companyId: _co, createdById: _cb, ...rest } = data
        // null alanları ele — backend zod .optional() null kabul etmez (boş bırakılırsa undefined gider)
        const clean = Object.fromEntries(Object.entries(rest).filter(([, v]) => v !== null))
        form.setFieldsValue(clean)
        setFormVals(clean)
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
      // disabledWhen aktif alanları gönderme (ör. Bağ.=Hepsi → cariLinkId/materialLinkId anlamsız; zod optional → atılır)
      const payload = { ...values }
      fields.forEach((f) => { if (f.disabledWhen && payload[f.disabledWhen.field] === f.disabledWhen.equals) delete payload[f.name] })
      if (mode === 'create') {
        await axiosInstance.post(`/api/${resource}`, payload)
        message.success('Oluşturuldu')
      } else {
        const { code: _code, ...rest } = payload
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
    if (f.type === 'select') return <Select options={f.options} allowClear showSearch optionFilterProp="label" disabled={ro} />
    if (f.type === 'ref') return <Select options={refOptions[f.name] ?? []} showSearch optionFilterProp="label" placeholder="Seçiniz" disabled={ro} />
    if (f.type === 'textarea') return <Input.TextArea rows={10} style={{ fontFamily: 'Consolas, monospace', fontSize: 12.5 }} spellCheck={false} disabled={ro} />
    return <Input disabled={ro || (mode === 'edit' && f.name === 'code')} />
  }

  // Ekranda kanonik alan sırası: Firma (üstte, ayrı) → Tesis → Kod → Ad → (diğerleri config sırası, Aktif genelde sonda).
  // isActive'i hoist ETME — codeName'de zaten son; karmaşık formlarda (ör. ek saha) içeriğin önüne atlamasın.
  const FIELD_ORDER: Record<string, number> = { facilityId: 10, warehouseId: 12, areaId: 14, code: 20, name: 30 }
  // Kolon yetkisi: HIDDEN alanlar gizlenir, READONLY alanlar disabled (admin/super-admin bypass)
  const visibleFields = fields
    .filter((f) => columnMode(resource, f.name) !== 'HIDDEN')
    .sort((a, b) => (FIELD_ORDER[a.name] ?? 100) - (FIELD_ORDER[b.name] ?? 100))
  const isReadonly = (name: string) => columnMode(resource, name) === 'READONLY'
  // Alan tıklanamaz mı: kolon-yetkisi READONLY ya da disabledWhen koşulu sağlanıyor (ör. Bağ.=Hepsi → Cari/Ürün)
  const isFieldDisabled = (f: (typeof fields)[number]) =>
    isReadonly(f.name) || (!!f.disabledWhen && formVals[f.disabledWhen.field] === f.disabledWhen.equals)

  // ColorPicker onChange bir Color nesnesi verir → hex string'e çevir (backend string bekliyor)
  const toHex = (c: unknown) => (typeof c === 'string' ? c : (c as { toHexString?: () => string })?.toHexString?.() ?? null)

  // Yeni kayıtta "Aktif" toggle açık başlasın (tanımlamalar varsayılan aktif)
  const createDefaults: Record<string, unknown> = {}
  if (mode === 'create' && fields.some((f) => f.name === 'isActive' && f.type === 'bool')) createDefaults.isActive = true

  // Firma (tenant) alanı gösterilMEZ: kaynağın KENDİSİ tenant olduğunda (firma) ya da tenant kavramı geçmediğinde.
  const TENANT_EXEMPT = new Set(['companies'])
  const showFirma = !TENANT_EXEMPT.has(resource)

  // Master-detail kaynaklar: formun yanında alt-detay sayfası var → edit modunda erişim butonu (ör. Tolerans → kademe detayları)
  const DETAIL_SUBPAGE: Record<string, { label: string; path: (rid: string) => string }> = {
    'operation-tolerances': { label: 'Birim Detayı', path: (rid) => `/operation-tolerances/${rid}/details` },
  }
  const detailSub = DETAIL_SUBPAGE[resource]

  return (
    <div className="og-page" style={{ maxWidth: 820 }}>
      <PageHeader
        title={`${label} — ${mode === 'create' ? (copyFrom ? 'Kopyala' : 'Yeni kayıt') : 'Düzenle'}`}
        subtitle={mode === 'create' ? (copyFrom ? `#${copyFrom} kaydından kopyalandı — yeni bir kod girip kaydedin` : 'Alanları doldurup kaydedin') : `#${id} kaydı düzenleniyor`}
        extra={<Button icon={<ArrowLeftOutlined />} onClick={() => navigate(`/${resource}`)}>Liste</Button>}
      />
      <Form
        form={form}
        layout="vertical"
        onFinish={onFinish}
        initialValues={createDefaults}
        onValuesChange={(changed, all) => {
          setFormVals(all as Record<string, unknown>)
          // Bağımlı ref'ler (ör. Alan→Depo): parent değişince bağımlı alanı sıfırla + seçenekleri yeniden çek
          fields
            .filter((f) => f.type === 'ref' && f.dependsOn && f.dependsOn in changed)
            .forEach((f) => {
              form.setFieldValue(f.name, undefined)
              setRefOptions((prev) => ({ ...prev, [f.name]: [] }))
              const pv = (changed as Record<string, unknown>)[f.dependsOn!]
              if (pv != null) loadRefOptions(f, pv)
            })
          // disabledWhen tetikleyicisi değişince bağımlı alanı temizle (ör. Bağ.=Hepsi → Cari/Ürün seçimi sıfırlansın)
          fields
            .filter((f) => f.disabledWhen && f.disabledWhen.field in changed)
            .forEach((f) => { if ((changed as Record<string, unknown>)[f.disabledWhen!.field] === f.disabledWhen!.equals) form.setFieldValue(f.name, undefined) })
        }}
      >
        <Card className="og-section-card" size="small" title="Bilgiler">
          <Row gutter={[20, 0]}>
            {showFirma && (
              <Col xs={24} sm={12}>
                <Form.Item label="Firma (tenant)" tooltip={isSuper && mode === 'create' ? 'Kaydın ait olacağı firmayı (kiracı) seçin — tesisten ayrı boyut' : 'Kaydın ait olduğu firma (kiracı)'}>
                  {isSuper && mode === 'create'
                    ? <Select value={companyId ?? undefined} onChange={onFirmaChange} options={companies.map((c) => ({ value: c.id, label: `${c.code} — ${c.name}` }))} showSearch optionFilterProp="label" placeholder="Firma seçiniz" />
                    : <Input value={firmLabel} disabled />}
                </Form.Item>
              </Col>
            )}
            {visibleFields.map((f) =>
              f.type === 'bool' ? (
                <Col xs={24} sm={12} key={f.name} style={{ marginBottom: 14 }}>
                  <div className="og-switchrow" style={isFieldDisabled(f) ? { opacity: 0.5 } : undefined}>
                    <span className="og-switchrow__label">{f.label}</span>
                    <Form.Item name={f.name} valuePropName="checked" noStyle>
                      <Switch disabled={isFieldDisabled(f)} />
                    </Form.Item>
                  </div>
                </Col>
              ) : (
                <Col xs={24} sm={12} key={f.name}>
                  <Form.Item
                    name={f.name}
                    label={f.label}
                    rules={f.required && !isFieldDisabled(f) ? [{ required: true, message: `${f.label} zorunlu` }] : []}
                    getValueFromEvent={f.type === 'color' ? toHex : undefined}
                  >
                    {control(f, isFieldDisabled(f))}
                  </Form.Item>
                </Col>
              ),
            )}
          </Row>
        </Card>
        <div className="og-formbar">
          <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={submitting}>Kaydet</Button>
          <Button onClick={() => navigate(`/${resource}`)}>İptal</Button>
          {mode === 'edit' && detailSub && id && (
            <Button onClick={() => navigate(detailSub.path(String(id)))}>{detailSub.label} →</Button>
          )}
        </div>
      </Form>
    </div>
  )
}
