---
title: "Sayım Parametreleri düzeltme — fazla 'Aktif' kaldır + sayım op COUNT filtresi"
type: run
date: 2026-06-20
topics: [sayim, count, parametre, operasyon, ui, schema, legacy]
status: completed
tags: [#run/completed, #ui, #schema, #db]
related_runs: [[runs/2026-06-12T14-30-00-kosul-yonlendirme-sayim]]
aliases: [sayim-param-fix, count-param-isactive]
---

# Sayım Parametreleri — kullanıcı düzeltme isteği

İstek: "sana sayım parametreleri ekranını göstermiştim, **fazladan parametre eklemişsin onu kaldır**; bir de **sayım operasyonu seçerken operasyon tipi sayım olan sadece seçilebilir**."

## Tespit (legacy karşılaştırma)
- **TBLSBSAYIMPARAMETRE** (legacy katalog) = 25 kolon, 5'i sistem (PK + 2 tarih + 2 kullanıcı) → **20 iş kolonu**.
- Formumuz 21 alandı → 20 birebir eşleşiyor, **21. `isActive` (Aktif) StokBar'da YOK** = fazladan eklenen oydu.

## Yapıldı
- 💾 **Kolon düşürüldü**: `TBLCOUNTPARAMETER.isActive` (migration `20260620180405_count_param_drop_isactive`, `DROP COLUMN`). Diff flag Prisma 7.8'de `--to-schema` (eski `--to-schema-datamodel` kaldırılmış).
- ⚡ **Backend**: `countParameter` zod'undan `isActive` çıkarıldı ([[src/routes/wmsConfig.ts]]). Artık `isActive` gönderilse bile sessizce atılır.
- 🎨 **Frontend**:
  - `count-parameters` formundan `isActive` alanı silindi ([[web/src/formConfig.ts]]).
  - **`FieldDef.refFilter`** eklendi (genel ref süzme); [[web/src/pages/GenericForm.tsx]] ham satırları map'ten önce süzüyor.
  - Sayım operasyonu alanı: `operationTypeId` → label **"Sayım Operasyon Tipi"** + `refFilter: x => x.direction === 'COUNT'`. (Giriş/Çıkış/Transfer Operasyon filtresiz bırakıldı — onlar INBOUND/OUTBOUND/INTERNAL ayar operasyonları.)

## Doğrulama
- prisma generate ✓ · backend tsc ✓ · web tsc ✓ · smoke PASSED ✓
- API stale-client P2022 (kolon düşünce çalışan tsx eski client'ı tuttu) → **api preview yönetimli restart** (pkill DEĞİL) → düzeldi.
- E2E: GET count-parameters 200, `isActive` alanı yok, 20 iş alanı; create `isActive`siz OK; `isActive:false` POST → zod atıyor (dönüşte yok). Test kayıtları silindi (seed 1 kaldı).
- UI: form'da **"Aktif" switch YOK**; liste'de **"Aktif" kolon YOK**; "Sayım Operasyon Tipi" select **1 seçenek (SAYIM)**, "Giriş Operasyon" 10 seçenek (filtre yalnız sayım op'a etki). 0 konsol hatası.

## Ek düzeltme — Transfer Operasyon (kullanıcı 2. tur, ekran görüntüsü)
Kullanıcı StokBar "Kayıt Görüntüle" ekranını gösterdi: yalnız **Giriş Operasyon + Çıkış Operasyon** var, **Transfer Operasyon YOK**.
- Legacy TBLSBSAYIMPARAMETRE'de `LNGTRANSFEROPERASYONTIPKOD` kolonu **VAR** (isActive'den farkı bu) → **DB kolonu + zod korundu** (legacy'e sadık), yalnız **ekrandan** kaldırıldı.
- `count-parameters` formundan `transferOperationTypeId` çıkarıldı ([[web/src/formConfig.ts]]).
- Listede de gizlendi: [[web/src/pages/GenericList.tsx]] `hidden`'a resource-bazlı kural (`resource==='count-parameters' → transferOperationTypeId`). Kolon legacy'de durur, listede görünmez.
- Doğrulama: web tsc ✓; form (Giriş+Çıkış var, Transfer yok) ✓; liste (Transfer Operasyon kolonu yok) ✓; 0 konsol hatası. (Backend/migration gerekmedi.)

## Ek düzeltme 2 — Sıra + etiket birebir hizalama (kullanıcı 3. tur)
Kullanıcı: "sıralama da aynı şekilde olsun stokbar ile birebir hizalı."
- `count-parameters` formu **StokBar ekran sırasına** dizildi: "Sayım Gün Sayısı" üst sıradan **18. sıraya** (askLocationOnScan'dan önce) indi; "Palet Tekrar Sayılmasın" → "Palet İçi Stok Gösterilmesin" sırası düzeltildi.
- Toggle etiketleri StokBar'a eşitlendi: "Miktar Girişi İstifli **Olsun**", "Parçalı Palet Kullanımı **Yapılsın**", "Parçalı Palet Uyarısı **Verilsin**", "Aktif Sayımda Stok Hareketi **Yapılsın**".
- UI doğrulama: form **19/19 birebir** StokBar sırası ✓; web tsc ✓; 0 konsol hatası.
- Tek bilinçli sapma: alan-1 etiketi "**Sayım Operasyon Tipi**" (StokBar: "Operasyon Tipi") — COUNT-filtreli olduğu için açıklayıcı tutuldu. Tesis alanı eklenmedi (companyId örtük).
- NOT: liste kolon sırası DB/Prisma model sırasından gelir (form sırasından bağımsız); kullanıcının baktığı "Kayıt Görüntüle" = form, o hizalandı.

## Kalan / Not
- İstenirse Giriş/Çıkış Operasyon alanları da yön bazlı süzülebilir (INBOUND/OUTBOUND) — `refFilter` deseni hazır. Şimdilik istek kapsamı dışı.
