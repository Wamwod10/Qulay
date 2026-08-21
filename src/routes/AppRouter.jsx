import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Suspense } from "react";

import { useSelector } from "react-redux";

import AppLayout from "../layouts/AppLayout/AppLayout";
import GlobalLoader from "../components/GlobalLoader/GlobalLoader";

/* =========================
   GUARDS
========================= */

import AuthGuard from "./guards/AuthGuard";
import GuestGuard from "./guards/GuestGuard";
import ModuleGuard from "./guards/ModuleGuard";
import PermissionGuard from "./guards/PermissionGuard";
import SuperAdminGuard from "./guards/SuperAdminGuard";
import { lazyRoute } from "./helpers/lazyRoute";

/* =========================
   AUTH
========================= */

const LoginPage = lazyRoute(() => import("../modules/auth/pages/LoginPage/LoginPage"));
const RegisterPage = lazyRoute(() => import("../modules/auth/pages/RegisterPage/RegisterPage"));
const ForgotPasswordPage = lazyRoute(() => import("../modules/auth/pages/ForgotPasswordPage/ForgotPasswordPage"));
const ProfilePage = lazyRoute(() => import("../modules/auth/pages/ProfilePage/ProfilePage"));

import { tenantGet } from "../modules/auth/utils/tenantStorage";

/* =========================
   DASHBOARD
========================= */

const DashboardPage = lazyRoute(() => import("../modules/dashboard/pages/DashboardPage/DashboardPage"));

/* =========================
   SALES
========================= */

const SalesLayout = lazyRoute(() => import("../modules/sales/pages/SalesLayout/SalesLayout"));
const SalesHistoryPage = lazyRoute(() => import("../modules/sales/pages/SalesHistoryPage/SalesHistoryPage"));
const SaleDetailsPage = lazyRoute(() => import("../modules/sales/pages/SaleDetailsPage/SaleDetailsPage"));
const POSTerminalPage = lazyRoute(() => import("../modules/sales/pos/pages/POSTerminalPage/POSTerminalPage"));

/* =========================
   PRODUCTS
========================= */

const ProductsPage = lazyRoute(() => import("../modules/products/pages/ProductsPage/ProductsPage"));
const ProductDetailsPage = lazyRoute(() => import("../modules/products/pages/ProductDetailsPage/ProductDetailsPage"));
const ProductCreatePage = lazyRoute(() => import("../modules/products/pages/ProductCreatePage/ProductCreatePage"));
const ProductEditPage = lazyRoute(() => import("../modules/products/pages/ProductEditPage/ProductEditPage"));

/* =========================
   WAREHOUSE
========================= */

const WarehousePage = lazyRoute(() => import("../modules/warehouse/pages/WarehousePage/WarehousePage"));
const WarehouseProductDetailsPage = lazyRoute(() => import("../modules/warehouse/pages/WarehouseProductDetailsPage/WarehouseProductDetailsPage"));

/* =========================
   PURCHASES
========================= */

const PurchasesPage = lazyRoute(() => import("../modules/purchases/pages/PurchasesPage/PurchasesPage"));
const PurchaseCreatePage = lazyRoute(() => import("../modules/purchases/pages/PurchaseCreatePage/PurchaseCreatePage"));
const PurchaseDetailsPage = lazyRoute(() => import("../modules/purchases/pages/PurchaseDetailsPage/PurchaseDetailsPage"));
const PurchaseEditPage = lazyRoute(() => import("../modules/purchases/pages/PurchaseEditPage/PurchaseEditPage"));

/* =========================
   CUSTOMERS
========================= */

const CustomersPage = lazyRoute(() => import("../modules/customers/pages/CustomersPage/CustomersPage"));
const CustomerCreatePage = lazyRoute(() => import("../modules/customers/pages/CustomerCreatePage/CustomerCreatePage"));
const CustomerDetailsPage = lazyRoute(() => import("../modules/customers/pages/CustomerDetailsPage/CustomerDetailsPage"));
const CustomerEditPage = lazyRoute(() => import("../modules/customers/pages/CustomerEditPage/CustomerEditPage"));

/* =========================
   AGENTS
========================= */

const AgentsPage = lazyRoute(() => import("../modules/agents/pages/AgentsPage/AgentsPage"));
const AgentCreatePage = lazyRoute(() => import("../modules/agents/pages/AgentCreatePage/AgentCreatePage"));
const AgentDetailsPage = lazyRoute(() => import("../modules/agents/pages/AgentDetailsPage/AgentDetailsPage"));
const AgentEditPage = lazyRoute(() => import("../modules/agents/pages/AgentEditPage/AgentEditPage"));

/* =========================
   SUPPLIERS
========================= */

const SuppliersPage = lazyRoute(() => import("../modules/suppliers/pages/SuppliersPage/SuppliersPage"));
const SupplierCreatePage = lazyRoute(() => import("../modules/suppliers/pages/SupplierCreatePage/SupplierCreatePage"));
const SupplierEditPage = lazyRoute(() => import("../modules/suppliers/pages/SupplierEditPage/SupplierEditPage"));
const SupplierDetailsPage = lazyRoute(() => import("../modules/suppliers/pages/SupplierDetailsPage/SupplierDetailsPage"));

/* =========================
   MANUFACTURING
========================= */

const ManufacturingPage = lazyRoute(() => import("../modules/manufacturing/pages/ManufacturingPage/ManufacturingPage"));

const BomEditPage = lazyRoute(() => import("../modules/manufacturing/pages/BomEditPage/BomEditPage"));
const BomCreatePage = lazyRoute(() => import("../modules/manufacturing/pages/BOMCreatePage/BOMCreatePage"));
const BomDetailsPage = lazyRoute(() => import("../modules/manufacturing/pages/BOMDetailsPage/BOMDetailsPage"));

const ProductionOrderCreatePage = lazyRoute(() => import("../modules/manufacturing/pages/ProductionOrderCreatePage/ProductionOrderCreatePage"));
const ProductionOrderDetailsPage = lazyRoute(() => import("../modules/manufacturing/pages/ProductionOrderDetailsPage/ProductionOrderDetailsPage"));

/* =========================
   FINANCE
========================= */

const FinancePage = lazyRoute(() => import("../modules/finance/pages/FinancePage/FinancePage"));
const CashFlowPage = lazyRoute(() => import("../modules/finance/pages/CashFlowPage/CashFlowPage"));
const PaymentsPage = lazyRoute(() => import("../modules/finance/pages/PaymentsPage/PaymentsPage"));
const ExpensesPage = lazyRoute(() => import("../modules/finance/pages/ExpensesPage/ExpensesPage"));
const CustomerDebtsPage = lazyRoute(() => import("../modules/finance/pages/CustomerDebtsPage/CustomerDebtsPage"));
const CashAccountsPage = lazyRoute(() => import("../modules/finance/pages/CashAccountsPage/CashAccountsPage"));
const AgentCollectionsPage = lazyRoute(() => import("../modules/finance/pages/AgentCollectionsPage/AgentCollectionsPage"));

/* =========================
   HR
========================= */

const EmployeesPage = lazyRoute(() => import("../modules/employees/pages/EmployeesPage/EmployeesPage"));
const EmployeeCreatePage = lazyRoute(() => import("../modules/employees/pages/EmployeeCreatePage/EmployeeCreatePage"));
const EmployeeDetailsPage = lazyRoute(() => import("../modules/employees/pages/EmployeeDetailsPage/EmployeeDetailsPage"));
const EmployeeEditPage = lazyRoute(() => import("../modules/employees/pages/EmployeeEditPage/EmployeeEditPage"));

const AttendancePage = lazyRoute(() => import("../modules/employees/pages/AttendancePage/AttendancePage"));
const ShiftsPage = lazyRoute(() => import("../modules/employees/pages/ShiftsPage/ShiftsPage"));
const PayrollPage = lazyRoute(() => import("../modules/employees/pages/PayrollPage/PayrollPage"));
const LeavePage = lazyRoute(() => import("../modules/employees/pages/LeavePage/LeavePage"));

/* =========================
   REPORTS / SETTINGS
========================= */

const ReportsPage = lazyRoute(() => import("../modules/reports/pages/ReportsPage/ReportsPage"));
const GeneralSettingsPage = lazyRoute(() => import("../modules/settings/pages/GeneralSettingsPage/GeneralSettingsPage"));

/* =========================
   SUPER ADMIN
========================= */

import SuperAdminLayout from "../modules/super-admin/components/SuperAdminLayout/SuperAdminLayout";

const SuperAdminDashboard = lazyRoute(() => import("../modules/super-admin/pages/SuperAdminDashboard/SuperAdminDashboard"));

const UsersPage = lazyRoute(() => import("../modules/super-admin/pages/UsersPage/UsersPage"));

const CompaniesPage = lazyRoute(() => import("../modules/super-admin/pages/CompaniesPage/CompaniesPage"));

const CompanyDetailsPage = lazyRoute(() => import("../modules/super-admin/pages/CompanyDetailsPage/CompanyDetailsPage"));

const ModulesPage = lazyRoute(() => import("../modules/super-admin/pages/ModulesPage/ModulesPage"));

const UserDetailsPage = lazyRoute(() => import("../modules/super-admin/pages/UserDetailsPage/UserDetailsPage"));
const AuditLogsPage = lazyRoute(() => import("../modules/super-admin/pages/AuditLogsPage/AuditLogsPage"));

/* =========================
   MODULE PATHS
========================= */

const modulePathMap = {
  dashboard: "/dashboard",
  sales: "/sales/terminal",
  manufacturing: "/manufacturing",
  warehouse: "/warehouse",
  purchases: "/purchases",
  products: "/products",
  customers: "/customers",
  agents: "/agents",
  suppliers: "/suppliers",
  finance: "/finance",
  employees: "/hr",
  reports: "/reports",
  settings: "/settings",
};

/* =========================
   DEFAULT REDIRECT
========================= */

const DefaultRedirect = () => {
  const defaultModule = useSelector(
    (state) => state.settings.modules?.defaultModule || "dashboard",
  );

  const rememberLastOpenedModule = useSelector(
    (state) => state.settings.behavior?.rememberLastOpenedModule,
  );

  const lastModule = rememberLastOpenedModule
    ? tenantGet("last_module", "")
    : "";

  return (
    <Navigate
      to={
        modulePathMap[lastModule] ||
        modulePathMap[defaultModule] ||
        "/dashboard"
      }
      replace
    />
  );
};

/* =========================
   SALES DEFAULT
========================= */

const SalesDefaultRedirect = () => {
  const salesTab = useSelector(
    (state) => state.settings.defaults?.salesTab || "POS",
  );

  return (
    <Navigate
      to={salesTab === "History" ? "/sales/history" : "/sales/terminal"}
      replace
    />
  );
};

/* =========================
   ROUTER
========================= */

const AppRouter = () => {
  return (
    <BrowserRouter>
      <Suspense fallback={<GlobalLoader />}>
        <Routes>
        {/* =====================
            GUEST
        ===================== */}

        <Route element={<GuestGuard />}>
          <Route path="/login" element={<LoginPage />} />

          <Route path="/register" element={<RegisterPage />} />

          <Route path="/forgot-password" element={<ForgotPasswordPage />} />

          <Route
            path="/welcome"
            element={<Navigate to="/register" replace />}
          />
        </Route>

        {/* =====================
            AUTHENTICATED
        ===================== */}

        <Route element={<AuthGuard />}>
          {/* =====================
              SUPER ADMIN
          ===================== */}

          <Route element={<SuperAdminGuard />}>
            <Route path="/superadmin" element={<SuperAdminLayout />}>
              <Route index element={<SuperAdminDashboard />} />

              <Route path="dashboard" element={<SuperAdminDashboard />} />

              <Route path="users" element={<UsersPage />} />

              <Route path="companies" element={<CompaniesPage />} />

              <Route
                path="companies/:companyId"
                element={<CompanyDetailsPage />}
              />

              <Route path="users/:userId" element={<UserDetailsPage />} />

              <Route path="modules" element={<ModulesPage />} />

              <Route path="audit-logs" element={<AuditLogsPage />} />
            </Route>
          </Route>

          {/* =====================
              NORMAL ERP
          ===================== */}

          <Route element={<AppLayout />}>
            <Route path="/" element={<DefaultRedirect />} />

            {/* Dashboard */}

            <Route path="/dashboard" element={<DashboardPage />} />

            {/* Profile */}

            <Route path="/profile" element={<ProfilePage />} />

            <Route path="/profile/settings" element={<ProfilePage />} />

            {/* =====================
                MANUFACTURING
            ===================== */}

            <Route element={<ModuleGuard module="manufacturing" />}>
              <Route path="/manufacturing" element={<ManufacturingPage />} />

              <Route
                path="/manufacturing/boms/create"
                element={<BomCreatePage />}
              />

              <Route
                path="/manufacturing/boms/:bomId/edit"
                element={<BomEditPage />}
              />

              <Route
                path="/manufacturing/boms/:bomId"
                element={<BomDetailsPage />}
              />

              <Route
                path="/manufacturing/orders/create"
                element={<ProductionOrderCreatePage />}
              />

              <Route
                path="/manufacturing/orders/:orderId"
                element={<ProductionOrderDetailsPage />}
              />
            </Route>

            {/* =====================
                WAREHOUSE
            ===================== */}

            <Route element={<ModuleGuard module="warehouse" />}>
              <Route path="/warehouse" element={<WarehousePage />} />

              <Route
                path="/warehouse/:warehouseId/product/:productId"
                element={<WarehouseProductDetailsPage />}
              />
            </Route>

            {/* =====================
                PURCHASES
            ===================== */}

            <Route element={<ModuleGuard module="purchases" />}>
              <Route path="/purchases" element={<PurchasesPage />} />

              <Route
                path="/purchases/create"
                element={<PurchaseCreatePage />}
              />

              <Route
                path="/purchases/:purchaseId/edit"
                element={<PurchaseEditPage />}
              />

              <Route
                path="/purchases/:purchaseId"
                element={<PurchaseDetailsPage />}
              />
            </Route>

            {/* =====================
                SALES
            ===================== */}

            <Route element={<ModuleGuard module="sales" />}>
              <Route path="/sales" element={<SalesLayout />}>
                <Route index element={<SalesDefaultRedirect />} />

                <Route path="terminal" element={<POSTerminalPage />} />

                <Route path="history" element={<SalesHistoryPage />} />

                <Route path="history/:saleId" element={<SaleDetailsPage />} />
              </Route>
            </Route>

            {/* =====================
                PRODUCTS
            ===================== */}

            <Route element={<ModuleGuard module="products" />}>
              <Route path="/products" element={<ProductsPage />} />

              <Route path="/products/create" element={<ProductCreatePage />} />

              <Route
                path="/products/:productId"
                element={<ProductDetailsPage />}
              />

              <Route
                path="/products/:productId/edit"
                element={<ProductEditPage />}
              />
            </Route>

            {/* =====================
                CUSTOMERS
            ===================== */}

            <Route element={<ModuleGuard module="customers" />}>
              <Route path="/customers" element={<CustomersPage />} />

              <Route
                path="/customers/create"
                element={<CustomerCreatePage />}
              />

              <Route
                path="/customers/:customerId/edit"
                element={<CustomerEditPage />}
              />

              <Route
                path="/customers/:customerId"
                element={<CustomerDetailsPage />}
              />
            </Route>

            {/* =====================
                AGENTS
            ===================== */}

            <Route element={<ModuleGuard module="agents" />}>
              <Route path="/agents" element={<AgentsPage />} />

              <Route path="/agents/create" element={<AgentCreatePage />} />

              <Route path="/agents/:agentId/edit" element={<AgentEditPage />} />

              <Route path="/agents/:agentId" element={<AgentDetailsPage />} />
            </Route>

            {/* =====================
                SUPPLIERS
            ===================== */}

            <Route element={<ModuleGuard module="suppliers" />}>
              <Route path="/suppliers" element={<SuppliersPage />} />

              <Route
                path="/suppliers/create"
                element={<SupplierCreatePage />}
              />

              <Route
                path="/suppliers/:supplierId/edit"
                element={<SupplierEditPage />}
              />

              <Route
                path="/suppliers/:supplierId"
                element={<SupplierDetailsPage />}
              />
            </Route>

            {/* =====================
                FINANCE
            ===================== */}

            <Route element={<ModuleGuard module="finance" />}>
              <Route element={<PermissionGuard permission="finance.view" />}>
                <Route path="/finance" element={<FinancePage />} />

                <Route path="/finance/cashflow" element={<CashFlowPage />} />

                <Route path="/finance/payments" element={<PaymentsPage />} />

                <Route path="/finance/expenses" element={<ExpensesPage />} />

                <Route path="/finance/debts" element={<CustomerDebtsPage />} />

                <Route
                  path="/finance/cashboxes"
                  element={<CashAccountsPage />}
                />

                <Route
                  path="/finance/agents"
                  element={<AgentCollectionsPage />}
                />
              </Route>
            </Route>

            {/* =====================
                HR
            ===================== */}

            <Route element={<ModuleGuard module="employees" />}>
              <Route
                path="/employees"
                element={<Navigate to="/hr/employees" replace />}
              />

              <Route path="/hr" element={<EmployeesPage view="overview" />} />

              <Route path="/hr/employees" element={<EmployeesPage />} />

              <Route
                path="/hr/employees/create"
                element={<EmployeeCreatePage />}
              />

              <Route
                path="/hr/employees/:employeeId/edit"
                element={<EmployeeEditPage />}
              />

              <Route
                path="/hr/employees/:employeeId"
                element={<EmployeeDetailsPage />}
              />

              <Route path="/hr/attendance" element={<AttendancePage />} />

              <Route path="/hr/shifts" element={<ShiftsPage />} />

              <Route path="/hr/payroll" element={<PayrollPage />} />

              <Route path="/hr/leave" element={<LeavePage />} />
            </Route>

            {/* =====================
                REPORTS
            ===================== */}

            <Route element={<ModuleGuard module="reports" />}>
              <Route path="/reports" element={<ReportsPage />} />
            </Route>

            {/* =====================
                SETTINGS
            ===================== */}

            <Route element={<PermissionGuard permission="settings.view" />}>
              <Route path="/settings" element={<GeneralSettingsPage />} />

              <Route
                path="/settings/*"
                element={<Navigate to="/settings" replace />}
              />
            </Route>

            {/* NORMAL ERP FALLBACK */}

            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Route>
        </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
};

export default AppRouter;
