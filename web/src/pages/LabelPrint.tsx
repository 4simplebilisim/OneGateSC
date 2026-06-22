import { useCallback, useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { App, Button, Card, DatePicker, Empty, Input, InputNumber, Spin, Switch } from 'antd'
import { ArrowLeftOutlined, PrinterOutlined } from '@ant-design/icons'
import { axiosInstance } from '../providers/dataProvider'
import { PageHeader } from '../components/PageHeader'
import { code128Svg } from '../code128'

type Item = {
  id: number; title?: string | null; displayName?: string | null; designName?: string | null
  itemType?: string | null; sortOrder?: number | null; isRequired?: boolean; isVisible?: boolean
  maxLength?: number | null; defaultValue?: string | null
}
type Tpl = { code: string; screenTitle?: string | null; labelName?: string | null }

// Etiket Basım — etiket tipini KULLANAN ekran: item'lar dinamik form olur, doldurulur, Code128 barkodlu etiket basılır.
export const LabelPrint = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { message } = App.useApp()
  const [tpl, setTpl] = useState<Tpl | null>(null)
  const [items, setItems] = useState<Item[]>([])
  const [values, setValues] = useState<Record<number, unknown>>({})
  const [loading, setLoading] = useState(true)

  const load = useCallback(() => {
    setLoading(true)
    Promise.all([
      axiosInstance.get(`/api/label-templates/${id}`),
      axiosInstance.get('/api/label-template-items', { params: { labelTemplateId: id } }),
    ]).then(([t, it]) => {
      setTpl(t.data)
      const list = (Array.isArray(it.data) ? it.data : (it.data.data ?? [])) as Item[]
      const visible = list.filter((x) => x.isVisible !== false).sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
      setItems(visible)
      const dv: Record<number, unknown> = {}
      visible.forEach((x) => { if (x.defaultValue != null && x.defaultValue !== '') dv[x.id] = x.defaultValue })
      setValues(dv)
    }).catch((e) => message.error(e?.response?.data?.error ?? 'Yüklenemedi')).finally(() => setLoading(false))
  }, [id, message])

  useEffect(load, [load])

  const setVal = (itemId: number, v: unknown) => setValues((p) => ({ ...p, [itemId]: v }))
  const labelOf = (it: Item) => it.title || it.displayName || it.designName || `Alan ${it.id}`

  const control = (it: Item) => {
    const v = values[it.id]
    switch (it.itemType) {
      case 'NUMBER': return <InputNumber style={{ width: '100%' }} value={v as number} onChange={(x) => setVal(it.id, x)} />
      case 'DATE': return <DatePicker style={{ width: '100%' }} format="DD.MM.YYYY" onChange={(_, s) => setVal(it.id, s)} />
      case 'CHECKBOX': return <Switch checked={!!v} onChange={(x) => setVal(it.id, x)} />
      // COMBO/LOOKUP: sorgu-güdümlü kaynak henüz yok → metin girişi (güvenli SQL-runner sonraki adım)
      default: return <Input value={v as string} maxLength={it.maxLength ?? undefined} onChange={(e) => setVal(it.id, e.target.value)} placeholder={it.itemType === 'COMBO' || it.itemType === 'LOOKUP' ? 'Değer (sorgu kaynağı yakında)' : undefined} />
    }
  }

  const print = () => {
    const miss = items.find((it) => it.isRequired && (values[it.id] == null || values[it.id] === ''))
    if (miss) { message.warning(`${labelOf(miss)} zorunlu`); return }
    if (!tpl) return
    const barcodeItem = items.find((it) => it.itemType === 'BARCODE') ?? items[0]
    const barcodeVal = barcodeItem ? String(values[barcodeItem.id] ?? '') : ''
    const rowsHtml = items.map((it) => {
      const v = it.itemType === 'CHECKBOX' ? (values[it.id] ? '✓' : '—') : (values[it.id] ?? '')
      return `<div class="r"><span class="l">${labelOf(it)}</span><span class="v">${String(v)}</span></div>`
    }).join('')
    const w = window.open('', '_blank', 'width=420,height=580')
    if (!w) { message.error('Yazdırma penceresi açılamadı (popup engeli olabilir)'); return }
    w.document.write(
      `<html><head><title>${tpl.labelName || tpl.code}</title><style>` +
      `body{font-family:Inter,Arial,sans-serif;margin:0}` +
      `.lbl{border:1px dashed #999;border-radius:8px;padding:14px;margin:10px;width:300px;page-break-inside:avoid}` +
      `.h{font-weight:700;font-size:15px;margin-bottom:8px}.r{display:flex;justify-content:space-between;gap:10px;font-size:12px;padding:2px 0;border-bottom:1px dotted #ddd}.l{color:#555}.v{font-weight:600;text-align:right}svg{width:100%;height:46px;margin-top:10px}@media print{.lbl{border-color:#000}}` +
      `</style></head><body><div class="lbl"><div class="h">${tpl.labelName || tpl.code}</div>${rowsHtml}${barcodeVal ? code128Svg(barcodeVal, 46) : ''}</div><script>window.onload=function(){window.print()}</script></body></html>`,
    )
    w.document.close()
  }

  if (loading || !tpl) return <div style={{ padding: 80, textAlign: 'center' }}><Spin size="large" /></div>

  return (
    <div className="og-page" style={{ maxWidth: 720 }}>
      <PageHeader
        title={`Etiket Basım — ${tpl.screenTitle || tpl.code}`}
        subtitle="Etiket tipinin item'larını doldur → Code128 barkodlu etiket bas"
        extra={<Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/label-templates')}>Liste</Button>}
      />
      <Card className="og-section-card" size="small" title={`Alanlar (${items.length})`}
        extra={<Button type="primary" icon={<PrinterOutlined />} disabled={!items.length} onClick={print}>Etiket Bas</Button>}>
        {items.length === 0 ? (
          <Empty description="Bu etiket tipinde item yok — önce 'Item' ekranından alan ekleyin" />
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 14 }}>
            {items.map((it) => (
              <div key={it.id}>
                <div style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>{labelOf(it)}{it.isRequired ? ' *' : ''}</div>
                {control(it)}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
