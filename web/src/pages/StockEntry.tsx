import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { App, Button, Card, Empty, Input, InputNumber, Select, Space, Table, Tag } from 'antd'
import { ScanOutlined, PlusOutlined, DeleteOutlined, SaveOutlined } from '@ant-design/icons'
import { axiosInstance } from '../providers/dataProvider'
import { PageHeader } from '../components/PageHeader'

type Opt = { value: number; label: string }
type OpType = { id: number; code: string; name?: string; direction: string }
type Line = { key: number; productId?: number; unitId?: number; quantity: number; locationId?: number; statusId?: number; batchNo?: string; serialNo?: string }

const errMsg = (e: unknown, f: string) => (e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? f
const arr = (d: unknown) => (Array.isArray(d) ? d : ((d as { data?: unknown[] })?.data ?? []))

// Stok Giriş / Stok Çıkış — Tesis/Operasyon seç → barkod okut ya da rehberden ürün seç →
// ürün·birim·miktar·lokasyon·statü satırları → belge + OKUTMA kaydı + onay + tamamla.
//
// Satır girmek OKUTMA yerine geçer: her satır için kapsam (scope) kaydı yazılır.
// Bunu yapmadan kontrollü operasyonda onay "toplama eksik (0/N)" ile düşüyordu.
// Kapsam yazımı ayrıca operasyonun LOKASYON ve STATÜ kurallarını doğrular.
export const StockEntry = ({ direction = 'INBOUND' }: { direction?: 'INBOUND' | 'OUTBOUND' }) => {
  const { message } = App.useApp()
  const navigate = useNavigate()
  const isOut = direction === 'OUTBOUND'
  const [ops, setOps] = useState<Opt[]>([])
  const [warehouses, setWarehouses] = useState<Opt[]>([])
  const [products, setProducts] = useState<Opt[]>([])
  const [locations, setLocations] = useState<Opt[]>([])
  const [operationTypeId, setOperationTypeId] = useState<number>()
  const [warehouseId, setWarehouseId] = useState<number>()
  const [barcode, setBarcode] = useState('')
  const [lines, setLines] = useState<Line[]>([])
  const [busy, setBusy] = useState(false)
  const [opStatuses, setOpStatuses] = useState<Opt[] | null>(null) // null = operasyonda kural yok → tüm statüler
  const [allStatuses, setAllStatuses] = useState<Opt[]>([])
  const [unitsOf, setUnitsOf] = useState<Record<number, Opt[]>>({}) // ürün → kendi birimleri
  const [anaBirim, setAnaBirim] = useState<Record<number, Opt>>({}) // ürün → ana birim (TBLPRODUCTUNIT yoksa tek kaynak)
  const keyRef = useRef(1)

  useEffect(() => {
    axiosInstance.get('/api/operation-types', { params: { pageSize: 300 } }).then((r) => {
      setOps((arr(r.data) as OpType[]).filter((o) => o.direction === direction)
        .map((o) => ({ value: o.id, label: `${o.code}${o.name ? ' — ' + o.name : ''}` })))
    })
    const simple = (url: string, lbl: (x: Record<string, unknown>) => string, set: (o: Opt[]) => void, params?: object) =>
      axiosInstance.get(url, { params: { pageSize: 500, ...params } }).then((r) =>
        set((arr(r.data) as Record<string, unknown>[]).map((x) => ({ value: x.id as number, label: lbl(x) }))))
    simple('/api/warehouses', (x) => `${x.code} — ${x.name ?? ''}`, setWarehouses)
    // Ürün listesi ana birimi de taşır: alternatif birim tanımı olmayan ürünlerde
    // (canlıda 209 ürünün 207'si) birim seçimi buradan gelir.
    axiosInstance.get('/api/products', { params: { pageSize: 500 } }).then((r) => {
      const rows = arr(r.data) as Record<string, unknown>[]
      setProducts(rows.map((x) => ({ value: x.id as number, label: `${x.code}${x.name ? ' — ' + x.name : ''}` })))
      const m: Record<number, Opt> = {}
      for (const x of rows) {
        const u = x.unit as { id: number; code: string } | undefined
        if (u?.id) m[x.id as number] = { value: u.id, label: u.code }
        else if (x.unitId) m[x.id as number] = { value: x.unitId as number, label: '' }
      }
      setAnaBirim(m)
    })
    simple('/api/statuses', (x) => `${x.code}${x.name ? ' — ' + x.name : ''}`, setAllStatuses)
  }, [direction])

  // Lokasyonlar seçilen DEPOya göre daralır (yanlış depoya giriş yapılmasın)
  useEffect(() => {
    if (!warehouseId) { setLocations([]); return }
    axiosInstance.get('/api/locations', { params: { pageSize: 500, warehouseId } }).then((r) =>
      setLocations((arr(r.data) as Record<string, unknown>[]).map((x) => ({ value: x.id as number, label: String(x.code) }))))
    setLines((prev) => prev.map((l) => ({ ...l, locationId: undefined }))) // depo değişti → lokasyonlar geçersiz
  }, [warehouseId])

  // Operasyonun STATÜ kuralı: tanımlıysa yalnız o statüler seçilebilir; TEK ise satırlara otomatik gelir
  useEffect(() => {
    if (!operationTypeId) { setOpStatuses(null); return }
    axiosInstance.get('/api/operation-type-statuses', { params: { operationTypeId, pageSize: 200 } }).then((r) => {
      const rows = arr(r.data) as Record<string, unknown>[]
      const alan = isOut ? 'sourceStatusId' : 'targetStatusId'
      const ids = [...new Set(rows.map((x) => x[alan] as number | null).filter((v): v is number => v != null))]
      setOpStatuses(ids.length ? ids.map((id) => ({ value: id, label: '' })) : null)
    }).catch(() => setOpStatuses(null))
  }, [operationTypeId, isOut])

  // Statü seçenekleri: operasyon kuralı varsa süzülmüş liste, yoksa tümü
  const statusOpts = opStatuses
    ? allStatuses.filter((s) => opStatuses.some((o) => o.value === s.value))
    : allStatuses
  const tekStatu = statusOpts.length === 1 ? statusOpts[0].value : undefined

  // Tek statü varsa boş satırlara otomatik yerleştir
  useEffect(() => {
    if (tekStatu == null) return
    setLines((prev) => prev.map((l) => (l.statusId == null ? { ...l, statusId: tekStatu } : l)))
  }, [tekStatu])

  /** Ürünün kendi birimleri (ana + alternatifler). Tüm birim listesi gösterilmiyordu → yanlış birim seçilebiliyordu. */
  const loadUnits = (productId: number) => {
    if (unitsOf[productId]) return // önbellek
    axiosInstance.get('/api/product-units', { params: { productId } }).then((r) => {
      const rows = arr(r.data) as Record<string, unknown>[]
      const opts = rows.map((x) => {
        const u = x.unit as { id: number; code: string; name?: string } | undefined
        return { value: (u?.id ?? x.unitId) as number, label: `${u?.code ?? ''}${x.isBaseUnit ? ' (ana)' : ''}` }
      }).filter((o) => o.value != null)
      // Alternatif birim tanımı yoksa ürünün ANA birimi tek seçenektir
      const son = opts.length ? opts : (anaBirim[productId] ? [anaBirim[productId]] : [])
      setUnitsOf((p) => ({ ...p, [productId]: son }))
      if (son.length === 1) setLines((prev) => prev.map((l) => (l.productId === productId && l.unitId == null ? { ...l, unitId: son[0].value } : l)))
    }).catch(() => {
      const yedek = anaBirim[productId] ? [anaBirim[productId]] : []
      setUnitsOf((p) => ({ ...p, [productId]: yedek }))
      if (yedek.length === 1) setLines((prev) => prev.map((l) => (l.productId === productId && l.unitId == null ? { ...l, unitId: yedek[0].value } : l)))
    })
  }

  const patch = (key: number, p: Partial<Line>) => setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...p } : l)))
  const addLine = (partial: Partial<Line>) =>
    setLines((prev) => {
      const i = partial.productId ? prev.findIndex((l) => l.productId === partial.productId && l.unitId === partial.unitId) : -1
      if (i >= 0) { const c = [...prev]; c[i] = { ...c[i], quantity: c[i].quantity + (partial.quantity ?? 1) }; return c }
      return [...prev, { key: keyRef.current++, quantity: 1, statusId: tekStatu, ...partial }]
    })

  const scan = () => {
    const code = barcode.trim()
    if (!code) return
    axiosInstance.get('/api/lookup/barcode', { params: { code } }).then((r) => {
      if (!r.data.found) { message.warning(`Barkod bulunamadı: ${code}`); return }
      const pid = r.data.product?.id as number | undefined
      if (pid) loadUnits(pid)
      addLine({ productId: pid, unitId: r.data.unit?.id, quantity: r.data.fields?.quantity ?? 1, batchNo: r.data.fields?.batchNo })
      setBarcode('')
    }).catch(() => message.error('Barkod sorgulanamadı'))
  }

  const submit = async () => {
    if (!operationTypeId || !warehouseId) { message.warning('Depo ve operasyon seçin'); return }
    const valid = lines.filter((l) => l.productId && l.unitId && l.quantity > 0)
    if (!valid.length) { message.warning('En az bir geçerli satır girin'); return }
    // Lokasyon ZORUNLU — "otomatik" davranışı yoktu, boş gidince stok nereye yazılacağı belirsiz kalıyordu
    const lokasyonsuz = valid.findIndex((l) => !l.locationId)
    if (lokasyonsuz >= 0) { message.warning(`Satır ${lokasyonsuz + 1}: lokasyon zorunlu`); return }
    const statusuz = valid.findIndex((l) => !l.statusId)
    if (statusuz >= 0) { message.warning(`Satır ${statusuz + 1}: statü zorunlu`); return }

    setBusy(true)
    let docId: number | undefined
    try {
      const doc = await axiosInstance.post('/api/documents', {
        operationTypeId, warehouseId,
        lines: valid.map((l) => ({
          productId: l.productId, unitId: l.unitId, quantity: l.quantity,
          ...(isOut
            ? { sourceLocationId: l.locationId, sourceStatusId: l.statusId }
            : { targetLocationId: l.locationId, targetStatusId: l.statusId }),
          batchNo: l.batchNo || undefined, serialNo: l.serialNo || undefined,
        })),
      })
      docId = doc.data.id
      // OKUTMA kaydı: satır girmek okutma yerine geçer. Operasyonun lokasyon/statü
      // kuralları burada doğrulanır → "Lokasyon uyumsuz" / "Statü uyumsuz" buradan gelir.
      const det = await axiosInstance.get(`/api/documents/${docId}`)
      const docLines = (det.data.lines ?? []) as { id: number }[]
      for (const [i, dl] of docLines.entries()) {
        const l = valid[i]
        try {
          await axiosInstance.post('/api/document-line-scopes', {
            documentLineId: dl.id, quantity: l.quantity, unitId: l.unitId,
            ...(isOut
              ? { sourceLocationId: l.locationId, sourceStatusId: l.statusId }
              : { targetLocationId: l.locationId, targetStatusId: l.statusId }),
            batchNo: l.batchNo || null, serialNo: l.serialNo || null,
          })
        } catch (e) {
          throw new Error(`Satır ${i + 1}: ${errMsg(e, 'okutma kaydedilemedi')}`)
        }
      }
      await axiosInstance.post(`/api/documents/${docId}/confirm`)
      await axiosInstance.post(`/api/documents/${docId}/complete`)
      message.success(`Stok ${isOut ? 'çıkışı' : 'girişi'} tamamlandı: ${doc.data.documentNo} (${valid.length} satır)`)
      navigate(`/documents/${docId}`)
    } catch (e) {
      const m = e instanceof Error && e.message.startsWith('Satır') ? e.message : errMsg(e, 'İşlem başarısız')
      message.error(docId ? `${m} — belge TASLAK olarak duruyor, Belgeler ekranından düzeltebilirsiniz` : m)
    } finally { setBusy(false) }
  }

  return (
    <div className="og-page" style={{ maxWidth: 1180 }}>
      <PageHeader title={isOut ? 'Stok Çıkış' : 'Stok Giriş'} subtitle={`Depo/operasyon seç → barkod okut ya da rehberden ürün seç → ${isOut ? 'çıkış' : 'giriş'} işlemini tamamla (stok ${isOut ? 'düşülür' : 'yazılır'})`} />
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
          {operationTypeId != null && (
            <div style={{ paddingBottom: 4 }}>
              {opStatuses
                ? <Tag color="blue">{statusOpts.length === 1 ? `Statü sabit: ${statusOpts[0].label}` : `${statusOpts.length} statü seçilebilir`}</Tag>
                : <Tag>Statü kuralı yok — tümü seçilebilir</Tag>}
            </div>
          )}
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
        extra={<Button type="primary" icon={<SaveOutlined />} loading={busy} disabled={!lines.length} onClick={submit}>{isOut ? 'Çıkış Yap' : 'Giriş Yap'}</Button>}>
        {lines.length === 0 ? <Empty description="Barkod okutun ya da rehberden satır ekleyin" /> : (
          <Table<Line> rowKey="key" size="small" dataSource={lines} pagination={false} scroll={{ x: 'max-content' }}
            columns={[
              { title: '#', render: (_, __, i) => i + 1, width: 44 },
              {
                title: 'Ürün',
                render: (_, r) => (
                  <Select style={{ minWidth: 220 }} showSearch optionFilterProp="label" placeholder="Ürün" value={r.productId}
                    onChange={(v) => { patch(r.key, { productId: v, unitId: undefined }); loadUnits(v) }} options={products} />
                ),
              },
              {
                title: 'Birim',
                render: (_, r) => {
                  const opts = r.productId ? (unitsOf[r.productId] ?? []) : []
                  return (
                    <Select style={{ width: 120 }} showSearch optionFilterProp="label"
                      placeholder={r.productId ? (opts.length ? 'Birim' : 'Birim yok') : 'Önce ürün'}
                      disabled={!r.productId} value={r.unitId} onChange={(v) => patch(r.key, { unitId: v })} options={opts} />
                  )
                },
              },
              { title: 'Miktar', render: (_, r) => <InputNumber style={{ width: 90 }} min={0} value={r.quantity} onChange={(v) => patch(r.key, { quantity: Number(v) || 0 })} /> },
              {
                title: <>{isOut ? 'Kaynak Lok.' : 'Lokasyon'} <span style={{ color: '#cf1322' }}>*</span></>,
                render: (_, r) => (
                  <Select style={{ width: 150 }} showSearch optionFilterProp="label"
                    placeholder={warehouseId ? 'Lokasyon seç' : 'Önce depo'} disabled={!warehouseId}
                    status={r.locationId ? undefined : 'error'}
                    value={r.locationId} onChange={(v) => patch(r.key, { locationId: v })} options={locations} />
                ),
              },
              {
                title: <>Statü <span style={{ color: '#cf1322' }}>*</span></>,
                render: (_, r) => (
                  <Select style={{ width: 160 }} showSearch optionFilterProp="label" placeholder="Statü"
                    status={r.statusId ? undefined : 'error'}
                    value={r.statusId} onChange={(v) => patch(r.key, { statusId: v })} options={statusOpts} />
                ),
              },
              { title: 'Parti', render: (_, r) => <Input style={{ width: 110 }} placeholder="Parti" value={r.batchNo} onChange={(e) => patch(r.key, { batchNo: e.target.value })} /> },
              { title: 'Seri', render: (_, r) => <Input style={{ width: 100 }} placeholder="Seri" value={r.serialNo} onChange={(e) => patch(r.key, { serialNo: e.target.value })} /> },
              { title: '', width: 40, render: (_, r) => <Button danger type="text" icon={<DeleteOutlined />} onClick={() => setLines((prev) => prev.filter((l) => l.key !== r.key))} /> },
            ]} />
        )}
      </Card>
    </div>
  )
}
