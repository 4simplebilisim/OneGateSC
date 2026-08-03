import { useEffect, useState, type ReactNode } from 'react'
import { Card, Table, Spin } from 'antd'
import {
  ContainerOutlined, TeamOutlined, CheckCircleOutlined, LoginOutlined, SendOutlined, SwapOutlined,
  InboxOutlined, BarcodeOutlined, ApartmentOutlined, GoldOutlined, DatabaseOutlined, FileSearchOutlined,
  ApiOutlined, BarChartOutlined, UserSwitchOutlined, ShoppingOutlined, TagsOutlined, ThunderboltOutlined,
  ArrowUpOutlined,
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

  const metrics: { label: string; value: number | string; to: string; icon: ReactNode }[] = [
    { label: 'Açık belge', value: sum?.openDocs ?? 0, to: '/documents', icon: <ContainerOutlined /> },
    { label: 'Aktif kullanıcı', value: sum?.activeUsers ?? 0, to: '/users', icon: <TeamOutlined /> },
    /* "(bugün)" eki alt başlıkta zaten yazıyor; etiketler tek satıra sığsın diye çıkarıldı */
    { label: 'Onaylanan', value: sum?.approvedToday ?? 0, to: '/documents', icon: <CheckCircleOutlined /> },
    { label: 'Mal kabul', value: sum?.receiptsToday ?? 0, to: '/documents-in-obs', icon: <LoginOutlined /> },
    { label: 'Sevkiyat', value: sum?.shipmentsToday ?? 0, to: '/documents-out-obs', icon: <SendOutlined /> },
    { label: 'Transfer', value: sum?.transfersToday ?? 0, to: '/documents-tr-obs', icon: <SwapOutlined /> },
  ]

  return (
    <div className="og-page">
      <PageHeader title="Kontrol Paneli" subtitle="Depo operasyonları — tek bakışta (bugünkü hareketler)" />

      {/* Ölçüm kartları */}
      <div className="og-grid og-grid--metric">
        {metrics.map((m) => (
          <Link key={m.label} to={m.to} className="og-metric">
            <span className="og-metric__icon">{m.icon}</span>
            <span style={{ minWidth: 0 }}>
              <span className="og-metric__label">{m.label}</span>
              <span className="og-metric__value">{m.value}</span>
            </span>
          </Link>
        ))}
      </div>

      {/* Kısayol karoları */}
      {TILE_GROUPS.map((g) => (
        <div key={g.section}>
          <div className="og-lp-section">{g.section}</div>
          <div className="og-grid og-grid--tile">
            {g.section === 'Operasyon' && myOpen != null && (
              <Link to="/documents" className="og-tile">
                <span className="og-tile__icon"><CheckCircleOutlined /></span>
                <span className="og-tile__title">Bekleyen İşlerim</span>
                <span className="og-tile__sub">Bana atanmış açık belgeler</span>
                <span className="og-tile__count">{myOpen}</span>
              </Link>
            )}
            {g.tiles.map((t) => (
              <Link key={t.to} to={t.to} className="og-tile">
                <span className="og-tile__icon">{t.icon}</span>
                <span className="og-tile__title">{t.title}</span>
                <span className="og-tile__sub">{t.sub}</span>
                <ArrowUpOutlined className="og-tile__arrow" rotate={45} />
              </Link>
            ))}
          </div>
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
