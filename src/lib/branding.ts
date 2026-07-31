/**
 * OneGate marka sabitleri — logo/icon varlıkları sistemde tek kaynaktan.
 * Varlıklar `OneGate-assets/` içinde, `/OneGate-assets/*` altında statik servis edilir.
 * Renkler & kullanım: OneGate-assets/README.md
 */

export const BRAND = {
  name: 'OneGate',
  shortName: 'OneGate',
  colors: {
    cyan: '#5B8DEF',
    blue: '#2563C9',
    violet: '#1B2B4B',
    ink: '#1B2138',
    themeColor: '#2563C9',
    background: '#FFFFFF',
  },
  gradient: 'linear-gradient(158deg, #5B8DEF 0%, #2563C9 47%, #1B2B4B 100%)',
  assetsBasePath: '/OneGate-assets',
  assets: {
    iconSvg: '/OneGate-assets/onegate-icon.svg',
    markSvg: '/OneGate-assets/onegate-mark.svg',
    logoHorizontalSvg: '/OneGate-assets/onegate-logo-horizontal.svg',
    faviconSvg: '/OneGate-assets/favicon.svg',
    logoHorizontalPng: '/OneGate-assets/png/onegate-logo-horizontal.png',
    logoHorizontalWhitePng: '/OneGate-assets/png/onegate-logo-horizontal-white.png',
    appleTouchIcon: '/OneGate-assets/png/apple-touch-icon.png',
    icon192: '/OneGate-assets/png/icon-192.png',
    icon512: '/OneGate-assets/png/icon-512.png',
    icon1024: '/OneGate-assets/png/icon-1024.png',
    favicon16: '/OneGate-assets/png/favicon-16.png',
    favicon32: '/OneGate-assets/png/favicon-32.png',
  },
} as const

/** PWA / mobil manifest — /site.webmanifest altında servis edilir. */
export const WEB_MANIFEST = {
  name: 'OneGate',
  short_name: 'OneGate',
  theme_color: '#2563C9',
  background_color: '#ffffff',
  display: 'standalone',
  icons: [
    { src: '/OneGate-assets/png/icon-192.png', sizes: '192x192', type: 'image/png' },
    { src: '/OneGate-assets/png/icon-512.png', sizes: '512x512', type: 'image/png' },
    { src: '/OneGate-assets/png/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
  ],
}
