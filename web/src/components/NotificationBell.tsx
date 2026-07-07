import { useCallback, useEffect, useState } from 'react'
import { App, Badge, Button, Popover, Typography, Empty, Spin } from 'antd'
import { BellOutlined, FileTextOutlined, ToolOutlined, ClockCircleOutlined, InboxOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { axiosInstance } from '../providers/dataProvider'

interface NotifItem { type: string; severity: 'info' | 'warning' | 'success'; title: string; detail: string; link: string; count: number }

const SEV_COLOR: Record<NotifItem['severity'], string> = { info: '#1677ff', warning: '#faad14', success: '#52c41a' }
const TYPE_ICON: Record<string, React.ReactNode> = {
  'assigned-docs': <FileTextOutlined />,
  'assigned-wo': <ToolOutlined />,
  'overdue-docs': <ClockCircleOutlined />,
  'pending-counts': <InboxOutlined />,
}

export const NotificationBell = ({ color }: { color: string }) => {
  const { notification } = App.useApp()
  const navigate = useNavigate()
  const [items, setItems] = useState<NotifItem[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)

  const load = useCallback(async (greet: boolean) => {
    try {
      const { data } = await axiosInstance.get('/api/notifications')
      const its: NotifItem[] = data.items ?? []
      setItems(its)
      setTotal(data.total ?? 0)
      // İlk giriş: ekrana özet bildirim (bir kez) — "size atanmış iş / gecikmiş belge / sayım hazır"
      if (greet && its.length) {
        notification.open({
          message: 'Bekleyen işleriniz var', // AntD5 uyumu (title AntD6) — ikisi de destekli
          description: <div>{its.map((i) => <div key={i.type} style={{ marginTop: 2 }}>• {i.detail}</div>)}</div>,
          icon: <BellOutlined style={{ color: '#1677ff' }} />,
          duration: 10,
          placement: 'topRight',
        })
      }
    } catch { /* sessizce yut — bildirim kritik değil */ }
    finally { setLoading(false) }
  }, [notification])

  useEffect(() => {
    const greet = localStorage.getItem('og_notif_greet') === '1'
    if (greet) localStorage.removeItem('og_notif_greet')
    load(greet)
    const iv = setInterval(() => load(false), 60_000) // gerçek-zamanlı ~1 dk periyot
    return () => clearInterval(iv)
  }, [load])

  const go = (link: string) => { setOpen(false); navigate(link) }

  const content = (
    <div style={{ width: 320 }}>
      <div style={{ padding: '4px 8px 8px', borderBottom: '1px solid rgba(128,128,128,0.15)', marginBottom: 4 }}>
        <Typography.Text strong>Bildirimler</Typography.Text>
      </div>
      {loading ? (
        <div style={{ textAlign: 'center', padding: 20 }}><Spin size="small" /></div>
      ) : items.length === 0 ? (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Bekleyen bildirim yok" style={{ margin: '12px 0' }} />
      ) : (
        items.map((i) => (
          <div
            key={i.type}
            onClick={() => go(i.link)}
            style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '8px 8px', cursor: 'pointer', borderRadius: 6, borderLeft: `3px solid ${SEV_COLOR[i.severity]}` }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(128,128,128,0.08)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          >
            <span style={{ color: SEV_COLOR[i.severity], fontSize: 16, marginTop: 1 }}>{TYPE_ICON[i.type] ?? <BellOutlined />}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <Typography.Text strong style={{ fontSize: 13 }}>{i.title}</Typography.Text>
              <div style={{ fontSize: 12, color: 'rgba(128,128,128,0.95)' }}>{i.detail}</div>
            </div>
            <Badge count={i.count} style={{ backgroundColor: SEV_COLOR[i.severity] }} />
          </div>
        ))
      )}
    </div>
  )

  return (
    // NOT: Popover'ın DOĞRUDAN çocuğu Badge+Button olmalı — araya Tooltip (ikinci overlay) girince
    // click-trigger enjeksiyonu kırılıyordu (popover hiç açılmıyordu). İpucu native title ile veriliyor.
    <Popover content={content} trigger="click" open={open} onOpenChange={setOpen} placement="bottomRight">
      <Badge count={total} size="small" offset={[-2, 2]}>
        <Button type="text" icon={<BellOutlined />} style={{ color }} aria-label="bildirimler" title="Bildirimler" />
      </Badge>
    </Popover>
  )
}
