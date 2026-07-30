// Ortak durum meta'sı — ham enum'lar UI'da yerelleştirilmiş, renkli rozetlerle gösterilir.
// GenericList + GenericDetail + StockReport aynı sözlüğü kullanır (drift olmasın).

export const STATUS_COLOR: Record<string, string> = {
  COMPLETED: 'green', CONFIRMED: 'blue', PLANNED: 'gold', IN_PROGRESS: 'cyan', CANCELLED: 'red',
  DRAFT: 'default', SUBMITTED: 'gold', APPROVED: 'green', REJECTED: 'red', SHIPPED: 'green', PAID: 'green',
  COUNTING: 'gold', PENDING: 'gold', PASSED: 'green', FAILED: 'red', ISSUED: 'blue',
  // Stok statüsü (kalite) — stok takibindeki statü kolonu
  AVAILABLE: 'green', QUARANTINE: 'gold', BLOCKED: 'red', DAMAGED: 'volcano',
}

// Enum → Türkçe görünüm adı. Belge ekranları kendi documentStatus adını (DB'den) kullanır;
// bu sözlük documentStatus'u olmayan kaynaklar + stok statü kodları için devrededir.
export const STATUS_TR: Record<string, string> = {
  DRAFT: 'Taslak', CONFIRMED: 'Onaylı', COMPLETED: 'Tamamlandı', CANCELLED: 'İptal',
  PLANNED: 'Planlandı', IN_PROGRESS: 'Devam Ediyor', SUBMITTED: 'Gönderildi',
  APPROVED: 'Onaylandı', REJECTED: 'Reddedildi', SHIPPED: 'Sevk Edildi', PAID: 'Ödendi',
  COUNTING: 'Sayımda', PENDING: 'Bekliyor', PASSED: 'Geçti', FAILED: 'Başarısız', ISSUED: 'Kesildi',
  AVAILABLE: 'Kullanılabilir', QUARANTINE: 'Karantina', BLOCKED: 'Bloke', DAMAGED: 'Hasarlı',
}

// Yön enum'u (operasyon tipleri vb. listelerde ham INBOUND/OUTBOUND görünmesin)
export const DIRECTION_TR: Record<string, string> = {
  INBOUND: 'Giriş', OUTBOUND: 'Çıkış', INTERNAL: 'Transfer', COUNT: 'Sayım',
}

export const statusLabel = (code?: string | null) => (code ? (STATUS_TR[code] ?? code) : '')
