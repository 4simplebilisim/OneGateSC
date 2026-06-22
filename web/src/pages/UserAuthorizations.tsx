import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { App, Alert, Card, Select, Spin, Tag } from 'antd'
import { ArrowLeftOutlined } from '@ant-design/icons'
import { Button } from 'antd'
import { axiosInstance } from '../providers/dataProvider'
import { PageHeader } from '../components/PageHeader'

type Item = { id: number; code?: string; name?: string }
type Scope = { type: 'FACILITY' | 'WAREHOUSE' | 'OPERATION_TYPE'; title: string; resource: string; noun: string }

const SCOPES: Scope[] = [
  { type: 'FACILITY', title: 'Tesis Yetkileri', resource: 'facilities', noun: 'tesis' },
  { type: 'WAREHOUSE', title: 'Depo Yetkileri', resource: 'warehouses', noun: 'depo' },
  { type: 'OPERATION_TYPE', title: 'Operasyon Yetkileri', resource: 'operation-types', noun: 'operasyon tipi' },
]

const labelOf = (x: Item) => x.code ? `${x.code}${x.name ? ' — ' + x.name : ''}` : (x.name ?? `#${x.id}`)

function ScopeSection({ userId, scope }: { userId: number; scope: Scope }) {
  const { message } = App.useApp()
  const [options, setOptions] = useState<Item[]>([])
  const [selected, setSelected] = useState<number[]>([])
  const [authMap, setAuthMap] = useState<Record<number, number>>({}) // referenceId → authorization row id
  const [busy, setBusy] = useState(false)

  const load = useCallback(() => {
    Promise.all([
      axiosInstance.get(`/api/${scope.resource}`),
      axiosInstance.get('/api/user-authorizations', { params: { userId, scopeType: scope.type } }),
    ]).then(([items, auths]) => {
      const list = (Array.isArray(items.data) ? items.data : (items.data.data ?? [])) as Item[]
      setOptions(list)
      const arr = (Array.isArray(auths.data) ? auths.data : (auths.data.data ?? [])) as { id: number; referenceId: number }[]
      setSelected(arr.map((a) => a.referenceId))
      setAuthMap(Object.fromEntries(arr.map((a) => [a.referenceId, a.id])))
    })
  }, [userId, scope.resource, scope.type])

  useEffect(load, [load])

  const onChange = async (next: number[]) => {
    setBusy(true)
    const added = next.filter((x) => !selected.includes(x))
    const removed = selected.filter((x) => !next.includes(x))
    try {
      for (const refId of added) {
        const r = await axiosInstance.post('/api/user-authorizations', { userId, scopeType: scope.type, referenceId: refId })
        setAuthMap((m) => ({ ...m, [refId]: r.data.id }))
      }
      for (const refId of removed) {
        const authId = authMap[refId]
        if (authId) await axiosInstance.delete(`/api/user-authorizations/${authId}`)
        setAuthMap((m) => { const c = { ...m }; delete c[refId]; return c })
      }
      setSelected(next)
    } catch (e) {
      message.error((e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Yetki güncellenemedi')
      load()
    } finally { setBusy(false) }
  }

  return (
    <Card className="og-section-card" size="small" title={scope.title}
      extra={selected.length === 0 ? <Tag color="blue">Tümü serbest</Tag> : <Tag color="green">{selected.length} {scope.noun}</Tag>}>
      <Select mode="multiple" style={{ width: '100%' }} loading={busy} value={selected} onChange={onChange}
        placeholder={`Yetkili ${scope.noun}leri seçin — boş bırakılırsa tümüne erişebilir`}
        optionFilterProp="label" showSearch
        options={options.map((x) => ({ value: x.id, label: labelOf(x) }))} />
    </Card>
  )
}

export const UserAuthorizations = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { message } = App.useApp()
  const [user, setUser] = useState<{ username: string; fullName: string } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    axiosInstance.get(`/api/users/${id}`).then((r) => setUser(r.data))
      .catch((e) => message.error(e?.response?.data?.error ?? 'Kullanıcı yüklenemedi')).finally(() => setLoading(false))
  }, [id, message])

  if (loading) return <div style={{ padding: 80, textAlign: 'center' }}><Spin size="large" /></div>

  return (
    <div className="og-page" style={{ maxWidth: 760 }}>
      <PageHeader
        title={`Yetkiler — ${user?.fullName ?? user?.username ?? '#' + id}`}
        subtitle="Kullanıcının erişebileceği tesis / depo / operasyon tipleri"
        extra={<Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/users')}>Liste</Button>}
      />
      <Alert type="info" showIcon style={{ marginBottom: 12 }}
        title="Kısıtlama-listesi modeli"
        description="Bir bölüm boş bırakılırsa kullanıcı o boyuttaki tümüne erişebilir. Bir veya daha fazla seçilirse yalnız seçilenlerle sınırlanır. (Super-admin tüm erişime sahiptir.)" />
      {id && SCOPES.map((s) => <ScopeSection key={s.type} userId={Number(id)} scope={s} />)}
    </div>
  )
}
