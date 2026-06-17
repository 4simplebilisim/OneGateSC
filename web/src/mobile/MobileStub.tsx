import { ToolOutlined } from '@ant-design/icons'
import { MobileShell } from './MobileShell'

/** Yakında — demo öncesi tamamlanacak el terminali akışları için yer tutucu. */
export const MobileStub = ({ title }: { title: string }) => (
  <MobileShell title={title} back>
    <div style={{ textAlign: 'center', padding: '60px 16px', color: '#9db0ce' }}>
      <ToolOutlined style={{ fontSize: 56, color: '#4e86ff' }} />
      <div style={{ fontSize: 18, fontWeight: 700, color: '#e6edf7', marginTop: 18 }}>{title}</div>
      <div style={{ marginTop: 8 }}>Bu akış yakında eklenecek.</div>
    </div>
  </MobileShell>
)
