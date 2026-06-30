import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Alert, App, Button, Card, Descriptions, Input, Modal, Select, Space, Table, Tag, Badge, Spin } from 'antd'
import { ArrowLeftOutlined, HistoryOutlined } from '@ant-design/icons'
import { axiosInstance } from '../providers/dataProvider'
import { PageHeader } from '../components/PageHeader'
import { DETAIL_ACTIONS } from '../detailActions'
import { canWrite } from '../formConfig'
import { FK_RESOURCE, FK_LABEL } from '../fieldMeta'

const STATUS_COLOR: Record<string, string> = {
  COMPLETED: 'green', CONFIRMED: 'blue', PLANNED: 'gold', IN_PROGRESS: 'cyan', CANCELLED: 'red',
  DRAFT: 'default', SUBMITTED: 'gold', APPROVED: 'green', REJECTED: 'red',
  COUNTING: 'gold', PENDING: 'gold', PASSED: 'green', FAILED: 'red', ISSUED: 'blue', PAID: 'green',
}

const PRETTY: Record<string, string> = {
  id: '#', code: 'Kod', name: 'Ad', shortName: 'Kısa Ad', barcode: 'Barkod', isActive: 'Aktif',
  documentNo: 'Belge No', orderNo: 'No', status: 'Durum', type: 'Tip', direction: 'Yön',
  quantity: 'Miktar', mainQty: 'Miktar', reservedQty: 'Rezerve', batchNo: 'Parti', serialNo: 'Seri',
  createdAt: 'Oluşturma', updatedAt: 'Güncelleme', lineNo: 'Satır', priority: 'Öncelik', note: 'Not',
  documentDate: 'Belge Tarihi', completedAt: 'Tamamlanma', referenceQty: 'Referans Mik.', collectedQty: 'Toplanan',
  preparedQty: 'Hazırlanan', expiryDate: 'SKT', productionDate: 'Üretim Tar.', poNo: 'PO', poLine: 'PO Satır', palletNo: 'Palet No',
}
// FK alanları FK_LABEL'den, diğerleri PRETTY'den; yoksa ham anahtar
const pretty = (k: string) => FK_LABEL[k] ?? PRETTY[k] ?? k

const fmt = (v: unknown) => {
  if (v === null || v === undefined || v === '') return <span style={{ color: '#c0cad9' }}>—</span>
  if (typeof v === 'boolean') return v ? <Badge status="success" text="Evet" /> : <Badge color="#cbd5e1" text="Hayır" />
  if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(v)) return v.slice(0, 19).replace('T', ' ')
  return String(v)
}

export const GenericDetail = ({ resource, label }: { resource: string; label: string }) => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { message } = App.useApp()
  const [record, setRecord] = useState<Record<string, unknown> | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<string | null>(null)
  // Koşul kırma akışı: complete 409 "kırma gerekli" alınca şifre+neden modalı
  const [breakReq, setBreakReq] = useState<{ action: string; busyKey?: string; err: string } | null>(null)
  const [breakReasons, setBreakReasons] = useState<{ value: string; label: string }[]>([])
  const [bpw, setBpw] = useState('')
  const [brc, setBrc] = useState<string | undefined>()
  const [breaking, setBreaking] = useState(false)
  // FK alanlarını id → "kod — ad" çöz (başlık + satırlar) — ham id yerine isim göster
  const [refMaps, setRefMaps] = useState<Record<string, Record<number, string>>>({})

  const load = useCallback(() => {
    setLoading(true)
    axiosInstance
      .get(`/api/${resource}/${id}`)
      .then((r) => setRecord(r.data))
      .catch((e) => message.error(e?.response?.data?.error ?? 'Yüklenemedi'))
      .finally(() => setLoading(false))
  }, [resource, id, message])

  useEffect(load, [load])

  // Kayıttaki + satırlardaki FK alanları → kaynak; benzersiz kaynakları çekip id→ad map'i kur
  const fkFieldMap = useMemo(() => {
    const m: Record<string, string> = {}
    const collect = (obj?: Record<string, unknown>) => { if (obj) Object.keys(obj).forEach((k) => { if (FK_RESOURCE[k]) m[k] = FK_RESOURCE[k] }) }
    collect(record ?? undefined)
    collect(((record?.lines as Record<string, unknown>[] | undefined) ?? [])[0])
    return m
  }, [record])
  const fkResourcesKey = [...new Set(Object.values(fkFieldMap))].sort().join(',')
  useEffect(() => {
    [...new Set(Object.values(fkFieldMap))].forEach((rr) => {
      axiosInstance.get(`/api/${rr}`, { params: { pageSize: 500 } }).then((r) => {
        const list = Array.isArray(r.data) ? r.data : (r.data.data ?? [])
        const map: Record<number, string> = {}
        list.forEach((x: Record<string, unknown>) => {
          map[x.id as number] = x.code ? `${x.code}${x.name ? ' — ' + x.name : ''}` : String(x.palletNo ?? x.documentNo ?? x.username ?? x.name ?? x.description ?? `#${x.id}`)
        })
        setRefMaps((prev) => ({ ...prev, [rr]: map }))
      }).catch(() => { /* ref yüklenemedi → id gösterilir */ })
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fkResourcesKey])

  const errOf = (e: unknown) => (e as { response?: { data?: { error?: string } } })?.response?.data?.error
  const isBreakErr = (msg?: string) => !!msg && /kırma şifresi/i.test(msg)

  const loadBreakReasons = () => {
    if (breakReasons.length) return
    Promise.all([
      axiosInstance.get('/api/entry-condition-break-reasons').catch(() => ({ data: [] })),
      axiosInstance.get('/api/exit-condition-break-reasons').catch(() => ({ data: [] })),
    ]).then(([a, b]) => {
      const arr = (r: { data: unknown }) => (Array.isArray(r.data) ? r.data : ((r.data as { data?: unknown[] })?.data ?? [])) as Record<string, unknown>[]
      const list = [...arr(a), ...arr(b)].filter((x) => x.code)
      setBreakReasons([...new Map(list.map((x) => [x.code as string, { value: x.code as string, label: x.code as string }])).values()])
    })
  }

  const runAction = async (action: string, body?: Record<string, unknown>, busyKey?: string) => {
    setBusy(busyKey ?? action)
    try {
      await axiosInstance.post(`/api/${resource}/${id}/${action}`, body ?? {})
      message.success('İşlem tamamlandı')
      load()
    } catch (e) {
      const msg = errOf(e) ?? 'İşlem başarısız'
      if (isBreakErr(msg)) { loadBreakReasons(); setBreakReq({ action, busyKey, err: msg }) } // koşul kırma gerekli → modal
      else message.error(msg)
    } finally {
      setBusy(null)
    }
  }

  const submitBreak = async () => {
    if (!breakReq) return
    if (!bpw || !brc) { message.warning('Kırma şifresi ve nedeni gerekli'); return }
    setBreaking(true)
    try {
      await axiosInstance.post(`/api/${resource}/${id}/${breakReq.action}`, { breakPassword: bpw, breakReasonCode: brc })
      message.success('Koşul kırıldı — işlem tamamlandı')
      setBreakReq(null); setBpw(''); setBrc(undefined)
      load()
    } catch (e) {
      setBreakReq((p) => (p ? { ...p, err: errOf(e) ?? 'Kırma başarısız' } : p))
    } finally {
      setBreaking(false)
    }
  }

  if (loading || !record) return <div style={{ padding: 80, textAlign: 'center' }}><Spin size="large" /></div>

  const status = (record.status ?? record.result) as string | undefined
  const lines = (record.lines as Record<string, unknown>[] | undefined) ?? []
  // FK alanları için id → "kod — ad"; değilse normal format
  const showVal = (k: string, v: unknown) => {
    const res = fkFieldMap[k]
    if (res && typeof v === 'number' && refMaps[res]?.[v]) return refMaps[res][v]
    return fmt(v)
  }
  // Belge tesise bağlı (depoya değil) → Depo (warehouseId + null warehouse objesi) detayda gizli
  const HIDDEN = ['createdById', 'companyId', 'documentId', ...(resource === 'documents' ? ['warehouseId', 'warehouse'] : [])]
  const headerFields = Object.keys(record).filter(
    (k) => record[k] === null || (typeof record[k] !== 'object' && !HIDDEN.includes(k)),
  )
  const actions = (DETAIL_ACTIONS[resource] ?? []).filter((a) => !status || a.when.includes(status))

  const baseLineCols = lines[0]
    ? Object.keys(lines[0])
        .filter((k) => lines[0]![k] === null || typeof lines[0]![k] !== 'object')
        .filter((k) => !['createdAt', 'updatedAt', ...HIDDEN].includes(k))
        .slice(0, 9)
        .map((k) => ({ title: pretty(k), dataIndex: k, ellipsis: true, render: (v: unknown) => showVal(k, v) }))
    : []
  // Belge satırlarında DRAFT iken "Topla" — satır bazında okutma ekranı (miktar/palet/seri/lot/üretim/SKT)
  const lineCols = resource === 'documents' && status === 'DRAFT' && baseLineCols.length
    ? [...baseLineCols, { title: 'Toplama', key: 'collect', render: (_: unknown, row: Record<string, unknown>) => <Button size="small" type="link" onClick={() => navigate(`/documents/${id}/lines/${row.id}/collect`)}>Topla →</Button> }]
    : baseLineCols

  return (
    <div className="og-page">
      <PageHeader
        title={
          <Space size={10}>
            {label} <span style={{ color: '#8696ae', fontWeight: 600 }}>#{String(record.id)}</span>
            {(() => {
              const ds = record.documentStatus as { name?: string; color?: string } | null
              return ds?.name ? <Tag color={ds.color || 'default'}>{ds.name}</Tag> : status ? <Tag color={STATUS_COLOR[status] ?? 'default'}>{status}</Tag> : null
            })()}
          </Space>
        }
        subtitle="Kayıt detayı"
        extra={
          <Space>
            {resource === 'documents' && <Button icon={<HistoryOutlined />} onClick={() => navigate(`/documents/${id}/status-history`)}>Durum Geçmişi</Button>}
            <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(`/${resource}`)}>Liste</Button>
          </Space>
        }
      />

      {canWrite() && actions.length > 0 && (
        <Card className="og-toolbar" size="small" style={{ marginBottom: 16 }} styles={{ body: { padding: '10px 14px' } }}>
          <Space wrap>
            <span style={{ fontSize: 12.5, color: '#8696ae', marginRight: 4 }}>İşlemler</span>
            {actions.map((a) => (
              <Button key={a.key ?? a.action} type={a.danger ? 'default' : 'primary'} ghost={!a.danger} danger={a.danger} loading={busy === (a.key ?? a.action)} onClick={() => runAction(a.action, a.body, a.key)}>
                {a.label}
              </Button>
            ))}
          </Space>
        </Card>
      )}

      <Card className="og-section-card" size="small" title="Bilgiler">
        <Descriptions bordered size="small" column={{ xs: 1, sm: 2, lg: 3 }}>
          {headerFields.map((k) => (
            <Descriptions.Item key={k} label={pretty(k)}>{showVal(k, record[k])}</Descriptions.Item>
          ))}
        </Descriptions>
      </Card>

      {lines.length > 0 && (
        <Card className="og-section-card" size="small" title={`Satırlar (${lines.length})`}>
          <Table dataSource={lines} rowKey="id" columns={lineCols} size="small" pagination={false} scroll={{ x: true }} />
        </Card>
      )}

      <Modal
        open={!!breakReq}
        title="Koşul Kırma — Onay Gerekli"
        okText="Onayla ve Tamamla"
        cancelText="İptal"
        confirmLoading={breaking}
        onOk={submitBreak}
        onCancel={() => { setBreakReq(null); setBpw(''); setBrc(undefined) }}
      >
        {breakReq?.err && <Alert type="warning" showIcon style={{ marginBottom: 14 }} title={breakReq.err} />}
        <Space orientation="vertical" style={{ width: '100%' }} size={12}>
          <Input.Password placeholder="Kırma Şifresi" value={bpw} onChange={(e) => setBpw(e.target.value)} onPressEnter={submitBreak} autoFocus />
          <Select style={{ width: '100%' }} placeholder="Kırma Nedeni" value={brc} onChange={setBrc} options={breakReasons} showSearch optionFilterProp="label" />
        </Space>
      </Modal>
    </div>
  )
}
