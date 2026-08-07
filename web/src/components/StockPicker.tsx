import { useEffect, useState } from 'react'
import { App, Button, Empty, Input, Modal, Select, Space, Table, Tag } from 'antd'
import { SearchOutlined } from '@ant-design/icons'
import { axiosInstance } from '../providers/dataProvider'

export type StokSatiri = {
  id: number
  productId: number; productCode: string; productName: string | null
  unitId: number | null; unitCode: string | null
  locationId: number; locationCode: string
  statusId: number | null; statusCode: string | null
  batchNo: string | null; serialNo: string | null
  palletId: number | null; palletNo: string | null
  expiryDate: string | null
  eldeki: number; rezerve: number; serbest: number
}
type Opt = { value: number; label: string }
const arr = (d: unknown) => (Array.isArray(d) ? d : ((d as { data?: unknown[] })?.data ?? []))

/**
 * STOK REHBERİ — çıkışta "ne var" listesinden seçtirir.
 *
 * Çıkışta ürünü listeden seçip lokasyon/statü/parti/paleti ELLE yazmak hataya
 * açıktı: olmayan kombinasyonu yazınca hareket "stok bulunamadı" ile düşüyordu.
 * Rehber ELDEKİ stok satırlarını gösterir; seçilen satır tüm anahtarıyla
 * (lokasyon+statü+parti+seri+palet) forma düşer. SERBEST = eldeki − rezerve.
 */
export const StockPicker = ({
  open, onClose, onPick, warehouseId, allowedStatusIds,
}: {
  open: boolean
  onClose: () => void
  onPick: (rows: StokSatiri[]) => void
  warehouseId?: number
  /** Operasyonun izinli kaynak statüleri — boşsa süzgeç uygulanmaz */
  allowedStatusIds?: number[]
}) => {
  const { message } = App.useApp()
  const [rows, setRows] = useState<StokSatiri[]>([])
  const [yukleniyor, setYukleniyor] = useState(false)
  const [secili, setSecili] = useState<number[]>([])
  const [urunAra, setUrunAra] = useState('')
  const [partiAra, setPartiAra] = useState('')
  const [paletAra, setPaletAra] = useState('')
  const [lokasyonId, setLokasyonId] = useState<number>()
  const [lokasyonlar, setLokasyonlar] = useState<Opt[]>([])

  useEffect(() => {
    if (!open) return
    axiosInstance.get('/api/locations', { params: { pageSize: 500, ...(warehouseId ? { warehouseId } : {}) } })
      .then((r) => setLokasyonlar((arr(r.data) as Record<string, unknown>[]).map((l) => ({ value: l.id as number, label: l.code as string }))))
      .catch(() => undefined)
  }, [open, warehouseId])

  const yukle = () => {
    setYukleniyor(true)
    axiosInstance.get('/api/stock', {
      params: {
        pageSize: 300,
        ...(warehouseId ? { warehouseId } : {}),
        ...(lokasyonId ? { locationId: lokasyonId } : {}),
        ...(partiAra ? { batchNo: partiAra } : {}),
        ...(paletAra ? { palletNo: paletAra } : {}),
      },
    })
      .then((r) => {
        const ham = arr(r.data) as Array<Record<string, any>>
        const list: StokSatiri[] = ham.map((s) => {
          const eldeki = Number(s.mainQty ?? 0)
          const rezerve = Number(s.reservedQty ?? 0)
          return {
            id: s.id, productId: s.productId,
            productCode: s.product?.code ?? `#${s.productId}`, productName: s.product?.name ?? null,
            unitId: s.unitId ?? null, unitCode: s.unit?.code ?? null,
            locationId: s.locationId, locationCode: s.location?.code ?? `#${s.locationId}`,
            statusId: s.statusId ?? null, statusCode: s.status?.code ?? null,
            batchNo: s.batchNo ?? null, serialNo: s.serialNo ?? null,
            palletId: s.palletId ?? null, palletNo: s.pallet?.palletNo ?? null,
            expiryDate: s.expiryDate ? String(s.expiryDate).slice(0, 10) : null,
            eldeki, rezerve, serbest: eldeki - rezerve,
          }
        })
        // Operasyonun izin vermediği statüler listelenmez — seçilemeyeni göstermek yanıltır
        const suzulu = allowedStatusIds?.length
          ? list.filter((x) => x.statusId != null && allowedStatusIds.includes(x.statusId))
          : list
        const metin = urunAra.trim().toLocaleLowerCase('tr')
        setRows(metin
          ? suzulu.filter((x) => `${x.productCode} ${x.productName ?? ''}`.toLocaleLowerCase('tr').includes(metin))
          : suzulu)
      })
      .catch(() => message.error('Stok listesi alınamadı'))
      .finally(() => setYukleniyor(false))
  }
  useEffect(() => { if (open) { setSecili([]); yukle() } }, [open, lokasyonId])

  const sec = () => {
    const secilenler = rows.filter((r) => secili.includes(r.id))
    if (!secilenler.length) { message.warning('Satır seçin'); return }
    const rezervli = secilenler.filter((r) => r.serbest <= 0)
    if (rezervli.length) { message.warning(`${rezervli.length} satırda serbest miktar yok (tamamı rezerve)`); return }
    onPick(secilenler)
    onClose()
  }

  return (
    <Modal open={open} onCancel={onClose} width={1080} title="Stok Rehberi — çıkılacak stoğu seçin"
      okText={`Seçilenleri Ekle${secili.length ? ` (${secili.length})` : ''}`} cancelText="Vazgeç" onOk={sec}>
      <Space wrap size="small" style={{ marginBottom: 12 }}>
        <Input allowClear style={{ width: 200 }} placeholder="Ürün kodu / adı" prefix={<SearchOutlined />}
          value={urunAra} onChange={(e) => setUrunAra(e.target.value)} onPressEnter={yukle} />
        <Input allowClear style={{ width: 150 }} placeholder="Parti" value={partiAra}
          onChange={(e) => setPartiAra(e.target.value)} onPressEnter={yukle} />
        <Input allowClear style={{ width: 150 }} placeholder="Palet no" value={paletAra}
          onChange={(e) => setPaletAra(e.target.value)} onPressEnter={yukle} />
        <Select allowClear style={{ width: 170 }} showSearch optionFilterProp="label" placeholder="Lokasyon"
          value={lokasyonId} onChange={setLokasyonId} options={lokasyonlar} />
        <Button onClick={yukle} loading={yukleniyor}>Ara</Button>
      </Space>

      {!rows.length && !yukleniyor ? (
        <Empty description="Ölçütlere uyan stok yok" />
      ) : (
        <Table<StokSatiri> rowKey="id" size="small" loading={yukleniyor} dataSource={rows}
          pagination={{ pageSize: 12, size: 'small', showSizeChanger: false }} scroll={{ x: 'max-content', y: 380 }}
          rowSelection={{ selectedRowKeys: secili, onChange: (k) => setSecili(k as number[]),
            getCheckboxProps: (r) => ({ disabled: r.serbest <= 0 }) }}
          onRow={(r) => ({ onClick: () => { if (r.serbest > 0) setSecili((p) => p.includes(r.id) ? p.filter((x) => x !== r.id) : [...p, r.id]) } })}
          columns={[
            { title: 'Ürün', width: 220, render: (_, r) => <>{r.productCode}{r.productName ? <span style={{ color: '#8696ae' }}> — {r.productName}</span> : null}</> },
            { title: 'Lokasyon', dataIndex: 'locationCode', width: 110 },
            { title: 'Statü', dataIndex: 'statusCode', width: 90, render: (v) => v ?? '—' },
            { title: 'Parti', dataIndex: 'batchNo', width: 120, render: (v) => v ?? '—' },
            { title: 'Palet', dataIndex: 'palletNo', width: 120, render: (v) => v ?? '—' },
            { title: 'SKT', dataIndex: 'expiryDate', width: 100, render: (v) => v ?? '—' },
            { title: 'Eldeki', dataIndex: 'eldeki', align: 'right' as const, width: 90 },
            { title: 'Rezerve', dataIndex: 'rezerve', align: 'right' as const, width: 90,
              render: (v: number) => (v > 0 ? <Tag color="orange">{v}</Tag> : '—') },
            { title: 'Serbest', dataIndex: 'serbest', align: 'right' as const, width: 90,
              render: (v: number) => (v > 0 ? <b>{v}</b> : <Tag>0</Tag>) },
            { title: 'Birim', dataIndex: 'unitCode', width: 70, render: (v) => v ?? '—' },
          ]} />
      )}
    </Modal>
  )
}
