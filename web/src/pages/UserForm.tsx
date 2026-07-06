import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { App, Button, Card, Form, Input, Select, Spin, Switch } from 'antd'
import { ArrowLeftOutlined, SaveOutlined } from '@ant-design/icons'
import { axiosInstance } from '../providers/dataProvider'
import { PageHeader } from '../components/PageHeader'

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
  const isAdmin = Form.useWatch('isAdmin', form) // süper-admin (tüm firmalar) → Firma opsiyonel
  const selectedCompanyId = Form.useWatch('companyId', form) // grup listesi bu firmaya göre yüklenir (og_company değil)

  useEffect(() => {
    axiosInstance.get('/api/companies').then((r) => {
      const list = (Array.isArray(r.data) ? r.data : (r.data.data ?? [])) as Company[]
      setCompanies(list)
      if (mode === 'create' && list.length === 1) form.setFieldValue('companyId', list[0].id)
    }).catch(() => { /* yetki yoksa boş */ })
  }, [mode, form])

  // Kullanıcı grupları DÜZENLENEN kullanıcının firmasından yüklenir (global seçili firmadan DEĞİL).
  // Aksi halde başka firmadaki bir kullanıcı düzenlenirken grup listede olmaz → Select ham id gösterir ("15").
  useEffect(() => {
    const cfg = selectedCompanyId ? { headers: { 'x-company-id': String(selectedCompanyId) } } : undefined
    axiosInstance.get('/api/user-groups', cfg).then((r) => {
      setGroups((Array.isArray(r.data) ? r.data : (r.data.data ?? [])) as { id: number; code: string; name: string }[])
    }).catch(() => setGroups([]))
  }, [selectedCompanyId])

  useEffect(() => {
    if (mode !== 'edit' || !id) return
    axiosInstance.get(`/api/users/${id}`).then((r) => {
      const u = r.data
      form.setFieldsValue({
        username: u.username, email: u.email, fullName: u.fullName,
        companyId: u.companyId, isActive: u.isActive,
        isAdmin: u.isSuperAdmin === true, // Yönetici (Admin) = firma-bağımsız süper-admin
        isMobileUser: u.isMobileUser === true,
        groups: (u.groupMemberships ?? []).map((gm: { groupId: number }) => gm.groupId),
        isApproved: u.isApproved, phone: u.phone ?? undefined,
        passwordNeverExpires: u.passwordNeverExpires,
        mustChangePassword: u.mustChangePassword,
        cannotChangePassword: u.cannotChangePassword,
      })
    }).catch((e) => message.error(e?.response?.data?.error ?? 'Kullanıcı yüklenemedi')).finally(() => setLoading(false))
  }, [mode, id, form, message])

  const onFinish = async (values: Record<string, unknown>) => {
    setSaving(true)
    // Yönetici toggle → firma-BAĞIMSIZ süper-admin (tüm firmalar, god-mode). Kapalı = normal kullanıcı (firmaya kilitli).
    const admin = !!values.isAdmin
    values.isSuperAdmin = admin
    values.roles = admin ? ['ADMIN'] : ['OPERATOR']
    delete values.isAdmin
    if (admin && !values.companyId) values.companyId = undefined // süper-admin firma-bağımsız (companyId boş bırakılabilir)
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
        subtitle="Kullanıcı bilgileri, firma ve yönetici yetkisi"
        extra={<Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/users')}>Liste</Button>}
      />
      <Card className="og-section-card" size="small">
        <Spin spinning={loading}>
        <Form form={form} layout="vertical" onFinish={onFinish} initialValues={{ isActive: true, isAdmin: false, isApproved: true, passwordNeverExpires: true }}>
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
          <Form.Item name="isAdmin" label="Yönetici (Admin)" valuePropName="checked"
            tooltip="Açık: TÜM firmalar için tam yetkili süper-admin (firma-bağımsız god-mode) — tesis/depo/operasyon yetki tanımı gerekmez. Kapalı: yalnız kendi firmasında, tanımlı yetki ve haklarla sınırlı.">
            <Switch checkedChildren="Admin — tüm firmalar" unCheckedChildren="Normal kullanıcı" />
          </Form.Item>
          <Form.Item name="companyId" label="Firma" rules={[{ required: !isAdmin, message: 'Zorunlu' }]}
            tooltip={isAdmin ? 'Süper-admin firma-bağımsızdır — boş bırakılabilir (tüm firmalara erişir). İsterseniz varsayılan firma seçin.' : undefined}>
            <Select placeholder={isAdmin ? 'Tüm firmalar (opsiyonel)' : 'Firma seçin'} allowClear={isAdmin}
              disabled={!isAdmin && companies.length <= 1}
              options={companies.map((c) => ({ value: c.id, label: `${c.code} — ${c.name}` }))} />
          </Form.Item>
          <Form.Item name="groups" label="Kullanıcı Grupları (yetki miras alınır)">
            <Select mode="multiple" placeholder="Grup seçin — gruptan yetki miras alınır" optionFilterProp="label" showSearch allowClear
              options={groups.map((g) => ({ value: g.id, label: `${g.code} — ${g.name}` }))} />
          </Form.Item>
          <Form.Item name="isMobileUser" label="Mobil Kullanıcı" valuePropName="checked"
            tooltip="Açık: bu kullanıcı el terminali (mobil) kullanıcısıdır.">
            <Switch checkedChildren="El Terminali" unCheckedChildren="Hayır" />
          </Form.Item>
          <Form.Item name="phone" label="Cep Tel">
            <Input placeholder="05xx xxx xx xx" />
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
