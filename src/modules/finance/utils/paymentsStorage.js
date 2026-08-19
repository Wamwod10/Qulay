import { tenantGet, tenantSet } from "../../auth/utils/tenantStorage";

const STORAGE_KEY = "payments";

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
    const payments = tenantGet(STORAGE_KEY, null);

    if (!payments) {
      tenantSet(STORAGE_KEY, []);
      return [];
    }

    if (!Array.isArray(payments)) {
      tenantSet(STORAGE_KEY, []);

      return [];
    }

    const normalizedPayments = payments.map(normalizePayment);
    tenantSet(STORAGE_KEY, normalizedPayments);

    return normalizedPayments;
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error("Payments storage read error:", error);
    }

    return [];
  }
};

export const savePayments = (payments) => {
  if (!canUseStorage() || !Array.isArray(payments)) {
    return false;
  }

  tenantSet(STORAGE_KEY, payments.map(normalizePayment));

  return true;
};
