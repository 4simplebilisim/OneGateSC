import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { App, Button, Card, DatePicker, Form, Input, Select, Spin, Switch } from 'antd'
import dayjs from 'dayjs'
import { ArrowLeftOutlined, SaveOutlined } from '@ant-design/icons'
import { axiosInstance } from '../providers/dataProvider'
import { PageHeader } from '../components/PageHeader'

const ROLE_OPTS = [
  { value: 'ADMIN', label: 'Yönetici (ADMIN)' },
  { value: 'OPERATOR', label: 'Operatör (OPERATOR)' },
  { value: 'VIEWER', label: 'İzleyici (VIEWER)' },
]

type Company = { id: number; code: string; name: string }

export const UserForm = ({ mode }: { mode: 'create' | 'edit' }) => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { message } = App.useApp()
  const [form] = Form.useForm()
  const [companies, setCompanies] = useState<Company[]>([])
  const [groups, setGroups] = useState<{ id: number; code: string; name: string }[]>([])
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(mode === 'edit')

  useEffect(() => {
    axiosInstance.get('/api/companies').then((r) => {
      const list = (Array.isArray(r.data) ? r.data : (r.data.data ?? [])) as Company[]
      setCompanies(list)
      if (mode === 'create' && list.length === 1) form.setFieldValue('companyId', list[0].id)
    }).catch(() => { /* yetki yoksa boş */ })
    axiosInstance.get('/api/user-groups').then((r) => {
      setGroups((Array.isArray(r.data) ? r.data : (r.data.data ?? [])) as { id: number; code: string; name: string }[])
    }).catch(() => { /* boş */ })
  }, [mode, form])

  useEffect(() => {
    if (mode !== 'edit' || !id) return
    axiosInstance.get(`/api/users/${id}`).then((r) => {
      const u = r.data
      form.setFieldsValue({
        username: u.username, email: u.email, fullName: u.fullName,
        companyId: u.companyId, isActive: u.isActive,
        roles: (u.userRoles ?? []).map((ur: { role: { code: string } }) => ur.role.code),
        groups: (u.groupMemberships ?? []).map((gm: { groupId: number }) => gm.groupId),
        userType: u.userType ?? undefined, isApproved: u.isApproved,
        phone: u.phone ?? undefined, alias: u.alias ?? undefined,
        validUntil: u.validUntil ? dayjs(u.validUntil) : undefined,
        passwordNeverExpires: u.passwordNeverExpires,
        mustChangePassword: u.mustChangePassword,
        cannotChangePassword: u.cannotChangePassword,
      })
    }).catch((e) => message.error(e?.response?.data?.error ?? 'Kullanıcı yüklenemedi')).finally(() => setLoading(false))
  }, [mode, id, form, message])

  const onFinish = async (values: Record<string, unknown>) => {
    setSaving(true)
    // DatePicker dayjs nesnesi döner → backend'e 'YYYY-MM-DD' string gönder
    if (values.validUntil && dayjs.isDayjs(values.validUntil)) {
      values.validUntil = (values.validUntil as dayjs.Dayjs).format('YYYY-MM-DD')
    } else {
      delete values.validUntil
    }
    try {
      if (mode === 'create') {
        await axiosInstance.post('/api/users', values)
        message.success('Kullanıcı oluşturuldu')
      } else {
        const { username: _u, password, ...rest } = values
        const body = password ? { ...rest, password } : rest // boş şifre → sıfırlama yok
        await axiosInstance.patch(`/api/users/${id}`, body)
        message.success('Kullanıcı güncellendi')
      }
      navigate('/users')
    } catch (e) {
      message.error((e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Kaydedilemedi')
    } finally { setSaving(false) }
  }

  return (
    <div className="og-page" style={{ maxWidth: 640 }}>
      <PageHeader
        title={mode === 'create' ? 'Yeni Kullanıcı' : 'Kullanıcı Düzenle'}
        subtitle="Kullanıcı bilgileri, firma ve roller"
        extra={<Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/users')}>Liste</Button>}
      />
      <Card className="og-section-card" size="small">
        <Spin spinning={loading}>
        <Form form={form} layout="vertical" onFinish={onFinish} initialValues={{ isActive: true, roles: ['OPERATOR'], isApproved: true, passwordNeverExpires: true }}>
          <Form.Item name="username" label="Kullanıcı Adı" rules={[{ required: mode === 'create', message: 'Zorunlu' }]}>
            <Input disabled={mode === 'edit'} placeholder="kullanici01" />
          </Form.Item>
          <Form.Item name="fullName" label="Ad Soyad" rules={[{ required: true, message: 'Zorunlu' }]}>
            <Input placeholder="Ad Soyad" />
          </Form.Item>
          <Form.Item name="email" label="E-posta" rules={[{ required: true, type: 'email', message: 'Geçerli e-posta' }]}>
            <Input placeholder="ad@firma.com" />
          </Form.Item>
          <Form.Item name="password" label={mode === 'create' ? 'Şifre' : 'Yeni Şifre (boş = değişmez)'}
            rules={mode === 'create' ? [{ required: true, min: 6, message: 'En az 6 karakter' }] : [{ min: 6, message: 'En az 6 karakter' }]}>
            <Input.Password placeholder="••••••" autoComplete="new-password" />
          </Form.Item>
          <Form.Item name="companyId" label="Firma" rules={[{ required: true, message: 'Zorunlu' }]}>
            <Select placeholder="Firma seçin" disabled={companies.length <= 1}
              options={companies.map((c) => ({ value: c.id, label: `${c.code} — ${c.name}` }))} />
          </Form.Item>
          <Form.Item name="roles" label="Roller" rules={[{ required: true, message: 'En az bir rol' }]}>
            <Select mode="multiple" placeholder="Rol seçin" options={ROLE_OPTS} />
          </Form.Item>
          <Form.Item name="groups" label="Kullanıcı Grupları (yetki miras alınır)">
            <Select mode="multiple" placeholder="Grup seçin — gruptan yetki miras alınır" optionFilterProp="label" showSearch allowClear
              options={groups.map((g) => ({ value: g.id, label: `${g.code} — ${g.name}` }))} />
          </Form.Item>
          <Form.Item name="userType" label="Tip">
            <Select allowClear placeholder="Tip seçin"
              options={[{ value: 'CENTRAL', label: 'Merkez' }, { value: 'BRANCH', label: 'Şube' }]} />
          </Form.Item>
          <Form.Item name="phone" label="Cep Tel">
            <Input placeholder="05xx xxx xx xx" />
          </Form.Item>
          <Form.Item name="alias" label="Alias">
            <Input placeholder="Kısa ad / takma ad" />
          </Form.Item>
          <Form.Item name="validUntil" label="Geçerlilik Tarihi">
            <DatePicker format="DD.MM.YYYY" placeholder="GG.AA.YYYY" style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="isApproved" label="Onay" valuePropName="checked">
            <Switch />
          </Form.Item>
          <Form.Item name="passwordNeverExpires" label="Şifre her zaman geçerli" valuePropName="checked">
            <Switch />
          </Form.Item>
          <Form.Item name="mustChangePassword" label="Sonraki oturumda şifre değiştir" valuePropName="checked">
            <Switch />
          </Form.Item>
          <Form.Item name="cannotChangePassword" label="Şifreyi değiştiremez" valuePropName="checked">
            <Switch />
          </Form.Item>
          <Form.Item name="isActive" label="Aktif" valuePropName="checked">
            <Switch />
          </Form.Item>
          <div className="og-formbar">
            <Button type="primary" icon={<SaveOutlined />} htmlType="submit" loading={saving}>Kaydet</Button>
            <Button onClick={() => navigate('/users')}>İptal</Button>
          </div>
        </Form>
        </Spin>
      </Card>
    </div>
  )
}
