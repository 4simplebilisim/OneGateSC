import { useEffect, useRef, useState } from 'react'
import { App, Input, Select, Button, InputNumber, Tag } from 'antd'
import { BarcodeOutlined, DeleteOutlined, CheckCircleOutlined } from '@ant-design/icons'
import { axiosInstance } from '../providers/dataProvider'
import { MobileShell } from './MobileShell'

type Opt = { value: number; label: string }
type Line = { key: number; productId: number; unitId: number; code: string; qty: number; batchNo: string; serialNo: string }

export const MobileReceipt = () => {
  const { message } = App.useApp()
  const [ops, setOps] = useState<Opt[]>([])
  const [whs, setWhs] = useState<Opt[]>([])
  const [opId, setOpId] = useState<number>()
  const [whId, setWhId] = useState<number>()
  const [code, setCode] = useState('')
  const [lines, setLines] = useState<Line[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState<{ no: string; status: string } | null>(null)
  const scanRef = useRef<{ focus: () => void } | null>(null)

  useEffect(() => {
    axiosInstance.get('/api/operation-types', { params: { pageSize: 300 } }).then((r) => {
      const list = Array.isArray(r.data) ? r.data : (r.data.data ?? [])
      const inb = list.filter((x: { direction: string }) => x.direction === 'INBOUND')
      setOps(inb.map((x: { id: number; code: string; name: string }) => ({ value: x.id, label: `${x.code} — ${x.name}` })))
      const def = inb.find((x: { code: string }) => x.code === 'GR') ?? inb[0]
      if (def) setOpId(def.id)
    })
    axiosInstance.get('/api/warehouses').then((r) => {
      const list = Array.isArray(r.data) ? r.data : (r.data.data ?? [])
      setWhs(list.map((x: { id: number; code: string; name: string }) => ({ value: x.id, label: `${x.code} — ${x.name}` })))
      if (list[0]) setWhId(list[0].id)
    })
  }, [])

  const scan = async (value: string) => {
    const c = value.trim()
    if (!c) return
    try {
      const r = await axiosInstance.get('/api/lookup/barcode', { params: { code: c } })
      if (!r.data.found) { message.warning('Barkod bulunamadı'); return }
      setLines((ls) => [...ls, { key: Date.now(), productId: r.data.product.id, unitId: r.data.unit.id, code: r.data.product.code, qty: 1, batchNo: '', serialNo: '' }])
    } catch { message.error('Sorgu başarısız') }
    finally { setCode(''); scanRef.current?.focus() }
  }
  const patch = (key: number, p: Partial<Line>) => setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...p } : l)))
  const remove = (key: number) => setLines((ls) => ls.filter((l) => l.key !== key))

  const submit = async () => {
    if (!opId || !whId || !lines.length) { message.warning('Operasyon, depo ve en az bir satır gerekli'); return }
    setSubmitting(true)
    try {
      const payload = { operationTypeId: opId, warehouseId: whId, lines: lines.map((l) => ({ productId: l.productId, unitId: l.unitId, quantity: l.qty, batchNo: l.batchNo || undefined, serialNo: l.serialNo || undefined })) }
      const doc = (await axiosInstance.post('/api/documents', payload)).data
      await axiosInstance.post(`/api/documents/${doc.id}/confirm`)
      const fin = (await axiosInstance.post(`/api/documents/${doc.id}/complete`)).data
      setDone({ no: doc.documentNo, status: fin.documentStatus?.name ?? 'Tamamlandı' })
      setLines([])
    } catch (e) {
      message.error((e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Belge tamamlanamadı')
    } finally { setSubmitting(false) }
  }

  if (done) {
    return (
      <MobileShell title="Mal Kabul" back>
        <div style={{ textAlign: 'center', padding: '40px 12px' }}>
          <CheckCircleOutlined style={{ fontSize: 64, color: '#16a34a' }} />
          <div style={{ fontSize: 20, fontWeight: 800, marginTop: 16 }}>{done.no}</div>
          <Tag color="green" style={{ marginTop: 8, fontSize: 14, padding: '4px 12px' }}>{done.status}</Tag>
          <div style={{ color: '#9db0ce', marginTop: 12 }}>Stok girişi tamamlandı.</div>
          <Button type="primary" size="large" block style={{ marginTop: 28 }} onClick={() => setDone(null)}>Yeni Mal Kabul</Button>
        </div>
      </MobileShell>
    )
  }

  return (
    <MobileShell title="Mal Kabul" back>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 14 }}>
        <Select size="large" placeholder="Operasyon" value={opId} onChange={setOpId} options={ops} showSearch optionFilterProp="label" />
        <Select size="large" placeholder="Depo" value={whId} onChange={setWhId} options={whs} showSearch optionFilterProp="label" />
        <Input ref={scanRef as never} size="large" autoFocus prefix={<BarcodeOutlined />} placeholder="Barkod okut / yaz…" value={code} onChange={(e) => setCode(e.target.value)} onPressEnter={() => scan(code)} />
      </div>

      {lines.map((l) => (
        <div key={l.key} style={{ background: '#172238', borderRadius: 10, padding: '10px 12px', marginBottom: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 700 }}>{l.code}</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <InputNumber size="small" min={1} value={l.qty} onChange={(v) => patch(l.key, { qty: Number(v) || 1 })} style={{ width: 64 }} />
              <Button size="small" type="text" danger icon={<DeleteOutlined />} onClick={() => remove(l.key)} />
            </span>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <Input size="small" placeholder="Parti" value={l.batchNo} onChange={(e) => patch(l.key, { batchNo: e.target.value })} />
            <Input size="small" placeholder="Seri" value={l.serialNo} onChange={(e) => patch(l.key, { serialNo: e.target.value })} />
          </div>
        </div>
      ))}

      {lines.length > 0 && (
        <Button type="primary" size="large" block loading={submitting} onClick={submit} style={{ marginTop: 12, height: 50, fontSize: 16, fontWeight: 700 }}>
          Belgeyi Oluştur ve Onayla ({lines.length})
        </Button>
      )}
    </MobileShell>
  )
}
