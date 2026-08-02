import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useGetIdentity } from '@refinedev/core'
import { Checkbox, Typography } from 'antd'
import { AppstoreOutlined, ShoppingCartOutlined, LockOutlined, ArrowRightOutlined } from '@ant-design/icons'
import { axiosInstance } from '../providers/dataProvider'
import { useThemeMode } from '../themeMode'

type App = { code: string; name: string; description?: string | null; path: string }

const ICONS: Record<string, React.ReactNode> = {
  WMS: <AppstoreOutlined />, PROC: <ShoppingCartOutlined />,
}

// Giriş sonrası ürün seçimi. Tek ürünü olan kullanıcı buraya hiç uğramaz (authProvider yönlendirir).
// Lisanssız ürünler soluk gösterilir — müşteri neye sahip olmadığını da görür.
export const PlatformSelect = () => {
  const navigate = useNavigate()
  const { data: user } = useGetIdentity<{ fullName?: string; apps?: App[] }>()
  const { mode } = useThemeMode()
  const dark = mode === 'dark'
  const [catalog, setCatalog] = useState<App[]>([])
  const [remember, setRemember] = useState(localStorage.getItem('og_app_remember') !== '0')

  const apps = user?.apps ?? []
  useEffect(() => {
    axiosInstance.get('/api/applications').then((r) => setCatalog(r.data ?? [])).catch(() => setCatalog([]))
  }, [])

  // Tek ürün varsa seçim ekranı anlamsız — doğrudan içeri
  useEffect(() => {
    if (user && apps.length <= 1) navigate('/', { replace: true })
  }, [user, apps.length, navigate])

  const open = (a: App) => {
    localStorage.setItem('og_app_remember', remember ? '1' : '0')
    if (remember) localStorage.setItem('og_last_app', a.code)
    if (a.path === '/') navigate('/', { replace: true })
    else window.location.href = a.path
  }

  const licensed = new Set(apps.map((a) => a.code))
  const unlicensed = catalog.filter((c) => !licensed.has(c.code))

  const card = (bg: string, border: string) => ({
    background: bg, border: `1px solid ${border}`, borderRadius: 12, padding: 18,
    display: 'flex', flexDirection: 'column' as const, minHeight: 158,
  })

  return (
    <div style={{ minHeight: 'calc(100vh - 56px)', background: 'var(--og-page-bg)', padding: '48px 24px' }}>
      <div style={{ maxWidth: 820, margin: '0 auto' }}>
        <Typography.Title level={3} style={{ marginBottom: 2, fontWeight: 600 }}>
          Hoş geldiniz{user?.fullName ? `, ${user.fullName.split(' ')[0]}` : ''}
        </Typography.Title>
        <Typography.Paragraph type="secondary" style={{ marginBottom: 26, fontSize: 14.5 }}>
          Devam etmek için bir ürün seçin
        </Typography.Paragraph>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(238px, 1fr))', gap: 16 }}>
          {apps.map((a) => (
            <div
              key={a.code}
              role="button"
              tabIndex={0}
              onClick={() => open(a)}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') open(a) }}
              className="og-app-card"
              style={{ ...card(dark ? '#1B2436' : '#FFFFFF', dark ? '#2A3854' : '#E2E8F0'), cursor: 'pointer' }}
            >
              <div style={{
                width: 40, height: 40, borderRadius: 10, marginBottom: 13, fontSize: 20,
                background: dark ? 'rgba(91,141,239,.16)' : '#EEF4FF', color: '#2563C9',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {ICONS[a.code] ?? <AppstoreOutlined />}
              </div>
              <div style={{ fontSize: 15.5, fontWeight: 600 }}>{a.name}</div>
              <div style={{ fontSize: 13, opacity: 0.68, lineHeight: 1.6, marginTop: 4, flex: 1 }}>{a.description}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#2563C9', marginTop: 12 }}>
                Aç <ArrowRightOutlined />
              </div>
            </div>
          ))}

          {unlicensed.map((a) => (
            <div key={a.code} style={{ ...card('transparent', dark ? '#2A3854' : '#E2E8F0'), borderStyle: 'dashed', opacity: 0.62 }}>
              <div style={{
                width: 40, height: 40, borderRadius: 10, marginBottom: 13, fontSize: 19,
                background: dark ? 'rgba(148,163,184,.12)' : '#F1F5F9', color: '#94A3B8',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <LockOutlined />
              </div>
              <div style={{ fontSize: 15.5, fontWeight: 600, opacity: 0.85 }}>{a.name}</div>
              <div style={{ fontSize: 13, opacity: 0.6, lineHeight: 1.6, marginTop: 4, flex: 1 }}>Lisanslı değil</div>
              <div style={{ fontSize: 12, opacity: 0.6, marginTop: 12 }}>Satış ile görüşün</div>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 22 }}>
          <Checkbox checked={remember} onChange={(e) => setRemember(e.target.checked)} style={{ fontSize: 13 }}>
            Bir dahaki girişte doğrudan son kullandığım ürüne git
          </Checkbox>
        </div>
      </div>
    </div>
  )
}
