import { useCallback, useEffect, useState } from 'react'
import { App, Table, Tag, Alert, Space, Button, Card, Empty, Badge, Segmented } from 'antd'
import { ReloadOutlined, PlusOutlined, EyeOutlined, EditOutlined, DeleteOutlined, BarcodeOutlined, AppstoreAddOutlined, LayoutOutlined, CopyOutlined, UnorderedListOutlined, PrinterOutlined, SafetyOutlined } from '@ant-design/icons'
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
  'count-approval-user-groups', 'count-criteria', 'count-parameters', 'integration-logs',
  'report-defs', 'report-criteria', 'report-fields',
  'extra-fields', 'extra-field-options', 'operation-type-extra-fields', 'document-assignments',
  'control-counts', 'control-count-lines', 'count-assignments', 'pallet-notifications', 'pallet-notification-lines', 'pallet-history', 'routing-parameters',
  'label-templates', 'label-template-items', 'label-template-queries',
  'languages', 'screen-report-links', 'stock-control-parameters', 'document-planning-parameters',
  'pick-order-parameters', 'dashboard-reports', 'warehouse-vehicles', 'work-order-general-parameters',
  'work-order-reasons', 'work-order-reference-operations', 'rack-feed-parameters', 'menu-groups',
  'users',
])

const PRETTY: Record<string, string> = {
  id: '#', code: 'Kod', name: 'Ad', shortName: 'Kısa Ad', barcode: 'Barkod', isActive: 'Aktif',
  username: 'Kullanıcı Adı', fullName: 'Ad Soyad', isSuperAdmin: 'Süper Admin', lastLoginAt: 'Son Giriş',
  prefix: 'Önek', currentValue: 'Değer', padLength: 'Hane', direction: 'Yön', type: 'Tip', status: 'Durum',
  plateNo: 'Plaka', palletNo: 'Palet No', orderNo: 'No', documentNo: 'Belge No', taxNumber: 'Vergi No',
  phone: 'Telefon', email: 'E-posta', city: 'Şehir', priority: 'Öncelik', mainQty: 'Miktar', reservedQty: 'Rezerve',
  batchNo: 'Parti', serialNo: 'Seri', quantity: 'Miktar', materialLinkType: 'Malzeme', locationLinkType: 'Lokasyon',
  color: 'Renk', sortOrder: 'Sıra', labelName: 'Etiket Adı', host: 'Host', port: 'Port',
  documentDate: 'Belge Tarihi', completedAt: 'Tamamlanma', note: 'Not', description: 'Açıklama',
  poNo: 'PO', poLine: 'PO Satır', expiryDate: 'SKT', productionDate: 'Üretim Tarihi',
  quantityPerUnit: 'Birim Miktar', weight: 'Ağırlık', volume: 'Hacim', vatRate: 'KDV %',
  driverName: 'Sürücü', plannedAt: 'Planlanan', dispatchedAt: 'Sevk', deliveredAt: 'Teslim',
  totalAmount: 'Tutar', paidAmount: 'Ödenen', invoiceNo: 'Fatura No', countNo: 'Sayım No',
  systemQty: 'Sistem', countedQty: 'Sayılan', collectedQty: 'Toplanan', qtyDelta: 'Miktar (±)',
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

// FK alan adı → API kaynağı: listelerde ham id yerine ilgili tablodaki açıklamayı göster (formConfig olmasa da)
const FK_RESOURCE: Record<string, string> = {
  operationTypeId: 'operation-types', reverseOperationTypeId: 'operation-types',
  sourceOperationTypeId: 'operation-types', targetOperationTypeId: 'operation-types',
  entryOperationTypeId: 'operation-types', exitOperationTypeId: 'operation-types', transferOperationTypeId: 'operation-types',
  firstOperationId: 'operation-types', secondOperationId: 'operation-types',
  warehouseId: 'warehouses', areaId: 'areas',
  locationId: 'locations', sourceLocationId: 'locations', targetLocationId: 'locations',
  cancelLocationId: 'locations', sourceLocLinkId: 'locations', targetLocLinkId: 'locations', locationLinkId: 'locations',
  reasonId: 'reasons', reasonCategoryId: 'reason-categories',
  partnerId: 'partners', businessPartnerId: 'partners', cariLinkId: 'partners', sourcePartnerId: 'partners', targetPartnerId: 'partners',
  productId: 'products', materialLinkId: 'products',
  unitId: 'units', toleranceUnitId: 'units', dimensionUnitId: 'units', weightUnitId: 'units',
  statusId: 'statuses', sourceStatusId: 'statuses', targetStatusId: 'statuses',
  palletTypeId: 'pallet-types', innerPalletTypeId: 'pallet-types',
  palletId: 'pallets', parentPalletId: 'pallets',
  customerId: 'partners', supplierId: 'partners',
  assignedToUserId: 'users', assignedUserId: 'users',
  vehicleId: 'vehicles', salesOrderId: 'sales-orders', purchaseOrderId: 'purchase-orders',
  operationGroupId: 'operation-groups',
  sequenceId: 'sequences', operationSequenceId: 'sequences', groupSequenceId: 'sequences',
  facilityId: 'facilities', regionId: 'regions',
  userId: 'users', createdById: 'users',
  documentId: 'documents', extraFieldId: 'extra-fields',
  productGroupId: 'product-groups', productSubGroupId: 'product-subgroups',
  labelTypeId: 'label-types', barcodeTypeId: 'barcode-types',
  stockCountId: 'stock-counts',
}
const FK_LABEL: Record<string, string> = {
  operationTypeId: 'Operasyon Tipi', warehouseId: 'Depo', areaId: 'Alan',
  locationId: 'Lokasyon', sourceLocationId: 'Kaynak Lokasyon', targetLocationId: 'Hedef Lokasyon',
  reasonId: 'Neden', reasonCategoryId: 'Neden Kategori', partnerId: 'Cari', businessPartnerId: 'Cari',
  productId: 'Ürün', unitId: 'Birim', statusId: 'Statü', sourceStatusId: 'Kaynak Statü', targetStatusId: 'Hedef Statü',
  palletTypeId: 'Palet Tipi', innerPalletTypeId: 'İç Palet Tipi', operationGroupId: 'Operasyon Grubu',
  sequenceId: 'Sayaç', facilityId: 'Tesis', regionId: 'Bölge', userId: 'Kullanıcı', createdById: 'Oluşturan',
  documentId: 'Belge', parentId: 'Üst', extraFieldId: 'Ek Saha', productGroupId: 'Ürün Grubu',
  palletId: 'Palet', parentPalletId: 'Üst Palet', customerId: 'Müşteri', supplierId: 'Tedarikçi',
  assignedToUserId: 'Atanan', assignedUserId: 'Atanan', vehicleId: 'Araç',
  salesOrderId: 'Satış Sip.', purchaseOrderId: 'Satınalma Sip.', stockCountId: 'Sayım',
}

export const GenericList = ({ resource, label, filter, observe }: { resource: string; label: string; filter?: Record<string, string>; observe?: boolean }) => {
  const navigate = useNavigate()
  const { message, modal } = App.useApp()
  const [rows, setRows] = useState<Record<string, unknown>[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selected, setSelected] = useState<number | null>(null)
  // Belgeler ekranı tek menü — durum filtresi liste içinde (Tümü/Açık/Tamamlanmış); ayrı "Açık Belgeler"/"Gözlem" yok
  const [docStatus, setDocStatus] = useState<'all' | 'open' | 'done'>('all')
  const isDocuments = resource === 'documents'
  // FK alanlarını id → "kod — ad" çöz (formConfig'teki ref tanımlarından) — listeler okunur olsun
  const [refMaps, setRefMaps] = useState<Record<string, Record<number, string>>>({})

  const fields = FORM_CONFIG[resource] ?? []
  const refLabelMap: Record<string, string> = {}
  // Select alanlarının kod→etiket eşlemesi (ör. İşlem Tipi 1→"Toplama") — listede ham kod yerine isim göster
  const selectLabelMap: Record<string, Record<string, string>> = {}
  // FK alan → kaynak: formConfig ref'leri + sample satırdaki *Id alanları (FK_RESOURCE) + parentId(self)
  const fkFieldMap: Record<string, string> = {}
  fields.forEach((f) => {
    if (f.type === 'ref' && f.refResource) fkFieldMap[f.name] = f.refResource
    if (f.type === 'select' && f.options) selectLabelMap[f.name] = Object.fromEntries(f.options.map((o) => [String(o.value), o.label]))
    refLabelMap[f.name] = f.label
  })
  const sample = rows[0] ?? {}
  Object.keys(sample).forEach((k) => {
    if (fkFieldMap[k]) return
    if (k === 'parentId') fkFieldMap[k] = resource // self-referans (ör. lokasyon üst)
    else if (FK_RESOURCE[k]) fkFieldMap[k] = FK_RESOURCE[k]
  })

  const fkResourcesKey = [...new Set(Object.values(fkFieldMap))].sort().join(',')
  useEffect(() => {
    const uniqueRefs = [...new Set(Object.values(fkFieldMap))]
    uniqueRefs.forEach((rr) => {
      axiosInstance.get(`/api/${rr}`, { params: { pageSize: 500 } }).then((r) => {
        const list = Array.isArray(r.data) ? r.data : (r.data.data ?? [])
        const map: Record<number, string> = {}
        list.forEach((x: Record<string, unknown>) => {
          map[x.id as number] = x.code ? `${x.code}${x.name ? ' — ' + x.name : ''}` : String(x.palletNo ?? x.documentNo ?? x.countNo ?? x.orderNo ?? x.username ?? x.name ?? x.description ?? x.trackingCode ?? `#${x.id}`)
        })
        setRefMaps((prev) => ({ ...prev, [rr]: map }))
      }).catch(() => { /* ref yüklenemedi → id gösterilir */ })
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fkResourcesKey])

  const load = useCallback(() => {
    setLoading(true)
    setError(null)
    // Belgeler durum segmenti → openOnly (Açık) / status COMPLETED (Tamamlanmış) / yok (Tümü)
    const statusParams = isDocuments
      ? (docStatus === 'open' ? { openOnly: 'true' } : docStatus === 'done' ? { status: 'COMPLETED' } : {})
      : {}
    axiosInstance
      .get(`/api/${resource}`, { params: { pageSize: 100, ...filter, ...statusParams } })
      .then((r) => setRows(Array.isArray(r.data) ? r.data : (r.data.data ?? [])))
      .catch((e) => setError(e?.response?.data?.error ?? e.message))
      .finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resource, JSON.stringify(filter), docStatus])

  useEffect(() => {
    setSelected(null)
    load()
  }, [load])

  const CREATE_PAGES = ['documents', 'operation-types', 'stock-counts', 'work-orders', 'pallets', 'shipments', 'users']
  // observe (Gözlem) modu: salt-okunur — Yeni/Düzenle/Kopyala/Sil gizli, sadece İzle
  const canCreate = !observe && (hasForm(resource) || hasTxnCreate(resource) || CREATE_PAGES.includes(resource)) && canWrite()
  const canEdit = !observe && (hasForm(resource) || resource === 'operation-types' || resource === 'users') && resource !== 'integration-logs' && canWrite()
  // Kopyala: form prefill ile yeni kayıt (kod boş bırakılır) — generic form'lu tüm tanımlar + operasyon tipi
  const canCopy = !observe && (hasForm(resource) || resource === 'operation-types') && canWrite()
  // Belge Kopyala: belge ekranında seçili belgeyi yeni DRAFT'a kopyalar
  const canDocCopy = !observe && isDocuments && canWrite()
  const canShow = hasDetail(resource)
  const canDelete = !observe && DELETE_OK.has(resource) && canWrite()

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

  const docCopy = () => {
    if (!selected) return
    modal.confirm({
      title: 'Belge kopyalansın mı?',
      content: 'Seçili belgenin başlık ve satırları yeni bir taslak belgeye kopyalanır (yeni belge no).',
      okText: 'Kopyala',
      cancelText: 'Vazgeç',
      onOk: async () => {
        try {
          const r = await axiosInstance.post(`/api/documents/${selected}/copy`)
          message.success(`Kopyalandı: ${r.data.documentNo}`)
          navigate(`/documents/${r.data.id}`)
        } catch (e) {
          message.error((e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Kopyalanamadı')
        }
      },
    })
  }

  // Stok takibindeki statü kolonu (kalite) — status:{code} ilişkisi varsa renkli rozetle göster, çıplak statusId'yi gizle
  const statusObj = sample.status as { code?: string } | null | undefined
  const hasStatusObj = !!statusObj && typeof statusObj === 'object' && !!statusObj.code
  // Belge Durumu (Bekliyor→Onaylandı) — documentStatus:{name,color} varsa renkli rozetle; ham enum status'u gizle
  const docStatusObj = sample.documentStatus as { name?: string; color?: string } | null | undefined
  const hasDocStatus = !!docStatusObj && typeof docStatusObj === 'object' && !!docStatusObj.name
  const hidden = ['createdAt', 'updatedAt', 'companyId', 'createdById', 'passwordHash',
    ...(hasStatusObj ? ['statusId'] : []), ...(hasDocStatus ? ['documentStatusId', 'status'] : []),
    // Sayım Parametreleri: Transfer Operasyon StokBar ekranında yok → legacy kolonu dursa da listede gizli
    ...(resource === 'count-parameters' ? ['transferOperationTypeId'] : [])]
  const columns = [
    ...Object.keys(sample)
      .filter((k) => sample[k] === null || typeof sample[k] !== 'object')
      .filter((k) => !hidden.includes(k))
      .slice(0, 9)
      .map((k) => ({
        title: refLabelMap[k] ?? FK_LABEL[k] ?? PRETTY[k] ?? k,
        dataIndex: k,
        ellipsis: true,
        render: (v: unknown) =>
          selectLabelMap[k] && v != null
            ? (selectLabelMap[k][String(v)] ?? fmt(v))
            : fkFieldMap[k] && typeof v === 'number'
            ? (refMaps[fkFieldMap[k]]?.[v] ?? <span style={{ color: '#8696ae' }}>#{v}</span>)
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
          {isDocuments && (
            <Segmented
              size="small"
              value={docStatus}
              onChange={(v) => setDocStatus(v as 'all' | 'open' | 'done')}
              options={[{ label: 'Tümü', value: 'all' }, { label: 'Açık', value: 'open' }, { label: 'Tamamlanmış', value: 'done' }]}
            />
          )}
          <Space size={6} wrap>
            {canShow && <Button size="small" type="text" icon={<EyeOutlined />} disabled={!selected} onClick={() => navigate(`/${resource}/${selected}`)}>İzle</Button>}
            {canEdit && <Button size="small" type="text" icon={<EditOutlined />} disabled={!selected} onClick={() => navigate(`/${resource}/${selected}/edit`)}>Düzenle</Button>}
            {canCopy && <Button size="small" type="text" icon={<CopyOutlined />} disabled={!selected} onClick={() => navigate(`/${resource}/new?copyFrom=${selected}`, { state: { copySource: rows.find((r) => (r as { id: number }).id === selected) } })}>Kopyala</Button>}
            {canDocCopy && <Button size="small" type="text" icon={<CopyOutlined />} disabled={!selected} onClick={docCopy}>Belge Kopyala</Button>}
            {resource === 'product-units' && <Button size="small" type="text" icon={<BarcodeOutlined />} disabled={!selected} onClick={() => navigate(`/product-units/${selected}/barcodes`)}>Barkodlar</Button>}
            {resource === 'extra-fields' && <Button size="small" type="text" icon={<UnorderedListOutlined />} disabled={!selected} onClick={() => navigate(`/extra-fields/${selected}/options`)}>Seçenekler</Button>}
            {resource === 'control-counts' && <Button size="small" type="text" icon={<UnorderedListOutlined />} disabled={!selected} onClick={() => navigate(`/control-counts/${selected}/lines`)}>Satırlar</Button>}
            {resource === 'pallet-notifications' && <Button size="small" type="text" icon={<UnorderedListOutlined />} disabled={!selected} onClick={() => navigate(`/pallet-notifications/${selected}/lines`)}>Satırlar</Button>}
            {resource === 'routing-types' && <Button size="small" type="text" icon={<UnorderedListOutlined />} disabled={!selected} onClick={() => navigate(`/routing-types/${selected}/params`)}>Parametreler</Button>}
            {resource === 'label-templates' && <Button size="small" type="text" icon={<UnorderedListOutlined />} disabled={!selected} onClick={() => navigate(`/label-templates/${selected}/items`)}>Item</Button>}
            {resource === 'label-templates' && <Button size="small" type="text" icon={<UnorderedListOutlined />} disabled={!selected} onClick={() => navigate(`/label-templates/${selected}/queries`)}>Sorgu</Button>}
            {resource === 'label-templates' && <Button size="small" type="text" icon={<PrinterOutlined />} disabled={!selected} onClick={() => navigate(`/label-templates/${selected}/print`)}>Bas</Button>}
            {resource === 'users' && <Button size="small" type="text" icon={<SafetyOutlined />} disabled={!selected} onClick={() => navigate(`/users/${selected}/authorizations`)}>Yetkiler</Button>}
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
