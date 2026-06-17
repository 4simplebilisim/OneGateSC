// Çok-satırlı (header + satır) oluşturma ekranı olan işlem kaynakları
export interface TxnField {
  name: string
  label: string
  type: 'text' | 'number' | 'ref'
  required?: boolean
  refResource?: string
}

export interface TxnConfig {
  label: string
  header: TxnField[]
  line: TxnField[]
}

const orderLine: TxnField[] = [
  { name: 'productId', label: 'Ürün', type: 'ref', required: true, refResource: 'products' },
  { name: 'unitId', label: 'Birim', type: 'ref', required: true, refResource: 'units' },
  { name: 'quantity', label: 'Miktar', type: 'number', required: true },
  { name: 'unitPrice', label: 'B.Fiyat', type: 'number' },
]

export const TXN_CONFIG: Record<string, TxnConfig> = {
  'sales-orders': {
    label: 'Satış Siparişi',
    header: [
      { name: 'orderNo', label: 'Sipariş No', type: 'text', required: true },
      { name: 'customerId', label: 'Müşteri', type: 'ref', required: true, refResource: 'partners' },
      { name: 'warehouseId', label: 'Depo', type: 'ref', required: true, refResource: 'warehouses' },
    ],
    line: orderLine,
  },
  'purchase-orders': {
    label: 'Satınalma Siparişi',
    header: [
      { name: 'orderNo', label: 'Sipariş No', type: 'text', required: true },
      { name: 'supplierId', label: 'Tedarikçi', type: 'ref', required: true, refResource: 'partners' },
      { name: 'warehouseId', label: 'Depo', type: 'ref', required: true, refResource: 'warehouses' },
    ],
    line: orderLine,
  },
}

export const hasTxnCreate = (resource: string) => resource in TXN_CONFIG
