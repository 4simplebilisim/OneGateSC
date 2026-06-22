import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { App, Button, Card, Empty, Input, InputNumber, Select, Space, Table } from 'antd'
import { ScanOutlined, PlusOutlined, DeleteOutlined, SaveOutlined } from '@ant-design/icons'
import { axiosInstance } from '../providers/dataProvider'
import { PageHeader } from '../components/PageHeader'

type Opt = { value: number; label: string }
type OpType = { id: number; code: string; name?: string; direction: string }
type Line = { key: number; productId?: number; unitId?: number; quantity: number; locationId?: number; batchNo?: string; serialNo?: string }

// Stok Giriş / Stok Çıkış — Tesis/Operasyon seç → barkod okut (cihaz) ya da rehberden ürün seç →
// ürün·birim·miktar·lokasyon satırları → belge oluştur + onayla + tamamla (stok yazılır/düşülür). Belge ekranından ayrı.
export const StockEntry = ({ direction = 'INBOUND' }: { direction?: 'INBOUND' | 'OUTBOUND' }) => {
  const { message } = App.useApp()
  const navigate = useNavigate()
  const isOut = direction === 'OUTBOUND'
  const [ops, setOps] = useState<Opt[]>([])
  const [warehouses, setWarehouses] = useState<Opt[]>([])
  const [products, setProducts] = useState<Opt[]>([])
  const [units, setUnits] = useState<Opt[]>([])
  const [locations, setLocations] = useState<Opt[]>([])
  const [operationTypeId, setOperationTypeId] = useState<number>()
  const [warehouseId, setWarehouseId] = useState<number>()
  const [barcode, setBarcode] = useState('')
  const [lines, setLines] = useState<Line[]>([])
  const [busy, setBusy] = useState(false)
  const [availStatus, setAvailStatus] = useState<number>()
  const keyRef = useRef(1)

  useEffect(() => {
    axiosInstance.get('/api/operation-types', { params: { pageSize: 300 } }).then((r) => {
      const l = (Array.isArray(r.data) ? r.data : (r.data.data ?? [])) as OpType[]
      setOps(l.filter((o) => o.direction === direction).map((o) => ({ value: o.id, label: `${o.code}${o.name ? ' — ' + o.name : ''}` })))
    })
    const simple = (url: string, lbl: (x: Record<string, unknown>) => string, set: (o: Opt[]) => void) =>
      axiosInstance.get(url, { params: { pageSize: 500 } }).then((r) => {
        const l = Array.isArray(r.data) ? r.data : (r.data.data ?? [])
        set(l.map((x: Record<string, unknown>) => ({ value: x.id as number, label: lbl(x) })))
      })
    simple('/api/warehouses', (x) => `${x.code} — ${x.name ?? ''}`, setWarehouses)
    simple('/api/products', (x) => `${x.code}${x.name ? ' — ' + x.name : ''}`, setProducts)
    simple('/api/units', (x) => `${x.code}`, setUnits)
    simple('/api/locations', (x) => `${x.code}`, setLocations)
    // Çıkışta kaynak statü gerekli — varsayılan AVAILABLE
    axiosInstance.get('/api/statuses', { params: { pageSize: 100 } }).then((r) => {
      const l = Array.isArray(r.data) ? r.data : (r.data.data ?? [])
      const av = l.find((x: Record<string, unknown>) => x.code === 'AVAILABLE') ?? l[0]
      if (av) setAvailStatus(av.id as number)
    })
  }, [])

  const patch = (key: number, p: Partial<Line>) => setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...p } : l)))
  const addLine = (partial: Partial<Line>) =>
    setLines((prev) => {
      const i = partial.productId ? prev.findIndex((l) => l.productId === partial.productId && l.unitId === partial.unitId) : -1
      if (i >= 0) { const c = [...prev]; c[i] = { ...c[i], quantity: c[i].quantity + (partial.quantity ?? 1) }; return c }
      return [...prev, { key: keyRef.current++, quantity: 1, ...partial }]
    })

  const scan = () => {
    const code = barcode.trim()
    if (!code) return
    axiosInstance.get('/api/lookup/barcode', { params: { code } }).then((r) => {
      if (!r.data.found) { message.warning(`Barkod bulunamadı: ${code}`); return }
      addLine({ productId: r.data.product.id, unitId: r.data.unit.id, quantity: 1 })
      setBarcode('')
    }).catch(() => message.error('Barkod sorgulanamadı'))
  }

  const submit = async () => {
    if (!operationTypeId || !warehouseId) { message.warning('Operasyon ve depo seçin'); return }
    const valid = lines.filter((l) => l.productId && l.unitId && l.quantity > 0)
    if (!valid.length) { message.warning('En az bir geçerli satır girin'); return }
    setBusy(true)
    try {
      const doc = await axiosInstance.post('/api/documents', {
        operationTypeId, warehouseId,
        // Giriş → hedef lokasyon (nereye); Çıkış → kaynak lokasyon (nereden)
        lines: valid.map((l) => ({ productId: l.productId, unitId: l.unitId, quantity: l.quantity, ...(isOut ? { sourceLocationId: l.locationId, sourceStatusId: availStatus } : { targetLocationId: l.locationId }), batchNo: l.batchNo || undefined, serialNo: l.serialNo || undefined })),
      })
      // İşlemi tamamla → stok yazılır (giriş) / düşülür (çıkış) — onayla + tamamla
      await axiosInstance.post(`/api/documents/${doc.data.id}/confirm`)
      await axiosInstance.post(`/api/documents/${doc.data.id}/complete`)
      message.success(`Stok ${isOut ? 'çıkışı' : 'girişi'} tamamlandı: ${doc.data.documentNo} (${valid.length} satır)`)
      navigate(`/documents/${doc.data.id}`)
    } catch (e) {
      message.error((e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Giriş başarısız')
    } finally { setBusy(false) }
  }

  return (
    <div className="og-page" style={{ maxWidth: 1100 }}>
      <PageHeader title={isOut ? 'Stok Çıkış' : 'Stok Giriş'} subtitle={`Tesis/operasyon seç → barkod okut ya da rehberden ürün seç → ${isOut ? 'çıkış' : 'giriş'} işlemini tamamla (stok ${isOut ? 'düşülür' : 'yazılır'})`} />
      <Card className="og-section-card" size="small" title="Başlık">
        <Space wrap size="middle" align="end">
          <div>
            <div style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>Tesis / Depo *</div>
            <Select style={{ minWidth: 200 }} showSearch optionFilterProp="label" placeholder="Depo" value={warehouseId} onChange={setWarehouseId} options={warehouses} />
          </div>
          <div>
            <div style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>Operasyon Tipi ({isOut ? 'Çıkış' : 'Giriş'}) *</div>
            <Select style={{ minWidth: 220 }} showSearch optionFilterProp="label" placeholder={`${isOut ? 'Çıkış' : 'Giriş'} operasyonu`} value={operationTypeId} onChange={setOperationTypeId} options={ops} />
          </div>
        </Space>
      </Card>

      <Card className="og-section-card" size="small" title="Barkod Okut / Ürün Ekle">
        <Space wrap>
          <Input
            style={{ width: 280 }} prefix={<ScanOutlined />} placeholder="Barkodu okut veya yaz, Enter"
            value={barcode} onChange={(e) => setBarcode(e.target.value)} onPressEnter={scan} allowClear autoFocus
          />
          <Button onClick={scan}>Okut</Button>
          <Button icon={<PlusOutlined />} onClick={() => addLine({})}>Rehberden Satır Ekle</Button>
        </Space>
      </Card>

      <Card className="og-section-card" size="small" title={`Satırlar (${lines.length})`}
        extra={<Button type="primary" icon={<SaveOutlined />} loading={busy} disabled={!lines.length} onClick={submit}>Giriş Yap</Button>}>
        {lines.length === 0 ? <Empty description="Barkod okutun ya da rehberden satır ekleyin" /> : (
          <Table<Line> rowKey="key" size="small" dataSource={lines} pagination={false}
            columns={[
              { title: '#', render: (_, __, i) => i + 1, width: 44 },
              { title: 'Ürün', render: (_, r) => <Select style={{ minWidth: 220 }} showSearch optionFilterProp="label" placeholder="Ürün" value={r.productId} onChange={(v) => patch(r.key, { productId: v })} options={products} /> },
              { title: 'Birim', render: (_, r) => <Select style={{ width: 100 }} showSearch optionFilterProp="label" placeholder="Birim" value={r.unitId} onChange={(v) => patch(r.key, { unitId: v })} options={units} /> },
              { title: 'Miktar', render: (_, r) => <InputNumber style={{ width: 90 }} min={0} value={r.quantity} onChange={(v) => patch(r.key, { quantity: Number(v) || 0 })} /> },
              { title: isOut ? 'Kaynak Lok.' : 'Lokasyon', render: (_, r) => <Select style={{ width: 130 }} showSearch optionFilterProp="label" placeholder={isOut ? 'Kaynak' : 'Otomatik'} allowClear value={r.locationId} onChange={(v) => patch(r.key, { locationId: v })} options={locations} /> },
              { title: 'Parti', render: (_, r) => <Input style={{ width: 110 }} placeholder="Parti" value={r.batchNo} onChange={(e) => patch(r.key, { batchNo: e.target.value })} /> },
              { title: 'Seri', render: (_, r) => <Input style={{ width: 100 }} placeholder="Seri" value={r.serialNo} onChange={(e) => patch(r.key, { serialNo: e.target.value })} /> },
              { title: '', width: 40, render: (_, r) => <Button danger type="text" icon={<DeleteOutlined />} onClick={() => setLines((prev) => prev.filter((l) => l.key !== r.key))} /> },
            ]} />
        )}
      </Card>
    </div>
  )
}
