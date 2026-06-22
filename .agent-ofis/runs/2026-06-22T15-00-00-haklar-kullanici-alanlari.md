---
title: "A: Haklar aksiyon matrisi + B: Kullanıcı kartı alanları (paralel)"
type: run
date: 2026-06-22
topics: [haklar, screen-rights, aksiyon, izle-yeni-duzenle-sil, kullanici-alanlari, paralel-agent]
status: completed
tags: [#run/completed, #backend, #ui, #schema]
related_runs: [[runs/2026-06-22T13-00-00-firma-grup-kolon-yetki]]
aliases: [haklar-aksiyon-matrisi, screen-rights]
---

# Haklar (aksiyon matrisi) + Kullanıcı kartı alanları

StokBar Sistem ekranları (Kullanıcı / Kullanıcı Hakları / Kullanıcı Yetki) referans verildi. Yetki zaten vardı (Tesis/Depo/Operasyon). Fark: **Hakları = aksiyon seviyesi** (İzle/Yeni/Düzenle/Sil per ekran, gruptan miras). Kullanıcı: 3 parçalı kuyruk (A/B/C); **paralel istendi** → A+B aynı turda (B disjoint dosyalar arka-plan agent'ında), C ayrı tur.

**Paralel not:** 3'ü tam-paralel ayrı agent GÜVENSİZ (paylaşılan DB şeması/migration + UserAuthorizations + app.ts; worktree'de node_modules yok). Çözüm: A+B şemasını TEK migration'da ben kurdum → B'nin disjoint dosyaları (users.ts + UserForm) arka-plan agent'ına, A'yı (route+auth+GenericList+Shell+UserAuthorizations) ben. Çakışma yok.

## A — Haklar aksiyon matrisi
- Şema (migration `...screen_rights_user_fields`): `TBLUSERSCREENRIGHT` (user/group × resource × canView/Add/Edit/Delete, default true; kayıt yoksa serbest; hepsi true → kayıt silinir).
- [[src/routes/screenRights.ts]] upsert (all-true→204 sil) + `getUserScreenRights` (union, **false öncelikli**). auth.ts login/`me` → `screenRights: { resource: { view,add,edit,delete } }`.
- Enforcement: [[web/src/screenRight.ts]] (og_user'dan; admin/super-admin bypass). **GenericList** Yeni→add, Düzenle→edit, Sil→delete, Kopyala→add, İzle→view süzer. **Shell** web menü görünürlüğü `view` (eski SCREEN-scope web göster/gizle yerine; mobil m/ kaldı).
- UI: UserAuthorizations "Web Ekranları" sekmesi → **"Haklar"** (her web ekranı × İzle/Yeni/Düzenle/Sil checkbox, arama). Artık **6 sekme**: Haklar·El Terminali·Tesis·Depo·Operasyon·Kolonlar (kullanıcı+grup).
- E2E 7/7 (aksiyon, all-true→204, login.screenRights, grup miras false-öncelikli). UI: rgui (products view+, add/edit/delete−; warehouses tümü−) → products listede Yeni/Düzenle/Sil YOK, menüde Depolar gizli/Ürünler görünür; Haklar tab 484 checkbox.

## B — Kullanıcı kartı alanları (paralel agent)
TBLUSER + userType(CENTRAL/BRANCH)/isApproved/phone/validUntil(date)/alias/passwordNeverExpires/mustChangePassword/cannotChangePassword. [[src/routes/users.ts]] zod+select+validUntil dönüşümü; [[web/src/pages/UserForm.tsx]] Tip/Onay/Cep Tel/Geçerlilik(DatePicker)/Alias + 3 şifre-politikası switch. (Exco/PowerBi/Panorama atlandı.) tsc×2 temiz, UI 16 alan.

## Doğrulama
backend+web tsc temiz · 1 migration (A+B birlikte) · smoke PASS · A E2E 7/7 · test verisi temizlendi.

## Kalan
**C — El Terminali dinamik menü** (sıradaki tur): Tesis bazlı handheld menü config (grup + menü→operasyon kodu + parametre), MobileHome DB'den okur, El Terminali yetki sekmesi dinamik menüyü referans alır.
