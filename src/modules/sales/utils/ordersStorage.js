import { tenantGet, tenantSet } from "../../auth/utils/tenantStorage";

const STORAGE_KEY = "orders";

const canUseStorage = () => typeof window !== "undefined" && window.localStorage;

export const normalizeOrder = (order = {}) => {
  const total = Number(order.total ?? order.totalAmount ?? 0);
  const safeTotal = Number.isFinite(total) ? total : 0;

  return {
    ...order,
    id: String(order.id || `ord-${Date.now()}-${Math.random().toString(16).slice(2)}`),
    orderNumber: order.orderNumber || order.number || order.id || "",
    customerId: order.customerId || null,
    agentId: order.agentId || null,
    total: safeTotal,
    totalAmount: safeTotal,
    status: order.status || "DRAFT",
    createdAt: order.createdAt || order.orderDate || null,
    orderDate: order.orderDate || order.createdAt || null,
  };
};

export const getStoredOrders = () => {
  if (!canUseStorage()) {
    return [];
  }

  try {
    const orders = tenantGet(STORAGE_KEY, null);

    if (!orders) {
      tenantSet(STORAGE_KEY, []);
      return [];
    }

    if (!Array.isArray(orders)) {
      tenantSet(STORAGE_KEY, []);

      return [];
    }

    const normalizedOrders = orders.map(normalizeOrder);
    tenantSet(STORAGE_KEY, normalizedOrders);

    return normalizedOrders;
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error("Orders storage read error:", error);
    }

    return [];
  }
};

export const saveOrders = (orders) => {
  if (!canUseStorage() || !Array.isArray(orders)) {
    return false;
  }

  tenantSet(STORAGE_KEY, orders.map(normalizeOrder));

  return true;
};
