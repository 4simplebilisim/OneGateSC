import { useCallback, useEffect, useRef, useState } from 'react'
import { App, Input, Button, InputNumber, Tag, Progress } from 'antd'
import { BarcodeOutlined, CheckCircleOutlined, ArrowRightOutlined, ReloadOutlined } from '@ant-design/icons'
import { axiosInstance } from '../providers/dataProvider'
import { MobileShell } from './MobileShell'
import { IleriModal, resolveApprovalType, type ApprovalType, type ApprovalOutcome } from './approvalFlow'

type Op = { id: number; code: string; direction: string; controlMode?: string; facilityId?: number | null }
type DocRow = { id: number; documentNo: string; operationTypeId?: number; operationType?: { code?: string; direction?: string }; documentStatus?: { name?: string; color?: string }; _count?: { lines?: number } }
type DocLine = { id: number; lineNo: number; productId: number; quantity: string; collectedQty: string; unitId: number; product?: { code?: string; name?: string }; unit?: { code?: string } }
type Doc = { id: number; documentNo: string; operationTypeId: number; lines: DocLine[] }

const arr = (d: unknown) => (Array.isArray(d) ? d : ((d as { data?: unknown[] })?.data ?? []))
const apiErr = (e: unknown) => (e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'İşlem başarısız'
const DIR_LABEL: Record<string, string> = { INBOUND: 'Giriş', OUTBOUND: 'Çıkış', INTERNAL: 'Transfer' }
const cardStyle = { background: '#172238', borderRadius: 10, padding: '10px 12px', marginBottom: 8 } as const

// Toplama — KONTROLLÜ/REFERANSLI belgelerde plana karşı okutma (içerik belli; satır satır toplanır).
// Okutma bitince İLERİ → Belge Onay Tipi akışı (Tek Aşamalı'da Onayla/Böl; İki Aşamalı'da onaya gönder).
export const MobilePick = () => {
  const { message } = App.useApp()
  const [ops, setOps] = useState<Op[]>([])
  const [docs, setDocs] = useState<DocRow[]>([])
  const [doc, setDoc] = useState<Doc | null>(null)
  const [code, setCode] = useState('')
  const [qty, setQty] = useState<number>(1)
  const [busy, setBusy] = useState(false)
  const [loading, setLoading] = useState(true)
  const [ileriOpen, setIleriOpen] = useState(false)
  const [approvalType, setApprovalType] = useState<ApprovalType>(null)
  const [done, setDone] = useState<{ no: string; outcome: ApprovalOutcome } | null>(null)
  const scanRef = useRef<{ focus: () => void } | null>(null)

  const opById = useCallback((id?: number) => ops.find((o) => o.id === id), [ops])

  const loadDocs = useCallback(() => {
    setLoading(true)
    Promise.all([
      axiosInstance.get('/api/operation-types', { params: { pageSize: 300 } }),
      // assignedFor=me: op 'İş Ataması Uygula' açıksa yalnız bana/grubuma atanmış belgeler (sunucu süzer)
      axiosInstance.get('/api/documents', { params: { openOnly: 'true', assignedFor: 'me', pageSize: 200 } }),
    ]).then(([or, dr]) => {
      const allOps = arr(or.data) as Op[]
      setOps(allOps)
      // yalnız KONTROLLÜ/REFERANSLI operasyonların açık belgeleri (kontrolsüz = Mal Kabul ekranının işi)
      const ctrl = new Set(allOps.filter((o) => o.controlMode && o.controlMode !== 'UNCONTROLLED').map((o) => o.id))
      setDocs((arr(dr.data) as DocRow[]).filter((d) => d.operationTypeId != null && ctrl.has(d.operationTypeId)))
    }).finally(() => setLoading(false))
  }, [])
  useEffect(loadDocs, [loadDocs])

  const openDoc = async (id: number) => {
    setDoc((await axiosInstance.get(`/api/documents/${id}`)).data as Doc)
    setTimeout(() => scanRef.current?.focus(), 100)
  }
  const refreshDoc = async () => { if (doc) setDoc((await axiosInstance.get(`/api/documents/${doc.id}`)).data as Doc) }

  // Satıra okutma — kaynak/hedef lokasyon+statü PLAN SATIRINDAN miras alınır; tolerans/statü kapıları API'de
  const scanLine = async (line: DocLine, q: number) => {
    if (!doc) return
    setBusy(true)
    try {
      const { data } = await axiosInstance.post('/api/document-line-scopes', { documentLineId: line.id, unitId: line.unitId, quantity: q })
      await refreshDoc()
      message.success(`${line.product?.code ?? '#' + line.lineNo} × ${q} toplandı`)
      if (data?._warning) message.warning(data._warning, 6) // Stok rotasyonu (FIFO/FEFO) yanlış-lot uyarısı — bloklamaz
    } catch (e) { message.error(apiErr(e)) } finally { setBusy(false); scanRef.current?.focus() }
  }

  // Barkodla hızlı yol: ürünü bul → plandaki satırına okut
  const scan = async (value: string) => {
    const c = value.trim()
    if (!c || !doc) return
    try {
      const r = await axiosInstance.get('/api/lookup/barcode', { params: { code: c } })
      if (!r.data.found) { message.warning('Barkod bulunamadı'); return }
      const line = doc.lines.find((l) => l.productId === r.data.product.id)
      if (!line) { message.warning(`${r.data.product.code} bu belgenin planında yok`); return }
      await scanLine(line, qty || 1)
      setQty(1)
    } catch (e) { message.error(apiErr(e)) } finally { setCode('') }
  }

  const ileri = async () => {
    if (!doc) return
    const op = opById(doc.operationTypeId)
    setApprovalType(await resolveApprovalType(doc.operationTypeId, op?.facilityId))
    setIleriOpen(true)
  }
  const onOutcome = (o: ApprovalOutcome) => {
    setIleriOpen(false)
    if (doc) setDone({ no: doc.documentNo, outcome: o })
    setDoc(null); loadDocs()
  }

  if (done) {
    const meta: Record<ApprovalOutcome, { c: string; t: string }> = {
      completed: { c: '#16a34a', t: 'Onaylandı — stok işlendi.' },
      confirmed: { c: '#4e86ff', t: 'Onaya gönderildi — son onay Gözlem ekranından.' },
      split: { c: '#f59e0b', t: 'Toplanan kısım yeni belgeye ayrıldı — kalan Bekliyor.' },
      draft: { c: '#9db0ce', t: 'Belge taslak kaldı.' },
    }
    return (
      <MobileShell title="Toplama" back>
        <div style={{ textAlign: 'center', padding: '40px 12px' }}>
          <CheckCircleOutlined style={{ fontSize: 64, color: meta[done.outcome].c }} />
          <div style={{ fontSize: 20, fontWeight: 800, marginTop: 16 }}>{done.no}</div>
          <Tag color={meta[done.outcome].c} style={{ marginTop: 8, fontSize: 14, padding: '4px 12px' }}>{meta[done.outcome].t}</Tag>
          <Button type="primary" size="large" block style={{ marginTop: 28 }} onClick={() => setDone(null)}>Belge Listesine Dön</Button>
        </div>
      </MobileShell>
    )
  }

  // ── Belge listesi ──
  if (!doc) {
    return (
      <MobileShell title="Toplama" back>
        <Button icon={<ReloadOutlined />} block onClick={loadDocs} loading={loading} style={{ marginBottom: 12 }}>Yenile</Button>
        {docs.map((d) => (
          <button key={d.id} onClick={() => openDoc(d.id)} style={{ ...cardStyle, width: '100%', border: 'none', color: '#e6edf7', cursor: 'pointer', textAlign: 'left' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 800 }}>{d.documentNo}</span>
              <Tag color={d.documentStatus?.color || 'default'}>{d.documentStatus?.name ?? ''}</Tag>
            </div>
            <div style={{ color: '#9db0ce', fontSize: 13, marginTop: 4 }}>
              {d.operationType?.code} · {DIR_LABEL[d.operationType?.direction ?? ''] ?? ''} · {d._count?.lines ?? 0} satır
            </div>
          </button>
        ))}
        {!loading && docs.length === 0 && <div style={{ color: '#9db0ce', textAlign: 'center', padding: 24 }}>Toplanacak açık kontrollü belge yok.</div>}
      </MobileShell>
    )
  }

  // ── Belge toplama ──
  const totalPlan = doc.lines.reduce((s, l) => s + Number(l.quantity), 0)
  const totalColl = doc.lines.reduce((s, l) => s + Number(l.collectedQty), 0)
  return (
    <MobileShell title="Toplama" back>
      <div style={{ ...cardStyle, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontWeight: 800 }}>{doc.documentNo}</span>
        <Button size="small" type="text" style={{ color: '#9db0ce' }} onClick={() => { setDoc(null); loadDocs() }}>← Liste</Button>
      </div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <Input ref={scanRef as never} size="large" autoFocus prefix={<BarcodeOutlined />} placeholder="Barkod okut / yaz…"
          value={code} onChange={(e) => setCode(e.target.value)} onPressEnter={() => scan(code)} disabled={busy} />
        <InputNumber size="large" min={0.001} value={qty} onChange={(v) => setQty(Number(v) || 1)} style={{ width: 86 }} />
      </div>

      {doc.lines.map((l) => {
        const plan = Number(l.quantity), coll = Number(l.collectedQty)
        const pct = plan > 0 ? Math.min(100, Math.round((coll / plan) * 100)) : 0
        const remaining = Math.max(0, plan - coll)
        return (
          <div key={l.id} style={cardStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 700 }}>{l.product?.code ?? `#${l.lineNo}`}</span>
              <span style={{ color: coll >= plan ? '#16a34a' : '#9db0ce', fontWeight: 700 }}>{coll} / {plan} {l.unit?.code ?? ''}</span>
            </div>
            <Progress percent={pct} size="small" showInfo={false} strokeColor={coll >= plan ? '#16a34a' : '#4e86ff'} style={{ margin: '6px 0' }} />
            {remaining > 0 && (
              <Button size="small" block loading={busy} onClick={() => scanLine(l, remaining)}>Kalanı Topla (+{remaining})</Button>
            )}
          </div>
        )
      })}

      <Button type="primary" size="large" block icon={<ArrowRightOutlined />} onClick={ileri}
        style={{ marginTop: 12, height: 50, fontSize: 16, fontWeight: 700 }}>
        İleri ({totalColl} / {totalPlan})
      </Button>

      <IleriModal open={ileriOpen} docId={doc.id} docNo={doc.documentNo} approvalType={approvalType}
        onClose={() => setIleriOpen(false)} onOutcome={onOutcome}
        notify={{ error: (m) => message.error(m), success: (m) => message.success(m) }} />
    </MobileShell>
  )
}
