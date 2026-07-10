import { useEffect, useMemo, useState } from 'react'
import { App, Alert, Button, Card, Col, Divider, Form, Input, InputNumber, Row, Select, Space, Switch, Table, Tabs, Tag, Typography } from 'antd'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { axiosInstance } from '../providers/dataProvider'
import { PageHeader } from '../components/PageHeader'
import { LinkTab, type LF } from '../components/LinkTab'

const MODES = [
  { value: 'EAN', label: 'EAN — Ürün barkodu (tam eşleşme)' },
  { value: 'PALLET', label: 'Palet — stoktan doldur' },
  { value: 'SEGMENT', label: 'Segment — gömülü alanlar' },
]
const FIELD_OPTS = [
  { value: 'PRODUCT', label: 'Ürün' }, { value: 'QUANTITY', label: 'Miktar' }, { value: 'UNIT', label: 'Birim' },
  { value: 'BATCH', label: 'Lot / Parti' }, { value: 'PRODUCTION', label: 'Üretim Tarihi' }, { value: 'EXPIRY', label: 'SKT' },
  { value: 'PALLET', label: 'Palet' }, { value: 'SERIAL', label: 'Seri' }, { value: 'IGNORE', label: 'Yoksay' },
]
const PARSE_OPTS = [{ value: 'UNTIL', label: 'Ayraca kadar' }, { value: 'FIXED', label: 'Sabit N karakter' }]
const DATEFMT_OPTS = [
  { value: 'YYAAGG', label: 'YYAAGG (260714)' }, { value: 'GGAAYY', label: 'GGAAYY (140726)' },
  { value: 'YYYYAAGG', label: 'YYYYAAGG (20260714)' },
]
const FIELD_LBL: Record<string, string> = Object.fromEntries(FIELD_OPTS.map((o) => [o.value, o.label]))

const SEGMENT_FIELDS: LF[] = [
  { name: 'sortOrder', label: 'Sıra', type: 'number' },
  { name: 'field', label: 'Alan', type: 'select', required: true, options: FIELD_OPTS },
  { name: 'parseType', label: 'Ayrıştırma', type: 'select', options: PARSE_OPTS },
  { name: 'length', label: 'Uzunluk', type: 'number', disabledWhen: { field: 'parseType', equals: 'UNTIL' } },
  { name: 'separator', label: 'Ayraç', type: 'text', disabledWhen: { field: 'parseType', equals: 'FIXED' } },
  { name: 'dateFormat', label: 'Tarih Formatı', type: 'select', options: DATEFMT_OPTS },
]

type Facility = { id: number; code: string; name: string | null }

// Barkod tipi (kural) yönetim ekranı: eşleşme + mod + ayraç + Segmentler (LinkTab) + canlı Test.
export const BarcodeTypeForm = ({ mode }: { mode: 'create' | 'edit' }) => {
  const { id } = useParams()
  const [search] = useSearchParams()
  const copyFrom = search.get('copyFrom') // Kopyala: alanlar + SEGMENTLER kaynak tipten kopyalanır (kod hariç)
  const navigate = useNavigate()
  const { message } = App.useApp()
  const [form] = Form.useForm()
  const [submitting, setSubmitting] = useState(false)
  const [tab, setTab] = useState('def')
  const modeVal = (Form.useWatch('mode', form) ?? 'EAN') as string

  const isSuper = useMemo(() => { try { return !!JSON.parse(localStorage.getItem('og_user') ?? 'null')?.isSuperAdmin } catch { return false } }, [])
  const [companies, setCompanies] = useState<{ id: number; code: string; name: string }[]>([])
  const [companyId, setCompanyId] = useState<number | null>(Number(localStorage.getItem('og_company')) || null)
  const [facilities, setFacilities] = useState<Facility[]>([])

  useEffect(() => { axiosInstance.get('/api/companies').then((r) => setCompanies(Array.isArray(r.data) ? r.data : (r.data.data ?? []))).catch(() => {}) }, [])
  useEffect(() => {
    axiosInstance.get('/api/facilities', { params: { pageSize: 300, companyId: companyId || undefined } })
      .then((r) => setFacilities(Array.isArray(r.data) ? r.data : (r.data.data ?? []))).catch(() => setFacilities([]))
  }, [companyId])

  useEffect(() => {
    if (mode === 'edit' && id) axiosInstance.get(`/api/barcode-types/${id}`).then((r) => { form.setFieldsValue(r.data); if (r.data?.companyId) setCompanyId(r.data.companyId) })
    else if (mode === 'create' && copyFrom) {
      // Kopyala: tanım alanlarını çek; kimlik/kod/zaman at (null'ları da ele — zod .nullish kabul eder ama form temiz kalsın)
      axiosInstance.get(`/api/barcode-types/${copyFrom}`).then((r) => {
        const { id: _id, code: _code, companyId: _co, createdAt: _c, updatedAt: _u, ...rest } = r.data
        form.setFieldsValue(Object.fromEntries(Object.entries(rest).filter(([, v]) => v !== null)))
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, id, copyFrom])

  const onFinish = async (values: Record<string, unknown>) => {
    setSubmitting(true)
    try {
      // null opsiyonelleri ele (zod .nullish() kabul eder ama temiz gönderelim)
      const body = { ...values }
      if (mode === 'edit' && id) {
        await axiosInstance.patch(`/api/barcode-types/${id}`, body)
        message.success('Kaydedildi')
      } else {
        const r = await axiosInstance.post('/api/barcode-types', body)
        // Kopyala akışı: kaynak tipin SEGMENTLERİ de yeni tipe kopyalanır (barkod tipinin kalbi segmentler)
        if (copyFrom) {
          const segs = await axiosInstance.get('/api/barcode-segments', { params: { barcodeTypeId: copyFrom } })
          const rows = (Array.isArray(segs.data) ? segs.data : (segs.data.data ?? [])) as Record<string, unknown>[]
          for (const s of rows) {
            const { id: _id, companyId: _co, barcodeTypeId: _bt, createdAt: _c, updatedAt: _u, ...seg } = s
            await axiosInstance.post('/api/barcode-segments', { barcodeTypeId: r.data.id, ...Object.fromEntries(Object.entries(seg).filter(([, v]) => v !== null)) })
          }
          message.success(rows.length ? `Oluşturuldu — ${rows.length} segment kopyalandı` : 'Oluşturuldu')
        } else {
          message.success('Oluşturuldu — segment eklemek için Segmentler sekmesine geçin')
        }
        navigate(`/barcode-types/${r.data.id}/edit`)
      }
    } catch (e) {
      message.error((e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Kaydedilemedi')
    } finally { setSubmitting(false) }
  }

  const segmentsEnabled = mode === 'edit' && !!id && modeVal === 'SEGMENT'

  const defTab = (
    <Card size="small" variant="outlined">
      <Form form={form} layout="vertical" onFinish={onFinish} initialValues={{ mode: 'EAN', isActive: true, sortOrder: 0 }}>
        <Row gutter={16}>
          {isSuper && (
            <Col xs={24} sm={8}>
              <Form.Item label="Firma" name="companyId">
                <Select placeholder="Firma" options={companies.map((c) => ({ value: c.id, label: `${c.code} — ${c.name}` }))}
                  onChange={(v) => { setCompanyId(v); localStorage.setItem('og_company', String(v)); form.resetFields(['facilityId']) }}
                  showSearch optionFilterProp="label" allowClear />
              </Form.Item>
            </Col>
          )}
          <Col xs={24} sm={8}>
            <Form.Item label="Tesis (boş = tüm tesisler)" name="facilityId">
              <Select placeholder="Tesis" allowClear showSearch optionFilterProp="label"
                options={facilities.map((f) => ({ value: f.id, label: `${f.code}${f.name ? ' — ' + f.name : ''}` }))} />
            </Form.Item>
          </Col>
          <Col xs={12} sm={4}><Form.Item label="Kod" name="code" rules={[{ required: true, message: 'Kod gerekli' }]}><Input placeholder="MAMUL-PLT" /></Form.Item></Col>
          <Col xs={12} sm={4}><Form.Item label="Sıra" name="sortOrder" tooltip="Küçük önce denenir — ilk eşleşen kazanır"><InputNumber style={{ width: '100%' }} /></Form.Item></Col>
          <Col xs={24} sm={8}><Form.Item label="Tanım" name="name"><Input placeholder="Mamul Palet Etiketi" /></Form.Item></Col>
          <Col xs={24} sm={8}>
            <Form.Item label="Çözümleme Modu" name="mode" rules={[{ required: true }]}><Select options={MODES} /></Form.Item>
          </Col>
        </Row>

        <Divider titlePlacement="start" style={{ margin: '4px 0 12px' }}><Typography.Text type="secondary" style={{ fontSize: 12 }}>Eşleşme koşulları (hepsi boşsa: varsayılan — her barkod)</Typography.Text></Divider>
        <Row gutter={16}>
          <Col xs={12} sm={6}><Form.Item label="Önek ile başlar" name="matchPrefix" tooltip="Örn. KP, P, H"><Input placeholder="KP" /></Form.Item></Col>
          <Col xs={12} sm={6}><Form.Item label="İçerir" name="matchContains" tooltip="Örn. /"><Input placeholder="/" /></Form.Item></Col>
          <Col xs={12} sm={6}><Form.Item label="Min uzunluk" name="minLen"><InputNumber style={{ width: '100%' }} min={0} /></Form.Item></Col>
          <Col xs={12} sm={6}><Form.Item label="Max uzunluk" name="maxLen"><InputNumber style={{ width: '100%' }} min={0} /></Form.Item></Col>
        </Row>

        {modeVal === 'SEGMENT' && (
          <Row gutter={16}><Col xs={12} sm={6}><Form.Item label="Varsayılan Ayraç" name="separator" tooltip="Segmentin kendi ayracı boşsa bu kullanılır"><Input placeholder="/" maxLength={4} /></Form.Item></Col></Row>
        )}
        {modeVal === 'PALLET' && (
          <Row gutter={16}><Col xs={12} sm={6}><Form.Item label="Palet No Uzunluğu" name="palletKeyLen" tooltip="Palet no = barkodun ilk N karakteri (boş = tüm barkod)"><InputNumber style={{ width: '100%' }} min={1} /></Form.Item></Col></Row>
        )}

        <Row gutter={16}>
          <Col xs={12} sm={6}><Form.Item label="Üretim Barkodu" name="isProductionBarcode" valuePropName="checked"><Switch /></Form.Item></Col>
          <Col xs={12} sm={6}><Form.Item label="Aktif" name="isActive" valuePropName="checked"><Switch /></Form.Item></Col>
        </Row>

        <Space>
          <Button type="primary" htmlType="submit" loading={submitting}>{mode === 'edit' ? 'Kaydet' : 'Oluştur'}</Button>
          <Button onClick={() => navigate('/barcode-types')}>Vazgeç</Button>
        </Space>
      </Form>
    </Card>
  )

  const items = [
    { key: 'def', label: 'Barkod Tipi', children: defTab },
    {
      key: 'seg', label: 'Segmentler',
      children: segmentsEnabled
        ? <Card size="small"><Alert type="info" showIcon style={{ marginBottom: 12 }} message="Segmentler soldan sağa sırayla ayrıştırılır. Her segment 'Ayraca kadar' (ayraç) veya 'Sabit N karakter'." />
            <LinkTab ownerField="barcodeTypeId" ownerId={id!} resource="barcode-segments" fields={SEGMENT_FIELDS} /></Card>
        : <Alert type="warning" showIcon message={mode !== 'edit' ? 'Önce barkod tipini Oluştur — sonra segment eklenir.' : 'Segmentler yalnız SEGMENT modunda tanımlanır. Modu SEGMENT yapıp kaydedin.'} />,
    },
    { key: 'test', label: 'Test', children: <TestPanel facilityId={form.getFieldValue('facilityId')} /> },
  ]

  return (
    <>
      <PageHeader title={mode === 'edit' ? 'Barkod Tipi Düzenle' : 'Yeni Barkod Tipi'} subtitle="Eşleşme + mod + segmentler. Okutmada sıralı denenir, ilk eşleşen kazanır (legacy TXTSCRIPT karşılığı)." />
      <Tabs activeKey={tab} onChange={setTab} items={items} />
    </>
  )
}

// Canlı Test — barkod yapıştır → /api/barcode-types/parse sonucu
const TestPanel = ({ facilityId }: { facilityId?: number }) => {
  const [code, setCode] = useState('')
  const [res, setRes] = useState<Record<string, unknown> | null>(null)
  const [busy, setBusy] = useState(false)
  const run = () => {
    if (!code.trim()) return
    setBusy(true)
    axiosInstance.get('/api/barcode-types/parse', { params: { code, facilityId: facilityId || undefined } })
      .then((r) => setRes(r.data)).catch((e) => setRes({ error: e?.response?.data?.error ?? 'Hata' })).finally(() => setBusy(false))
  }
  const fields = (res?.fields ?? {}) as Record<string, unknown>
  const segments = (res?.segments ?? []) as { field: string; raw: string; value?: string }[]
  const pallet = res?.pallet as { palletNo: string; lines: Record<string, string>[] } | null | undefined
  return (
    <Card size="small">
      <Space.Compact style={{ width: '100%', maxWidth: 620 }}>
        <Input placeholder="Barkod yapıştır / okut…" value={code} onChange={(e) => setCode(e.target.value)} onPressEnter={run} style={{ fontFamily: 'monospace' }} />
        <Button type="primary" onClick={run} loading={busy}>Ayrıştır</Button>
      </Space.Compact>
      {res && (
        <div style={{ marginTop: 16 }}>
          {res.matched && !res.error ? (
            <>
              <Space wrap style={{ marginBottom: 10 }}>
                <Tag color="cyan">Mod: {String(res.mode)}</Tag>
                <Tag>Tip: {String(res.barcodeType ?? res.barcodeTypeCode ?? '—')}</Tag>
              </Space>
              {segments.length > 0 && (
                <Space wrap style={{ marginBottom: 10 }}>
                  {segments.map((s, i) => <Tag key={i} color="blue">{FIELD_LBL[s.field] ?? s.field}: <b style={{ fontFamily: 'monospace' }}>{s.value ?? s.raw}</b></Tag>)}
                </Space>
              )}
              <Table size="small" pagination={false} rowKey="k" style={{ maxWidth: 520 }}
                columns={[{ title: 'Alan', dataIndex: 'k' }, { title: 'Değer', dataIndex: 'v', render: (v) => <span style={{ fontFamily: 'monospace' }}>{v}</span> }]}
                dataSource={Object.entries(fields).filter(([, v]) => v != null).map(([k, v]) => ({ k, v: String(v) }))} />
              {pallet && (
                <Table size="small" style={{ marginTop: 12 }} title={() => `Palet ${pallet.palletNo} içeriği`} pagination={false} rowKey={(_, i) => String(i)}
                  columns={[{ title: 'Ürün', dataIndex: 'productCode' }, { title: 'Lot', dataIndex: 'batchNo' }, { title: 'Miktar', dataIndex: 'qty' }, { title: 'SKT', dataIndex: 'expiryDate' }, { title: 'Lokasyon', dataIndex: 'location' }]}
                  dataSource={pallet.lines} />
              )}
              {Array.isArray(res.warnings) && (res.warnings as string[]).map((w, i) => <Alert key={i} type="warning" showIcon message={w} style={{ marginTop: 8 }} />)}
            </>
          ) : (
            <Alert type="error" showIcon message={String(res.error ?? 'Barkod tipi bulunamadı')} />
          )}
        </div>
      )}
    </Card>
  )
}
