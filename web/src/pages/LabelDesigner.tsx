import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { App, Button, Card, InputNumber, Select, Input, Space, Spin, Segmented, Empty, Divider } from 'antd'
import {
  ArrowLeftOutlined, SaveOutlined, FontSizeOutlined, TagOutlined, BarcodeOutlined, MinusOutlined,
  DeleteOutlined, PrinterOutlined, BoldOutlined,
} from '@ant-design/icons'
import { axiosInstance } from '../providers/dataProvider'
import { PageHeader } from '../components/PageHeader'
import { code128Modules, code128Svg } from '../code128'

// Etikette bağlanabilir veri alanları (örnek değerlerle — canlı önizleme)
const FIELDS: { key: string; label: string; sample: string }[] = [
  { key: 'productCode', label: 'Ürün Kodu', sample: 'PRD001' },
  { key: 'productName', label: 'Ürün Adı', sample: 'Ambalaj Kutusu' },
  { key: 'barcode', label: 'Barkod', sample: '8690000000017' },
  { key: 'batchNo', label: 'Parti (Lot)', sample: 'AUTO-20260612' },
  { key: 'serialNo', label: 'Seri No', sample: 'SN-0001' },
  { key: 'expiryDate', label: 'SKT', sample: '2027-01-01' },
  { key: 'locationCode', label: 'Lokasyon', sample: 'A-01-01' },
  { key: 'palletNo', label: 'Palet No', sample: 'PLT0001' },
  { key: 'quantity', label: 'Miktar', sample: '100' },
  { key: 'unit', label: 'Birim', sample: 'ADET' },
]
const fieldLabel = (k?: string) => FIELDS.find((f) => f.key === k)?.label ?? k ?? ''
const fieldSample = (k?: string) => FIELDS.find((f) => f.key === k)?.sample ?? `{{${k}}}`

type ElType = 'text' | 'field' | 'barcode' | 'line'
interface El {
  id: string
  type: ElType
  x: number; y: number; w: number; h: number // mm
  text?: string
  field?: string
  fontSize?: number // pt
  bold?: boolean
  align?: 'left' | 'center' | 'right'
}
interface Layout { widthMm: number; heightMm: number; elements: El[] }

const DEFAULT: Layout = { widthMm: 50, heightMm: 30, elements: [] }
const PX = 4.2 // mm → px (tasarım ölçeği)
const uid = () => 'e' + Math.random().toString(36).slice(2, 8)

// Gerçek (taranabilir) Code128-B barkod — SVG, viewBox ile ölçeklenir.
const Barcode = ({ value, height }: { value: string; height: number }) => {
  const mods = code128Modules(value || '000')
  const total = mods.reduce((a, b) => a + b, 0)
  let x = 0
  const rects: { x: number; w: number }[] = []
  mods.forEach((w, i) => { if (i % 2 === 0) rects.push({ x, w }); x += w })
  return (
    <svg viewBox={`0 0 ${total} 100`} preserveAspectRatio="none" width="100%" height={height} style={{ display: 'block' }}>
      {rects.map((r, i) => <rect key={i} x={r.x} y={0} width={r.w} height={100} fill="#111" />)}
    </svg>
  )
}

const ElView = ({ el, sample }: { el: El; sample: boolean }) => {
  const common: React.CSSProperties = {
    width: '100%', height: '100%', fontSize: (el.fontSize ?? 9) * 1.1,
    fontWeight: el.bold ? 700 : 400, textAlign: el.align ?? 'left',
    display: 'flex', alignItems: 'center', justifyContent: el.align === 'center' ? 'center' : el.align === 'right' ? 'flex-end' : 'flex-start',
    color: '#111', lineHeight: 1.1, overflow: 'hidden', whiteSpace: 'nowrap',
  }
  if (el.type === 'line') return <div style={{ width: '100%', height: Math.max(1, el.h * PX), background: '#111' }} />
  if (el.type === 'barcode') {
    const val = sample ? fieldSample(el.field) : `{{${el.field}}}`
    return (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', overflow: 'hidden' }}>
        <Barcode value={val} height={Math.max(10, el.h * PX - 12)} />
        <div style={{ fontSize: 8, textAlign: 'center', color: '#111', marginTop: 1 }}>{val}</div>
      </div>
    )
  }
  if (el.type === 'field') return <div style={common}>{sample ? fieldSample(el.field) : `{{${el.field}}}`}</div>
  return <div style={common}>{el.text || 'Metin'}</div>
}

export const LabelDesigner = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { message } = App.useApp()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [meta, setMeta] = useState<{ code?: string; labelName?: string }>({})
  const [layout, setLayout] = useState<Layout>(DEFAULT)
  const [selId, setSelId] = useState<string | null>(null)
  const drag = useRef<{ id: string; startX: number; startY: number; ox: number; oy: number } | null>(null)

  useEffect(() => {
    axiosInstance.get(`/api/label-types/${id}`)
      .then((r) => {
        setMeta({ code: r.data.code, labelName: r.data.labelName })
        if (r.data.layoutJson) {
          try { setLayout({ ...DEFAULT, ...JSON.parse(r.data.layoutJson) }) } catch { /* bozuk json → default */ }
        }
      })
      .catch((e) => message.error(e?.response?.data?.error ?? 'Yüklenemedi'))
      .finally(() => setLoading(false))
  }, [id, message])

  const sel = layout.elements.find((e) => e.id === selId) ?? null
  const patch = (elId: string, p: Partial<El>) =>
    setLayout((l) => ({ ...l, elements: l.elements.map((e) => (e.id === elId ? { ...e, ...p } : e)) }))

  const add = (type: ElType) => {
    const el: El = {
      id: uid(), type, x: 2, y: 2,
      w: type === 'barcode' ? 30 : type === 'line' ? 40 : 24,
      h: type === 'barcode' ? 12 : type === 'line' ? 1 : 6,
      fontSize: 9, align: 'left',
      ...(type === 'text' ? { text: 'Metin' } : {}),
      ...(type === 'field' || type === 'barcode' ? { field: 'productCode' } : {}),
    }
    setLayout((l) => ({ ...l, elements: [...l.elements, el] }))
    setSelId(el.id)
  }
  const removeSel = () => { if (sel) { setLayout((l) => ({ ...l, elements: l.elements.filter((e) => e.id !== sel.id) })); setSelId(null) } }

  const onPointerDown = (e: React.PointerEvent, el: El) => {
    e.stopPropagation()
    setSelId(el.id)
    drag.current = { id: el.id, startX: e.clientX, startY: e.clientY, ox: el.x, oy: el.y }
    ;(e.target as HTMLElement).setPointerCapture?.(e.pointerId)
  }
  const onPointerMove = useCallback((e: React.PointerEvent) => {
    const d = drag.current
    if (!d) return
    const nx = Math.max(0, Math.round((d.ox + (e.clientX - d.startX) / PX) * 10) / 10)
    const ny = Math.max(0, Math.round((d.oy + (e.clientY - d.startY) / PX) * 10) / 10)
    setLayout((l) => ({ ...l, elements: l.elements.map((el) => (el.id === d.id ? { ...el, x: nx, y: ny } : el)) }))
  }, [])
  const onPointerUp = () => { drag.current = null }

  const save = async () => {
    setSaving(true)
    try {
      await axiosInstance.patch(`/api/label-types/${id}`, { layoutJson: JSON.stringify(layout) })
      message.success('Etiket tasarımı kaydedildi')
    } catch (e) {
      message.error((e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Kaydedilemedi')
    } finally { setSaving(false) }
  }

  const print = () => {
    const w = window.open('', '_blank', 'width=600,height=400')
    if (!w) return
    const els = layout.elements.map((el) => {
      const style = `position:absolute;left:${el.x}mm;top:${el.y}mm;width:${el.w}mm;height:${el.h}mm;font-size:${el.fontSize ?? 9}pt;font-weight:${el.bold ? 700 : 400};text-align:${el.align ?? 'left'};overflow:hidden;white-space:nowrap;display:flex;align-items:center;${el.align === 'center' ? 'justify-content:center;' : el.align === 'right' ? 'justify-content:flex-end;' : ''}`
      if (el.type === 'line') return `<div style="position:absolute;left:${el.x}mm;top:${el.y}mm;width:${el.w}mm;height:${Math.max(0.3, el.h)}mm;background:#000"></div>`
      if (el.type === 'barcode') {
        const val = fieldSample(el.field)
        return `<div style="position:absolute;left:${el.x}mm;top:${el.y}mm;width:${el.w}mm;height:${el.h}mm;display:flex;flex-direction:column;justify-content:center">${code128Svg(val, el.h * 2.6)}<div style="font-size:7pt;text-align:center">${val}</div></div>`
      }
      const content = el.type === 'text' ? (el.text || '') : fieldSample(el.field)
      return `<div style="${style}">${content}</div>`
    }).join('')
    w.document.write(`<html><head><style>@page{size:${layout.widthMm}mm ${layout.heightMm}mm;margin:0}body{margin:0}.lbl{position:relative;width:${layout.widthMm}mm;height:${layout.heightMm}mm}</style></head><body><div class="lbl">${els}</div><script>window.onload=()=>{window.print()}<\/script></body></html>`)
    w.document.close()
  }

  if (loading) return <div style={{ padding: 80, textAlign: 'center' }}><Spin size="large" /></div>

  return (
    <div className="og-page" style={{ maxWidth: 1180 }}>
      <PageHeader
        title={`Etiket Tasarımı — ${meta.labelName || meta.code || ''}`}
        subtitle="Eleman ekle, tuval üzerinde sürükle, sağdan özelliklerini ayarla — örnek veriyle canlı önizleme"
        extra={
          <Space>
            <Button icon={<PrinterOutlined />} onClick={print}>Yazdır / PDF</Button>
            <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/label-types')}>Liste</Button>
          </Space>
        }
      />

      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        {/* Sol: araç + tuval */}
        <Card className="og-section-card" size="small" style={{ flex: '1 1 620px', minWidth: 420 }} title="Tuval"
          extra={
            <Space size={6}>
              <Button size="small" icon={<FontSizeOutlined />} onClick={() => add('text')}>Metin</Button>
              <Button size="small" icon={<TagOutlined />} onClick={() => add('field')}>Alan</Button>
              <Button size="small" icon={<BarcodeOutlined />} onClick={() => add('barcode')}>Barkod</Button>
              <Button size="small" icon={<MinusOutlined />} onClick={() => add('line')}>Çizgi</Button>
            </Space>
          }
        >
          <Space size={10} style={{ marginBottom: 12 }}>
            <span style={{ fontSize: 12, color: 'var(--og-muted)' }}>Boyut (mm)</span>
            <InputNumber size="small" min={10} max={300} value={layout.widthMm} onChange={(v) => setLayout((l) => ({ ...l, widthMm: Number(v) || 50 }))} prefix="G" style={{ width: 110 }} />
            <InputNumber size="small" min={10} max={300} value={layout.heightMm} onChange={(v) => setLayout((l) => ({ ...l, heightMm: Number(v) || 30 }))} prefix="Y" style={{ width: 110 }} />
          </Space>

          <div style={{ overflow: 'auto', padding: 16, background: 'var(--og-sunken)', borderRadius: 9, border: '1px solid var(--og-border-soft)' }}>
            <div
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onClick={() => setSelId(null)}
              style={{
                position: 'relative', width: layout.widthMm * PX, height: layout.heightMm * PX,
                background: '#fff', boxShadow: '0 2px 10px rgba(0,0,0,.18)', margin: '0 auto',
                backgroundImage: 'linear-gradient(#eef 1px,transparent 1px),linear-gradient(90deg,#eef 1px,transparent 1px)',
                backgroundSize: `${PX * 5}px ${PX * 5}px`,
              }}
            >
              {layout.elements.map((el) => (
                <div
                  key={el.id}
                  onPointerDown={(e) => onPointerDown(e, el)}
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    position: 'absolute', left: el.x * PX, top: el.y * PX, width: el.w * PX, height: el.h * PX,
                    cursor: 'move', outline: selId === el.id ? '2px solid #2563C9' : '1px dashed rgba(37,99,201,.4)',
                    outlineOffset: 0, boxSizing: 'border-box', background: selId === el.id ? 'rgba(37,99,201,.06)' : 'transparent',
                  }}
                >
                  <ElView el={el} sample />
                </div>
              ))}
              {!layout.elements.length && (
                <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', color: '#9aa7bd', fontSize: 12 }}>
                  Üstten eleman ekleyin
                </div>
              )}
            </div>
          </div>
        </Card>

        {/* Sağ: özellikler */}
        <Card className="og-section-card" size="small" style={{ flex: '0 0 320px', width: 320 }} title={sel ? 'Eleman özellikleri' : 'Özellikler'}>
          {!sel ? (
            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Bir eleman seçin" style={{ padding: '20px 0' }} />
          ) : (
            <Space orientation="vertical" style={{ width: '100%' }} size={12}>
              <div>
                <div style={{ fontSize: 12, color: 'var(--og-muted)', marginBottom: 4 }}>Tür</div>
                <span style={{ fontWeight: 600 }}>
                  {sel.type === 'text' ? 'Sabit Metin' : sel.type === 'field' ? 'Veri Alanı' : sel.type === 'barcode' ? 'Barkod' : 'Çizgi'}
                </span>
              </div>

              {sel.type === 'text' && (
                <div>
                  <div style={{ fontSize: 12, color: 'var(--og-muted)', marginBottom: 4 }}>İçerik</div>
                  <Input value={sel.text} onChange={(e) => patch(sel.id, { text: e.target.value })} />
                </div>
              )}
              {(sel.type === 'field' || sel.type === 'barcode') && (
                <div>
                  <div style={{ fontSize: 12, color: 'var(--og-muted)', marginBottom: 4 }}>Veri Alanı</div>
                  <Select
                    style={{ width: '100%' }}
                    value={sel.field}
                    onChange={(v) => patch(sel.id, { field: v })}
                    options={FIELDS.map((f) => ({ value: f.key, label: `${f.label} (örn: ${f.sample})` }))}
                  />
                </div>
              )}

              <Space size={8} wrap>
                <span style={{ fontSize: 12, color: 'var(--og-muted)' }}>Konum</span>
                <InputNumber size="small" prefix="X" min={0} value={sel.x} onChange={(v) => patch(sel.id, { x: Number(v) || 0 })} style={{ width: 96 }} />
                <InputNumber size="small" prefix="Y" min={0} value={sel.y} onChange={(v) => patch(sel.id, { y: Number(v) || 0 })} style={{ width: 96 }} />
              </Space>
              <Space size={8} wrap>
                <span style={{ fontSize: 12, color: 'var(--og-muted)' }}>Boyut</span>
                <InputNumber size="small" prefix="G" min={1} value={sel.w} onChange={(v) => patch(sel.id, { w: Number(v) || 1 })} style={{ width: 96 }} />
                <InputNumber size="small" prefix="Y" min={1} value={sel.h} onChange={(v) => patch(sel.id, { h: Number(v) || 1 })} style={{ width: 96 }} />
              </Space>

              {sel.type !== 'line' && (
                <>
                  <Space size={8} wrap align="center">
                    <span style={{ fontSize: 12, color: 'var(--og-muted)' }}>Yazı (pt)</span>
                    <InputNumber size="small" min={5} max={48} value={sel.fontSize} onChange={(v) => patch(sel.id, { fontSize: Number(v) || 9 })} style={{ width: 80 }} />
                    <Button size="small" type={sel.bold ? 'primary' : 'default'} icon={<BoldOutlined />} onClick={() => patch(sel.id, { bold: !sel.bold })} />
                  </Space>
                  <div>
                    <div style={{ fontSize: 12, color: 'var(--og-muted)', marginBottom: 4 }}>Hizalama</div>
                    <Segmented
                      size="small"
                      value={sel.align ?? 'left'}
                      onChange={(v) => patch(sel.id, { align: v as El['align'] })}
                      options={[{ value: 'left', label: 'Sol' }, { value: 'center', label: 'Orta' }, { value: 'right', label: 'Sağ' }]}
                    />
                  </div>
                </>
              )}

              <Divider style={{ margin: '4px 0' }} />
              <Button danger icon={<DeleteOutlined />} onClick={removeSel} block>Elemanı Sil</Button>
            </Space>
          )}
        </Card>
      </div>

      <div className="og-formbar">
        <Button type="primary" icon={<SaveOutlined />} loading={saving} onClick={save}>Tasarımı Kaydet</Button>
        <Button onClick={() => navigate('/label-types')}>İptal</Button>
        <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--og-muted)' }}>{layout.elements.length} eleman · {layout.widthMm}×{layout.heightMm} mm</span>
      </div>
    </div>
  )
}
