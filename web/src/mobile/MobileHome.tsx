import { useNavigate } from 'react-router-dom'
import { InboxOutlined, ShoppingOutlined, NumberOutlined, SearchOutlined } from '@ant-design/icons'
import { MobileShell } from './MobileShell'

const tiles = [
  { to: '/m/receipt', label: 'Mal Kabul', icon: <InboxOutlined />, c: '#16a3b3' },
  { to: '/m/pick', label: 'Toplama', icon: <ShoppingOutlined />, c: '#4e86ff' },
  { to: '/m/count', label: 'Sayım', icon: <NumberOutlined />, c: '#9b5cf6' },
  { to: '/m/stock', label: 'Stok Sorgu', icon: <SearchOutlined />, c: '#16a34a' },
]

export const MobileHome = () => {
  const navigate = useNavigate()
  return (
    <MobileShell title="OneGate El Terminali">
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        {tiles.map((t) => (
          <button
            key={t.to}
            onClick={() => navigate(t.to)}
            style={{
              background: '#141e33', border: '1px solid #25304a', borderRadius: 16, padding: '26px 12px',
              color: '#e6edf7', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
              minHeight: 130,
            }}
          >
            <span style={{ width: 54, height: 54, borderRadius: 14, display: 'grid', placeItems: 'center', fontSize: 26, background: `${t.c}22`, color: t.c }}>{t.icon}</span>
            <span style={{ fontSize: 16, fontWeight: 700 }}>{t.label}</span>
          </button>
        ))}
      </div>
    </MobileShell>
  )
}
