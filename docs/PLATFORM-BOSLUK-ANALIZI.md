# Platform Boşluk Analizi — Eksik / Örtüşmeyen / Olması Gereken (2026-08-02)

İki ürün tek platformda birleşti. Bu doküman **kanıta dayalı** boşluk listesidir: her madde canlı veritabanı ya da kod üzerinden doğrulandı. Öncelik sırası: müşteriye zarar verme potansiyeli.

---

> **Durum notu (2026-08-02):** Madde 1 KAPANDI (aşağıda ✅). Sıradaki: madde 2 (sipariş motoru tekilleştirme) → madde 3 (köprü) → madde 4 (ekran hakları).

## 🔴 P1 — Kritik (ikinci müşteriden önce mutlaka)

### 1. ✅ ÇÖZÜLDÜ — Procurement tek firmaya çivili (çok-kiracılık kırık)
**Çözüm (2026-08-02):** `p4_company()` artık PostgreSQL oturum ayarı `app.company_id`'yi okuyor; ayar yoksa tek firmalı kurulumda o firmaya, birden çok firma varsa NULL'a (boş liste) düşüyor — yanlış kiracıyı göstermektense hiç göstermemek. Uygulama tarafında `src/server/tenantDb.ts`: her firma **kendi bağlantı havuzunu** kullanıyor (`options=-c app.company_id=<id>`), böylece havuzdan gelen bağlantı başka kiracının ayarını taşıyamaz. `createContext` tek noktadan `ctx.prisma`'yı kiracıya kapsıyor → tüm router'lar otomatik doğru firmayı görüyor; `companyId` oturum/JWT'ye eklendi.
**Doğrulandı (canlı):** ayar=10 → 209 malzeme · ayar=999 → **0 kayıt** (sızıntı yok) · ayarsız → 209 (mevcut kurulum bozulmadı).

<details><summary>Sorunun özgün tanımı</summary>
`procurement.p4_company()` fonksiyonu **kod ile `'ONEGATE'` firmasını** döndürüyor. Tüm uyumluluk view'ları bunu kullanıyor.
```sql
SELECT id FROM wms."TBLCOMPANY" WHERE code = 'ONEGATE' LIMIT 1;
```
**Sonuç:** ikinci kiracı eklendiğinde Procurement, oturum hangi firmada olursa olsun **ONEGATE'in verisini** gösterir. WMS'te tam çalışan çok-kiracılık (JWT `companies[]`, `getCompanyId`, CompanySwitcher) Procurement'ta **hiç yok**.
**Yapılması gereken:** oturumdaki firmayı DB oturumuna taşımak ve `p4_company()`'yi ondan okumak; 4Proc tarafında firma bağlamı.
</details>

**Kalan (küçük):** 4Proc'ta firma değiştirici arayüzü yok — çok firmalı kullanıcı şimdilik kendi firmasını görür.

### 2. İki sipariş motoru yan yana
| Tablo | Kayıt | Durum |
|---|---|---|
| `procurement.TBLPURCHASEORDER` (OneGate) | **0** | Ekran menüde `hidden: true` |
| `procurement.TBL4S_Orders` (4Proc) | **27** | Gerçek kullanılan |
Aynı kavramın iki tablosu duruyor. **Karar gerekli:** OneGate'in PO tabloları emekli mi edilecek, yoksa farklı bir amaca mı (ör. WMS içi basit sipariş) ayrılacak? Emekli edilmezse rapor/entegrasyon yazan herkes "hangisi doğru" diye takılır.

### 3. Mal kabul köprüsü yok (asıl entegrasyon değeri)
4Proc'ta 4 mal kabul kaydı (`TBL4S_Receipts`) var ama **stoğa hiç dokunmuyor**; WMS'te 12 belge var ama siparişten haberi yok. Ayar altyapısı hazır (`TBLPLATFORMINTEGRATION` + `resolvePlatformIntegration`), motor yazılmadı:
- onaylı sipariş → mal kabul belgesi (referans kontrollü belge motoru mevcut)
- belge tamamlanınca sipariş satırına karşılanan miktar
- 4Proc Receipt ekranı ile WMS mal kabulünün ilişkisi (biri diğerini mi besleyecek, yoksa Receipt emekli mi?)

### 4. Tek yetki matrisi iddiası pratikte kurulu değil
`wms.TBLUSERSCREENRIGHT` → **0 kayıt**. 4Proc'un 11 ekranı `TBL4S_Screens`'te duruyor ama OneGate'in ekran-hakkı matrisinde **Procurement ekranları görünmüyor**.
**Yapılması gereken:** 4Proc ekranlarını OneGate ekran kataloğuna kaydet (ör. `PROC:approvals` isim uzayı) → tek ekrandan iki ürünün yetkisi yönetilsin.

---

## 🟠 P2 — Önemli (yakın vadede)

### 5. Sayaç motoru çift
Aynı `wms.TBLSEQUENCE` tablosunu (15 satır) iki ayrı kod yolu güncelliyor: OneGate `src/lib/sequence.ts` ve 4Proc `src/server/services/numberSequence.ts`. Eşzamanlı kullanımda **aynı numarayı iki kez verme** riski (4Proc tarafı OneGate'in transaction/kilit desenini kullanmıyor).
**Yapılması gereken:** tek motor — 4Proc numara alırken OneGate ucunu çağırsın ya da aynı kilit desenini uygulasın.

### 6. Procurement → WMS geçişinde SSO yok (tek yönlü)
WMS → Procurement geçişi imzalı bilet ile şifresiz. Ters yön (`TopBar`'daki "WMS" rozeti) **düz `/` linki**: kullanıcının WMS oturumu düşmüşse login ekranına çarpar. Simetri için ters yönde de bilet gerekli.

### 7. Ürün "Kullanım Alanı" tek taraflı uygulanıyor
Parametre eklendi ve Procurement listesi ona uyuyor. Ama **WMS ekranları henüz süzmüyor** — `GET /api/products?app=WMS` süzgeci hazır, ekranlar kullanmıyor. "Yalnız Procurement" işaretli bir ürün WMS belge satırında hâlâ seçilebilir.

### 8. Cari rol yükseltme kuralı yok
Tedarikçi listesi artık `SUPPLIER + BOTH` (düzeltildi). Ama Procurement'tan aynı kodla tedarikçi eklenirse ve o kod WMS'te `CUSTOMER` ise → **ikinci kayıt** ya da hata. Kural: mevcut kartı bul, tipi `BOTH`'a yükselt.

### 9. Bildirim iki ayrı motor
WMS: türetilmiş zil (`/api/notifications`, kalıcı tablo yok). 4Proc: kendi `NotificationLog` tablosu + zili. Kullanıcı iki ayrı bildirim kutusu görüyor; "onayını bekleyen sipariş" WMS zilinde çıkmıyor.

### 10. Denetim izi iki ayrı sistem
WMS `TBLDOCUMENTSTATUSHISTORY` + 4Proc `TBL4S_AuditLogs`. Ortak veri (ürün/cari) her iki taraftan değiştirilebildiği için **kim değiştirdi** sorusunun tek cevabı yok.

---

## 🟡 P3 — Tutarlılık / teknik borç

### 11. Para birimi alanı tutarsız
`TBLPURCHASEORDER.currency` hâlâ `VARCHAR(3)` metin; yeni ortak `TBLCURRENCY` tablosuna FK ile bağlı değil. (2. maddeyle birlikte karara bağlanmalı.)

### 12. Ürün/cari tesis bağı boş ve ekransız
`TBLPRODUCTFACILITY` / `TBLPARTNERFACILITY` tabloları var, **0 kayıt**, yönetim ekranı yok. Çok tesisli müşteride "bu ürün bu tesiste kullanılamaz" diyemiyoruz. (Kural hazır: satır yok = tüm tesisler.)

### 13. Procurement dağıtımı elle
4Proc'un GitHub Actions deploy'u **devre dışı** (ortak DB'yi bozan `prisma db push` yüzünden). Şu an dağıtım elle yapılıyor; OneGate'in `deploy.sh` benzeri tek komutu yok. Ayrıca 4Proc'un vitest testleri dağıtımda koşmuyor.

### 14. Dil / yerelleştirme asimetrik
WMS tamamen Türkçe (sabit). 4Proc'ta `I18nProvider` + dil seçici var, bazı ekranlarda İngilizce etiketler duruyor ("Materials", "Suppliers", "Rate Cards", "Approval Matrix").

### 15. Rapor motorları ayrı
WMS'te veri-güdümlü rapor merkezi (`TBLREPORTDEF` + kriter/alan). 4Proc'ta kendi `reports` + `spend-analytics` ekranları. Ortak veriye rağmen "tek rapor kütüphanesi" yok.

---

## Olması gereken ama hiç konuşulmadı

| Konu | Neden gerekli |
|---|---|
| **Ortak arama** | Kullanıcı ürün/cari ararken hangi üründe olduğunu bilmek zorunda kalıyor; platform üstü arama (Ctrl+K) iki ürünü de kapsamalı |
| **Ortak dosya/ek yönetimi** | 4Proc'ta sözleşme/fatura ekleri var (`/api/upload`), WMS'te belge eki yok — ortak bir ek deposu mantıklı |
| **Onay akışının WMS'e uzanması** | 4Proc'ta güçlü onay matrisi var; WMS'te belge onayı sabit kurallarla. Onay motoru ortaklaştırılabilir |
| **Tedarikçi portalı ↔ mal kabul** | 4Proc'ta tedarikçi portalı var; sevkiyat bildirimi WMS mal kabul beklentisine dönüşebilir (ASN) |
| **Veri saklama/silme politikası** | Ortak DB'de KVKK silme talebi geldiğinde iki üründeki izleri birlikte silecek bir yordam yok |

---

## Önerilen sıra

1. **P1-1 çok-kiracılık** (ikinci müşteri gelmeden — sonradan düzeltmek veri karışması demek)
2. **P1-2 sipariş motoru kararı** → P1-3 köprü (asıl değer burada)
3. **P1-4 ekran hakları** (yetki tek yerden yönetilsin)
4. P2-5 sayaç, P2-6 ters SSO, P2-7 ürün süzgeci, P2-8 rol yükseltme — hepsi küçük, birlikte bir turda biter
5. P2-9/10 bildirim+denetim birleştirme (orta)
6. P3'ler fırsat buldukça

**Not:** 1., 2. ve 3. maddeler birbirine bağlı — köprüyü çok-kiracılık düzelmeden yazmak, sonra baştan yazmak demek.
