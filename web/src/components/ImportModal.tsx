import { useState } from 'react'
import { App, Alert, Button, Modal, Space, Table, Tag, Typography, Upload } from 'antd'
import { UploadOutlined, DownloadOutlined, FileExcelOutlined } from '@ant-design/icons'
import * as XLSX from 'xlsx'
import { axiosInstance } from '../providers/dataProvider'

export type ImportColumn = {
  key: string; header: string; required?: boolean
  hint?: string      // "Açıklamalar" sayfasında ne yazacağını anlatır
  example?: string   // "Şablon" sayfasındaki örnek satırda görünür
}
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

  // Örnek satır: "ne yazacağım?" sorusunu şablonun kendisi cevaplasın.
  // Kullanıcı silmeyi unutursa yüklemede ATLANIR (bkz. parseFile → ornekSatirMi).
  const ornekSatir = columns.map((c) => c.example ?? '')
  const ornekVarMi = ornekSatir.some((v) => v !== '')

  const downloadTemplate = () => {
    const wb = XLSX.utils.book_new()

    // 1. sayfa — doldurulacak şablon: başlık + (varsa) örnek satır
    const veri = [columns.map((c) => c.header)]
    if (ornekVarMi) veri.push(ornekSatir)
    const ws = XLSX.utils.aoa_to_sheet(veri)
    ws['!cols'] = columns.map((c) => ({ wch: Math.max(12, Math.min(28, c.header.length + 6, (c.example?.length ?? 0) + 4)) }))
    XLSX.utils.book_append_sheet(wb, ws, 'Şablon')

    // 2. sayfa — sütun sözlüğü: ne anlama geliyor, zorunlu mu, nasıl yazılır
    const aciklama = [
      ['Sütun', 'Zorunlu', 'Açıklama', 'Örnek'],
      ...columns.map((c) => [c.header, c.required ? 'EVET' : 'hayır', c.hint ?? '', c.example ?? '']),
      [],
      ['NASIL KULLANILIR', '', '', ''],
      ['1', '', '"Şablon" sayfasındaki örnek satırın üzerine kendi verinizi yazın ya da altına eklemeye devam edin.', ''],
      ['2', '', 'Örnek satırı silmezseniz sorun olmaz — yüklerken otomatik atlanır.', ''],
      ['3', '', 'Başlık satırını DEĞİŞTİRMEYİN; sütun eşleştirmesi başlık adına göre yapılır.', ''],
      ['4', '', 'Sütun sırası önemsizdir, fazladan sütunlar yok sayılır.', ''],
      ['5', '', 'Boş bırakılan opsiyonel sütunlar dikkate alınmaz.', ''],
      ['6', '', 'Hatalı satırlar atlanır; yükleme sonunda satır numarasıyla listelenir.', ''],
    ]
    const ws2 = XLSX.utils.aoa_to_sheet(aciklama)
    ws2['!cols'] = [{ wch: 22 }, { wch: 9 }, { wch: 82 }, { wch: 26 }]
    XLSX.utils.book_append_sheet(wb, ws2, 'Açıklamalar')

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
        // Şablondaki örnek satır silinmemişse içe aktarma (aksi halde her yüklemede sahte kayıt oluşurdu)
        const ornekSatirMi = (o: Record<string, unknown>) =>
          ornekVarMi && columns.every((c) => !c.example || norm(o[c.key]) === norm(c.example))
        const atlananOrnek = mapped.filter(ornekSatirMi).length
        const temiz = mapped.filter((o) => !ornekSatirMi(o))
        if (!temiz.length) {
          message.warning(atlananOrnek
            ? 'Dosyada yalnız şablonun örnek satırı var — kendi verinizi girin'
            : 'Tanınan sütun/satır yok — şablon başlıklarını kullanın')
          return
        }
        if (atlananOrnek) message.info(`${atlananOrnek} örnek satır atlandı`)
        setRows(temiz); setFileName(file.name); setResult(null)
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
      { key: 'code', header: 'Kod', required: true, example: 'URN-0001',
        hint: 'Ürünün benzersiz kodu. Bu kodda ürün zaten varsa satır atlanır ve hata listesinde "Kod zaten var" olarak görünür.' },
      { key: 'name', header: 'Ad', required: true, example: 'Paslanmaz Vida M8x40',
        hint: 'Ürünün tam adı. Listelerde "Kod — Ad" biçiminde gösterilir.' },
      { key: 'shortName', header: 'Kısa Ad', example: 'Vida M8x40',
        hint: 'El terminali gibi dar ekranlarda kullanılan kısaltma. Boşsa Ad kullanılır.' },
      { key: 'unitCode', header: 'Birim', example: 'ADET',
        hint: 'Ana ölçü biriminin KODU (Uyarlamalar › Birimler). Bulunamazsa satır atlanır. Örn: ADET, KG, MT, BX' },
      { key: 'groupCode', header: 'Ürün Grubu', example: 'MEKANIK',
        hint: 'Ürün grubunun KODU (Tanımlar › Ürün Grupları). Boş bırakılabilir; yazılıp bulunamazsa satır atlanır.' },
      { key: 'typeCode', header: 'Ürün Tipi', example: 'STANDART',
        hint: 'Ürün tipinin KODU (Tanımlar › Ürün Tipleri). Boş bırakılabilir; yazılıp bulunamazsa satır atlanır.' },
      { key: 'manufacturerCode', header: 'Üretici Kodu', example: 'ACME-8842',
        hint: 'Üreticinin kendi parça numarası. Serbest metin, doğrulanmaz.' },
      { key: 'shelfLifeDays', header: 'Raf Ömrü (gün)', example: '365',
        hint: 'Sayı. SKT hesabında kullanılır: son kullanma = üretim tarihi + raf ömrü. Takip edilmiyorsa boş bırakın.' },
      { key: 'isActive', header: 'Aktif', example: 'Evet',
        hint: 'Evet / Hayır (Aktif / Pasif, 1 / 0 da kabul edilir). Boş bırakılırsa Evet sayılır.' },
    ],
  },
  partners: {
    title: 'Müşteri / Cari İçe Aktar (Excel)', templateName: 'cari-sablon.xlsx',
    columns: [
      { key: 'code', header: 'Kod', required: true, example: 'CR-0001',
        hint: 'Carinin benzersiz kodu. Bu kodda cari zaten varsa satır atlanır.' },
      { key: 'name', header: 'Ad', required: true, example: 'Acme Makina San. Tic. A.Ş.',
        hint: 'Ticari unvan.' },
      { key: 'type', header: 'Tip', example: 'Müşteri',
        hint: 'Müşteri / Tedarikçi / Her İkisi. Boş bırakılırsa Müşteri sayılır. Satınalma ekranlarında yalnız Tedarikçi ve Her İkisi görünür.' },
      { key: 'taxNumber', header: 'Vergi No', example: '1234567890',
        hint: 'Vergi kimlik numarası ya da TCKN. Serbest metin, doğrulanmaz.' },
      { key: 'phone', header: 'Telefon', example: '+90 212 555 44 33',
        hint: 'Serbest metin, biçim zorunluluğu yok.' },
      { key: 'email', header: 'E-posta', example: 'siparis@acme.com.tr',
        hint: 'Biçim DOĞRULANIR — geçersizse satır atlanır. Boş bırakılabilir.' },
      { key: 'city', header: 'Şehir', example: 'İstanbul', hint: 'Serbest metin.' },
      { key: 'address', header: 'Adres', example: 'Organize Sanayi Bölgesi 5. Cadde No:12', hint: 'Serbest metin.' },
      { key: 'groupCode', header: 'Cari Grubu', example: 'YURTICI',
        hint: 'Cari grubunun KODU (Tanımlar › Müşteri Grupları). Boş bırakılabilir; yazılıp bulunamazsa satır atlanır.' },
    ],
  },
  documents: {
    title: 'Belge İçe Aktar (Excel)', templateName: 'belge-sablon.xlsx',
    note: 'Aynı Belge No\'lu satırlar TEK belge olur; başlık (Operasyon/Cari/Depo) grubun ilk satırından alınır. Kodlar (Operasyon/Ürün/Birim/Lokasyon/Statü) ile yazılır. Belgeler TASLAK oluşur; sonra normal akışla onaylanır.',
    columns: [
      { key: 'documentNo', header: 'Belge No', required: true, example: 'MK-2026-0001',
        hint: 'AYNI belge no yazılan satırlar TEK belgenin satırları olur. Örnek satırın altına aynı belge no ile devam ederek çok kalemli belge oluşturabilirsiniz.' },
      { key: 'operationCode', header: 'Operasyon', required: true, example: 'MK001',
        hint: 'Operasyon tipinin KODU (Tanımlar › Operasyon Tipleri). Belgenin yönünü (giriş/çıkış/transfer) ve kurallarını bu belirler. Belge başına tek operasyon — grubun ilk satırından alınır.' },
      { key: 'partnerCode', header: 'Cari', example: 'CR-0001',
        hint: 'Cari KODU. Girişte tedarikçi, çıkışta müşteri. Boş bırakılabilir.' },
      { key: 'warehouseCode', header: 'Depo', example: 'K-WH',
        hint: 'Depo KODU. Boş bırakılırsa operasyonun tesisinden çözülür.' },
      { key: 'productCode', header: 'Ürün', required: true, example: 'URN-0001',
        hint: 'Ürün KODU (barkod değil). Bulunamazsa satır atlanır.' },
      { key: 'quantity', header: 'Miktar', required: true, example: '120',
        hint: 'Sayı, sıfırdan büyük olmalı. Ondalık için nokta kullanın (12.5).' },
      { key: 'unitCode', header: 'Birim', required: true, example: 'ADET',
        hint: 'Birim KODU. Ürünün ana birimi ya da tanımlı alternatif birimlerinden biri.' },
      { key: 'targetLocationCode', header: 'Hedef Lokasyon', example: 'A1-1-1-01',
        hint: 'GİRİŞ ve TRANSFER için malın konulacağı lokasyon KODU. Çıkış belgelerinde boş bırakılır.' },
      { key: 'targetStatusCode', header: 'Hedef Statü', example: 'SAGLAM',
        hint: 'Stok statüsünün KODU (Uyarlamalar › Statüler). Operasyonda statü kuralı tanımlıysa ona uymalıdır.' },
      { key: 'batchNo', header: 'Parti', example: 'L2609',
        hint: 'Parti / lot numarası. İzlenebilirlik ve FEFO için kullanılır. Takip edilmiyorsa boş bırakın.' },
      { key: 'serialNo', header: 'Seri No', example: '',
        hint: 'Tekil seri numarası. Seri takipli ürünlerde satır başına tek adet olur.' },
      { key: 'note', header: 'Açıklama', example: 'Sipariş 4711 kalem 1',
        hint: 'Satır açıklaması. Serbest metin.' },
    ],
  },
}
