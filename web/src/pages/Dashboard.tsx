import { useEffect, useState, type ReactNode } from 'react'
import { Card, Col, Row, Statistic, Table, Tag, Spin } from 'antd'
import {
  DatabaseOutlined, ShoppingCartOutlined, ShopOutlined, SyncOutlined, FileTextOutlined, WalletOutlined,
} from '@ant-design/icons'
import { Link } from 'react-router-dom'
import { axiosInstance } from '../providers/dataProvider'
import { PageHeader } from '../components/PageHeader'

interface StockRow { productId: number; productCode: string; productName: string; onHand: number; reserved: number; available: number }
interface MrpRow { productId: number; productCode?: string; productName?: string; onHand?: number; reorderPoint?: number; suggestedQty?: number }

export const Dashboard = () => {
  const [loading, setLoading] = useState(true)
  const [stock, setStock] = useState<StockRow[]>([])
  const [open, setOpen] = useState<{ purchaseOrders: { count: number }; salesOrders: { count: number } } | null>(null)
  const [aging, setAging] = useState<{ openInvoiceCount: number; outstandingTotal: number; overdueCount: number; overdueTotal: number } | null>(null)
  const [mrp, setMrp] = useState<{ reorderCount: number; suggestions: MrpRow[] } | null>(null)

  useEffect(() => {
    Promise.all([
      axiosInstance.get('/api/reports/stock-summary'),
      axiosInstance.get('/api/reports/open-orders'),
      axiosInstance.get('/api/reports/invoice-aging'),
      axiosInstance.get('/api/reports/mrp-summary'),
    ])
      .then(([s, o, a, m]) => {
        setStock(s.data ?? [])
        setOpen(o.data)
        setAging(a.data)
        setMrp(m.data)
      })
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div style={{ padding: 80, textAlign: 'center' }}><Spin size="large" /></div>

  const card = (
    title: string, value: number | string, to: string, accent: string, accentSoft: string, icon: ReactNode, suffix?: string,
  ) => (
    <Col xs={12} sm={8} md={8} lg={4}>
      <Link to={to}>
        <Card
          size="small"
          hoverable
          className="og-stat"
          styles={{ body: { padding: '16px 18px', display: 'flex', alignItems: 'center', gap: 14 } }}
          style={{ ['--accent' as string]: accent, ['--accent-soft' as string]: accentSoft }}
        >
          <span className="og-stat__icon">{icon}</span>
          <Statistic title={title} value={value} suffix={suffix} styles={{ content: { fontSize: 24, fontWeight: 700, color: 'var(--og-ink)', lineHeight: 1.1 } }} />
        </Card>
      </Link>
    </Col>
  )

  return (
    <div className="og-page">
      <PageHeader title="Pano" subtitle="Depo, sipariş ve finans özeti — tek bakışta" />

      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        {card('Stok kalemi', stock.length, '/stock', '#16a3b3', 'rgba(68,212,227,.14)', <DatabaseOutlined />)}
        {card('Açık satınalma', open?.purchaseOrders.count ?? 0, '/purchase-orders', '#4e86ff', 'rgba(78,134,255,.12)', <ShoppingCartOutlined />)}
        {card('Açık satış', open?.salesOrders.count ?? 0, '/sales-orders', '#4e86ff', 'rgba(78,134,255,.12)', <ShopOutlined />)}
        {card('MRP reorder', mrp?.reorderCount ?? 0, '/products', '#9b5cf6', 'rgba(155,92,246,.12)', <SyncOutlined />)}
        {card('Açık fatura', aging?.openInvoiceCount ?? 0, '/dashboard', '#f59e0b', 'rgba(245,158,11,.14)', <FileTextOutlined />)}
        {card('Bekleyen tutar', (aging?.outstandingTotal ?? 0).toLocaleString('tr-TR'), '/dashboard', '#ef4444', 'rgba(239,68,68,.12)', <WalletOutlined />, '₺')}
      </Row>

      <Row gutter={[14, 14]}>
        <Col xs={24} lg={14}>
          <Card size="small" title="Stok özeti (ürün bazında)">
            <Table<StockRow>
              dataSource={stock}
              rowKey="productId"
              size="small"
              pagination={{ pageSize: 8, size: 'small' }}
              columns={[
                { title: 'Kod', dataIndex: 'productCode' },
                { title: 'Ürün', dataIndex: 'productName', ellipsis: true },
                { title: 'Eldeki', dataIndex: 'onHand', align: 'right' },
                { title: 'Rezerve', dataIndex: 'reserved', align: 'right' },
                { title: 'Uygun', dataIndex: 'available', align: 'right', render: (v: number) => <b style={{ color: v > 0 ? '#3b6d11' : '#a32d2d' }}>{v}</b> },
              ]}
            />
          </Card>
        </Col>
        <Col xs={24} lg={10}>
          <Card size="small" title={<span>MRP — reorder önerileri {mrp?.reorderCount ? <Tag color="purple">{mrp.reorderCount}</Tag> : null}</span>}>
            {mrp?.suggestions?.length ? (
              <Table<MrpRow>
                dataSource={mrp.suggestions}
                rowKey="productId"
                size="small"
                pagination={false}
                columns={[
                  { title: 'Kod', dataIndex: 'productCode' },
                  { title: 'Eldeki', dataIndex: 'onHand', align: 'right' },
                  { title: 'Reorder', dataIndex: 'reorderPoint', align: 'right' },
                  { title: 'Öneri', dataIndex: 'suggestedQty', align: 'right', render: (v: number) => <b style={{ color: '#534ab7' }}>{v}</b> },
                ]}
              />
            ) : (
              <span style={{ color: '#8696ae' }}>Reorder önerisi yok — stoklar yeterli.</span>
            )}
          </Card>
        </Col>
      </Row>
    </div>
  )
}
