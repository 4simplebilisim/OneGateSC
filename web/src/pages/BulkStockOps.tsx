import { useCallback, useEffect, useMemo, useState } from 'react'
import { App, Alert, Button, Card, Col, DatePicker, Input, Modal, Row, Select, Space, Table, Tag, Typography } from 'antd'
import { ReloadOutlined, ThunderboltOutlined, SettingOutlined, SearchOutlined } from '@ant-design/icons'
import { Link } from 'react-router-dom'
import type { Dayjs } from 'dayjs'
import { axiosInstance } from '../providers/dataProvider'
import { PageHeader } from '../components/PageHeader'

type Op = { id: number; code: string; name?: string; direction: string; bulkAction?: boolean; facilityId?: number | null }
type StockRow = {
  id: number; batchNo: string | null; serialNo: string | null; expiryDate: string | null
  mainQty: string; reservedQty: string; availableQty: string
  product?: { code: string; name?: string | null }
  location?: { code: string; warehouse?: { code: string; facility?: { id: number; code: string } } }
  status?: { code: string; name?: string | null }
  unit?: { code: string }
  pallet?: { palletNo: string } | null
}
const { RangePicker } = DatePicker
const arr = (d: unknown) => (Array.isArray(d) ? d : ((d as { data?: unknown[] })?.data ?? []))
const DIR_LABEL: Record<string, string> = { OUTBOUND: 'Çıkış', INTERNAL: 'Transfer' }

// TOPLU İŞLEM (StokBar SbTopluIslem): filtrele → stok satırlarını LİSTELE → seç → İşlem:
// seçilen operasyonla belge otomatik doğar + TAMAMLANIR (statü değiştirme = statü-geçişli Transfer op).
export const BulkStockOps = ({ direction }: { direction: 'OUTBOUND' | 'INTERNAL' }) => {
  const { message } = App.useApp()
  const [ops, setOps] = useState<Op[]>([])
  const [facilities, setFacilities] = useState<{ id: number; code: string; name?: string }[]>([])
  const [products, setProducts] = useState<{ value: number; label: string }[]>([])
  const [locations, setLocations] = useState<{ value: number; label: string }[]>([])
  const [statuses, setStatuses] = useState<{ value: number; label: string }[]>([])

  const [opId, setOpId] = useState<number>()
  const [facilityId, setFacilityId] = useState<number>()
  const [productId, setProductId] = useState<number>()
  const [locationId, setLocationId] = useState<number>()
  const [statusId, setStatusId] = useState<number>()
  const [batchNo, setBatchNo] = useState('')
  const [palletNo, setPalletNo] = useState('')
  const [expiry, setExpiry] = useState<[Dayjs | null, Dayjs | null] | null>(null)

  const [rows, setRows] = useState<StockRow[]>([])
  const [loading, setLoading] = useState(false)
  const [listed, setListed] = useState(false)
  const [selected, setSelected] = useState<number[]>([])
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    axiosInstance.get('/api/operation-types', { params: { pageSize: 300 } }).then((r) => setOps(arr(r.data) as Op[]))
    axiosInstance.get('/api/facilities', { params: { pageSize: 300 } }).then((r) => setFacilities(arr(r.data) as { id: number; code: string; name?: string }[]))
    axiosInstance.get('/api/products', { params: { pageSize: 500 } }).then((r) => setProducts((arr(r.data) as { id: number; code: string; name?: string }[]).map((x) => ({ value: x.id, label: `${x.code}${x.name ? ' — ' + x.name : ''}` }))))
    axiosInstance.get('/api/locations', { params: { pageSize: 500 } }).then((r) => setLocations((arr(r.data) as { id: number; code: string }[]).map((x) => ({ value: x.id, label: x.code }))))
    axiosInstance.get('/api/statuses', { params: { pageSize: 200 } }).then((r) => setStatuses((arr(r.data) as { id: number; code: string; name?: string }[]).map((x) => ({ value: x.id, label: `${x.code}${x.name ? ' — ' + x.name : ''}` }))))
  }, [])

  // Bu yönde 'Toplu İşlem' işaretli operasyonlar (kaynak = op.bulkAction parametresi)
  const bulkOps = useMemo(() => ops.filter((o) => o.bulkAction === true && o.direction === direction), [ops, direction])
  const bulkOpOpts = useMemo(() => bulkOps.map((o) => ({ value: o.id, label: `${o.code}${o.name ? ' — ' + o.name : ''}` })), [bulkOps])
  const noBulkOps = ops.length > 0 && bulkOpOpts.length === 0

  const listele = useCallback(() => {
    setLoading(true); setSelected([]); setListed(true)
    axiosInstance.get('/api/stock', {
      params: {
        pageSize: 500, facilityId, productId, locationId, statusId,
        batchNo: batchNo || undefined, palletNo: palletNo || undefined,
        expiryFrom: expiry?.[0]?.format('YYYY-MM-DD'), expiryTo: expiry?.[1]?.format('YYYY-MM-DD'),
      },
    }).then((r) => setRows(arr(r.data) as StockRow[])).finally(() => setLoading(false))
  }, [facilityId, productId, locationId, statusId, batchNo, palletNo, expiry])

  const [islemOpen, setIslemOpen] = useState(false)
  const [targetLocId, setTargetLocId] = useState<number>() // Transfer: toplu taşıma hedefi (boş = yerinde statü değişimi)
  const islem = () => {
    if (!opId) { message.warning('Operasyon seçin'); return }
    if (!selected.length) { message.warning('Stok satırı seçin'); return }
    setTargetLocId(undefined); setIslemOpen(true)
  }
  const islemUygula = async () => {
    setBusy(true)
    try {
      const r = await axiosInstance.post('/api/stock/bulk-action', { operationTypeId: opId, stockIds: selected, targetLocationId: targetLocId ?? null })
      message.success(`${r.data.documentNo}: ${r.data.lineCount} satır / ${r.data.totalQty} miktar işlendi`)
      if (r.data.skipped?.length) message.warning(`Atlanan: ${r.data.skipped.join(', ')}`)
      setIslemOpen(false)
      listele()
    } catch (e) {
      message.error((e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'İşlem başarısız')
    } finally { setBusy(false) }
  }

  return (
    <div className="og-page">
      <PageHeader title={`Toplu İşlem — ${DIR_LABEL[direction]}`} subtitle="Filtrele → Listele → stok satırlarını seç → İşlem: seçilen operasyonla belge otomatik oluşup tamamlanır (StokBar Toplu İşlemler)" />

      {noBulkOps && (
        <Alert type="warning" showIcon style={{ marginBottom: 14 }}
          message={`${DIR_LABEL[direction]} yönünde 'Toplu İşlem' işaretli operasyon yok`}
          description={<span>Bir operasyonun burada seçilebilmesi için tanımında <b>Toplu İşlem</b> parametresi açık olmalıdır. <Link to="/operation-types"><SettingOutlined /> Uyarlamalar › Operasyon Tipi</Link>'nden işaretleyin.</span>} />
      )}

      <Card className="og-toolbar" size="small" style={{ marginBottom: 14 }} styles={{ body: { padding: '12px 14px' } }}>
        <Row gutter={[10, 10]}>
          <Col xs={24} sm={12} md={6}><Select style={{ width: '100%' }} value={opId} onChange={setOpId} placeholder="Operasyon Tipi *" allowClear showSearch optionFilterProp="label" options={bulkOpOpts} status={!opId ? 'warning' : undefined} /></Col>
          <Col xs={24} sm={12} md={6}><Select style={{ width: '100%' }} value={facilityId} onChange={setFacilityId} placeholder="Tesis" allowClear showSearch optionFilterProp="label" options={facilities.map((f) => ({ value: f.id, label: `${f.code}${f.name ? ' — ' + f.name : ''}` }))} /></Col>
          <Col xs={24} sm={12} md={6}><Select style={{ width: '100%' }} value={productId} onChange={setProductId} placeholder="Ürün" allowClear showSearch optionFilterProp="label" options={products} /></Col>
          <Col xs={24} sm={12} md={6}><Select style={{ width: '100%' }} value={locationId} onChange={setLocationId} placeholder="Lokasyon" allowClear showSearch optionFilterProp="label" options={locations} /></Col>
          <Col xs={24} sm={12} md={6}><Select style={{ width: '100%' }} value={statusId} onChange={setStatusId} placeholder="Statü" allowClear showSearch optionFilterProp="label" options={statuses} /></Col>
          <Col xs={12} sm={6} md={4}><Input value={batchNo} onChange={(e) => setBatchNo(e.target.value)} placeholder="Batch No" allowClear /></Col>
          <Col xs={12} sm={6} md={4}><Input value={palletNo} onChange={(e) => setPalletNo(e.target.value)} placeholder="Palet No" allowClear /></Col>
          <Col xs={24} sm={12} md={6}><RangePicker style={{ width: '100%' }} value={expiry} onChange={setExpiry} placeholder={['SKT Başlangıç', 'SKT Bitiş']} format="YYYY-MM-DD" allowEmpty={[true, true]} /></Col>
          <Col flex="auto">
            <Space>
              <Button type="primary" ghost icon={<SearchOutlined />} onClick={listele} loading={loading}>Listele</Button>
              <Button icon={<ReloadOutlined />} onClick={listele} disabled={!listed}>Yenile</Button>
              <span style={{ borderLeft: '1px solid var(--og-border)', height: 22 }} />
              <Typography.Text type="secondary">Seçili <b>{selected.length}</b></Typography.Text>
              <Button type="primary" icon={<ThunderboltOutlined />} disabled={!selected.length || !opId} loading={busy} onClick={islem}>İşlem</Button>
            </Space>
          </Col>
        </Row>
      </Card>

      <Card className="og-section-card" size="small" title={listed ? `Stok Satırları (${rows.length})` : 'Stok Satırları'}>
        <Table<StockRow>
          rowKey="id" size="small" loading={loading} dataSource={listed ? rows : []} pagination={{ pageSize: 20, size: 'small' }}
          rowSelection={{ selectedRowKeys: selected, onChange: (k) => setSelected(k as number[]) }}
          locale={{ emptyText: listed ? 'Filtreye uyan stok yok' : 'Filtreleri seçip Listele’ye basın' }}
          scroll={{ x: 'max-content' }}
          columns={[
            { title: 'Ürün', render: (_, r) => <span>{r.product?.code}{r.product?.name ? <Typography.Text type="secondary"> — {r.product.name}</Typography.Text> : null}</span> },
            { title: 'Lokasyon', render: (_, r) => r.location?.code ?? '—' },
            { title: 'Statü', render: (_, r) => <Tag>{r.status?.code}{r.status?.name ? ` — ${r.status.name}` : ''}</Tag> },
            { title: 'Batch', dataIndex: 'batchNo', render: (v) => v ?? '—' },
            { title: 'Seri', dataIndex: 'serialNo', render: (v) => v ?? '—' },
            { title: 'Palet', render: (_, r) => r.pallet?.palletNo ?? '—' },
            { title: 'SKT', dataIndex: 'expiryDate', render: (v: string | null) => (v ? v.slice(0, 10) : '—') },
            { title: 'Miktar', dataIndex: 'mainQty', align: 'right' as const, render: (v, r) => <span>{Number(v)} {r.unit?.code}</span> },
            { title: 'Rezerve', dataIndex: 'reservedQty', align: 'right' as const, render: (v) => Number(v) > 0 ? <Tag color="gold">{Number(v)}</Tag> : '—' },
          ]}
        />
      </Card>

      <Modal open={islemOpen} onCancel={() => setIslemOpen(false)} onOk={islemUygula} okText="İşlem" cancelText="Vazgeç" confirmLoading={busy}
        title={`${selected.length} stok satırına "${bulkOps.find((o) => o.id === opId)?.code ?? ''}" uygulansın mı?`}>
        <p>Seçili satırlar için belge otomatik oluşturulur, onaylanır ve <b>TAMAMLANIR</b> (stok anında işlenir).</p>
        {direction === 'INTERNAL' && (
          <>
            <Typography.Text strong>Hedef Lokasyon (toplu taşıma)</Typography.Text>
            <Select style={{ width: '100%', marginTop: 6 }} value={targetLocId} onChange={setTargetLocId} allowClear showSearch optionFilterProp="label"
              placeholder="Boş = yerinde statü değişimi (operasyonun statü geçişi uygulanır)" options={locations} />
            <Typography.Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 6 }}>
              Dolu = seçili stoklar bu lokasyona taşınır (operasyonda statü geçişi varsa statü de değişir, yoksa korunur).
            </Typography.Text>
          </>
        )}
      </Modal>
    </div>
  )
}
