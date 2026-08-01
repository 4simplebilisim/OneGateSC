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

**Uygulama durumu:** Adım 1 ✅ (migration `shared_core_finance_masters`: TBLCURRENCY/TBLPAYMENTTERM/TBLINCOTERM + TBLPRODUCT.description + TBLUSER.profilePictureUrl). Adım 2 (profil tabloları) bilinçli olarak veri taşıma fazına ertelendi — içlerindeki Commodity/Department/GLAccount FK hedefleri 4Proc tablolarıyla birlikte gelecek.
