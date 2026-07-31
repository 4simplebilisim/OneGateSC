import { useState } from 'react'
import { Alert, Button, Modal } from 'antd'
import { axiosInstance } from '../providers/dataProvider'

// ── Belge Onay Tipi (BYTONAYTIPI) — el terminali "İleri" akışı ──
// 1=Toplama Ekranından Onay: okutma bitince "onay verilsin mi?" → Onay = confirm+complete (genelde kontrolsüz)
// 2=Tek Aşamalı Onay: kontrollüde kısmi toplama → Onayla / Böl seçenekleri
// 3=İki Aşamalı Onay: mobilden yalnız ONAYA GÖNDER (confirm) — SON onay Gözlem ekranından (complete)
export type ApprovalType = 1 | 2 | 3 | null
export type ApprovalOutcome = 'completed' | 'confirmed' | 'split' | 'draft'

/** Operasyonun Belge Onay Tipi tanımını çöz (tesis eşleşmeli; kayıt yoksa null = akış tanımsız). */
export async function resolveApprovalType(operationTypeId: number, facilityId?: number | null): Promise<ApprovalType> {
  try {
    const r = await axiosInstance.get('/api/document-approval-types', { params: { pageSize: 300 } })
    const rows = (Array.isArray(r.data) ? r.data : (r.data.data ?? [])) as { operationTypeId: number; facilityId?: number | null; approvalType: number; isActive?: boolean }[]
    const m = rows.find((x) => x.operationTypeId === operationTypeId && x.isActive !== false && (x.facilityId == null || facilityId == null || x.facilityId === facilityId))
    const t = m?.approvalType
    return t === 1 || t === 2 || t === 3 ? t : null
  } catch {
    return null
  }
}

const apiErr = (e: unknown) => (e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'İşlem başarısız'

/** İleri modalı — onay tipine göre butonlar; API kapıları (okutma/tolerans/toplama) hatayı mesajla döndürür, modal açık kalır. */
export const IleriModal = ({ open, docId, docNo, approvalType, onClose, onOutcome, notify }: {
  open: boolean
  docId: number
  docNo: string
  approvalType: ApprovalType
  onClose: () => void
  onOutcome: (o: ApprovalOutcome, info?: string) => void
  notify: { error: (m: string) => void; success: (m: string) => void }
}) => {
  const [busy, setBusy] = useState<string | null>(null)
  const run = async (key: string, fn: () => Promise<void>) => {
    setBusy(key)
    try { await fn() } catch (e) { notify.error(apiErr(e)) } finally { setBusy(null) }
  }
  const approve = () => run('approve', async () => {
    await axiosInstance.post(`/api/documents/${docId}/confirm`)
    await axiosInstance.post(`/api/documents/${docId}/complete`)
    notify.success('Belge onaylandı — stok işlendi')
    onOutcome('completed')
  })
  const confirmOnly = () => run('confirm', async () => {
    await axiosInstance.post(`/api/documents/${docId}/confirm`)
    notify.success('Onaya gönderildi — son onay Gözlem ekranından')
    onOutcome('confirmed')
  })
  const split = () => run('split', async () => {
    const r = await axiosInstance.post(`/api/documents/${docId}/split`)
    notify.success(`Toplanan kısım yeni belgeye ayrıldı (${r.data?.newDocument?.documentNo ?? r.data?.documentNo ?? ''})`)
    onOutcome('split', r.data?.newDocument?.documentNo)
  })

  const btn = { height: 46, fontSize: 15, fontWeight: 700 } as const
  return (
    <Modal open={open} onCancel={onClose} footer={null} centered title={`İleri — ${docNo}`}>
      {approvalType === 1 && (
        <>
          <p style={{ fontSize: 15 }}>Okutma işlemleri bitti. <b>Onay vermek istiyor musunuz?</b> (stok işlenir)</p>
          <Button type="primary" block style={btn} loading={busy === 'approve'} onClick={approve}>Onay Ver</Button>
          <Button block style={{ ...btn, marginTop: 8 }} onClick={() => { onOutcome('draft'); }}>Hayır — Taslak Kalsın</Button>
        </>
      )}
      {approvalType === 2 && (
        <>
          <p style={{ fontSize: 15 }}>Toplama adımı: tamamı toplandıysa <b>Onayla</b>; kısmi toplandıysa <b>Böl</b> ile toplanan kısmı ayırıp ilerleyin.</p>
          <Button type="primary" block style={btn} loading={busy === 'approve'} onClick={approve}>Onayla</Button>
          <Button block style={{ ...btn, marginTop: 8 }} loading={busy === 'split'} onClick={split}>Böl (toplananı ayır)</Button>
          <Button type="text" block style={{ marginTop: 8 }} onClick={onClose}>Vazgeç</Button>
        </>
      )}
      {approvalType === 3 && (
        <>
          <p style={{ fontSize: 15 }}>İki aşamalı onay: belge <b>onaya gönderilir</b>; son onay <b>Gözlem ekranından</b> verilir.</p>
          <Button type="primary" block style={btn} loading={busy === 'confirm'} onClick={confirmOnly}>Onaya Gönder</Button>
          <Button type="text" block style={{ marginTop: 8 }} onClick={onClose}>Vazgeç</Button>
        </>
      )}
      {approvalType === null && (
        <>
          <Alert
            type="error" showIcon style={{ marginBottom: 12 }}
            message="Onay tipi tanımlı değil — onay verilemez"
            description="Bu operasyon için Belge Onay Tipi tanımlanmadan el terminalinden onay verilemez. Belge taslak kalır. Tanım: Uyarlamalar › Belge Onay Tipi (Tesis + Operasyon + Onay Tipi)."
          />
          <Button danger block style={btn} onClick={() => onOutcome('draft')}>Tamam — Taslak Kalsın</Button>
        </>
      )}
    </Modal>
  )
}
