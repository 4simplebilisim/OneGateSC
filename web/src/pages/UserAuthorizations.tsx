import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { App, Alert, Button, Checkbox, Input, Radio, Select, Spin, Tabs, Tag } from 'antd'
import { ArrowLeftOutlined } from '@ant-design/icons'
import { axiosInstance } from '../providers/dataProvider'
import { PageHeader } from '../components/PageHeader'
import { RESOURCES } from '../resources'
import { FORM_CONFIG } from '../formConfig'
import { MOBILE_MENU } from '../mobile/mobileMenu'

type Item = { id: number; code?: string; name?: string }
type Scope = { type: 'COMPANY' | 'FACILITY' | 'WAREHOUSE' | 'OPERATION_TYPE'; resource: string; noun: string }
type Owner = { userId: number } | { groupId: number }
const isSuperAdmin = () => { try { return !!JSON.parse(localStorage.getItem('og_user') ?? 'null')?.isSuperAdmin } catch { return false } }

const labelOf = (x: Item) => x.code ? `${x.code}${x.name ? ' — ' + x.name : ''}` : (x.name ?? `#${x.id}`)
const StatusTag = ({ n, noun }: { n: number; noun: string }) =>
  n === 0 ? <Tag color="blue">Tümü serbest</Tag> : <Tag color="green">{n} {noun}</Tag>

// ── Entity scope (Firma / Tesis / Depo / Operasyon) — referenceId ──
// GRUP: çoklu-seçim (baseline grant). KULLANICI: 3-durum (Devral/İzin/Yasak) — grup mirası + kullanıcı override.
function ScopeSection({ owner, scope }: { owner: Owner; scope: Scope }) {
  const { message } = App.useApp()
  const isGroup = 'groupId' in owner
  const ownerKey = JSON.stringify(owner)
  const [options, setOptions] = useState<Item[]>([])
  const [q, setQ] = useState('')
  // GRUP: seçili grant id'leri; KULLANICI: referenceId → {id, deny}
  const [selected, setSelected] = useState<number[]>([])
  const [authMap, setAuthMap] = useState<Record<number, number>>({})
  const [userState, setUserState] = useState<Record<number, { id: number; deny: boolean }>>({})
  const [inherited, setInherited] = useState<Set<number>>(new Set())
  const [busy, setBusy] = useState(false)

  const load = useCallback(() => {
    Promise.all([
      axiosInstance.get(`/api/${scope.resource}`),
      axiosInstance.get('/api/user-authorizations', { params: { ...owner, scopeType: scope.type } }),
      isGroup ? Promise.resolve({ data: { referenceIds: [] } }) : axiosInstance.get('/api/user-authorizations/inherited', { params: { ...owner, scopeType: scope.type } }),
    ]).then(([items, auths, inh]) => {
      setOptions((Array.isArray(items.data) ? items.data : (items.data.data ?? [])) as Item[])
      const arr = (Array.isArray(auths.data) ? auths.data : (auths.data.data ?? [])) as { id: number; referenceId: number; deny: boolean }[]
      if (isGroup) {
        setSelected(arr.filter((a) => !a.deny).map((a) => a.referenceId))
        setAuthMap(Object.fromEntries(arr.map((a) => [a.referenceId, a.id])))
      } else {
        setUserState(Object.fromEntries(arr.map((a) => [a.referenceId, { id: a.id, deny: a.deny }])))
        setInherited(new Set((inh.data?.referenceIds ?? []) as number[]))
      }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ownerKey, scope.resource, scope.type, isGroup])
  useEffect(load, [load])

  // ── GRUP: çoklu-seçim ──
  const onChangeGroup = async (next: number[]) => {
    setBusy(true)
    const added = next.filter((x) => !selected.includes(x)); const removed = selected.filter((x) => !next.includes(x))
    try {
      for (const refId of added) { const r = await axiosInstance.post('/api/user-authorizations', { ...owner, scopeType: scope.type, referenceId: refId }); setAuthMap((m) => ({ ...m, [refId]: r.data.id })) }
      for (const refId of removed) { if (authMap[refId]) await axiosInstance.delete(`/api/user-authorizations/${authMap[refId]}`); setAuthMap((m) => { const c = { ...m }; delete c[refId]; return c }) }
      setSelected(next)
    } catch (e) { message.error((e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Yetki güncellenemedi'); load() } finally { setBusy(false) }
  }

  if (isGroup) {
    return (
      <>
        <div style={{ marginBottom: 8, textAlign: 'right' }}><StatusTag n={selected.length} noun={scope.noun} /></div>
        <Select mode="multiple" style={{ width: '100%' }} loading={busy} value={selected} onChange={onChangeGroup}
          placeholder={`Yetkili ${scope.noun} seçin — boş bırakılırsa tümüne erişebilir`}
          optionFilterProp="label" showSearch options={options.map((x) => ({ value: x.id, label: labelOf(x) }))} />
      </>
    )
  }

  // ── KULLANICI: 3-durum (Devral/İzin/Yasak) ──
  const stateOf = (refId: number): 'inherit' | 'grant' | 'deny' => {
    const u = userState[refId]; return u ? (u.deny ? 'deny' : 'grant') : 'inherit'
  }
  const effectiveAllowed = (refId: number) => { const s = stateOf(refId); return s === 'grant' || (s === 'inherit' && inherited.has(refId)) }
  const setState = async (refId: number, next: 'inherit' | 'grant' | 'deny') => {
    setBusy(true)
    try {
      if (next === 'inherit') { if (userState[refId]) await axiosInstance.delete(`/api/user-authorizations/${userState[refId].id}`) }
      else await axiosInstance.post('/api/user-authorizations', { ...owner, scopeType: scope.type, referenceId: refId, deny: next === 'deny' })
      load()
    } catch (e) { message.error((e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Güncellenemedi') } finally { setBusy(false) }
  }
  // hiç grant/miras yoksa: kısıtsız
  const anyRestriction = inherited.size > 0 || Object.values(userState).some((u) => !u.deny)
  const effCount = options.filter((o) => effectiveAllowed(o.id)).length
  const ql = q.trim().toLocaleLowerCase('tr')
  const list = options.filter((o) => !ql || labelOf(o).toLocaleLowerCase('tr').includes(ql))

  return (
    <>
      <div style={{ marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 12, color: 'var(--og-muted)' }}>Grup mirası = <b>Devral</b>; kullanıcı seviyesinden <b>İzin</b> ekle / <b>Yasak</b>la (grubu override eder)</span>
        {anyRestriction ? <Tag color="green">Etkin: {effCount} {scope.noun}</Tag> : <Tag color="blue">Tümü serbest</Tag>}
      </div>
      <Input allowClear placeholder={`${scope.noun} ara…`} onChange={(e) => setQ(e.target.value)} style={{ marginBottom: 10 }} />
      <div style={{ maxHeight: 380, overflowY: 'auto' }}>
        {list.map((o) => {
          const st = stateOf(o.id); const inh = inherited.has(o.id)
          return (
            <div key={o.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '5px 0', borderBottom: '1px dotted var(--og-border-soft)' }}>
              <span style={{ flex: 1, fontSize: 13 }}>
                {labelOf(o)}
                {inh && <Tag color="geekblue" style={{ marginLeft: 6, fontSize: 11 }}>grup: izinli</Tag>}
                {st === 'deny' && inh && <Tag color="red" style={{ marginLeft: 2, fontSize: 11 }}>kaldırıldı</Tag>}
              </span>
              <Radio.Group size="small" optionType="button" buttonStyle="solid" disabled={busy} value={st}
                onChange={(e) => setState(o.id, e.target.value)}
                options={[{ label: 'Devral', value: 'inherit' }, { label: 'İzin', value: 'grant' }, { label: 'Yasak', value: 'deny' }]} />
            </div>
          )
        })}
      </div>
    </>
  )
}

// ── SCREEN scope (el terminali) — referenceCode (m/...) ──
const isMobileCode = (c: string) => c.startsWith('m/')
const MOBILE_OPTS = MOBILE_MENU.map((m) => ({ value: m.key, label: m.label }))

// ── Ekran hakkı / Haklar (aksiyon matrisi): her web ekranı × İzle/Yeni/Düzenle/Sil ──
const RIGHT_RESOURCES = RESOURCES.filter((r) => !r.hidden)
type SR = { canView: boolean; canAdd: boolean; canEdit: boolean; canDelete: boolean }
const FULL: SR = { canView: true, canAdd: true, canEdit: true, canDelete: true }
const ACTIONS: { key: keyof SR; label: string }[] = [
  { key: 'canView', label: 'İzle' }, { key: 'canAdd', label: 'Yeni' }, { key: 'canEdit', label: 'Düzenle' }, { key: 'canDelete', label: 'Sil' },
]

function RightsSection({ owner }: { owner: Owner }) {
  const { message } = App.useApp()
  const ownerKey = JSON.stringify(owner)
  const [map, setMap] = useState<Record<string, SR>>({})
  const [q, setQ] = useState('')
  const [busy, setBusy] = useState(false)

  const load = useCallback(() => {
    axiosInstance.get('/api/screen-rights', { params: owner }).then((r) => {
      const rows = (Array.isArray(r.data) ? r.data : (r.data.data ?? [])) as ({ resource: string } & SR)[]
      setMap(Object.fromEntries(rows.map((x) => [x.resource, { canView: x.canView, canAdd: x.canAdd, canEdit: x.canEdit, canDelete: x.canDelete }])))
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ownerKey])
  useEffect(load, [load])

  const rightsOf = (res: string): SR => map[res] ?? FULL
  const toggle = async (res: string, key: keyof SR, val: boolean) => {
    const next = { ...rightsOf(res), [key]: val }
    setMap((m) => ({ ...m, [res]: next }))
    setBusy(true)
    try {
      await axiosInstance.post('/api/screen-rights', { ...owner, resource: res, ...next })
      if (next.canView && next.canAdd && next.canEdit && next.canDelete) setMap((m) => { const c = { ...m }; delete c[res]; return c })
    } catch (e) {
      message.error((e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Güncellenemedi'); load()
    } finally { setBusy(false) }
  }

  const ql = q.trim().toLocaleLowerCase('tr')
  const list = RIGHT_RESOURCES.filter((r) => !ql || `${r.section} ${r.label}`.toLocaleLowerCase('tr').includes(ql))
  return (
    <>
      <Input allowClear placeholder="Ekran ara…" onChange={(e) => setQ(e.target.value)} style={{ marginBottom: 10 }} />
      <div style={{ display: 'flex', padding: '2px 0', borderBottom: '1px solid var(--og-border-soft)', fontSize: 11, color: 'var(--og-muted)' }}>
        <span style={{ flex: 1 }} />
        {ACTIONS.map((a) => <span key={a.key} style={{ width: 58, textAlign: 'center' }}>{a.label}</span>)}
      </div>
      <div style={{ maxHeight: 360, overflowY: 'auto' }}>
        {list.map((r) => { const sr = rightsOf(r.name); return (
          <div key={r.name} style={{ display: 'flex', alignItems: 'center', padding: '3px 0', borderBottom: '1px dotted var(--og-border-soft)' }}>
            <span style={{ flex: 1, fontSize: 12.5 }}>{r.section} › {r.label}</span>
            {ACTIONS.map((a) => (
              <span key={a.key} style={{ width: 58, textAlign: 'center' }}>
                <Checkbox checked={sr[a.key]} disabled={busy} onChange={(e) => toggle(r.name, a.key, e.target.checked)} />
              </span>
            ))}
          </div>
        )})}
      </div>
    </>
  )
}

function CodeSection({ owner, options, mine, noun, placeholder }: {
  owner: Owner; options: { value: string; label: string }[]; mine: (c: string) => boolean; noun: string; placeholder: string
}) {
  const { message } = App.useApp()
  const ownerKey = JSON.stringify(owner)
  const [selected, setSelected] = useState<string[]>([])
  const [authMap, setAuthMap] = useState<Record<string, number>>({})
  const [busy, setBusy] = useState(false)

  const load = useCallback(() => {
    axiosInstance.get('/api/user-authorizations', { params: { ...owner, scopeType: 'SCREEN' } }).then((r) => {
      const arr = (Array.isArray(r.data) ? r.data : (r.data.data ?? [])) as { id: number; referenceCode: string }[]
      const ours = arr.filter((a) => mine(a.referenceCode))
      setSelected(ours.map((a) => a.referenceCode))
      setAuthMap(Object.fromEntries(ours.map((a) => [a.referenceCode, a.id])))
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ownerKey, mine])
  useEffect(load, [load])

  const onChange = async (next: string[]) => {
    setBusy(true)
    const added = next.filter((x) => !selected.includes(x))
    const removed = selected.filter((x) => !next.includes(x))
    try {
      for (const code of added) {
        const r = await axiosInstance.post('/api/user-authorizations', { ...owner, scopeType: 'SCREEN', referenceCode: code })
        setAuthMap((m) => ({ ...m, [code]: r.data.id }))
      }
      for (const code of removed) {
        if (authMap[code]) await axiosInstance.delete(`/api/user-authorizations/${authMap[code]}`)
        setAuthMap((m) => { const c = { ...m }; delete c[code]; return c })
      }
      setSelected(next)
    } catch (e) {
      message.error((e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Yetki güncellenemedi'); load()
    } finally { setBusy(false) }
  }

  return (
    <>
      <div style={{ marginBottom: 8, textAlign: 'right' }}><StatusTag n={selected.length} noun={noun} /></div>
      <Select mode="multiple" style={{ width: '100%' }} loading={busy} value={selected} onChange={onChange}
        placeholder={placeholder} optionFilterProp="label" showSearch options={options} />
    </>
  )
}

// ── Kolon yetkisi (ekran × alan × mod) ──
const COLUMN_RESOURCES = RESOURCES.filter((r) => !r.hidden && FORM_CONFIG[r.name]?.length).map((r) => ({ value: r.name, label: `${r.section} › ${r.label}` }))
type ColRow = { id: number; column: string; mode: 'READONLY' | 'HIDDEN' }

function ColumnSection({ owner }: { owner: Owner }) {
  const { message } = App.useApp()
  const ownerKey = JSON.stringify(owner)
  const [resource, setResource] = useState<string>()
  const [rows, setRows] = useState<ColRow[]>([])
  const [busy, setBusy] = useState(false)

  const load = useCallback((res: string) => {
    axiosInstance.get('/api/column-authorizations', { params: { ...owner, resource: res } })
      .then((r) => setRows((Array.isArray(r.data) ? r.data : (r.data.data ?? [])) as ColRow[]))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ownerKey])

  const pick = (res: string) => { setResource(res); load(res) }
  const modeOf = (col: string): 'VISIBLE' | 'READONLY' | 'HIDDEN' => rows.find((r) => r.column === col)?.mode ?? 'VISIBLE'

  const setMode = async (col: string, mode: 'VISIBLE' | 'READONLY' | 'HIDDEN') => {
    if (!resource) return
    setBusy(true)
    try {
      const existing = rows.find((r) => r.column === col)
      if (mode === 'VISIBLE') { if (existing) await axiosInstance.delete(`/api/column-authorizations/${existing.id}`) }
      else await axiosInstance.post('/api/column-authorizations', { ...owner, resource, column: col, mode })
      load(resource)
    } catch (e) {
      message.error((e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Güncellenemedi')
    } finally { setBusy(false) }
  }

  const fields = resource ? (FORM_CONFIG[resource] ?? []) : []
  return (
    <>
      <Select placeholder="Ekran seçin — alanlarını ayarlayın" style={{ width: '100%', marginBottom: 12 }}
        value={resource} onChange={pick} showSearch optionFilterProp="label" options={COLUMN_RESOURCES} />
      {resource && fields.map((f) => (
        <div key={f.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, padding: '5px 0', borderBottom: '1px dotted var(--og-border-soft)' }}>
          <span style={{ fontSize: 13 }}>{f.label}</span>
          <Radio.Group size="small" optionType="button" buttonStyle="solid" disabled={busy}
            value={modeOf(f.name)} onChange={(e) => setMode(f.name, e.target.value)}
            options={[{ label: 'Görünür', value: 'VISIBLE' }, { label: 'Salt-okunur', value: 'READONLY' }, { label: 'Gizli', value: 'HIDDEN' }]} />
        </div>
      ))}
      {resource && fields.length === 0 && <div style={{ color: 'var(--og-muted)' }}>Bu ekranın tanımlı alanı yok.</div>}
    </>
  )
}

export const UserAuthorizations = ({ subject = 'user', ownerId, embedded, defaultTab }: { subject?: 'user' | 'group'; ownerId?: number; embedded?: boolean; defaultTab?: string }) => {
  const params = useParams()
  const id = ownerId != null ? String(ownerId) : params.id // ayrı menü (Ekran Yetkileri) ownerId ile gömülü kullanır
  const navigate = useNavigate()
  const { message } = App.useApp()
  const [owner, setOwner] = useState<{ name?: string; fullName?: string; username?: string; code?: string } | null>(null)
  const [loading, setLoading] = useState(true)
  const [mobileOpts, setMobileOpts] = useState<{ value: string; label: string }[]>(MOBILE_OPTS)
  const isGroup = subject === 'group'
  const backTo = isGroup ? '/user-groups' : '/users'

  useEffect(() => {
    axiosInstance.get(`/api/${isGroup ? 'user-groups' : 'users'}/${id}`).then((r) => setOwner(r.data))
      .catch((e) => message.error(e?.response?.data?.error ?? 'Kayıt yüklenemedi')).finally(() => setLoading(false))
  }, [id, isGroup, message])

  useEffect(() => {
    // Dinamik el terminali menüsü varsa yetki seçenekleri ondan; yoksa statik 4 menü
    axiosInstance.get('/api/handheld-menu').then((r) => {
      const groups = (Array.isArray(r.data) ? r.data : (r.data.data ?? [])) as { name: string; items: { code: string; name: string }[] }[]
      const opts = groups.flatMap((g) => g.items.map((it) => ({ value: `m/${it.code}`, label: `${g.name} › ${it.name}` })))
      if (opts.length) setMobileOpts(opts)
    }).catch(() => { /* statik kalır */ })
  }, [])

  if (loading) return <div style={{ padding: 80, textAlign: 'center' }}><Spin size="large" /></div>
  const uid = Number(id)
  const ownerRef: Owner = isGroup ? { groupId: uid } : { userId: uid }
  const title = owner?.fullName ?? owner?.name ?? owner?.username ?? owner?.code ?? `#${id}`

  // YETKİ (ne YAPABİLİR — varlık erişimi): Firma(tenant) · Tesis · Depo · Operasyon. Firma yalnız super-admin (cross-tenant).
  const yetkiTabs = [
    ...(isSuperAdmin() ? [{ key: 'company', label: 'Firma (Tenant)', children: <ScopeSection owner={ownerRef} scope={{ type: 'COMPANY' as const, resource: 'companies', noun: 'firma' }} /> }] : []),
    { key: 'facility', label: 'Tesis', children: <ScopeSection owner={ownerRef} scope={{ type: 'FACILITY', resource: 'facilities', noun: 'tesis' }} /> },
    { key: 'warehouse', label: 'Depo', children: <ScopeSection owner={ownerRef} scope={{ type: 'WAREHOUSE', resource: 'warehouses', noun: 'depo' }} /> },
    { key: 'operation', label: 'Operasyon', children: <ScopeSection owner={ownerRef} scope={{ type: 'OPERATION_TYPE', resource: 'operation-types', noun: 'operasyon tipi' }} /> },
  ]
  // HAK (hangi EKRANLARI GÖRÜR): Backoffice ekranları (İzle/Yeni/Düzenle/Sil) · El Terminali menüleri
  const hakTabs = [
    { key: 'backoffice', label: 'Backoffice Ekranları', children: <RightsSection owner={ownerRef} /> },
    { key: 'mobile', label: 'El Terminali', children: <CodeSection owner={ownerRef} options={mobileOpts} mine={isMobileCode} noun="menü" placeholder="Erişilebilecek el terminali menülerini seçin — boş = tümü" /> },
  ]
  const tabs = [
    { key: 'yetki', label: 'Yetki', children: <Tabs items={yetkiTabs} /> },
    { key: 'hak', label: 'Hak', children: <Tabs items={hakTabs} /> },
    { key: 'columns', label: 'Kolonlar', children: <ColumnSection owner={ownerRef} /> },
  ]

  const body = (
    <>
      {!embedded && (
        <PageHeader
          title={`${isGroup ? 'Grup Yetkileri' : 'Yetkiler'} — ${title}`}
          subtitle="Yetki (ne yapabilir: firma/tesis/depo/operasyon) · Hak (hangi ekranları görür: backoffice + el terminali) · Kolonlar"
          extra={<Button icon={<ArrowLeftOutlined />} onClick={() => navigate(backTo)}>Liste</Button>}
        />
      )}
      <Alert type="info" showIcon style={{ marginBottom: 12 }}
        title="Yetki ≠ Hak — kısıtlama-listesi modeli"
        description={<>
          <b>Yetki</b> = kullanıcının işlem yapabileceği firma/tesis/depo/operasyon. <b>Hak</b> = görebileceği ekranlar (backoffice + el terminali).
          {' '}Her boyut boş = kısıtsız; seçim = yalnız seçilenler. {isGroup ? 'Gruba verilenler üyelere miras geçer.' : 'Ekran/firma yetkisi yeni girişte yansır. Super-admin/ADMIN her şeye erişir.'}
        </>} />
      <div className="og-section-card" style={{ padding: '4px 14px 14px' }}>
        <Tabs items={tabs} defaultActiveKey={defaultTab} />
      </div>
    </>
  )
  return embedded ? body : <div className="og-page" style={{ maxWidth: 760 }}>{body}</div>
}
