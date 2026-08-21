import { tenantGet, tenantSet } from "../../auth/utils/tenantStorage";
import {
  apiRequest,
  getCachedApiResponse,
  invalidateApiCache,
  unwrapList,
} from "../../../services/api/apiClient";

const STORAGE_KEY = "purchases";

export const getStoredPurchases = () => {
  const remotePurchases = unwrapList(getCachedApiResponse("/purchases"), ["purchases"]);

  if (Array.isArray(remotePurchases)) {
    tenantSet(STORAGE_KEY, remotePurchases);
    return remotePurchases;
  }

  try {
    const stored = tenantGet(STORAGE_KEY, null);

    if (!stored) {
      tenantSet(STORAGE_KEY, []);
      return [];
    }

    return stored;
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error("Purchases storage read error:", error);
    }

    return [];
  }
};

export const fetchStoredPurchases = async (query = {}) => {
  const params = new URLSearchParams();

  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      params.set(key, String(value));
    }
  });

  const result = await apiRequest(`/purchases${params.toString() ? `?${params.toString()}` : ""}`, {
    skipCache: true,
  });
  const purchases = unwrapList(result, ["purchases"]);

  if (!Array.isArray(purchases)) {
    throw new Error("Xaridlar backenddan olinmadi.");
  }

  tenantSet(STORAGE_KEY, purchases);
  return purchases;
};

export const savePurchases = (purchases) => {
  try {
    tenantSet(STORAGE_KEY, purchases);
    window.dispatchEvent(new Event("purchases:changed"));
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error("Purchases storage save error:", error);
    }
  }
};

export const getPurchaseById = (purchaseId) =>
  getStoredPurchases().find((purchase) => purchase.id === purchaseId);

export const fetchPurchaseById = async (purchaseId) => {
  const purchase = await apiRequest(`/purchases/${purchaseId}`);

  if (!purchase?.id) {
    throw new Error("Xarid topilmadi.");
  }

  const purchases = getStoredPurchases();
  savePurchases([purchase, ...purchases.filter((item) => item.id !== purchase.id)]);
  return purchase;
};

export const createPurchase = async (purchase) => {
  const remotePurchase = await apiRequest("/purchases", {
    method: "POST",
    body: purchase,
  });

  if (!remotePurchase?.id) {
    throw new Error("Xarid backendda saqlanmadi.");
  }

  const purchases = getStoredPurchases();
  savePurchases([remotePurchase, ...purchases.filter((item) => item.id !== remotePurchase.id)]);
  invalidateApiCache();
  return remotePurchase;
};

export const updatePurchase = async (updatedPurchase) => {
  const remotePurchase = await apiRequest(`/purchases/${updatedPurchase.id}`, {
    method: "PATCH",
    body: updatedPurchase,
  });

  if (!remotePurchase?.id) {
    throw new Error("Xarid backendda yangilanmadi.");
  }

  const purchases = getStoredPurchases();
  savePurchases(purchases.map((purchase) => (purchase.id === remotePurchase.id ? remotePurchase : purchase)));
  invalidateApiCache();
  return remotePurchase;
};

export const markPurchaseReceived = async (purchaseId) => {
  const idempotencyKey = `purchase-receive:${purchaseId}`;
  const remotePurchase = await apiRequest(`/purchases/${purchaseId}/receive`, {
    method: "POST",
    idempotencyKey,
    body: { idempotencyKey },
  });

  if (!remotePurchase?.id) {
    throw new Error("Xarid qabul qilish backendda saqlanmadi.");
  }

  const purchases = getStoredPurchases();
  savePurchases(purchases.map((purchase) => (purchase.id === remotePurchase.id ? remotePurchase : purchase)));
  invalidateApiCache();
  return remotePurchase;
};

export const cancelPurchase = async (purchaseId) => {
  const remotePurchase = await apiRequest(`/purchases/${purchaseId}/cancel`, {
    method: "POST",
    body: {},
  });

  if (!remotePurchase?.id) {
    throw new Error("Xaridni bekor qilish backendda saqlanmadi.");
  }

  const purchases = getStoredPurchases();
  savePurchases(purchases.map((purchase) => (purchase.id === remotePurchase.id ? remotePurchase : purchase)));
  invalidateApiCache();
  return remotePurchase;
};

export const updatePurchasePayment = async ({
  purchaseId,
  amount,
  method,
  note,
  cashboxId,
  idempotencyKey,
}) => {
  const paymentAmount = Number(amount || 0);
  const key = idempotencyKey || `purchase-payment:${purchaseId}:${paymentAmount}:${method || "CASH"}:${Date.now()}`;
  const remotePurchase = await apiRequest(`/purchases/${purchaseId}/payment`, {
    method: "POST",
    idempotencyKey: key,
    body: {
      amount: paymentAmount,
      method,
      note,
      cashboxId,
      idempotencyKey: key,
    },
  });

  if (!remotePurchase?.id) {
    throw new Error("To'lov backendda saqlanmadi.");
  }

  const purchases = getStoredPurchases();
  savePurchases(purchases.map((purchase) => (purchase.id === remotePurchase.id ? remotePurchase : purchase)));
  invalidateApiCache();
  return remotePurchase;
};

export const duplicatePurchase = () => {
  throw new Error("Xaridni nusxalash uchun backend endpoint hali mavjud emas.");
};
