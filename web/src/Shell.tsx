import { useMemo, useState, type ReactNode } from 'react'
import { useGetIdentity, useLogout } from '@refinedev/core'
import { Layout, Menu, Button, Typography, Space, Input, Avatar, Tooltip } from 'antd'
import { MenuOutlined, AppstoreOutlined, BellOutlined, QuestionCircleOutlined, LogoutOutlined, SearchOutlined, MoonOutlined, SunOutlined } from '@ant-design/icons'
import { Link, useLocation } from 'react-router-dom'
import { RESOURCES, SECTIONS, sectionOf } from './resources'
import { useThemeMode } from './themeMode'
import { screenRight } from './screenRight'

const NAVY = '#0f2238'
const NAVY_DARK = '#0a1626'

export const Shell = ({ children }: { children: ReactNode }) => {
  const { mutate: logout } = useLogout()
  const { data: user } = useGetIdentity<{ fullName?: string; roles?: string[]; isSuperAdmin?: boolean; screens?: string[]; screenRights?: Record<string, { view: boolean }> }>()
  const { mode, toggle } = useThemeMode()
  const location = useLocation()
  const selected = location.pathname.split('/')[1] ?? ''
  const [collapsed, setCollapsed] = useState(false)
  const [query, setQuery] = useState('')
  const [openKeys, setOpenKeys] = useState<string[]>(() => {
    const cur = RESOURCES.find((r) => r.name === selected)
    return cur ? [cur.section, `${cur.section}::${cur.group}`] : [sectionOf(selected)]
  })
  const allOpenKeys = [...SECTIONS, ...new Set(RESOURCES.map((r) => `${r.section}::${r.group}`))]

  // Web menü görünürlüğü: ekran hakkı 'view' (aksiyon matrisi). Kayıt yoksa görünür; super-admin/ADMIN tümünü görür.
  const isAdmin = !!user?.isSuperAdmin || (user?.roles ?? []).includes('ADMIN')
  const screenAllowed = (name: string) => screenRight(name, 'view')

  const menuItems = useMemo(() => {
    const q = query.trim().toLocaleLowerCase('tr')
    const match = (label: string) => !q || label.toLocaleLowerCase('tr').includes(q)
    const pano = match('Pano') ? [{ key: 'dashboard', label: <Link to="/dashboard">Pano</Link> }] : []
    const sections = SECTIONS.map((section) => {
      const inSection = RESOURCES.filter((r) => r.section === section && !r.hidden && screenAllowed(r.name))
      const groups = [...new Set(inSection.filter((r) => r.group).map((r) => r.group))]
      const groupNodes = groups
        .map((group) => {
          const items = inSection.filter((r) => r.group === group && match(r.label)).map((r) => ({
            key: r.name,
            label: <Link to={`/${r.name}`}>{r.label}</Link>,
          }))
          return items.length ? { key: `${section}::${group}`, label: group, children: items } : null
        })
        .filter(Boolean)
      // grupsuz (group === '') kaynaklar doğrudan bölüm altında tek tek görünür
      const directNodes = inSection
        .filter((r) => !r.group && match(r.label))
        .map((r) => ({ key: r.name, label: <Link to={`/${r.name}`}>{r.label}</Link> }))
      const children = [...groupNodes, ...directNodes]
      return children.length ? { key: section, label: section, children } : null
    }).filter(Boolean)
    return [...pano, ...sections]
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, isAdmin, JSON.stringify(user?.screenRights)])

  const openState = query.trim() ? allOpenKeys : openKeys

  // Chrome (header+sider) mod-bağımlı: açık modda beyaz (Nexus), koyu modda navy
  const dark = mode === 'dark'
  const chrome = {
    headerBg: dark ? NAVY_DARK : '#FFFFFF',
    headerBorder: dark ? 'none' : '1px solid #ECEFF4',
    headerShadow: dark ? '0 2px 12px rgba(10,22,38,.28)' : '0 1px 0 rgba(16,27,46,.04)',
    siderBg: dark ? NAVY : '#FFFFFF',
    siderBorder: dark ? 'none' : '1px solid #EEF1F7',
    icon: dark ? '#9fb6d4' : '#64748B',
    brandText: dark ? '#fff' : '#1B2233',
    brandSub: dark ? '#7d96b3' : '#94A3B8',
    userText: dark ? '#cfe0f5' : '#42536F',
    userSub: dark ? '#6b84a6' : '#94A3B8',
    searchPrefix: dark ? '#6b84a6' : '#9AA7BD',
  }

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Layout.Header style={{ background: chrome.headerBg, borderBottom: chrome.headerBorder, display: 'flex', alignItems: 'center', padding: '0 16px', height: 56, lineHeight: '56px', boxShadow: chrome.headerShadow, position: 'sticky', top: 0, zIndex: 20 }}>
        <Button type="text" onClick={() => setCollapsed((c) => !c)} style={{ color: chrome.icon, fontSize: 17, marginRight: 6 }} icon={<MenuOutlined />} aria-label="menü" />
        <img src="/OneGate-assets/onegate-icon.svg" width={30} height={30} alt="OneGate WMS" style={{ borderRadius: 7, marginRight: 10 }} />
        <Typography.Text strong style={{ color: chrome.brandText, fontSize: 19, letterSpacing: 0.3 }}>
          One<span style={{ color: '#44D4E3' }}>Gate</span> <span style={{ color: chrome.brandSub, fontWeight: 500, fontSize: 14 }}>WMS</span>
        </Typography.Text>
        <div style={{ flex: 1 }} />
        <Space size={4} style={{ marginRight: 8 }}>
          <Tooltip title="Pano"><Link to="/dashboard"><Button type="text" icon={<AppstoreOutlined />} style={{ color: chrome.icon }} /></Link></Tooltip>
          <Tooltip title={mode === 'dark' ? 'Açık mod' : 'Koyu mod'}>
            <Button type="text" icon={mode === 'dark' ? <SunOutlined /> : <MoonOutlined />} onClick={toggle} style={{ color: chrome.icon }} aria-label="tema" />
          </Tooltip>
          <Tooltip title="Bildirimler"><Button type="text" icon={<BellOutlined />} style={{ color: chrome.icon }} /></Tooltip>
          <Tooltip title="Yardım"><Button type="text" icon={<QuestionCircleOutlined />} style={{ color: chrome.icon }} /></Tooltip>
        </Space>
        <Space size={10}>
          <Avatar size={28} style={{ background: 'linear-gradient(135deg,#44d4e3,#9b5cf6)', fontSize: 13, fontWeight: 600 }}>
            {(user?.fullName ?? '?').slice(0, 1).toUpperCase()}
          </Avatar>
          <Typography.Text style={{ color: chrome.userText, fontSize: 13 }}>
            {user?.fullName}
            {user?.roles?.length ? <span style={{ color: chrome.userSub }}> · {user.roles.join(', ')}</span> : ''}
          </Typography.Text>
          <Tooltip title="Çıkış"><Button type="text" icon={<LogoutOutlined />} onClick={() => logout()} style={{ color: chrome.icon }} /></Tooltip>
        </Space>
      </Layout.Header>

      <Layout>
        <Layout.Sider width={240} collapsed={collapsed} collapsedWidth={0} trigger={null} style={{ background: chrome.siderBg, borderInlineEnd: chrome.siderBorder, overflowY: 'auto', height: 'calc(100vh - 56px)', position: 'sticky', top: 56 }}>
          {!collapsed && (
            <div style={{ padding: '10px 10px 4px' }}>
              <Input size="small" allowClear prefix={<SearchOutlined style={{ color: chrome.searchPrefix }} />} placeholder="Menüde ara…" value={query} onChange={(e) => setQuery(e.target.value)} />
            </div>
          )}
          <Menu
            theme={dark ? 'dark' : 'light'}
            mode="inline"
            selectedKeys={[selected]}
            openKeys={openState as string[]}
            onOpenChange={(k) => setOpenKeys(k as string[])}
            items={menuItems as never}
            style={{ background: chrome.siderBg, borderInlineEnd: 'none' }}
          />
        </Layout.Sider>
        <Layout.Content style={{ background: 'var(--og-page-bg)' }}>{children}</Layout.Content>
      </Layout>
    </Layout>
  )
}
