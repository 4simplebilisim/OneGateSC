import { useEffect, useMemo, useState } from 'react'
import { App, Card, Empty, Select, Space, Table, Tag } from 'antd'
import { axiosInstance } from '../providers/dataProvider'
import { PageHeader } from '../components/PageHeader'

type Opt = { value: number; label: string }
type OpType = { id: number; code: string; name?: string; direction: string }
type Row = {
  malzeme: string; aciklama: string; kaynakLokasyon: string; hedefLokasyon: string
  stokMiktari: string; birim: string; miktar: string
  toplamaKirilimi?: string; toplamaOperasyonu?: string
}

// Öneri Listesi — SALT GÖSTERİM. Var olan bir belge seçilir → o belgenin ürünleri için
// "nereye girilecek"(putaway) / "nereden alınacak"(pick) önerisi bilgi amaçlı gösterilir. Belge OLUŞTURMAZ.
export const SuggestList = ({ mode }: { mode: 'putaway' | 'pick' }) => {
  const { message } = App.useApp()
  const isPut = mode === 'putaway'
  const direction = isPut ? 'INBOUND' : 'OUTBOUND'

  const [warehouses, setWarehouses] = useState<Opt[]>([])
  const [opTypes, setOpTypes] = useState<OpType[]>([])
  const [warehouseId, setWarehouseId] = useState<number | undefined>()
  const [operationTypeId, setOperationTypeId] = useState<number | undefined>()

  const [docs, setDocs] = useState<{ id: number; documentNo: string; status: string }[]>([])
  const [documentId, setDocumentId] = useState<number | undefined>()
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    axiosInstance.get('/api/warehouses', { params: { pageSize: 300 } }).then((r) => {
      const list = Array.isArray(r.data) ? r.data : (r.data.data ?? [])
      setWarehouses(list.map((x: Record<string, unknown>) => ({ value: x.id as number, label: `${x.code} — ${x.name ?? ''}` })))
    })
    axiosInstance.get('/api/operation-types', { params: { pageSize: 300 } }).then((r) => {
      const list = Array.isArray(r.data) ? r.data : (r.data.data ?? [])
      setOpTypes(list as OpType[])
    })
  }, [])

  const opOptions = useMemo<Opt[]>(
    () => opTypes.filter((o) => o.direction === direction).map((o) => ({ value: o.id, label: `${o.code}${o.name ? ' — ' + o.name : ''}` })),
    [opTypes, direction],
  )

  // Kriter değişince belge listesini (seçici) yeniden yükle — yön + (varsa) tesis/operasyon süzgeci
  useEffect(() => {
    setDocumentId(undefined); setRows([])
    axiosInstance
      .get('/api/documents', { params: { direction, pageSize: 300, ...(warehouseId ? { warehouseId } : {}), ...(operationTypeId ? { operationTypeId } : {}) } })
      .then((r) => {
        const list = Array.isArray(r.data) ? r.data : (r.data.data ?? [])
        setDocs(list.map((d: Record<string, unknown>) => ({ id: d.id as number, documentNo: (d.documentNo as string) ?? `#${d.id}`, status: (d.status as string) ?? '' })))
      })
      .catch(() => setDocs([]))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [direction, warehouseId, operationTypeId])

  const pickDocument = (id?: number) => {
    setDocumentId(id)
    if (!id) { setRows([]); return }
    setLoading(true)
    axiosInstance
      .get('/api/suggest-list', { params: { documentId: id } })
      .then((r) => setRows(r.data.rows ?? []))
      .catch((e) => { message.error(e?.response?.data?.error ?? 'Öneri alınamadı'); setRows([]) })
      .finally(() => setLoading(false))
  }

  // Yöne göre öne çıkan öneri kolonu
  const suggestCol = isPut
    ? { title: 'Hedef Lokasyon (öneri)', dataIndex: 'hedefLokasyon', render: (v: string) => <Tag color="green">{v}</Tag> }
    : { title: 'Kaynak Lokasyon (öneri)', dataIndex: 'kaynakLokasyon', render: (v: string) => <Tag color="blue">{v}</Tag> }
  const otherCol = isPut
    ? { title: 'Kaynak Lokasyon', dataIndex: 'kaynakLokasyon' }
    : { title: 'Hedef Lokasyon', dataIndex: 'hedefLokasyon' }

  return (
    <div className="og-page">
      <PageHeader
        title={isPut ? 'Giriş Öneri Listesi' : 'Çıkış Öneri Listesi'}
        subtitle={isPut
          ? 'Bir giriş belgesi seçin → belgedeki ürünler için önerilen yerleştirme lokasyonu (bilgi amaçlı gösterim)'
          : 'Bir çıkış belgesi seçin → belgedeki ürünler için önerilen FEFO toplama lokasyonu (bilgi amaçlı gösterim)'}
      />
      <Card className="og-section-card" size="small" title="Kriter">
        <Space wrap size="middle" align="end">
          <div>
            <div style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>Tesis / Depo</div>
            <Select allowClear style={{ minWidth: 200 }} showSearch optionFilterProp="label" placeholder="(Tümü)"
              value={warehouseId} onChange={setWarehouseId} options={warehouses} />
          </div>
          <div>
            <div style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>Operasyon Tipi</div>
            <Select allowClear style={{ minWidth: 220 }} showSearch optionFilterProp="label" placeholder="(Tümü)"
              value={operationTypeId} onChange={setOperationTypeId} options={opOptions} />
          </div>
          <div>
            <div style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>Belge *</div>
            <Select style={{ minWidth: 260 }} showSearch optionFilterProp="label" placeholder={`Belge seçin (${docs.length})`}
              value={documentId} onChange={pickDocument}
              options={docs.map((d) => ({ value: d.id, label: `${d.documentNo}${d.status ? ' · ' + d.status : ''}` }))} />
          </div>
        </Space>
      </Card>

      {documentId && (
        <Card className="og-section-card" size="small" title={`Belge Ürünleri & Öneriler (${rows.length})`}>
          {rows.length === 0 && !loading ? (
            <Empty description="Bu belgede satır yok" />
          ) : (
            <Table<Row> rowKey={(r) => r.malzeme} size="small" loading={loading} dataSource={rows} pagination={{ pageSize: 20 }} scroll={{ x: true }}
              columns={[
                { title: 'Malzeme', dataIndex: 'malzeme', fixed: 'left' as const },
                { title: 'Açıklama', dataIndex: 'aciklama', ellipsis: true },
                otherCol,
                suggestCol,
                { title: 'Stok Miktarı', dataIndex: 'stokMiktari', align: 'right' as const },
                // Toplama sırası parametresi tanımlıysa kırılım + o kırılımın operasyonu
                { title: 'Toplama Kırılımı', dataIndex: 'toplamaKirilimi', width: 130, render: (v: string) => v || '—' },
                { title: 'Toplama Op.', dataIndex: 'toplamaOperasyonu', width: 120, render: (v: string) => v || '—' },
                { title: 'Birim', dataIndex: 'birim' },
                { title: 'Miktar', dataIndex: 'miktar', align: 'right' as const },
              ]} />
          )}
        </Card>
      )}
    </div>
  )
}
