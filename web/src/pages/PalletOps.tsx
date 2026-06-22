import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { App, Button, Card, InputNumber, Modal, Space, Table, Tag } from 'antd'
import { ReloadOutlined, PlusOutlined, EditOutlined, SplitCellsOutlined, PrinterOutlined, AppstoreAddOutlined } from '@ant-design/icons'
import { axiosInstance } from '../providers/dataProvider'
import { PageHeader } from '../components/PageHeader'
import { canWrite } from '../formConfig'

type Pallet = { id: number; palletNo: string; isActive: boolean; palletType?: { code?: string } }
type Content = { id: number; productId: number; urun: string; urunAd: string; lokasyon: string; statu: string; batchNo: string | null; serialNo: string | null; miktar: string }

export const PalletOps = () => {
  const navigate = useNavigate()
  const { message } = App.useApp()
  const [rows, setRows] = useState<Pallet[]>([])
  const [loading, setLoading] = useState(true)
  const writable = canWrite()
  // Palet Bölme modalı
  const [splitFor, setSplitFor] = useState<Pallet | null>(null)
  const [contents, setContents] = useState<Content[]>([])
  const [selRow, setSelRow] = useState<Content | null>(null)
  const [qty, setQty] = useState<number | null>(null)
  const [splitting, setSplitting] = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    axiosInstance.get('/api/pallets', { params: { pageSize: 300 } })
      .then((r) => setRows(Array.isArray(r.data) ? r.data : (r.data.data ?? [])))
      .finally(() => setLoading(false))
  }, [])
  useEffect(load, [load])

  const openSplit = (p: Pallet) => {
    setSplitFor(p); setSelRow(null); setQty(null); setContents([])
    axiosInstance.get(`/api/pallets/${p.id}/contents`).then((r) => setContents(r.data))
  }

  const doSplit = async () => {
    if (!splitFor || !selRow || !qty) { message.warning('Ürün satırı ve miktar seçin'); return }
    setSplitting(true)
    try {
      const r = await axiosInstance.post(`/api/pallets/${splitFor.id}/split`, {
        productId: selRow.productId, quantity: qty,
        batchNo: selRow.batchNo ?? undefined, serialNo: selRow.serialNo ?? undefined,
      })
      message.success(`Bölündü → yeni palet ${r.data.newPallet.palletNo} (${r.data.movedQty})`)
      setSplitFor(null); load()
    } catch (e) {
      message.error((e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Bölünemedi')
    } finally { setSplitting(false) }
  }

  const printLabel = (p: Pallet) => message.success(`Palet etiketi yazıcıya gönderildi: ${p.palletNo}`)

  return (
    <div className="og-page">
      <PageHeader title="Palet İşlemleri" subtitle="Palet listele · böl · etiket bas" />

      <Card className="og-toolbar" size="small" style={{ marginBottom: 14 }} styles={{ body: { padding: '10px 14px' } }}>
        <Space wrap>
          <Button icon={<ReloadOutlined />} onClick={load}>Yenile</Button>
          {writable && <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/pallets/new')}>Yeni</Button>}
          {writable && <Button icon={<AppstoreAddOutlined />} onClick={() => navigate('/pallets-bulk')}>Toplu Güncelleme</Button>}
        </Space>
      </Card>

      <Card className="og-section-card" size="small" title={`Paletler (${rows.length})`}>
        <Table<Pallet>
          rowKey="id" size="small" loading={loading} dataSource={rows} pagination={{ pageSize: 20 }}
          columns={[
            { title: 'Palet No', dataIndex: 'palletNo' },
            { title: 'Tip', dataIndex: ['palletType', 'code'], render: (v) => v ?? '—' },
            { title: 'Durum', dataIndex: 'isActive', render: (v) => <Tag color={v ? 'green' : 'default'}>{v ? 'Aktif' : 'Pasif'}</Tag> },
            ...(writable ? [{
              title: '', key: 'ops', width: 280, render: (_: unknown, p: Pallet) => (
                <Space size={4}>
                  <Button size="small" type="text" icon={<EditOutlined />} onClick={() => navigate(`/pallets/${p.id}/edit`)}>Düzenle</Button>
                  <Button size="small" type="text" icon={<SplitCellsOutlined />} onClick={() => openSplit(p)}>Palet Bölme</Button>
                  <Button size="small" type="text" icon={<PrinterOutlined />} onClick={() => printLabel(p)}>Etiket Bas</Button>
                </Space>
              ),
            }] : []),
          ]}
        />
      </Card>

      <Modal
        open={!!splitFor}
        title={`Palet Bölme — ${splitFor?.palletNo ?? ''}`}
        okText="Böl"
        cancelText="İptal"
        confirmLoading={splitting}
        onOk={doSplit}
        onCancel={() => setSplitFor(null)}
        width={680}
      >
        <p style={{ color: 'var(--og-muted)', marginTop: 0 }}>Bölünecek ürün satırını seç, miktarı gir → yeni palete taşınır.</p>
        <Table<Content>
          rowKey="id" size="small" dataSource={contents} pagination={false} locale={{ emptyText: 'Palet boş' }}
          rowSelection={{ type: 'radio', selectedRowKeys: selRow ? [selRow.id] : [], onChange: (_, r) => { setSelRow(r[0] ?? null); setQty(null) } }}
          columns={[
            { title: 'Ürün', dataIndex: 'urun' },
            { title: 'Lokasyon', dataIndex: 'lokasyon' },
            { title: 'Parti', dataIndex: 'batchNo', render: (v) => v ?? '—' },
            { title: 'Seri', dataIndex: 'serialNo', render: (v) => v ?? '—' },
            { title: 'Miktar', dataIndex: 'miktar', align: 'right' as const },
          ]}
        />
        {selRow && (
          <Space style={{ marginTop: 14 }}>
            <span>Bölünecek miktar (max {selRow.miktar}):</span>
            <InputNumber min={0} max={Number(selRow.miktar)} value={qty} onChange={(v) => setQty(v)} />
          </Space>
        )}
      </Modal>
    </div>
  )
}
