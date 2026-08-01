# 4Procurement+ × OneGate — Tek Veri Tabanında Birleşim Planı (2026-08-01)

Hedef: 4Procurement+ ürünü OneGate ile **aynı tabloları** kullanacak; ana veri tek kaynak, satınalma→depo akışı kesintisiz.

## Mevcut durum (OneGate tarafı — hazır olanlar)
- PostgreSQL 16, 5 şema: `wms · procurement · sales · logistics · finance` (çok-kiracılı, `companyId`).
- `procurement` şeması çekirdeği VAR: `TBLPURCHASEORDER` (para birimi, kur, ara/indirim/KDV/genel toplam, onaylayan+onay tarihi, beklenen tarih, teslim deposu) + `TBLPURCHASEORDERLINE` + durum akışı (DRAFT→…).
- Ortak master'lar `wms`'te: TBLCOMPANY (tenant), TBLUSER (+yetki/hak), TBLPRODUCT/TBLUNIT, TBLBUSINESSPARTNER (SUPPLIER tipi), TBLWAREHOUSE/TBLFACILITY.
- Depo bağlantı motoru hazır: **Referans Kontrollü belge** (onaylı siparişten otomatik mal-kabul belgesi doğurma) + Otomatik Ref. tanımları + entegrasyon paket/adres katmanı.
- UI: satınalma ekranları rafta (`hidden: true`) — menüde tek hamleyle açılır.

## Mimari karar (öneri: B)
| | A) 4P+ ayrı uygulama, aynı DB | **B) 4P+ OneGate platformuna modül (önerilen)** |
|---|---|---|
| Veri | Aynı tablolar, iki yazan | Aynı tablolar, tek yazan |
| Migration sahipliği | ÇATIŞMA riski (iki repo şema değiştirir) | Tek repo (Prisma) — güvenli |
| Kimlik | SSO/JWT paylaşımı kurulmalı | Mevcut JWT+RBAC+ekran hakları aynen |
| UI | İki ayrı arayüz, iki tema | Tek arayüz (4Simple teması), menüde "Satınalma" bölümü |
| Maliyet | Sürekli senkron/sözleşme bakımı | Bir kerelik taşıma |

A zorunluysa altın kural: **şema sahipliği ayrılır** — `procurement` şemasına yalnız 4P+ yazar, `wms` master'larını yalnız OKUR (view/API ile); migration'lar tek repodan yönetilir.

## Ortak veri sözleşmesi
Tek kaynak (wms): Firma=tenant · Kullanıcı+yetki · Ürün/Birim/Barkod · Cari (tedarikçi=SUPPLIER; 4P+'ın tedarikçi ek alanları `TBLBUSINESSPARTNER`'a kolon/ek-saha olarak) · Depo/Tesis.
`procurement` genişletmeleri (4P+ işlevine göre eklenecek): `TBLPURCHASEREQUEST(+LINE)` (talep + onay akışı), `TBLRFQ(+LINE/+VENDORQUOTE)` (teklif toplama/karşılaştırma), `TBLPOAPPROVAL` (çok-adımlı onay geçmişi), `TBLVENDORCONTRACT/PRICELIST` (anlaşma fiyatları), PO satırına `receivedQty` (karşılama).

## Süreç köprüleri (asıl değer)
1. **PO onayı → depo beklentisi:** onaylanan siparişten Referans Kontrollü **mal kabul belgesi** otomatik doğar (motor hazır); depo plana karşı toplar.
2. **Mal kabul complete → PO karşılama:** giriş belgesi tamamlanınca PO satır `receivedQty` güncellenir; tam/kısmi karşılama durumu (kısmiye yeni sevkiyat bekler).
3. **Fatura eşleşmesi (3-yollu):** PO × mal kabul × fatura → `finance.TBLINVOICE` (iskelet mevcut).
4. Talep→PO→GRN zinciri raporları mevcut rapor motoruna tanım olarak eklenir.

## Yol haritası
- **Faz 0 — Keşif (birlikte):** 4P+'ın veri modeli/akış envanteri → alan-alan eşleme tablosu (bu dokümana eklenecek).
- **Faz 1 — Ana veri birleşimi:** 4P+ tedarikçi/ürün verisi wms master'larına taşınır (Excel/script); çakışan kodlar raporlanır.
- **Faz 2 — PO akışı:** satınalma ekranları menüde açılır, 4P+ PO'ları `procurement` tablolarına taşınır; PO→mal kabul köprüsü bağlanır.
- **Faz 3 — Talep/Teklif/Onay:** 4P+'a özgü akışlar (PR/RFQ/onay zinciri) şema+ekran olarak eklenir.
- **Faz 4 — Fatura & raporlar:** 3-yollu eşleşme + satınalma raporları; 4P+ eski sistemi kapatılır.

## Senden gerekenler (Faz 0 girdileri)
1. 4P+ teknolojisi ve kod/DB erişimi (hangi dil/DB, tablo dökümü ya da örnek yedek).
2. Canlıda kullanılan akışlar (yalnız PO mu; talep/onay/teklif var mı?) ve kullanıcı sayısı.
3. Taşınacak tarihsel veri kapsamı (açık PO'lar mı, tüm geçmiş mi).
