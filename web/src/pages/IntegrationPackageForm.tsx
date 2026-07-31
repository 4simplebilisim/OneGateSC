import { useEffect, useMemo, useState } from 'react'
import { App, Alert, Button, Card, Col, Divider, Form, Input, Row, Select, Space, Switch, Tabs, Typography } from 'antd'
import { ApiOutlined } from '@ant-design/icons'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { axiosInstance } from '../providers/dataProvider'
import { PageHeader } from '../components/PageHeader'
import { LinkTab, type LF } from '../components/LinkTab'

const PKG_TYPES = [
  { value: 'NETSIS_REST', label: 'Netsis — NetOpenX REST' },
  { value: 'LOGO_REST', label: 'Logo — Objects REST' },
  { value: 'GENERIC_REST', label: 'Genel REST — düz uç' },
]
const DBTYPE_OPTS = [
  { value: 'vtMSSQL', label: 'vtMSSQL — SQL Server' },
  { value: 'vtHANA', label: 'vtHANA — SAP HANA' },
]

// Adres = operasyona bağlı uç + tetik bayrakları (legacy TBLSBENTEGRASYONADRES)
const ADDRESS_FIELDS: LF[] = [
  { name: 'operationTypeId', label: 'Operasyon', type: 'ref', ref: 'operation-types' },
  { name: 'facilityId', label: 'Tesis', type: 'ref', ref: 'facilities' },
  { name: 'name', label: 'Tanım', type: 'text' },
  { name: 'path', label: 'Adres (path)', type: 'text', required: true },
  { name: 'sortOrder', label: 'Sıra', type: 'number' },
  { name: 'onCreate', label: 'Yaratma', type: 'bool' },
  { name: 'onFirstScan', label: 'İlk Okutma', type: 'bool' },
  { name: 'onConfirm', label: 'Onay', type: 'bool' },
  { name: 'onComplete', label: 'Kaydetme', type: 'bool' },
  { name: 'isActive', label: 'Aktif', type: 'bool' },
]

// Entegrasyon Paketi: bağlantı profili (tip + sunucu + kimlik) + Adresler sekmesi + bağlantı testi.
export const IntegrationPackageForm = ({ mode }: { mode: 'create' | 'edit' }) => {
  const { id } = useParams()
  const [search] = useSearchParams()
  const copyFrom = search.get('copyFrom')
  const navigate = useNavigate()
  const { message } = App.useApp()
  const [form] = Form.useForm()
  const [submitting, setSubmitting] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null)
  const [tab, setTab] = useState('def')
  const pkgType = (Form.useWatch('packageType', form) ?? 'NETSIS_REST') as string

  const isSuper = useMemo(() => { try { return !!JSON.parse(localStorage.getItem('og_user') ?? 'null')?.isSuperAdmin } catch { return false } }, [])
  const [companies, setCompanies] = useState<{ id: number; code: string; name: string }[]>([])
  useEffect(() => { if (isSuper) axiosInstance.get('/api/companies').then((r) => setCompanies(Array.isArray(r.data) ? r.data : (r.data.data ?? []))).catch(() => {}) }, [isSuper])

  useEffect(() => {
    if (mode === 'edit' && id) axiosInstance.get(`/api/integration-packages/${id}`).then((r) => form.setFieldsValue(r.data))
    else if (mode === 'create' && copyFrom) {
      axiosInstance.get(`/api/integration-packages/${copyFrom}`).then((r) => {
        const { id: _id, code: _code, companyId: _co, createdAt: _c, updatedAt: _u, ...rest } = r.data
        form.setFieldsValue(Object.fromEntries(Object.entries(rest).filter(([, v]) => v !== null)))
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, id, copyFrom])

  const onFinish = async (values: Record<string, unknown>) => {
    setSubmitting(true)
    try {
      if (mode === 'edit' && id) {
        await axiosInstance.patch(`/api/integration-packages/${id}`, values)
        message.success('Kaydedildi')
      } else {
        const r = await axiosInstance.post('/api/integration-packages', values)
        message.success('Oluşturuldu — adres eklemek için Adresler sekmesine geçin')
        navigate(`/integration-packages/${r.data.id}/edit`)
      }
    } catch (e) {
      message.error((e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Kaydedilemedi')
    } finally { setSubmitting(false) }
  }

  // Bağlantı Testi: kaydedilmiş paket üstünden (form değişiklikleri önce Kaydet ister)
  const runTest = async () => {
    if (!id) return
    setTesting(true)
    setTestResult(null)
    try {
      const r = await axiosInstance.post(`/api/integration-packages/${id}/test`, {})
      setTestResult(r.data)
    } catch (e) {
      const data = (e as { response?: { data?: { ok?: boolean; message?: string } } })?.response?.data
      setTestResult({ ok: false, message: data?.message ?? 'Test isteği başarısız' })
    } finally { setTesting(false) }
  }

  const isNetsis = pkgType === 'NETSIS_REST'
  const isLogo = pkgType === 'LOGO_REST'

  const defTab = (
    <Card size="small" variant="outlined">
      <Form form={form} layout="vertical" onFinish={onFinish} initialValues={{ packageType: 'NETSIS_REST', isActive: true, logging: true }}>
        <Row gutter={16}>
          {isSuper && (
            <Col xs={24} sm={6}>
              <Form.Item label="Firma" name="companyId">
                <Select placeholder="Firma" options={companies.map((c) => ({ value: c.id, label: `${c.code} — ${c.name}` }))}
                  onChange={(v) => localStorage.setItem('og_company', String(v))} showSearch optionFilterProp="label" allowClear />
              </Form.Item>
            </Col>
          )}
          <Col xs={12} sm={4}><Form.Item label="Kod" name="code" rules={[{ required: true, message: 'Kod gerekli' }]}><Input placeholder="NETSIS-MERKEZ" disabled={mode === 'edit'} /></Form.Item></Col>
          <Col xs={24} sm={7}><Form.Item label="Tanım" name="name"><Input placeholder="Netsis Merkez ERP" /></Form.Item></Col>
          <Col xs={24} sm={7}><Form.Item label="Paket Tipi" name="packageType" rules={[{ required: true }]}><Select options={PKG_TYPES} /></Form.Item></Col>
        </Row>

        <Divider titlePlacement="start" style={{ margin: '4px 0 12px' }}><Typography.Text type="secondary" style={{ fontSize: 12 }}>Sunucu + kimlik</Typography.Text></Divider>
        <Row gutter={16}>
          <Col xs={24} sm={10}>
            <Form.Item label="Sunucu Adresi (baseUrl)" name="baseUrl" rules={[{ required: true, message: 'Adres gerekli' }]}
              tooltip={isNetsis ? 'NetOpenX REST kökü — örn. http://sunucu:9090' : isLogo ? 'Logo REST kökü — örn. http://sunucu:32001' : 'REST kökü — adresler buna eklenir'}>
              <Input placeholder={isNetsis ? 'http://sunucu:9090' : isLogo ? 'http://sunucu:32001' : 'https://api.ornek.com'} />
            </Form.Item>
          </Col>
          <Col xs={12} sm={7}><Form.Item label={isNetsis ? 'Netsis Kullanıcı' : 'Kullanıcı'} name="username"><Input autoComplete="off" /></Form.Item></Col>
          <Col xs={12} sm={7}><Form.Item label={isNetsis ? 'Netsis Şifre' : 'Şifre'} name="password"><Input.Password autoComplete="new-password" /></Form.Item></Col>
        </Row>

        {isNetsis && (
          <Row gutter={16}>
            <Col xs={12} sm={5}><Form.Item label="DB Tipi" name="dbType" tooltip="NetOpenX dbtype — varsayılan vtMSSQL"><Select options={DBTYPE_OPTS} allowClear placeholder="vtMSSQL" /></Form.Item></Col>
            <Col xs={12} sm={5}><Form.Item label="DB Adı" name="dbName" rules={[{ required: true, message: 'DB adı gerekli' }]}><Input placeholder="NETSIS2026" /></Form.Item></Col>
            <Col xs={12} sm={5}><Form.Item label="DB Kullanıcı" name="dbUser"><Input autoComplete="off" placeholder="TEMELSET" /></Form.Item></Col>
            <Col xs={12} sm={5}><Form.Item label="DB Şifre" name="dbPassword"><Input.Password autoComplete="new-password" /></Form.Item></Col>
            <Col xs={12} sm={4}><Form.Item label="Şube Kodu" name="branchCode" tooltip="BranchCode — varsayılan 0"><Input placeholder="0" /></Form.Item></Col>
          </Row>
        )}
        {isLogo && (
          <Row gutter={16}>
            <Col xs={12} sm={6}><Form.Item label="Client Id" name="clientId" tooltip="Logo bayisinden alınan REST erişim anahtarı" rules={[{ required: true, message: 'Client Id gerekli' }]}><Input autoComplete="off" /></Form.Item></Col>
            <Col xs={12} sm={6}><Form.Item label="Client Secret" name="clientSecret" rules={[{ required: true, message: 'Client Secret gerekli' }]}><Input.Password autoComplete="new-password" /></Form.Item></Col>
            <Col xs={12} sm={4}><Form.Item label="Firma No" name="firmNr" rules={[{ required: true, message: 'Firma no gerekli' }]}><Input placeholder="1" /></Form.Item></Col>
            <Col xs={12} sm={4}><Form.Item label="Dönem No" name="periodNr"><Input placeholder="1" /></Form.Item></Col>
            <Col xs={12} sm={4}>
              <Form.Item label="Logo Versiyonu" name="logoVersion" tooltip="Legacy BYTLOGOVERSIYON">
                <Select allowClear placeholder="Seçin" options={[{ value: 1, label: 'LOGO 2.02 üstü' }, { value: 0, label: 'LOGO 2.02 öncesi' }]} />
              </Form.Item>
            </Col>
          </Row>
        )}

        <Row gutter={16}>
          <Col xs={12} sm={4}><Form.Item label="Log Tutulsun" name="logging" valuePropName="checked" tooltip="Aktarımlar Entegrasyon İzleme'ye yazılır"><Switch /></Form.Item></Col>
          <Col xs={12} sm={5}><Form.Item label="Çoklu Firma Aktarımı" name="multiCompanyTransfer" valuePropName="checked" tooltip="Legacy BYTCOKLUFIRMAAKTARIMI — birden çok ERP firmasına aktarım"><Switch /></Form.Item></Col>
          <Col xs={12} sm={4}><Form.Item label="Aktif" name="isActive" valuePropName="checked"><Switch /></Form.Item></Col>
        </Row>

        <Space wrap>
          <Button type="primary" htmlType="submit" loading={submitting}>{mode === 'edit' ? 'Kaydet' : 'Oluştur'}</Button>
          {mode === 'edit' && <Button icon={<ApiOutlined />} onClick={runTest} loading={testing}>Bağlantı Testi</Button>}
          <Button onClick={() => navigate('/integration-packages')}>Vazgeç</Button>
        </Space>
        {testResult && (
          <Alert style={{ marginTop: 12 }} showIcon type={testResult.ok ? 'success' : 'error'}
            message={testResult.message} description={testResult.ok ? undefined : 'Kaydedilmemiş değişiklikler teste yansımaz — önce Kaydet.'} />
        )}
      </Form>
    </Card>
  )

  const items = [
    { key: 'def', label: 'Paket', children: defTab },
    {
      key: 'addr', label: 'Adresler',
      children: mode === 'edit' && id
        ? <Card size="small">
            <Alert type="info" showIcon style={{ marginBottom: 12 }}
              message="Adres = operasyona bağlı uç. Tetikler: Yaratma (belge oluşunca) · İlk Okutma · Onay · Kaydetme (tamamlanınca). Operasyon boş = tüm operasyonlar." />
            <LinkTab ownerField="packageId" ownerId={id} resource="integration-addresses" fields={ADDRESS_FIELDS} />
          </Card>
        : <Alert type="warning" showIcon message="Önce paketi Oluştur — sonra adres eklenir." />,
    },
  ]

  return (
    <>
      <PageHeader title={mode === 'edit' ? 'Entegrasyon Paketi Düzenle' : 'Yeni Entegrasyon Paketi'}
        subtitle="ERP bağlantı profili (Netsis NetOpenX REST / Logo Objects REST / genel REST) + operasyon-bazlı adresler ve tetikler." />
      <Tabs activeKey={tab} onChange={setTab} items={items} />
    </>
  )
}
