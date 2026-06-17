# OneGate WMS — Kapsam & Durum Raporu

> 2026-06-09 · Kaynak: legacy SB WMS Excel (459 tablo) → temiz yeniden tasarım
> **Özet: WMS çekirdeği uçtan uca ayakta — mal kabulden sevke, görev yönetiminden yönlendirmeye.**

## 📊 Metrikler
| Ölçü | Değer |
|---|---|
| Domain tablo | **46** (wms 36 · procurement 2 · sales 3 · logistics 3 · finance 2) |
| API endpoint | **~135** (28 route dosyası) |
| Migration | 20 |
| UI ekran | 25 (liste) + 14 form + 4 detay/aksiyon + 2 çok-satırlı |
| Test | smoke (her endpoint) + ~18 E2E paketi, hepsi yeşil |
| Stack | Fastify 5 · Prisma 7 (PG) · React 19 + Refine 5 + antd 6 · JWT/RBAC |

## ✅ Modül olgunluğu
| Modül | % | Kapsam |
|---|---|---|
| WMS çekirdek (depo·alan·lokasyon ağacı·birim·ürün·palet) | %98 | tam |
| Stok (lot·batch·seri·palet·FEFO·rezerve) | %92 | tam |
| Hareket motoru (belge kaynak→hedef·giriş/çıkış/transfer·ters-kayıt) | %92 | tam |
| **İş emri / görev yönetimi** | %85 | planla→ata→başla→raporla→tamamla + stok köprüsü |
| **Toplama emri (picking)** | %85 | satıştan yönlendirilmiş pick (lokasyon/parti) |
| **Yönlendirme (directed putaway)** | %80 | ürün/grup→lokasyon/grup kuralı + mal kabulde öneri |
| Tanım/master (sayaç·neden·grup·M-N·koşul/yönlendirme tipleri) | %85 | tam |
| Sayım / kalite | %65 | snapshot→düzelt · muayene→statü |
| Inventory / MRP | %70 | min/max·reorder→taslak satınalma |
| Procurement (sipariş→onay→mal kabul·finans) | %70 | çalışır |
| Sales (sipariş→onay→allocate→sevk·finans) | %88 | tam akış |
| Logistics (araç·sevkiyat·durak) | %80 | çalışır |
| Finance (fatura→kesim→tahsilat) | %65 | temel |
| Auth / RBAC (JWT·ADMIN/OPERATOR/VIEWER·super-admin) | %75 | çalışır |
| **UI (Refine: CRUD·detay·aksiyon·çok-satırlı)** | %70 | uçtan uca tıklanabilir |

### 🎯 WMS genel olgunluk: **~%87**

## 🔄 Uçtan uca akışlar (hepsi çalışır)
1. **Mal kabul (inbound):** belge oluştur → *yönlendirme önerisi hedef lokasyonu doldurur* → onayla → tamamla → **stok girer**
2. **Sevk (outbound):** satış siparişi → onayla → **stok ayır (FEFO)** → **toplama emri** (yönlendirilmiş) → topla → sevk → **stok düşer** → fatura
3. **Görev (iş emri):** planla → ata → başla → toplananı raporla → tamamla → *toplanan miktar stoğu hareket ettirir (INTERNAL belge)*
4. **Yönlendirme:** `suggest(ürün)` → kural tabanlı lokasyon önerisi (öncelik sıralı)

## ⛔ Kapsam dışı / ertelenen (bilinçli)
- Ayrı **satınalma DB'sinin birleştirilmesi** — kullanıcı: "ileride"
- Koşul/yönlendirme alt-sisteminin kalan ~22 tablosu (parametre·log·kontrol sahası·kırma nedeni/şifresi) — çekirdek 4 alındı
- **AI modülü** — kullanıcı: "en sona"
- Cari hesap defteri · muhasebe/GL · maliyet/değerleme (legacy'de de ayrı)

## 🗺️ Sonraki öneriler
- UI: belge oluşturma ekranı (suggest önizlemeli) · liste filtreleri/arama
- Sayım/kalite UI akışları · raporlar dashboard'u
- (ileride) satınalma DB birleştirme · AI
