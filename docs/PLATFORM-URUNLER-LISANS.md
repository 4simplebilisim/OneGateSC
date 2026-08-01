# Platform: Ürünler, Lisanslama ve Ürünler Arası Geçiş (2026-08-01)

OneGate artık **tek platform, birden çok ürün**: WMS ve 4Procurement+ ayrı uygulamalar olarak çalışır, ortak veritabanını ve ortak kullanıcı/yetki sistemini paylaşır, **tek alan adı** üzerinden erişilir.

## Tek adres
| Ürün | Adres | Teknoloji | Süreç |
|---|---|---|---|
| OneGate WMS | `https://onegate.4simple.com.tr/` | React SPA + Fastify API (`:3010`) | systemd `onegate-wms-api` |
| 4Procurement+ | `https://onegate.4simple.com.tr/satinalma` | Next.js (`:3000`) | PM2 `4proc` |

nginx (`/etc/nginx/sites-enabled/onegate-wms`) `/satinalma` yolunu Next.js'e yönlendirir; Next tarafında `basePath` aynı değerle ayarlıdır (`NEXT_PUBLIC_BASE_PATH`, varsayılan `/satinalma`). Eski adres `proc.4simple.com.tr` çalışmaya devam eder.

⚠️ **Tuzak:** Next.js middleware'inde `req.nextUrl.basePath` BOŞ gelir. Yönlendirme kurarken `src/lib/basePath.ts` sabitini kullan, yoksa kullanıcı WMS'in login ekranına düşer.

## Kimlik
Her iki ürün de `wms.TBLUSER` tablosunu ve aynı bcrypt `passwordHash` kolonunu kullanır → **aynı kullanıcı adı/şifre ikisinde de geçerli**. Oturumlar ayrıdır (WMS: JWT · 4Proc: NextAuth); tek oturum açma (SSO) henüz yok, her ürüne bir kez giriş yapılır.

Ekran hakları da ortak: 4Proc'un `UserPermissions.Screens` JSON'u `wms.TBLUSERSCREENRIGHT` satırlarına yazılır/okunur (uyumluluk view'ı + trigger).

## Lisanslama modeli (`wms` şeması)
| Tablo | İş |
|---|---|
| `TBLAPPLICATION` | Ürün kataloğu: `code` (WMS/PROC), ad, açıklama, `path`, ikon, sıra |
| `TBLCOMPANYLICENSE` | Firma × ürün: aktif mi, `validFrom`/`validUntil` (boş = süresiz), `userLimit`, not |
| `TBLUSERAPPACCESS` | Kullanıcı × ürün **kısıtlama listesi** — satır YOKSA lisanslı tüm ürünlere erişir (OneGate yetki deseni) |

**Erişim kuralı:** `firma lisansı (aktif + tarih geçerli)` ∩ `kullanıcı kısıtı`. Uygulaması: `src/lib/entitlements.ts` (`listUserApps`, `hasAppAccess`).

### Uçlar
- `GET /api/apps` — oturumdaki kullanıcının erişebildiği ürünler (ürün değiştirici bunu tüketir)
- `GET /api/applications` — ürün kataloğu
- `GET|POST|PATCH|DELETE /api/company-licenses` — firma lisansı yönetimi (admin)
- `PUT /api/user-app-access` — kullanıcıya ürün kısıtı ata (`{userId, applicationIds}`; tümü seçilirse kısıt silinir)

Giriş (`/api/auth/login`) ve `/api/auth/me` yanıtlarına `apps` alanı eklendi.

### Ekranlar
- **Uyarlamalar › Sistem › Ürün Lisansları** — firma lisansı ekle/düzenle (geçerlilik, kullanıcı limiti, not).
- **Header ürün değiştirici** — birden çok ürüne erişimi olan kullanıcıda grid ikonu; açık ürün "açık" etiketiyle işaretlenir. Tek ürünlü kullanıcıda ikon yerine Pano bağlantısı görünür.
- 4Proc üst çubuğunda WMS'e geçiş bağlantısı.

### Enforcement
- **WMS:** ürünler `/api/apps` ile süzülür; kullanıcı yalnız erişebildiği ürünleri görür.
- **4Proc:** girişte (`src/server/auth.ts`) firma PROC lisansı + kullanıcı erişimi SQL ile doğrulanır; yoksa giriş reddedilir (log: "4Procurement lisansı/erişimi yok").

Doğrulanan senaryolar (`scripts/4proc/lisans-test.sql`): ① iki ürün lisanslı → ikisi de görünür ② kullanıcıya yalnız WMS verilince PROC kaybolur ③ PROC lisansı süresi dolunca yalnız WMS geçerli kalır.

## Yeni ürün eklemek
1. `wms.TBLAPPLICATION`'a satır (kod, ad, `path`).
2. Firmalara lisans (Ürün Lisansları ekranı).
3. Uygulamayı `path` altında yayınla (nginx location + gerekiyorsa `basePath`).
4. Uygulamanın giriş akışına lisans kontrolünü ekle.

Ürün değiştirici ve yetki katmanı kendiliğinden çalışır — kod değişikliği gerekmez.
