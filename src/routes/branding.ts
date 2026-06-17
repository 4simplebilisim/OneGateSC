import type { FastifyInstance } from 'fastify'
import { BRAND, WEB_MANIFEST } from '../lib/branding.js'

/**
 * Marka / favicon / PWA manifest route'ları.
 * Statik dosyalar `@fastify/static` ile `/OneGate-assets/*` altında servis edilir;
 * bu route'lar tarayıcının kök seviyesinde beklediği yolları (favicon, manifest) karşılar.
 */
export async function brandingRoutes(app: FastifyInstance) {
  // Modern tarayıcı favicon'u (vektör)
  app.get('/favicon.svg', (_request, reply) => {
    return reply.type('image/svg+xml').sendFile('favicon.svg')
  })

  // Klasik /favicon.ico isteği → 32px PNG
  app.get('/favicon.ico', (_request, reply) => {
    return reply.type('image/png').sendFile('png/favicon-32.png')
  })

  // PWA manifest
  app.get('/site.webmanifest', (_request, reply) => {
    return reply.type('application/manifest+json').send(WEB_MANIFEST)
  })

  // Programatik marka metadata (renkler + varlık yolları) — frontend/entegrasyon için
  app.get('/api/branding', () => BRAND)
}
