import { tenantGet, tenantSet } from "../../auth/utils/tenantStorage";
import { apiRequest, getCachedApiResponse, unwrapList } from "../../../services/api/apiClient";

const TRANSACTIONS_KEY = "finance_transactions";
const CASHBOXES_KEY = "finance_cashboxes";

export const PAYMENT_METHODS = ["CASH", "CARD", "BANK", "QR"];

export const EXPENSE_CATEGORIES = [
  "Ijara",
  "Oylik",
  "Transport",
  "Kommunal",
  "Marketing / reklama",
  "Ta'mirlash",
  "Soliq",
  "Boshqa",
];

export const DEFAULT_CASHBOXES = [
  {
    id: "cashbox-main",
    name: "Asosiy kassa",
    type: "CASH",
    currency: "UZS",
    openingBalance: 0,
    active: true,
  },
  {
    id: "cashbox-bank-card",
    name: "Bank/karta hisob",
    type: "BANK",
    currency: "UZS",
    openingBalance: 0,
    active: true,
  },
];

const canUseStorage = () => typeof window !== "undefined" && window.localStorage;

export const createFinanceId = (prefix = "fin") =>
  `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;

export const toMoney = (value) => {
  const number = Number(value);

  return Number.isFinite(number) ? Math.max(number, 0) : 0;
};

export const roundMoney = (value) => Math.round(toMoney(value) * 100) / 100;

export const normalizePaymentMethod = (method) => {
  const value = String(method || "").toUpperCase();

  return PAYMENT_METHODS.includes(value) ? value : "CASH";
};

export const normalizeDate = (value) => {
  if (!value) {
    return new Date().toISOString();
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? String(value) : date.toISOString();
};

export const getDefaultCashboxId = (paymentMethod = "CASH") => {
  if (["CARD", "BANK", "QR"].includes(paymentMethod)) {
    return "cashbox-bank-card";
  }

  return "cashbox-main";
};

const readJson = (key, fallback) => {
  if (!canUseStorage()) {
    return fallback;
  }

  try {
    const stored = tenantGet(key, null);

    if (!stored) {
      tenantSet(key, fallback);
      return fallback;
    }

    return stored;
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error(`Finance storage read error (${key}):`, error);
    }

    return fallback;
  }
};

const writeJson = (key, value, { silent = false } = {}) => {
  if (!canUseStorage()) {
    return false;
  }

  tenantSet(key, value);
  if (!silent) {
    window.dispatchEvent(new Event("finance:changed"));
  }

  return true;
};

export const normalizeCashbox = (cashbox = {}) => ({
  id: String(cashbox.id || createFinanceId("cashbox")),
  name: String(cashbox.name || "Kassa").trim(),
  type: cashbox.type || "CASH",
  currency: cashbox.currency || "UZS",
  openingBalance: roundMoney(cashbox.openingBalance),
  active: cashbox.active !== false,
});

export const getStoredCashboxes = () => {
  const remoteCashboxes = unwrapList(getCachedApiResponse("/finance/cashboxes"), ["cashboxes"]);
  if (Array.isArray(remoteCashboxes)) {
    writeJson(CASHBOXES_KEY, remoteCashboxes, { silent: true });
    return remoteCashboxes.map(normalizeCashbox);
  }
  const stored = readJson(CASHBOXES_KEY, DEFAULT_CASHBOXES);
  const cashboxes = Array.isArray(stored) ? stored : DEFAULT_CASHBOXES;
  const normalized = cashboxes.map(normalizeCashbox);

  if (!normalized.some((cashbox) => cashbox.id === "cashbox-main")) {
    normalized.unshift(DEFAULT_CASHBOXES[0]);
  }

  writeJson(CASHBOXES_KEY, normalized, { silent: true });

  return normalized;
};

export const saveCashboxes = (cashboxes) => {
  if (!Array.isArray(cashboxes)) {
    return false;
  }

  return writeJson(CASHBOXES_KEY, cashboxes.map(normalizeCashbox));
};

export const normalizeFinanceTransaction = (transaction = {}) => {
  const method = normalizePaymentMethod(
    transaction.paymentMethod || transaction.method || "CASH",
  );
  const type = transaction.type === "OUT" ? "OUT" : "IN";

  return {
    ...transaction,
    id: String(transaction.id || createFinanceId("txn")),
    type,
    category: String(transaction.category || transaction.sourceType || "OTHER"),
    sourceType: transaction.sourceType || "OTHER",
    sourceId: transaction.sourceId || null,
    customerId: transaction.customerId || null,
    supplierId: transaction.supplierId || null,
    agentId: transaction.agentId || null,
    saleId: transaction.saleId || null,
    purchaseId: transaction.purchaseId || null,
    amount: roundMoney(transaction.amount),
    paymentMethod: method,
    cashboxId:
      transaction.cashboxId === null
        ? null
        : transaction.cashboxId || getDefaultCashboxId(method),
    date: normalizeDate(transaction.date || transaction.createdAt),
    note: transaction.note || "",
    status: transaction.status || "POSTED",
    createdAt: normalizeDate(transaction.createdAt),
    internal: Boolean(transaction.internal),
    reversed: Boolean(transaction.reversed),
  };
};

export const getStoredFinanceTransactions = () => {
  const remoteTransactions = unwrapList(getCachedApiResponse("/finance/transactions"), ["transactions"]);
  if (Array.isArray(remoteTransactions)) {
    writeJson(TRANSACTIONS_KEY, remoteTransactions, { silent: true });
    return remoteTransactions.map(normalizeFinanceTransaction);
  }
  const stored = readJson(TRANSACTIONS_KEY, []);
  const transactions = Array.isArray(stored) ? stored : [];
  const normalized = transactions.map(normalizeFinanceTransaction);

  writeJson(TRANSACTIONS_KEY, normalized, { silent: true });

  return normalized;
};

export const saveFinanceTransactions = (transactions) => {
  if (!Array.isArray(transactions)) {
    return false;
  }

  return writeJson(TRANSACTIONS_KEY, transactions.map(normalizeFinanceTransaction));
};

export const addFinanceTransaction = async (transaction) => {
  const remoteTransaction = await apiRequest("/finance/transactions", {
    method: "POST",
    body: transaction,
  });
  if (remoteTransaction?.id) {
    const transactions = getStoredFinanceTransactions();
    saveFinanceTransactions([remoteTransaction, ...transactions.filter((item) => item.id !== remoteTransaction.id)]);
    return normalizeFinanceTransaction(remoteTransaction);
  }
  const normalized = normalizeFinanceTransaction(transaction);

  if (normalized.amount <= 0) {
    throw new Error("Summa 0 dan katta bo'lishi kerak.");
  }

  const transactions = getStoredFinanceTransactions();
  saveFinanceTransactions([normalized, ...transactions]);

  return normalized;
};

export const reverseFinanceTransaction = (transactionId, note = "") => {
  const transactions = getStoredFinanceTransactions();
  const target = transactions.find((transaction) => transaction.id === transactionId);

  if (!target) {
    throw new Error("Moliya operatsiyasi topilmadi.");
  }

  if (target.sourceType === "SALE_PAYMENT" || target.sourceType === "PURCHASE_PAYMENT") {
    throw new Error("Manba operatsiyasi savdo yoki xarid modulidan boshqariladi.");
  }

  if (target.reversed) {
    throw new Error("Transaction allaqachon reverse qilingan.");
  }

  const now = new Date().toISOString();
  const reversal = normalizeFinanceTransaction({
    ...target,
    id: createFinanceId("rev"),
    type: target.type === "IN" ? "OUT" : "IN",
    sourceType: "REVERSAL",
    sourceId: target.id,
    date: now,
    createdAt: now,
    note: note || `Qaytarish: ${target.note || target.category}`,
  });

  const next = transactions.map((transaction) =>
    transaction.id === target.id
      ? { ...transaction, reversed: true, reversedAt: now }
      : transaction,
  );

  saveFinanceTransactions([reversal, ...next]);

  return reversal;
};
