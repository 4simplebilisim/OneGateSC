import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Button, Card, Table, Tag, Spin } from 'antd'
import { ArrowLeftOutlined } from '@ant-design/icons'
import { axiosInstance } from '../providers/dataProvider'
import { PageHeader } from '../components/PageHeader'

type Row = { id: number; fromCode: string | null; toCode: string; source: string; userId: number | null; username: string | null; createdAt: string }

// Geçiş kaynağı → Türkçe etiket (backend documentStatus.ts source)
const SOURCE_LABEL: Record<string, string> = {
  derive: 'Türetildi', criteria: 'Kriter', confirm: 'Onaya gönderildi', complete: 'Tamamlandı',
  cancel: 'İptal', reverse: 'Ters kayıt', bulk: 'Toplu işlem', procurement: 'Satınalma', sales: 'Satış', workorder: 'İş emri',
}

export const StatusHistory = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    axiosInstance.get(`/api/documents/${id}/status-history`)
      .then((r) => setRows(Array.isArray(r.data) ? r.data : (r.data.data ?? [])))
      .finally(() => setLoading(false))
  }, [id])

  const columns = [
    { title: '#', dataIndex: 'id', width: 60, render: (_: unknown, __: Row, i: number) => i + 1 },
    {
      title: 'Geçiş', key: 'transition', render: (_: unknown, r: Row) => (
        <span>
          {r.fromCode ? <Tag>{r.fromCode}</Tag> : <span style={{ color: 'var(--og-muted)' }}>—</span>}
          <span style={{ margin: '0 6px', color: 'var(--og-muted)' }}>→</span>
          <Tag color="blue">{r.toCode}</Tag>
        </span>
      ),
    },
    { title: 'Kaynak', dataIndex: 'source', render: (s: string) => SOURCE_LABEL[s] ?? s },
    { title: 'Kullanıcı', dataIndex: 'username', render: (u: string | null, r: Row) => u ?? (r.userId ? `#${r.userId}` : <span style={{ color: 'var(--og-muted)' }}>sistem</span>) },
    { title: 'Tarih', dataIndex: 'createdAt', render: (d: string) => new Date(d).toLocaleString('tr-TR') },
  ]

  return (
    <div className="og-page" style={{ maxWidth: 880 }}>
      <PageHeader
        title={`Belge #${id} — Durum Geçmişi`}
        subtitle="Belge durumunun her geçişi: kimden→kime, hangi olay, kim, ne zaman (audit)"
        extra={<Button icon={<ArrowLeftOutlined />} onClick={() => navigate(`/documents/${id}`)}>Belgeye Dön</Button>}
      />
      <Card className="og-section-card" size="small" title={`Geçişler (${rows.length})`}>
        {loading ? <div style={{ padding: 40, textAlign: 'center' }}><Spin /></div>
          : <Table size="small" rowKey="id" dataSource={rows} columns={columns} pagination={false} locale={{ emptyText: 'Henüz durum geçişi yok' }} />}
      </Card>
    </div>
  )
}
