import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { App, Alert, Button, Checkbox, Input, Radio, Select, Spin, Tabs, Tag } from 'antd'
import { ArrowLeftOutlined } from '@ant-design/icons'
import { axiosInstance } from '../providers/dataProvider'
import { PageHeader } from '../components/PageHeader'
import { RESOURCES } from '../resources'

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

// StokBar "Kullanıcı Hakları" deseni: TÜM ekranlar bölüm başlıklarıyla tek matriste — satır/bölüm/kolon
// toplu işaretleme + tek Kaydet (PUT /bulk). Değişiklikler taslakta birikir; Kaydet'e kadar yazılmaz.
function RightsSection({ owner }: { owner: Owner }) {
  const { message } = App.useApp()
  const ownerKey = JSON.stringify(owner)
  const [map, setMap] = useState<Record<string, SR>>({})
  const [draft, setDraft] = useState<Record<string, SR>>({})
  const [q, setQ] = useState('')
  const [busy, setBusy] = useState(false)
  // Bölüm daralt/genişlet — StokBar ağacı gibi; arama aktifken hepsi açık (eşleşme gizlenmesin)
  const [closed, setClosed] = useState<string[]>([])
  const toggleSec = (sec: string) => setClosed((c) => (c.includes(sec) ? c.filter((s) => s !== sec) : [...c, sec]))

  const load = useCallback(() => {
    axiosInstance.get('/api/screen-rights', { params: owner }).then((r) => {
      const rows = (Array.isArray(r.data) ? r.data : (r.data.data ?? [])) as ({ resource: string } & SR)[]
      setMap(Object.fromEntries(rows.map((x) => [x.resource, { canView: x.canView, canAdd: x.canAdd, canEdit: x.canEdit, canDelete: x.canDelete }])))
      setDraft({})
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ownerKey])
  useEffect(load, [load])

  const eff = (res: string): SR => draft[res] ?? map[res] ?? FULL
  const allOf = (sr: SR) => sr.canView && sr.canAdd && sr.canEdit && sr.canDelete
  const setCells = (resList: string[], key: keyof SR | 'ALL', val: boolean) =>
    setDraft((d) => {
      const c = { ...d }
      for (const res of resList) {
        const cur = c[res] ?? map[res] ?? FULL
        c[res] = key === 'ALL' ? { canView: val, canAdd: val, canEdit: val, canDelete: val } : { ...cur, [key]: val }
      }
      return c
    })

  const ql = q.trim().toLocaleLowerCase('tr')
  const list = RIGHT_RESOURCES.filter((r) => !ql || `${r.section} ${r.group ?? ''} ${r.label}`.toLocaleLowerCase('tr').includes(ql))
  const sections = [...new Set(list.map((r) => r.section))]
  const dirty = Object.keys(draft).filter((res) => JSON.stringify(draft[res]) !== JSON.stringify(map[res] ?? FULL)).length

  const save = async () => {
    const rows = Object.entries(draft).map(([resource, sr]) => ({ resource, ...sr }))
    if (!rows.length) return
    setBusy(true)
    try {
      const r = await axiosInstance.put('/api/screen-rights/bulk', { ...owner, rows })
      message.success(`Kaydedildi — ${r.data.updated} kısıt, ${r.data.cleared} serbest bırakma`)
      load()
    } catch (e) {
      message.error((e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Kaydedilemedi')
    } finally { setBusy(false) }
  }

  const colState = (key: keyof SR) => {
    const vals = list.map((r) => eff(r.name)[key])
    return { all: vals.every(Boolean), none: vals.every((v) => !v) }
  }
  const secState = (sec: string) => {
    const vals = list.filter((r) => r.section === sec).map((r) => allOf(eff(r.name)))
    return { all: vals.every(Boolean), none: vals.every((v) => !v) }
  }

  return (
    <>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 10, flexWrap: 'wrap' }}>
        <Input allowClear placeholder="Ekran ara…" onChange={(e) => setQ(e.target.value)} style={{ maxWidth: 260 }} />
        <Button size="small" onClick={() => setClosed(closed.length ? [] : [...sections])}>
          {closed.length ? 'Tümünü Genişlet' : 'Tümünü Daralt'}
        </Button>
        <span style={{ flex: 1 }} />
        {dirty > 0 && <Tag color="orange">{dirty} kaydedilmemiş değişiklik</Tag>}
        <Button size="small" disabled={!dirty || busy} onClick={() => setDraft({})}>Vazgeç</Button>
        <Button size="small" type="primary" loading={busy} disabled={!dirty} onClick={save}>Kaydet</Button>
      </div>
      <div style={{ maxHeight: 'max(420px, calc(100vh - 430px))', overflowY: 'auto', border: '1px solid var(--og-border-soft)', borderRadius: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', padding: '6px 10px', position: 'sticky', top: 0, zIndex: 2, background: 'var(--og-table-head)', borderBottom: '1px solid var(--og-border-soft)', fontSize: 11.5, fontWeight: 600 }}>
          <span style={{ width: 40, textAlign: 'center' }}>Tümü</span>
          <span style={{ flex: 1 }}>Ekran</span>
          {ACTIONS.map((a) => { const st = colState(a.key); return (
            <span key={a.key} style={{ width: 62, textAlign: 'center' }}>
              <Checkbox checked={st.all} indeterminate={!st.all && !st.none} onChange={(e) => setCells(list.map((r) => r.name), a.key, e.target.checked)} /> {a.label}
            </span>
          )})}
        </div>
        {sections.map((sec) => { const st = secState(sec); const isOpen = !!ql || !closed.includes(sec); const cnt = list.filter((r) => r.section === sec).length; return (
          <div key={sec}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 10px', background: 'var(--og-sunken)', borderBottom: '1px solid var(--og-border-soft)', fontWeight: 700, fontSize: 12, cursor: 'pointer', userSelect: 'none' }}
              onClick={() => toggleSec(sec)}>
              <span onClick={(e) => e.stopPropagation()}>
                <Checkbox checked={st.all} indeterminate={!st.all && !st.none}
                  onChange={(e) => setCells(list.filter((r) => r.section === sec).map((r) => r.name), 'ALL', e.target.checked)} />
              </span>
              <span style={{ width: 12, color: 'var(--og-muted)' }}>{isOpen ? '▾' : '▸'}</span>
              {sec}
              <span style={{ fontWeight: 400, color: 'var(--og-muted)' }}>({cnt})</span>
            </div>
            {isOpen && list.filter((r) => r.section === sec).map((r) => { const sr = eff(r.name); const changed = draft[r.name] && JSON.stringify(draft[r.name]) !== JSON.stringify(map[r.name] ?? FULL); return (
              <div key={r.name} style={{ display: 'flex', alignItems: 'center', padding: '3px 10px', borderBottom: '1px dotted var(--og-border-soft)', background: changed ? 'rgba(37,99,201,.05)' : undefined }}>
                <span style={{ width: 40, textAlign: 'center' }}>
                  <Checkbox checked={allOf(sr)} indeterminate={!allOf(sr) && (sr.canView || sr.canAdd || sr.canEdit || sr.canDelete)} onChange={(e) => setCells([r.name], 'ALL', e.target.checked)} />
                </span>
                <span style={{ flex: 1, fontSize: 12.5 }}>{r.group ? <span style={{ color: 'var(--og-muted)' }}>{r.group} › </span> : null}{r.label}</span>
                {ACTIONS.map((a) => (
                  <span key={a.key} style={{ width: 62, textAlign: 'center' }}>
                    <Checkbox checked={sr[a.key]} onChange={(e) => setCells([r.name], a.key, e.target.checked)} />
                  </span>
                ))}
              </div>
            )})}
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

  // StokBar "El Terminali Uyarlama" deseni: tüm menüler checkbox listesi — kayıt yoksa TÜMÜ serbest
  const unrestricted = selected.length === 0
  const toggleOne = (code: string, on: boolean) => {
    // Kısıtsız durumda ilk KALDIRMA = diğer hepsini kayıtla, bunu dışarıda bırak
    if (unrestricted && !on) return onChange(options.map((o) => o.value).filter((c) => c !== code))
    onChange(on ? [...selected, code] : selected.filter((c) => c !== code))
  }
  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, flexWrap: 'wrap' }}>
        {unrestricted
          ? <Tag color="green">Kısıt yok — tüm {noun}ler erişilebilir</Tag>
          : <Tag color="blue">{selected.length} {noun} seçili (yalnız bunlar erişilebilir)</Tag>}
        <span style={{ flex: 1 }} />
        <Button size="small" disabled={busy || unrestricted} onClick={() => onChange([])}>Tüm kısıtları kaldır</Button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '4px 16px', border: '1px solid var(--og-border-soft)', borderRadius: 10, padding: 12 }}>
        {options.map((o) => (
          <Checkbox key={o.value} disabled={busy} checked={unrestricted || selected.includes(o.value)}
            onChange={(e) => toggleOne(o.value, e.target.checked)}>
            <span style={{ fontSize: 12.5 }}>{o.label}</span>
          </Checkbox>
        ))}
        {!options.length && <span style={{ color: 'var(--og-muted)', fontSize: 12.5 }}>{placeholder}</span>}
      </div>
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

  ]

  const body = (
    <>
      {!embedded && (
        <PageHeader
          title={`${isGroup ? 'Grup Yetkileri' : 'Yetkiler'} — ${title}`}
          subtitle="Yetki (ne yapabilir: firma/tesis/depo/operasyon) · Hak (hangi ekranları görür: backoffice + el terminali)"
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
