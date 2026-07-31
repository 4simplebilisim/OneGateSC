import { useRef, useState } from 'react'
import { App, Input, Spin, Tag, Empty } from 'antd'
import { BarcodeOutlined } from '@ant-design/icons'
import { axiosInstance } from '../providers/dataProvider'
import { MobileShell } from './MobileShell'
import { STATUS_TR } from '../statusMeta'

type Row = { location?: string; status?: string; batchNo?: string | null; serialNo?: string | null; qty: string; reserved: string }
type Result = { found: boolean; product?: { code: string; name: string }; unit?: { code: string }; stock?: Row[] }

const SC: Record<string, string> = { AVAILABLE: 'green', QUARANTINE: 'gold', BLOCKED: 'red', DAMAGED: 'volcano' }

export const MobileStockQuery = () => {
  const { message } = App.useApp()
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [res, setRes] = useState<Result | null>(null)
  const inputRef = useRef<{ focus: () => void } | null>(null)

  const scan = async (value: string) => {
    const c = value.trim()
    if (!c) return
    setLoading(true)
    try {
      const r = await axiosInstance.get('/api/lookup/barcode', { params: { code: c } })
      setRes(r.data)
      if (!r.data.found) message.warning('Barkod bulunamadı')
    } catch { message.error('Sorgu başarısız') }
    finally { setLoading(false); setCode(''); inputRef.current?.focus() }
  }

  return (
    <MobileShell title="Stok Sorgu" back>
      <Input
        ref={inputRef as never}
        size="large"
        autoFocus
        prefix={<BarcodeOutlined />}
        placeholder="Barkod okut / yaz…"
        value={code}
        onChange={(e) => setCode(e.target.value)}
        onPressEnter={() => scan(code)}
        style={{ marginBottom: 16 }}
      />
      {loading && <div style={{ textAlign: 'center', padding: 30 }}><Spin /></div>}
      {res?.found && (
        <div>
          <div style={{ background: '#141e33', border: '1px solid #25304a', borderRadius: 12, padding: '12px 14px', marginBottom: 12 }}>
            <div style={{ fontSize: 17, fontWeight: 700 }}>{res.product?.code}</div>
            <div style={{ color: '#9db0ce' }}>{res.product?.name} · {res.unit?.code}</div>
          </div>
          <div style={{ fontSize: 13, color: '#9db0ce', marginBottom: 6 }}>Stok ({res.stock?.length ?? 0})</div>
          {res.stock?.length ? res.stock.map((s, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#172238', borderRadius: 10, padding: '10px 12px', marginBottom: 8 }}>
              <div>
                <div style={{ fontWeight: 600 }}>{s.location ?? '—'} <Tag color={SC[s.status ?? ''] ?? 'default'} style={{ marginLeft: 6 }}>{STATUS_TR[s.status ?? ''] ?? s.status}</Tag></div>
                <div style={{ fontSize: 12, color: '#8ea0bd' }}>{s.batchNo ? `Parti: ${s.batchNo}` : ''}{s.serialNo ? ` · Seri: ${s.serialNo}` : ''}</div>
              </div>
              <div style={{ fontSize: 18, fontWeight: 800, color: '#44d4e3' }}>{s.qty}</div>
            </div>
          )) : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={<span style={{ color: '#8ea0bd' }}>Stok yok</span>} />}
        </div>
      )}
      {res && !res.found && <Empty description={<span style={{ color: '#8ea0bd' }}>Bulunamadı</span>} />}
    </MobileShell>
  )
}
