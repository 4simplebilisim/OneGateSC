import { useCallback, useEffect, useState } from 'react'
import { App, Button, Card, InputNumber, Modal, Space, Table } from 'antd'
import { ReloadOutlined, LockOutlined, UnlockOutlined } from '@ant-design/icons'
import { axiosInstance } from '../providers/dataProvider'
import { PageHeader } from '../components/PageHeader'

type Stock = {
  id: number; batchNo: string | null; serialNo: string | null
  mainQty: string; reservedQty: string; availableQty: string
  product?: { id: number; code: string }; location?: { id: number; code: string }; status?: { id: number; code: string }; pallet?: { id: number; palletNo: string } | null
}

export const Reservation = () => {
  const { message } = App.useApp()
  const [rows, setRows] = useState<Stock[]>([])
  const [loading, setLoading] = useState(true)
  const [op, setOp] = useState<{ row: Stock; mode: 'reserve' | 'release' } | null>(null)
  const [qty, setQty] = useState<number | null>(null)
  const [busy, setBusy] = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    axiosInstance.get('/api/stock', { params: { pageSize: 200 } })
      .then((r) => setRows(Array.isArray(r.data) ? r.data : (r.data.data ?? [])))
      .finally(() => setLoading(false))
  }, [])
  useEffect(load, [load])

  const submit = async () => {
    if (!op || !qty) { message.warning('Miktar girin'); return }
    const s = op.row
    setBusy(true)
    try {
      await axiosInstance.post(`/api/stock/${op.mode}`, {
        locationId: s.location!.id, productId: s.product!.id, statusId: s.status!.id,
        batchNo: s.batchNo ?? undefined, serialNo: s.serialNo ?? undefined, palletId: s.pallet?.id ?? undefined,
        quantity: qty,
      })
      message.success(op.mode === 'reserve' ? 'Rezerve edildi' : 'Serbest bırakıldı')
      setOp(null); setQty(null); load()
    } catch (e) {
      message.error((e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'İşlem başarısız')
    } finally { setBusy(false) }
  }

  return (
    <div className="og-page">
      <PageHeader title="Rezervasyon" subtitle="Stok rezerve et / serbest bırak (uygun miktar = ana − rezerve)"
        extra={<Button icon={<ReloadOutlined />} onClick={load}>Yenile</Button>} />
      <Card className="og-section-card" size="small" title={`Stok (${rows.length})`}>
        <Table<Stock>
          rowKey="id" size="small" loading={loading} dataSource={rows} pagination={{ pageSize: 20 }} scroll={{ x: true }}
          columns={[
            { title: 'Lokasyon', dataIndex: ['location', 'code'] },
            { title: 'Ürün', dataIndex: ['product', 'code'] },
            { title: 'Statü', dataIndex: ['status', 'code'] },
            { title: 'Parti', dataIndex: 'batchNo', render: (v) => v ?? '—' },
            { title: 'Ana', dataIndex: 'mainQty', align: 'right' as const },
            { title: 'Rezerve', dataIndex: 'reservedQty', align: 'right' as const },
            { title: 'Uygun', dataIndex: 'availableQty', align: 'right' as const },
            {
              title: '', key: 'ops', width: 200, render: (_, r) => (
                <Space size={4}>
                  <Button size="small" type="text" icon={<LockOutlined />} onClick={() => { setOp({ row: r, mode: 'reserve' }); setQty(null) }}>Rezerve</Button>
                  <Button size="small" type="text" icon={<UnlockOutlined />} onClick={() => { setOp({ row: r, mode: 'release' }); setQty(null) }}>Serbest</Button>
                </Space>
              ),
            },
          ]}
        />
      </Card>
      <Modal open={!!op} title={op?.mode === 'reserve' ? 'Rezerve Et' : 'Serbest Bırak'} okText="Uygula" cancelText="İptal" confirmLoading={busy} onOk={submit} onCancel={() => setOp(null)}>
        {op && <Space orientation="vertical" style={{ width: '100%' }}>
          <span>{op.row.product?.code} · {op.row.location?.code} · uygun {op.row.availableQty} / rezerve {op.row.reservedQty}</span>
          <InputNumber min={0} style={{ width: '100%' }} placeholder="Miktar" value={qty} onChange={setQty} />
        </Space>}
      </Modal>
    </div>
  )
}
