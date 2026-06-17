# OneGate — React + Refine UI Başlangıç Kiti

> Karar: **React + Refine** (admin/B2B framework, OpenAPI/REST/RBAC uyumlu).
> Backend hazır: REST · JWT · RBAC · CORS · `/docs` (OpenAPI). Bu doküman frontend'i **dakikalar içinde** OneGate API'sine bağlar.

## 0. Proje HAZIR — `E:\onegate\web\`
> CLI (`npm create refine-app`) interaktif akışta takılıyordu; proje **elle kuruldu ve build doğrulandı** (Refine v5 · React 19 · antd 6 · Vite 8). Aşağıdaki provider'lar `web/src/providers/` içinde mevcut.

**Çalıştırma (2 terminal):**
```bash
# Terminal 1 — API (port 3000)
cd E:\onegate && npm run dev            # kontrat: http://localhost:3000/docs

# Terminal 2 — UI (port 5173)
cd E:\onegate\web && npm install && npm run dev
```
→ Tarayıcı: **http://localhost:5173** → giriş `admin / admin123` → Ürünler listesi.
Test users: `admin/admin123` (super-admin) · `operator/operator123` (OPERATOR) · `viewer/viewer123` (VIEWER).

> Aşağıdaki kod blokları `web/`'de zaten kurulu — yeni kaynak/ekran eklerken referans.

---

## 1. Data Provider — `src/providers/dataProvider.ts`
OneGate'in hem `{data,total}` (sayfalı) hem düz dizi dönen listelerini normalize eder; JWT + tenant header'ı ekler.
```ts
import type { DataProvider } from "@refinedev/core";
import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";
export const axiosInstance = axios.create({ baseURL: API_URL });

// Her isteğe JWT + firma (tenant) header'ı
axiosInstance.interceptors.request.use((config) => {
  const token = localStorage.getItem("og_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  const companyId = localStorage.getItem("og_company");
  if (companyId) config.headers["x-company-id"] = companyId;
  return config;
});

// Liste yanıtı: dizi VEYA {data,total} → tek şekle indir
const normalize = (d: any) =>
  Array.isArray(d) ? { data: d, total: d.length } : { data: d.data ?? [], total: d.total ?? (d.data?.length ?? 0) };

export const dataProvider: DataProvider = {
  getApiUrl: () => API_URL,
  getList: async ({ resource, pagination, filters }) => {
    const params: Record<string, any> = {};
    if (pagination) { params.page = pagination.current; params.pageSize = pagination.pageSize; }
    const search = filters?.find((f: any) => f.field === "search");
    if (search) params.search = (search as any).value;
    const { data } = await axiosInstance.get(`/api/${resource}`, { params });
    return normalize(data);
  },
  getOne:    async ({ resource, id }) => ({ data: (await axiosInstance.get(`/api/${resource}/${id}`)).data }),
  create:    async ({ resource, variables }) => ({ data: (await axiosInstance.post(`/api/${resource}`, variables)).data }),
  update:    async ({ resource, id, variables }) => ({ data: (await axiosInstance.patch(`/api/${resource}/${id}`, variables)).data }),
  deleteOne: async ({ resource, id }) => ({ data: (await axiosInstance.delete(`/api/${resource}/${id}`)).data }),
  custom:    async ({ url, method, payload, query }) => ({ data: (await axiosInstance.request({ url, method: method as any, data: payload, params: query })).data }),
};
```

---

## 2. Auth Provider — `src/providers/authProvider.ts`
```ts
import type { AuthProvider } from "@refinedev/core";
import { axiosInstance } from "./dataProvider";

export const authProvider: AuthProvider = {
  login: async ({ username, password }) => {
    try {
      const { data } = await axiosInstance.post("/api/auth/login", { username, password });
      localStorage.setItem("og_token", data.token);
      localStorage.setItem("og_user", JSON.stringify(data.user));
      if (data.user.companyId) localStorage.setItem("og_company", String(data.user.companyId));
      return { success: true, redirectTo: "/" };
    } catch {
      return { success: false, error: { name: "Giriş hatası", message: "Kullanıcı adı veya şifre hatalı" } };
    }
  },
  logout:   async () => { localStorage.clear(); return { success: true, redirectTo: "/login" }; },
  check:    async () => localStorage.getItem("og_token") ? { authenticated: true } : { authenticated: false, redirectTo: "/login" },
  getIdentity:    async () => JSON.parse(localStorage.getItem("og_user") ?? "null"),
  getPermissions: async () => JSON.parse(localStorage.getItem("og_user") ?? "{}")?.roles ?? [],
  onError:  async (error) => (error?.response?.status === 401 ? { logout: true, redirectTo: "/login" } : {}),
};
```

---

## 3. Access Control (RBAC) — `src/providers/accessControlProvider.ts`
Backend RBAC ile birebir: yazma = ADMIN/OPERATOR, okuma = herkes, super-admin = her şey.
```ts
import type { AccessControlProvider } from "@refinedev/core";
const WRITE = ["create", "edit", "delete", "clone"];

export const accessControlProvider: AccessControlProvider = {
  can: async ({ action }) => {
    const user = JSON.parse(localStorage.getItem("og_user") ?? "{}");
    if (user?.isSuperAdmin) return { can: true };
    const roles: string[] = user?.roles ?? [];
    if (WRITE.includes(action)) return { can: roles.includes("ADMIN") || roles.includes("OPERATOR"), reason: "Yazma yetkisi yok" };
    return { can: true };
  },
};
```

---

## 4. Refine'a bağla — `src/App.tsx`
```tsx
import { Refine } from "@refinedev/core";
import { dataProvider } from "./providers/dataProvider";
import { authProvider } from "./providers/authProvider";
import { accessControlProvider } from "./providers/accessControlProvider";

<Refine
  dataProvider={dataProvider}
  authProvider={authProvider}
  accessControlProvider={accessControlProvider}
  resources={[
    // WMS master
    { name: "warehouses",      meta: { label: "Depolar" } },
    { name: "locations",       meta: { label: "Lokasyonlar" } },
    { name: "products",        meta: { label: "Ürünler", canDelete: false } },
    { name: "product-groups",  meta: { label: "Ürün Grupları" } },
    { name: "units",           meta: { label: "Birimler" } },
    { name: "partners",        meta: { label: "Cari (Müşteri/Tedarikçi)" } },
    // Stok & belge
    { name: "stock",           meta: { label: "Stok" } },
    { name: "documents",       meta: { label: "Belgeler (Mal Kabul/Sevk/Transfer)" } },
    { name: "operation-types", meta: { label: "Operasyon Tipleri" } },
    { name: "sequences",       meta: { label: "Numara Sayaçları" } },
    // Operasyon
    { name: "purchase-orders", meta: { label: "Satınalma Siparişleri" } },
    { name: "sales-orders",    meta: { label: "Satış Siparişleri" } },
    { name: "inventory/rules", meta: { label: "Min/Max Kuralları" } },
    { name: "stock-counts",    meta: { label: "Sayımlar" } },
    { name: "quality-inspections", meta: { label: "Kalite Muayene" } },
    // Lojistik & finans
    { name: "vehicles",        meta: { label: "Araçlar" } },
    { name: "shipments",       meta: { label: "Sevkiyatlar" } },
    { name: "invoices",        meta: { label: "Faturalar" } },
    // Yönetim
    { name: "users",           meta: { label: "Kullanıcılar (ADMIN)" } },
  ]}
/>
```

---

## 5. İpuçları
- **Otomatik CRUD:** Refine **Inferencer** ile `products` gibi kaynaklara hazır liste/form üretebilirsin (`@refinedev/inferencer`). 40 tabloyu hızlandırır.
- **Özel aksiyonlar** (state geçişleri) — `dataProvider.custom` ile:
  ```ts
  // belge onayla
  custom({ url: `/api/documents/${id}/confirm`, method: "post" })
  // satış sevk (allocate sonrası)
  custom({ url: `/api/sales-orders/${id}/ship-allocated`, method: "post" })
  // sayaçtan numara
  custom({ url: `/api/sequences/GR/next`, method: "post" })
  ```
- **Raporlar:** `custom({ url: "/api/reports/stock-summary", method: "get" })` → kendi dashboard widget'ların.
- **Marka:** `GET /api/branding` → renkler (#44D4E3/#4E86FF/#9B5CF6) + logo yolları; favicon `/favicon.svg`.
- **Sayfalama:** büyük listeler (products/stock/orders) `{data,total}` döner — Refine pagination otomatik çalışır. Küçük master'lar dizi döner — data provider total'ı dizinin boyu yapar.
- **Test kullanıcıları:** `admin/admin123` (super-admin) · `operator/operator123` (OPERATOR) · `viewer/viewer123` (VIEWER, salt-okunur).

## 6. Backend tarafında (opsiyonel iyileştirme)
Tüm listeleri tek şekle (`{data,total}`) çevirmek istersek backend'de standardizasyon yapılabilir — ama data provider iki şekli de tanıdığı için **şart değil**; UI hemen başlayabilir.
