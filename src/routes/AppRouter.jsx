import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import AppLayout from "../layouts/AppLayout/AppLayout";

import AuthGuard from "./guards/AuthGuard";
import ModuleGuard from "./guards/ModuleGuard";
import PermissionGuard from "./guards/PermissionGuard";

import DashboardPage from "../modules/dashboard/pages/DashboardPage/DashboardPage";
import ManufacturingPage from "../modules/manufacturing/pages/ManufacturingPage/ManufacturingPage";
import WarehousePage from "../modules/warehouse/pages/WarehousePage/WarehousePage";
import PurchasesPage from "../modules/purchases/pages/PurchasesPage/PurchasesPage";
import ProductsPage from "../modules/products/pages/ProductsPage/ProductsPage";
import CustomersPage from "../modules/customers/pages/CustomersPage/CustomersPage";
import CustomerDetailsPage from "../modules/customers/pages/CustomerDetailsPage/CustomerDetailsPage";
import AgentsPage from "../modules/agents/pages/AgentsPage/AgentsPage";
import AgentCreatePage from "../modules/agents/pages/AgentCreatePage/AgentCreatePage";
import AgentDetailsPage from "../modules/agents/pages/AgentDetailsPage/AgentDetailsPage";
import AgentEditPage from "../modules/agents/pages/AgentEditPage/AgentEditPage";
import SuppliersPage from "../modules/suppliers/pages/SuppliersPage/SuppliersPage";
import FinancePage from "../modules/finance/pages/FinancePage/FinancePage";
import CashFlowPage from "../modules/finance/pages/CashFlowPage/CashFlowPage";
import PaymentsPage from "../modules/finance/pages/PaymentsPage/PaymentsPage";
import ExpensesPage from "../modules/finance/pages/ExpensesPage/ExpensesPage";
import CustomerDebtsPage from "../modules/finance/pages/CustomerDebtsPage/CustomerDebtsPage";
import CashAccountsPage from "../modules/finance/pages/CashAccountsPage/CashAccountsPage";
import AgentCollectionsPage from "../modules/finance/pages/AgentCollectionsPage/AgentCollectionsPage";
import EmployeesPage from "../modules/employees/pages/EmployeesPage/EmployeesPage";
import ReportsPage from "../modules/reports/pages/ReportsPage/ReportsPage";
import GeneralSettingsPage from "../modules/settings/pages/GeneralSettingsPage/GeneralSettingsPage";
import SalesLayout from "../modules/sales/pages/SalesLayout/SalesLayout";
import SalesHistoryPage from "../modules/sales/pages/SalesHistoryPage/SalesHistoryPage";
import SaleDetailsPage from "../modules/sales/pages/SaleDetailsPage/SaleDetailsPage";
import POSTerminalPage from "../modules/sales/pos/pages/POSTerminalPage/POSTerminalPage";
import ProductDetailsPage from "../modules/products/pages/ProductDetailsPage/ProductDetailsPage";
import ProductCreatePage from "../modules/products/pages/ProductCreatePage/ProductCreatePage";
import ProductEditPage from "../modules/products/pages/ProductEditPage/ProductEditPage";
import WarehouseProductDetailsPage from "../modules/warehouse/pages/WarehouseProductDetailsPage/WarehouseProductDetailsPage";
import PurchaseCreatePage from "../modules/purchases/pages/PurchaseCreatePage/PurchaseCreatePage";
import PurchaseDetailsPage from "../modules/purchases/pages/PurchaseDetailsPage/PurchaseDetailsPage";
import PurchaseEditPage from "../modules/purchases/pages/PurchaseEditPage/PurchaseEditPage";
import SupplierCreatePage from "../modules/suppliers/pages/SupplierCreatePage/SupplierCreatePage";
import SupplierEditPage from "../modules/suppliers/pages/SupplierEditPage/SupplierEditPage";
import SupplierDetailsPage from "../modules/suppliers/pages/SupplierDetailsPage/SupplierDetailsPage";
import BomEditPage from "../modules/manufacturing/pages/BomEditPage/BomEditPage";
import BomCreatePage from "../modules/manufacturing/pages/BOMCreatePage/BOMCreatePage";
import BomDetailsPage from "../modules/manufacturing/pages/BOMDetailsPage/BOMDetailsPage";
import ProductionOrderCreatePage from "../modules/manufacturing/pages/ProductionOrderCreatePage/ProductionOrderCreatePage";
import ProductionOrderDetailsPage from "../modules/manufacturing/pages/ProductionOrderDetailsPage/ProductionOrderDetailsPage";

const AppRouter = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AuthGuard />}>
          <Route element={<AppLayout />}>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />

            <Route path="/dashboard" element={<DashboardPage />} />

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

            <Route element={<ModuleGuard module="warehouse" />}>
              <Route path="/warehouse" element={<WarehousePage />} />

              <Route
                path="/warehouse/:warehouseId/product/:productId"
                element={<WarehouseProductDetailsPage />}
              />
            </Route>

            <Route path="/purchases" element={<PurchasesPage />} />

            <Route path="/purchases/create" element={<PurchaseCreatePage />} />

            <Route
              path="/purchases/:purchaseId/edit"
              element={<PurchaseEditPage />}
            />

            <Route
              path="/purchases/:purchaseId"
              element={<PurchaseDetailsPage />}
            />

            <Route element={<ModuleGuard module="sales" />}>
              <Route path="/sales" element={<SalesLayout />}>
                <Route index element={<Navigate to="/sales/terminal" replace />} />
                <Route path="terminal" element={<POSTerminalPage />} />
                <Route path="history" element={<SalesHistoryPage />} />
                <Route path="history/:saleId" element={<SaleDetailsPage />} />
              </Route>
            </Route>

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

            <Route element={<ModuleGuard module="customers" />}>
              <Route path="/customers" element={<CustomersPage />} />
              <Route path="/customers/:customerId" element={<CustomerDetailsPage />} />
            </Route>

            <Route element={<ModuleGuard module="agents" />}>
              <Route path="/agents" element={<AgentsPage />} />

              <Route path="/agents/create" element={<AgentCreatePage />} />

              <Route path="/agents/:agentId/edit" element={<AgentEditPage />} />

              <Route path="/agents/:agentId" element={<AgentDetailsPage />} />
            </Route>

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

            <Route element={<PermissionGuard permission="finance.view" />}>
              <Route path="/finance" element={<FinancePage />} />
              <Route path="/finance/cashflow" element={<CashFlowPage />} />
              <Route path="/finance/payments" element={<PaymentsPage />} />
              <Route path="/finance/expenses" element={<ExpensesPage />} />
              <Route path="/finance/debts" element={<CustomerDebtsPage />} />
              <Route path="/finance/cashboxes" element={<CashAccountsPage />} />
              <Route path="/finance/agents" element={<AgentCollectionsPage />} />
            </Route>

            <Route element={<ModuleGuard module="employees" />}>
              <Route path="/employees" element={<EmployeesPage />} />
            </Route>

            <Route element={<ModuleGuard module="reports" />}>
              <Route path="/reports" element={<ReportsPage />} />
            </Route>

            <Route path="/settings" element={<GeneralSettingsPage />} />

            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
};

export default AppRouter;
