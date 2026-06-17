import { useCallback, useEffect, useState } from 'react'
import { App, Table, Tag, Alert, Space, Button, Card, Empty, Badge } from 'antd'
import { ReloadOutlined, PlusOutlined, EyeOutlined, EditOutlined, DeleteOutlined, BarcodeOutlined, AppstoreAddOutlined, LayoutOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { axiosInstance } from '../providers/dataProvider'
import { PageHeader } from '../components/PageHeader'
import { PrinterDiscover } from '../components/PrinterDiscover'
import { hasForm, canWrite, FORM_CONFIG } from '../formConfig'
import { hasDetail } from '../detailActions'
import { hasTxnCreate } from '../txnConfig'

// DELETE endpoint'i olan kaynaklar (master factory + routing)
const DELETE_OK = new Set([
  'reasons', 'location-groups', 'operation-groups', 'label-types', 'product-subgroups',
  'entry-condition-types', 'exit-condition-types', 'routing-types', 'routing-rules',
  'facilities', 'areas', 'regions', 'partner-groups', 'product-units',
  'statuses', 'pallet-types', 'operation-type-statuses', 'operation-type-locations', 'operation-type-reasons', 'operation-type-pallet-types',
  'location-capacities', 'operation-types', 'barcode-types', 'parameters', 'printers', 'document-statuses',
  'document-status-actions', 'document-status-criteria', 'document-approval-types',
  'reason-categories', 'operation-group-links', 'operation-tolerances', 'operation-forbidden-products',
  'operation-conversions', 'sequential-operations', 'auto-reference-documents', 'operation-bulk-actions',
  'product-additional-groups', 'product-based-collections', 'trip-based-collections',
  'entry-condition-break-passwords', 'entry-condition-break-reasons', 'entry-condition-type-operations',
  'exit-condition-control-fields', 'exit-condition-break-passwords', 'exit-condition-break-reasons', 'exit-condition-type-operations',
  'routing-control-fields', 'routing-break-passwords', 'routing-break-reasons', 'routing-type-operations', 'routing-product-locations',
  'count-approval-user-groups', 'count-criteria', 'count-parameters',
  'languages', 'shifts', 'screen-report-links', 'stock-control-parameters', 'document-planning-parameters',
  'pick-order-parameters', 'dashboard-reports', 'warehouse-vehicles', 'work-order-general-parameters',
  'work-order-reasons', 'work-order-reference-operations', 'rack-feed-parameters', 'menu-groups',
])

const PRETTY: Record<string, string> = {
  id: '#', code: 'Kod', name: 'Ad', shortName: 'Kısa Ad', barcode: 'Barkod', isActive: 'Aktif',
  prefix: 'Önek', currentValue: 'Değer', padLength: 'Hane', direction: 'Yön', type: 'Tip', status: 'Durum',
  plateNo: 'Plaka', palletNo: 'Palet No', orderNo: 'No', documentNo: 'Belge No', taxNumber: 'Vergi No',
  phone: 'Telefon', email: 'E-posta', city: 'Şehir', priority: 'Öncelik', mainQty: 'Miktar', reservedQty: 'Rezerve',
  batchNo: 'Parti', serialNo: 'Seri', quantity: 'Miktar', materialLinkType: 'Malzeme', locationLinkType: 'Lokasyon',
  color: 'Renk', sortOrder: 'Sıra', labelName: 'Etiket Adı', host: 'Host', port: 'Port',
}

const STATUS_COLOR: Record<string, string> = {
  COMPLETED: 'green', CONFIRMED: 'blue', PLANNED: 'gold', IN_PROGRESS: 'cyan', CANCELLED: 'red',
  DRAFT: 'default', SUBMITTED: 'gold', APPROVED: 'green', REJECTED: 'red', SHIPPED: 'green', PAID: 'green',
  // Stok statüsü (kalite) — stok takibindeki statü kolonu
  AVAILABLE: 'green', QUARANTINE: 'gold', BLOCKED: 'red', DAMAGED: 'volcano',
}

const fmt = (v: unknown) => {
  if (v === null || v === undefined || v === '') return <span style={{ color: '#c0cad9' }}>—</span>
  if (typeof v === 'boolean')
    return v ? <Badge status="success" text="Evet" /> : <Badge color="#cbd5e1" text="Hayır" />
  if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(v)) return v.slice(0, 10)
  return String(v)
}

export const GenericList = ({ resource, label }: { resource: string; label: string }) => {
  const navigate = useNavigate()
  const { message, modal } = App.useApp()
  const [rows, setRows] = useState<Record<string, unknown>[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selected, setSelected] = useState<number | null>(null)
  // FK alanlarını id → "kod — ad" çöz (formConfig'teki ref tanımlarından) — listeler okunur olsun
  const [refMaps, setRefMaps] = useState<Record<string, Record<number, string>>>({})

  const fields = FORM_CONFIG[resource] ?? []
  const refFieldMap: Record<string, string> = {}
  const refLabelMap: Record<string, string> = {}
  fields.forEach((f) => {
    if (f.type === 'ref' && f.refResource) refFieldMap[f.name] = f.refResource
    refLabelMap[f.name] = f.label
  })

  useEffect(() => {
    const uniqueRefs = [...new Set(Object.values(refFieldMap))]
    uniqueRefs.forEach((rr) => {
      axiosInstance.get(`/api/${rr}`, { params: { pageSize: 300 } }).then((r) => {
        const list = Array.isArray(r.data) ? r.data : (r.data.data ?? [])
        const map: Record<number, string> = {}
        list.forEach((x: Record<string, unknown>) => {
          map[x.id as number] = `${x.code ?? x.id}${x.name ? ' — ' + x.name : ''}`
        })
        setRefMaps((prev) => ({ ...prev, [rr]: map }))
      }).catch(() => { /* ref yüklenemedi → id gösterilir */ })
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resource])

  const load = useCallback(() => {
    setLoading(true)
    setError(null)
    axiosInstance
      .get(`/api/${resource}`, { params: { pageSize: 100 } })
      .then((r) => setRows(Array.isArray(r.data) ? r.data : (r.data.data ?? [])))
      .catch((e) => setError(e?.response?.data?.error ?? e.message))
      .finally(() => setLoading(false))
  }, [resource])

  useEffect(() => {
    setSelected(null)
    load()
  }, [load])

  const CREATE_PAGES = ['documents', 'operation-types', 'stock-counts', 'work-orders', 'pallets', 'shipments']
  const canCreate = (hasForm(resource) || hasTxnCreate(resource) || CREATE_PAGES.includes(resource)) && canWrite()
  const canEdit = (hasForm(resource) || resource === 'operation-types') && canWrite()
  const canShow = hasDetail(resource)
  const canDelete = DELETE_OK.has(resource) && canWrite()

  const remove = () => {
    if (!selected) return
    modal.confirm({
      title: 'Kayıt silinsin mi?',
      okText: 'Sil',
      okType: 'danger',
      cancelText: 'Vazgeç',
      onOk: async () => {
        try {
          await axiosInstance.delete(`/api/${resource}/${selected}`)
          message.success('Silindi')
          setSelected(null)
          load()
        } catch (e) {
          message.error((e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Silinemedi')
        }
      },
    })
  }

  const sample = rows[0] ?? {}
  // Stok takibindeki statü kolonu (kalite) — status:{code} ilişkisi varsa renkli rozetle göster, çıplak statusId'yi gizle
  const statusObj = sample.status as { code?: string } | null | undefined
  const hasStatusObj = !!statusObj && typeof statusObj === 'object' && !!statusObj.code
  // Belge Durumu (Bekliyor→Onaylandı) — documentStatus:{name,color} varsa renkli rozetle; ham enum status'u gizle
  const docStatusObj = sample.documentStatus as { name?: string; color?: string } | null | undefined
  const hasDocStatus = !!docStatusObj && typeof docStatusObj === 'object' && !!docStatusObj.name
  const hidden = ['createdAt', 'updatedAt', 'companyId', 'createdById', 'passwordHash',
    ...(hasStatusObj ? ['statusId'] : []), ...(hasDocStatus ? ['documentStatusId', 'status'] : [])]
  const columns = [
    ...Object.keys(sample)
      .filter((k) => sample[k] === null || typeof sample[k] !== 'object')
      .filter((k) => !hidden.includes(k))
      .slice(0, 9)
      .map((k) => ({
        title: refLabelMap[k] ?? PRETTY[k] ?? k,
        dataIndex: k,
        ellipsis: true,
        render: (v: unknown) =>
          refFieldMap[k] && typeof v === 'number'
            ? (refMaps[refFieldMap[k]]?.[v] ?? <span style={{ color: '#8696ae' }}>#{v}</span>)
            : k === 'color' && typeof v === 'string' && v
              ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}><span style={{ width: 14, height: 14, borderRadius: 4, background: v, border: '1px solid rgba(0,0,0,.15)', display: 'inline-block' }} />{v}</span>
              : (k === 'status' || k === 'type') && typeof v === 'string'
                ? <Tag color={STATUS_COLOR[v] ?? 'default'}>{v}</Tag>
                : fmt(v),
      })),
    ...(hasStatusObj
      ? [{
          title: 'Statü',
          key: '__status',
          render: (_: unknown, row: Record<string, unknown>) => {
            const c = (row.status as { code?: string } | null)?.code
            return c ? <Tag color={STATUS_COLOR[c] ?? 'default'}>{c}</Tag> : fmt(null)
          },
        }]
      : []),
    ...(hasDocStatus
      ? [{
          title: 'Belge Durumu',
          key: '__docstatus',
          render: (_: unknown, row: Record<string, unknown>) => {
            const ds = row.documentStatus as { name?: string; color?: string } | null
            return ds?.name ? <Tag color={ds.color || 'default'}>{ds.name}</Tag> : fmt(null)
          },
        }]
      : []),
  ]

  return (
    <div className="og-page">
      <PageHeader
        title={label}
        subtitle={loading ? 'Yükleniyor…' : `${rows.length} kayıt`}
        extra={
          <Space size={8} wrap>
            <Button icon={<ReloadOutlined />} onClick={load} loading={loading}>Yenile</Button>
            {canCreate && (
              <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate(`/${resource}/new`)}>
                Yeni
              </Button>
            )}
          </Space>
        }
      />

      <Card className="og-toolbar" size="small" style={{ marginBottom: 14 }} styles={{ body: { padding: '9px 14px' } }}>
        <Space separator={<span style={{ display: 'inline-block', width: 1, height: 16, background: 'var(--og-border-soft)' }} />} wrap>
          <Space size={6} wrap>
            {canShow && <Button size="small" type="text" icon={<EyeOutlined />} disabled={!selected} onClick={() => navigate(`/${resource}/${selected}`)}>İzle</Button>}
            {canEdit && <Button size="small" type="text" icon={<EditOutlined />} disabled={!selected} onClick={() => navigate(`/${resource}/${selected}/edit`)}>Düzenle</Button>}
            {resource === 'product-units' && <Button size="small" type="text" icon={<BarcodeOutlined />} disabled={!selected} onClick={() => navigate(`/product-units/${selected}/barcodes`)}>Barkodlar</Button>}
            {resource === 'label-types' && <Button size="small" type="text" icon={<LayoutOutlined />} disabled={!selected} onClick={() => navigate(`/label-types/${selected}/design`)}>Tasarla</Button>}
            {resource === 'locations' && canWrite() && <Button size="small" type="text" icon={<AppstoreAddOutlined />} onClick={() => navigate('/locations/bulk')}>Toplu Üret</Button>}
            {resource === 'printers' && canWrite() && <PrinterDiscover onAdded={load} />}
            {canDelete && <Button size="small" type="text" danger icon={<DeleteOutlined />} disabled={!selected} onClick={remove}>Sil</Button>}
          </Space>
          <span style={{ fontSize: 12.5, color: '#8696ae' }}>
            {selected ? <>Seçili: <b style={{ color: '#42536f' }}>#{selected}</b></> : 'Satır seçilmedi'}
          </span>
        </Space>
      </Card>

      {error ? (
        <Alert type="error" title={`Yüklenemedi: ${error}`} showIcon />
      ) : (
        <Table
          dataSource={rows}
          rowKey="id"
          loading={loading}
          columns={columns}
          size="small"
          locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Kayıt yok" style={{ padding: '28px 0' }} /> }}
          pagination={{ pageSize: 15, showSizeChanger: false, size: 'small', showTotal: (t) => `Toplam ${t}` }}
          scroll={{ x: true }}
          rowClassName={(_, i) => (i % 2 ? 'og-stripe' : '')}
          rowSelection={{ type: 'radio', selectedRowKeys: selected ? [selected] : [], onChange: (keys) => setSelected(keys[0] as number) }}
          onRow={(row) => ({
            onClick: () => setSelected((row as { id: number }).id),
            onDoubleClick: () => canShow && navigate(`/${resource}/${(row as { id: number }).id}`),
            style: { cursor: 'pointer' },
          })}
        />
      )}
    </div>
  )
}
