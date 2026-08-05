import { code128Svg } from './code128'

/**
 * Etiket işleyici — TEK KAYNAK.
 * Etiket Tasarımcısı'nda çizilen düzen (TBLLABELTYPE.layoutJson) hem önizlemede
 * hem GERÇEK baskıda aynı kodla basılır. Önceden etiketleme ekranı tasarımı hiç
 * okumuyordu; ne çizersen çiz sabit bir şablon basılıyordu.
 */

export type LabelElType = 'text' | 'field' | 'barcode' | 'line'
export interface LabelEl {
  id: string
  type: LabelElType
  x: number; y: number; w: number; h: number // mm
  text?: string
  field?: string
  fontSize?: number // pt
  bold?: boolean
  align?: 'left' | 'center' | 'right'
}
export interface LabelLayout { widthMm: number; heightMm: number; elements: LabelEl[] }

export const DEFAULT_LAYOUT: LabelLayout = { widthMm: 50, heightMm: 30, elements: [] }

/** Tasarımcıda seçilebilen alanlar + örnek değerleri (önizleme için). */
export const LABEL_FIELDS: { key: string; label: string; sample: string }[] = [
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

export const labelFieldLabel = (k?: string) => LABEL_FIELDS.find((f) => f.key === k)?.label ?? k ?? ''
export const labelFieldSample = (k?: string) => LABEL_FIELDS.find((f) => f.key === k)?.sample ?? `{{${k}}}`

/** Etiket verisi — anahtarlar LABEL_FIELDS.key ile aynı. */
export type LabelData = Record<string, string | number | null | undefined>

const esc = (v: unknown) =>
  String(v ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] ?? c))

/** Alanın değeri: veri verilmişse ondan, yoksa örnek (tasarımcı önizlemesi). */
const deger = (el: LabelEl, data?: LabelData) => {
  if (!el.field) return ''
  if (data) { const v = data[el.field]; return v == null || v === '' ? '' : String(v) }
  return labelFieldSample(el.field)
}

/** Tek etiketin gövdesi (konumlandırılmış elemanlar). */
export function labelBodyHtml(layout: LabelLayout, data?: LabelData): string {
  return layout.elements.map((el) => {
    if (el.type === 'line') {
      return `<div style="position:absolute;left:${el.x}mm;top:${el.y}mm;width:${el.w}mm;height:${Math.max(0.3, el.h)}mm;background:#000"></div>`
    }
    if (el.type === 'barcode') {
      const val = deger(el, data)
      return `<div style="position:absolute;left:${el.x}mm;top:${el.y}mm;width:${el.w}mm;height:${el.h}mm;display:flex;flex-direction:column;justify-content:center">`
        + `${val ? code128Svg(val, el.h * 2.6) : ''}<div style="font-size:7pt;text-align:center">${esc(val)}</div></div>`
    }
    const icerik = el.type === 'text' ? esc(el.text ?? '') : esc(deger(el, data))
    const style = `position:absolute;left:${el.x}mm;top:${el.y}mm;width:${el.w}mm;height:${el.h}mm;`
      + `font-size:${el.fontSize ?? 9}pt;font-weight:${el.bold ? 700 : 400};text-align:${el.align ?? 'left'};`
      + `overflow:hidden;white-space:nowrap;display:flex;align-items:center;`
      + (el.align === 'center' ? 'justify-content:center;' : el.align === 'right' ? 'justify-content:flex-end;' : '')
    return `<div style="${style}">${icerik}</div>`
  }).join('')
}

/**
 * Yazdırılabilir sayfa. `kayitlar` boşsa tek örnek etiket (tasarımcı önizlemesi).
 * Her kayıt için bir etiket; kayıtta `_adet` varsa o sayıda tekrarlanır.
 */
export function labelPageHtml(
  layout: LabelLayout,
  kayitlar: LabelData[] = [],
  opts: { baslik?: string; yaziciNotu?: string } = {},
): string {
  const liste = kayitlar.length ? kayitlar : [undefined as unknown as LabelData]
  const etiketler = liste.flatMap((d) => {
    const adet = Math.max(1, Number((d as LabelData | undefined)?._adet ?? 1))
    return Array.from({ length: adet }, () => `<div class="lbl">${labelBodyHtml(layout, d)}</div>`)
  }).join('')
  const not = opts.yaziciNotu
    ? `<div class="note">Hedef yazıcı: ${esc(opts.yaziciNotu)} — yazdırma penceresinde bu yazıcıyı seçin</div>`
    : ''
  return `<html><head><title>${esc(opts.baslik ?? 'Etiket')}</title><style>`
    + `@page{size:${layout.widthMm}mm ${layout.heightMm}mm;margin:0}`
    + `body{margin:0;font-family:Inter,Arial,sans-serif}`
    + `.lbl{position:relative;width:${layout.widthMm}mm;height:${layout.heightMm}mm;page-break-after:always;overflow:hidden}`
    + `.note{font-size:9pt;padding:6px 8px;background:#eef2f8;border-bottom:1px solid #ccd}`
    + `@media print{.note{display:none}}`
    + `</style></head><body>${not}${etiketler}`
    + `<script>window.onload=function(){window.print()}<\/script></body></html>`
}

/** Yeni pencerede aç + yazdır. Dönen değer: pencere açıldı mı. */
export function printLabels(
  layout: LabelLayout, kayitlar: LabelData[] = [], opts: { baslik?: string; yaziciNotu?: string } = {},
): boolean {
  const w = window.open('', '_blank', 'width=620,height=680')
  if (!w) return false
  w.document.write(labelPageHtml(layout, kayitlar, opts))
  w.document.close()
  return true
}

/** layoutJson metnini güvenle çöz (bozuksa varsayılan). */
export function parseLayout(json?: string | null): LabelLayout {
  if (!json) return DEFAULT_LAYOUT
  try { return { ...DEFAULT_LAYOUT, ...(JSON.parse(json) as Partial<LabelLayout>) } } catch { return DEFAULT_LAYOUT }
}
