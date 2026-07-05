import { useEffect, useRef, useState } from 'react'
import { App, Input, Select, Button, InputNumber, Tag } from 'antd'
import { BarcodeOutlined, CheckCircleOutlined, ArrowRightOutlined, SendOutlined, FileAddOutlined } from '@ant-design/icons'
import { axiosInstance } from '../providers/dataProvider'
import { MobileShell } from './MobileShell'
import { IleriModal, resolveApprovalType, type ApprovalType, type ApprovalOutcome } from './approvalFlow'

type Opt = { value: number; label: string }
type Op = { id: number; code: string; name?: string; direction: string; controlMode?: string; facilityId?: number | null; isActive?: boolean }
type DocLine = { id: number; lineNo: number; quantity: string; collectedQty: string; product?: { code?: string; name?: string }; unit?: { code?: string } }
type Doc = { id: number; documentNo: string; lines: DocLine[] }

const arr = (d: unknown) => (Array.isArray(d) ? d : ((d as { data?: unknown[] })?.data ?? []))
const apiErr = (e: unknown) => (e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'İşlem başarısız'
const cardStyle = { background: '#172238', borderRadius: 10, padding: '10px 12px', marginBottom: 8 } as const

// Mal Kabul (KONTROLSÜZ) — legacy akış: belge BOŞ açılır, içerik el terminali okutmalarıyla dolar/oluşur.
// Okutma bitince İLERİ → operasyonun Belge Onay Tipi'ne göre onay akışı (Toplama Ekranından / Tek Aşamalı / İki Aşamalı).
export const MobileReceipt = () => {
  const { message } = App.useApp()
  const [ops, setOps] = useState<Op[]>([])
  const [opId, setOpId] = useState<number>()
  const [locs, setLocs] = useState<Opt[]>([])
  const [locId, setLocId] = useState<number>()
  const [statusId, setStatusId] = useState<number>() // op-statü geçişinden otomatik; çözülemezse elle seçilir
  const [statusOpts, setStatusOpts] = useState<Opt[]>([])
  const [statusAuto, setStatusAuto] = useState(true)
  const [doc, setDoc] = useState<Doc | null>(null) // başlatılan belge (satırlar server'dan)
  const [code, setCode] = useState('')
  const [qty, setQty] = useState<number>(1)
  const [batchNo, setBatchNo] = useState('')
  const [serialNo, setSerialNo] = useState('')
  const [busy, setBusy] = useState(false)
  const [ileriOpen, setIleriOpen] = useState(false)
  const [approvalType, setApprovalType] = useState<ApprovalType>(null)
  const [done, setDone] = useState<{ no: string; outcome: ApprovalOutcome } | null>(null)
  const scanRef = useRef<{ focus: () => void } | null>(null)

  const op = ops.find((o) => o.id === opId)

  useEffect(() => {
    axiosInstance.get('/api/operation-types', { params: { pageSize: 300 } }).then((r) => {
      // Bu ekran = kontrolsüz mal kabul (okutma belgeyi OLUŞTURUR). Kontrollü/planlı belgeler "Toplama" ekranından.
      const inb = (arr(r.data) as Op[]).filter((x) => x.direction === 'INBOUND' && x.controlMode === 'UNCONTROLLED' && x.isActive !== false)
      setOps(inb)
      if (inb[0]) setOpId(inb[0].id)
    })
  }, [])

  // Operasyon değişince: lokasyonlar (op tesisine göre) + hedef statü (op-statü geçişinden)
  useEffect(() => {
    setLocId(undefined); setStatusId(undefined); setStatusAuto(true)
    if (!op) return
    axiosInstance.get('/api/locations', { params: { ...(op.facilityId ? { facilityId: op.facilityId } : {}), pageSize: 500 } })
      .then((r) => setLocs((arr(r.data) as { id: number; code: string }[]).map((x) => ({ value: x.id, label: x.code }))))
    axiosInstance.get('/api/operation-type-statuses', { params: { pageSize: 300 } }).then(async (r) => {
      const t = (arr(r.data) as { operationTypeId: number; targetStatusId?: number | null }[]).find((x) => x.operationTypeId === op.id && x.targetStatusId != null)
      if (t?.targetStatusId) { setStatusId(t.targetStatusId); setStatusAuto(true); return }
      // geçiş tanımsız → statü elle seçilir (op tesisinin statüleri)
      const sr = await axiosInstance.get('/api/statuses', { params: { pageSize: 200 } })
      const sts = (arr(sr.data) as { id: number; code: string; name?: string; facilityId?: number | null }[])
        .filter((s) => op.facilityId == null || s.facilityId === op.facilityId)
      setStatusOpts(sts.map((s) => ({ value: s.id, label: `${s.code}${s.name ? ' — ' + s.name : ''}` })))
      setStatusAuto(false)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opId])

  const refreshDoc = async (id: number) => setDoc((await axiosInstance.get(`/api/documents/${id}`)).data as Doc)

  // Belgeyi BOŞ başlat (kontrolsüz) — sayaç yoksa client no üretir
  const startDoc = async () => {
    if (!opId) { message.warning('Operasyon seçin'); return }
    if (!locId) { message.warning('Hedef lokasyon seçin'); return }
    if (!statusId) { message.warning('Hedef statü seçin'); return }
    setBusy(true)
    try {
      let d
      try {
        d = (await axiosInstance.post('/api/documents', { operationTypeId: opId })).data
      } catch (e) {
        if (/sayaç/i.test(apiErr(e))) d = (await axiosInstance.post('/api/documents', { operationTypeId: opId, documentNo: 'M' + Date.now() })).data
        else throw e
      }
      setDoc(d as Doc)
      message.success(`Belge açıldı: ${(d as Doc).documentNo} — okutmaya başlayın`)
      setTimeout(() => scanRef.current?.focus(), 100)
    } catch (e) { message.error(apiErr(e)) } finally { setBusy(false) }
  }

  // SATIR-YARATAN okutma: documentId + productId → satır bul-veya-yarat; satır miktarı = Σ okutma
  const scan = async (value: string) => {
    const c = value.trim()
    if (!c || !doc) return
    setBusy(true)
    try {
      const r = await axiosInstance.get('/api/lookup/barcode', { params: { code: c } })
      if (!r.data.found) { message.warning('Barkod bulunamadı'); return }
      await axiosInstance.post('/api/document-line-scopes', {
        documentId: doc.id, productId: r.data.product.id, unitId: r.data.unit.id, quantity: qty || 1,
        targetLocationId: locId, targetStatusId: statusId,
        batchNo: batchNo || undefined, serialNo: serialNo || undefined,
      })
      await refreshDoc(doc.id)
      message.success(`${r.data.product.code} × ${qty || 1} okundu`)
      setQty(1)
    } catch (e) { message.error(apiErr(e)) }
    finally { setCode(''); setBusy(false); scanRef.current?.focus() }
  }

  // İLERİ: operasyonun Belge Onay Tipi'ne göre akış
  const ileri = async () => {
    if (!doc || !op) return
    if (!doc.lines.length) { message.warning('Okutma yapılmadı — kontrolsüz belge okutmayla oluşur'); return }
    setApprovalType(await resolveApprovalType(op.id, op.facilityId))
    setIleriOpen(true)
  }
  const onOutcome = (o: ApprovalOutcome) => {
    setIleriOpen(false)
    if (doc) setDone({ no: doc.documentNo, outcome: o })
    setDoc(null)
  }

  if (done) {
    const meta: Record<ApprovalOutcome, { c: string; t: string }> = {
      completed: { c: '#16a34a', t: 'Onaylandı — stok işlendi.' },
      confirmed: { c: '#4e86ff', t: 'Onaya gönderildi — son onay Gözlem ekranından.' },
      split: { c: '#f59e0b', t: 'Toplanan kısım yeni belgeye ayrıldı.' },
      draft: { c: '#9db0ce', t: 'Belge taslak kaldı — onay Gözlem/masaüstünden.' },
    }
    return (
      <MobileShell title="Mal Kabul" back>
        <div style={{ textAlign: 'center', padding: '40px 12px' }}>
          <CheckCircleOutlined style={{ fontSize: 64, color: meta[done.outcome].c }} />
          <div style={{ fontSize: 20, fontWeight: 800, marginTop: 16 }}>{done.no}</div>
          <Tag color={meta[done.outcome].c} style={{ marginTop: 8, fontSize: 14, padding: '4px 12px' }}>{meta[done.outcome].t}</Tag>
          <Button type="primary" size="large" block style={{ marginTop: 28 }} onClick={() => setDone(null)}>Yeni Mal Kabul</Button>
        </div>
      </MobileShell>
    )
  }

  return (
    <MobileShell title="Mal Kabul" back>
      {!doc ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <Select size="large" placeholder="Operasyon (kontrolsüz)" value={opId} onChange={setOpId}
            options={ops.map((o) => ({ value: o.id, label: `${o.code}${o.name ? ' — ' + o.name : ''}` }))} showSearch optionFilterProp="label" />
          {ops.length === 0 && <div style={{ color: '#9db0ce', fontSize: 13 }}>Kontrolsüz GİRİŞ operasyonu yok — planlı (kontrollü) belgeler için Toplama ekranını kullanın.</div>}
          <Select size="large" placeholder="Hedef lokasyon" value={locId} onChange={setLocId} options={locs} showSearch optionFilterProp="label" />
          {!statusAuto && <Select size="large" placeholder="Hedef statü" value={statusId} onChange={setStatusId} options={statusOpts} showSearch optionFilterProp="label" />}
          <Button type="primary" size="large" icon={<FileAddOutlined />} loading={busy} onClick={startDoc} style={{ height: 50, fontSize: 16, fontWeight: 700 }}>
            Belgeyi Başlat (boş — okutmayla dolar)
          </Button>
        </div>
      ) : (
        <>
          <div style={{ ...cardStyle, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 800 }}>{doc.documentNo}</span>
            <Tag color="blue">{op?.code}</Tag>
          </div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
            <Input ref={scanRef as never} size="large" autoFocus prefix={<BarcodeOutlined />} placeholder="Barkod okut / yaz…"
              value={code} onChange={(e) => setCode(e.target.value)} onPressEnter={() => scan(code)} disabled={busy} />
            <InputNumber size="large" min={0.001} value={qty} onChange={(v) => setQty(Number(v) || 1)} style={{ width: 86 }} />
          </div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <Input size="small" placeholder="Parti (ops.)" value={batchNo} onChange={(e) => setBatchNo(e.target.value)} />
            <Input size="small" placeholder="Seri (ops.)" value={serialNo} onChange={(e) => setSerialNo(e.target.value)} />
          </div>

          {doc.lines.map((l) => (
            <div key={l.id} style={{ ...cardStyle, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 700 }}>{l.product?.code ?? `#${l.lineNo}`}</span>
              <span style={{ color: '#9db0ce', fontSize: 13 }}>{Number(l.quantity)} {l.unit?.code ?? ''}</span>
            </div>
          ))}
          {doc.lines.length === 0 && <div style={{ color: '#9db0ce', textAlign: 'center', padding: 16 }}>Henüz okutma yok — belge boş.</div>}

          <Button type="primary" size="large" block icon={<ArrowRightOutlined />} disabled={doc.lines.length === 0}
            onClick={ileri} style={{ marginTop: 12, height: 50, fontSize: 16, fontWeight: 700 }}>
            İleri ({doc.lines.length} satır)
          </Button>
          <Button type="text" block icon={<SendOutlined />} style={{ marginTop: 6, color: '#9db0ce' }}
            onClick={() => { message.info('Belge taslak olarak duruyor — Gözlem ekranından görünür'); setDoc(null) }}>
            Sonra devam et (taslak bırak)
          </Button>
        </>
      )}

      {doc && (
        <IleriModal open={ileriOpen} docId={doc.id} docNo={doc.documentNo} approvalType={approvalType}
          onClose={() => setIleriOpen(false)} onOutcome={onOutcome}
          notify={{ error: (m) => message.error(m), success: (m) => message.success(m) }} />
      )}
    </MobileShell>
  )
}
