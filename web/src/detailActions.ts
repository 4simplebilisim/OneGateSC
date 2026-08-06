// İşlem kaynakları için detay ekranı + duruma göre yaşam-döngüsü aksiyonları
export interface DetailAction {
  action: string // POST /api/<resource>/:id/<action>
  label: string
  when: string[] // bu status/result değerlerinde göster
  danger?: boolean
  body?: Record<string, unknown> // gövdeli aksiyon (decide {pass} gibi)
  key?: string // aynı action birden fazla kez varsa benzersizlik (busy state)
}

export const DETAIL_ACTIONS: Record<string, DetailAction[]> = {
  documents: [
    { action: 'start-picking', label: 'Toplamaya Başla', when: ['DRAFT'] }, // Bekliyor → Toplanıyor
    { action: 'confirm', label: 'Onaya Gönder', when: ['DRAFT'] }, // → Onay Bekliyor (eksik toplamada engellenir)
    { action: 'split', label: 'Böl', when: ['DRAFT'] }, // toplanan kısmı yeni belgeye ayır (eksik toplamada)
    { action: 'plan', label: 'Planla', when: ['DRAFT'] }, // toplamadan ÖNCE parçalara ayır (Belge Planlama Parametresi)
    { action: 'complete', label: 'Onayla (stok işle)', when: ['CONFIRMED'] }, // → Onaylandı
    { action: 'cancel', label: 'İptal', when: ['DRAFT', 'CONFIRMED'], danger: true },
    { action: 'reverse', label: 'Onay İptal', when: ['COMPLETED'], danger: true }, // stok geri al + Bekliyor'a dön (yeniden onaylanabilir)
  ],
  'purchase-orders': [
    { action: 'submit', label: 'Gönder', when: ['DRAFT'] },
    { action: 'approve', label: 'Onayla', when: ['SUBMITTED'] },
    { action: 'reject', label: 'Reddet', when: ['SUBMITTED'], danger: true },
    { action: 'cancel', label: 'İptal', when: ['DRAFT', 'SUBMITTED', 'APPROVED'], danger: true },
  ],
  'sales-orders': [
    { action: 'submit', label: 'Gönder', when: ['DRAFT'] },
    { action: 'approve', label: 'Onayla', when: ['SUBMITTED'] },
    { action: 'reject', label: 'Reddet', when: ['SUBMITTED'], danger: true },
    { action: 'allocate', label: 'Stok Ayır (FEFO)', when: ['APPROVED'] },
    { action: 'deallocate', label: 'Ayırmayı Geri Al', when: ['APPROVED'] },
    { action: 'create-pick-order', label: 'Toplama Emri Oluştur', when: ['APPROVED'] },
    { action: 'ship-allocated', label: 'Sevk Et', when: ['APPROVED'] },
    { action: 'cancel', label: 'İptal', when: ['DRAFT', 'SUBMITTED', 'APPROVED'], danger: true },
  ],
  'work-orders': [
    { action: 'start', label: 'Başlat', when: ['PLANNED'] },
    { action: 'complete', label: 'Tamamla', when: ['IN_PROGRESS'] },
    { action: 'cancel', label: 'İptal', when: ['PLANNED', 'IN_PROGRESS'], danger: true },
  ],
  'stock-counts': [
    { action: 'complete', label: 'Tamamla (stok düzelt)', when: ['DRAFT', 'COUNTING'] },
    { action: 'cancel', label: 'İptal', when: ['DRAFT', 'COUNTING'], danger: true },
    { action: 'reverse-equalize', label: 'Sayım Onayı İptal (eşitlemeyi geri al)', when: ['COMPLETED'], danger: true },
  ],
  invoices: [
    { action: 'issue', label: 'Kes', when: ['DRAFT'] },
    { action: 'cancel', label: 'İptal', when: ['DRAFT', 'ISSUED'], danger: true },
  ],
}

export const hasDetail = (resource: string) => resource in DETAIL_ACTIONS
