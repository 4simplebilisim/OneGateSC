import { useState } from 'react'
import { App, Alert, Button, Modal, Space, Table, Tag, Typography, Upload } from 'antd'
import { UploadOutlined, DownloadOutlined, FileExcelOutlined } from '@ant-design/icons'
import * as XLSX from 'xlsx'
import { axiosInstance } from '../providers/dataProvider'

export type ImportColumn = { key: string; header: string; required?: boolean; hint?: string }
type ImportResult = { created: number; total: number; errors: { row: number; error: string }[] }
const errMsg = (e: unknown, f: string) => (e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? f
const norm = (s: unknown) => String(s ?? '').trim().toLocaleLowerCase('tr')

// Yeniden-kullanılabilir Excel içe aktarma: şablon indir → doldur → yükle → önizle → içe aktar → satır-bazlı sonuç.
// Excel FRONTEND'de parse edilir (SheetJS), KANONİK anahtarlı satırlar /api/<resource>/import'a gider.
export const ImportModal = ({ resource, title, columns, templateName, note, onDone }: {
  resource: string; title: string; columns: ImportColumn[]; templateName: string; note?: string; onDone?: () => void
}) => {
  const { message } = App.useApp()
  const [open, setOpen] = useState(false)
  const [rows, setRows] = useState<Record<string, unknown>[]>([])
  const [fileName, setFileName] = useState('')
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)

  const reset = () => { setRows([]); setFileName(''); setResult(null) }
  const close = () => { setOpen(false); reset() }

  const downloadTemplate = () => {
    const ws = XLSX.utils.aoa_to_sheet([columns.map((c) => c.header)]) // yalnız başlık satırı (örnek satır import edilmesin)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Şablon')
    XLSX.writeFile(wb, templateName)
  }

  const parseFile = (file: File) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(e.target?.result, { type: 'array' })
        const ws = wb.Sheets[wb.SheetNames[0]]
        if (!ws) { message.error('Excel boş'); return }
        const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: '' })
        const headerToKey = new Map(columns.map((c) => [norm(c.header), c.key]))
        const mapped = raw
          .map((r) => {
            const o: Record<string, unknown> = {}
            for (const [h, v] of Object.entries(r)) { const k = headerToKey.get(norm(h)); if (k) o[k] = v }
            return o
          })
          .filter((o) => Object.values(o).some((v) => String(v ?? '').trim() !== '')) // tamamen boş satırları at
        if (!mapped.length) { message.warning('Tanınan sütun/satır yok — şablon başlıklarını kullanın'); return }
        setRows(mapped); setFileName(file.name); setResult(null)
      } catch { message.error('Excel okunamadı — dosya bozuk olabilir') }
    }
    reader.readAsArrayBuffer(file)
    return false // AntD Upload'ın kendi POST'unu engelle
  }

  const commit = async () => {
    if (!rows.length) return
    setImporting(true)
    try {
      const r = await axiosInstance.post(`/api/${resource}/import`, { rows })
      setResult(r.data as ImportResult)
      if ((r.data as ImportResult).created > 0) { message.success(`${(r.data as ImportResult).created} kayıt içe aktarıldı`); onDone?.() }
    } catch (e) { message.error(errMsg(e, 'İçe aktarılamadı')) } finally { setImporting(false) }
  }

  const req = columns.filter((c) => c.required).map((c) => c.header).join(', ')
  const previewCols = columns.map((c) => ({ title: c.header, dataIndex: c.key, ellipsis: true, render: (v: unknown) => String(v ?? '') }))

  return (
    <>
      <Button icon={<FileExcelOutlined />} onClick={() => setOpen(true)}>İçe Aktar</Button>
      <Modal open={open} onCancel={close} title={title} width={860} destroyOnHidden
        footer={result
          ? [<Button key="n" onClick={reset}>Yeni Dosya</Button>, <Button key="c" type="primary" onClick={close}>Kapat</Button>]
          : [<Button key="c" onClick={close}>İptal</Button>, <Button key="i" type="primary" icon={<FileExcelOutlined />} loading={importing} disabled={!rows.length} onClick={commit}>{rows.length ? `${rows.length} Satırı İçe Aktar` : 'İçe Aktar'}</Button>]}>
        <Space orientation="vertical" style={{ width: '100%' }} size="middle">
          <Alert type="info" showIcon
            title="1) Şablonu indir → doldur → 2) Excel yükle → önizle → 3) İçe Aktar"
            description={<>Zorunlu sütunlar: <b>{req || '—'}</b>. {note ?? <>Referans alanlar (Birim/Grup/Tip) <b>KOD</b> ile yazılır; kod zaten varsa o satır atlanır ve hata listesinde görünür.</>} Boş bırakılan opsiyonel sütunlar dikkate alınmaz.</>} />
          <Space wrap>
            <Button icon={<DownloadOutlined />} onClick={downloadTemplate}>Şablon İndir</Button>
            <Upload beforeUpload={parseFile} accept=".xlsx,.xls" showUploadList={false} maxCount={1}>
              <Button icon={<UploadOutlined />} type="primary" ghost>Excel Yükle</Button>
            </Upload>
            {fileName && <Typography.Text type="secondary">{fileName} — <Tag color="blue">{rows.length} satır</Tag></Typography.Text>}
          </Space>
          {rows.length > 0 && !result && (
            <Table size="small" rowKey={(_, i) => String(i)} dataSource={rows} columns={previewCols}
              pagination={{ pageSize: 8, size: 'small' }} scroll={{ x: 'max-content' }} title={() => <b>Önizleme ({rows.length} satır)</b>} />
          )}
          {result && (
            <>
              <Alert type={result.errors.length ? 'warning' : 'success'} showIcon
                title={`${result.created}/${result.total} kayıt aktarıldı${result.errors.length ? ` — ${result.errors.length} satır atlandı` : ' — tümü başarılı'}`} />
              {result.errors.length > 0 && (
                <Table size="small" rowKey="row" dataSource={result.errors} pagination={{ pageSize: 6, size: 'small' }}
                  columns={[{ title: 'Satır', dataIndex: 'row', width: 70 }, { title: 'Hata', dataIndex: 'error' }]} />
              )}
            </>
          )}
        </Space>
      </Modal>
    </>
  )
}

// Kaynak-bazlı içe aktarma sütun tanımları (Excel başlığı → kanonik anahtar). Backend /import kanonik anahtar bekler.
export const IMPORT_CONFIGS: Record<string, { title: string; templateName: string; columns: ImportColumn[]; note?: string }> = {
  products: {
    title: 'Ürün İçe Aktar (Excel)', templateName: 'urun-sablon.xlsx',
    columns: [
      { key: 'code', header: 'Kod', required: true }, { key: 'name', header: 'Ad', required: true },
      { key: 'shortName', header: 'Kısa Ad' }, { key: 'unitCode', header: 'Birim' },
      { key: 'groupCode', header: 'Ürün Grubu' }, { key: 'typeCode', header: 'Ürün Tipi' },
      { key: 'manufacturerCode', header: 'Üretici Kodu' }, { key: 'shelfLifeDays', header: 'Raf Ömrü (gün)' },
      { key: 'isActive', header: 'Aktif' },
    ],
  },
  partners: {
    title: 'Müşteri / Cari İçe Aktar (Excel)', templateName: 'cari-sablon.xlsx',
    columns: [
      { key: 'code', header: 'Kod', required: true }, { key: 'name', header: 'Ad', required: true },
      { key: 'type', header: 'Tip' }, { key: 'taxNumber', header: 'Vergi No' },
      { key: 'phone', header: 'Telefon' }, { key: 'email', header: 'E-posta' },
      { key: 'city', header: 'Şehir' }, { key: 'address', header: 'Adres' }, { key: 'groupCode', header: 'Cari Grubu' },
    ],
  },
  documents: {
    title: 'Belge İçe Aktar (Excel)', templateName: 'belge-sablon.xlsx',
    note: 'Aynı Belge No\'lu satırlar TEK belge olur; başlık (Operasyon/Cari/Depo) grubun ilk satırından alınır. Kodlar (Operasyon/Ürün/Birim/Lokasyon/Statü) ile yazılır. Belgeler TASLAK oluşur; sonra normal akışla onaylanır.',
    columns: [
      { key: 'documentNo', header: 'Belge No', required: true }, { key: 'operationCode', header: 'Operasyon', required: true },
      { key: 'partnerCode', header: 'Cari' }, { key: 'warehouseCode', header: 'Depo' },
      { key: 'productCode', header: 'Ürün', required: true }, { key: 'quantity', header: 'Miktar', required: true },
      { key: 'unitCode', header: 'Birim', required: true }, { key: 'targetLocationCode', header: 'Hedef Lokasyon' },
      { key: 'targetStatusCode', header: 'Hedef Statü' }, { key: 'batchNo', header: 'Parti' },
      { key: 'serialNo', header: 'Seri No' }, { key: 'note', header: 'Açıklama' },
    ],
  },
}
