---
title: "Sistem: Firma CRUD + Kullanıcı Grup/Grup Yetki + Kolon Yetki"
type: run
date: 2026-06-22
topics: [firma, company, kullanici-grup, grup-yetki, kolon-yetki, column, yetki, sistem]
status: completed
tags: [#run/completed, #backend, #ui, #schema]
related_runs: [[runs/2026-06-22T11-30-00-ekran-mobil-yetki]]
aliases: [sistem-yetki-genisletme]
---

# Sistem Menüsü Genişletme (StokBar Sistem ekranları)

İstek: StokBar Sistem menüsü (Firma / Kullanıcı / Kullanıcı Yetki / Grup Yetki / Kolon Yetki) — bizde "Kullanıcılar" + sekmeli "Yetkiler" zaten vardı. Kullanıcı 4'ünü de istedi. Prensip: klonlama değil, tek ekrana konsolide.

## 1) Firma (tam CRUD)
[[src/routes/companies.ts]] GET+POST+PATCH+DELETE — **yazma yalnız super-admin** (firmalar cross-tenant), kod-P2002→409, bağlı-veri DELETE→409. Frontend: resources `companies` (Sistem) + formConfig (code/name/taxNumber/isActive) → GenericForm. E2E 7/7 (operator→403).

## 2) Menü kısayolları (Sistem)
Sistem grubu: **Firma · Kullanıcılar · Kullanıcı Grup**. (Kullanıcı Yetki/Hakları/Kolon → kullanıcı/grup satırındaki "Yetkiler" butonu + sekmeler — ayrı menü değil, konsolide.)

## 3) Kullanıcı Grup + Grup Yetki
- Şema (migration 20260622090604): `TBLUSERGROUP` + `TBLUSERGROUPMEMBER`; `TBLUSERAUTHORIZATION` artık **kullanıcı VEYA grup sahipli** (groupId, userId nullable, 2 ek unique).
- [[src/routes/userGroups.ts]] (simpleCrud); [[src/routes/userAuthorizations.ts]] userId|groupId; [[src/routes/users.ts]] `groups[]` üyelik senkronu + userSelect.
- **Enforcement birleşik (union)**: [[src/lib/userAuth.ts]] + auth.ts getUserScreens artık doğrudan + grup yetkilerini birleştirir.
- UI: user-groups CRUD + grup "Yetkiler" ekranı (UserAuthorizations `subject="group"`, owner=userId|groupId) + UserForm "Kullanıcı Grupları" çoklu-seçim.
- E2E 9/9: gruba yetki → kullanıcı MİRAS alıyor (login.screens + GR 201/GI 403).

## 4) Kullanıcı Kolon Yetki
- Şema (migration ...user_column_auth): `TBLUSERCOLUMNAUTH` (userId|groupId × resource × column × **mode** `ColumnAuthMode` READONLY|HIDDEN; kayıt yoksa=görünür).
- [[src/routes/columnAuthorizations.ts]] CRUD (upsert: aynı owner+resource+column→update; POST 201/200) + `getUserColumnAuth` (union, HIDDEN>READONLY). auth.ts login/`me` → `columnAuth: { resource: { column: mode } }`.
- UI yönetim: Yetkiler ekranına **"Kolonlar" sekmesi** (ekran seç → formConfig alanları, her biri 3-durum: Görünür/Salt-okunur/Gizli).
- Enforcement: [[web/src/columnAuth.ts]] (og_user'dan okur, admin/super-admin bypass); **GenericForm** HIDDEN gizler + READONLY disable; **GenericList** HIDDEN kolon çıkarır.
- E2E 7/7 (READONLY/HIDDEN, upsert→200, login.columnAuth, sil→görünür, grup miras). UI: warehouses formunda Ad salt-okunur + Tesis gizli + listede Tesis kolonu yok ✓.

## Doğrulama
backend+web tsc temiz · 3 migration · smoke PASS · 4 E2E (7/7, 9/9, 7/7 + Firma 7/7) · UI form+liste enforcement. Tüm test verisi temizlendi.

## Not
Kolonlar yönetim sekmesinde resource seçimi sentetik eval'de tetiklenmedi (AntD Select); gerçek tıklamada çalışır (kod sağlam, API+enforcement kanıtlı). Henüz commit'lenmedi.
