import { getStoredAgents } from "../../agents/utils/agentsStorage";
import { getStoredCustomers } from "../../customers/utils/customersStorage";
import { getStoredPurchases } from "../../purchases/utils/purchasesStorage";
import { getStoredSales } from "../../sales/utils/salesStorage";
import { getStoredSuppliers } from "../../suppliers/utils/suppliersStorage";
import { getStoredEmployees } from "../../employees/utils/hrStorage";

import {
  getDefaultCashboxId,
  getStoredCashboxes,
  getStoredFinanceTransactions,
  normalizeDate,
  normalizePaymentMethod,
  roundMoney,
  toMoney,
} from "./financeStorage";
import {
  formatDateWithSettings,
  formatMoneyWithSettings,
  formatTimeWithSettings,
} from "../../settings/utils/formatSettingsHelpers";
import { loadPlatformSettings } from "../../settings/utils/settingsStorage";

const getFormats = () => {
  try {
    return loadPlatformSettings().formats || {};
  } catch {
    return {};
  }
};

export const formatFinanceMoney = (value) =>
  formatMoneyWithSettings(toMoney(value), getFormats()).replace(/\s(so'm|UZS|USD)$/, "");

export const formatFinanceDate = (value) => {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return `${formatDateWithSettings(date, getFormats())} ${formatTimeWithSettings(date, getFormats())}`;
};

export const getPaymentMethodLabel = (method) => {
  switch (method) {
    case "CASH":
      return "Naqd";
    case "CARD":
      return "Karta";
    case "BANK":
      return "Bank";
    case "QR":
      return "QR";
    default:
      return method || "-";
  }
};

const isCancelled = (status) => String(status || "").toUpperCase() === "CANCELLED";

const sortByDateDesc = (items) =>
  [...items].sort((a, b) => {
    const first = new Date(a.date || a.createdAt || 0).getTime();
    const second = new Date(b.date || b.createdAt || 0).getTime();

    return (Number.isFinite(second) ? second : 0) - (Number.isFinite(first) ? first : 0);
  });

const uniqById = (items) => {
  const map = new Map();

  items.forEach((item) => {
    if (!map.has(item.id)) {
      map.set(item.id, item);
    }
  });

  return [...map.values()];
};

const getNameMaps = () => ({
  customers: new Map(getStoredCustomers().map((customer) => [customer.id, customer])),
  suppliers: new Map(getStoredSuppliers().map((supplier) => [supplier.id, supplier])),
  agents: new Map(getStoredAgents().map((agent) => [agent.id, agent])),
  employees: new Map(getStoredEmployees().map((employee) => [employee.id, employee])),
  cashboxes: new Map(getStoredCashboxes().map((cashbox) => [cashbox.id, cashbox])),
});

const normalizeDerivedTransaction = (transaction) => {
  const method = normalizePaymentMethod(transaction.paymentMethod);

  return {
    id: transaction.id,
    type: transaction.type,
    category: transaction.category,
    sourceType: transaction.sourceType,
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
    date: normalizeDate(transaction.date),
    note: transaction.note || "",
    status: transaction.status || "POSTED",
    createdAt: normalizeDate(transaction.createdAt || transaction.date),
    derived: true,
    internal: Boolean(transaction.internal),
    reversed: false,
  };
};

export const getSalePaymentTransactions = () =>
  getStoredSales().flatMap((sale) => {
    const returns = Array.isArray(sale.returns) ? sale.returns : [];
    const refundTransactions = returns
      .filter((item) => toMoney(item.refundAmount) > 0)
      .map((item) =>
        normalizeDerivedTransaction({
          id: `fin-sale-refund-${sale.id}-${item.id}`,
          type: "OUT",
          category: "Qaytarim",
          sourceType: "REFUND",
          sourceId: item.id,
          customerId: sale.customerId,
          agentId: sale.agentId,
          saleId: sale.id,
          amount: item.refundAmount,
          paymentMethod: sale.paymentMethod || "CASH",
          date: item.createdAt || sale.completedAt || sale.createdAt,
          note: item.reason || `Refund ${sale.number || sale.id}`,
          createdAt: item.createdAt || sale.updatedAt || sale.createdAt,
        }),
      );

    if (isCancelled(sale.status)) {
      return refundTransactions;
    }

    const payments = Array.isArray(sale.payments) ? sale.payments : [];
    const realPayments = payments.filter(
      (payment) =>
        toMoney(payment.amount) > 0 &&
        payment.method !== "DEBT" &&
        payment.paymentMethod !== "DEBT",
    );

    const salePaymentTransactions = realPayments.length
      ? realPayments.map((payment) =>
          normalizeDerivedTransaction({
            id: `fin-sale-pay-${sale.id}-${payment.id}`,
            type: "IN",
            category: "Savdo",
            sourceType: "SALE_PAYMENT",
            sourceId: payment.id,
            customerId: sale.customerId,
            agentId: sale.agentId,
            saleId: sale.id,
            amount: payment.amount,
            paymentMethod: payment.paymentMethod || payment.method,
            cashboxId: sale.agentId ? null : undefined,
            date: payment.date || sale.completedAt || sale.createdAt,
            note: sale.number || "",
            createdAt: sale.completedAt || sale.createdAt,
          }),
        )
      : toMoney(sale.paidAmount) > 0
        ? [
            normalizeDerivedTransaction({
              id: `fin-sale-paid-${sale.id}`,
              type: "IN",
              category: "Savdo",
              sourceType: "SALE_PAYMENT",
              sourceId: sale.id,
              customerId: sale.customerId,
              agentId: sale.agentId,
              saleId: sale.id,
              amount: sale.paidAmount,
              paymentMethod: sale.paymentMethod || "CASH",
              cashboxId: sale.agentId ? null : undefined,
              date: sale.completedAt || sale.createdAt,
              note: sale.number || "",
              createdAt: sale.completedAt || sale.createdAt,
            }),
          ]
        : [];

    return [...salePaymentTransactions, ...refundTransactions];
  });

export const getPurchasePaymentTransactions = () =>
  getStoredPurchases()
    .filter((purchase) => !isCancelled(purchase.status))
    .filter((purchase) => toMoney(purchase.paidAmount) > 0)
    .map((purchase) =>
      normalizeDerivedTransaction({
        id: `fin-purchase-paid-${purchase.id}`,
        type: "OUT",
        category: "Yetkazib beruvchi to'lovi",
        sourceType: "PURCHASE_PAYMENT",
        sourceId: purchase.id,
        supplierId: purchase.supplierId,
        purchaseId: purchase.id,
        amount: purchase.paidAmount,
        paymentMethod: purchase.paymentMethod || "BANK",
        date: purchase.paymentUpdatedAt || purchase.receivedAt || purchase.orderDate || purchase.createdAt,
        note: purchase.number || "",
        createdAt: purchase.createdAt || purchase.orderDate,
      }),
    );

export const getFinanceTransactions = (filters = {}) => {
  const manualTransactions = getStoredFinanceTransactions().filter(
    (transaction) => !transaction.reversed,
  );
  const transactions = uniqById([
    ...manualTransactions,
    ...getSalePaymentTransactions(),
    ...getPurchasePaymentTransactions(),
  ]);
  const maps = getNameMaps();

  return sortByDateDesc(transactions)
    .map((transaction) => {
      const sale = transaction.saleId
        ? getStoredSales().find((item) => item.id === transaction.saleId)
        : null;
      const purchase = transaction.purchaseId
        ? getStoredPurchases().find((item) => item.id === transaction.purchaseId)
        : null;
      const customer = transaction.customerId ? maps.customers.get(transaction.customerId) : null;
      const supplier = transaction.supplierId ? maps.suppliers.get(transaction.supplierId) : null;
      const agent = transaction.agentId ? maps.agents.get(transaction.agentId) : null;
      const employee = transaction.employeeId ? maps.employees.get(transaction.employeeId) : null;
      const cashbox = transaction.cashboxId ? maps.cashboxes.get(transaction.cashboxId) : null;

      return {
        ...transaction,
        source:
          sale?.number ||
          purchase?.number ||
          transaction.sourceId ||
          transaction.sourceType ||
          "-",
        counterparty:
          customer?.name ||
          supplier?.name ||
          agent?.name ||
          employee?.fullName ||
          transaction.counterparty ||
          "-",
        customerName: customer?.name || "",
        supplierName: supplier?.name || "",
        agentName: agent?.name || "",
        employeeName: employee?.fullName || "",
        cashboxName: cashbox?.name || "-",
      };
    })
    .filter((transaction) => filterTransaction(transaction, filters));
};

export const filterTransaction = (transaction, filters = {}) => {
  const date = new Date(transaction.date);
  const query = String(filters.search || "").trim().toLowerCase();

  if (filters.type && transaction.type !== filters.type) {
    return false;
  }

  if (filters.category && transaction.category !== filters.category) {
    return false;
  }

  if (filters.paymentMethod && transaction.paymentMethod !== filters.paymentMethod) {
    return false;
  }

  if (filters.customerId && transaction.customerId !== filters.customerId) {
    return false;
  }

  if (filters.supplierId && transaction.supplierId !== filters.supplierId) {
    return false;
  }

  if (filters.agentId && transaction.agentId !== filters.agentId) {
    return false;
  }

  if (filters.cashboxId && transaction.cashboxId !== filters.cashboxId) {
    return false;
  }

  if (filters.from) {
    const from = new Date(`${filters.from}T00:00:00`);

    if (!Number.isNaN(from.getTime()) && date < from) {
      return false;
    }
  }

  if (filters.to) {
    const to = new Date(`${filters.to}T23:59:59`);

    if (!Number.isNaN(to.getTime()) && date > to) {
      return false;
    }
  }

  if (!query) {
    return true;
  }

  return [
    transaction.source,
    transaction.counterparty,
    transaction.note,
    transaction.category,
    transaction.customerName,
    transaction.supplierName,
    transaction.agentName,
    transaction.employeeName,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
    .includes(query);
};

export const getCustomerDebt = (customerId) => {
  const customer = getStoredCustomers().find((item) => item.id === customerId);
  const sales = getStoredSales().filter(
    (sale) => sale.customerId === customerId && !isCancelled(sale.status),
  );
  const financePayments = getStoredFinanceTransactions().filter(
    (transaction) =>
      !transaction.reversed &&
      transaction.customerId === customerId &&
      ["CUSTOMER_PAYMENT", "AGENT_COLLECTION"].includes(transaction.sourceType),
  );

  const salesTotal = roundMoney(
    sales.reduce((total, sale) => total + toMoney(sale.netTotal ?? sale.total), 0),
  );
  const salePaid = roundMoney(
    sales.reduce((total, sale) => {
      const netTotal = toMoney(sale.netTotal ?? sale.total);

      return total + Math.min(toMoney(sale.paidAmount), netTotal);
    }, 0),
  );
  const laterPaid = roundMoney(
    financePayments.reduce((total, transaction) => total + toMoney(transaction.amount), 0),
  );
  const paid = roundMoney(Math.min(salesTotal, salePaid + laterPaid));
  const debt = roundMoney(Math.max(salesTotal - paid, 0));
  const lastPayment = sortByDateDesc([
    ...getSalePaymentTransactions().filter((transaction) => transaction.customerId === customerId),
    ...financePayments,
  ])[0];

  return {
    customerId,
    customer,
    customerName: customer?.name || sales[0]?.customerName || customerId || "-",
    sales,
    salesTotal,
    paid,
    debt,
    lastPayment,
    overdue: debt > 0 && sales.some((sale) => isOverdueDate(sale.completedAt || sale.orderDate || sale.createdAt)),
  };
};

export const getCustomerDebts = () => {
  const ids = new Set();

  getStoredCustomers().forEach((customer) => ids.add(customer.id));
  getStoredSales().forEach((sale) => {
    if (sale.customerId && !isCancelled(sale.status)) {
      ids.add(sale.customerId);
    }
  });

  return [...ids]
    .map(getCustomerDebt)
    .filter((row) => row.salesTotal > 0 || row.paid > 0 || row.debt > 0)
    .sort((a, b) => b.debt - a.debt);
};

export const getSupplierDebt = (supplierId) => {
  const supplier = getStoredSuppliers().find((item) => item.id === supplierId);
  const purchases = getStoredPurchases().filter(
    (purchase) => purchase.supplierId === supplierId && !isCancelled(purchase.status),
  );
  const manualPayments = getStoredFinanceTransactions().filter(
    (transaction) =>
      !transaction.reversed &&
      transaction.supplierId === supplierId &&
      transaction.sourceType === "SUPPLIER_PAYMENT",
  );

  const purchasesTotal = roundMoney(
    purchases.reduce((total, purchase) => total + toMoney(purchase.total), 0),
  );
  const purchasePaid = roundMoney(
    purchases.reduce((total, purchase) => total + toMoney(purchase.paidAmount), 0),
  );
  const laterPaid = roundMoney(
    manualPayments.reduce((total, transaction) => total + toMoney(transaction.amount), 0),
  );
  const paid = roundMoney(Math.min(purchasesTotal, purchasePaid + laterPaid));
  const debt = roundMoney(Math.max(purchasesTotal - paid, 0));
  const lastPayment = sortByDateDesc([
    ...getPurchasePaymentTransactions().filter((transaction) => transaction.supplierId === supplierId),
    ...manualPayments,
  ])[0];

  return {
    supplierId,
    supplier,
    supplierName: supplier?.name || purchases[0]?.supplierName || supplierId || "-",
    purchases,
    purchasesTotal,
    paid,
    debt,
    lastPayment,
  };
};

export const getSupplierDebts = () => {
  const ids = new Set();

  getStoredSuppliers().forEach((supplier) => ids.add(supplier.id));
  getStoredPurchases().forEach((purchase) => {
    if (purchase.supplierId && !isCancelled(purchase.status)) {
      ids.add(purchase.supplierId);
    }
  });

  return [...ids]
    .map(getSupplierDebt)
    .filter((row) => row.purchasesTotal > 0 || row.paid > 0 || row.debt > 0)
    .sort((a, b) => b.debt - a.debt);
};

export const getAgentBalance = (agentId) => {
  const agent = getStoredAgents().find((item) => item.id === agentId);
  const sales = getStoredSales().filter((sale) => sale.agentId === agentId && !isCancelled(sale.status));
  const salePayments = getSalePaymentTransactions().filter(
    (transaction) => transaction.agentId === agentId && transaction.type === "IN",
  );
  const collections = getStoredFinanceTransactions().filter(
    (transaction) =>
      !transaction.reversed &&
      transaction.agentId === agentId &&
      transaction.sourceType === "AGENT_COLLECTION",
  );
  const handovers = getStoredFinanceTransactions().filter(
    (transaction) =>
      !transaction.reversed &&
      transaction.agentId === agentId &&
      transaction.sourceType === "AGENT_HANDOVER",
  );
  const totalSales = roundMoney(
    sales.reduce((total, sale) => total + toMoney(sale.netTotal ?? sale.total), 0),
  );
  const collected = roundMoney(
    [...salePayments, ...collections].reduce(
      (total, transaction) => total + toMoney(transaction.amount),
      0,
    ),
  );
  const handedOver = roundMoney(
    handovers.reduce((total, transaction) => total + toMoney(transaction.amount), 0),
  );
  const balance = roundMoney(Math.max(collected - handedOver, 0));
  const commissionPercent = toMoney(agent?.commissionPercent);

  return {
    agentId,
    agent,
    agentName: agent?.name || sales[0]?.agentName || agentId || "-",
    sales,
    totalSales,
    collected,
    handedOver,
    balance,
    commission: roundMoney(totalSales * (commissionPercent / 100)),
    history: sortByDateDesc([...salePayments, ...collections, ...handovers]),
  };
};

export const getAgentBalances = () => {
  const ids = new Set();

  getStoredAgents().forEach((agent) => ids.add(agent.id));
  getStoredSales().forEach((sale) => {
    if (sale.agentId && !isCancelled(sale.status)) {
      ids.add(sale.agentId);
    }
  });
  getStoredFinanceTransactions().forEach((transaction) => {
    if (transaction.agentId) {
      ids.add(transaction.agentId);
    }
  });

  return [...ids].map(getAgentBalance).sort((a, b) => b.balance - a.balance);
};

export const getCashboxBalance = (cashboxId) => {
  const cashbox = getStoredCashboxes().find((item) => item.id === cashboxId);
  const transactions = getFinanceTransactions({ cashboxId }).filter(
    (transaction) => !transaction.reversed,
  );
  const inAmount = transactions
    .filter((transaction) => transaction.type === "IN")
    .reduce((total, transaction) => total + toMoney(transaction.amount), 0);
  const outAmount = transactions
    .filter((transaction) => transaction.type === "OUT")
    .reduce((total, transaction) => total + toMoney(transaction.amount), 0);

  return {
    cashbox,
    cashboxId,
    inAmount: roundMoney(inAmount),
    outAmount: roundMoney(outAmount),
    balance: roundMoney(toMoney(cashbox?.openingBalance) + inAmount - outAmount),
  };
};

export const getCashboxBalances = () =>
  getStoredCashboxes().map((cashbox) => getCashboxBalance(cashbox.id));

export const getFinanceSummary = (filters = {}) => {
  const transactions = getFinanceTransactions(filters);
  const income = roundMoney(
    transactions
      .filter((transaction) => transaction.type === "IN" && !transaction.internal)
      .reduce((total, transaction) => total + toMoney(transaction.amount), 0),
  );
  const expense = roundMoney(
    transactions
      .filter((transaction) => transaction.type === "OUT" && !transaction.internal)
      .reduce((total, transaction) => total + toMoney(transaction.amount), 0),
  );
  const today = new Date().toISOString().slice(0, 10);
  const todayTransactions = transactions.filter((transaction) =>
    String(transaction.date || "").slice(0, 10) === today,
  );
  const customerDebt = getCustomerDebts().reduce((total, row) => total + row.debt, 0);
  const supplierDebt = getSupplierDebts().reduce((total, row) => total + row.debt, 0);
  const agentBalance = getAgentBalances().reduce((total, row) => total + row.balance, 0);
  const cashboxBalance = getCashboxBalances().reduce((total, row) => total + row.balance, 0);

  return {
    income,
    expense,
    netCashflow: roundMoney(income - expense),
    cashboxBalance: roundMoney(cashboxBalance),
    customerDebt: roundMoney(customerDebt),
    supplierDebt: roundMoney(supplierDebt),
    agentBalance: roundMoney(agentBalance),
    todayIncome: roundMoney(
      todayTransactions
        .filter((transaction) => transaction.type === "IN" && !transaction.internal)
        .reduce((total, transaction) => total + toMoney(transaction.amount), 0),
    ),
    todayExpense: roundMoney(
      todayTransactions
        .filter((transaction) => transaction.type === "OUT" && !transaction.internal)
        .reduce((total, transaction) => total + toMoney(transaction.amount), 0),
    ),
    recentTransactions: transactions.slice(0, 8),
    biggestExpenses: transactions
      .filter((transaction) => transaction.type === "OUT" && transaction.sourceType === "EXPENSE")
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5),
    biggestCustomerDebts: getCustomerDebts().filter((row) => row.debt > 0).slice(0, 5),
    biggestSupplierDebts: getSupplierDebts().filter((row) => row.debt > 0).slice(0, 5),
    agentWarnings: getAgentBalances().filter((row) => row.balance > 0).slice(0, 5),
    transactions,
  };
};

export const buildFinanceReport = (filters = {}) => {
  const transactions = getFinanceTransactions(filters);
  const summary = getFinanceSummary(filters);
  const paymentMethods = groupAmount(transactions, "paymentMethod");
  const expensesByCategory = groupAmount(
    transactions.filter((transaction) => transaction.sourceType === "EXPENSE"),
    "category",
  );

  return {
    summary,
    paymentMethods,
    expensesByCategory,
    customerDebts: getCustomerDebts(),
    supplierDebts: getSupplierDebts(),
    agentCollections: getAgentBalances(),
  };
};

const groupAmount = (transactions, key) =>
  [...transactions.reduce((map, transaction) => {
    const groupKey = transaction[key] || "-";
    const current = map.get(groupKey) || { id: groupKey, name: groupKey, amount: 0, count: 0 };

    current.amount = roundMoney(current.amount + toMoney(transaction.amount));
    current.count += 1;
    map.set(groupKey, current);

    return map;
  }, new Map()).values()].sort((a, b) => b.amount - a.amount);

const isOverdueDate = (value) => {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return false;
  }

  const diffDays = (Date.now() - date.getTime()) / 86400000;

  return diffDays > 30;
};
