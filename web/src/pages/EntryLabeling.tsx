import { useEffect, useState } from 'react'
import { App, Button, Card, Empty, InputNumber, Select, Space, Table } from 'antd'
import { PrinterOutlined } from '@ant-design/icons'
import { axiosInstance } from '../providers/dataProvider'
import { PageHeader } from '../components/PageHeader'
import { code128Svg } from '../code128'

type DocOpt = { id: number; documentNo: string; status: string }
type LabelRow = { key: number; code: string; name: string; qty: number }

// Giriş/Çıkış Etiketleme — belge seç → ürünleri listele → etiket tipi seç → etiket bas (Code128 barkod).
export const EntryLabeling = ({ direction = 'INBOUND' }: { direction?: 'INBOUND' | 'OUTBOUND' }) => {
  const { message } = App.useApp()
  const isOut = direction === 'OUTBOUND'
  const [docs, setDocs] = useState<DocOpt[]>([])
  const [labelTypes, setLabelTypes] = useState<{ value: number; label: string }[]>([])
  const [documentId, setDocumentId] = useState<number>()
  const [labelTypeId, setLabelTypeId] = useState<number>()
  const [rows, setRows] = useState<LabelRow[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    axiosInstance.get('/api/documents', { params: { direction, pageSize: 300 } }).then((r) => {
      const l = Array.isArray(r.data) ? r.data : (r.data.data ?? [])
      setDocs(l.map((d: Record<string, unknown>) => ({ id: d.id as number, documentNo: (d.documentNo as string) ?? `#${d.id}`, status: (d.status as string) ?? '' })))
    })
    axiosInstance.get('/api/label-types', { params: { pageSize: 200 } }).then((r) => {
      const l = Array.isArray(r.data) ? r.data : (r.data.data ?? [])
      setLabelTypes(l.map((x: Record<string, unknown>) => ({ value: x.id as number, label: `${x.code}${x.labelName ? ' — ' + x.labelName : ''}` })))
    })
  }, [])

  const pickDoc = (id?: number) => {
    setDocumentId(id)
    if (!id) { setRows([]); return }
    setLoading(true)
    axiosInstance.get(`/api/documents/${id}`).then((r) => {
      const lines = (r.data.lines ?? []) as Record<string, unknown>[]
      setRows(lines.map((l, i) => {
        const p = l.product as { code?: string; name?: string } | undefined
        return { key: i, code: p?.code ?? `#${l.productId}`, name: p?.name ?? '', qty: Number(l.quantity) }
      }))
    }).finally(() => setLoading(false))
  }

  const print = () => {
    if (!rows.length) { message.warning('Etiketlenecek satır yok'); return }
    const labelName = labelTypes.find((t) => t.value === labelTypeId)?.label ?? 'Etiket'
    const labels = rows.map((r) =>
      `<div class="lbl"><div class="c">${r.code}</div><div class="n">${r.name}</div>${code128Svg(r.code, 42)}<div class="q">Adet: ${r.qty}</div></div>`,
    ).join('')
    const w = window.open('', '_blank', 'width=420,height=640')
    if (!w) { message.error('Yazdırma penceresi açılamadı (popup engeli olabilir)'); return }
    w.document.write(
      `<html><head><title>${labelName}</title><style>` +
      `body{margin:0;font-family:Inter,Arial,sans-serif}` +
      `.lbl{border:1px dashed #999;border-radius:6px;padding:10px 12px;margin:8px;width:220px;page-break-inside:avoid}` +
      `.c{font-weight:700;font-size:18px;letter-spacing:.5px}.n{font-size:12px;color:#444;margin:2px 0 6px}.q{font-size:11px;color:#666;margin-top:4px}` +
      `svg{width:100%;height:42px}@media print{.lbl{border-color:#000}}` +
      `</style></head><body>${labels}<script>window.onload=function(){window.print()}</script></body></html>`,
    )
    w.document.close()
  }

  return (
    <div className="og-page" style={{ maxWidth: 900 }}>
      <PageHeader title={isOut ? 'Çıkış Etiketleme' : 'Giriş Etiketleme'} subtitle={`${isOut ? 'Çıkış' : 'Giriş'} belgesi seç → ürünler için etiket tipi seçip Code128 barkodlu etiket bas`} />
      <Card className="og-section-card" size="small" title="Kriter">
        <Space wrap size="middle" align="end">
          <div>
            <div style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>{isOut ? 'Çıkış' : 'Giriş'} Belgesi *</div>
            <Select style={{ minWidth: 240 }} showSearch optionFilterProp="label" placeholder={`Belge seç (${docs.length})`}
              value={documentId} onChange={pickDoc} options={docs.map((d) => ({ value: d.id, label: `${d.documentNo}${d.status ? ' · ' + d.status : ''}` }))} />
          </div>
          <div>
            <div style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>Etiket Tipi</div>
            <Select allowClear style={{ minWidth: 200 }} showSearch optionFilterProp="label" placeholder="(Varsayılan)" value={labelTypeId} onChange={setLabelTypeId} options={labelTypes} />
          </div>
          <Button type="primary" icon={<PrinterOutlined />} disabled={!rows.length} onClick={print}>Etiket Bas</Button>
        </Space>
      </Card>

      {documentId && (
        <Card className="og-section-card" size="small" title={`Etiketlenecek Ürünler (${rows.length})`}>
          {rows.length === 0 && !loading ? <Empty description="Bu belgede satır yok" /> : (
            <Table<LabelRow> rowKey="key" size="small" loading={loading} dataSource={rows} pagination={false}
              columns={[
                { title: 'Malzeme', dataIndex: 'code' },
                { title: 'Açıklama', dataIndex: 'name', ellipsis: true },
                { title: 'Adet', dataIndex: 'qty', align: 'right' as const, width: 90,
                  render: (_, r) => <InputNumber min={1} value={r.qty} onChange={(v) => setRows((prev) => prev.map((x) => (x.key === r.key ? { ...x, qty: Number(v) || 1 } : x)))} /> },
              ]} />
          )}
        </Card>
      )}
    </div>
  )
}
