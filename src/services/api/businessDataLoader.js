import { apiRequest, unwrapList } from "./apiClient";
import { tenantSet } from "../../modules/auth/utils/tenantStorage";

const LISTS = [
  { path: "/products", key: "products", keys: ["products"], module: "products", permission: "products.view", eager: true },
  { path: "/categories", key: "categories", keys: ["categories"], module: "products", permission: "products.view", eager: true },
  { path: "/customers", key: "customers", keys: ["customers"], module: "customers", permission: "customers.view" },
  { path: "/sales", key: "sales", keys: ["sales"], module: "sales", permission: "sales.view" },
  { path: "/purchases", key: "purchases", keys: ["purchases"], module: "purchases", permission: "purchases.view" },
  { path: "/suppliers", key: "suppliers", keys: ["suppliers"], module: "suppliers", permission: "suppliers.view" },
  { path: "/agents", key: "agents", keys: ["agents"], module: "agents", permission: "agents.view" },
  { path: "/inventory/stock", key: "warehouse_stock", keys: ["stock"], module: "warehouse", permission: "warehouse.view", eager: true },
  { path: "/inventory/movements", key: "warehouse_movements", keys: ["movements"], module: "warehouse", permission: "warehouse.view" },
  { path: "/inventory/batches", key: "warehouse_batches", keys: ["batches"], module: "warehouse", permission: "warehouse.view" },
  { path: "/inventory/counts", key: "inventory_counts", keys: ["counts"], module: "warehouse", permission: "warehouse.view" },
  { path: "/warehouses", key: "warehouses", keys: ["warehouses"], module: "warehouse", permission: "warehouse.view", eager: true },
  { path: "/finance/cashboxes", key: "finance_cashboxes", keys: ["cashboxes"], module: "finance", permission: "finance.view" },
  { path: "/finance/transactions", key: "finance_transactions", keys: ["transactions"], module: "finance", permission: "finance.view" },
  { path: "/employees", key: "hr_employees", keys: ["employees"], module: "employees", permission: "employees.view" },
  { path: "/employees/payroll", key: "hr_payrolls", keys: ["payrolls"], module: "employees", permission: "employees.view" },
  { path: "/manufacturing/boms", key: "manufacturing_boms", keys: ["boms"], module: "manufacturing", permission: "manufacturing.view", eager: true },
  { path: "/manufacturing/orders", key: "production_orders", keys: ["orders", "productionOrders"], module: "manufacturing", permission: "manufacturing.view", eager: true },
];

const FULL_ACCESS_ROLES = new Set(["OWNER", "ADMIN"]);

const canPreload = (item, context) => {
  const modules = Array.isArray(context.modules) ? context.modules : [];
  const permissions = Array.isArray(context.permissions) ? context.permissions : [];
  const role = context.role || "";

  if (item.module && !modules.includes(item.module)) {
    return false;
  }

  if (FULL_ACCESS_ROLES.has(role) || permissions.includes("*")) {
    return true;
  }

  return !item.permission || permissions.includes(item.permission);
};

const preloadList = async ({ path, key, keys }) => {
  try {
    const result = await apiRequest(path);
    const list = unwrapList(result, keys);

    if (Array.isArray(list)) {
      tenantSet(key, list);
    }

    return list;
  } catch {
    return null;
  }
};

export const preloadBusinessData = async (context = {}) => {
  const preloadContext = {
    modules: context.modules || context.user?.modules || [],
    permissions: context.permissions || context.user?.permissions || [],
    role: context.role || context.user?.role || "",
  };

  await Promise.allSettled(LISTS.filter((item) => item.eager && canPreload(item, preloadContext)).map(preloadList));
};
