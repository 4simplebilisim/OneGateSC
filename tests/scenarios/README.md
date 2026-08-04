# Senaryo testleri

Elle yazılmış, **iş mantığını** sınayan uçtan uca scriptler. `npm run test:smoke`
yalnız "uç ayakta mı" bakar; buradakiler *sayı doğru mu* sorusunu sorar.

Çalıştırmadan önce API ayakta olmalı (`npm run dev`) ve veritabanında seed verisi bulunmalı.

```bash
node tests/scenarios/crack-test.mjs
```

| Dosya | Ne sınar |
|---|---|
| `crack-test.mjs` | Çapraz-firma FK sızıntısı — 10 gerçek hata bulmuştu (refGuard bunun üzerine yazıldı) |
| `scenario_ab.mjs` | A/B kiracı izolasyonu (en geniş senaryo) |
| `scenario_users.mjs` | Kullanıcı + yetki/hak katmanı |
| `scenario_rights.mjs` | Ekran hakları (İzle/Yeni/Düzenle/Sil) |
| `scenario_columns.mjs` | Kolon yetkileri |
| `scenario_screen.mjs` | El terminali ekran yetkisi |
| `scenario_firma.mjs` | Çok-firmalı geçiş (COMPANY scope) |
| `scenario_groups.mjs` | Kullanıcı grupları |
| `scenario_handheld.mjs` | El terminali menü grupları |
| `scenario_partnerfac.mjs` | Cari ↔ tesis bağı |
| `scenario_prodfac.mjs` | Ürün ↔ tesis bağı |
| `scenario_status_facility.mjs` | Statü ↔ tesis bağı |
| `scenario_shelflife_baseunit.mjs` | Raf ömrü + ana birim türetme |

> Scriptler seed'deki kimlikleri (`admin/admin123`, firma 2) varsayar — yalnız
> **lokal/geliştirme** ortamında çalıştırın, canlıya yöneltmeyin.
