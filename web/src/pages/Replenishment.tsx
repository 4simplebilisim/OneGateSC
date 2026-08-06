import { useEffect, useState } from 'react'
import { App, Alert, Button, Card, Empty, InputNumber, Select, Space, Table, Tag } from 'antd'
import { ReloadOutlined, SaveOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { axiosInstance } from '../providers/dataProvider'
import { PageHeader } from '../components/PageHeader'

type Kaynak = { stockId: number; locationId: number; locationCode: string; availableQty: string; palletId: number | null; palletNo: string | null; batchNo: string | null }
type Ihtiyac = {
  parameterId: number; locationId: number; locationCode: string
  productId: number; productCode: string; productName: string | null
  currentQty: string; capacityQty: string | null; neededQty: string | null
  reason: 'EMPTY' | 'BELOW_CAPACITY'; palletBreakingAllowed: boolean; sources: Kaynak[]
}
type Opt = { value: number; label: string }
const arr = (d: unknown) => (Array.isArray(d) ? d : ((d as { data?: unknown[] })?.data ?? []))
const errMsg = (e: unknown, f: string) => (e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? f

// RAF BESLEME — Raf Besleme Parametresi'ne göre boşalan/azalan toplama gözleri
// ve rezervden kaynak önerisi. Seçilenlerden transfer belgesi doğar (TASLAK).
export const Replenishment = () => {
  const { message } = App.useApp()
  const navigate = useNavigate()
  const [satirlar, setSatirlar] = useState<Ihtiyac[]>([])
  const [yukleniyor, setYukleniyor] = useState(false)
  const [gruplar, setGruplar] = useState<Opt[]>([])
  const [ops, setOps] = useState<Opt[]>([])
  const [grupId, setGrupId] = useState<number>()
  const [opId, setOpId] = useState<number>()
  const [secim, setSecim] = useState<Record<string, { stockId?: number; quantity: number }>>({})
  const [olusturuluyor, setOlusturuluyor] = useState(false)

  const anahtar = (r: Ihtiyac) => `${r.locationId}:${r.productId}`

  useEffect(() => {
    axiosInstance.get('/api/location-groups', { params: { pageSize: 300 } }).then((r) =>
      setGruplar((arr(r.data) as Record<string, unknown>[]).map((g) => ({ value: g.id as number, label: `${g.code} — ${g.name ?? ''}` }))))
    axiosInstance.get('/api/operation-types', { params: { pageSize: 300 } }).then((r) =>
      setOps((arr(r.data) as Record<string, unknown>[]).filter((o) => o.direction === 'INTERNAL')
        .map((o) => ({ value: o.id as number, label: `${o.code} — ${o.name ?? ''}` }))))
  }, [])

  const yenile = () => {
    setYukleniyor(true)
    axiosInstance.get('/api/replenishment/suggest', { params: grupId ? { locationGroupId: grupId } : {} })
      .then((r) => {
        const gelen = r.data as { needs?: Ihtiyac[]; defaultOperationTypeId?: number | null }
        const list = (Array.isArray(gelen?.needs) ? gelen.needs : arr(r.data)) as Ihtiyac[]
        setSatirlar(list)
        // Besleme operasyonu İş Emri Genel Parametresi'nde tanımlıysa seçili gelsin
        if (gelen?.defaultOperationTypeId) setOpId((v) => v ?? gelen.defaultOperationTypeId!)
        // Her ihtiyaç için en büyük kaynağı ve gereken miktarı öner
        const s: Record<string, { stockId?: number; quantity: number }> = {}
        for (const x of list) {
          const k = x.sources[0]
          const gereken = x.neededQty ? Number(x.neededQty) : Number(k?.availableQty ?? 0)
          s[`${x.locationId}:${x.productId}`] = {
            stockId: k?.stockId,
            quantity: Math.max(1, Math.min(gereken || 1, Number(k?.availableQty ?? gereken) || 1)),
          }
        }
        setSecim(s)
      })
      .catch((e) => message.error(errMsg(e, 'Öneriler alınamadı')))
      .finally(() => setYukleniyor(false))
  }
  useEffect(yenile, [grupId])

  const olustur = async () => {
    if (!opId) { message.warning('Besleme (transfer) operasyonu seçin'); return }
    const lines = satirlar
      .map((r) => ({ r, s: secim[anahtar(r)] }))
      .filter((x) => x.s?.stockId && x.s.quantity > 0)
      .map((x) => ({ stockId: x.s!.stockId!, targetLocationId: x.r.locationId, quantity: x.s!.quantity }))
    if (!lines.length) { message.warning('Kaynak ve miktar seçili satır yok'); return }
    setOlusturuluyor(true)
    try {
      const r = await axiosInstance.post('/api/replenishment/create-document', { operationTypeId: opId, lines })
      message.success(`Besleme belgesi oluşturuldu: ${r.data.documentNo} (${lines.length} satır) — taslak`)
      navigate(`/documents/${r.data.id}`)
    } catch (e) { message.error(errMsg(e, 'Belge oluşturulamadı')) } finally { setOlusturuluyor(false) }
  }

  const secili = satirlar.filter((r) => secim[anahtar(r)]?.stockId).length

  return (
    <div className="og-page" style={{ maxWidth: 1240 }}>
      <PageHeader title="Raf Besleme" subtitle="Boşalan / kapasitenin altına düşen toplama gözleri — rezervden besleme önerisi" />

      <Card className="og-section-card" size="small" title="Kriter">
        <Space wrap size="middle" align="end">
          <div>
            <div style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>Toplama Alanı (lokasyon grubu)</div>
            <Select allowClear style={{ minWidth: 240 }} showSearch optionFilterProp="label" placeholder="(Tüm tanımlı alanlar)"
              value={grupId} onChange={setGrupId} options={gruplar} />
          </div>
          <div>
            <div style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>Besleme Operasyonu (transfer) *</div>
            <Select style={{ minWidth: 240 }} showSearch optionFilterProp="label" placeholder="Transfer operasyonu"
              value={opId} onChange={setOpId} options={ops} />
          </div>
          <Button icon={<ReloadOutlined />} onClick={yenile} loading={yukleniyor}>Yenile</Button>
          <Button type="primary" icon={<SaveOutlined />} loading={olusturuluyor} disabled={!secili} onClick={olustur}>
            {secili ? `${secili} Satır için Besleme Belgesi` : 'Besleme Belgesi'}
          </Button>
        </Space>
      </Card>

      <Card className="og-section-card" size="small" title={`Beslenmesi Gereken Gözler (${satirlar.length})`}>
        {!satirlar.length && !yukleniyor ? (
          <Empty description={
            <>
              <div>Beslenmesi gereken göz yok</div>
              <div style={{ fontSize: 12, color: 'var(--og-muted)', marginTop: 4 }}>
                Kural tanımlı değilse hiç öneri çıkmaz — Uyarlamalar › Raf Besleme Parametresi'nden
                toplama alanını (lokasyon grubu) ve tetiği (boşalınca / kapasite %) tanımlayın.
              </div>
            </>
          } />
        ) : (
          <Table<Ihtiyac> rowKey={anahtar} size="small" loading={yukleniyor} dataSource={satirlar}
            pagination={{ pageSize: 20, size: 'small' }} scroll={{ x: 'max-content' }}
            columns={[
              { title: 'Göz', dataIndex: 'locationCode', width: 110 },
              { title: 'Ürün', render: (_, r) => <>{r.productCode}{r.productName ? <span style={{ color: '#888' }}> — {r.productName}</span> : null}</> },
              { title: 'Neden', width: 130, render: (_, r) => r.reason === 'EMPTY'
                ? <Tag color="red">Boşaldı</Tag>
                : <Tag color="orange">Kapasite altı</Tag> },
              { title: 'Eldeki', dataIndex: 'currentQty', align: 'right' as const, width: 80 },
              { title: 'Kapasite', dataIndex: 'capacityQty', align: 'right' as const, width: 90, render: (v) => v ?? '—' },
              {
                title: 'Kaynak (rezerv)', width: 260,
                render: (_, r) => r.sources.length ? (
                  <Select style={{ width: 250 }} size="small" value={secim[anahtar(r)]?.stockId}
                    onChange={(v) => setSecim((p) => ({ ...p, [anahtar(r)]: { ...p[anahtar(r)], stockId: v, quantity: p[anahtar(r)]?.quantity ?? 1 } }))}
                    options={r.sources.map((k) => ({
                      value: k.stockId,
                      label: `${k.locationCode} · ${k.availableQty}${k.palletNo ? ` · ${k.palletNo}` : ''}${k.batchNo ? ` · ${k.batchNo}` : ''}`,
                    }))} />
                ) : <Tag>rezervde stok yok</Tag>,
              },
              {
                title: 'Miktar', align: 'right' as const, width: 100,
                render: (_, r) => <InputNumber size="small" min={0} style={{ width: 90 }}
                  value={secim[anahtar(r)]?.quantity}
                  onChange={(v) => setSecim((p) => ({ ...p, [anahtar(r)]: { ...p[anahtar(r)], quantity: Number(v) || 0 } }))} />,
              },
              { title: 'Palet Kırma', width: 100, render: (_, r) => r.palletBreakingAllowed ? <Tag color="blue">açık</Tag> : <Tag>kapalı</Tag> },
            ]} />
        )}
      </Card>

      <Alert type="info" showIcon style={{ marginTop: 4 }}
        title="Belge TASLAK oluşur"
        description="Besleme belgesi normal akışla işlenir (okut → onayla → tamamla). Stok bu ekranda değişmez." />
    </div>
  )
}
