import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { App, Button, Card, Descriptions, Input, Space, Table, Typography, Spin, Badge } from 'antd'
import { ArrowLeftOutlined, PlusOutlined } from '@ant-design/icons'
import { axiosInstance } from '../providers/dataProvider'
import { PageHeader } from '../components/PageHeader'
import { canWrite } from '../formConfig'

interface Barcode { id: number; barcode: string; labelAddress?: string | null; isActive: boolean }
interface PU {
  id: number
  multiplier: string
  barcode?: string | null
  isBaseUnit: boolean
  batchTracking: boolean
  serialTracking: boolean
  product?: { code: string; name: string }
  unit?: { code: string; name: string }
  barcodes?: Barcode[]
}

export const ProductUnitBarcodes = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { message } = App.useApp()
  const [pu, setPu] = useState<PU | null>(null)
  const [loading, setLoading] = useState(true)
  const [newBarcode, setNewBarcode] = useState('')
  const writable = canWrite()

  const load = useCallback(() => {
    setLoading(true)
    axiosInstance
      .get(`/api/product-units/${id}`)
      .then((r) => setPu(r.data))
      .catch((e) => message.error(e?.response?.data?.error ?? 'Yüklenemedi'))
      .finally(() => setLoading(false))
  }, [id, message])

  useEffect(load, [load])

  const add = async () => {
    if (!newBarcode.trim()) return
    try {
      await axiosInstance.post(`/api/product-units/${id}/barcodes`, { barcode: newBarcode.trim() })
      setNewBarcode('')
      message.success('Barkod eklendi')
      load()
    } catch (e) {
      message.error((e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Eklenemedi')
    }
  }

  const remove = async (barcodeId: number) => {
    try {
      await axiosInstance.delete(`/api/product-units/${id}/barcodes/${barcodeId}`)
      message.success('Silindi')
      load()
    } catch {
      message.error('Silinemedi')
    }
  }

  if (loading || !pu) return <div style={{ padding: 80, textAlign: 'center' }}><Spin size="large" /></div>

  const yesno = (v: boolean) => (v ? <Badge status="success" text="Evet" /> : <Badge color="#cbd5e1" text="Hayır" />)

  return (
    <div className="og-page" style={{ maxWidth: 900 }}>
      <PageHeader
        title={`Ürün Ölçü Birimi — ${pu.product?.code} / ${pu.unit?.code}`}
        subtitle="Çoklu barkod yönetimi"
        extra={<Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/product-units')}>Liste</Button>}
      />

      <Card className="og-section-card" size="small" title="Bilgiler">
        <Descriptions bordered size="small" column={{ xs: 1, sm: 2, lg: 3 }}>
          <Descriptions.Item label="Ürün">{pu.product?.code} — {pu.product?.name}</Descriptions.Item>
          <Descriptions.Item label="Birim">{pu.unit?.code} — {pu.unit?.name}</Descriptions.Item>
          <Descriptions.Item label="Çarpan">{pu.multiplier}</Descriptions.Item>
          <Descriptions.Item label="Birincil Barkod">{pu.barcode ?? '—'}</Descriptions.Item>
          <Descriptions.Item label="Parti Takibi">{yesno(pu.batchTracking)}</Descriptions.Item>
          <Descriptions.Item label="Seri Takibi">{yesno(pu.serialTracking)}</Descriptions.Item>
        </Descriptions>
      </Card>

      <Card className="og-section-card" size="small" title={`Barkodlar (${pu.barcodes?.length ?? 0})`}>
        {writable && (
          <Space.Compact style={{ marginBottom: 12, width: '100%', maxWidth: 360 }}>
            <Input placeholder="Yeni barkod" value={newBarcode} onChange={(e) => setNewBarcode(e.target.value)} onPressEnter={add} />
            <Button type="primary" icon={<PlusOutlined />} onClick={add}>Ekle</Button>
          </Space.Compact>
        )}
        <Table<Barcode>
          dataSource={pu.barcodes ?? []}
          rowKey="id"
          size="small"
          pagination={false}
          columns={[
            { title: '#', dataIndex: 'id', width: 60 },
            { title: 'Barkod', dataIndex: 'barcode' },
            { title: 'Etiket Adresi', dataIndex: 'labelAddress', render: (v) => v ?? '—' },
            ...(writable
              ? [{ title: '', key: 'x', width: 70, render: (_: unknown, row: Barcode) => <Typography.Link type="danger" onClick={() => remove(row.id)}>Sil</Typography.Link> }]
              : []),
          ]}
        />
      </Card>
    </div>
  )
}
