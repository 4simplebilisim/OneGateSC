import { useEffect, useState } from 'react'
import { App, Alert, Button, Card, Col, Form, Input, Row, Select, Space, Switch, Tabs } from 'antd'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { axiosInstance } from '../providers/dataProvider'
import { PageHeader } from '../components/PageHeader'
import { LinkTab, type LF } from '../components/LinkTab'

// StokBar SbEntegrasyonSorguBelgeAtomik birebir: Paket + Sorgu Tipi + Sıralama + Sorgu + Kolon Dönüşüm alt listesi.
const QUERY_TYPES = [
  { value: 'MALZEME', label: 'Malzeme' }, { value: 'CARI', label: 'Cari' }, { value: 'SIPARIS', label: 'Sipariş' },
  { value: 'FATURA', label: 'Fatura' }, { value: 'TALEP', label: 'Talep' },
]

// Hedef alan (legacy BYTSBKOLON tinyint kodu → anlamlı alan kodu) — veri eşleme motoru bu kodları tüketecek
const TARGET_FIELDS = [
  { value: 'PRODUCT_CODE', label: 'Ürün Kodu' }, { value: 'PRODUCT_NAME', label: 'Ürün Adı' },
  { value: 'BARCODE', label: 'Barkod' }, { value: 'UNIT', label: 'Birim' }, { value: 'QUANTITY', label: 'Miktar' },
  { value: 'BATCH', label: 'Lot / Parti' }, { value: 'SERIAL', label: 'Seri' },
  { value: 'PRODUCTION', label: 'Üretim Tarihi' }, { value: 'EXPIRY', label: 'SKT' },
  { value: 'PARTNER_CODE', label: 'Cari Kodu' }, { value: 'PARTNER_NAME', label: 'Cari Adı' },
  { value: 'DOCUMENT_NO', label: 'Belge No' }, { value: 'PO_NO', label: 'Sipariş No' },
  { value: 'IGNORE', label: 'Yoksay' },
]

const COLUMN_FIELDS: LF[] = [
  { name: 'sourceColumn', label: 'Sorgu Kolonu', type: 'text', required: true },
  { name: 'targetField', label: 'OneGate Alanı', type: 'select', required: true, options: TARGET_FIELDS },
  { name: 'sortOrder', label: 'Sıra', type: 'number' },
]

export const IntegrationQueryForm = ({ mode }: { mode: 'create' | 'edit' }) => {
  const { id } = useParams()
  const [search] = useSearchParams()
  const copyFrom = search.get('copyFrom') // Kopyala: alanlar + KOLON DÖNÜŞÜMLERİ kaynaktan kopyalanır
  const navigate = useNavigate()
  const { message } = App.useApp()
  const [form] = Form.useForm()
  const [submitting, setSubmitting] = useState(false)
  const [tab, setTab] = useState('def')
  const [packages, setPackages] = useState<{ id: number; code: string; name: string | null }[]>([])

  useEffect(() => {
    axiosInstance.get('/api/integration-packages').then((r) => setPackages(Array.isArray(r.data) ? r.data : (r.data.data ?? []))).catch(() => setPackages([]))
  }, [])

  useEffect(() => {
    if (mode === 'edit' && id) axiosInstance.get(`/api/integration-queries/${id}`).then((r) => form.setFieldsValue(r.data))
    else if (mode === 'create' && copyFrom) {
      axiosInstance.get(`/api/integration-queries/${copyFrom}`).then((r) => {
        const { id: _id, companyId: _co, createdAt: _c, updatedAt: _u, ...rest } = r.data
        form.setFieldsValue(Object.fromEntries(Object.entries(rest).filter(([, v]) => v !== null)))
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, id, copyFrom])

  const onFinish = async (values: Record<string, unknown>) => {
    setSubmitting(true)
    try {
      if (mode === 'edit' && id) {
        await axiosInstance.patch(`/api/integration-queries/${id}`, values)
        message.success('Kaydedildi')
      } else {
        const r = await axiosInstance.post('/api/integration-queries', values)
        if (copyFrom) {
          const cols = await axiosInstance.get('/api/integration-query-columns', { params: { queryId: copyFrom } })
          const rows = (Array.isArray(cols.data) ? cols.data : []) as Record<string, unknown>[]
          for (const c of rows) {
            const { id: _id, companyId: _co, queryId: _q, createdAt: _c, updatedAt: _u, ...col } = c
            await axiosInstance.post('/api/integration-query-columns', { queryId: r.data.id, ...col })
          }
          message.success(rows.length ? `Oluşturuldu — ${rows.length} kolon dönüşümü kopyalandı` : 'Oluşturuldu')
        } else {
          message.success('Oluşturuldu — kolon eşlemek için Kolon Dönüşüm sekmesine geçin')
        }
        navigate(`/integration-queries/${r.data.id}/edit`)
      }
    } catch (e) {
      message.error((e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Kaydedilemedi')
    } finally { setSubmitting(false) }
  }

  const defTab = (
    <Card size="small" variant="outlined">
      <Form form={form} layout="vertical" onFinish={onFinish} initialValues={{ isActive: true }}>
        <Row gutter={16}>
          <Col xs={24} sm={8}>
            <Form.Item label="Entegrasyon Paket" name="packageId" rules={[{ required: true, message: 'Paket seçin' }]}>
              <Select showSearch optionFilterProp="label" placeholder="Paket"
                options={packages.map((p) => ({ value: p.id, label: `${p.code}${p.name ? ' — ' + p.name : ''}` }))} disabled={mode === 'edit'} />
            </Form.Item>
          </Col>
          <Col xs={12} sm={6}><Form.Item label="Sorgu Tipi" name="queryType" rules={[{ required: true, message: 'Tip seçin' }]}><Select options={QUERY_TYPES} placeholder="Malzeme" /></Form.Item></Col>
          <Col xs={24} sm={10}><Form.Item label="Sıralama" name="ordering" tooltip="Legacy TXTSIRALAMA — sonuç sıralaması"><Input /></Form.Item></Col>
        </Row>
        <Form.Item label="Sorgu" name="query" rules={[{ required: true, message: 'Sorgu gerekli' }]}
          tooltip="REST uç yolu yazın (örn. /api/v2/Items?limit=100) — aktarım motoru adres seçilmemişse bunu kullanır. Legacy SQL de saklanabilir (REST'te uygulanmaz).">
          <Input.TextArea rows={8} style={{ fontFamily: 'Consolas, monospace', fontSize: 12.5 }} spellCheck={false}
            placeholder={'/api/v2/Items?limit=100\n— veya legacy SQL —\nSELECT STOK_KODU, STOK_ADI FROM TBLSTSABIT'} />
        </Form.Item>
        <Row gutter={16}>
          <Col xs={12} sm={4}><Form.Item label="Aktif" name="isActive" valuePropName="checked"><Switch /></Form.Item></Col>
        </Row>
        <Space>
          <Button type="primary" htmlType="submit" loading={submitting}>{mode === 'edit' ? 'Kaydet' : 'Oluştur'}</Button>
          <Button onClick={() => navigate('/integration-queries')}>Vazgeç</Button>
        </Space>
      </Form>
    </Card>
  )

  const items = [
    { key: 'def', label: 'Okuma Sorgusu', children: defTab },
    {
      key: 'cols', label: 'Kolon Dönüşüm',
      children: mode === 'edit' && id
        ? <Card size="small">
            <Alert type="info" showIcon style={{ marginBottom: 12 }}
              message="Kaynak kolon → OneGate alanı eşlemesi (legacy Sorgu Kolonu → StokBar Kolonu). Veri eşleme motoru gelen kayıtları bu eşlemeyle işleyecek." />
            <LinkTab ownerField="queryId" ownerId={id} resource="integration-query-columns" fields={COLUMN_FIELDS} />
          </Card>
        : <Alert type="warning" showIcon message="Önce sorguyu Oluştur — sonra kolon dönüşümü eklenir." />,
    },
  ]

  return (
    <>
      <PageHeader title={mode === 'edit' ? 'Entegrasyon Okuma Sorgu Düzenle' : 'Yeni Entegrasyon Okuma Sorgu'}
        subtitle="GELEN aktarımın kaynak tanımı (legacy TBLSBENTEGRASYONSORGU) — uç yolu/sorgu + kolon dönüşümleri." />
      <Tabs activeKey={tab} onChange={setTab} items={items} />
    </>
  )
}
