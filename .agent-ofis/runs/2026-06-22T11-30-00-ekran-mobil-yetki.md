---
title: "Ekran/menü yetkisi (web+el terminali) + yetki ekranı sekmeli"
type: run
date: 2026-06-22
topics: [kullanici, yetki, ekran, screen, mobil, android, el-terminali, sekme, tabs]
status: completed
tags: [#run/completed, #backend, #ui]
related_runs: [[runs/2026-06-22T03-48-39-123b-kullanici-yetki]]
aliases: [ekran-yetki, screen-mobile-auth]
---

# Ekran/Menü Yetkisi + El Terminali + Sekmeli Yetki Ekranı

İstek: "ekran yetkileri ile ilgili bir kısım göremedim" (önce veri-scope yapmıştım) → **ekran/menü yetkisi** ekle. Ayrıca **android el terminali menüleri** de yetki kapsamına. Yetki ekranı **sekme sekme** olsun.

## Yapıldı
- **Şema** (migration `20260622083340`): `UserScopeType += SCREEN`; `TBLUSERAUTHORIZATION` + `referenceCode VarChar(60)`, `referenceId` nullable, +`@@unique([userId,scopeType,referenceCode])`. SCREEN → referenceCode (entity → referenceId).
- **Backend**: [[src/routes/userAuthorizations.ts]] SCREEN dalı (referenceCode'suz→400); [[src/routes/auth.ts]] login + `/me` artık `screens[]` döner (`getUserScreens`, boş=kısıtsız).
- **El terminali**: yeni [[web/src/mobile/mobileMenu.ts]] (MOBILE_MENU: m/receipt·m/pick·m/count·m/stock + `mobileScreenAllowed`); [[web/src/mobile/MobileHome.tsx]] kutucukları yetkiye göre süzer.
- **Menü filtreleme**: [[web/src/Shell.tsx]] web menüyü `screens` web-alt-kümesiyle (`m/` hariç) süzer.
- **Sekmeli yetki ekranı**: [[web/src/pages/UserAuthorizations.tsx]] Ant Tabs → **Web Ekranları · El Terminali · Tesis · Depo · Operasyon**. SCREEN'i web/mobil ayıran genel `CodeSection` (isWebCode/isMobileCode).
- UserForm `Card loading`→`Spin` (useForm "not connected" uyarısı giderildi).

## Doğrulama
- backend tsc ✓ · web tsc ✓ · migrate+generate ✓ · smoke PASS ✓
- SCREEN E2E 6/6 (atama, referenceCode'suz→400, login/me screens, DB doğru)
- UI: yetki ekranı **5 sekme**; El Terminali sekmesi 4 mobil menü; **menutest** (web products+warehouses) → web menüde yalnız Pano+Ürünler+Depolar; **mobtest** (m/receipt+m/stock) → /m'de yalnız Mal Kabul+Stok Sorgu. Test verisi temizlendi.

## Kalan
- Doğrudan URL route-guard (menü gizli ama URL elle yazılırsa ekran açılır; veri tenant+rol korumalı).
- Ekran yetkisinin anlık tazelenmesi (şu an yeni girişte; `/me` altyapısı hazır).
- Enforcement Sayım/diğer giriş noktalarına genişletme.
