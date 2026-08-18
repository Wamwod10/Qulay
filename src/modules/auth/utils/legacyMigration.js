import { tenantSetForAccount } from "./tenantStorage";

const LEGACY_WORKSPACE_KEYS = {
  universal_erp_products: "products",
  universal_erp_product_history: "product_history",
  universal_erp_customers: "customers",
  universal_erp_customer_followups: "customer_followups",
  universal_erp_sales: "sales",
  universal_erp_orders: "orders",
  universal_erp_payments: "payments",
  universal_erp_warehouse_stock: "warehouse_stock",
  universal_erp_warehouse_movements: "warehouse_movements",
  universal_erp_warehouses: "warehouses",
  universal_erp_purchases: "purchases",
  universal_erp_purchase_draft: "purchase_draft",
  universal_erp_suppliers: "suppliers",
  universal_erp_agents: "agents",
  universal_erp_finance_transactions: "finance_transactions",
  universal_erp_finance_cashboxes: "finance_cashboxes",
  universal_erp_hr_employees: "hr_employees",
  universal_erp_hr_attendance: "hr_attendance",
  universal_erp_hr_shifts: "hr_shifts",
  universal_erp_hr_advances: "hr_advances",
  universal_erp_hr_bonuses: "hr_bonuses",
  universal_erp_hr_penalties: "hr_penalties",
  universal_erp_hr_leaves: "hr_leaves",
  universal_erp_hr_payrolls: "hr_payrolls",
  universal_erp_hr_payroll_payments: "hr_payroll_payments",
  universal_erp_manufacturing_boms: "manufacturing_boms",
  universal_erp_production_orders: "production_orders",
  universal_erp_platform_settings: "settings",
};

export const findLegacyWorkspaceKeys = () => {
  if (typeof window === "undefined") {
    return [];
  }

  return Object.keys(LEGACY_WORKSPACE_KEYS).filter(
    (key) => window.localStorage.getItem(key) !== null,
  );
};

export const attachLegacyWorkspaceToAccount = (accountId) => {
  if (typeof window === "undefined" || !accountId) {
    return [];
  }

  const migrated = [];

  Object.entries(LEGACY_WORKSPACE_KEYS).forEach(([legacyKey, tenantKey]) => {
    const value = window.localStorage.getItem(legacyKey);

    if (value === null) {
      return;
    }

    try {
      tenantSetForAccount(accountId, tenantKey, JSON.parse(value));
      migrated.push(legacyKey);
    } catch {
      // Keep legacy data untouched if it cannot be parsed safely.
    }
  });

  return migrated;
};
