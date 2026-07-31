import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLogout } from '@refinedev/core'
import { ArrowLeftOutlined, LogoutOutlined } from '@ant-design/icons'

const NAVY = '#0a1626'
const GRADIENT = 'linear-gradient(135deg,#5B8DEF,#2563C9 55%,#1B2B4B)'

/** El terminali kabuğu — koyu, büyük dokunmatik, marka başlık. */
export const MobileShell = ({ title, children, back }: { title: string; children: ReactNode; back?: boolean }) => {
  const navigate = useNavigate()
  const { mutate: logout } = useLogout()
  return (
    <div style={{ minHeight: '100vh', background: '#0e1626', color: '#e6edf7', display: 'flex', flexDirection: 'column', maxWidth: 520, margin: '0 auto' }}>
      <div style={{ background: NAVY, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10, position: 'sticky', top: 0, zIndex: 10, boxShadow: '0 2px 12px rgba(0,0,0,.4)' }}>
        {back ? (
          <button onClick={() => navigate('/m')} style={{ background: 'transparent', border: 'none', color: '#9fb6d4', fontSize: 20, cursor: 'pointer' }} aria-label="geri"><ArrowLeftOutlined /></button>
        ) : (
          <span style={{ width: 26, height: 26, borderRadius: 7, background: GRADIENT, display: 'inline-block' }} />
        )}
        <div style={{ flex: 1, fontWeight: 800, fontSize: 18, fontFamily: "'Plus Jakarta Sans','Inter',sans-serif" }}>{title}</div>
        <button onClick={() => logout()} style={{ background: 'transparent', border: 'none', color: '#9fb6d4', fontSize: 18, cursor: 'pointer' }} aria-label="çıkış"><LogoutOutlined /></button>
      </div>
      <div style={{ flex: 1, padding: 16 }}>{children}</div>
    </div>
  )
}
