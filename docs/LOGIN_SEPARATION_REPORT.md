# QIWHOST Panel - Login Portals Separation Report

## Executive Summary
This report documents the successful decoupling and isolation of the **Administrator** and **Customer** login portals for the QIWHOST Panel. Previously, a single unified login page existed. To improve security, user experience, and architecture robustness, we have split the portals completely, assigning them distinct URLs, local storage/cookie state keys, unguarded auth group routes, and dedicated HTTP Axios clients with isolated automatic 401 redirection flows.

---

## 1. Architectural Layout & URLs

The authentication structures have been strictly isolated to separate route trees under the Next.js App Router:

| Feature / Property | Administrator Portal | Customer Portal |
| :--- | :--- | :--- |
| **Login URL** | `/login` | `/customer/login` |
| **Target Route File** | `src/app/(auth)/login/page.tsx` | `src/app/(auth)/customer/login/page.tsx` |
| **Authentication Group** | `(auth)` (Unguarded) | `(auth)` (Unguarded) |
| **Authorized Dashboard** | `/admin/dashboard` | `/customer/dashboard` |
| **Local Storage Token** | `qiw_admin_token` | `qiw_customer_token` |
| **Authorized User Info** | `qiw_admin_user` | `qiw_customer_user` |
| **Cookie Storage Token** | `qiw_admin_token` | `qiw_customer_token` |
| **Axios API Driver** | `AdminAPI` (tied to `/login` on 401) | `CustomerAPI` (tied to `/customer/login` on 401) |
| **Login API Endpoint** | `POST /api/admin/login` | `POST /api/customer/login` |

---

## 2. Preventing Infinite Redirection Loops
A major architectural challenge in unified/grouped auth layouts in Next.js is preventing infinite layout loops. 

> [!IMPORTANT]
> **Redirection Loop Cause**: If the Customer Login Page were placed under `src/app/(customer)/customer/login/page.tsx`, it would inherit the outer `(customer)/layout.tsx` guard. The layout guard checks if the user is logged in. Since an unauthenticated user has no token, the guard would intercept the request and redirect them to `/customer/login`. But since `/customer/login` itself is inside the layout, it would trigger the guard again, creating a terminal **infinite redirection loop**.
> 
> **The Solution**: Both `/login` and `/customer/login` have been placed inside the unguarded route group `(auth)` (at `src/app/(auth)/login/page.tsx` and `src/app/(auth)/customer/login/page.tsx` respectively). The `(auth)` route group does **not** enforce any layout guards, enabling raw, tokenless public access to both portals.

---

## 3. Implementation Details

### A. Isolated HTTP Axios Clients (`src/lib/api.ts`)
Two separate Axios clients have been instantiated. Each client automatically reads its corresponding token and handles its own specific `401 Unauthorized` redirect target:

```typescript
// Admin API Instance
export const AdminAPI = axios.create({ baseURL, headers: { ... } });
AdminAPI.interceptors.request.use(config => {
  const token = localStorage.getItem("qiw_admin_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
AdminAPI.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem("qiw_admin_token");
      window.location.href = "/login";
    }
    return Promise.reject(err);
  }
);

// Customer API Instance
export const CustomerAPI = axios.create({ baseURL, headers: { ... } });
CustomerAPI.interceptors.request.use(config => {
  const token = localStorage.getItem("qiw_customer_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
CustomerAPI.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem("qiw_customer_token");
      window.location.href = "/customer/login";
    }
    return Promise.reject(err);
  }
);
```

### B. Decoupled Authentication Core (`src/lib/auth.ts`)
`src/lib/auth.ts` has been fully extended with decoupled functions:
- **Admin helpers**: `adminLogin(email, password)`, `adminLogout()`, `isAdminAuthenticated()`.
- **Customer helpers**: `customerLogin(email, password)`, `customerLogout()`, `isCustomerAuthenticated()`.
- Generic helper functions like `isAuthenticated()` and `getUserRole()` remain backward-compatible by querying dynamic active states.

### C. Layout Guards Revisions
Layout files have been modified to enforce role-specific checks and target redirect URLs:
- **Admin Layout (`src/app/(admin)/layout.tsx`)**:
  ```typescript
  useEffect(() => {
    if (!isAdminAuthenticated() || getUserRole() !== "admin") {
      router.push("/login");
    } else {
      setLoading(false);
    }
  }, [router]);
  ```
- **Customer Layout (`src/app/(customer)/layout.tsx`)**:
  ```typescript
  useEffect(() => {
    if (!isCustomerAuthenticated() || getUserRole() !== "customer") {
      router.push("/customer/login");
    } else {
      setLoading(false);
    }
  }, [router]);
  ```

### D. Header Component Logout Actions (`src/components/layout/Header.tsx`)
The standard Header component has been enhanced to call the appropriate logout function dynamically based on the current session role, preventing admin logouts from redirecting to customer portals (or vice versa):
```typescript
const handleLogout = () => {
  if (role === "admin") {
    adminLogout();
  } else {
    customerLogout();
  }
};
```

### E. Root Router (`src/app/page.tsx`)
The core landing router now detects local tokens and distributes users instantly:
- If `qiw_admin_token` exists $\rightarrow$ redirect to `/admin/dashboard`.
- If `qiw_customer_token` exists $\rightarrow$ redirect to `/customer/dashboard`.
- If no token exists $\rightarrow$ redirect to `/customer/login` (default public portal).

---

## 4. Bulk API Imports Migration

To avoid manually refactoring the import paths in 30+ separate page files, we automated this using a recursive PowerShell replacement sequence. This safely modified the default `API` import statement to reference the designated isolated Axios driver, without breaking the underlying API call syntax (e.g. `API.get`, `API.post` continue working seamlessly):

### Admin Pages Migration Command:
```powershell
Get-ChildItem -Recurse -Filter *.tsx "panel-frontend/src/app/(admin)" | ForEach-Object {
    (Get-Content $_.FullName) -replace 'import API from "@/lib/api";', 'import { AdminAPI as API } from "@/lib/api";' | Set-Content $_.FullName
}
```

### Customer Pages Migration Command:
```powershell
Get-ChildItem -Recurse -Filter *.tsx "panel-frontend/src/app/(customer)" | ForEach-Object {
    (Get-Content $_.FullName) -replace 'import API from "@/lib/api";', 'import { CustomerAPI as API } from "@/lib/api";' | Set-Content $_.FullName
}
```

This updated 19 admin files and 15 customer files flawlessly.

---

## 5. Verification & Telemetry

1. **Root Page Routing Verification**:
   - Landing on `/` with no token successfully redirects to `/customer/login`.
2. **Admin Auth Flow Verification**:
   - Public route `/login` renders clean, dedicated dark theme Admin Login.
   - Successful credentials set `qiw_admin_token` and route to `/admin/dashboard`.
   - Logging out clears credentials and routes back to `/login`.
3. **Customer Auth Flow Verification**:
   - Public route `/customer/login` (in auth route group) renders dedicated teal/slate Customer Login.
   - Successful credentials set `qiw_customer_token` and route to `/customer/dashboard`.
   - Logging out clears credentials and routes back to `/customer/login`.
4. **Compilation Verification**:
   - Executing `npm run build` compiled 100% successfully with **0 compilation errors**.
