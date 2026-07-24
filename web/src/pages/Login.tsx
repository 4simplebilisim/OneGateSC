import { useEffect, useState } from 'react'
import { useLogin } from '@refinedev/core'
import { Alert, Button, Checkbox, Form, Input, Typography, ConfigProvider } from 'antd'
import { makeTheme } from '../theme'

const GRADIENT = 'linear-gradient(140deg, #44d4e3 0%, #4e86ff 50%, #9b5cf6 100%)'

const Stat = ({ value, label }: { value: string; label: string }) => (
  <div
    style={{
      background: 'rgba(255,255,255,.14)',
      backdropFilter: 'blur(10px)',
      WebkitBackdropFilter: 'blur(10px)',
      border: '1px solid rgba(255,255,255,.28)',
      borderRadius: 16,
      padding: '14px 18px',
      minWidth: 118,
    }}
  >
    <div style={{ fontSize: 24, fontWeight: 700, lineHeight: 1.1 }}>{value}</div>
    <div style={{ fontSize: 12.5, opacity: 0.88, marginTop: 2 }}>{label}</div>
  </div>
)

export const Login = () => {
  const { mutate: login } = useLogin()
  const [sessionMsg, setSessionMsg] = useState<string | null>(null)
  // Tek oturum: başka cihazda giriş yüzünden atıldıysa authProvider mesaj bırakır → burada göster
  useEffect(() => {
    const m = localStorage.getItem('og_session_msg')
    if (m) { setSessionMsg(m); localStorage.removeItem('og_session_msg') }
  }, [])

  return (
    <ConfigProvider theme={makeTheme('light')}>
    <div style={{ display: 'flex', minHeight: '100vh', background: '#fff' }}>
      {/* ── Marka paneli (sol) ── */}
      <div
        style={{
          flex: '1 1 52%',
          background: GRADIENT,
          color: '#fff',
          position: 'relative',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          padding: '40px 52px',
        }}
      >
        <div className="og-float" style={{ position: 'absolute', width: 420, height: 420, borderRadius: '50%', background: 'rgba(255,255,255,.13)', top: -150, right: -130 }} />
        <div className="og-float" style={{ position: 'absolute', width: 300, height: 300, borderRadius: '50%', background: 'rgba(255,255,255,.08)', bottom: -110, left: -70, animationDelay: '-4.5s' }} />
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(110% 80% at 15% 0%, rgba(255,255,255,.20), transparent 55%)' }} />

        {/* logo */}
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 11 }}>
          <img src="/OneGate-assets/onegate-icon.svg" width={40} height={40} alt="OneGate WMS" style={{ borderRadius: 10 }} />
          <span className="og-display" style={{ fontSize: 23, fontWeight: 800, letterSpacing: 0.2 }}>
            OneGate <span style={{ fontWeight: 600, opacity: 0.85 }}>WMS</span>
          </span>
        </div>

        {/* başlık + istatistikler */}
        <div style={{ position: 'relative', marginTop: 'auto', marginBottom: 'auto' }}>
          <h1 style={{ fontSize: 36, lineHeight: 1.18, fontWeight: 700, margin: '0 0 16px', maxWidth: 440 }}>
            Depo operasyonlarınız<br />tek kapıda.
          </h1>
          <p style={{ fontSize: 15.5, opacity: 0.92, maxWidth: 400, lineHeight: 1.75, margin: 0 }}>
            Mal kabul, yönlendirme, stok, sipariş ve iş emri — WMS &amp; Procurement tek platformda.
          </p>
          <div style={{ display: 'flex', gap: 14, marginTop: 34, flexWrap: 'wrap' }}>
            <Stat value="1.240" label="Stok kalemi" />
            <Stat value="18" label="Açık sipariş" />
            <Stat value="5" label="Aktif iş emri" />
          </div>
        </div>

        <div style={{ position: 'relative', fontSize: 12.5, opacity: 0.75 }}>© 2026 OneGate · 4Simple</div>
      </div>

      {/* ── Form paneli (sağ) ── */}
      <div style={{ flex: '1 1 48%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div style={{ width: '100%', maxWidth: 372 }}>
          <Typography.Title level={2} style={{ marginBottom: 2, fontWeight: 700 }}>
            Tekrar hoş geldiniz
          </Typography.Title>
          <Typography.Paragraph type="secondary" style={{ marginBottom: 30, fontSize: 15 }}>
            Hesabınızla giriş yapın
          </Typography.Paragraph>

          {sessionMsg && <Alert type="warning" showIcon closable title={sessionMsg} style={{ marginBottom: 18 }} onClose={() => setSessionMsg(null)} />}

          <Form layout="vertical" size="large" requiredMark={false} initialValues={{ remember: true }} onFinish={(values) => login(values)}>
            <Form.Item name="username" label="Kullanıcı" rules={[{ required: true, message: 'Kullanıcı adı gerekli' }]}>
              <Input placeholder="admin" autoFocus />
            </Form.Item>
            <Form.Item name="password" label="Şifre" rules={[{ required: true, message: 'Şifre gerekli' }]} style={{ marginBottom: 12 }}>
              <Input.Password placeholder="••••••••" />
            </Form.Item>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }}>
              <Form.Item name="remember" valuePropName="checked" noStyle>
                <Checkbox>Beni hatırla</Checkbox>
              </Form.Item>
              <Typography.Link style={{ color: '#4e86ff', fontSize: 14 }}>Şifremi unuttum?</Typography.Link>
            </div>
            <Button
              type="primary"
              htmlType="submit"
              block
              style={{ background: GRADIENT, border: 'none', fontWeight: 600, height: 48, fontSize: 15, boxShadow: '0 8px 20px rgba(78,134,255,.32)' }}
            >
              Giriş yap
            </Button>
          </Form>

          {/* Demo kimlikleri yalnız LOKAL geliştirmede göster — canlıda şifreler rotasyonlu, bu satır yanıltır + kullanıcı adlarını ifşa eder */}
          {!import.meta.env.PROD && (
            <Typography.Paragraph type="secondary" style={{ marginTop: 24, fontSize: 12, textAlign: 'center' }}>
              Demo: <code>admin / admin123</code> · <code>operator / operator123</code> · <code>viewer / viewer123</code>
            </Typography.Paragraph>
          )}
        </div>
      </div>
    </div>
    </ConfigProvider>
  )
}
