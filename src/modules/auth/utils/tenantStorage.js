import { getStoredSession } from "./authStorage";

const TENANT_PREFIX = "erp";
const memoryStore = new Map();

const CORE_BUSINESS_KEYS = new Set([
  "products",
  "customers",
  "customer_followups",
  "sales",
  "orders",
  "payments",
  "purchases",
  "suppliers",
  "agents",
  "warehouse_stock",
  "warehouse_movements",
  "warehouses",
  "finance_transactions",
  "finance_cashboxes",
  "hr_employees",
  "hr_attendance",
  "hr_advances",
  "hr_bonuses",
  "hr_penalties",
  "hr_leaves",
  "hr_payrolls",
  "hr_payroll_payments",
  "hr_shifts",
  "manufacturing_boms",
  "production_orders",
]);

export const isLocalBusinessFallbackEnabled = () =>
  import.meta.env.DEV && import.meta.env.VITE_ENABLE_LOCAL_BUSINESS_FALLBACK === "true";

export const isCoreBusinessKey = (key) => CORE_BUSINESS_KEYS.has(String(key));

const canPersistKey = (key) =>
  !isCoreBusinessKey(key) || isLocalBusinessFallbackEnabled();

export const getCurrentAccountId = () => getStoredSession()?.accountId || null;

export const getTenantKey = (key) => {
  const accountId = getCurrentAccountId();

  if (!accountId) {
    return null;
  }

  return `${TENANT_PREFIX}:${accountId}:${key}`;
};

export const getTenantKeyForAccount = (accountId, key) =>
  accountId ? `${TENANT_PREFIX}:${accountId}:${key}` : null;

export const tenantGet = (key, fallback = null) => {
  const storageKey = getTenantKey(key);

  if (!storageKey) {
    return fallback;
  }

  if (memoryStore.has(storageKey)) {
    return memoryStore.get(storageKey);
  }

  if (!canPersistKey(key) || typeof window === "undefined") {
    return fallback;
  }

  try {
    const stored = window.localStorage.getItem(storageKey);
    return stored ? JSON.parse(stored) : fallback;
  } catch {
    return fallback;
  }
};

export const tenantSet = (key, value) => {
  const storageKey = getTenantKey(key);

  if (!storageKey) {
    return false;
  }

  memoryStore.set(storageKey, value);

  if (!canPersistKey(key) || typeof window === "undefined") {
    return true;
  }

  window.localStorage.setItem(storageKey, JSON.stringify(value));
  return true;
};

export const tenantRemove = (key) => {
  const storageKey = getTenantKey(key);

  if (!storageKey) {
    return false;
  }

  memoryStore.delete(storageKey);

  if (typeof window === "undefined") {
    return true;
  }

  window.localStorage.removeItem(storageKey);
  return true;
};

export const tenantGetForAccount = (accountId, key, fallback = null) => {
  const storageKey = getTenantKeyForAccount(accountId, key);

  if (!storageKey) {
    return fallback;
  }

  if (memoryStore.has(storageKey)) {
    return memoryStore.get(storageKey);
  }

  if (!canPersistKey(key) || typeof window === "undefined") {
    return fallback;
  }

  try {
    const stored = window.localStorage.getItem(storageKey);
    return stored ? JSON.parse(stored) : fallback;
  } catch {
    return fallback;
  }
};

export const tenantSetForAccount = (accountId, key, value) => {
  const storageKey = getTenantKeyForAccount(accountId, key);

  if (!storageKey) {
    return false;
  }

  memoryStore.set(storageKey, value);

  if (!canPersistKey(key) || typeof window === "undefined") {
    return true;
  }

  window.localStorage.setItem(storageKey, JSON.stringify(value));
  return true;
};
