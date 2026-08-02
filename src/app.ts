import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import Fastify, { type FastifyInstance } from 'fastify'
import cors from '@fastify/cors'
import jwt from '@fastify/jwt'
import fastifyStatic from '@fastify/static'
import swagger from '@fastify/swagger'
import swaggerUi from '@fastify/swagger-ui'
import { env } from './lib/env.js'
import { healthRoutes } from './routes/health.js'
import { brandingRoutes } from './routes/branding.js'
import { authRoutes } from './routes/auth.js'
import { warehouseRoutes } from './routes/warehouses.js'
import { areaRoutes } from './routes/areas.js'
import { lookupRoutes } from './routes/lookup.js'
import { printerRoutes } from './routes/printers.js'
import { documentStatusActionRoutes, documentStatusCriteriaRoutes, documentApprovalTypeRoutes } from './routes/documentTypes.js'
import {
  reasonCategoryRoutes, operationGroupLinkRoutes, operationToleranceRoutes, operationToleranceDetailRoutes, forbiddenProductRoutes,
  conversionRoutes, sequentialOperationRoutes, autoReferenceDocumentRoutes, bulkActionRoutes,
  productAdditionalGroupRoutes, productBasedCollectionRoutes, tripBasedCollectionRoutes,
} from './routes/operationConfig.js'
import {
  entryConditionBreakPasswordRoutes, entryConditionBreakReasonRoutes, entryConditionTypeOperationRoutes,
  exitConditionControlFieldRoutes, exitConditionBreakPasswordRoutes, exitConditionBreakReasonRoutes, exitConditionTypeOperationRoutes,
  routingControlFieldRoutes, routingBreakPasswordRoutes, routingBreakReasonRoutes, routingTypeOperationRoutes, routingProductLocationRoutes, routingParameterRoutes,
  countApprovalUserGroupRoutes, countCriteriaRoutes, countParameterRoutes,
} from './routes/wmsConfig.js'
import {
  languageRoutes, shiftRoutes, screenReportLinkRoutes, stockControlParameterRoutes, documentPlanningParameterRoutes,
  pickOrderParameterRoutes, dashboardReportRoutes, warehouseVehicleRoutes, workOrderGeneralParameterRoutes,
  workOrderReasonRoutes, workOrderReferenceOperationRoutes, rackFeedParameterRoutes, menuGroupRoutes,
} from './routes/genelConfig.js'
import { locationRoutes } from './routes/locations.js'
import { unitRoutes } from './routes/units.js'
import { productRoutes } from './routes/products.js'
import { productTypeRoutes } from './routes/productTypes.js'
import { productDetailTypeRoutes } from './routes/productDetailTypes.js'
import { productSubstituteRoutes } from './routes/productSubstitutes.js'
import { inventoryRuleRoutes } from './routes/inventoryRules.js'
import {
  partnerExtraGroupRoutes, partnerExtraFieldDefRoutes, partnerExtraGroupLinkRoutes,
  partnerExtraFieldRoutes, partnerAcceptanceTimeRoutes, partnerOptimizationRoutes,
} from './routes/partnerConfig.js'
import { entryConditionParameterRoutes, exitConditionParameterRoutes, conditionBreakLogRoutes } from './routes/conditionConfig.js'
import { operationTypeRoutes } from './routes/operationTypes.js'
import { businessPartnerRoutes } from './routes/businessPartners.js'
import { stockRoutes, stockLedgerRoutes } from './routes/stock.js'
import { documentRoutes } from './routes/documents.js'
import { documentScopeRoutes } from './routes/documentScopes.js'
import { purchaseOrderRoutes } from './routes/purchaseOrders.js'
import { salesOrderRoutes } from './routes/salesOrders.js'
import { inventoryRoutes } from './routes/inventory.js'
import { userRoutes } from './routes/users.js'
import { userAuthorizationRoutes } from './routes/userAuthorizations.js'
import { companyRoutes } from './routes/companies.js'
import { userGroupRoutes } from './routes/userGroups.js'
import { columnAuthorizationRoutes } from './routes/columnAuthorizations.js'
import { screenRightRoutes } from './routes/screenRights.js'
import { applicationRoutes } from './routes/applications.js'
import { ssoRoutes } from './routes/sso.js'
import { handheldMenuGroupRoutes, handheldMenuItemRoutes, handheldMenuRoutes } from './routes/handheldMenu.js'
import { vehicleRoutes } from './routes/vehicles.js'
import { shipmentRoutes } from './routes/shipments.js'
import { stockCountRoutes, countDifferenceRoutes } from './routes/stockCounts.js'
import { integrationLogRoutes } from './routes/integration.js'
import { integrationPackageRoutes, integrationAddressRoutes, integrationQueryRoutes, integrationQueryColumnRoutes, integrationWriteParamRoutes, integrationXmlConvertRoutes } from './routes/integrationPackages.js'
import { reportDefRoutes, reportCriteriaRoutes, reportFieldRoutes, reportRunRoutes } from './routes/reportBuilder.js'
import { suggestionListRoutes } from './routes/suggestions.js'
import { extraFieldRoutes, extraFieldOptionRoutes, operationTypeExtraFieldRoutes } from './routes/extraFields.js'
import { documentAssignmentRoutes } from './routes/assignments.js'
import { countAssignmentRoutes, controlCountRoutes, controlCountLineRoutes, palletNotificationRoutes, palletNotificationLineRoutes, palletHistoryRoutes } from './routes/countPalletScreens.js'
import { labelTemplateRoutes, labelTemplateItemRoutes, labelTemplateQueryRoutes } from './routes/labelTemplate.js'
import { qualityInspectionRoutes } from './routes/qualityInspections.js'
import { invoiceRoutes } from './routes/invoices.js'
import { reportRoutes } from './routes/reports.js'
import { productGroupRoutes } from './routes/productGroups.js'
import { sequenceRoutes } from './routes/sequences.js'
import { reasonRoutes, locationGroupRoutes, operationGroupRoutes, labelTypeRoutes, productSubGroupRoutes, entryConditionTypeRoutes, exitConditionTypeRoutes, routingTypeRoutes, facilityRoutes, regionRoutes, partnerGroupRoutes, statusRoutes, palletTypeRoutes, parameterRoutes, documentStatusRoutes } from './routes/wmsMasters.js'
import { barcodeTypeRoutes, barcodeSegmentRoutes } from './routes/barcodeTypes.js'
import { routingRuleRoutes } from './routes/routing.js'
import { productUnitRoutes } from './routes/productUnits.js'
import { operationTypeStatusRoutes, operationTypeLocationRoutes, operationTypeReasonRoutes, operationTypePalletTypeRoutes } from './routes/operationLinks.js'
import { locationCapacityRoutes } from './routes/locationCapacity.js'
import { locationGroupLinkRoutes } from './routes/locationGroupLinks.js'
import { palletRoutes } from './routes/pallets.js'
import { workOrderRoutes } from './routes/workOrders.js'
import { notificationRoutes } from './routes/notifications.js'
import { requireRole } from './lib/rbac.js'
import { prisma } from './lib/prisma.js'

// OneGate-assets/ proje kökünde (src/ -> ..)
const assetsDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'OneGate-assets')

export interface BuildAppOptions {
  logger?: boolean
}

export async function buildApp(opts: BuildAppOptions = {}): Promise<FastifyInstance> {
  const app = Fastify({
    logger: opts.logger ?? (env.nodeEnv === 'production' ? true : { level: 'info' }),
  })

  // origin: true tek başına metodları GET,HEAD,POST ile sınırlıyordu → tarayıcıdan PATCH/DELETE preflight'ta patlıyordu.
  await app.register(cors, { origin: true, methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'] })
  await app.register(jwt, { secret: env.jwtSecret })

  // OpenAPI/Swagger — her endpoint URL'den otomatik etiketlenir (UI ekibi için canlı kontrat)
  app.addHook('onRoute', (routeOptions) => {
    if (routeOptions.url.startsWith('/docs') || routeOptions.url === '/openapi.json') return
    const m = /^\/api\/([^/]+)/.exec(routeOptions.url)
    const tag = m?.[1] ?? 'system'
    routeOptions.schema = { ...(routeOptions.schema ?? {}), tags: [tag] }
  })
  await app.register(swagger, {
    openapi: {
      info: { title: 'OneGate API', description: 'WMS · Procurement · Sales · Logistics · Finance platform API', version: '0.1.0' },
      components: { securitySchemes: { bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' } } },
      security: [{ bearerAuth: [] }],
    },
  })

  // Marka varlıkları (logo / icon / favicon) → /OneGate-assets/*
  await app.register(fastifyStatic, {
    root: assetsDir,
    prefix: '/OneGate-assets/',
    decorateReply: true, // reply.sendFile için (branding route'ları kullanır)
    maxAge: '7d',
  })

  app.decorate('authenticate', async (request, reply) => {
    try {
      await request.jwtVerify()
    } catch {
      await reply.code(401).send({ error: 'Unauthorized' })
    }
  })

  // RBAC: yazma işlemleri ADMIN/OPERATOR; kullanıcı yönetimi ADMIN
  app.decorate('requireWrite', requireRole('ADMIN', 'OPERATOR'))
  app.decorate('requireAdmin', requireRole('ADMIN'))

  // Global kimlik doğrulama: tüm /api/* (yalnız login + branding hariç) JWT ister.
  // Okuma izolasyonu: GET'ler de artık doğrulanır → request.user dolu → getCompanyId tenant'a kilitler.
  // (Eskiden GET'ler public idi: x-company-id header / DEFAULT_COMPANY_ID ile her tenant okunabiliyordu.)
  const isPublicPath = (rawUrl: string): boolean => {
    const path = rawUrl.split('?')[0] ?? rawUrl
    if (!path.startsWith('/api/')) return true // /health, /docs, /openapi.json, /favicon, /OneGate-assets, /site.webmanifest
    return path.startsWith('/api/auth/') || path === '/api/branding'
  }
  app.addHook('onRequest', async (request, reply) => {
    if (request.method === 'OPTIONS') return
    if (isPublicPath(request.url)) return
    try {
      await request.jwtVerify()
    } catch {
      return reply.code(401).send({ error: 'Unauthorized' })
    }
    // Tek oturum (single-session): JWT'deki sid, DB'deki aktif sessionId ile eşleşmeli.
    // Aynı kullanıcı başka cihazda giriş yaptıysa sessionId değişmiştir → eski token 401 (SESSION_SUPERSEDED).
    const u = request.user as { sub?: number; sid?: string }
    if (u?.sub) {
      const row = await prisma.tBLUSER.findUnique({ where: { id: u.sub }, select: { sessionId: true } })
      if (!row || !u.sid || row.sessionId !== u.sid) {
        return reply.code(401).send({ error: 'Oturumunuz başka bir cihazda açıldı', code: 'SESSION_SUPERSEDED' })
      }
    }
  })

  // Routes
  await app.register(healthRoutes)
  await app.register(userRoutes, { prefix: '/api/users' })
  await app.register(userAuthorizationRoutes, { prefix: '/api/user-authorizations' })
  await app.register(companyRoutes, { prefix: '/api/companies' })
  await app.register(userGroupRoutes, { prefix: '/api/user-groups' })
  await app.register(columnAuthorizationRoutes, { prefix: '/api/column-authorizations' })
  await app.register(screenRightRoutes, { prefix: '/api/screen-rights' })
  await app.register(applicationRoutes, { prefix: '/api' })
  await app.register(ssoRoutes, { prefix: '/api/sso' })
  await app.register(handheldMenuGroupRoutes, { prefix: '/api/handheld-menu-groups' })
  await app.register(handheldMenuItemRoutes, { prefix: '/api/handheld-menu-items' })
  await app.register(handheldMenuRoutes, { prefix: '/api/handheld-menu' })
  await app.register(brandingRoutes)
  await app.register(authRoutes, { prefix: '/api/auth' })
  await app.register(warehouseRoutes, { prefix: '/api/warehouses' })
  await app.register(areaRoutes, { prefix: '/api/areas' })
  await app.register(lookupRoutes, { prefix: '/api/lookup' })
  await app.register(printerRoutes, { prefix: '/api/printers' })
  await app.register(locationRoutes, { prefix: '/api/locations' })
  await app.register(unitRoutes, { prefix: '/api/units' })
  await app.register(productRoutes, { prefix: '/api/products' })
  await app.register(productTypeRoutes, { prefix: '/api/product-types' })
  await app.register(productDetailTypeRoutes, { prefix: '/api/product-detail-types' })
  await app.register(productSubstituteRoutes, { prefix: '/api/product-substitutes' })
  await app.register(inventoryRuleRoutes, { prefix: '/api/inventory-rules' })
  await app.register(operationTypeRoutes, { prefix: '/api/operation-types' })
  await app.register(businessPartnerRoutes, { prefix: '/api/partners' })
  await app.register(partnerExtraGroupRoutes, { prefix: '/api/partner-extra-groups' })
  await app.register(partnerExtraFieldDefRoutes, { prefix: '/api/partner-extra-field-defs' })
  await app.register(partnerExtraGroupLinkRoutes, { prefix: '/api/partner-extra-group-links' })
  await app.register(partnerExtraFieldRoutes, { prefix: '/api/partner-extra-fields' })
  await app.register(partnerAcceptanceTimeRoutes, { prefix: '/api/partner-acceptance-times' })
  await app.register(partnerOptimizationRoutes, { prefix: '/api/partner-optimizations' })
  await app.register(stockRoutes, { prefix: '/api/stock' })
  await app.register(stockLedgerRoutes, { prefix: '/api/stock-ledger' })
  await app.register(documentRoutes, { prefix: '/api/documents' })
  await app.register(documentScopeRoutes, { prefix: '/api/document-line-scopes' })
  await app.register(purchaseOrderRoutes, { prefix: '/api/purchase-orders' })
  await app.register(salesOrderRoutes, { prefix: '/api/sales-orders' })
  await app.register(inventoryRoutes, { prefix: '/api/inventory' })
  await app.register(vehicleRoutes, { prefix: '/api/vehicles' })
  await app.register(shipmentRoutes, { prefix: '/api/shipments' })
  await app.register(stockCountRoutes, { prefix: '/api/stock-counts' })
  await app.register(countDifferenceRoutes, { prefix: '/api/count-differences' })
  await app.register(integrationLogRoutes, { prefix: '/api/integration-logs' })
  await app.register(integrationPackageRoutes, { prefix: '/api/integration-packages' })
  await app.register(integrationAddressRoutes, { prefix: '/api/integration-addresses' })
  await app.register(integrationQueryRoutes, { prefix: '/api/integration-queries' })
  await app.register(integrationQueryColumnRoutes, { prefix: '/api/integration-query-columns' })
  await app.register(integrationWriteParamRoutes, { prefix: '/api/integration-write-params' })
  await app.register(integrationXmlConvertRoutes, { prefix: '/api/integration-xml-converts' })
  await app.register(reportDefRoutes, { prefix: '/api/report-defs' })
  await app.register(reportCriteriaRoutes, { prefix: '/api/report-criteria' })
  await app.register(reportFieldRoutes, { prefix: '/api/report-fields' })
  await app.register(reportRunRoutes, { prefix: '/api/report-run' })
  await app.register(suggestionListRoutes, { prefix: '/api/suggest-list' })
  await app.register(extraFieldRoutes, { prefix: '/api/extra-fields' })
  await app.register(extraFieldOptionRoutes, { prefix: '/api/extra-field-options' })
  await app.register(operationTypeExtraFieldRoutes, { prefix: '/api/operation-type-extra-fields' })
  await app.register(documentAssignmentRoutes, { prefix: '/api/document-assignments' })
  await app.register(countAssignmentRoutes, { prefix: '/api/count-assignments' })
  await app.register(controlCountRoutes, { prefix: '/api/control-counts' })
  await app.register(controlCountLineRoutes, { prefix: '/api/control-count-lines' })
  await app.register(palletNotificationRoutes, { prefix: '/api/pallet-notifications' })
  await app.register(palletNotificationLineRoutes, { prefix: '/api/pallet-notification-lines' })
  await app.register(palletHistoryRoutes, { prefix: '/api/pallet-history' })
  await app.register(labelTemplateRoutes, { prefix: '/api/label-templates' })
  await app.register(labelTemplateItemRoutes, { prefix: '/api/label-template-items' })
  await app.register(labelTemplateQueryRoutes, { prefix: '/api/label-template-queries' })
  await app.register(qualityInspectionRoutes, { prefix: '/api/quality-inspections' })
  await app.register(invoiceRoutes, { prefix: '/api/invoices' })
  await app.register(reportRoutes, { prefix: '/api/reports' })
  await app.register(productGroupRoutes, { prefix: '/api/product-groups' })
  await app.register(sequenceRoutes, { prefix: '/api/sequences' })
  await app.register(reasonRoutes, { prefix: '/api/reasons' })
  await app.register(locationGroupRoutes, { prefix: '/api/location-groups' })
  await app.register(locationGroupLinkRoutes, { prefix: '/api/location-groups' })
  await app.register(operationGroupRoutes, { prefix: '/api/operation-groups' })
  await app.register(labelTypeRoutes, { prefix: '/api/label-types' })
  await app.register(productSubGroupRoutes, { prefix: '/api/product-subgroups' })
  await app.register(palletRoutes, { prefix: '/api/pallets' })
  await app.register(workOrderRoutes, { prefix: '/api/work-orders' })
  await app.register(notificationRoutes, { prefix: '/api/notifications' })
  await app.register(entryConditionTypeRoutes, { prefix: '/api/entry-condition-types' })
  await app.register(exitConditionTypeRoutes, { prefix: '/api/exit-condition-types' })
  await app.register(routingTypeRoutes, { prefix: '/api/routing-types' })
  await app.register(routingRuleRoutes, { prefix: '/api/routing-rules' })
  await app.register(facilityRoutes, { prefix: '/api/facilities' })
  await app.register(regionRoutes, { prefix: '/api/regions' })
  await app.register(partnerGroupRoutes, { prefix: '/api/partner-groups' })
  await app.register(productUnitRoutes, { prefix: '/api/product-units' })
  await app.register(statusRoutes, { prefix: '/api/statuses' })
  await app.register(palletTypeRoutes, { prefix: '/api/pallet-types' })
  await app.register(operationTypeStatusRoutes, { prefix: '/api/operation-type-statuses' })
  await app.register(operationTypeLocationRoutes, { prefix: '/api/operation-type-locations' })
  await app.register(operationTypeReasonRoutes, { prefix: '/api/operation-type-reasons' })
  await app.register(operationTypePalletTypeRoutes, { prefix: '/api/operation-type-pallet-types' })
  await app.register(locationCapacityRoutes, { prefix: '/api/location-capacities' })
  await app.register(barcodeTypeRoutes, { prefix: '/api/barcode-types' })
  await app.register(barcodeSegmentRoutes, { prefix: '/api/barcode-segments' })
  await app.register(parameterRoutes, { prefix: '/api/parameters' })
  await app.register(documentStatusRoutes, { prefix: '/api/document-statuses' })
  await app.register(documentStatusActionRoutes, { prefix: '/api/document-status-actions' })
  await app.register(documentStatusCriteriaRoutes, { prefix: '/api/document-status-criteria' })
  await app.register(documentApprovalTypeRoutes, { prefix: '/api/document-approval-types' })
  await app.register(reasonCategoryRoutes, { prefix: '/api/reason-categories' })
  await app.register(operationGroupLinkRoutes, { prefix: '/api/operation-group-links' })
  await app.register(operationToleranceRoutes, { prefix: '/api/operation-tolerances' })
  await app.register(operationToleranceDetailRoutes, { prefix: '/api/operation-tolerance-details' })
  await app.register(forbiddenProductRoutes, { prefix: '/api/operation-forbidden-products' })
  await app.register(conversionRoutes, { prefix: '/api/operation-conversions' })
  await app.register(sequentialOperationRoutes, { prefix: '/api/sequential-operations' })
  await app.register(autoReferenceDocumentRoutes, { prefix: '/api/auto-reference-documents' })
  await app.register(bulkActionRoutes, { prefix: '/api/operation-bulk-actions' })
  await app.register(productAdditionalGroupRoutes, { prefix: '/api/product-additional-groups' })
  await app.register(productBasedCollectionRoutes, { prefix: '/api/product-based-collections' })
  await app.register(tripBasedCollectionRoutes, { prefix: '/api/trip-based-collections' })
  // Giriş/Çıkış Koşulları · Yönlendirme · Sayım config
  await app.register(entryConditionBreakPasswordRoutes, { prefix: '/api/entry-condition-break-passwords' })
  await app.register(entryConditionBreakReasonRoutes, { prefix: '/api/entry-condition-break-reasons' })
  await app.register(entryConditionTypeOperationRoutes, { prefix: '/api/entry-condition-type-operations' })
  await app.register(exitConditionControlFieldRoutes, { prefix: '/api/exit-condition-control-fields' })
  await app.register(exitConditionBreakPasswordRoutes, { prefix: '/api/exit-condition-break-passwords' })
  await app.register(exitConditionBreakReasonRoutes, { prefix: '/api/exit-condition-break-reasons' })
  await app.register(exitConditionTypeOperationRoutes, { prefix: '/api/exit-condition-type-operations' })
  await app.register(entryConditionParameterRoutes, { prefix: '/api/entry-condition-parameters' })
  await app.register(exitConditionParameterRoutes, { prefix: '/api/exit-condition-parameters' })
  await app.register(conditionBreakLogRoutes, { prefix: '/api/condition-break-logs' })
  await app.register(routingControlFieldRoutes, { prefix: '/api/routing-control-fields' })
  await app.register(routingBreakPasswordRoutes, { prefix: '/api/routing-break-passwords' })
  await app.register(routingBreakReasonRoutes, { prefix: '/api/routing-break-reasons' })
  await app.register(routingTypeOperationRoutes, { prefix: '/api/routing-type-operations' })
  await app.register(routingProductLocationRoutes, { prefix: '/api/routing-product-locations' })
  await app.register(routingParameterRoutes, { prefix: '/api/routing-parameters' })
  await app.register(countApprovalUserGroupRoutes, { prefix: '/api/count-approval-user-groups' })
  await app.register(countCriteriaRoutes, { prefix: '/api/count-criteria' })
  await app.register(countParameterRoutes, { prefix: '/api/count-parameters' })
  // Genel ek · İş Emri config · Dinamik Etiketleme
  await app.register(languageRoutes, { prefix: '/api/languages' })
  await app.register(shiftRoutes, { prefix: '/api/shifts' })
  await app.register(screenReportLinkRoutes, { prefix: '/api/screen-report-links' })
  await app.register(stockControlParameterRoutes, { prefix: '/api/stock-control-parameters' })
  await app.register(documentPlanningParameterRoutes, { prefix: '/api/document-planning-parameters' })
  await app.register(pickOrderParameterRoutes, { prefix: '/api/pick-order-parameters' })
  await app.register(dashboardReportRoutes, { prefix: '/api/dashboard-reports' })
  await app.register(warehouseVehicleRoutes, { prefix: '/api/warehouse-vehicles' })
  await app.register(workOrderGeneralParameterRoutes, { prefix: '/api/work-order-general-parameters' })
  await app.register(workOrderReasonRoutes, { prefix: '/api/work-order-reasons' })
  await app.register(workOrderReferenceOperationRoutes, { prefix: '/api/work-order-reference-operations' })
  await app.register(rackFeedParameterRoutes, { prefix: '/api/rack-feed-parameters' })
  await app.register(menuGroupRoutes, { prefix: '/api/menu-groups' })

  // OpenAPI spec (JSON) + Swagger UI (/docs)
  app.get('/openapi.json', () => app.swagger())
  await app.register(swaggerUi, { routePrefix: '/docs' })

  return app
}
