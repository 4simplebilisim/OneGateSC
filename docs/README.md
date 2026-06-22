# OneGate — Doküman İndeksi

Geliştirme (Claude Code) için bağlam dokümanları. Giriş noktası: kökteki [`CLAUDE.md`](../CLAUDE.md).

## Güncel — birincil kaynaklar
| Dosya | İçerik | Durum |
|---|---|---|
| [SISTEM-HARITASI.md](SISTEM-HARITASI.md) | Menü→sayfa→API→tablo tam haritası + işleyiş özeti + envanter | ✅ Güncel (tek kaynak) |
| [VERI-MODELI.md](VERI-MODELI.md) | 120 tablo alan-alan (kolon/tip/FK) + legacy eşleme + 12 tutarsızlık notu | ✅ Tur 2 |
| [ISLEYIS.md](ISLEYIS.md) | 9 akış adım-adım + legacy SP ↔ OneGate karşılaştırması | ✅ Tur 3 |
| [KONFIG-MOTORU.md](KONFIG-MOTORU.md) | Operasyon tipi 74 bayrak eşleme + scope + kural enforce | ✅ Tur 4 |

> Legacy SP dökümleri (Tur 3 kaynağı): `legacy/sp/*.sql` (17 kanonik prosedür).

## Legacy referans (StokBar / Panorama8)
| Dosya | İçerik |
|---|---|
| [legacy/stokbar-uni-schema.md](legacy/stokbar-uni-schema.md) | STOKBAR_UNI'den çekilmiş 70 WMS tablosu, tam kolon yapısı |
| [legacy/legacy-OneGate-eslesme.md](legacy/legacy-OneGate-eslesme.md) | Legacy↔OneGate tablo eşlemesi (crosswalk) |
| [legacy/cekirdek-mimari-analiz.md](legacy/cekirdek-mimari-analiz.md) | ⭐ Çekirdek tablolar derin analizi (belge trio/STOKDURUM/PALET/URUN/MUSTERI) + mimari kararlar |
| [legacy/cekirdek-tablolar-schema.md](legacy/cekirdek-tablolar-schema.md) | Çekirdek 7 tablonun tam kolon dökümü |

## Eski — yalnız tarihsel / kısmi geçerli
| Dosya | Not |
|---|---|
| [onegate-genel-cerceve.md](onegate-genel-cerceve.md) | ⚠️ Bayat (11 Haz); yönetici özeti/olgunluk için |
| [onegate-veri-modeli-harita.md](onegate-veri-modeli-harita.md) | ⚠️ Bayat (9 Haz); **boşluk analizi (§6) geçerli** |
| [onegate-durum-akis.md](onegate-durum-akis.md) / .html | Durum akış görseli (doğrula) |
| [onegate-durum-roadmap.md](onegate-durum-roadmap.md) | Yol haritası (doğrula) |
| [onegate-wms-durum-raporu.md](onegate-wms-durum-raporu.md) | Durum raporu (doğrula) |
| [wms-discovery-mapping.md](wms-discovery-mapping.md) | Legacy Excel → tablo keşif eşlemesi |
| [onegate-refine-starter.md](onegate-refine-starter.md) | Frontend starter notları |
