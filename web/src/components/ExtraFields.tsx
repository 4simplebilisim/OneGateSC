import { useEffect, useState } from 'react'
import { App, Button, Card, DatePicker, Input, InputNumber, Select, Space, Tag } from 'antd'
import { SaveOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import { axiosInstance } from '../providers/dataProvider'

type Def = {
  id: number; description: string; dataType: 'MULTI_SELECT_FIXED' | 'TEXT' | 'NUMERIC' | 'DATE' | 'LOOKUP'
  required: boolean; defaultValue: string | null; minLength: number | null; maxLength: number | null
  maxAnswerCount: number | null; options: Array<{ code: string; description: string | null }>
}
const errMsg = (e: unknown, f: string) => (e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? f

// EK SAHALAR — operasyona bağlı kullanıcı tanımlı alanlar (Uyarlamalar › Ek Sahalar).
// Operasyonda tanım yoksa kart hiç görünmez.
export const ExtraFields = ({ documentId, readOnly }: { documentId: number | string; readOnly?: boolean }) => {
  const { message } = App.useApp()
  const [defs, setDefs] = useState<Def[]>([])
  const [degerler, setDegerler] = useState<Record<string, string>>({})
  const [kaydediliyor, setKaydediliyor] = useState(false)

  useEffect(() => {
    axiosInstance.get(`/api/documents/${documentId}/extra-fields`)
      .then((r) => {
        setDefs(r.data?.defs ?? [])
        setDegerler(
          Object.fromEntries(Object.entries((r.data?.values ?? {}) as Record<string, string>).map(([k, v]) => [k, v ?? ''])),
        )
      })
      .catch(() => undefined) // tanım yoksa sessiz
  }, [documentId])

  if (!defs.length) return null

  const yaz = (id: number, v: string) => setDegerler((p) => ({ ...p, [String(id)]: v }))

  const kaydet = async () => {
    setKaydediliyor(true)
    try {
      const r = await axiosInstance.put(`/api/documents/${documentId}/extra-fields`, { values: degerler })
      setDegerler(Object.fromEntries(Object.entries((r.data?.values ?? {}) as Record<string, string>).map(([k, v]) => [k, v ?? ''])))
      message.success('Ek sahalar kaydedildi')
    } catch (e) { message.error(errMsg(e, 'Kaydedilemedi')) } finally { setKaydediliyor(false) }
  }

  const alan = (d: Def) => {
    const v = degerler[String(d.id)] ?? ''
    if (readOnly) return <span>{v || <span style={{ color: '#8696ae' }}>—</span>}</span>
    switch (d.dataType) {
      case 'MULTI_SELECT_FIXED':
        return (
          <Select style={{ width: 260 }} size="small" allowClear
            mode={d.maxAnswerCount && d.maxAnswerCount > 1 ? 'multiple' : undefined}
            maxCount={d.maxAnswerCount && d.maxAnswerCount > 1 ? d.maxAnswerCount : undefined}
            value={d.maxAnswerCount && d.maxAnswerCount > 1 ? (v ? v.split(',') : []) : (v || undefined)}
            onChange={(x) => yaz(d.id, Array.isArray(x) ? x.join(',') : (x ?? ''))}
            options={d.options.map((o) => ({ value: o.code, label: o.description ? `${o.code} — ${o.description}` : o.code }))} />
        )
      case 'NUMERIC':
        return <InputNumber style={{ width: 200 }} size="small" value={v === '' ? null : Number(v)}
          onChange={(x) => yaz(d.id, x == null ? '' : String(x))} />
      case 'DATE':
        return <DatePicker style={{ width: 200 }} size="small" format="DD.MM.YYYY"
          value={v ? dayjs(v) : null} onChange={(x) => yaz(d.id, x ? x.format('YYYY-MM-DD') : '')} />
      default:
        return <Input style={{ width: 260 }} size="small" value={v} maxLength={d.maxLength ?? undefined}
          onChange={(e) => yaz(d.id, e.target.value)} />
    }
  }

  return (
    <Card className="og-section-card" size="small" title="Ek Sahalar"
      extra={readOnly ? null : <Button type="primary" size="small" icon={<SaveOutlined />} loading={kaydediliyor} onClick={kaydet}>Kaydet</Button>}>
      <Space direction="vertical" size={10} style={{ width: '100%' }}>
        {defs.map((d) => (
          <Space key={d.id} wrap size="middle">
            <span style={{ display: 'inline-block', minWidth: 200, color: 'var(--og-muted)' }}>
              {d.description}{d.required ? <span style={{ color: '#d4380d' }}> *</span> : null}
            </span>
            {alan(d)}
            {d.minLength || d.maxLength ? <Tag>{d.minLength ?? 0}–{d.maxLength ?? '∞'} karakter</Tag> : null}
          </Space>
        ))}
      </Space>
    </Card>
  )
}
