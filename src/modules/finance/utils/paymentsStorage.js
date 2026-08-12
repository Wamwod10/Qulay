const STORAGE_KEY = "universal_erp_payments";

const canUseStorage = () => typeof window !== "undefined" && window.localStorage;

export const normalizePayment = (payment = {}) => {
  const amount = Number(payment.amount || 0);
  const safeAmount = Number.isFinite(amount) ? amount : 0;

  return {
    ...payment,
    id: String(payment.id || `pay-${Date.now()}-${Math.random().toString(16).slice(2)}`),
    agentId: payment.agentId || null,
    customerId: payment.customerId || null,
    orderId: payment.orderId || null,
    amount: safeAmount,
    paymentMethod: payment.paymentMethod || payment.method || "",
    method: payment.method || payment.paymentMethod || "",
    createdAt: payment.createdAt || payment.paymentDate || null,
  };
};

export const getStoredPayments = () => {
  if (!canUseStorage()) {
    return [];
  }

  try {
    const storedValue = window.localStorage.getItem(STORAGE_KEY);

    if (!storedValue) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify([]));

      return [];
    }

    const payments = JSON.parse(storedValue);

    if (!Array.isArray(payments)) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify([]));

      return [];
    }

    const normalizedPayments = payments.map(normalizePayment);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(normalizedPayments));

    return normalizedPayments;
  } catch (error) {
    console.error("Payments storage read error:", error);

    return [];
  }
};

export const savePayments = (payments) => {
  if (!canUseStorage() || !Array.isArray(payments)) {
    return false;
  }

  window.localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(payments.map(normalizePayment)),
  );

  return true;
};
