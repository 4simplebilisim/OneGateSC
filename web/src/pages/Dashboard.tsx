import { useEffect, useState, type ReactNode } from 'react'
import { Card, Col, Row, Statistic, Table, Spin } from 'antd'
import {
  ContainerOutlined, TeamOutlined, CheckCircleOutlined, LoginOutlined, SendOutlined, SwapOutlined,
  InboxOutlined, BarcodeOutlined, ApartmentOutlined, GoldOutlined, DatabaseOutlined, FileSearchOutlined,
  ApiOutlined, BarChartOutlined, UserSwitchOutlined, ShoppingOutlined, TagsOutlined, ThunderboltOutlined,
} from '@ant-design/icons'
import { Link } from 'react-router-dom'
import { axiosInstance } from '../providers/dataProvider'
import { PageHeader } from '../components/PageHeader'

// Fiori launchpad karoları — modül hızlı erişimi (ekran hakkı olmayan rotada ekran kendi kuralını uygular)
const TILE_GROUPS: { section: string; tiles: { to: string; title: string; sub: string; icon: ReactNode }[] }[] = [
  {
    section: 'Operasyon',
    tiles: [
      { to: '/documents', title: 'Belgeler', sub: 'Tüm belge yaşam döngüsü', icon: <ContainerOutlined /> },
      { to: '/documents-in-obs', title: 'Giriş Gözlem', sub: 'Mal kabul izleme', icon: <LoginOutlined /> },
      { to: '/documents-out-obs', title: 'Çıkış Gözlem', sub: 'Sevkiyat izleme', icon: <SendOutlined /> },
      { to: '/stock-counts', title: 'Sayım', sub: 'Sayım girişi ve onayı', icon: <FileSearchOutlined /> },
      { to: '/pallets', title: 'Palet İşlemleri', sub: 'Palet oluştur / güncelle', icon: <InboxOutlined /> },
      { to: '/bulk-stock-ops', title: 'Toplu İşlem', sub: 'Stok bazlı toplu aksiyon', icon: <ThunderboltOutlined /> },
    ],
  },
  {
    section: 'Ana Veri',
    tiles: [
      { to: '/products', title: 'Ürünler', sub: 'Ürün kartları ve birimler', icon: <TagsOutlined /> },
      { to: '/partners', title: 'Müşteriler', sub: 'Cari kartlar', icon: <ShoppingOutlined /> },
      { to: '/locations', title: 'Lokasyonlar', sub: 'Depo adresleme', icon: <ApartmentOutlined /> },
      { to: '/operation-types', title: 'Operasyon Tipleri', sub: 'Süreç kuralları', icon: <GoldOutlined /> },
      { to: '/users', title: 'Kullanıcılar', sub: 'Yetki ve haklar', icon: <UserSwitchOutlined /> },
      { to: '/barcode-types', title: 'Barkod Tipleri', sub: 'Okutma kural motoru', icon: <BarcodeOutlined /> },
    ],
  },
  {
    section: 'Analiz & Entegrasyon',
    tiles: [
      { to: '/stock-report', title: 'Stok Raporu', sub: 'Tesis / depo kırılımı', icon: <DatabaseOutlined /> },
      { to: '/report-center', title: 'Rapor Merkezi', sub: 'Hazır rapor kütüphanesi', icon: <BarChartOutlined /> },
      { to: '/integration-transfer', title: 'Entegrasyon Aktarım', sub: 'Netsis / Logo manuel tetikleme', icon: <ApiOutlined /> },
      { to: '/integration-logs', title: 'Entegrasyon İzleme', sub: 'Aktarım mesajları', icon: <FileSearchOutlined /> },
    ],
  },
]

interface StockRow { productId: number; productCode: string; productName: string; onHand: number; reserved: number; available: number }
interface Summary { openDocs: number; activeUsers: number; approvedToday: number; receiptsToday: number; shipmentsToday: number; transfersToday: number }

export const Dashboard = () => {
  const [loading, setLoading] = useState(true)
  const [stock, setStock] = useState<StockRow[]>([])
  const [sum, setSum] = useState<Summary | null>(null)
  const [myOpen, setMyOpen] = useState<number | null>(null) // bana/grubuma atanmış açık belgeler

  useEffect(() => {
    Promise.all([
      axiosInstance.get('/api/reports/warehouse-summary'),
      axiosInstance.get('/api/reports/stock-summary'),
    ])
      .then(([w, s]) => { setSum(w.data); setStock(s.data ?? []) })
      .finally(() => setLoading(false))
    axiosInstance.get('/api/documents', { params: { assignedFor: 'me', openOnly: 'true' } })
      .then((r) => setMyOpen((Array.isArray(r.data) ? r.data : (r.data?.data ?? [])).length))
      .catch(() => setMyOpen(null))
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
        {card('Açık belge', sum?.openDocs ?? 0, '/documents', '#2563C9', 'rgba(37,99,201,.12)', <ContainerOutlined />)}
        {card('Aktif kullanıcı', sum?.activeUsers ?? 0, '/users', '#16a3b3', 'rgba(91,141,239,.14)', <TeamOutlined />)}
        {card('Bugün onaylanan', sum?.approvedToday ?? 0, '/documents', '#22a06b', 'rgba(34,160,107,.14)', <CheckCircleOutlined />)}
        {card('Mal kabul (bugün)', sum?.receiptsToday ?? 0, '/documents-in-obs', '#22a06b', 'rgba(34,160,107,.12)', <LoginOutlined />)}
        {card('Sevkiyat (bugün)', sum?.shipmentsToday ?? 0, '/documents-out-obs', '#f59e0b', 'rgba(245,158,11,.14)', <SendOutlined />)}
        {card('Transfer (bugün)', sum?.transfersToday ?? 0, '/documents-tr-obs', '#1B2B4B', 'rgba(27,43,75,.12)', <SwapOutlined />)}
      </Row>

      {TILE_GROUPS.map((g) => (
        <div key={g.section}>
          <div className="og-lp-section">{g.section}</div>
          <Row gutter={[12, 12]} style={{ marginBottom: 6 }}>
            {g.section === 'Operasyon' && myOpen != null && (
              <Col xs={12} sm={8} md={6} lg={4}>
                <Link to="/documents">
                  <Card size="small" hoverable className="og-tile">
                    <span className="og-tile__icon" style={{ background: 'rgba(245,158,11,.14)', color: '#f59e0b' }}><CheckCircleOutlined /></span>
                    <div className="og-tile__title">Bekleyen İşlerim</div>
                    <div className="og-tile__sub">Bana atanmış açık belgeler</div>
                    <div className="og-tile__count">{myOpen}</div>
                  </Card>
                </Link>
              </Col>
            )}
            {g.tiles.map((t) => (
              <Col key={t.to} xs={12} sm={8} md={6} lg={4}>
                <Link to={t.to}>
                  <Card size="small" hoverable className="og-tile">
                    <span className="og-tile__icon">{t.icon}</span>
                    <div className="og-tile__title">{t.title}</div>
                    <div className="og-tile__sub">{t.sub}</div>
                  </Card>
                </Link>
              </Col>
            ))}
          </Row>
        </div>
      ))}

      <div className="og-lp-section">Stok Özeti</div>
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
