import { useEffect, useState, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { App, Alert, Button, Card, Form, Input, Select, Space, Spin, Switch, Table, Tabs } from 'antd'
import { ArrowLeftOutlined, SaveOutlined, DeleteOutlined, UsergroupAddOutlined } from '@ant-design/icons'
import { axiosInstance } from '../providers/dataProvider'
import { PageHeader } from '../components/PageHeader'

type User = { id: number; username: string; fullName: string; isActive?: boolean }
const asArr = (d: unknown) => (Array.isArray(d) ? d : ((d as { data?: unknown[] })?.data ?? [])) as User[]
const errMsg = (e: unknown, fallback: string) => (e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? fallback

export const UserGroupForm = ({ mode }: { mode: 'create' | 'edit' }) => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { message } = App.useApp()
  const [form] = Form.useForm()
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(mode === 'edit')
  const [members, setMembers] = useState<User[]>([])
  const [allUsers, setAllUsers] = useState<User[]>([])
  const [groupCompanyId, setGroupCompanyId] = useState<number | null>(null)
  const [toAdd, setToAdd] = useState<number[]>([])
  const [adding, setAdding] = useState(false)

  const loadMembers = useCallback(async () => {
    if (mode !== 'edit' || !id) return
    try { const r = await axiosInstance.get(`/api/user-groups/${id}/members`); setMembers(asArr(r.data)) } catch { /* boş */ }
  }, [mode, id])

  useEffect(() => {
    if (mode !== 'edit' || !id) return
    axiosInstance.get(`/api/user-groups/${id}`).then((r) => {
      form.setFieldsValue({ code: r.data.code, name: r.data.name, isActive: r.data.isActive })
      setGroupCompanyId(r.data.companyId ?? null)
    }).catch((e) => message.error(errMsg(e, 'Grup yüklenemedi'))).finally(() => setLoading(false))
    loadMembers()
  }, [mode, id, form, message, loadMembers])

  // Eklenebilir kullanıcılar: grubun firmasındaki kullanıcılar (süper-admin'de ?companyId ile daraltılır)
  useEffect(() => {
    const q = groupCompanyId ? `?companyId=${groupCompanyId}` : ''
    axiosInstance.get(`/api/users${q}`).then((r) => setAllUsers(asArr(r.data))).catch(() => { /* boş */ })
  }, [groupCompanyId])

  const onFinish = async (values: Record<string, unknown>) => {
    setSaving(true)
    try {
      if (mode === 'create') {
        const r = await axiosInstance.post('/api/user-groups', values)
        message.success('Grup oluşturuldu — şimdi Kullanıcılar sekmesinden üye ekleyebilirsiniz')
        navigate(`/user-groups/${r.data.id}/edit`)
      } else {
        await axiosInstance.patch(`/api/user-groups/${id}`, values)
        message.success('Grup güncellendi')
        navigate('/user-groups')
      }
    } catch (e) { message.error(errMsg(e, 'Kaydedilemedi')) } finally { setSaving(false) }
  }

  const memberIds = new Set(members.map((m) => m.id))
  const addable = allUsers.filter((u) => !memberIds.has(u.id))

  const addMembers = async () => {
    if (!toAdd.length) return
    setAdding(true)
    try {
      const r = await axiosInstance.post(`/api/user-groups/${id}/members`, { userIds: toAdd })
      message.success(`${r.data.added} kullanıcı eklendi`)
      setToAdd([])
      await loadMembers()
    } catch (e) { message.error(errMsg(e, 'Eklenemedi')) } finally { setAdding(false) }
  }

  const removeMember = async (userId: number) => {
    try { await axiosInstance.delete(`/api/user-groups/${id}/members/${userId}`); message.success('Çıkarıldı'); await loadMembers() }
    catch (e) { message.error(errMsg(e, 'Çıkarılamadı')) }
  }

  const infoTab = (
    <Form form={form} layout="vertical" onFinish={onFinish} initialValues={{ isActive: true }} style={{ maxWidth: 480 }}>
      <Form.Item name="code" label="Grup Kodu" rules={[{ required: true, message: 'Zorunlu' }]}><Input placeholder="DEPO-EKIP" /></Form.Item>
      <Form.Item name="name" label="Grup Adı" rules={[{ required: true, message: 'Zorunlu' }]}><Input placeholder="Depo Ekibi" /></Form.Item>
      <Form.Item name="isActive" label="Aktif" valuePropName="checked"><Switch /></Form.Item>
      <div className="og-formbar">
        <Button type="primary" icon={<SaveOutlined />} htmlType="submit" loading={saving}>Kaydet</Button>
        <Button onClick={() => navigate('/user-groups')}>İptal</Button>
      </div>
    </Form>
  )

  const membersTab = mode === 'create' ? (
    <Alert type="info" showIcon message="Önce grubu kaydedin, sonra bu sekmeden birden fazla kullanıcıyı aynı anda ekleyebilirsiniz." />
  ) : (
    <Space direction="vertical" style={{ width: '100%' }} size="middle">
      <Space.Compact style={{ width: '100%' }}>
        <Select mode="multiple" style={{ width: '100%' }} placeholder="Kullanıcı seçin (birden fazla aynı anda)" value={toAdd} onChange={setToAdd}
          optionFilterProp="label" showSearch allowClear
          options={addable.map((u) => ({ value: u.id, label: `${u.username} — ${u.fullName}` }))} />
        <Button type="primary" icon={<UsergroupAddOutlined />} loading={adding} disabled={!toAdd.length} onClick={addMembers}>Ekle</Button>
      </Space.Compact>
      <Table size="small" rowKey="id" dataSource={members} pagination={false} locale={{ emptyText: 'Henüz üye yok' }}
        columns={[
          { title: 'Kullanıcı Adı', dataIndex: 'username' },
          { title: 'Ad Soyad', dataIndex: 'fullName' },
          { title: '', width: 90, align: 'right' as const, render: (_: unknown, r: User) => <Button size="small" danger type="text" icon={<DeleteOutlined />} onClick={() => removeMember(r.id)}>Çıkar</Button> },
        ]} />
    </Space>
  )

  return (
    <div className="og-page" style={{ maxWidth: 720 }}>
      <PageHeader title={mode === 'create' ? 'Yeni Kullanıcı Grubu' : 'Kullanıcı Grubu Düzenle'}
        subtitle="Grup bilgileri ve üyeler" extra={<Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/user-groups')}>Liste</Button>} />
      <Card className="og-section-card" size="small">
        <Spin spinning={loading}>
          <Tabs items={[
            { key: 'info', label: 'Grup Bilgileri', children: infoTab },
            { key: 'members', label: `Kullanıcılar${members.length ? ` (${members.length})` : ''}`, children: membersTab },
          ]} />
        </Spin>
      </Card>
    </div>
  )
}
