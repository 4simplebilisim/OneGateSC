import { useState } from 'react'
import { App, Button, Modal, Table, Tag, Alert, Space } from 'antd'
import { WifiOutlined, PlusOutlined } from '@ant-design/icons'
import { axiosInstance } from '../providers/dataProvider'

type Found = { name: string; host: string; port: number; type: 'IPP' | 'ZPL'; path?: string }

/** Ağı tara (mDNS) → bulunan yazıcıları listele → tek tıkla kaydet. Yalnız Yazıcılar listesinde gösterilir. */
export const PrinterDiscover = ({ onAdded }: { onAdded: () => void }) => {
  const { message } = App.useApp()
  const [open, setOpen] = useState(false)
  const [scanning, setScanning] = useState(false)
  const [rows, setRows] = useState<Found[]>([])
  const [note, setNote] = useState<string | null>(null)
  const [addedKeys, setAddedKeys] = useState<Set<string>>(new Set())

  const scan = async () => {
    setScanning(true); setNote(null); setRows([])
    try {
      const r = await axiosInstance.post('/api/printers/discover')
      setRows(r.data.printers ?? [])
      setNote(r.data.note ?? null)
    } catch {
      setNote('Tarama başarısız')
    } finally { setScanning(false) }
  }

  const openModal = () => { setOpen(true); setAddedKeys(new Set()); scan() }

  const addOne = async (f: Found) => {
    const code = (f.name || `${f.host}-${f.port}`).replace(/[^\w.-]+/g, '-').slice(0, 38).toUpperCase()
    try {
      await axiosInstance.post('/api/printers', {
        code, name: f.name, type: f.type, host: f.host, port: f.port, path: f.path, discovered: true,
      })
      setAddedKeys((s) => new Set(s).add(`${f.host}:${f.port}`))
      message.success(`${f.name} eklendi`)
      onAdded()
    } catch (e) {
      message.error((e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Eklenemedi')
    }
  }

  return (
    <>
      <Button size="small" type="text" icon={<WifiOutlined />} onClick={openModal}>Ağı Tarat</Button>
      <Modal
        title="Ağ yazıcılarını tara (mDNS)"
        open={open}
        onCancel={() => setOpen(false)}
        footer={<Button onClick={() => setOpen(false)}>Kapat</Button>}
        width={640}
      >
        <Space orientation="vertical" style={{ width: '100%' }} size={12}>
          <Space>
            <Button type="primary" icon={<WifiOutlined />} loading={scanning} onClick={scan}>Yeniden Tara</Button>
            <span style={{ color: 'var(--og-muted)', fontSize: 12 }}>{scanning ? 'Ağ taranıyor…' : `${rows.length} yazıcı bulundu`}</span>
          </Space>
          {note && <Alert type="info" showIcon title={note} />}
          <Table<Found>
            size="small"
            rowKey={(r) => `${r.host}:${r.port}`}
            dataSource={rows}
            pagination={false}
            loading={scanning}
            locale={{ emptyText: scanning ? 'Taranıyor…' : 'Yayın yapan yazıcı yok' }}
            columns={[
              { title: 'Ad', dataIndex: 'name', ellipsis: true },
              { title: 'Adres', render: (_, r) => `${r.host}:${r.port}` },
              { title: 'Tip', dataIndex: 'type', render: (v) => <Tag color={v === 'ZPL' ? 'purple' : 'blue'}>{v}</Tag> },
              {
                title: '', width: 90,
                render: (_, r) => {
                  const added = addedKeys.has(`${r.host}:${r.port}`)
                  return <Button size="small" type="primary" icon={<PlusOutlined />} disabled={added} onClick={() => addOne(r)}>{added ? 'Eklendi' : 'Ekle'}</Button>
                },
              },
            ]}
          />
        </Space>
      </Modal>
    </>
  )
}
