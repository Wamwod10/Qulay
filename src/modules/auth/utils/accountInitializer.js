import { DEFAULT_SETTINGS } from "../../settings/constants/settingsDefaults";
import { DEFAULT_CASHBOXES } from "../../finance/utils/financeStorage";
import { DEFAULT_SHIFT_ID } from "../../employees/utils/hrStorage";
import { tenantSetForAccount } from "./tenantStorage";

const DEFAULT_WAREHOUSE = {
  id: "warehouse-main",
  name: "Asosiy ombor",
  branch: "Asosiy filial",
  address: "",
  responsible: "",
  note: "",
  status: "ACTIVE",
  createdAt: new Date().toISOString(),
};

const DEFAULT_SHIFTS = [
  {
    id: DEFAULT_SHIFT_ID,
    name: "Kunduzgi smena",
    startTime: "09:00",
    endTime: "18:00",
    breakMinutes: 60,
    active: true,
  },
];

const EMPTY_WORKSPACE_KEYS = [
  "products",
  "product_history",
  "customers",
  "customer_followups",
  "sales",
  "orders",
  "payments",
  "warehouse_stock",
  "warehouse_movements",
  "purchases",
  "purchase_draft",
  "suppliers",
  "agents",
  "finance_transactions",
  "hr_employees",
  "hr_attendance",
  "hr_advances",
  "hr_bonuses",
  "hr_penalties",
  "hr_leaves",
  "hr_payrolls",
  "hr_payroll_payments",
  "manufacturing_boms",
  "production_orders",
];

export const initializeAccountWorkspace = (accountId, account = {}) => {
  EMPTY_WORKSPACE_KEYS.forEach((key) => {
    tenantSetForAccount(accountId, key, key === "product_history" ? {} : []);
  });

  tenantSetForAccount(accountId, "warehouses", [DEFAULT_WAREHOUSE]);
  tenantSetForAccount(accountId, "finance_cashboxes", DEFAULT_CASHBOXES);
  tenantSetForAccount(accountId, "hr_shifts", DEFAULT_SHIFTS);
  tenantSetForAccount(accountId, "settings", {
    ...DEFAULT_SETTINGS,
    formats: {
      ...DEFAULT_SETTINGS.formats,
      currency: account.currency || DEFAULT_SETTINGS.formats.currency,
    },
    defaults: {
      ...DEFAULT_SETTINGS.defaults,
      warehouseId: DEFAULT_WAREHOUSE.id,
      currency: account.currency || DEFAULT_SETTINGS.defaults.currency,
    },
    pos: {
      ...DEFAULT_SETTINGS.pos,
      defaultWarehouseId: DEFAULT_WAREHOUSE.id,
      receiptHeader: account.businessName || DEFAULT_SETTINGS.pos.receiptHeader,
    },
    warehouse: {
      ...DEFAULT_SETTINGS.warehouse,
      defaultWarehouseId: DEFAULT_WAREHOUSE.id,
    },
  });
};
