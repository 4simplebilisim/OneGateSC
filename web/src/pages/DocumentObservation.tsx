import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import { useNavigate } from 'react-router-dom'
import { App, Button, Card, DatePicker, Input, Select, Space, Table, Tag } from 'antd'
import { ReloadOutlined, DownloadOutlined, EyeOutlined, CheckCircleOutlined, SendOutlined, RollbackOutlined, ClearOutlined, DeleteOutlined } from '@ant-design/icons'
import type { ReactNode } from 'react'
import dayjs, { type Dayjs } from 'dayjs'
import { axiosInstance } from '../providers/dataProvider'
import { paramInt } from '../params'
import { PageHeader } from '../components/PageHeader'
import { canWrite } from '../formConfig'

type Opt = { value: number; label: string }
type Facility = { id: number; code: string; name: string }
type Op = { id: number; code: string; name?: string; direction: string; facilityId: number | null }
type Doc = {
  id: number; documentNo: string; status: string; documentDate: string; completedAt: string | null
  operationType?: { code?: string; name?: string; direction?: string }
  documentStatus?: { code?: string; name?: string; color?: string }
  partner?: { code?: string; name?: string } | null
  _count?: { lines?: number }
}

const { RangePicker } = DatePicker
const lbl: CSSProperties = { fontSize: 12, color: 'var(--og-muted)', marginBottom: 2 }
const arr = (d: unknown) => (Array.isArray(d) ? d : ((d as { data?: unknown[] })?.data ?? []))
const codeName = (c?: string, n?: string) => (c ? (n ? `${c} — ${n}` : c) : '—')
const day = (v?: string | null) => (v ? v.slice(0, 10) : '—')
// Belge Durumu toggle'ları (StokBar Gözlem gibi) — kanonik kodlar
const STATUS_TOGGLES = [
  { code: 'BKL', label: 'Bekliyor' }, { code: 'TPL', label: 'Toplanıyor' }, { code: 'OBK', label: 'Onay Bekliyor' },
  { code: 'ONY', label: 'Onaylandı' }, { code: 'IPT', label: 'İptal' },
]
const DIR_LABEL: Record<string, string> = { INBOUND: 'Giriş', OUTBOUND: 'Çıkış', INTERNAL: 'Transfer', COUNT: 'Sayım' }
// Toplu aksiyonlar — StokBar Gözlem toolbar'ı gibi AYRI butonlar (bulk-action ucu)
type ActionDef = { value: string; label: string; icon: ReactNode; primary?: boolean; ghost?: boolean; danger?: boolean }
const ACTIONS: ActionDef[] = [
  { value: 'confirm', label: 'Onaya Gönder', icon: <SendOutlined />, primary: true, ghost: true },
  { value: 'complete', label: 'Onay', icon: <CheckCircleOutlined />, primary: true },
  { value: 'reverse', label: 'Onay İptal', icon: <RollbackOutlined />, danger: true },
  { value: 'cancel-picking', label: 'Toplama İptal', icon: <ClearOutlined /> },
  { value: 'cancel', label: 'Sil', icon: <DeleteOutlined />, danger: true },
]

// Belge Gözlem — zengin filtreli inline liste + çoklu seçim ile toplu aksiyon (Onay/Onay İptal/Toplama İptal/Sil).
export const DocumentObservation = ({ direction }: { direction: 'INBOUND' | 'OUTBOUND' | 'INTERNAL' }) => {
  const navigate = useNavigate()
  const { message, modal } = App.useApp()
  const writable = canWrite()
  const [facilities, setFacilities] = useState<Facility[]>([])
  const [ops, setOps] = useState<Op[]>([])
  const [partners, setPartners] = useState<Opt[]>([])
  const [facilityId, setFacilityId] = useState<number>()
  const [operationTypeId, setOperationTypeId] = useState<number>()
  const [partnerId, setPartnerId] = useState<number>()
  const [documentNo, setDocumentNo] = useState('')
  const [range, setRange] = useState<[Dayjs | null, Dayjs | null] | null>(null)
  const [statusSel, setStatusSel] = useState<string[]>(STATUS_TOGGLES.map((s) => s.code)) // hepsi açık (StokBar gibi)
  const [rows, setRows] = useState<Doc[]>([])
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState<number[]>([]) // toplu aksiyon için seçili belgeler
  const [busy, setBusy] = useState<string | null>(null) // hangi aksiyon yürüyor (buton spinner'ı)

  useEffect(() => {
    axiosInstance.get('/api/facilities', { params: { pageSize: 300 } }).then((r) => setFacilities(arr(r.data) as Facility[]))
    axiosInstance.get('/api/operation-types', { params: { pageSize: 300 } }).then((r) => setOps(arr(r.data) as Op[]))
    axiosInstance.get('/api/partners', { params: { pageSize: 500 } }).then((r) => setPartners((arr(r.data) as { id: number; code: string; name?: string }[]).map((x) => ({ value: x.id, label: codeName(x.code, x.name) }))))
    // Parametre: GozlemBasTarihiGunEkle / GozlemBitTarihiGunEkle — açılışta varsayılan tarih aralığı (bugün+N gün)
    Promise.all([paramInt('GozlemBasTarihiGunEkle'), paramInt('GozlemBitTarihiGunEkle')]).then(([bas, bit]) => {
      if (bas != null || bit != null) setRange([bas != null ? dayjs().add(bas, 'day') : null, bit != null ? dayjs().add(bit, 'day') : null])
    })
  }, [])

  // Operasyonlar bu yöne + (seçili tesise) göre
  const opOpts = useMemo<Opt[]>(
    () => ops.filter((o) => o.direction === direction && (!facilityId || o.facilityId === facilityId || o.facilityId == null)).map((o) => ({ value: o.id, label: codeName(o.code, o.name) })),
    [ops, direction, facilityId],
  )

  const query = () => {
    setLoading(true); setSelected([])
    const params: Record<string, string> = { direction }
    if (facilityId) params.facilityId = String(facilityId)
    if (operationTypeId) params.operationTypeId = String(operationTypeId)
    if (partnerId) params.partnerId = String(partnerId)
    if (documentNo.trim()) params.documentNo = documentNo.trim()
    if (range?.[0]) params.dateFrom = range[0].format('YYYY-MM-DD')
    if (range?.[1]) params.dateTo = range[1].format('YYYY-MM-DD')
    if (statusSel.length > 0 && statusSel.length < STATUS_TOGGLES.length) params.statusCodes = statusSel.join(',')
    axiosInstance.get('/api/documents', { params })
      .then((r) => setRows(arr(r.data) as Doc[]))
      .catch((e) => message.error((e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Sorgulanamadı'))
      .finally(() => setLoading(false))
  }
  // İlk açılış + dropdown/toggle/tarih değişiminde otomatik sorgula (Belge No → Enter/Sorgula)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(query, [direction, facilityId, operationTypeId, partnerId, statusSel, range])

  const toggleStatus = (code: string) => setStatusSel((prev) => (prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]))

  // Seçili belgelere toplu aksiyon — her aksiyon AYRI buton (Onaya Gönder/Onay/Onay İptal/Toplama İptal/Sil)
  const apply = (a: ActionDef) => {
    if (selected.length === 0) { message.warning('Belge seçin'); return }
    modal.confirm({
      title: `${selected.length} belgeye "${a.label}" uygulansın mı?`,
      okText: a.label, cancelText: 'Vazgeç', okButtonProps: { danger: a.danger },
      onOk: async () => {
        setBusy(a.value)
        try {
          const r = await axiosInstance.post('/api/documents/bulk-action', { ids: selected, action: a.value })
          message.success(`${r.data.ok} başarılı, ${r.data.failedCount} başarısız`)
          if (r.data.failedCount) message.warning(r.data.failed.map((f: { id: number; error: string }) => `#${f.id}: ${f.error}`).join(' · '))
          query()
        } catch (e) {
          message.error((e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'İşlem başarısız')
        } finally { setBusy(null) }
      },
    })
  }

  const exportCsv = () => {
    const head = ['Belge No', 'Operasyon', 'Yön', 'Cari', 'Durum', 'Belge Tarihi', 'Tamamlanma', 'Satır']
    const lines = rows.map((d) => [
      d.documentNo, codeName(d.operationType?.code, d.operationType?.name), DIR_LABEL[d.operationType?.direction ?? ''] ?? '',
      codeName(d.partner?.code, d.partner?.name), d.documentStatus?.name ?? d.status, day(d.documentDate), day(d.completedAt), String(d._count?.lines ?? 0),
    ].map((c) => `"${String(c).replace(/"/g, '""')}"`).join(';'))
    const csv = '﻿' + [head.join(';'), ...lines].join('\r\n')
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
    a.download = `belge-gozlem-${direction.toLowerCase()}.csv`
    a.click()
  }

  return (
    <div className="og-page">
      <PageHeader title={`Belge Gözlem — ${DIR_LABEL[direction]}`} subtitle="Filtreli izleme + çoklu seçimle toplu aksiyon (Onay / Onay İptal / Toplama İptal / Sil)" />

      <Card className="og-section-card" size="small" title="Filtreler">
        <Space wrap size={[16, 12]} align="end">
          <div><div style={lbl}>Tesis</div>
            <Select style={{ minWidth: 160 }} allowClear showSearch optionFilterProp="label" placeholder="Tüm tesisler" value={facilityId}
              options={facilities.map((f) => ({ value: f.id, label: codeName(f.code, f.name) }))}
              onChange={(v) => { setFacilityId(v); setOperationTypeId(undefined) }} /></div>
          <div><div style={lbl}>Operasyon Tipi</div>
            <Select style={{ minWidth: 180 }} allowClear showSearch optionFilterProp="label" placeholder="Tüm operasyonlar" value={operationTypeId} options={opOpts} onChange={setOperationTypeId} /></div>
          <div><div style={lbl}>Cari</div>
            <Select style={{ minWidth: 200 }} allowClear showSearch optionFilterProp="label" placeholder="Tüm cariler" value={partnerId} options={partners} onChange={setPartnerId} /></div>
          <div><div style={lbl}>Belge No</div>
            <Input.Search style={{ width: 160 }} placeholder="Belge no" value={documentNo} onChange={(e) => setDocumentNo(e.target.value)} onSearch={query} allowClear /></div>
          <div><div style={lbl}>Belge Tarihi</div>
            <RangePicker style={{ width: 240 }} format="YYYY-MM-DD" value={range} onChange={(v) => setRange(v)} allowEmpty={[true, true]} /></div>
          <Button icon={<ReloadOutlined />} onClick={query} loading={loading}>Sorgula</Button>
          <Button icon={<DownloadOutlined />} onClick={exportCsv} disabled={!rows.length}>Excel</Button>
        </Space>
        <div style={{ marginTop: 12 }}>
          <span style={{ ...lbl, marginRight: 8, display: 'inline' }}>Durum:</span>
          {STATUS_TOGGLES.map((s) => (
            <Tag.CheckableTag key={s.code} checked={statusSel.includes(s.code)} onChange={() => toggleStatus(s.code)} style={{ marginInlineEnd: 6, padding: '2px 10px', borderRadius: 12 }}>
              {s.label}
            </Tag.CheckableTag>
          ))}
        </div>
      </Card>

      {writable && (
        <Card className="og-toolbar" size="small" style={{ marginBottom: 14 }} styles={{ body: { padding: '10px 14px' } }}>
          <Space wrap size={8}>
            <span style={{ fontSize: 12.5, color: 'var(--og-muted)', marginRight: 4 }}>Seçili <b style={{ color: 'var(--og-ink)' }}>{selected.length}</b> belge:</span>
            {ACTIONS.map((a) => (
              <Button key={a.value} type={a.primary ? 'primary' : 'default'} ghost={a.ghost} danger={a.danger} icon={a.icon}
                disabled={selected.length === 0} loading={busy === a.value} onClick={() => apply(a)}>
                {a.label}
              </Button>
            ))}
          </Space>
        </Card>
      )}

      <Card className="og-section-card" size="small" title={`Belgeler (${rows.length})`}>
        <Table<Doc>
          rowKey="id" size="small" dataSource={rows} loading={loading} scroll={{ x: 1000 }}
          pagination={{ pageSize: 25, showSizeChanger: true, size: 'small', showTotal: (t) => `Toplam ${t}` }}
          locale={{ emptyText: 'Belge yok' }}
          rowSelection={writable ? { selectedRowKeys: selected, onChange: (k) => setSelected(k as number[]) } : undefined}
          onRow={(row) => ({ onDoubleClick: () => navigate(`/documents/${row.id}`), style: { cursor: 'pointer' } })}
          columns={[
            { title: 'Belge No', dataIndex: 'documentNo', width: 150 },
            { title: 'Operasyon', key: 'op', render: (_, r) => codeName(r.operationType?.code, r.operationType?.name), ellipsis: true },
            { title: 'Cari', key: 'cari', render: (_, r) => codeName(r.partner?.code, r.partner?.name), ellipsis: true },
            { title: 'Durum', key: 'durum', width: 130, render: (_, r) => r.documentStatus?.name ? <Tag color={r.documentStatus.color || 'default'}>{r.documentStatus.name}</Tag> : <Tag>{r.status}</Tag> },
            { title: 'Belge Tarihi', dataIndex: 'documentDate', width: 120, render: (v: string) => day(v) },
            { title: 'Tamamlanma', dataIndex: 'completedAt', width: 120, render: (v: string | null) => day(v) },
            { title: 'Satır', key: 'lines', width: 70, align: 'right', render: (_, r) => r._count?.lines ?? 0 },
            { title: '', key: 'izle', width: 70, render: (_, r) => <Button size="small" type="link" icon={<EyeOutlined />} onClick={() => navigate(`/documents/${r.id}`)}>İzle</Button> },
          ]}
        />
      </Card>
    </div>
  )
}
