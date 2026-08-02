import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useGetIdentity, useLogout } from '@refinedev/core'
import { Button, Checkbox, Typography, message } from 'antd'
import { AppstoreOutlined, ShoppingCartOutlined, LockOutlined, ArrowRightOutlined, LogoutOutlined, LoadingOutlined } from '@ant-design/icons'
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
  const { mutate: logout } = useLogout()
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

  const [busy, setBusy] = useState<string | null>(null)

  const open = async (a: App) => {
    localStorage.setItem('og_app_remember', remember ? '1' : '0')
    if (remember) localStorage.setItem('og_last_app', a.code)
    if (a.path === '/') { navigate('/', { replace: true }); return }
    // Ayrı ürün: oturum devri bileti al, hedef ürün kendi oturumunu açsın (tekrar giriş yok)
    setBusy(a.code)
    try {
      const { data } = await axiosInstance.get(`/api/sso/ticket?app=${a.code}`)
      window.location.href = data.url
    } catch {
      setBusy(null)
      message.error('Ürüne geçiş yapılamadı. Yetkinizi kontrol edin.')
    }
  }

  const licensed = new Set(apps.map((a) => a.code))
  const unlicensed = catalog.filter((c) => !licensed.has(c.code))

  const card = (bg: string, border: string) => ({
    background: bg, border: `1px solid ${border}`, borderRadius: 12, padding: 18,
    display: 'flex', flexDirection: 'column' as const, minHeight: 158,
  })

  return (
    <div style={{ minHeight: '100vh', background: 'var(--og-page-bg)' }}>
      {/* Ürün seçilmeden WMS menüsü gösterilmez — bu ekran kabuğun dışında, kendi ince çubuğuyla */}
      <div style={{
        height: 56, display: 'flex', alignItems: 'center', padding: '0 20px', gap: 10,
        background: dark ? '#152341' : '#FFFFFF',
        borderBottom: dark ? 'none' : '1px solid #ECEFF4',
      }}>
        <svg width={26} height={26} viewBox="0 0 94 94" role="img" aria-label="OneGate">
          <g fill={dark ? '#C7D5E9' : '#1B2B4B'}><rect width="42" height="42" rx="6" /><rect x="52" y="52" width="42" height="42" rx="6" /></g>
          <g fill={dark ? '#5B8DEF' : '#2563C9'}><circle cx="73" cy="21" r="21" /><circle cx="21" cy="73" r="21" /></g>
        </svg>
        <Typography.Text strong style={{ fontSize: 17, letterSpacing: 0.3, color: dark ? '#fff' : '#1B2233' }}>
          One<span style={{ color: '#2563C9' }}>Gate</span>
        </Typography.Text>
        <div style={{ flex: 1 }} />
        <Typography.Text style={{ fontSize: 13, opacity: 0.75 }}>{user?.fullName}</Typography.Text>
        <Button type="text" icon={<LogoutOutlined />} onClick={() => logout()} aria-label="çıkış" />
      </div>

      <div style={{ maxWidth: 820, margin: '0 auto', padding: '48px 24px' }}>
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
                {busy === a.code ? <>Açılıyor <LoadingOutlined /></> : <>Aç <ArrowRightOutlined /></>}
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
