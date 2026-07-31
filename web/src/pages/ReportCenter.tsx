import { useEffect, useState } from 'react'
import { App, Button, Card, Col, DatePicker, Empty, Form, Input, InputNumber, Row, Select, Table } from 'antd'
import { PlayCircleOutlined } from '@ant-design/icons'
import { axiosInstance } from '../providers/dataProvider'
import { PageHeader } from '../components/PageHeader'

type Crit = { id: number; fieldCode: string; label: string; type: string; refResource?: string | null; options?: string | null; required: boolean }
type Fld = { id: number; fieldCode: string; label: string; align?: string | null }
type Def = { id: number; code: string; name: string; category?: string; criteria: Crit[]; fields: Fld[] }
type Head = { id: number; code: string; name: string; category?: string }
type Opt = { value: number | string; label: string }

const parseOpts = (s?: string | null): Opt[] =>
  (s ?? '').split(',').map((p) => p.trim()).filter(Boolean).map((p) => {
    const [value, label] = p.split(':')
    return { value: value!, label: label ?? value! }
  })

// fixedCode verilirse TEK RAPOR ekranı olur (menüde ayrı öğe): seçici gizlenir, rapor otomatik açılır.
export const ReportCenter = ({ fixedCode }: { fixedCode?: string }) => {
  const { message } = App.useApp()
  const [form] = Form.useForm()
  const [reports, setReports] = useState<Head[]>([])
  const [def, setDef] = useState<Def | null>(null)
  const [refOpts, setRefOpts] = useState<Record<string, Opt[]>>({})
  const [rows, setRows] = useState<Record<string, unknown>[]>([])
  const [running, setRunning] = useState(false)
  const [ran, setRan] = useState(false)

  useEffect(() => {
    axiosInstance.get('/api/report-run').then((r) => {
      setReports(r.data)
      if (fixedCode) {
        const hit = (r.data as Head[]).find((h) => h.code === fixedCode)
        if (hit) selectReport(hit.id)
      }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fixedCode])

  const selectReport = async (id: number) => {
    form.resetFields(); setRows([]); setRan(false)
    const r = await axiosInstance.get(`/api/report-run/${id}`)
    const d: Def = r.data
    setDef(d)
    // REF kriterleri için seçenekleri yükle
    const refs = [...new Set(d.criteria.filter((c) => c.type === 'REF' && c.refResource).map((c) => c.refResource!))]
    refs.forEach((rr) => {
      axiosInstance.get(`/api/${rr}`, { params: { pageSize: 500 } }).then((rsp) => {
        const list = Array.isArray(rsp.data) ? rsp.data : (rsp.data.data ?? [])
        setRefOpts((p) => ({ ...p, [rr]: list.map((x: Record<string, unknown>) => ({ value: x.id as number, label: `${x.code ?? x.palletNo ?? x.id}${x.name ? ' — ' + x.name : ''}` })) }))
      })
    })
  }

  const run = async (vals: Record<string, unknown>) => {
    if (!def) return
    setRunning(true)
    try {
      const body: Record<string, string> = {}
      for (const [k, v] of Object.entries(vals)) {
        if (v == null || v === '') continue
        body[k] = typeof v === 'object' && 'toISOString' in (v as object) ? (v as { toISOString: () => string }).toISOString().slice(0, 10) : String(v)
      }
      const r = await axiosInstance.post(`/api/report-run/${def.id}/run`, body)
      setRows(r.data.rows); setRan(true)
    } catch (e) {
      message.error((e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Rapor çalıştırılamadı')
    } finally { setRunning(false) }
  }

  const ctrl = (c: Crit) => {
    if (c.type === 'REF') return <Select allowClear showSearch optionFilterProp="label" placeholder="Seçiniz" options={refOpts[c.refResource ?? ''] ?? []} />
    if (c.type === 'SELECT') return <Select allowClear placeholder="Seçiniz" options={parseOpts(c.options)} />
    if (c.type === 'NUMBER') return <InputNumber style={{ width: '100%' }} />
    if (c.type === 'DATE') return <DatePicker style={{ width: '100%' }} />
    return <Input allowClear />
  }

  return (
    <div className="og-page">
      <PageHeader title={fixedCode ? (def?.name ?? 'Rapor') : 'Raporlar'}
        subtitle={fixedCode ? 'Kriterleri girip çalıştırın' : 'Rapor seç → kriterleri gir → çalıştır (kriter/saha tanıma göre dinamik)'} />

      {!fixedCode && (
        <Card className="og-section-card" size="small" title="Rapor">
          <Select
            style={{ minWidth: 320 }} showSearch optionFilterProp="label" placeholder="Rapor seçiniz" onChange={selectReport}
            options={reports.map((r) => ({ value: r.id, label: `${r.category ? r.category + ' · ' : ''}${r.name}` }))}
          />
        </Card>
      )}

      {def && (
        <Card className="og-section-card" size="small" title={`Kriterler — ${def.name}`}>
          <Form form={form} layout="vertical" onFinish={run}>
            <Row gutter={[20, 0]}>
              {def.criteria.map((c) => (
                <Col xs={24} sm={8} key={c.id}>
                  <Form.Item name={c.fieldCode} label={c.label} rules={c.required ? [{ required: true, message: 'Zorunlu' }] : []}>{ctrl(c)}</Form.Item>
                </Col>
              ))}
            </Row>
            <Button type="primary" htmlType="submit" icon={<PlayCircleOutlined />} loading={running}>Çalıştır</Button>
          </Form>
        </Card>
      )}

      {def && ran && (
        <Card className="og-section-card" size="small" title={`Sonuç (${rows.length} satır)`}>
          {rows.length === 0 ? <Empty description="Kayıt bulunamadı" /> : (
            <Table
              rowKey={(r) => Object.values(r).join('|')} size="small" dataSource={rows} pagination={{ pageSize: 25 }} scroll={{ x: true }}
              columns={def.fields.map((f) => ({ title: f.label, dataIndex: f.fieldCode, align: (f.align === 'right' ? 'right' : 'left') as 'right' | 'left' }))}
            />
          )}
        </Card>
      )}
    </div>
  )
}
