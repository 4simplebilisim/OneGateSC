import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import { App, Button, Card, Select, Space, Statistic, Switch, Table, Tag } from 'antd'
import { ReloadOutlined, DownloadOutlined } from '@ant-design/icons'
import { axiosInstance } from '../providers/dataProvider'
import { PageHeader } from '../components/PageHeader'

type Opt = { value: number; label: string }
type Facility = { id: number; code: string; name: string }
type Warehouse = { id: number; code: string; name: string; facilityId: number | null }
type Row = {
  id: number
  batchNo: string | null
  serialNo: string | null
  mainQty: string
  reservedQty: string
  availableQty: string
  expiryDate: string | null
  product?: { code?: string; name?: string }
  status?: { code?: string; name?: string }
  unit?: { code?: string }
  pallet?: { palletNo?: string } | null
  location?: { code?: string; warehouse?: { code?: string; name?: string; facility?: { code?: string; name?: string } | null } | null }
}

const num = (v: string | null) => Number(v ?? 0)
const codeName = (c?: string, n?: string) => (c ? (n ? `${c} — ${n}` : c) : '—')
const lbl: CSSProperties = { fontSize: 12, color: 'var(--og-muted)', marginBottom: 2 }

// Stok Raporu — Tesis › Depo › Lokasyon › Ürün › Statü boyutlu, eldeki/rezerve/uygun + parti/seri/palet/SKT.
export const StockReport = () => {
  const { message } = App.useApp()
  const [facilities, setFacilities] = useState<Facility[]>([])
  const [warehouses, setWarehouses] = useState<Warehouse[]>([])
  const [products, setProducts] = useState<Opt[]>([])
  const [statuses, setStatuses] = useState<Opt[]>([])
  const [facilityId, setFacilityId] = useState<number>()
  const [warehouseId, setWarehouseId] = useState<number>()
  const [productId, setProductId] = useState<number>()
  const [statusId, setStatusId] = useState<number>()
  const [includeZero, setIncludeZero] = useState(false)
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(false)

  // Filtre kaynakları (bir kez)
  useEffect(() => {
    axiosInstance.get('/api/facilities', { params: { pageSize: 300 } }).then((r) => setFacilities((r.data.data ?? r.data) as Facility[]))
    axiosInstance.get('/api/warehouses', { params: { pageSize: 300 } }).then((r) => setWarehouses((r.data.data ?? r.data) as Warehouse[]))
    axiosInstance.get('/api/products', { params: { pageSize: 500 } }).then((r) => setProducts((r.data.data ?? r.data).map((x: { id: number; code: string; name?: string }) => ({ value: x.id, label: codeName(x.code, x.name) }))))
    axiosInstance.get('/api/statuses', { params: { pageSize: 100 } }).then((r) => setStatuses((r.data.data ?? r.data).map((x: { id: number; code: string; name?: string }) => ({ value: x.id, label: codeName(x.code, x.name) }))))
  }, [])

  // Depo seçenekleri tesise göre daralır (firma › tesis › depo)
  const whOpts = useMemo<Opt[]>(
    () => warehouses.filter((w) => !facilityId || w.facilityId === facilityId).map((w) => ({ value: w.id, label: codeName(w.code, w.name) })),
    [warehouses, facilityId],
  )

  const query = () => {
    setLoading(true)
    axiosInstance
      .get('/api/stock', { params: { facilityId, warehouseId, productId, statusId, includeZero: includeZero ? 'true' : undefined, pageSize: 2000 } })
      .then((r) => setRows((r.data.data ?? r.data) as Row[]))
      .catch((e) => message.error((e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Sorgulanamadı'))
      .finally(() => setLoading(false))
  }
  // İlk açılış + filtre değişiminde otomatik sorgula
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(query, [facilityId, warehouseId, productId, statusId, includeZero])

  const totals = useMemo(
    () => rows.reduce((a, r) => ({ onHand: a.onHand + num(r.mainQty), reserved: a.reserved + num(r.reservedQty), available: a.available + num(r.availableQty) }), { onHand: 0, reserved: 0, available: 0 }),
    [rows],
  )

  const exportCsv = () => {
    const head = ['Tesis', 'Depo', 'Lokasyon', 'Ürün Kodu', 'Ürün Adı', 'Statü', 'Parti', 'Seri', 'Palet', 'Birim', 'Eldeki', 'Rezerve', 'Uygun', 'SKT']
    const lines = rows.map((r) => [
      r.location?.warehouse?.facility?.code ?? '', r.location?.warehouse?.code ?? '', r.location?.code ?? '',
      r.product?.code ?? '', r.product?.name ?? '', r.status?.code ?? '', r.batchNo ?? '', r.serialNo ?? '',
      r.pallet?.palletNo ?? '', r.unit?.code ?? '', r.mainQty, r.reservedQty, r.availableQty, r.expiryDate?.slice(0, 10) ?? '',
    ].map((c) => `"${String(c).replace(/"/g, '""')}"`).join(';'))
    const csv = '﻿' + [head.join(';'), ...lines].join('\r\n') // BOM → Excel TR
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
    a.download = 'stok-raporu.csv'
    a.click()
  }

  const tesisCol = (r: Row) => codeName(r.location?.warehouse?.facility?.code, r.location?.warehouse?.facility?.name)
  const depoCol = (r: Row) => codeName(r.location?.warehouse?.code, r.location?.warehouse?.name)

  return (
    <div className="og-page">
      <PageHeader title="Stok Raporu" subtitle="Tesis › Depo › Lokasyon › Ürün › Statü — eldeki / rezerve / uygun, parti-seri-palet-SKT detayı" />

      <Card className="og-section-card" size="small" title="Filtreler">
        <Space wrap size={[16, 12]} align="end">
          <div><div style={lbl}>Tesis</div>
            <Select style={{ minWidth: 180 }} allowClear showSearch optionFilterProp="label" placeholder="Tüm tesisler" value={facilityId}
              options={facilities.map((f) => ({ value: f.id, label: codeName(f.code, f.name) }))}
              onChange={(v) => { setFacilityId(v); setWarehouseId(undefined) }} /></div>
          <div><div style={lbl}>Depo</div>
            <Select style={{ minWidth: 180 }} allowClear showSearch optionFilterProp="label" placeholder="Tüm depolar" value={warehouseId} options={whOpts} onChange={setWarehouseId} /></div>
          <div><div style={lbl}>Ürün</div>
            <Select style={{ minWidth: 220 }} allowClear showSearch optionFilterProp="label" placeholder="Tüm ürünler" value={productId} options={products} onChange={setProductId} /></div>
          <div><div style={lbl}>Statü</div>
            <Select style={{ minWidth: 150 }} allowClear showSearch optionFilterProp="label" placeholder="Tüm statüler" value={statusId} options={statuses} onChange={setStatusId} /></div>
          <div><div style={lbl}>Sıfır stok</div>
            <Switch checkedChildren="Dahil" unCheckedChildren="Hariç" checked={includeZero} onChange={setIncludeZero} /></div>
          <Button icon={<ReloadOutlined />} onClick={query} loading={loading}>Yenile</Button>
          <Button icon={<DownloadOutlined />} onClick={exportCsv} disabled={!rows.length}>CSV</Button>
        </Space>
      </Card>

      <Card className="og-section-card" size="small" style={{ marginBottom: 16 }}>
        <Space size={48} wrap>
          <Statistic title="Kalem (satır)" value={rows.length} />
          <Statistic title="Toplam eldeki" value={totals.onHand} />
          <Statistic title="Toplam rezerve" value={totals.reserved} />
          <Statistic title="Toplam uygun" value={totals.available} styles={{ content: { color: 'var(--og-success, #16a34a)' } }} />
        </Space>
      </Card>

      <Card className="og-section-card" size="small" title={`Stok (${rows.length} kalem)`}>
        <Table<Row>
          rowKey="id" size="small" dataSource={rows} loading={loading} scroll={{ x: 1200 }}
          pagination={{ pageSize: 50, showSizeChanger: true, size: 'small' }}
          locale={{ emptyText: 'Stok kaydı yok' }}
          columns={[
            { title: 'Tesis', key: 'tesis', render: (_, r) => tesisCol(r), width: 140 },
            { title: 'Depo', key: 'depo', render: (_, r) => depoCol(r), width: 130 },
            { title: 'Lokasyon', key: 'lok', render: (_, r) => r.location?.code ?? '—', width: 100 },
            { title: 'Ürün', key: 'urun', render: (_, r) => codeName(r.product?.code, r.product?.name), ellipsis: true },
            { title: 'Statü', key: 'statu', render: (_, r) => <Tag>{codeName(r.status?.code, r.status?.name)}</Tag>, width: 130 },
            { title: 'Parti', dataIndex: 'batchNo', render: (v: string | null) => v ?? '—', width: 90 },
            { title: 'Seri', dataIndex: 'serialNo', render: (v: string | null) => v ?? '—', width: 90 },
            { title: 'Palet', key: 'palet', render: (_, r) => r.pallet?.palletNo ?? '—', width: 90 },
            { title: 'Birim', key: 'birim', render: (_, r) => r.unit?.code ?? '—', width: 70 },
            { title: 'Eldeki', dataIndex: 'mainQty', align: 'right', render: (v: string) => num(v), width: 90 },
            { title: 'Rezerve', dataIndex: 'reservedQty', align: 'right', render: (v: string) => num(v), width: 90 },
            { title: 'Uygun', dataIndex: 'availableQty', align: 'right', render: (v: string) => <b style={{ color: num(v) > 0 ? 'var(--og-success, #16a34a)' : 'var(--og-danger, #ef4444)' }}>{num(v)}</b>, width: 90 },
            { title: 'SKT', dataIndex: 'expiryDate', render: (v: string | null) => (v ? v.slice(0, 10) : '—'), width: 110 },
          ]}
        />
      </Card>
    </div>
  )
}
