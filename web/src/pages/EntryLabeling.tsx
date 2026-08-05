import { useEffect, useState } from 'react'
import { App, Alert, Button, Card, Empty, Input, InputNumber, Select, Space, Table, Tag } from 'antd'
import { PrinterOutlined } from '@ant-design/icons'
import { axiosInstance } from '../providers/dataProvider'
import { PageHeader } from '../components/PageHeader'
import { parseLayout, printLabels, type LabelData, type LabelLayout } from '../labelRender'

type DocOpt = { id: number; documentNo: string; status: string }
type LabelRow = {
  key: number; productCode: string; productName: string; quantity: number; unit: string
  batchNo: string; serialNo: string; locationCode: string; palletNo: string; expiryDate: string; barcode: string
  adet: number // kaç kopya basılacak
}
type LabelTypeOpt = { value: number; label: string; layout: LabelLayout; hasLayout: boolean }
type PrinterOpt = { value: number; label: string; address: string; isDefault: boolean }

const arr = (d: unknown) => (Array.isArray(d) ? d : ((d as { data?: unknown[] })?.data ?? []))
const str = (v: unknown) => (v == null ? '' : String(v))

// Giriş/Çıkış Etiketleme — belge seç → satırları listele → ETİKET TASARIMINA göre bas.
// Etiket tipi önceden yalnız pencere başlığı olarak kullanılıyordu; Etiket Tasarımcısı'nda
// çizilen düzen (layoutJson) hiç okunmuyordu → ne çizersen çiz sabit şablon basılıyordu.
export const EntryLabeling = ({ direction = 'INBOUND' }: { direction?: 'INBOUND' | 'OUTBOUND' }) => {
  const { message } = App.useApp()
  const isOut = direction === 'OUTBOUND'
  const [docs, setDocs] = useState<DocOpt[]>([])
  const [labelTypes, setLabelTypes] = useState<LabelTypeOpt[]>([])
  const [printers, setPrinters] = useState<PrinterOpt[]>([])
  const [documentId, setDocumentId] = useState<number>()
  const [labelTypeId, setLabelTypeId] = useState<number>()
  const [printerId, setPrinterId] = useState<number>()
  const [rows, setRows] = useState<LabelRow[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    axiosInstance.get('/api/documents', { params: { direction, pageSize: 300 } }).then((r) =>
      setDocs((arr(r.data) as Record<string, unknown>[]).map((d) => ({
        id: d.id as number, documentNo: str(d.documentNo) || `#${d.id}`, status: str(d.status),
      }))))
    axiosInstance.get('/api/label-types', { params: { pageSize: 200 } }).then((r) => {
      const l = (arr(r.data) as Record<string, unknown>[]).map((x) => {
        const layout = parseLayout(x.layoutJson as string | null)
        return {
          value: x.id as number,
          label: `${x.code}${x.labelName ? ' — ' + x.labelName : ''}`,
          layout, hasLayout: layout.elements.length > 0,
        }
      })
      setLabelTypes(l)
      const ilkTasarimli = l.find((t) => t.hasLayout)
      if (ilkTasarimli) setLabelTypeId(ilkTasarimli.value) // tasarımı olan ilk tip öne gelsin
    })
    // Yazıcı tanımları (TBLPRINTER) — tesise bağlı, varsayılanı işaretli
    axiosInstance.get('/api/printers', { params: { pageSize: 200 } }).then((r) => {
      const p = (arr(r.data) as Record<string, unknown>[]).map((x) => ({
        value: x.id as number, label: str(x.name), address: str(x.address), isDefault: !!x.isDefault,
      }))
      setPrinters(p)
      const varsayilan = p.find((x) => x.isDefault) ?? p[0]
      if (varsayilan) setPrinterId(varsayilan.value)
    }).catch(() => setPrinters([]))
  }, [direction])

  const pickDoc = (id?: number) => {
    setDocumentId(id)
    if (!id) { setRows([]); return }
    setLoading(true)
    axiosInstance.get(`/api/documents/${id}`).then((r) => {
      const lines = (r.data.lines ?? []) as Record<string, unknown>[]
      setRows(lines.map((l, i) => {
        const p = l.product as { code?: string; name?: string; barcode?: string } | undefined
        const loc = (l.targetLocation ?? l.sourceLocation) as { code?: string } | undefined
        const pal = l.pallet as { palletNo?: string } | undefined
        const u = l.unit as { code?: string } | undefined
        return {
          key: i,
          productCode: p?.code ?? `#${l.productId}`,
          productName: p?.name ?? '',
          quantity: Number(l.quantity) || 0,
          unit: u?.code ?? '',
          batchNo: str(l.batchNo), serialNo: str(l.serialNo),
          locationCode: loc?.code ?? '', palletNo: pal?.palletNo ?? '',
          expiryDate: str(l.expiryDate).slice(0, 10),
          barcode: p?.barcode ?? p?.code ?? '',
          adet: 1,
        }
      }))
    }).finally(() => setLoading(false))
  }

  const seciliTip = labelTypes.find((t) => t.value === labelTypeId)
  const yazici = printers.find((p) => p.value === printerId)

  const print = () => {
    if (!rows.length) { message.warning('Etiketlenecek satır yok'); return }
    if (!seciliTip) { message.warning('Etiket tipi seçin'); return }
    if (!seciliTip.hasLayout) {
      message.warning(`"${seciliTip.label}" tipinin tasarımı yok — Uyarlamalar › Etiket Tipleri ekranından tasarlayın`)
      return
    }
    const veri: LabelData[] = rows.map((r) => ({
      productCode: r.productCode, productName: r.productName, barcode: r.barcode,
      batchNo: r.batchNo, serialNo: r.serialNo, expiryDate: r.expiryDate,
      locationCode: r.locationCode, palletNo: r.palletNo,
      quantity: r.quantity, unit: r.unit,
      _adet: r.adet,
    }))
    const ok = printLabels(seciliTip.layout, veri, {
      baslik: seciliTip.label,
      yaziciNotu: yazici ? `${yazici.label}${yazici.address ? ` (${yazici.address})` : ''}` : undefined,
    })
    if (!ok) message.error('Yazdırma penceresi açılamadı (popup engeli olabilir)')
  }

  const toplamEtiket = rows.reduce((a, r) => a + Math.max(1, r.adet), 0)

  return (
    <div className="og-page" style={{ maxWidth: 1080 }}>
      <PageHeader title={isOut ? 'Çıkış Etiketleme' : 'Giriş Etiketleme'}
        subtitle={`${isOut ? 'Çıkış' : 'Giriş'} belgesi seç → satırları kontrol et → Etiket Tasarımcısı'ndaki düzene göre bas`} />

      <Card className="og-section-card" size="small" title="Kriter">
        <Space wrap size="middle" align="end">
          <div>
            <div style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>{isOut ? 'Çıkış' : 'Giriş'} Belgesi *</div>
            <Select style={{ minWidth: 240 }} showSearch optionFilterProp="label" placeholder={`Belge seç (${docs.length})`}
              value={documentId} onChange={pickDoc}
              options={docs.map((d) => ({ value: d.id, label: `${d.documentNo}${d.status ? ' · ' + d.status : ''}` }))} />
          </div>
          <div>
            <div style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>Etiket Tipi *</div>
            <Select style={{ minWidth: 220 }} showSearch optionFilterProp="label" placeholder="Etiket tipi"
              value={labelTypeId} onChange={setLabelTypeId}
              options={labelTypes.map((t) => ({ value: t.value, label: t.hasLayout ? t.label : `${t.label} (tasarımsız)` }))} />
          </div>
          <div>
            <div style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>Yazıcı</div>
            <Select allowClear style={{ minWidth: 200 }} showSearch optionFilterProp="label" placeholder="(Seçilmedi)"
              value={printerId} onChange={setPrinterId}
              options={printers.map((p) => ({ value: p.value, label: `${p.label}${p.isDefault ? ' ★' : ''}` }))} />
          </div>
          <Button type="primary" icon={<PrinterOutlined />} disabled={!rows.length} onClick={print}>
            {toplamEtiket ? `${toplamEtiket} Etiket Bas` : 'Etiket Bas'}
          </Button>
        </Space>

        {seciliTip && !seciliTip.hasLayout && (
          <Alert type="warning" showIcon style={{ marginTop: 12 }}
            title="Bu etiket tipinin tasarımı yok"
            description="Uyarlamalar › Etiket Tipleri ekranından tipi açıp Etiket Tasarımcısı ile düzeni çizin (boyut + alanlar + barkod). Basım o düzeni birebir kullanır." />
        )}
        {seciliTip?.hasLayout && (
          <div style={{ marginTop: 10 }}>
            <Tag color="blue">{seciliTip.layout.widthMm}×{seciliTip.layout.heightMm} mm</Tag>
            <Tag>{seciliTip.layout.elements.length} eleman</Tag>
            {yazici?.address && <Tag>Hedef: {yazici.address}</Tag>}
          </div>
        )}
      </Card>

      {documentId && (
        <Card className="og-section-card" size="small" title={`Etiketlenecek Satırlar (${rows.length})`}>
          {rows.length === 0 && !loading ? <Empty description="Bu belgede satır yok" /> : (
            <Table<LabelRow> rowKey="key" size="small" loading={loading} dataSource={rows} pagination={false} scroll={{ x: 'max-content' }}
              columns={[
                { title: 'Ürün', dataIndex: 'productCode', render: (v, r) => <>{v}{r.productName ? <span style={{ color: '#888' }}> — {r.productName}</span> : null}</> },
                { title: 'Miktar', dataIndex: 'quantity', align: 'right' as const, width: 90, render: (v, r) => `${v} ${r.unit}` },
                { title: 'Parti', dataIndex: 'batchNo', width: 110, render: (v) => v || '—' },
                { title: 'Seri', dataIndex: 'serialNo', width: 100, render: (v) => v || '—' },
                { title: 'Lokasyon', dataIndex: 'locationCode', width: 110, render: (v) => v || '—' },
                { title: 'Palet', dataIndex: 'palletNo', width: 110, render: (v) => v || '—' },
                {
                  title: 'Kopya', dataIndex: 'adet', align: 'right' as const, width: 90,
                  render: (_, r) => <InputNumber min={1} max={999} value={r.adet}
                    onChange={(v) => setRows((prev) => prev.map((x) => (x.key === r.key ? { ...x, adet: Number(v) || 1 } : x)))} />,
                },
              ]} />
          )}
        </Card>
      )}
    </div>
  )
}
