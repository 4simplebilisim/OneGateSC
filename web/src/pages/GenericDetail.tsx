import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { App, Button, Card, Descriptions, Space, Table, Tag, Badge, Spin } from 'antd'
import { ArrowLeftOutlined } from '@ant-design/icons'
import { axiosInstance } from '../providers/dataProvider'
import { PageHeader } from '../components/PageHeader'
import { DETAIL_ACTIONS } from '../detailActions'
import { canWrite } from '../formConfig'

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
}
const pretty = (k: string) => PRETTY[k] ?? k

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

  const load = useCallback(() => {
    setLoading(true)
    axiosInstance
      .get(`/api/${resource}/${id}`)
      .then((r) => setRecord(r.data))
      .catch((e) => message.error(e?.response?.data?.error ?? 'Yüklenemedi'))
      .finally(() => setLoading(false))
  }, [resource, id, message])

  useEffect(load, [load])

  const runAction = async (action: string, body?: Record<string, unknown>, busyKey?: string) => {
    setBusy(busyKey ?? action)
    try {
      await axiosInstance.post(`/api/${resource}/${id}/${action}`, body ?? {})
      message.success('İşlem tamamlandı')
      load()
    } catch (e) {
      message.error((e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'İşlem başarısız')
    } finally {
      setBusy(null)
    }
  }

  if (loading || !record) return <div style={{ padding: 80, textAlign: 'center' }}><Spin size="large" /></div>

  const status = (record.status ?? record.result) as string | undefined
  const lines = (record.lines as Record<string, unknown>[] | undefined) ?? []
  const headerFields = Object.keys(record).filter(
    (k) => record[k] === null || (typeof record[k] !== 'object' && !['createdById', 'companyId'].includes(k)),
  )
  const actions = (DETAIL_ACTIONS[resource] ?? []).filter((a) => !status || a.when.includes(status))

  const lineCols = lines[0]
    ? Object.keys(lines[0])
        .filter((k) => lines[0]![k] === null || typeof lines[0]![k] !== 'object')
        .filter((k) => !['createdAt', 'updatedAt'].includes(k))
        .slice(0, 9)
        .map((k) => ({ title: pretty(k), dataIndex: k, ellipsis: true, render: (v: unknown) => fmt(v) }))
    : []

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
        extra={<Button icon={<ArrowLeftOutlined />} onClick={() => navigate(`/${resource}`)}>Liste</Button>}
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
            <Descriptions.Item key={k} label={pretty(k)}>{fmt(record[k])}</Descriptions.Item>
          ))}
        </Descriptions>
      </Card>

      {lines.length > 0 && (
        <Card className="og-section-card" size="small" title={`Satırlar (${lines.length})`}>
          <Table dataSource={lines} rowKey="id" columns={lineCols} size="small" pagination={false} scroll={{ x: true }} />
        </Card>
      )}
    </div>
  )
}
