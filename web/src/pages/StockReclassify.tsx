import { useCallback, useEffect, useState } from 'react'
import { App, Button, Card, Form, Input, Modal, Select, Table } from 'antd'
import { ReloadOutlined, SwapOutlined } from '@ant-design/icons'
import { axiosInstance } from '../providers/dataProvider'
import { PageHeader } from '../components/PageHeader'

type Stock = { id: number; batchNo: string | null; serialNo: string | null; mainQty: string; product?: { id: number; code: string }; location?: { code: string }; status?: { code: string } }
type Opt = { value: number; label: string }

export const StockReclassify = () => {
  const { message } = App.useApp()
  const [form] = Form.useForm()
  const [rows, setRows] = useState<Stock[]>([])
  const [loading, setLoading] = useState(true)
  const [products, setProducts] = useState<Opt[]>([])
  const [editRow, setEditRow] = useState<Stock | null>(null)
  const [busy, setBusy] = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    axiosInstance.get('/api/stock', { params: { pageSize: 200 } })
      .then((r) => setRows(Array.isArray(r.data) ? r.data : (r.data.data ?? [])))
      .finally(() => setLoading(false))
  }, [])
  useEffect(load, [load])
  useEffect(() => {
    axiosInstance.get('/api/products', { params: { pageSize: 500 } }).then((r) => {
      const list = Array.isArray(r.data) ? r.data : (r.data.data ?? [])
      setProducts(list.map((x: Record<string, unknown>) => ({ value: x.id as number, label: `${x.code}${x.name ? ' — ' + x.name : ''}` })))
    })
  }, [])

  const open = (r: Stock) => { setEditRow(r); form.setFieldsValue({ batchNo: r.batchNo ?? '', serialNo: r.serialNo ?? '', productId: r.product?.id }) }

  const apply = async (vals: { batchNo?: string; serialNo?: string; productId?: number }) => {
    if (!editRow) return
    setBusy(true)
    try {
      const body: Record<string, unknown> = {}
      if ((vals.batchNo ?? '') !== (editRow.batchNo ?? '')) body.batchNo = vals.batchNo || null
      if ((vals.serialNo ?? '') !== (editRow.serialNo ?? '')) body.serialNo = vals.serialNo || null
      if (vals.productId && vals.productId !== editRow.product?.id) body.productId = vals.productId
      if (Object.keys(body).length === 0) { message.warning('Değişiklik yok'); setBusy(false); return }
      const r = await axiosInstance.post(`/api/stock/${editRow.id}/reclassify`, body)
      message.success(r.data.merged ? `Mevcut stoğa birleştirildi (#${r.data.into})` : 'Stok güncellendi')
      setEditRow(null); load()
    } catch (e) {
      message.error((e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'İşlem başarısız')
    } finally { setBusy(false) }
  }

  return (
    <div className="og-page">
      <PageHeader title="Stok Operasyon" subtitle="Batch Atama / Batch Değiştirme / Ürün Kod Değişim — kimlik değişimi (hedef varsa birleşir)"
        extra={<Button icon={<ReloadOutlined />} onClick={load}>Yenile</Button>} />
      <Card className="og-section-card" size="small" title={`Stok (${rows.length})`}>
        <Table<Stock>
          rowKey="id" size="small" loading={loading} dataSource={rows} pagination={{ pageSize: 20 }} scroll={{ x: true }}
          columns={[
            { title: 'Lokasyon', dataIndex: ['location', 'code'] },
            { title: 'Ürün', dataIndex: ['product', 'code'] },
            { title: 'Statü', dataIndex: ['status', 'code'] },
            { title: 'Parti', dataIndex: 'batchNo', render: (v) => v ?? '—' },
            { title: 'Seri', dataIndex: 'serialNo', render: (v) => v ?? '—' },
            { title: 'Miktar', dataIndex: 'mainQty', align: 'right' as const },
            { title: '', key: 'op', width: 110, render: (_, r) => <Button size="small" type="text" icon={<SwapOutlined />} onClick={() => open(r)}>Değiştir</Button> },
          ]}
        />
      </Card>
      <Modal open={!!editRow} title="Stok Kimlik Değişimi" okText="Uygula" cancelText="İptal" confirmLoading={busy} onOk={() => form.submit()} onCancel={() => setEditRow(null)}>
        <Form form={form} layout="vertical" onFinish={apply}>
          <Form.Item name="productId" label="Ürün (Ürün Kod Değişim)"><Select options={products} showSearch optionFilterProp="label" /></Form.Item>
          <Form.Item name="batchNo" label="Parti No (Batch Atama / Değiştirme)"><Input maxLength={100} /></Form.Item>
          <Form.Item name="serialNo" label="Seri No"><Input maxLength={100} /></Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
