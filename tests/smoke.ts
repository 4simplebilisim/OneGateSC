import { buildApp } from '../src/app.js'
import { prisma } from '../src/lib/prisma.js'

let failures = 0

function check(name: string, condition: boolean, detail?: unknown) {
  if (condition) {
    console.log(`  ✓ ${name}`)
  } else {
    failures++
    console.error(`  ✗ ${name}`, detail ?? '')
  }
}

async function main() {
  const app = await buildApp({ logger: false })
  await app.ready()

  // --- Health ---
  const health = await app.inject({ method: 'GET', url: '/health' })
  check('GET /health -> 200', health.statusCode === 200, health.statusCode)
  check('health.status === ok', health.json().status === 'ok', health.body)
  check('health.db === up', health.json().db === 'up', health.body)

  // --- Public list endpoints return arrays ---
  for (const url of ['/api/warehouses', '/api/units', '/api/locations', '/api/operation-types', '/api/partners', '/api/documents', '/api/inventory/rules', '/api/inventory/mrp', '/api/vehicles', '/api/shipments', '/api/stock-counts', '/api/quality-inspections', '/api/invoices', '/api/product-groups', '/api/sequences', '/api/reasons', '/api/location-groups', '/api/operation-groups', '/api/label-types', '/api/product-subgroups', '/api/pallets', '/api/entry-condition-types', '/api/exit-condition-types', '/api/routing-types', '/api/routing-rules', '/api/facilities', '/api/regions', '/api/partner-groups', '/api/product-units', '/api/statuses', '/api/pallet-types', '/api/operation-type-statuses', '/api/operation-type-locations', '/api/operation-type-reasons', '/api/operation-type-pallet-types', '/api/location-capacities', '/api/barcode-types', '/api/parameters']) {
    const res = await app.inject({ method: 'GET', url })
    check(`GET ${url} -> 200`, res.statusCode === 200, res.statusCode)
    check(`GET ${url} returns array`, Array.isArray(res.json()), res.body)
  }

  // --- Paginated list endpoints ({ data, total, page, ... }) ---
  for (const url of ['/api/products', '/api/stock', '/api/purchase-orders', '/api/sales-orders', '/api/work-orders']) {
    const res = await app.inject({ method: 'GET', url })
    check(`GET ${url} -> 200`, res.statusCode === 200, res.statusCode)
    const body = res.json()
    check(`GET ${url} paginated (data array + total)`, Array.isArray(body.data) && typeof body.total === 'number', res.body)
  }

  // --- Reports + stock card ---
  for (const url of ['/api/reports/stock-summary', '/api/reports/open-orders', '/api/reports/invoice-aging', '/api/reports/mrp-summary', '/api/stock/card?productId=1', '/api/routing-rules/suggest?productId=1']) {
    const res = await app.inject({ method: 'GET', url })
    check(`GET ${url} -> 200`, res.statusCode === 200, res.statusCode)
  }

  // --- OpenAPI / Swagger ---
  const spec = await app.inject({ method: 'GET', url: '/openapi.json' })
  check('GET /openapi.json -> 200', spec.statusCode === 200, spec.statusCode)
  check('openapi spec has paths + title', spec.json().info?.title === 'OneGate API' && Object.keys(spec.json().paths ?? {}).length > 50, Object.keys(spec.json().paths ?? {}).length)

  // --- Branding / assets ---
  const favicon = await app.inject({ method: 'GET', url: '/favicon.svg' })
  check('GET /favicon.svg -> 200', favicon.statusCode === 200, favicon.statusCode)
  check('favicon.svg is svg', (favicon.headers['content-type'] ?? '').toString().includes('svg'), favicon.headers['content-type'])

  const manifest = await app.inject({ method: 'GET', url: '/site.webmanifest' })
  check('GET /site.webmanifest -> 200', manifest.statusCode === 200, manifest.statusCode)
  check('manifest.name === OneGate', manifest.json().name === 'OneGate', manifest.body)

  const branding = await app.inject({ method: 'GET', url: '/api/branding' })
  check('GET /api/branding -> 200', branding.statusCode === 200, branding.statusCode)
  check('branding has theme color', branding.json().colors?.themeColor === '#4E86FF', branding.body)

  const staticIcon = await app.inject({ method: 'GET', url: '/OneGate-assets/png/icon-192.png' })
  check('GET /OneGate-assets/png/icon-192.png -> 200', staticIcon.statusCode === 200, staticIcon.statusCode)
  check('icon-192 is png', (staticIcon.headers['content-type'] ?? '').toString().includes('png'), staticIcon.headers['content-type'])

  // --- Auth guard on protected POST ---
  const noAuth = await app.inject({
    method: 'POST',
    url: '/api/warehouses',
    payload: { code: 'SMOKE', name: 'Smoke Test' },
  })
  check('POST /api/warehouses without token -> 401', noAuth.statusCode === 401, noAuth.statusCode)

  // --- RBAC: user management requires auth ---
  const usersNoAuth = await app.inject({ method: 'GET', url: '/api/users' })
  check('GET /api/users without token -> 401', usersNoAuth.statusCode === 401, usersNoAuth.statusCode)

  // --- Bad credentials rejected ---
  const badLogin = await app.inject({
    method: 'POST',
    url: '/api/auth/login',
    payload: { username: 'does-not-exist', password: 'wrong' },
  })
  check('POST /api/auth/login bad creds -> 401', badLogin.statusCode === 401, badLogin.statusCode)

  // --- Validation error shape ---
  const badBody = await app.inject({
    method: 'POST',
    url: '/api/auth/login',
    payload: { username: '' },
  })
  check('POST /api/auth/login invalid body -> 400', badBody.statusCode === 400, badBody.statusCode)

  await app.close()
  await prisma.$disconnect()

  if (failures > 0) {
    console.error(`\nSMOKE FAILED: ${failures} check(s) failed`)
    process.exit(1)
  }
  console.log('\nSMOKE PASSED')
}

main().catch(async (err) => {
  console.error(err)
  await prisma.$disconnect()
  process.exit(1)
})
