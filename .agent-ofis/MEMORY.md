---
title: "OneGate — Hafıza İndeksi"
type: memory-index
updated: 2026-06-16
topics: [schema, migration, auth, api, prisma, wms, belge, legacy, stok, multi-tenant, procurement, satinalma, ui, ux, arayuz, frontend, tasarim, theme, mobil, el-terminali, handheld, barkod]
---

# 📚 OneGate — WMS & Procurement — Topic İndeksi

> Tech Lead her run başında **yalnızca bu dosyayı** okur, eşleşen topic'in pointer'larından girer.
> Granular kalıt: runs/decisions/sprints. Bu dosya sadece pointer haritası.

## Şema / migration / tablo
Kanonik kod: [[prisma/schema.prisma]], [[prisma.config.ts]]
Kararlar:
- [[decisions/0001-wms-core-schema]] — WMS core 9 tablo + 3 enum, TBL+İngilizce konvansiyonu
Geçmiş runs:
- [[runs/2026-06-08T15-17-34-wms1]] — WMS core kuruldu, Prisma 7 adapter bug fix
Notlar: 2 migration uygulı (init + wms_core_schema), DB güncel. multiSchema (wms+procurement) Prisma 7'de GA — previewFeatures gerekmez.

## Prisma / driver / runtime
Kanonik kod: [[src/lib/prisma.ts]], [[prisma.config.ts]]
Kararlar:
- [[decisions/0002-prisma7-driver-adapter]] — Prisma 7 runtime client = @prisma/adapter-pg zorunlu
Geçmiş runs:
- [[runs/2026-06-08T15-17-34-wms1]] — adapter eksikti, server DB'ye bağlanamıyordu; fix edildi

## Auth / yetki / kullanıcı
Kanonik kod: [[src/routes/auth.ts]], [[src/types/fastify.d.ts]], [[src/seed.ts]]
Notlar: JWT (@fastify/jwt), bcryptjs hash. Roller: ADMIN/OPERATOR/VIEWER. Seed admin: admin/admin123. JWT payload: {sub, username, roles}. `app.authenticate` preHandler korumalı POST'larda.

## API endpoint / route
Kanonik kod: [[src/app.ts]], [[src/routes/]], [[tests/smoke.ts]]
Notlar: Fastify 5. Route prefix'leri /api/*. GET list'ler public, POST'lar JWT korumalı. zod ile body validation (400 + flatten). Prisma P2002→409, P2003→400 map'leniyor. **CORS DİKKAT**: `@fastify/cors origin:true` TEK BAŞINA metodları GET,HEAD,POST'a kısıtlıyor → tarayıcıdan PATCH/DELETE patlar. `methods:[GET,HEAD,POST,PUT,PATCH,DELETE,OPTIONS]` ZORUNLU (bkz [[runs/2026-06-12T10-00-00-label-designer]]). smoke app.inject olduğu için CORS bug'larını YAKALAMAZ — tarayıcı testi şart. wmsMasters factory'de artık GET /:id de var.

## Etiket tasarımı / label designer / barkod / yazıcı
Kanonik kod: [[web/src/pages/LabelDesigner.tsx]], [[web/src/code128.ts]], [[src/routes/printers.ts]], [[src/routes/wmsMasters.ts]]
Geçmiş runs:
- [[runs/2026-06-12T10-00-00-label-designer]] — görsel sürükle-bırak etiket tasarımcısı + Stok/Belge menü ayrımı + CORS fix
- [[runs/2026-06-12T10-45-00-op-tabbed-editor]] — Operasyon Tipi sekmeli tek-ekran editör (Tanım+Statü+Lokasyon+Neden+Palet); op-link'ler ayrı menü değil, OperationTypeForm sekmelerinde (LinkTab).
- [[runs/2026-06-12T11-45-00-printers-mdns]] — TBLPRINTER + mDNS/IPP ağ keşfi (bonjour-service) + gerçek Code128; Statü/Neden/Palet master'ları Tanımlamalar'a taşındı
Notlar: TBLLABELTYPE.layoutJson (Text) = boyut+element listesi JSON (bizim eklediğimiz). Tasarımcı /label-types/:id/design; GenericList'te 'Tasarla'. Elemanlar: metin/veri-alanı/barkod/çizgi; mm ölçekli tuval; Yazdır/PDF. **Barkod artık gerçek Code128-B** ([[web/src/code128.ts]], bağımsız). **Yazıcılar**: TBLPRINTER (IPP/ZPL/SYSTEM, bizim eklediğimiz) Uyarlamalar/Genel; /api/printers CRUD + POST /discover (mDNS, bonjour-service); 'Ağı Tarat' modalı. Otomatik keşif backend↔yazıcı aynı LAN gerektirir (sandbox boş). **GERÇEK BASIM (IPP/ZPL job submit) henüz YOK** — sonraki adım. Menü: İşlemler = Belge&İş Emri / Stok(Durum) / Sipariş / Lojistik. Statü/Neden/Palet Tipi master'ları Tanımlamalar > 'Statü, Neden, Palet'. Op↔X bağlantıları OperationTypeForm sekmelerinde.

## Legacy WMS / keşif / eşleştirme / stok tasarımı / Faz1 şema
Kanonik kod: [[prisma/schema.prisma]], [[docs/wms-discovery-mapping.md]], [[src/seed.ts]], [[src/lib/company.ts]], [[tablo/_katalog.json]]
Kararlar:
- [[decisions/0003-wms-legacy-redesign]] — 460-tablo legacy "SB" WMS analizi; çok-kiracılı + lot/batch/seri+SKT + tiplenmiş kolon
- [[decisions/0004-wms-phase1-schema]] — Faz1 şema İNŞA EDİLDİ: 7 yeni tablo + 5 enum, çok-kiracılı, migration runbook (diff+deploy)
- [[decisions/0005-wms-phase2-movement]] — Faz2 hareket motoru: TBLOPERATIONTYPE + belge kaynak→hedef + completeDocument $transaction stok kaydı
- [[decisions/0006-wms-reservation-reverse-partner-tenant]] — rezervasyon + ters-kayıt + cari(TBLBUSINESSPARTNER) + JWT companyId + FEFO stok sorgu
Geçmiş runs:
- [[runs/2026-06-08T15-50-26-disc]] — xlsx parse, Hungarian prefix çözüldü, Faz1 ER tasarlandı
- [[runs/2026-06-08T16-50-47-ph1]] — Faz1 tabloları oluşturuldu, migration+seed+smoke yeşil
- [[runs/2026-06-08T17-13-33-ph2]] — Faz2 hareket motoru, belge→stok, smoke 26/26 + motor E2E 10/10
- [[runs/2026-06-08T17-27-16-ph3]] — rezervasyon/ters-kayıt/cari/JWT-tenant/FEFO, smoke 30/30 + E2E 13/13
Notlar: Kaynak `tablo/tablolar.xlsx`. Prefix LNG=int/TXT=varchar/TRH=tarih/BYT=tinyint/DBL=decimal(28,8). **Faz1 İNŞA EDİLDİ:** wms 16 domain tablo (Company/Warehouse/Area/Location-ağaç/Unit/ProductUnit/Product/Status/PalletType/Pallet/Stock + auth + belge donduruldu). companyId multi-tenant. Migration: `migrate dev` AI-non-interactive'de durur → diff+deploy runbook (bkz 0004).

## Procurement / Sales / Inventory modülleri
Kanonik kod: [[src/lib/procurement.ts]], [[src/lib/sales.ts]], [[src/lib/inventory.ts]], [[src/lib/orderFinance.ts]], [[src/routes/purchaseOrders.ts]], [[src/routes/salesOrders.ts]], [[src/routes/inventory.ts]]
Geçmiş runs:
- [[runs/2026-06-09T04-24-28-inv]] — Inventory modülü (min/max + MRP + procurement köprüsü)
- [[runs/2026-06-09T04-54-22-alloc]] — Satış allocation: order→reserve(FEFO)→ship-allocated, rezerve motoru bağlandı
- [[runs/2026-06-09T05-16-47-rbac-log]] — RBAC enforcement + kullanıcı CRUD + Logistics modülü (logistics şeması)
- [[runs/2026-06-09T05-29-56-cqs]] — Logistics↔Sales bağ + Sayım(TBLSTOCKCOUNT) + Kalite(TBLQUALITYINSPECTION, statü geçişi INTERNAL hareketle)
- [[runs/2026-06-09T05-38-55-fin]] — Finance/Invoicing: finance şeması, PO/SO→fatura→issue→pay(PAID), [[src/lib/invoicing.ts]]
- [[runs/2026-06-09T05-56-00-deep]] — Derinleştirme: pagination([[src/lib/pagination.ts]])+PATCH update, stok kartı(/api/stock/card), sipariş düzenleme(PATCH DRAFT), raporlar([[src/routes/reports.ts]])
- [[runs/2026-06-09T08-51-01-wmsmaster]] — WMS master: TBLPRODUCTGROUP/LOT/SERIAL/STOCKLEDGER + product.costPrice/stock.unitCost; ledger movement engine'e bağlı (adjustStock+count→TBLSTOCKLEDGER); /reports/stock-value, /stock/ledger. Boşluk haritası [[docs/onegate-veri-modeli-harita.md]].
Derinleştirme notları: Listeler pagination — products/stock/purchase-orders/sales-orders `{data,total,page,pageSize,pageCount}` döner (?page=&pageSize=&search=); diğerleri hâlâ dizi. PATCH update: products/warehouses/units/partners. Raporlar: /api/reports/{stock-summary,open-orders,invoice-aging,mrp-summary}. Sipariş düzenleme yalnız DRAFT.
RBAC: [[src/lib/rbac.ts]] requireRole; app.requireWrite(ADMIN/OPERATOR)/requireAdmin; yazma endpoint'leri korumalı, GET public; [[src/routes/users.ts]] ADMIN-only. Logistics: yeni `logistics` şeması (TBLVEHICLE/SHIPMENT/SHIPMENTSTOP), [[src/lib/logistics.ts]] dispatch/deliverStop/cancel, [[src/routes/vehicles.ts]]/[[src/routes/shipments.ts]]. Test kullanıcıları: admin(super), operator(OPERATOR), viewer(VIEWER).
Notlar: **procurement** şeması (TBLPURCHASEORDER/LINE +finans), **sales** şeması (TBLSALESORDER/LINE +finans). Akış: order DRAFT→SUBMITTED→APPROVED→receive/ship → WMS belge (completeDocument) → stok. `orderFinance.computeLineFinance/computeOrderTotals` ortak (iskonto/vergi/döviz). Inventory `TBLINVENTORYRULE` (wms şeması) min/max → MRP → taslak PO. Super-admin: TBLUSER.isSuperAdmin + JWT; getCompanyId super-admin'de x-company-id header'ı kabul eder.

## UI / UX / arayüz / frontend / tasarım sistemi / tema
Kanonik kod: [[web/src/theme.ts]], [[web/src/styles.css]], [[web/src/main.tsx]], [[web/src/Shell.tsx]], [[web/src/components/PageHeader.tsx]], [[web/src/pages/GenericList.tsx]]
Geçmiş runs:
- [[runs/2026-06-12T06-15-00-ui-redesign]] — amatör→kurumsal: merkezi tasarım sistemi (theme.ts tam token + 18 komponent override), Inter/Plus Jakarta marka font, PageHeader deseni, toolbar sakinleştirme, ikonlu stat kartları
- [[runs/2026-06-12T07-10-00-ui-forms-login]] — Login cila (orb float anim) + form ekranları StokBar deseni: og-section-card + og-switchrow + sticky og-formbar
- [[runs/2026-06-12T07-45-00-ui-remaining-screens]] — kalan 5 ekran (DocumentCreate/TxnCreate/LocationBulkGenerate/GenericDetail/ProductUnitBarcodes) desene; AntD6 Alert message→title. **38 ekranın tamamı tek tasarım sisteminde.**
- [[runs/2026-06-12T08-15-00-ui-dark-mode]] — **Koyu mod**: theme.ts makeTheme(mode) darkAlgorithm; themeMode.tsx provider+useThemeMode hook; Shell ay/güneş toggle; yüzeyler semantik CSS değişkenlerinden (:root / [data-theme=dark]); Login açık sabit; localStorage og_theme kalıcı.
Koyu mod: `makeTheme(mode)` + `<ThemeModeProvider>` (themeMode.tsx) + `useThemeMode()`. Yüzey renkleri semantik CSS değişkenlerinden döner (--og-page-bg/sunken/border-soft/table-head/muted/ink/formbar). Yeni ekranlarda sabit yüzey hex YASAK → bu değişkenleri kullan. Login markalı, koyu moddan muaf. **Otomatik algılama**: ilk açılış prefers-color-scheme'i izler (isAuto); kullanıcı toggle'ı kalıcı override (localStorage og_theme).
Standart form deseni: `og-page` + `<PageHeader>` + `og-section-card` (bölüm) + `og-switchrow` (boolean toggle satırı) + `og-formbar` (sticky kaydet). 2-kolon (lg'de 3) responsive grid.
Notlar: **theme.ts = TEK KAYNAK** — renk/tipografi/yarıçap(9)/elevation + komponent tokenları orada. Ekran-başı **inline hex YASAK**. BRAND export: cyan #44D4E3, blue #4E86FF (primary), violet #9B5CF6, ink #1B2138, gradient 135deg. Font: gövde Inter, başlık Plus Jakarta Sans (index.html Google Fonts). Standart sayfa: `.og-page` + `<PageHeader>`. Stack: React 19 + Refine 5 + AntD 6 + Vite 8, locale tr_TR. Dev: `npm --prefix web run dev` (:5173), API :3000.

## Marka / branding / assets / favicon
Kanonik kod: [[src/lib/branding.ts]], [[src/routes/branding.ts]], [[OneGate-assets/README.md]]
Geçmiş runs:
- [[runs/2026-06-08T16-57-06-brand]] — logo/icon kiti @fastify/static ile entegre
Notlar: Varlıklar `OneGate-assets/` (SVG + PNG seti). Statik: `/OneGate-assets/*`. Route: `/favicon.svg`, `/favicon.ico`, `/site.webmanifest`, `/api/branding`. Renkler: cyan #44D4E3, blue #4E86FF (theme), violet #9B5CF6, ink #1B2138. Gradyan 158deg. Font: Plus Jakarta Sans 800.

## Procurement / satınalma / sipariş / onay / mal kabul
Kanonik kod: [[src/lib/procurement.ts]], [[src/routes/purchaseOrders.ts]]
Kararlar:
- [[decisions/0007-procurement-module]] — satınalma sipariş + onay akışı + WMS mal kabul köprüsü
Geçmiş runs:
- [[runs/2026-06-09T01-59-01-proc]] — procurement modülü, E2E 14/14
Notlar: schema `procurement`. TBLPURCHASEORDER/LINE. wms'e GEVŞEK bağlı (id ile, cross-schema FK yok, ref app-katmanında doğrulanır). Akış: DRAFT→SUBMITTED→APPROVED→(receive→WMS GR belgesi+stok)→COMPLETED. receiveOrder procurement→WMS köprüsü; kısmi kabul destekli. API: /api/purchase-orders + submit/approve/reject/cancel/receive.

## Sales / satış / sevk / sipariş finansı / super-admin
Kanonik kod: [[src/lib/sales.ts]], [[src/routes/salesOrders.ts]], [[src/lib/orderFinance.ts]], [[src/lib/company.ts]]
Kararlar:
- [[decisions/0008-sales-finance-superadmin]] — satış modülü (sales şeması) + sipariş finansı + super-admin tenant
Geçmiş runs:
- [[runs/2026-06-09T02-21-27-sales]] — satış+finans+super-admin, v4 E2E 18/18
Notlar: schema `sales` (TBLSALESORDER/LINE). shipOrder→WMS OUTBOUND→stok düşer (procurement receive'in aynası). Finans: orderFinance.ts ortak (iskonto/vergi/döviz), PO+SO header subTotal/discountTotal/taxTotal/exchangeRate, satır discountRate/taxRate/amount. Super-admin: TBLUSER.isSuperAdmin; getCompanyId normal kullanıcıyı JWT companyId'ye KİLİTLER, super-admin x-company-id ile seçer. Seed: admin/admin123 (super-admin), operator/operator123 (firma). companyId hâlâ nullable.

## Tesis / depo / alan / lokasyon hiyerarşisi
Kanonik kod: [[src/routes/areas.ts]], [[src/routes/warehouses.ts]], [[src/routes/locations.ts]], [[web/src/resources.ts]]
Geçmiş runs:
- [[runs/2026-06-12T09-05-00-ui-cari-alan]] — eksik 'Alan' katmanı eklendi (areas route tam CRUD + UI kaynağı); Cari etiketi sadeleşti
Notlar: Hiyerarşi **Tesis(TBLFACILITY) → Depo(TBLWAREHOUSE) → Alan(TBLAREA) → Lokasyon(TBLLOCATION ağaç)**. TBLAREA.warehouseId zorunlu; TBLLOCATION.areaId opsiyonel. /api/areas tam CRUD. Menüde Lokasyon grubu bu sırada. Cari etiketi = "Cariler" (parantez yok).

## Belge durumu / yaşam döngüsü
Kanonik kod: [[src/routes/wmsMasters.ts]], [[src/seed.ts]]
Geçmiş runs:
- [[runs/2026-06-12T12-15-00-belge-durum]] — Belge Durumları master (TBLDOCUMENTSTATUS, TBLSBBELGEDURUM'a sadık) + menü grupsuz öğe desteği
- [[runs/2026-06-12T12-45-00-belge-tipleri]] — Belge Durum İşlem/Kriter/Onay Tipi (TBLDOCUMENTSTATUSACTION/CRITERIA, TBLDOCUMENTAPPROVALTYPE); documentTypes.ts code'suz simpleCrud; byte enumlar sayı olarak (semantik icat edilmedi)
- [[runs/2026-06-12T13-05-00-uyarlamalar-duzen]] — Uyarlamalar menüsü StokBar grup düzenine (Genel→Operasyon→Belge Tipleri→Giriş/Çıkış Koşulları→Yönlendirme→Dinamik Etiketleme); grupsuz öğe (group:'') desteği
- [[runs/2026-06-12T14-30-00-kosul-yonlendirme-sayim]] — Giriş/Çıkış Koşulları + Yönlendirme + Sayım (15 legacy config tablosu). wmsConfig.ts. Sayım Parametreleri 21 alan (StokBar modaline sadık). Uyarlamalar grupları StokBar parite ilerliyor.
- [[runs/2026-06-12T21-15-00-scope-enforce-wo-durum]] — **SCOPE ENFORCE** (Yasaklı Ürün): movement.ts cariScopeMatches/materialScopeMatches (Hepsi/Grup/Belirli); completeDocument'ta yasaklı ürün kapsam eşleşince bloke (E2E SPECIFIC+GROUP). + İş Emri belgesi belge durumu=Onaylandı → dört akış (manuel/PO/SO/iş emri) tutarlı.
- [[runs/2026-06-12T20-40-00-faz2-sevk-belge-durumu]] — **DAVRANIŞ Faz 2**: sevk(sales.ts ×2)+mal kabul(procurement.ts) belgeleri artık belge durumu=Onaylandı atıyor (docStatusId). Sevk E2E: SO→allocate(FEFO)→ship → GI Onaylandı + stok 100→99. (B scope şeması migrate'li, DB=şema.)
- [[runs/2026-06-12T20-00-00-faz1-palet-karantina]] — **DAVRANIŞ Faz 1 TAMAM**: palet no = palet tipi öne­k(code)+sayaç+palletNoLength (PX000001); KARANTİNA akışı E2E (qualityControl GR→stok QUARANTINE; INTERNAL Kalite Onay op-statü geçişi→AVAILABLE). Kalite=stok statüsü, belge durumu ayrı eksen — ikisi birlikte çalışıyor.
- [[runs/2026-06-12T19-30-00-op-baglanti-scope]] — Op-bağlantı ortak deseni: **LinkScope enum** (Hepsi/Grup/Belirli) + **Tesis**(facilityId) + BulkActionType. 10 op-bağlantı tablosuna scope+ref. LinkTab'e select desteği. Operasyon Tipi sekmeleri StokBar modaliyle birebir. Int link-tipi→enum.
- [[runs/2026-06-12T18-50-00-optype-kategori-kontrol-tesis]] — Operasyon Tipi çekirdek: Kategori+Sayım (MovementDirection+COUNT), Tesis(facilityId), Kontrollü İşlem boolean→ControlMode enum (Kontrolsüz/Kontrollü/Referans Kontrollü).
- [[runs/2026-06-12T18-15-00-belge-durumu-wiring]] — **DAVRANIŞ Faz 1: belge durumu yaşam döngüsü WIRING**. TBLDOCUMENT.documentStatusId; iç enum korundu, üstüne Belge Durumu map (src/lib/documentStatus.ts): create→Bekliyor, start-picking→Toplanıyor, confirm(Onaya Gönder)→Onay Bekliyor, complete(Onayla)→Onaylandı(stok+motor kuralları), cancel/reverse→İptal. Liste+detayda renkli rozet. Sonraki: palet no üretimi + KARANTİNA akışı.
- [[runs/2026-06-12T17-30-00-palet-tipi-fields]] — Palet Tipi tam alan seti (TBLSBPALETTIPI'ye sadık): PalletMixing enum (Tek Ürün/Karma=BYTTIP), Tesis(facilityId), palet-içi-palet + transfer bayrakları (üst/parçalı palet bozma, transfer). code=prefix, palletNoLength=uzunluk, sequenceId=sayaç. 'kind'(EURO/INDUSTRIAL) bizim icat, gizli.
- [[runs/2026-06-12T17-00-00-tab-konsolidasyon]] — **Süzgeç deseni**: master+ait FK config → sekme. Operasyon Tipi "Kurallar" sekmesi (Tolerans/Yasaklı/Dönüşüm/Toplu İşlem/Grup); Ürün sekmeli editör (Ölçü Birimleri+barkod/Ek Gruplar). LinkTab→components/LinkTab.tsx (ownerField generic); simpleCrud ownerField filtre. İlgili gereksiz düz menüler kaldırıldı.
- [[runs/2026-06-12T16-20-00-genel-isemri-config]] — StokBar Genel ek + İş Emri config + Menü Grubu (13 basit tablo). genelConfig.ts. ERTELENEN: Saha Tanımlamaları (custom-field çatısı), Çoklu Dil (i18n), DE-etiket alt-link'leri. KARAR: basit tabloları batch'le, büyük özellikleri ayır.
- [[runs/2026-06-12T15-55-00-list-ref-resolve]] — GenericList FK id→isim çözümleme (formConfig ref'lerinden) + okunur başlıklar. Tüm config listeleri okunur.
- [[runs/2026-06-12T15-10-00-islemler-stokbar]] — İşlemler menüsü StokBar domain grupları; gizli işlem ekranları (stock-counts/invoices) yüzeye + detay+aksiyon. detailActions body+key; GenericDetail status→result fallback. YENİ TABLO YOK.
- [[runs/2026-06-12T15-25-00-kalite-cikar]] — **KARAR: Kalite ayrı modül DEĞİL** — statü (QUARANTINE/BLOCKED)+operasyon-statü geçişleriyle takip. quality-inspections menüden/akıştan kaldırıldı (backend dormant, silinmedi). İşlemler 8 grup.
- [[runs/2026-06-12T15-40-00-stok-statu-kalite]] — **KALİTE = stok statü kolonu** (TBLSTOCK.statusId → AVAILABLE/QUARANTINE/BLOCKED/DAMAGED). Stok listesinde renkli rozet (GenericList: status:{code} ilişkisi → 'Statü' rozet kolonu, çıplak statusId gizli). **İki eksen**: belge durumu (TBLDOCUMENTSTATUS, Bekliyor→Onaylandı) ≠ stok statüsü (kalite). Hareket motoru zaten source/targetStatusId ayarlıyor.
- [[runs/2026-06-12T13-45-00-operasyon-config]] — Operasyon "ikisi birden" (sekme+düz menü) + 11 legacy operasyon config tablosu (Neden Kategori/Grup Bağlantı/Tolerans/Yasaklı Ürün/Dönüşüm/Sıralı Op/Otomatik Ref/Toplu İşlem/Ürün Ek Grup/Ürün-Sefer Toplama). operationConfig.ts paylaşılan simpleCrud. Operasyon grubu 17 öğe. **simpleCrud documentTypes.ts'ten export**. Config tablolarında companyId düz Int (relation yok). byte/bağlantı-tipi alanları sayı (semantik netleşince select+ref). Tolerans detay ertelendi.
Notlar: TBLDOCUMENTSTATUS = kod/tanım/renk(hex)/sıra (legacy TBLSBBELGEDURUM). /api/document-statuses (factory). Seed: BKL Bekliyor→TPL Toplanıyor→OBK Onay Bekliyor→ONY Onaylandı→IPT İptal (renkli). UI: Uyarlamalar > Belge Tipleri > Belge Durumları; 'color' alan tipi (ColorPicker→hex). **YAŞAM DÖNGÜSÜ WIRING HENÜZ YOK**: belge BKL→TPL(okutma)→OBK(hepsi okutuldu)→ONY(onay) bağlanacak — sonraki adım. Menüde group:'' = doğrudan bölüm altında tek öğe (Statüler/Nedenler/Palet Tipleri böyle).

## Mobil / el terminali / handheld / barkod sorgu
Kanonik kod: [[web/src/mobile/MobileShell.tsx]], [[web/src/mobile/MobileHome.tsx]], [[web/src/mobile/MobileStockQuery.tsx]], [[web/src/mobile/MobileReceipt.tsx]], [[src/routes/lookup.ts]], [[web/src/App.tsx]]
Geçmiş runs:
- [[runs/2026-06-16T14-10-00-mobil-el-terminali]] — **Mobil el terminali /m**: aynı app içinde, auth korumalı, masaüstü Shell YOK. Backend GET /api/lookup/barcode (3 katman barkod→ürün+birim+stok). Ekranlar: Home(4 kutucuk)/Stok Sorgu(scan→ürün+stok)/Mal Kabul(scan→satır→create/confirm/complete→Onaylandı). Toplama+Sayım stub. E2E doğrulandı (Mal Kabul GR-000010 stok yazdı).
Notlar: Karar = **ayrı PWA değil, /m rota grubu** (App.tsx, `<Authenticated>` + Shell yok). Koyu dokunmatik kabuk (MobileShell, NAVY #0a1626, maxWidth 520). Barkod input autofocus + okuma sonrası tekrar odak. Mal Kabul varsayılan op = **GR** (test/yasak op değil); satır create→confirm→complete zincirini çağırıp belge durumu **Onaylandı** ekranı gösteriyor — stok motoru gerçekten yazıyor. `/api/lookup/barcode` 3 katman çözüm: TBLPRODUCTUNITBARCODE → TBLPRODUCTUNIT.barcode → TBLPRODUCT.barcode. **Toplama(/m/pick)+Sayım(/m/count) henüz STUB** — demo öncesi gerçek akış (pick-list/rezervasyon + COUNT operasyonu). Login `username` ile (email değil) — admin/admin123.

## WMS belge / lokasyon / ürün
Kanonik kod: [[src/routes/documents.ts]], [[src/routes/locations.ts]], [[src/routes/products.ts]]
Notlar: Belge = başlık (TBLDOCUMENT) + satır (TBLDOCUMENTLINE), nested create ile lineNo otomatik. type: RECEIPT/SHIPMENT/TRANSFER/ADJUSTMENT/COUNT, status: DRAFT/CONFIRMED/COMPLETED/CANCELLED.
