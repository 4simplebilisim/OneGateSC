import { useEffect, useState, type ReactNode } from 'react'
import { Card, Col, Row, Statistic, Table, Spin } from 'antd'
import {
  ContainerOutlined, TeamOutlined, CheckCircleOutlined, LoginOutlined, SendOutlined, SwapOutlined,
} from '@ant-design/icons'
import { Link } from 'react-router-dom'
import { axiosInstance } from '../providers/dataProvider'
import { PageHeader } from '../components/PageHeader'

interface StockRow { productId: number; productCode: string; productName: string; onHand: number; reserved: number; available: number }
interface Summary { openDocs: number; activeUsers: number; approvedToday: number; receiptsToday: number; shipmentsToday: number; transfersToday: number }

export const Dashboard = () => {
  const [loading, setLoading] = useState(true)
  const [stock, setStock] = useState<StockRow[]>([])
  const [sum, setSum] = useState<Summary | null>(null)

  useEffect(() => {
    Promise.all([
      axiosInstance.get('/api/reports/warehouse-summary'),
      axiosInstance.get('/api/reports/stock-summary'),
    ])
      .then(([w, s]) => { setSum(w.data); setStock(s.data ?? []) })
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div style={{ padding: 80, textAlign: 'center' }}><Spin size="large" /></div>

  const card = (title: string, value: number | string, to: string, accent: string, accentSoft: string, icon: ReactNode) => (
    <Col xs={12} sm={8} md={8} lg={4}>
      <Link to={to}>
        <Card size="small" hoverable className="og-stat"
          styles={{ body: { padding: '16px 18px', display: 'flex', alignItems: 'center', gap: 14 } }}
          style={{ ['--accent' as string]: accent, ['--accent-soft' as string]: accentSoft }}>
          <span className="og-stat__icon">{icon}</span>
          <Statistic title={title} value={value} styles={{ content: { fontSize: 24, fontWeight: 700, color: 'var(--og-ink)', lineHeight: 1.1 } }} />
        </Card>
      </Link>
    </Col>
  )

  return (
    <div className="og-page">
      <PageHeader title="Dashboard" subtitle="Depo operasyonları — tek bakışta (bugünkü hareketler)" />

      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        {card('Açık belge', sum?.openDocs ?? 0, '/documents', '#4e86ff', 'rgba(78,134,255,.12)', <ContainerOutlined />)}
        {card('Aktif kullanıcı', sum?.activeUsers ?? 0, '/users', '#16a3b3', 'rgba(68,212,227,.14)', <TeamOutlined />)}
        {card('Bugün onaylanan', sum?.approvedToday ?? 0, '/documents', '#22a06b', 'rgba(34,160,107,.14)', <CheckCircleOutlined />)}
        {card('Mal kabul (bugün)', sum?.receiptsToday ?? 0, '/documents-in-obs', '#22a06b', 'rgba(34,160,107,.12)', <LoginOutlined />)}
        {card('Sevkiyat (bugün)', sum?.shipmentsToday ?? 0, '/documents-out-obs', '#f59e0b', 'rgba(245,158,11,.14)', <SendOutlined />)}
        {card('Transfer (bugün)', sum?.transfersToday ?? 0, '/documents-tr-obs', '#9b5cf6', 'rgba(155,92,246,.12)', <SwapOutlined />)}
      </Row>

      <Card size="small" title="Stok özeti (ürün bazında)">
        <Table<StockRow>
          dataSource={stock}
          rowKey="productId"
          size="small"
          pagination={{ pageSize: 10, size: 'small' }}
          columns={[
            { title: 'Kod', dataIndex: 'productCode' },
            { title: 'Ürün', dataIndex: 'productName', ellipsis: true },
            { title: 'Eldeki', dataIndex: 'onHand', align: 'right' },
            { title: 'Rezerve', dataIndex: 'reserved', align: 'right' },
            { title: 'Uygun', dataIndex: 'available', align: 'right', render: (v: number) => <b style={{ color: v > 0 ? '#3b6d11' : '#a32d2d' }}>{v}</b> },
          ]}
        />
      </Card>
    </div>
  )
}
