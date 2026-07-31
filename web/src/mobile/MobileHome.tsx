import { useEffect, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { InboxOutlined, ShoppingOutlined, NumberOutlined, SearchOutlined } from '@ant-design/icons'
import { MobileShell } from './MobileShell'
import { MOBILE_MENU, mobileScreenAllowed } from './mobileMenu'
import { axiosInstance } from '../providers/dataProvider'

// screenType → mobil rota + görsel
const SCREEN: Record<string, { route: string; icon: ReactNode; c: string }> = {
  RECEIPT: { route: '/m/receipt', icon: <InboxOutlined />, c: '#16a3b3' },
  PICK: { route: '/m/pick', icon: <ShoppingOutlined />, c: '#2563C9' },
  COUNT: { route: '/m/count', icon: <NumberOutlined />, c: '#1B2B4B' },
  STOCK: { route: '/m/stock', icon: <SearchOutlined />, c: '#16a34a' },
}
// statik fallback (config yoksa) — key 'm/receipt' vb.
const FALLBACK_META: Record<string, { type: string }> = {
  'm/receipt': { type: 'RECEIPT' }, 'm/pick': { type: 'PICK' }, 'm/count': { type: 'COUNT' }, 'm/stock': { type: 'STOCK' },
}

type Item = { id: number; code: string; name: string; screenType: string; operationTypeId?: number | null }
type Group = { id: number; name: string; items: Item[] }

const tileStyle = {
  background: '#141e33', border: '1px solid #25304a', borderRadius: 16, padding: '26px 12px',
  color: '#e6edf7', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, minHeight: 130,
} as const

export const MobileHome = () => {
  const navigate = useNavigate()
  const user = (() => { try { return JSON.parse(localStorage.getItem('og_user') ?? 'null') } catch { return null } })()
  const [groups, setGroups] = useState<Group[] | null>(null)

  useEffect(() => {
    axiosInstance.get('/api/handheld-menu')
      .then((r) => setGroups((Array.isArray(r.data) ? r.data : (r.data.data ?? [])) as Group[]))
      .catch(() => setGroups([]))
  }, [])

  const tile = (key: string, name: string, type: string, op: number | null | undefined) => {
    const meta = SCREEN[type] ?? SCREEN.STOCK
    return (
      <button key={key} onClick={() => navigate(`${meta.route}${op ? `?op=${op}` : ''}`)} style={tileStyle}>
        <span style={{ width: 54, height: 54, borderRadius: 14, display: 'grid', placeItems: 'center', fontSize: 26, background: `${meta.c}22`, color: meta.c }}>{meta.icon}</span>
        <span style={{ fontSize: 16, fontWeight: 700, textAlign: 'center' }}>{name}</span>
      </button>
    )
  }

  // Dinamik config var mı?
  const dynamic = (groups ?? []).map((g) => ({ ...g, items: g.items.filter((it) => mobileScreenAllowed(`m/${it.code}`, user)) })).filter((g) => g.items.length)
  const useDynamic = dynamic.length > 0

  return (
    <MobileShell title="OneGate El Terminali">
      {groups === null ? (
        <div style={{ color: '#7d96b3', textAlign: 'center', padding: 24 }}>Yükleniyor…</div>
      ) : useDynamic ? (
        dynamic.map((g) => (
          <div key={g.id} style={{ marginBottom: 18 }}>
            <div style={{ color: '#7d96b3', fontSize: 13, fontWeight: 600, margin: '0 2px 8px', textTransform: 'uppercase', letterSpacing: 0.5 }}>{g.name}</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              {g.items.map((it) => tile(`it-${it.id}`, it.name, it.screenType, it.operationTypeId))}
            </div>
          </div>
        ))
      ) : (
        // Fallback: statik 4 kutucuk (config yapılmadıysa)
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          {MOBILE_MENU.filter((m) => mobileScreenAllowed(m.key, user)).map((m) => tile(m.key, m.label, FALLBACK_META[m.key]?.type ?? 'STOCK', null))}
        </div>
      )}
    </MobileShell>
  )
}
