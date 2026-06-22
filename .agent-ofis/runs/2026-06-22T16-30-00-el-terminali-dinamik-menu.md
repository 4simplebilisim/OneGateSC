---
title: "C: El Terminali dinamik menü (Tesis bazlı grup + operasyon kodu)"
type: run
date: 2026-06-22
topics: [el-terminali, handheld, dinamik-menu, mobil, tesis, operasyon-kodu]
status: completed
tags: [#run/completed, #backend, #ui, #schema, #mobil]
related_runs: [[runs/2026-06-22T15-00-00-haklar-kullanici-alanlari]]
aliases: [handheld-dinamik-menu]
---

# El Terminali Dinamik Menü

İstek: el terminali menüleri StokBar'da DİNAMİK yönetiliyor (Tesis bazlı grup + menü→operasyon kodu + parametre); benim hardcoded `mobileMenu.ts`'im yerine DB-sürümlü olmalı.

## Yapıldı
- **Şema** (migration `...handheld_menu`): `TBLHANDHELDMENUGROUP` (companyId, **facilityId** Tesis null=tümü, code, name, sortOrder, isActive) + `TBLHANDHELDMENUITEM` (groupId, code, name, **screenType** `HandheldScreenType` RECEIPT/PICK/COUNT/STOCK, **operationTypeId** ön-seçili op, sortOrder). companyId/facilityId/operationTypeId düz Int (diğer modeller düzenlenmedi).
- **Backend** [[src/routes/handheldMenu.ts]]: grup + item simpleCrud (item ownerField=groupId) + **birleşik `GET /api/handheld-menu`** (aktif grup+item, sortOrder, facility filtreli) MobileHome/yetki için.
- **Config UI**: resources `handheld-menu-groups` (Uyarlamalar > El Terminali) + formConfig (grup + item, item'da screenType select + operationType ref); GenericList "**Menüler**" butonu → [[web/src/pages/OwnerLines.tsx]] (`/handheld-menu-groups/:id/items`).
- **MobileHome** [[web/src/mobile/MobileHome.tsx]]: `/api/handheld-menu`'dan **dinamik render** (grup başlığı + item kutucukları, screenType→rota, op→query). Config yoksa **statik 4 kutucuğa fallback**. Yetki süzme (`m/<itemCode>`).
- **Yetki linki**: UserAuthorizations "El Terminali" sekmesi seçenekleri artık dinamik item'lardan (`m/<code>`); config yoksa statik MOBILE_MENU.

## Doğrulama
backend+web tsc temiz · migration · smoke PASS · E2E 5/5 (grup+item, groupId filtre, birleşik endpoint sıralı, pasif hariç). UI: MobileHome "MAL KABUL" grubu + "Mal Kabul"/"Platinyum Giriş" kutucukları (statik yerine); config listesi (Tesis/Kod/Grup Adı/Menüler btn); item alt-ekran (UIZG01 + Ekran=Mal Kabul + Operasyon=GR). Test verisi temizlendi.

## Not
- Item op-ön-seçimi `?op=` query ile mobil ekrana taşınıyor; MobileReceipt'in bunu okuyup operasyonu ön-seçmesi sonraki iyileştirme.
- Parametre/Ekran-Parametre (StokBar) henüz yok — gerekince TBLHANDHELDMENUITEMPARAM eklenir.
- Yetki sekmesi dinamik seçenek: kod + API kanıtlı; sentetik eval AntD Select açamadı (gerçek tıklamada çalışır).

## Bağlam: 3 büyük iş tamamı (A+B+C)
Bu turlar StokBar Sistem ekranlarını karşıladı: A Haklar aksiyon matrisi, B kullanıcı kartı alanları, C el terminali dinamik menü. Hepsi sıralı (paralel ayrı-agent güvensizdi — paylaşılan DB/şema/UserAuthorizations).
