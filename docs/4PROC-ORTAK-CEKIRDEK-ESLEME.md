# 4Proc × OneGate — Ortak Çekirdek Tablo/Kolon Eşlemesi (2026-08-01)

**Mimari (kullanıcı kararı, 2026-08-01):** İki ürün **ayrı platform** kalır, bağımsız da çalışabilir; yalnız **ortak çekirdek tablolar** paylaşılır. Bu doküman "benzer amaca hizmet eden" tablo/kolonların alan-alan eşlemesi + hizalama önerileridir.

Kaynaklar: `E:\onegate\prisma\schema.prisma` (121 model, camelCase, çok-kiracılı) · `E:\4proc\4proc-next\prisma\schema.prisma` (72 model, PascalCase `TBL4S_*`, tek-kiracılı).

## Yapısal farklar (tüm ortak tablolar için tek seferde çözülür)
| Konu | 4Proc | OneGate | Hizalama önerisi |
|---|---|---|---|
| Kolon adları | PascalCase (`Code`, `IsActive`) | camelCase (`code`, `isActive`) | Ortak tablolarda **OneGate adlandırması kanonik**; 4Proc Prisma modeli ortak tabloyu OneGate tanımıyla kullanır |
| Çok-kiracılık | YOK — `Code` global unique | `companyId` + `@@unique([companyId, code])` | Ortak tablolar companyId'li; 4Proc tek firmayla çalışsa bile companyId yazar (varsayılan firma) |
| Audit | `CreatedBy/UpdatedBy` + `CreatedDate/UpdatedDate` | yalnız `createdAt/updatedAt` | Ortak tablolara `createdById/updatedById Int?` **eklenebilir** (4Proc ihtiyacı; OneGate boş geçer) |
| Şema/DB | Supabase `public.TBL4S_*` | Hetzner PG `wms.*` / `procurement.*` | Ortak çekirdek `wms`'te; 4Proc'a özgü uzantılar `procurement` şemasında (sahiplik ayrımı) |
| Migration sahipliği | kendi reposu | kendi reposu | **Ortak tabloların migration'ı TEK repodan (OneGate)**; 4Proc ortak modelleri read-only kopya/introspection ile taşır — çift yazan şema çatışması altın kuralı |

## 1) Kimlik & organizasyon
### Company ↔ TBLCOMPANY — ✅ birebir
`Id/Code/Name/IsActive` ↔ `id/code/name/isActive`. TBLCOMPANY kanonik; değişiklik gerekmez.

### Organization ↔ TBLFACILITY — ✅ kavramsal eş (firma altı birim)
`Code/Name/CompanyId/IsActive` ↔ `code/name/companyId/isActive`. TBLFACILITY kanonik. 4Proc "Organization" terimini UI'da korur.

### User ↔ TBLUSER — ⚠️ çekirdek ortak + satınalma profili uzantı
| 4Proc | OneGate | Karar |
|---|---|---|
| Code | username | eş — Code=username |
| Email? | email (zorunlu, unique) | OneGate kuralı kanonik; 4Proc boş e-postaları doldurulur |
| PasswordHash | passwordHash | eş |
| **Password (düz metin!)** | — | 🔴 **KALDIRILIR** (güvenlik; hash zaten var) |
| FirstName+LastName | fullName | fullName kanonik; 4Proc ad/soyadı birleştirir (UI'da bölmek isterse uzantıya) |
| IsAdmin | isSuperAdmin / ADMIN rolü | rol sistemine eşlenir |
| IsActive | isActive | eş |
| ProfilePictureUrl | — | ortak TBLUSER'a eklenebilir (zararsız) |
| Department/SubDepartment/UserJobGroup/Position/JobLocation/Gender, LineManagerId, IsManager, IsBackup, DefaultBackupId, ApprovalLimit, IsApprover, WorkLevel, HasCompletedOnboarding | — | **`procurement.TBLUSERPROCPROFILE` (1:1 uzantı, userId FK)** — onay hiyerarşisi 4Proc'un iş mantığı, WMS kullanıcısını şişirmez |
| — | sessionId, isMobileUser, şifre politikaları, validUntil | OneGate'e özgü, kalır; 4Proc isterse tek-oturum davranışını da miras alır |

**Roller/ekran hakları:** TBLROLE + TBLUSERSCREENRIGHT (screen=string) ortak kullanılabilir — 4Proc ekran adları ayrı isim uzayı olarak aynı tabloya girer. 4Proc'un Role/Screen/UserPermission tabloları emekli edilir.

## 2) Basit ortak masterlar — ✅ kolay
| 4Proc | OneGate | Not |
|---|---|---|
| Unit | TBLUNIT | birebir; TBLUNIT süperset (type, referenceCode). Kanonik: TBLUNIT |
| MaterialType | TBLPRODUCTTYPE | birebir. Kanonik: TBLPRODUCTTYPE |
| MaterialGroup | TBLPRODUCTGROUP | birebir; TBLPRODUCTGROUP süperset (parentId hiyerarşi) |
| SupplierType | TBLPARTNERGROUP (veya yeni) | tedarikçi tip/grup master'ı; partnerGroupId üzerinden |
| WareHouse | TBLWAREHOUSE | birebir; TBLWAREHOUSE süperset (facilityId) |
| GRLocation | TBLLOCATION | mal-kabul noktası ⊂ lokasyon; TBLLOCATION kanonik (type ile ayrışır) |
| NumberSequence | TBLSEQUENCE | EntityType↔code, Prefix↔prefix, CurrentNo↔currentValue, PaddingLength↔padLength; TBLSEQUENCE süperset (start/end/isAutomatic) |

### Currency / PaymentTerm / Incoterm — 🆕 OneGate'te YOK → ortak çekirdeğe eklenir
4Proc tanımları temel alınıp `wms`'e (companyId'li) taşınır: **TBLCURRENCY** (code/name/symbol), **TBLPAYMENTTERM** (code/name/days), **TBLINCOTERM** (code/name/description). OneGate `TBLPURCHASEORDER.currency String "TRY"` → uzun vadede `currencyId` FK'ya geçer (geçiş dönemi: ikisi birlikte).

## 3) Supplier ↔ TBLBUSINESSPARTNER (type=SUPPLIER) — ⚠️ çekirdek ortak + finans/risk uzantı
**Birebir eşleşen (ortak çekirdekte kalır):** Code↔code · Name↔name · TaxNo↔taxNumber · TaxOffice↔taxOffice · NationalId↔nationalId · ContactPerson↔contactPerson · ContactEmail↔email · ContactPhone↔phone · Mobile↔mobilePhone · Fax↔fax · Address↔address · City↔city · Country↔country · PostalCode↔postalCode · LicenseNumber↔licenseNo · IsActive↔isActive · Region(string)↔**regionId FK** (4Proc metin bölgeleri TBLREGION'a çözülür).

**4Proc'a özgü → `procurement.TBLPARTNERPROCPROFILE` (1:1, partnerId FK):** CurrencyId, PaymentTermId, LeadTimeDays, AdvancePaymentPercent/Note, banka seti (IBAN, BankName, AccountHolder, AccountNumber, SwiftCode, BankAddress, CorrespondentBank, BankBranch, ShebaNumber), IsInternational, VatId, EconomicCode, TradeRegNo, DeliveryPoint, OtherTerms, risk seti (RiskFlag/RiskScore, IsForbidden, Blacklist*), OnboardingStatus/Note/ApprovedAt/ApprovedById, SendInfoEmail/Print, Commodity* FK'ları, EntCode (ERP kodu), Heading.

**OneGate'e özgü (kalır, 4Proc görmez):** zincir cari (parentId), teslimat/rota alanları (öncelik, araç kısıtı, koordinat, cadde/sokak...), partnerGroupId.

## 4) Material ↔ TBLPRODUCT — ⚠️ çekirdek ortak + satınalma uzantı
**Birebir:** Code↔code · Name↔name · UnitId↔unitId · MaterialTypeId↔productTypeId · MaterialGroupId↔productGroupId · IsActive↔isActive.

**4Proc'a özgü → `procurement.TBLPRODUCTPROCPROFILE` (1:1, productId FK):** ProcurementTypeId, Category/Commodity taksonomi FK'ları, MinOrderQuantity, OrderIncrement, LeadTime, SupplierPartNo, UNSPSCCode, ManufacturerName/ManufacturerPartNo (OneGate `manufacturerCode` üretici KODU — ayrı amaç, ikisi de kalır), TechnicalSpecs, ImageUrl, MSDSUrl, GLAccountId, IsCatalog, EntCode.

**OneGate'e özgü (kalır):** barcode/gtin + birim-barkod motoru, vatRate, weight/volume, raf ömrü seti, catchWeight seti, status/type enum'ları, tesis/alt-grup/detay-tip.

`Description` OneGate'te yok → ortak TBLPRODUCT'a `description String?` eklenebilir (zararsız, WMS de kullanır).

## 5) Ortak OLMAYANLAR (bilinçli ayrı)
- **4Proc platform tabloları** (procurement şemasında kendi hâlinde): talep/sipariş/RFQ/sözleşme/ratecard/katalog/onay/bütçe/fatura/e-fatura/portal/webhook zinciri — OneGate yalnız süreç köprüsüyle dokunur (PO→referans kontrollü mal kabul; Receipt↔TBLDOCUMENT eşlemesi köprü fazında).
- **OneGate WMS tabloları**: stok/belge/operasyon/sayım/yönlendirme — 4Proc dokunmaz.
- Department/SubDepartment/UserJobGroup, CostCenter, GLAccount, Commodity taksonomisi, Budget: 4Proc'a özgü kalır (procurement şeması).

## Uygulama sırası (onay sonrası)
1. `wms`'e eklemeler: TBLCURRENCY/TBLPAYMENTTERM/TBLINCOTERM (+TBLPRODUCT.description, TBLUSER.profilePictureUrl, opsiyonel createdById/updatedById).
2. `procurement`'a uzantı profilleri: TBLUSERPROCPROFILE, TBLPARTNERPROCPROFILE, TBLPRODUCTPROCPROFILE.
3. Veri taşıma (Supabase → Hetzner `onegate_wms`): master eşleme scripti — Code çakışma raporu, Region metin→TBLREGION çözümü, kullanıcı e-posta doldurma; Password kolonu TAŞINMAZ.
4. 4Proc reposunda ortak modellerin OneGate tanımlarına geçişi (schema bloğu kopya/introspection; migration YALNIZ OneGate reposundan).
5. Süreç köprüleri (ayrı faz): PO onayı → referans kontrollü mal kabul; Receipt tamamlanınca receivedQty.

## Kararlar (2026-08-01, kullanıcı ONAYLADI)
- **K1 — Fiziksel DB: Hetzner `onegate_wms`.** 4Proc verisi Supabase'den taşınır; OneGate canlısı oynamaz, `procurement` şeması hazır.
- **K2 — Uzantı deseni: 1:1 profil tabloları** (`procurement.TBLUSERPROCPROFILE` / `TBLPARTNERPROCPROFILE` / `TBLPRODUCTPROCPROFILE`); çekirdek kartlar temiz, şema sahipliği ayrık.
- **K3 — Kimlik: TAM ortak.** Tek kullanıcı+rol+ekran hakkı sistemi; 4Proc ekran adları TBLUSERSCREENRIGHT'a kendi isim uzayıyla girer. Tek login, tek yetki matrisi.

**Uygulama durumu (2026-08-01, canlıda):**
- Adım 1 ✅ migration `20260801120000_shared_core_finance_masters` — TBLCURRENCY/TBLPAYMENTTERM/TBLINCOTERM + TBLPRODUCT.description + TBLUSER.profilePictureUrl.
- Adım 2 ✅ migration `20260801123000_procurement_4proc_platform_profiles` — 53 P4_* platform tablosu (TBL4S_* adlarıyla `procurement` şemasında, relation'sız DDL sahipliği; OneGate API kullanmaz) + 3 profil tablosu (TBLUSERPROCPROFILE/TBLPARTNERPROCPROFILE/TBLPRODUCTPROCPROFILE, çekirdeğe cross-schema FK'lı). SQL, canlı DB'ye karşı `prisma migrate diff --from-config-datasource` ile sunucuda üretildi (Prisma 7'de `--from-url` KALKTI) ve denetlendi.
- Faz B ✅ Supabase dökümü sunucuda: `/var/backups/onegate-wms/4proc-supabase-20260801-121557.dump` (652K; PG17 kaynak → sunucuya yalnız `postgresql-client-17` kuruldu, PG16 sunucusuna dokunulmadı). Envanter: Materials 187 · Users 58 · Suppliers 23 · Orders 27 · Budgets 312. Kod çakışması: Supplier 0 · Material 0 · Unit 6 · User 1 (admin) — Faz D'de kesin raporu SQL join ile alınacak (comm sıralama uyarısı güvenilmez).
- Faz D ✅ **VERİ TAŞINDI (canlı, 2026-08-01):** `scripts/4proc/og-4proc-restore.sh` (yedek `pre-4proc-*.dump` + dump→p4src hazırlık) + `og-4proc-full.sql` (master eşleme map'leri, profiller, 53 platform tablosu kopyası, 79 FK-remap UPDATE, setval, doğrulama; `-v dry=1` dry-run desteği). Sonuç: user 58/58 map (1'i mevcut admin'e bağlandı) · supplier 23/23 · material 187/187 · unit 15 (6 mevcutla birleşti) · currency 4 / paymentterm 6 / incoterm 10 / role 7 · platform tabloları tam kopya · orphan taraması 7/7 sıfır. p4src+tmp4proc temizlendi. NOT: Screens/UserPermissions taşınmadı (K3 tam-ortak gereği Faz E'de OneGate ekran-hakkı sistemine bağlanacak); 4Proc kullanıcılarının e-postası boş/çakışıksa `<code>@4proc.local` verildi; PasswordHash'i boş kullanıcılar `!4proc-disabled` (giriş kapalı).
- Faz E ✅ **UYUMLULUK KATMANI CANLIDA** (migration `20260801150000_p4_compat_views`): `procurement` şemasında 18 `TBL4S_*` VIEW + `INSTEAD OF` trigger. 4proc kodu **hiç değişmeden** eski tablo/kolon adlarını kullanmaya devam eder; veri `wms` tablolarında yaşar. Üretici: `scripts/4proc/gen-compat-views.mjs` (spec-güdümlü; yeni ortak tablo → spec'e satır ekle, üret, uygula). Test: `scripts/4proc/compat-test.sql` — 19/19 kolon paritesi + 5 yazma senaryosu (basit view, zengin view çekirdek+profil, ad birleştirme/e-posta üretimi, JSON↔ekran hakkı, Heading→Name yedeği) doğrulandı.
  - **K3 gerçek oldu:** `TBL4S_UserPermissions.Screens` JSON'u `wms.TBLUSERSCREENRIGHT` satırlarına açılır/toplanır → iki üründe tek yetki matrisi (ekranı gören butonlarını da kullanır; dört bayrak aynı değer).
  - **Şema koruması:** `scripts/4proc/og-p4app-role.sh` — 4proc uygulaması için **DDL yetkisiz** `p4app` DB rolü (şifre yalnız sunucuda `/root/.onegate_wms_p4app`). `CREATE/ALTER/DROP` reddedilir, ortak masterlara DML açık, WMS stok/belge tabloları kapalı. Kazara `prisma db push` şemayı bozamaz (doğrulandı).
  - 4proc reposunda PR: https://github.com/4simplebilisim/4proc/pull/8 (yapılandırma+doküman; **merge öncesi elle**: `deploy.yml`'den `prisma db push` satırı kaldırılmalı — token yetkisi yetmedi). Canlı `.env` **çevrilmedi** — kullanıcı onayı bekliyor.
- Sırada (isteğe bağlı): canlı 4proc'un `.env`'ini `p4app@onegate_wms?schema=procurement`'a çevirip `pm2 restart 4proc`; ardından süreç köprüleri (PO onayı → referans kontrollü mal kabul; Receipt complete → receivedQty).
