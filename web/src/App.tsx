import { Refine, Authenticated } from '@refinedev/core'
import routerProvider from '@refinedev/react-router'
import { Routes, Route, Outlet, Navigate } from 'react-router-dom'
import { dataProvider } from './providers/dataProvider'
import { authProvider } from './providers/authProvider'
import { accessControlProvider } from './providers/accessControlProvider'
import { Shell } from './Shell'
import { Login } from './pages/Login'
import { GenericList } from './pages/GenericList'
import { GenericForm } from './pages/GenericForm'
import { GenericDetail } from './pages/GenericDetail'
import { TxnCreate } from './pages/TxnCreate'
import { Dashboard } from './pages/Dashboard'
import { DocumentCreate } from './pages/DocumentCreate'
import { ProductUnitBarcodes } from './pages/ProductUnitBarcodes'
import { LocationBulkGenerate } from './pages/LocationBulkGenerate'
import { OperationTypeForm } from './pages/OperationTypeForm'
import { BarcodeTypeForm } from './pages/BarcodeTypeForm'
import { IntegrationPackageForm } from './pages/IntegrationPackageForm'
import { IntegrationTransfer } from './pages/IntegrationTransfer'
import { IntegrationQueryForm } from './pages/IntegrationQueryForm'
import { ProductForm } from './pages/ProductForm'
import { PartnerForm } from './pages/PartnerForm'
import { LabelDesigner } from './pages/LabelDesigner'
import { StockCountCreate } from './pages/StockCountCreate'
import { StockCountEntry } from './pages/StockCountEntry'
import { WorkOrderCreate } from './pages/WorkOrderCreate'
import { PalletCreate } from './pages/PalletCreate'
import { PalletBulkUpdate } from './pages/PalletBulkUpdate'
import { CountDifferences } from './pages/CountDifferences'
import { PalletOps } from './pages/PalletOps'
import { ReportCenter } from './pages/ReportCenter'
import { StockReport } from './pages/StockReport'
import { DocumentObservation } from './pages/DocumentObservation'
import { BulkDocOps } from './pages/BulkDocOps'
import { BulkStockOps } from './pages/BulkStockOps'
import { DocumentAssign } from './pages/DocumentAssign'
import { DocumentReservation } from './pages/DocumentReservation'
import { StockReclassify } from './pages/StockReclassify'
import { SuggestList } from './pages/SuggestList'
import { StockEntry } from './pages/StockEntry'
import { EntryLabeling } from './pages/EntryLabeling'
import { ExtraFieldOptions } from './pages/ExtraFieldOptions'
import { ToleranceDetails } from './pages/ToleranceDetails'
import { StatusHistory } from './pages/StatusHistory'
import { DocumentLineCollect } from './pages/DocumentLineCollect'
import { OwnerLines } from './pages/OwnerLines'
import { LabelPrint } from './pages/LabelPrint'
import { UserForm } from './pages/UserForm'
import { UserGroupForm } from './pages/UserGroupForm'
import { UserAuthorizations } from './pages/UserAuthorizations'
import { AuthCenter } from './pages/AuthCenter'
import { ShipmentCreate } from './pages/ShipmentCreate'
import { MobileHome } from './mobile/MobileHome'
import { MobileStockQuery } from './mobile/MobileStockQuery'
import { MobileReceipt } from './mobile/MobileReceipt'
import { MobilePick } from './mobile/MobilePick'
import { MobileStub } from './mobile/MobileStub'
import { RESOURCES } from './resources'
import { hasForm } from './formConfig'
import { hasDetail } from './detailActions'
import { hasTxnCreate } from './txnConfig'

// Mobil (el terminali) kullanıcı backoffice'i GÖREMEZ — her zaman /m'e yönlenir (URL ile bile).
const currentUserIsMobile = (): boolean => {
  try { return JSON.parse(localStorage.getItem('og_user') ?? 'null')?.isMobileUser === true } catch { return false }
}

export default function App() {
  return (
    <Refine
      dataProvider={dataProvider}
      authProvider={authProvider}
      accessControlProvider={accessControlProvider}
      routerProvider={routerProvider}
      resources={RESOURCES.map((r) => ({ name: r.name, list: `/${r.name}`, meta: { label: r.label } }))}
      options={{ disableTelemetry: true, syncWithLocation: true }}
    >
      <Routes>
        <Route
          path="/m"
          element={
            <Authenticated key="mobile" fallback={<Navigate to="/login" />}>
              <Outlet />
            </Authenticated>
          }
        >
          <Route index element={<MobileHome />} />
          <Route path="stock" element={<MobileStockQuery />} />
          <Route path="receipt" element={<MobileReceipt />} />
          <Route path="pick" element={<MobilePick />} />
          <Route path="count" element={<MobileStub title="Sayım" />} />
        </Route>
        <Route
          element={
            <Authenticated key="protected" fallback={<Navigate to="/login" />}>
              {currentUserIsMobile() ? <Navigate to="/m" replace /> : (
                <Shell>
                  <Outlet />
                </Shell>
              )}
            </Authenticated>
          }
        >
          <Route index element={<Navigate to="/dashboard" />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="documents/new" element={<DocumentCreate />} />
          <Route path="product-units/:id/barcodes" element={<ProductUnitBarcodes />} />
          <Route path="extra-fields/:id/options" element={<ExtraFieldOptions />} />
          <Route path="operation-tolerances/:id/details" element={<ToleranceDetails />} />
          <Route path="documents/:id/status-history" element={<StatusHistory />} />
          <Route path="documents/:id/lines/:lineId/collect" element={<DocumentLineCollect />} />
          <Route path="control-counts/:id/lines" element={<OwnerLines resource="control-count-lines" ownerField="controlCountId" ownerResource="control-counts" backTo="/control-counts" title="Kontrol Sayım Satırları" />} />
          <Route path="pallet-notifications/:id/lines" element={<OwnerLines resource="pallet-notification-lines" ownerField="notificationId" ownerResource="pallet-notifications" backTo="/pallet-notifications" title="Palet Bildirim Satırları" />} />
          <Route path="routing-types/:id/params" element={<OwnerLines resource="routing-parameters" ownerField="routingTypeId" ownerResource="routing-types" backTo="/routing-types" title="Yönlendirme Parametre" subtitle="Yönlendirme tipine bağlı parametreler" />} />
          <Route path="label-templates/:id/items" element={<OwnerLines resource="label-template-items" ownerField="labelTemplateId" ownerResource="label-templates" backTo="/label-templates" title="Etiket Item" subtitle="Etiket tipine bağlı form item'ları" />} />
          <Route path="label-templates/:id/queries" element={<OwnerLines resource="label-template-queries" ownerField="labelTemplateId" ownerResource="label-templates" backTo="/label-templates" title="Etiket Sorgu" subtitle="Etiket tipine bağlı sorgu kütüphanesi (item combo/lookup kaynağı)" />} />
          <Route path="label-templates/:id/print" element={<LabelPrint />} />
          <Route path="users/new" element={<UserForm mode="create" />} />
          <Route path="users/:id/edit" element={<UserForm mode="edit" />} />
          <Route path="users/:id/authorizations" element={<UserAuthorizations />} />
          <Route path="user-groups/new" element={<UserGroupForm mode="create" />} />
          <Route path="user-groups/:id/edit" element={<UserGroupForm mode="edit" />} />
          <Route path="user-groups/:id/authorizations" element={<UserAuthorizations subject="group" />} />
          <Route path="auth-center" element={<AuthCenter />} />
          <Route path="handheld-menu-groups/:id/items" element={<OwnerLines resource="handheld-menu-items" ownerField="groupId" ownerResource="handheld-menu-groups" backTo="/handheld-menu-groups" title="El Terminali Menüleri" subtitle="Gruba bağlı menü item'ları — her biri bir operasyon koduna ve mobil ekrana bağlı" />} />

          <Route path="locations/bulk" element={<LocationBulkGenerate />} />
          <Route path="label-types/:id/design" element={<LabelDesigner />} />
          <Route path="operation-types/new" element={<OperationTypeForm mode="create" />} />
          <Route path="operation-types/:id/edit" element={<OperationTypeForm mode="edit" />} />
          <Route path="barcode-types/new" element={<BarcodeTypeForm mode="create" />} />
          <Route path="barcode-types/:id/edit" element={<BarcodeTypeForm mode="edit" />} />
          <Route path="integration-packages/new" element={<IntegrationPackageForm mode="create" />} />
          <Route path="integration-packages/:id/edit" element={<IntegrationPackageForm mode="edit" />} />
          <Route path="integration-transfer" element={<IntegrationTransfer />} />
          <Route path="integration-queries/new" element={<IntegrationQueryForm mode="create" />} />
          <Route path="integration-queries/:id/edit" element={<IntegrationQueryForm mode="edit" />} />
          <Route path="products/new" element={<ProductForm mode="create" />} />
          <Route path="products/:id/edit" element={<ProductForm mode="edit" />} />
          <Route path="partners/new" element={<PartnerForm mode="create" />} />
          <Route path="partners/:id/edit" element={<PartnerForm mode="edit" />} />
          <Route path="stock-counts/new" element={<StockCountCreate />} />
          <Route path="stock-counts/:id" element={<StockCountEntry />} />
          <Route path="work-orders/new" element={<WorkOrderCreate />} />
          <Route path="pallets/new" element={<PalletCreate />} />
          <Route path="pallets/:id/edit" element={<GenericForm resource="pallets" mode="edit" />} />
          <Route path="pallets-bulk" element={<PalletBulkUpdate />} />
          <Route path="count-differences" element={<CountDifferences />} />
          <Route path="pallets" element={<PalletOps />} />
          <Route path="report-center" element={<ReportCenter />} />
          <Route path="stock-report" element={<StockReport />} />
          <Route path="documents-in-obs" element={<DocumentObservation direction="INBOUND" />} />
          <Route path="documents-out-obs" element={<DocumentObservation direction="OUTBOUND" />} />
          <Route path="documents-tr-obs" element={<DocumentObservation direction="INTERNAL" />} />
          <Route path="bulk-doc-ops" element={<BulkDocOps direction="OUTBOUND" />} />
          <Route path="bulk-stock-ops" element={<BulkStockOps direction="OUTBOUND" />} />
          <Route path="bulk-stock-ops-tr" element={<BulkStockOps direction="INTERNAL" />} />
          <Route path="bulk-doc-ops-in" element={<BulkDocOps direction="INBOUND" />} />
          <Route path="bulk-doc-ops-tr" element={<BulkDocOps direction="INTERNAL" />} />
          <Route path="doc-assign-in" element={<DocumentAssign direction="INBOUND" />} />
          <Route path="doc-assign-out" element={<DocumentAssign direction="OUTBOUND" />} />
          <Route path="doc-assign-tr" element={<DocumentAssign direction="INTERNAL" />} />
          <Route path="reservation-out" element={<DocumentReservation direction="OUTBOUND" />} />
          <Route path="reservation-tr" element={<DocumentReservation direction="INTERNAL" />} />
          <Route path="stock-reclassify" element={<StockReclassify />} />
          <Route path="putaway-suggest" element={<SuggestList mode="putaway" />} />
          <Route path="pick-suggest" element={<SuggestList mode="pick" />} />
          <Route path="stock-entry" element={<StockEntry direction="INBOUND" />} />
          <Route path="entry-labeling" element={<EntryLabeling direction="INBOUND" />} />
          <Route path="stock-exit" element={<StockEntry direction="OUTBOUND" />} />
          <Route path="exit-labeling" element={<EntryLabeling direction="OUTBOUND" />} />
          <Route path="shipments/new" element={<ShipmentCreate />} />
          {RESOURCES.filter((r) => hasForm(r.name) && !['products', 'partners', 'pallets', 'barcode-types', 'integration-packages', 'integration-queries'].includes(r.name)).flatMap((r) => [
            <Route key={`${r.name}-new`} path={`${r.name}/new`} element={<GenericForm resource={r.name} mode="create" />} />,
            <Route key={`${r.name}-edit`} path={`${r.name}/:id/edit`} element={<GenericForm resource={r.name} mode="edit" />} />,
          ])}
          {RESOURCES.filter((r) => hasTxnCreate(r.name)).map((r) => (
            <Route key={`${r.name}-txnnew`} path={`${r.name}/new`} element={<TxnCreate resource={r.name} />} />
          ))}
          {RESOURCES.filter((r) => hasDetail(r.name)).map((r) => (
            <Route key={`${r.name}-detail`} path={`${r.name}/:id`} element={<GenericDetail resource={r.name} label={r.label} />} />
          ))}
          {RESOURCES.filter((r) => !['pallets-bulk', 'count-differences', 'pallets', 'report-center', 'stock-report', 'documents-in-obs', 'documents-out-obs', 'documents-tr-obs', 'bulk-doc-ops', 'bulk-doc-ops-in', 'bulk-doc-ops-tr', 'bulk-stock-ops', 'bulk-stock-ops-tr', 'doc-assign-in', 'doc-assign-out', 'doc-assign-tr', 'reservation-out', 'reservation-tr', 'stock-reclassify', 'putaway-suggest', 'pick-suggest', 'stock-entry', 'entry-labeling', 'stock-exit', 'exit-labeling'].includes(r.name)).map((r) => (
            <Route key={r.name} path={r.name} element={<GenericList resource={r.apiName ?? r.name} label={r.label} filter={r.filter} observe={r.observe} />} />
          ))}
        </Route>
        <Route
          element={
            <Authenticated key="public" fallback={<Outlet />}>
              <Navigate to="/products" />
            </Authenticated>
          }
        >
          <Route path="/login" element={<Login />} />
        </Route>
      </Routes>
    </Refine>
  )
}
