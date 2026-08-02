-- Marka platform seviyesine çıktı: ürünler "OneGate WMS" ve "OneGate Procurement"
UPDATE wms."TBLAPPLICATION" SET "name" = 'OneGate Procurement',
  "description" = 'Talep, teklif, sipariş, sözleşme, fatura', "updatedAt" = now()
WHERE code = 'PROC';
UPDATE wms."TBLAPPLICATION" SET "name" = 'OneGate WMS',
  "description" = 'Mal kabul, yerleştirme, toplama, sayım, sevkiyat', "updatedAt" = now()
WHERE code = 'WMS';
