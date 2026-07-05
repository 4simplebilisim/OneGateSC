import { useCallback, useEffect, useMemo, useState } from 'react'
import { App, Button, Card, Modal, Radio, Select, Space, Table, Tag } from 'antd'
import { ReloadOutlined, UserOutlined, TeamOutlined, CloseOutlined } from '@ant-design/icons'
import { axiosInstance } from '../providers/dataProvider'
import { PageHeader } from '../components/PageHeader'

type Doc = { id: number; documentNo: string; status: string; operationTypeId?: number; operationType?: { code?: string; applyAssignment?: boolean }; documentStatus?: { name?: string; color?: string }; _count?: { lines?: number } }
type Assign = { id: number; documentId: number; userId?: number | null; userGroupId?: number | null; atanan?: string | null }
type Opt = { value: number; label: string }

const arr = (d: unknown) => (Array.isArray(d) ? d : ((d as { data?: unknown[] })?.data ?? []))
const DIR_LABEL: Record<string, string> = { INBOUND: 'Giriş', OUTBOUND: 'Çıkış', INTERNAL: 'Transfer' }

// İş Atama — açık belgeleri kullanıcı VEYA kullanıcı grubuna atar. El terminalinde operasyonun
// "İş Ataması Uygula" parametresi açıksa kullanıcı yalnız kendine/grubuna atanmışları görür.
export const DocumentAssign = ({ direction }: { direction: 'INBOUND' | 'OUTBOUND' | 'INTERNAL' }) => {
  const { message } = App.useApp()
  const [rows, setRows] = useState<Doc[]>([])
  const [assigns, setAssigns] = useState<Assign[]>([])
  const [users, setUsers] = useState<Opt[]>([])
  const [groups, setGroups] = useState<Opt[]>([])
  const [ops, setOps] = useState<{ id: number; code: string; applyAssignment?: boolean }[]>([])
  const [loading, setLoading] = useState(true)
  const [target, setTarget] = useState<Doc | null>(null) // atama modalı hedefi
  const [mode, setMode] = useState<'user' | 'group'>('user')
  const [pick, setPick] = useState<number>()
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    axiosInstance.get('/api/users', { params: { pageSize: 300 } }).then((r) => setUsers((arr(r.data) as { id: number; username: string; fullName?: string }[]).map((u) => ({ value: u.id, label: u.fullName ?? u.username }))))
    axiosInstance.get('/api/user-groups', { params: { pageSize: 300 } }).then((r) => setGroups((arr(r.data) as { id: number; code: string; name?: string }[]).map((g) => ({ value: g.id, label: `${g.code}${g.name ? ' — ' + g.name : ''}` }))))
    axiosInstance.get('/api/operation-types', { params: { pageSize: 300 } }).then((r) => setOps(arr(r.data) as { id: number; code: string; applyAssignment?: boolean }[]))
  }, [])

  const load = useCallback(() => {
    setLoading(true)
    Promise.all([
      axiosInstance.get('/api/documents', { params: { direction, openOnly: 'true', pageSize: 200 } }),
      axiosInstance.get('/api/document-assignments', { params: { pageSize: 500 } }),
    ]).then(([dr, ar]) => { setRows(arr(dr.data) as Doc[]); setAssigns(arr(ar.data) as Assign[]) })
      .finally(() => setLoading(false))
  }, [direction])
  useEffect(load, [load])

  const assignByDoc = useMemo(() => new Map(assigns.map((a) => [a.documentId, a])), [assigns])
  const applyByOp = useMemo(() => new Map(ops.map((o) => [o.id, o.applyAssignment === true])), [ops])

  const openAssign = (doc: Doc) => { setTarget(doc); setMode('user'); setPick(undefined) }
  const doAssign = async () => {
    if (!target || !pick) { message.warning('Kullanıcı/grup seçin'); return }
    setBusy(true)
    try {
      await axiosInstance.post('/api/document-assignments', { documentId: target.id, ...(mode === 'user' ? { userId: pick } : { userGroupId: pick }) })
      message.success('Atandı')
      setTarget(null); load()
    } catch (e) { message.error((e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Atanamadı') }
    finally { setBusy(false) }
  }
  const removeAssign = async (a: Assign) => {
    try { await axiosInstance.delete(`/api/document-assignments/${a.id}`); message.success('Atama kaldırıldı'); load() }
    catch { message.error('Kaldırılamadı') }
  }

  return (
    <div className="og-page">
      <PageHeader title={`İş Atama — ${DIR_LABEL[direction]}`} subtitle="Açık belgeyi kullanıcı veya kullanıcı grubuna ata — el terminalinde 'İş Ataması Uygula' açık operasyonlarda atanan görür" />
      <Card className="og-toolbar" size="small" style={{ marginBottom: 14 }} styles={{ body: { padding: '10px 14px' } }}>
        <Button icon={<ReloadOutlined />} onClick={load}>Yenile</Button>
      </Card>
      <Card className="og-section-card" size="small" title={`Açık Belgeler (${rows.length})`}>
        <Table<Doc>
          rowKey="id" size="small" loading={loading} dataSource={rows} pagination={{ pageSize: 20 }}
          columns={[
            { title: 'Belge No', dataIndex: 'documentNo' },
            { title: 'Operasyon', dataIndex: ['operationType', 'code'], render: (v, r) => <>{v ?? '—'}{applyByOp.get(r.operationTypeId ?? -1) ? <Tag color="purple" style={{ marginLeft: 6 }}>Atama</Tag> : null}</> },
            { title: 'Durum', dataIndex: 'status', render: (v, r) => r.documentStatus?.name ? <Tag color={r.documentStatus.color || 'default'}>{r.documentStatus.name}</Tag> : <Tag>{v}</Tag> },
            {
              title: 'Atanan', key: 'atanan', render: (_, r) => {
                const a = assignByDoc.get(r.id)
                return a ? <Space><Tag icon={a.userGroupId ? <TeamOutlined /> : <UserOutlined />} color="blue">{a.atanan}</Tag><Button size="small" type="text" danger icon={<CloseOutlined />} onClick={() => removeAssign(a)} /></Space> : <span style={{ color: 'var(--og-muted)' }}>—</span>
              },
            },
            { title: 'İşlem', key: 'x', width: 110, render: (_, r) => <Button size="small" onClick={() => openAssign(r)}>{assignByDoc.get(r.id) ? 'Değiştir' : 'Ata'}</Button> },
          ]}
        />
      </Card>

      <Modal open={!!target} onCancel={() => setTarget(null)} onOk={doAssign} confirmLoading={busy} okText="Ata" cancelText="Vazgeç" title={`İş Atama — ${target?.documentNo ?? ''}`}>
        <Radio.Group value={mode} onChange={(e) => { setMode(e.target.value); setPick(undefined) }} style={{ marginBottom: 12 }}>
          <Radio.Button value="user"><UserOutlined /> Kullanıcı</Radio.Button>
          <Radio.Button value="group"><TeamOutlined /> Kullanıcı Grubu</Radio.Button>
        </Radio.Group>
        <Select style={{ width: '100%' }} value={pick} onChange={setPick} showSearch optionFilterProp="label"
          placeholder={mode === 'user' ? 'Kullanıcı seçin' : 'Kullanıcı grubu seçin'} options={mode === 'user' ? users : groups} />
      </Modal>
    </div>
  )
}
