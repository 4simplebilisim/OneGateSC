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
import { ProductForm } from './pages/ProductForm'
import { LabelDesigner } from './pages/LabelDesigner'
import { StockCountCreate } from './pages/StockCountCreate'
import { WorkOrderCreate } from './pages/WorkOrderCreate'
import { PalletCreate } from './pages/PalletCreate'
import { ShipmentCreate } from './pages/ShipmentCreate'
import { MobileHome } from './mobile/MobileHome'
import { MobileStockQuery } from './mobile/MobileStockQuery'
import { MobileReceipt } from './mobile/MobileReceipt'
import { MobileStub } from './mobile/MobileStub'
import { RESOURCES } from './resources'
import { hasForm } from './formConfig'
import { hasDetail } from './detailActions'
import { hasTxnCreate } from './txnConfig'

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
          <Route path="pick" element={<MobileStub title="Toplama" />} />
          <Route path="count" element={<MobileStub title="Sayım" />} />
        </Route>
        <Route
          element={
            <Authenticated key="protected" fallback={<Navigate to="/login" />}>
              <Shell>
                <Outlet />
              </Shell>
            </Authenticated>
          }
        >
          <Route index element={<Navigate to="/dashboard" />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="documents/new" element={<DocumentCreate />} />
          <Route path="product-units/:id/barcodes" element={<ProductUnitBarcodes />} />
          <Route path="locations/bulk" element={<LocationBulkGenerate />} />
          <Route path="label-types/:id/design" element={<LabelDesigner />} />
          <Route path="operation-types/new" element={<OperationTypeForm mode="create" />} />
          <Route path="operation-types/:id/edit" element={<OperationTypeForm mode="edit" />} />
          <Route path="products/new" element={<ProductForm mode="create" />} />
          <Route path="products/:id/edit" element={<ProductForm mode="edit" />} />
          <Route path="stock-counts/new" element={<StockCountCreate />} />
          <Route path="work-orders/new" element={<WorkOrderCreate />} />
          <Route path="pallets/new" element={<PalletCreate />} />
          <Route path="shipments/new" element={<ShipmentCreate />} />
          {RESOURCES.filter((r) => hasForm(r.name) && r.name !== 'products').flatMap((r) => [
            <Route key={`${r.name}-new`} path={`${r.name}/new`} element={<GenericForm resource={r.name} mode="create" />} />,
            <Route key={`${r.name}-edit`} path={`${r.name}/:id/edit`} element={<GenericForm resource={r.name} mode="edit" />} />,
          ])}
          {RESOURCES.filter((r) => hasTxnCreate(r.name)).map((r) => (
            <Route key={`${r.name}-txnnew`} path={`${r.name}/new`} element={<TxnCreate resource={r.name} />} />
          ))}
          {RESOURCES.filter((r) => hasDetail(r.name)).map((r) => (
            <Route key={`${r.name}-detail`} path={`${r.name}/:id`} element={<GenericDetail resource={r.name} label={r.label} />} />
          ))}
          {RESOURCES.map((r) => (
            <Route key={r.name} path={r.name} element={<GenericList resource={r.name} label={r.label} />} />
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
