# OneGate WMS — Rapor İhtiyaç Analizi (2026-07-31)

Karar: Raporlar **tek çatı (Rapor Merkezi) değil, ayrı menü öğeleri** olarak sunulur (Stok Raporu deseni).
Motor değişmedi: `reportSeed` (Başlık/Kriter/Saha) + `report-run` — yeni rapor = seed'e tanım + `reportBuilder`'a sourceKey.

## Mevcut raporlar (canlı)

| Menü | Kaynak | Durum |
|---|---|---|
| Stok Raporu | özel ekran (tesis/depo kırılımı, CSV) | ✅ |
| Doluluk (Lokasyon) | OCCUPANCY | ✅ |
| Giriş / Çıkış / Transfer Hareketleri | MOVEMENTS_IN/OUT/TR (ledger) | ✅ |
| Açık Belgeler | OPEN_DOCUMENTS | ✅ |
| Sevkiyat · İade | SHIPMENTS · RETURNS | ✅ |
| Palet İzleme · Palet Tarihçesi | PALLET_TRACK · PALLET_HISTORY | ✅ |

## Önerilen yeni raporlar (öncelikli)

**P1 — operasyonun günlük ihtiyacı**
| Rapor | Amaç | Ana kriterler | Kaynak notu |
|---|---|---|---|
| Ürün Hareket Ekstresi | tek ürünün kronolojik giriş/çıkış/devir dökümü (StokBar ekstre karşılığı) | ürün*, tarih aralığı, depo | LEDGER (running balance) |
| SKT Yaklaşan / Geçen | son kullanma riskindeki lotlar | gün eşiği, tesis, ürün | STOCK (expiryDate ≤ bugün+N) |
| Lot/Parti İzleme | lot bazında nerede-ne-kadar + hangi belgelerle | batchNo*, ürün | STOCK + LEDGER |
| Rezervasyon Raporu | rezerve stok → hangi belgeye, ne kadar süredir | tesis, cari, belge | STOCK (reservedQty>0 + belge join) |
| Sayım Fark Özeti | tamamlanan sayımların fark dökümü (miktar/ürün bazında) | sayım no, tarih | COUNT+LINES |

**P2 — yönetim/performans**
| Rapor | Amaç | Kaynak notu |
|---|---|---|
| Günlük Operasyon Özeti | gün bazında belge sayısı/satır/miktar (giriş-çıkış-transfer kırılımı) | DOCUMENT groupBy |
| Kullanıcı Performansı | kullanıcı başına okutma/satır/belge (tarih aralığı) | SCOPE.createdBy |
| Belge Çevrim Süresi | DRAFT→COMPLETED süreleri (op tipine göre ort./maks) | STATUSHISTORY |
| Ölü Stok | N gündür hareket görmeyen stok | STOCK − LEDGER(son N gün) |
| Negatif/Uyumsuz Stok | tutarlılık denetimi (negatif, birim uyumsuz) | STOCK denetim |

**P3 — entegrasyon/izleme:** Entegrasyon Aktarım Özeti (başarı/hata oranı, paket bazında) · Okutma Hata Analizi (koşul kırma logları).

Sıra önerisi: P1'i tek turda (5 rapor, hepsi mevcut motorla) → kullanıcı geri bildirimi → P2.
