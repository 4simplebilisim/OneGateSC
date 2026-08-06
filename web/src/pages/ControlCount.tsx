import { useEffect, useState } from 'react'
import { App, Alert, Button, Card, Empty, InputNumber, Select, Space, Table, Tag } from 'antd'
import { CameraOutlined, CheckOutlined, ReloadOutlined } from '@ant-design/icons'
import { axiosInstance } from '../providers/dataProvider'
import { PageHeader } from '../components/PageHeader'

type Fark = {
  lineId: number; productCode: string; productName: string | null; unitCode: string | null
  systemQty: string; countedQty: string | null; diff: string | null
  status: 'EKSİK' | 'FAZLA' | 'UYUMLU' | 'SAYILMADI'
}
type Bas = { id: number; code: string | null; warehouseId: number | null; approvedAt: string | null; note: string | null }
type Opt = { value: number; label: string }
const arr = (d: unknown) => (Array.isArray(d) ? d : ((d as { data?: unknown[] })?.data ?? []))
const errMsg = (e: unknown, f: string) => (e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? f
const RENK: Record<Fark['status'], string> = { EKSİK: 'red', FAZLA: 'orange', UYUMLU: 'green', SAYILMADI: 'default' }

// KONTROL SAYIM — deponun anlık stoğunu fotoğraflar, operatör sayar, fark raporlanır.
// STOK DEĞİŞMEZ: düzeltme gerekiyorsa gerçek sayım (İşlemler › Sayım Girişi) açılır.
export const ControlCount = () => {
  const { message, modal } = App.useApp()
  const [depolar, setDepolar] = useState<Opt[]>([])
  const [depoId, setDepoId] = useState<number>()
  const [basliklar, setBasliklar] = useState<Bas[]>([])
  const [seciliId, setSeciliId] = useState<number>()
  const [satirlar, setSatirlar] = useState<Fark[]>([])
  const [yukleniyor, setYukleniyor] = useState(false)
  const [mesgul, setMesgul] = useState(false)

  const secili = basliklar.find((b) => b.id === seciliId)
  const onayli = !!secili?.approvedAt

  useEffect(() => {
    axiosInstance.get('/api/warehouses', { params: { pageSize: 200 } }).then((r) =>
      setDepolar((arr(r.data) as Record<string, unknown>[]).map((w) => ({ value: w.id as number, label: `${w.code} — ${w.name ?? ''}` }))))
  }, [])

  const basliklariYukle = (secilecek?: number) => {
    axiosInstance.get('/api/control-counts', { params: { pageSize: 100 } }).then((r) => {
      const list = arr(r.data) as Bas[]
      setBasliklar(list)
      setSeciliId((v) => secilecek ?? v ?? list[0]?.id)
    })
  }
  useEffect(() => basliklariYukle(), [])

  const farklariYukle = () => {
    if (!seciliId) { setSatirlar([]); return }
    setYukleniyor(true)
    axiosInstance.get(`/api/control-counts/${seciliId}/differences`)
      .then((r) => setSatirlar(arr(r.data) as Fark[]))
      .catch((e) => message.error(errMsg(e, 'Satırlar alınamadı')))
      .finally(() => setYukleniyor(false))
  }
  useEffect(farklariYukle, [seciliId])

  const fotografla = async () => {
    if (!depoId) { message.warning('Depo seçin'); return }
    setMesgul(true)
    try {
      const r = await axiosInstance.post('/api/control-counts/snapshot', { warehouseId: depoId })
      message.success(`Kontrol sayımı açıldı: ${r.data.code} (${r.data.lines?.length ?? 0} ürün)`)
      basliklariYukle(r.data.id)
    } catch (e) { message.error(errMsg(e, 'Açılamadı')) } finally { setMesgul(false) }
  }

  const say = async (lineId: number, v: number | null) => {
    if (v == null || !seciliId) return
    try {
      await axiosInstance.post(`/api/control-counts/${seciliId}/lines/${lineId}/count`, { countedQty: v })
      farklariYukle()
    } catch (e) { message.error(errMsg(e, 'Yazılamadı')) }
  }

  const onayla = () => modal.confirm({
    title: 'Kontrol sayımı onaylansın mı?',
    content: 'Onaydan sonra değiştirilemez. STOK DEĞİŞMEZ — bu bir doğrulama sayımıdır.',
    okText: 'Onayla', cancelText: 'Vazgeç',
    onOk: async () => {
      try {
        await axiosInstance.post(`/api/control-counts/${seciliId}/approve`)
        message.success('Onaylandı')
        basliklariYukle(seciliId)
        farklariYukle()
      } catch (e) { message.error(errMsg(e, 'Onaylanamadı')) }
    },
  })

  const sayilan = satirlar.filter((s) => s.status !== 'SAYILMADI').length
  const farkli = satirlar.filter((s) => s.status === 'EKSİK' || s.status === 'FAZLA').length

  return (
    <div className="og-page" style={{ maxWidth: 1180 }}>
      <PageHeader title="Kontrol Sayım" subtitle="Deponun anlık stoğu fotoğraflanır, sayılır, fark raporlanır — stok değişmez" />

      <Card className="og-section-card" size="small" title="Yeni Kontrol Sayımı">
        <Space wrap size="middle" align="end">
          <div>
            <div style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>Depo *</div>
            <Select style={{ minWidth: 260 }} showSearch optionFilterProp="label" placeholder="Depo"
              value={depoId} onChange={setDepoId} options={depolar} />
          </div>
          <Button type="primary" icon={<CameraOutlined />} loading={mesgul} onClick={fotografla}>Stoğu Fotoğrafla</Button>
        </Space>
      </Card>

      <Card className="og-section-card" size="small" title="Kontrol Sayımı"
        extra={<Space>
          <Button icon={<ReloadOutlined />} onClick={farklariYukle} loading={yukleniyor}>Yenile</Button>
          <Button type="primary" icon={<CheckOutlined />} disabled={!seciliId || onayli || !sayilan} onClick={onayla}>Onayla</Button>
        </Space>}>
        <Space wrap size="middle" style={{ marginBottom: 12 }}>
          <Select style={{ minWidth: 320 }} value={seciliId} onChange={setSeciliId} placeholder="Kontrol sayımı seçin"
            options={basliklar.map((b) => ({ value: b.id, label: `#${b.id} · ${b.code ?? ''}${b.approvedAt ? ' · onaylı' : ''}` }))} />
          {onayli && <Tag color="green">Onaylandı — değiştirilemez</Tag>}
          {!!satirlar.length && <Tag>{sayilan}/{satirlar.length} sayıldı</Tag>}
          {!!farkli && <Tag color="orange">{farkli} üründe fark</Tag>}
        </Space>

        {!satirlar.length && !yukleniyor ? (
          <Empty description="Satır yok — üstten bir depo seçip stoğu fotoğraflayın" />
        ) : (
          <Table<Fark> rowKey="lineId" size="small" loading={yukleniyor} dataSource={satirlar}
            pagination={{ pageSize: 25, size: 'small' }} scroll={{ x: 'max-content' }}
            columns={[
              { title: 'Ürün', render: (_, r) => <>{r.productCode}{r.productName ? <span style={{ color: '#888' }}> — {r.productName}</span> : null}</> },
              { title: 'Birim', dataIndex: 'unitCode', width: 80, render: (v) => v ?? '—' },
              { title: 'Sistem', dataIndex: 'systemQty', align: 'right' as const, width: 110 },
              {
                title: 'Sayılan', align: 'right' as const, width: 130,
                render: (_, r) => <InputNumber size="small" min={0} style={{ width: 110 }} disabled={onayli}
                  defaultValue={r.countedQty != null ? Number(r.countedQty) : undefined}
                  onBlur={(e) => { const v = (e.target as HTMLInputElement).value; say(r.lineId, v === '' ? null : Number(v)) }} />,
              },
              { title: 'Fark', dataIndex: 'diff', align: 'right' as const, width: 100, render: (v) => v ?? '—' },
              { title: 'Durum', width: 110, render: (_, r) => <Tag color={RENK[r.status]}>{r.status}</Tag> },
            ]} />
        )}
      </Card>

      <Alert type="info" showIcon style={{ marginTop: 4 }}
        message="Stok değişmez"
        description="Kontrol sayımı tutarsızlığı GÖRMEK içindir. Düzeltme gerekiyorsa İşlemler › Sayım Girişi'nden gerçek sayım açın (eşitleme açıksa stok düzelir)." />
    </div>
  )
}
