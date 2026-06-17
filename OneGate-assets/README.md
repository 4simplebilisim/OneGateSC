# OneGate — Logo & Icon Assets

Forward Gate yönü. Tüm dosyalar `OneGate-assets/` içinde.

## Dosyalar

```
OneGate-assets/
├─ onegate-icon.svg                 # App ikonu (gradyan kare + beyaz işaret) — VEKTÖR / ana dosya
├─ onegate-mark.svg                 # Sadece işaret, gradyan, şeffaf zemin (açık zeminde kullan)
├─ onegate-logo-horizontal.svg      # İkon + "OneGate" yazısı (vektör; Plus Jakarta Sans gerekir)
├─ favicon.svg                      # Modern tarayıcı favicon'u (vektör)
└─ png/
   ├─ favicon-16.png  favicon-32.png  favicon-48.png  favicon-64.png
   ├─ apple-touch-icon.png          # 180×180 (iOS ana ekran)
   ├─ icon-192.png  icon-256.png  icon-512.png  icon-1024.png   # PWA / mağaza
   ├─ onegate-logo-horizontal.png   # Yatay logo, ŞEFFAF zemin (546×176)
   └─ onegate-logo-horizontal-white.png  # Yatay logo, beyaz zemin
```

## 1) Web sitesi — favicon + ikonlar
`<head>` içine:

```html
<link rel="icon" type="image/svg+xml" href="/OneGate-assets/favicon.svg">
<link rel="icon" type="image/png" sizes="32x32" href="/OneGate-assets/png/favicon-32.png">
<link rel="icon" type="image/png" sizes="16x16" href="/OneGate-assets/png/favicon-16.png">
<link rel="apple-touch-icon" sizes="180x180" href="/OneGate-assets/png/apple-touch-icon.png">
<link rel="manifest" href="/site.webmanifest">
<meta name="theme-color" content="#4e86ff">
```

## 2) PWA / mobil — site.webmanifest

```json
{
  "name": "OneGate",
  "short_name": "OneGate",
  "theme_color": "#4e86ff",
  "background_color": "#ffffff",
  "display": "standalone",
  "icons": [
    { "src": "/OneGate-assets/png/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/OneGate-assets/png/icon-512.png", "sizes": "512x512", "type": "image/png" },
    { "src": "/OneGate-assets/png/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ]
}
```

## 3) Logoyu sayfada göstermek
En temizi vektör SVG (her boyutta net):

```html
<img src="/OneGate-assets/onegate-logo-horizontal.svg" alt="OneGate" height="40">
```

Yazının doğru görünmesi için fontu yükle (SVG'deki yazı sistem fontuna düşmesin diye):

```html
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@800&display=swap" rel="stylesheet">
```

> Font yükleyemeyeceğin yerlerde (e-posta, başka uygulama) `png/onegate-logo-horizontal.png` kullan — yazı zaten görsele gömülü.

## 4) Sadece işaret (buton, avatar, dar alan)

```html
<img src="/OneGate-assets/onegate-icon.svg" alt="OneGate" width="40" height="40">
```

## Renkler
- Cyan `#44D4E3` · Blue `#4E86FF` · Violet `#9B5CF6`
- Gradyan: `linear-gradient(158deg, #44d4e3 0%, #4e86ff 47%, #9b5cf6 100%)`
- Ink (yazı) `#1B2138`

## Net alan & kullanım
- İkonun çevresinde en az kendi köşe yarıçapı kadar boşluk bırak.
- İşareti tek renk gerektiğinde beyaz ya da `#1B2138` kullan (gradyanı zorlama).
- İkonu döndürme, gölgesini değiştirme, oranını bozma.
