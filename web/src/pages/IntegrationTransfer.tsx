import { useCallback, useEffect, useMemo, useState } from 'react'
import { App, Alert, Button, Card, Col, DatePicker, Form, Input, Modal, Row, Select, Space, Switch, Table, Tag, Tooltip } from 'antd'
import { SendOutlined, ReloadOutlined, RedoOutlined } from '@ant-design/icons'
import dayjs, { type Dayjs } from 'dayjs'
import { axiosInstance } from '../providers/dataProvider'
import { PageHeader } from '../components/PageHeader'

// StokBar SbEntegrasyonAktarim birebir kurgu: filtrele → Listele → mesaj/log satırları → Aktar (manuel tetikleme) / Yeniden Dene.
const ENTITY_OPTS = [
  { value: 'MALZEME', label: 'Malzeme' }, { value: 'CARI', label: 'Cari' }, { value: 'SIPARIS', label: 'Sipariş' },
  { value: 'FATURA', label: 'Fatura' }, { value: 'TALEP', label: 'Talep' },
]
const STATUS_OPTS = [
  { value: 'ERROR', label: 'Hata' }, { value: 'SUCCESS', label: 'Başarılı' }, { value: 'PENDING', label: 'Bekliyor' },
]
const DIR_OPTS = [{ value: 'IN', label: 'Gelen' }, { value: 'OUT', label: 'Giden' }]
const ENTITY_LBL: Record<string, string> = Object.fromEntries(ENTITY_OPTS.map((o) => [o.value, o.label]))

type Pkg = { id: number; code: string; name: string | null; packageType: string }
type Addr = { id: number; name: string | null; path: string }
type LogRow = {
  id: number; direction: 'IN' | 'OUT'; entityType: string; status: string; referenceKey: string | null
  message: string | null; createdAt: string; userName: string | null; packageId: number | null
  package: { code: string; name: string | null } | null; address: { name: string | null; path: string } | null
}

export const IntegrationTransfer = () => {
  const { message, modal } = App.useApp()
  const [packages, setPackages] = useState<Pkg[]>([])
  const [rows, setRows] = useState<LogRow[]>([])
  const [loading, setLoading] = useState(false)
  const [listed, setListed] = useState(false)
  const [selected, setSelected] = useState<number[]>([])
  const [retrying, setRetrying] = useState(false)

  // Filtreler (StokBar üst şerit)
  const [fPkg, setFPkg] = useState<number | undefined>()
  const [fEntity, setFEntity] = useState<string | undefined>()
  const [fStatus, setFStatus] = useState<string | undefined>('ERROR') // StokBar varsayılanı: Mesaj Tipi=Hata
  const [fDir, setFDir] = useState<string | undefined>()
  const [useDate, setUseDate] = useState(false)
  const [range, setRange] = useState<[Dayjs, Dayjs]>([dayjs().add(-7, 'day'), dayjs()])
  const [fQ, setFQ] = useState('')

  useEffect(() => {
    axiosInstance.get('/api/integration-packages')
      .then((r) => setPackages((Array.isArray(r.data) ? r.data : (r.data.data ?? [])).filter((p: { isActive: boolean }) => p.isActive)))
      .catch(() => setPackages([]))
  }, [])

  const load = useCallback(() => {
    setLoading(true)
    axiosInstance.get('/api/integration-logs', {
      params: {
        packageId: fPkg, entityType: fEntity, status: fStatus, direction: fDir,
        dateFrom: useDate ? range[0].format('YYYY-MM-DD') : undefined,
        dateTo: useDate ? range[1].format('YYYY-MM-DD') : undefined,
        q: fQ.trim() || undefined,
      },
    })
      .then((r) => { setRows(Array.isArray(r.data) ? r.data : []); setListed(true); setSelected([]) })
      .catch(() => message.error('Liste alınamadı'))
      .finally(() => setLoading(false))
  }, [fPkg, fEntity, fStatus, fDir, useDate, range, fQ, message])

  // Aktar modalı
  const [aktarOpen, setAktarOpen] = useState(false)
  const [aktarBusy, setAktarBusy] = useState(false)
  const [aktarForm] = Form.useForm()
  const aktarPkgId = Form.useWatch('packageId', aktarForm) as number | undefined
  const [addresses, setAddresses] = useState<Addr[]>([])
  useEffect(() => {
    if (!aktarPkgId) { setAddresses([]); return }
    axiosInstance.get('/api/integration-addresses', { params: { packageId: aktarPkgId } })
      .then((r) => setAddresses((Array.isArray(r.data) ? r.data : []).filter((a: { isActive: boolean }) => a.isActive)))
      .catch(() => setAddresses([]))
  }, [aktarPkgId])

  const runAktar = async (vals: Record<string, unknown>) => {
    setAktarBusy(true)
    try {
      const r = await axiosInstance.post('/api/integration-logs/transfer', vals)
      const log = r.data as { status: string; message?: string }
      if (log.status === 'SUCCESS') message.success(log.message ?? 'Aktarım başarılı')
      else modal.warning({ title: 'Aktarım sonucu', content: log.message ?? 'Aktarım hatası — İzleme kayıtlarına bakın' })
      setAktarOpen(false)
      load()
    } catch (e) {
      message.error((e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Aktarım tetiklenemedi')
    } finally { setAktarBusy(false) }
  }

  // Seçili kayıtları yeniden dene — her deneme yeni log satırı yazar
  const retry = async () => {
    setRetrying(true)
    try {
      const r = await axiosInstance.post('/api/integration-logs/retry', { ids: selected })
      const { success, failed } = r.data as { success: number; failed: number }
      if (failed === 0) message.success(`${success} deneme başarılı`)
      else message.warning(`${success} başarılı, ${failed} hatalı — sonuçlar yeni satır olarak listede`)
      load()
    } catch (e) {
      message.error((e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Yeniden deneme başarısız')
    } finally { setRetrying(false) }
  }

  const pkgOpts = useMemo(() => packages.map((p) => ({ value: p.id, label: `${p.code}${p.name ? ' — ' + p.name : ''}` })), [packages])

  const columns = [
    { title: 'İşlem Tarihi', dataIndex: 'createdAt', width: 150, render: (v: string) => dayjs(v).format('DD.MM.YYYY HH:mm:ss') },
    { title: 'Paket', dataIndex: ['package', 'code'], width: 130, render: (v: string | undefined) => v ?? '—' },
    { title: 'Yön', dataIndex: 'direction', width: 80, render: (v: string) => (v === 'IN' ? <Tag color="blue">Gelen</Tag> : <Tag color="orange">Giden</Tag>) },
    { title: 'İşlem Tipi', dataIndex: 'entityType', width: 100, render: (v: string) => ENTITY_LBL[v] ?? v },
    { title: 'Referans', dataIndex: 'referenceKey', width: 170, render: (v: string | null) => v ? <span style={{ fontFamily: 'monospace', fontSize: 12 }}>{v}</span> : '—' },
    {
      title: 'Mesaj', dataIndex: 'message', ellipsis: { showTitle: false },
      render: (v: string | null) => v ? <Tooltip title={v} placement="topLeft">{v}</Tooltip> : '—',
    },
    {
      title: 'Durum', dataIndex: 'status', width: 95,
      render: (v: string) => (v === 'SUCCESS' ? <Tag color="green">Başarılı</Tag> : v === 'ERROR' ? <Tag color="red">Hata</Tag> : <Tag color="gold">Bekliyor</Tag>),
    },
    { title: 'Kullanıcı', dataIndex: 'userName', width: 110, render: (v: string | null) => v ?? '—' },
  ]

  return (
    <>
      <PageHeader title="Entegrasyon Aktarım" subtitle="Manuel tetikleme + aktarım mesajları (legacy SbEntegrasyonAktarim). Aktar = paket ucuna gerçek deneme; sonuç satır olarak loglanır." />
      <Card size="small" style={{ marginBottom: 12 }}>
        <Row gutter={[12, 8]} align="bottom">
          <Col xs={12} sm={5}>
            <div style={{ fontSize: 12, marginBottom: 4 }}>Paket</div>
            <Select style={{ width: '100%' }} allowClear placeholder="Hepsi" options={pkgOpts} value={fPkg} onChange={setFPkg} showSearch optionFilterProp="label" />
          </Col>
          <Col xs={12} sm={4}>
            <div style={{ fontSize: 12, marginBottom: 4 }}>İşlem Tipi</div>
            <Select style={{ width: '100%' }} allowClear placeholder="Hepsi" options={ENTITY_OPTS} value={fEntity} onChange={setFEntity} />
          </Col>
          <Col xs={12} sm={3}>
            <div style={{ fontSize: 12, marginBottom: 4 }}>Mesaj Tipi</div>
            <Select style={{ width: '100%' }} allowClear placeholder="Hepsi" options={STATUS_OPTS} value={fStatus} onChange={setFStatus} />
          </Col>
          <Col xs={12} sm={3}>
            <div style={{ fontSize: 12, marginBottom: 4 }}>Yön</div>
            <Select style={{ width: '100%' }} allowClear placeholder="Hepsi" options={DIR_OPTS} value={fDir} onChange={setFDir} />
          </Col>
          <Col xs={24} sm={5}>
            <Space size={8} style={{ marginBottom: 2 }}>
              <Switch size="small" checked={useDate} onChange={setUseDate} />
              <span style={{ fontSize: 12 }}>Tarih Kullan</span>
            </Space>
            <DatePicker.RangePicker style={{ width: '100%' }} disabled={!useDate} value={range} allowClear={false}
              onChange={(v) => v && v[0] && v[1] && setRange([v[0], v[1]])} format="DD.MM.YYYY" />
          </Col>
          <Col xs={24} sm={4}>
            <div style={{ fontSize: 12, marginBottom: 4 }}>Kriter (referans / mesaj)</div>
            <Input allowClear placeholder="ara…" value={fQ} onChange={(e) => setFQ(e.target.value)} onPressEnter={load} />
          </Col>
        </Row>
        <Space style={{ marginTop: 12 }} wrap>
          <Button type="primary" icon={<ReloadOutlined />} onClick={load} loading={loading}>Listele</Button>
          <Button type="primary" ghost icon={<SendOutlined />} onClick={() => { aktarForm.resetFields(); setAktarOpen(true) }} disabled={!packages.length}>Aktar</Button>
          <Button icon={<RedoOutlined />} onClick={retry} disabled={!selected.length} loading={retrying}>Yeniden Dene ({selected.length})</Button>
          {!packages.length && <span style={{ fontSize: 12, color: 'var(--og-muted)' }}>Aktif entegrasyon paketi yok — Uyarlamalar › Entegrasyon › Entegrasyon Paketi</span>}
        </Space>
      </Card>

      {!listed && <Alert type="info" showIcon message="Filtreleri seçip Listele’ye basın — Mesaj Tipi varsayılanı Hata (StokBar kurgusu)." style={{ marginBottom: 12 }} />}
      <Table size="small" rowKey="id" loading={loading} dataSource={rows} columns={columns}
        rowSelection={{ selectedRowKeys: selected, onChange: (k) => setSelected(k as number[]) }}
        pagination={{ pageSize: 50, showSizeChanger: false, showTotal: (t) => `${t} kayıt` }}
        locale={{ emptyText: listed ? 'Kayıt bulunamadı' : 'Henüz listelenmedi' }} />

      <Modal title="Entegrasyon Aktarım — Manuel Tetikleme" open={aktarOpen} onCancel={() => setAktarOpen(false)} footer={null} destroyOnHidden>
        <Form form={aktarForm} layout="vertical" onFinish={runAktar} initialValues={{ direction: 'IN' }}>
          <Form.Item label="Paket" name="packageId" rules={[{ required: true, message: 'Paket seçin' }]}>
            <Select options={pkgOpts} showSearch optionFilterProp="label" placeholder="Entegrasyon paketi" />
          </Form.Item>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item label="İşlem Tipi" name="entityType" rules={[{ required: true, message: 'İşlem tipi seçin' }]}>
                <Select options={ENTITY_OPTS} placeholder="Malzeme / Cari / …" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Yön" name="direction" rules={[{ required: true }]}>
                <Select options={DIR_OPTS} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item label="Adres (opsiyonel)" name="addressId" tooltip="Boş = paket tipine göre bilinen ERP ucu (Netsis Items/ARPs…, Logo items/arps…). GENERIC pakette adres seçilmelidir.">
            <Select allowClear placeholder="Boş = bilinen uç"
              options={addresses.map((a) => ({ value: a.id, label: `${a.name ?? a.path} (${a.path})` }))} />
          </Form.Item>
          <Alert type="info" showIcon style={{ marginBottom: 12 }}
            message="Gelen: uçtan kayıtlar okunur, sayısı raporlanır (alan eşleme sonraki aşama). Giden: bağlantı doğrulanır — gövde eşlemesi tanımlanana dek kayıt gönderilmez." />
          <Space>
            <Button type="primary" htmlType="submit" loading={aktarBusy} icon={<SendOutlined />}>Aktar</Button>
            <Button onClick={() => setAktarOpen(false)}>Vazgeç</Button>
          </Space>
        </Form>
      </Modal>
    </>
  )
}
