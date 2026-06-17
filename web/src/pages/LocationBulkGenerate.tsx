import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { App, Alert, Button, Card, Input, InputNumber, Select, Space, Tag } from 'antd'
import { ArrowLeftOutlined, ThunderboltOutlined } from '@ant-design/icons'
import { axiosInstance } from '../providers/dataProvider'
import { PageHeader } from '../components/PageHeader'

type Level = { start: number; end: number; increment: number }

export const LocationBulkGenerate = () => {
  const navigate = useNavigate()
  const { message } = App.useApp()
  const [warehouses, setWarehouses] = useState<{ value: number; label: string }[]>([])
  const [warehouseId, setWarehouseId] = useState<number>()
  const [prefix, setPrefix] = useState('')
  const [separator, setSeparator] = useState('-')
  const [levelCount, setLevelCount] = useState(2)
  const [levels, setLevels] = useState<Level[]>([
    { start: 1, end: 3, increment: 1 },
    { start: 1, end: 10, increment: 1 },
    { start: 1, end: 4, increment: 1 },
    { start: 1, end: 1, increment: 1 },
  ])
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    axiosInstance.get('/api/warehouses').then((r) => {
      const rows = Array.isArray(r.data) ? r.data : (r.data.data ?? [])
      setWarehouses(rows.map((x: Record<string, unknown>) => ({ value: x.id as number, label: `${x.code} — ${x.name}` })))
    })
  }, [])

  const active = levels.slice(0, levelCount)
  const { count, sample } = useMemo(() => {
    const lists = active.map((l) => {
      const vs: number[] = []
      const inc = Math.max(1, l.increment || 1)
      for (let v = l.start; v <= l.end; v += inc) vs.push(v)
      return { vs, w: String(l.end).length }
    })
    let c = 1
    for (const l of lists) c *= l.vs.length
    let combos: number[][] = [[]]
    for (const { vs } of lists) {
      const n: number[][] = []
      for (const cc of combos) for (const v of vs) n.push([...cc, v])
      combos = n
      if (combos.length > 50) combos = combos.slice(0, 50)
    }
    const smp = combos.slice(0, 6).map((combo) => prefix + combo.map((v, i) => String(v).padStart(lists[i]!.w, '0')).join(separator))
    return { count: c, sample: smp }
  }, [active, prefix, separator])

  const setLevel = (i: number, k: keyof Level, v: number) => setLevels((ls) => ls.map((l, idx) => (idx === i ? { ...l, [k]: v } : l)))

  const generate = async () => {
    if (!warehouseId) return message.warning('Önce depo seçin')
    if (count === 0) return message.warning('Üretilecek kombinasyon yok')
    if (count > 5000) return message.warning(`Çok fazla (${count}) — en fazla 5000`)
    setBusy(true)
    try {
      const r = await axiosInstance.post('/api/locations/bulk-generate', { warehouseId, prefix: prefix || undefined, separator, levels: active })
      message.success(`${r.data.created} lokasyon üretildi (${r.data.skipped} mevcut atlandı)`)
      navigate('/locations')
    } catch (e) {
      message.error((e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'İşlem başarısız')
    } finally {
      setBusy(false)
    }
  }

  const cell: React.CSSProperties = { padding: '7px 10px', textAlign: 'center' }
  const rows: { key: keyof Level; label: string }[] = [
    { key: 'start', label: 'Başlangıç' },
    { key: 'end', label: 'Bitiş' },
    { key: 'increment', label: 'Artış' },
  ]

  return (
    <div className="og-page" style={{ maxWidth: 860 }}>
      <PageHeader
        title="Seviye-bazlı toplu lokasyon üret"
        subtitle="Depo + önek + seviye aralıklarından kartezyen lokasyon kodları üretir"
        extra={<Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/locations')}>Liste</Button>}
      />

      <Card className="og-section-card" size="small" title="Tanım">
        <Space wrap align="end" size={[16, 12]} style={{ marginBottom: 18 }}>
          <div><div style={{ fontSize: 12, color: 'var(--og-muted)', marginBottom: 4 }}>Depo *</div><Select style={{ minWidth: 220 }} options={warehouses} value={warehouseId} onChange={setWarehouseId} showSearch optionFilterProp="label" placeholder="Depo seç" /></div>
          <div><div style={{ fontSize: 12, color: 'var(--og-muted)', marginBottom: 4 }}>Göz Kodu (önek)</div><Input value={prefix} onChange={(e) => setPrefix(e.target.value)} placeholder="ör. A-" style={{ width: 120 }} /></div>
          <div><div style={{ fontSize: 12, color: 'var(--og-muted)', marginBottom: 4 }}>Ayraç</div><Input value={separator} onChange={(e) => setSeparator(e.target.value)} style={{ width: 60 }} /></div>
          <div><div style={{ fontSize: 12, color: 'var(--og-muted)', marginBottom: 4 }}>Seviye sayısı</div><Select style={{ width: 80 }} value={levelCount} onChange={setLevelCount} options={[1, 2, 3, 4].map((n) => ({ value: n, label: String(n) }))} /></div>
        </Space>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ borderCollapse: 'separate', borderSpacing: 0, marginBottom: 18, border: '1px solid var(--og-border-soft)', borderRadius: 9, overflow: 'hidden' }}>
            <thead>
              <tr style={{ background: 'var(--og-table-head)' }}>
                <th style={cell}></th>
                {active.map((_, i) => <th key={i} style={{ ...cell, color: 'var(--og-blue)', fontWeight: 700 }}>Seviye {i + 1}</th>)}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.key}>
                  <td style={{ ...cell, textAlign: 'right', color: 'var(--og-muted)', fontWeight: 600, background: 'var(--og-sunken)' }}>{row.label}</td>
                  {active.map((l, i) => (
                    <td key={i} style={cell}>
                      <InputNumber style={{ width: 90 }} min={row.key === 'increment' ? 1 : 0} value={l[row.key]} onChange={(v) => setLevel(i, row.key, Number(v) || 0)} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <Alert
          type={count > 5000 || count === 0 ? 'warning' : 'info'}
          showIcon
          title={<span><b>{count}</b> lokasyon üretilecek{count > 5000 ? ' — limit 5000 aşıldı' : ''}</span>}
          description={sample.length ? <span>Örnek: {sample.map((s) => <Tag key={s} color="blue">{s}</Tag>)}{count > sample.length ? ' …' : ''}</span> : null}
        />
      </Card>

      <div className="og-formbar">
        <Button type="primary" icon={<ThunderboltOutlined />} loading={busy} disabled={!warehouseId || count === 0 || count > 5000} onClick={generate}>Üret</Button>
        <Button onClick={() => navigate('/locations')}>İptal</Button>
      </div>
    </div>
  )
}
