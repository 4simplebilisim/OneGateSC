import { useEffect, useState } from 'react'
import { Alert, Radio, Select, Space } from 'antd'
import { axiosInstance } from '../providers/dataProvider'
import { PageHeader } from '../components/PageHeader'
import { UserAuthorizations } from './UserAuthorizations'

type U = { id: number; username: string; fullName: string }
type G = { id: number; code: string; name: string }
const asArr = <T,>(d: unknown) => (Array.isArray(d) ? d : ((d as { data?: unknown[] })?.data ?? [])) as T[]

// Ayrı menü (Uyarlamalar › Sistem › Ekran Yetkileri): kullanıcı/grup seç → yetki+hak editörünü gömülü aç.
// Kullanıcı listesine uğramadan hızlı erişim. Aynı editör kullanıcı/grup "Yetkiler" butonundan da açılır.
export const AuthCenter = () => {
  const [subject, setSubject] = useState<'user' | 'group'>('user')
  const [selectedId, setSelectedId] = useState<number | undefined>()
  const [users, setUsers] = useState<U[]>([])
  const [groups, setGroups] = useState<G[]>([])

  useEffect(() => {
    axiosInstance.get('/api/users').then((r) => setUsers(asArr<U>(r.data))).catch(() => { /* yetki yoksa boş */ })
    axiosInstance.get('/api/user-groups').then((r) => setGroups(asArr<G>(r.data))).catch(() => { /* boş */ })
  }, [])

  const options = subject === 'user'
    ? users.map((u) => ({ value: u.id, label: `${u.username} — ${u.fullName}` }))
    : groups.map((g) => ({ value: g.id, label: `${g.code} — ${g.name}` }))

  return (
    <div className="og-page" style={{ maxWidth: 820 }}>
      <PageHeader title="Ekran Yetkileri" subtitle="Kullanıcı veya grup seçin → yetki (tesis/depo/operasyon) ve haklarını (backoffice + el terminali ekranları) düzenleyin" />
      <div className="og-section-card" style={{ padding: 14, marginBottom: 12 }}>
        <Space wrap>
          <Radio.Group optionType="button" buttonStyle="solid" value={subject}
            onChange={(e) => { setSubject(e.target.value); setSelectedId(undefined) }}>
            <Radio.Button value="user">Kullanıcı</Radio.Button>
            <Radio.Button value="group">Grup</Radio.Button>
          </Radio.Group>
          <Select showSearch style={{ minWidth: 340 }} optionFilterProp="label" allowClear
            placeholder={subject === 'user' ? 'Kullanıcı seçin' : 'Grup seçin'}
            value={selectedId} onChange={(v) => setSelectedId(v)} options={options} />
        </Space>
      </div>
      {selectedId
        ? <UserAuthorizations key={`${subject}-${selectedId}`} subject={subject} ownerId={selectedId} embedded defaultTab="hak" />
        : <Alert type="info" showIcon title="Yetki ve haklarını düzenlemek için yukarıdan bir kullanıcı veya grup seçin." />}
    </div>
  )
}
