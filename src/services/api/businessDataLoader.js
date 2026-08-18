import { apiRequest, unwrapList } from "./apiClient";
import { tenantSet } from "../../modules/auth/utils/tenantStorage";

const LISTS = [
  { path: "/products", key: "products", keys: ["products"] },
  { path: "/customers", key: "customers", keys: ["customers"] },
  { path: "/sales", key: "sales", keys: ["sales"] },
  { path: "/purchases", key: "purchases", keys: ["purchases"] },
  { path: "/suppliers", key: "suppliers", keys: ["suppliers"] },
  { path: "/agents", key: "agents", keys: ["agents"] },
  { path: "/inventory/stock", key: "warehouse_stock", keys: ["stock"] },
  { path: "/inventory/movements", key: "warehouse_movements", keys: ["movements"] },
  { path: "/warehouses", key: "warehouses", keys: ["warehouses"] },
  { path: "/finance/cashboxes", key: "finance_cashboxes", keys: ["cashboxes"] },
  { path: "/finance/transactions", key: "finance_transactions", keys: ["transactions"] },
  { path: "/employees", key: "hr_employees", keys: ["employees"] },
  { path: "/employees/payroll", key: "hr_payrolls", keys: ["payrolls"] },
  { path: "/manufacturing/boms", key: "manufacturing_boms", keys: ["boms"] },
  { path: "/manufacturing/orders", key: "production_orders", keys: ["orders", "productionOrders"] },
];

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

export const preloadBusinessData = async () => {
  await Promise.allSettled(LISTS.map(preloadList));
};
