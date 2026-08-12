const STORAGE_KEY = "universal_erp_orders";

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
    const storedValue = window.localStorage.getItem(STORAGE_KEY);

    if (!storedValue) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify([]));

      return [];
    }

    const orders = JSON.parse(storedValue);

    if (!Array.isArray(orders)) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify([]));

      return [];
    }

    const normalizedOrders = orders.map(normalizeOrder);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(normalizedOrders));

    return normalizedOrders;
  } catch (error) {
    console.error("Orders storage read error:", error);

    return [];
  }
};

export const saveOrders = (orders) => {
  if (!canUseStorage() || !Array.isArray(orders)) {
    return false;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(orders.map(normalizeOrder)));

  return true;
};
