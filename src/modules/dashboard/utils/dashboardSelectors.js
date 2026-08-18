import { getStoredAgents } from "../../agents/utils/agentsStorage";
import {
  getStoredCustomerFollowUps,
  getStoredCustomers,
} from "../../customers/utils/customersStorage";
import {
  getCashboxBalances,
  getCustomerDebts,
  getFinanceSummary,
  getFinanceTransactions,
  getSupplierDebts,
} from "../../finance/utils/financeSelectors";
import { toMoney } from "../../finance/utils/financeStorage";
import { getHrSummary } from "../../employees/utils/hrStorage";
import { getStoredProductionOrders } from "../../manufacturing/utils/manufacturingStorage";
import { checkMaterialAvailability } from "../../manufacturing/production-orders/utils/materialAvailability";
import { getProductionStages } from "../../manufacturing/production-orders/utils/productionStages";
import { getStoredPurchases } from "../../purchases/utils/purchasesStorage";
import { getStoredSales } from "../../sales/utils/salesStorage";
import {
  getStoredWarehouseStock,
  getWarehouseMovements,
} from "../../warehouse/utils/warehouseStorage";
import {
  getWarehouseStockStatus,
  getWarehouseStockStatusLabel,
} from "../../warehouse/utils/warehouseHelpers";

export const DASHBOARD_PERIODS = [
  { value: "today", label: "Bugun" },
  { value: "week", label: "Hafta" },
  { value: "month", label: "Oy" },
];

const DAY_MS = 86400000;

const CANCELLED = "CANCELLED";

export const toSafeNumber = (value) => {
  const number = Number(value);

  return Number.isFinite(number) ? number : 0;
};

const roundMoney = (value) => Math.round(toSafeNumber(value) * 100) / 100;

const isBrowser = () => typeof window !== "undefined";

export const parseDashboardDate = (value) => {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  const text = String(value).trim();

  if (!text) {
    return null;
  }

  const isoLike = new Date(text);

  if (!Number.isNaN(isoLike.getTime())) {
    return isoLike;
  }

  const match = text.match(
    /^(\d{1,2})[./-](\d{1,2})[./-](\d{4})(?:,\s*)?(\d{1,2})?:?(\d{2})?:?(\d{2})?/,
  );

  if (!match) {
    return null;
  }

  const [, day, month, year, hour = "0", minute = "0", second = "0"] = match;
  const parsed = new Date(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hour),
    Number(minute),
    Number(second),
  );

  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const startOfDay = (date) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate());

const endOfDay = (date) =>
  new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    23,
    59,
    59,
    999,
  );

const getPeriodRange = (period = "today") => {
  const now = new Date();
  const today = startOfDay(now);

  if (period === "week") {
    const day = today.getDay() || 7;
    const from = new Date(today);

    from.setDate(today.getDate() - day + 1);

    return {
      from,
      to: endOfDay(now),
      fromInput: from.toISOString().slice(0, 10),
      toInput: now.toISOString().slice(0, 10),
    };
  }

  if (period === "month") {
    const from = new Date(today.getFullYear(), today.getMonth(), 1);

    return {
      from,
      to: endOfDay(now),
      fromInput: from.toISOString().slice(0, 10),
      toInput: now.toISOString().slice(0, 10),
    };
  }

  return {
    from: today,
    to: endOfDay(now),
    fromInput: today.toISOString().slice(0, 10),
    toInput: today.toISOString().slice(0, 10),
  };
};

const isWithinRange = (value, range) => {
  const date = parseDashboardDate(value);

  if (!date) {
    return false;
  }

  return date >= range.from && date <= range.to;
};

const getPrimaryDate = (item, keys) => {
  const key = keys.find((field) => parseDashboardDate(item?.[field]));

  return key ? item[key] : null;
};

const byDateDesc = (items) =>
  [...items].sort((a, b) => {
    const first = parseDashboardDate(a.date)?.getTime() || 0;
    const second = parseDashboardDate(b.date)?.getTime() || 0;

    return second - first;
  });

const isCancelled = (status) => String(status || "").toUpperCase() === CANCELLED;

const getSaleAmount = (sale) =>
  roundMoney(sale.netTotal ?? sale.total ?? sale.subtotal ?? 0);

const getSalePaidAmount = (sale) => {
  if (Array.isArray(sale.payments) && sale.payments.length) {
    return roundMoney(
      sale.payments
        .filter(
          (payment) =>
            payment.method !== "DEBT" &&
            payment.paymentMethod !== "DEBT" &&
            toSafeNumber(payment.amount) > 0,
        )
        .reduce((total, payment) => total + toSafeNumber(payment.amount), 0),
    );
  }

  return roundMoney(sale.paidAmount);
};

export const getDashboardSalesSummary = (period = "today") => {
  const range = getPeriodRange(period);
  const sales = getStoredSales();
  const completedSales = sales.filter(
    (sale) =>
      String(sale.status || "").toUpperCase() === "COMPLETED" &&
      isWithinRange(
        getPrimaryDate(sale, ["completedAt", "orderDate", "createdAt"]),
        range,
      ),
  );
  const total = roundMoney(
    completedSales.reduce((sum, sale) => sum + getSaleAmount(sale), 0),
  );
  const paidAmount = roundMoney(
    completedSales.reduce((sum, sale) => sum + getSalePaidAmount(sale), 0),
  );
  const debtAmount = roundMoney(
    completedSales.reduce(
      (sum, sale) =>
        sum +
        Math.max(
          toSafeNumber(sale.debtAmount ?? getSaleAmount(sale) - getSalePaidAmount(sale)),
          0,
        ),
      0,
    ),
  );

  return {
    total,
    count: completedSales.length,
    paidAmount,
    debtAmount,
    averageCheck: completedSales.length ? roundMoney(total / completedSales.length) : 0,
    recent: byDateDesc(
      completedSales.map((sale) => ({
        ...sale,
        date: getPrimaryDate(sale, ["completedAt", "orderDate", "createdAt"]),
      })),
    ).slice(0, 5),
  };
};

export const getDashboardFinanceSummary = (period = "today") => {
  const range = getPeriodRange(period);
  const filters = {
    from: range.fromInput,
    to: range.toInput,
  };
  const summary = getFinanceSummary(filters);
  const transactions = getFinanceTransactions(filters).filter(
    (transaction) => !transaction.internal,
  );
  const cashboxBalance = getCashboxBalances().reduce(
    (total, row) => total + toMoney(row.balance),
    0,
  );

  return {
    inAmount: roundMoney(summary.income),
    outAmount: roundMoney(summary.expense),
    netCashflow: roundMoney(summary.netCashflow),
    cashboxBalance: roundMoney(cashboxBalance),
    transactions,
    recentTransactions: transactions.slice(0, 6),
  };
};

export const getDashboardDebtSummary = () => {
  const customerDebts = getCustomerDebts();
  const supplierDebts = getSupplierDebts();

  return {
    customerDebt: roundMoney(
      customerDebts.reduce((total, row) => total + toSafeNumber(row.debt), 0),
    ),
    riskyCustomerCount: customerDebts.filter((row) => row.debt > 0 && row.overdue).length,
    supplierDebt: roundMoney(
      supplierDebts.reduce((total, row) => total + toSafeNumber(row.debt), 0),
    ),
    topCustomers: customerDebts.filter((row) => row.debt > 0).slice(0, 3),
    topSuppliers: supplierDebts.filter((row) => row.debt > 0).slice(0, 3),
  };
};

export const getDashboardWarehouseAlerts = () => {
  const stock = getStoredWarehouseStock();
  const alerts = stock
    .map((item) => {
      const status = getWarehouseStockStatus(item);

      return {
        ...item,
        status,
        statusLabel: getWarehouseStockStatusLabel(item),
        currentStock: toSafeNumber(item.quantity),
        minimumStock: toSafeNumber(item.minimumStock),
        reservedStock: toSafeNumber(item.reserved),
        severity:
          status === "OUT_OF_STOCK"
            ? 0
            : status === "LOW_STOCK"
              ? 1
              : 2,
      };
    })
    .filter((item) => ["LOW_STOCK", "OUT_OF_STOCK"].includes(item.status))
    .sort((a, b) => {
      if (a.severity !== b.severity) {
        return a.severity - b.severity;
      }

      return a.currentStock - b.currentStock;
    });
  const reservedWarnings = stock.filter(
    (item) => toSafeNumber(item.reserved) > 0 && toSafeNumber(item.quantity) <= toSafeNumber(item.reserved),
  );

  return {
    lowStockCount: alerts.filter((item) => item.status === "LOW_STOCK").length,
    outOfStockCount: alerts.filter((item) => item.status === "OUT_OF_STOCK").length,
    reservedWarningCount: reservedWarnings.length,
    criticalItems: alerts.slice(0, 5),
  };
};

export const getDashboardManufacturingSummary = (period = "today") => {
  const range = getPeriodRange(period);
  const orders = getStoredProductionOrders().filter((order) => !isCancelled(order.status));
  const activeStatuses = ["IN_PROGRESS", "PLANNED"];
  const shortageOrders = orders.filter((order) => {
    if (!Array.isArray(order.requiredMaterials) || !order.requiredMaterials.length) {
      return false;
    }

    return checkMaterialAvailability({
      warehouseId: order.warehouseId,
      requiredMaterials: order.requiredMaterials,
    }).some((material) => !material.enough);
  });
  const todayCompleted = orders.filter(
    (order) =>
      order.status === "COMPLETED" &&
      isWithinRange(getPrimaryDate(order, ["completedAt", "updatedAt", "createdAt"]), range),
  );
  const currentOrders = byDateDesc(
    orders
      .filter((order) => activeStatuses.includes(order.status))
      .map((order) => {
        const currentStage = getProductionStages(order).find(
          (stage) => stage.status === "IN_PROGRESS",
        );

        return {
          ...order,
          currentStageName: currentStage?.name || "",
          date: getPrimaryDate(order, ["updatedAt", "plannedDate", "createdAt"]),
        };
      }),
  ).slice(0, 4);

  return {
    inProgressCount: orders.filter((order) => order.status === "IN_PROGRESS").length,
    plannedCount: orders.filter((order) => order.status === "PLANNED").length,
    shortageCount: shortageOrders.length,
    completedTodayCount: todayCompleted.length,
    currentOrders,
  };
};

export const getDashboardPurchaseAlerts = (period = "today") => {
  const range = getPeriodRange(period);
  const today = new Date().toISOString().slice(0, 10);
  const purchases = getStoredPurchases().filter((purchase) => !isCancelled(purchase.status));
  const pendingStatuses = ["ORDERED", "PARTIALLY_RECEIVED"];
  const pending = purchases.filter((purchase) => pendingStatuses.includes(purchase.status));
  const late = pending.filter((purchase) => {
    const expected = parseDashboardDate(purchase.expectedDate);

    return expected && expected < startOfDay(new Date());
  });
  const expectedToday = pending.filter(
    (purchase) => String(purchase.expectedDate || "").slice(0, 10) === today,
  );
  const important = byDateDesc(
    [...late, ...expectedToday, ...pending]
      .map((purchase) => ({
        ...purchase,
        date: getPrimaryDate(purchase, ["expectedDate", "orderDate", "createdAt"]),
        signal: late.some((item) => item.id === purchase.id)
          ? "late"
          : expectedToday.some((item) => item.id === purchase.id)
            ? "today"
            : "pending",
      }))
      .filter(
        (purchase, index, array) =>
          array.findIndex((item) => item.id === purchase.id) === index,
      ),
  ).slice(0, 5);

  return {
    orderedCount: pending.length,
    lateCount: late.length,
    expectedTodayCount: expectedToday.length,
    periodPurchaseCount: purchases.filter((purchase) =>
      isWithinRange(getPrimaryDate(purchase, ["orderDate", "createdAt"]), range),
    ).length,
    important,
  };
};

export const getDashboardAgentPerformance = (period = "today") => {
  const range = getPeriodRange(period);
  const agents = getStoredAgents();
  const agentMap = new Map(agents.map((agent) => [agent.id, agent]));
  const sales = getStoredSales().filter(
    (sale) =>
      !isCancelled(sale.status) &&
      sale.status === "COMPLETED" &&
      sale.agentId &&
      isWithinRange(
        getPrimaryDate(sale, ["completedAt", "orderDate", "createdAt"]),
        range,
      ),
  );
  const rows = sales.reduce((map, sale) => {
    const agent = agentMap.get(sale.agentId);
    const current = map.get(sale.agentId) || {
      agentId: sale.agentId,
      name: agent?.name || sale.agentName || "Agent",
      salesAmount: 0,
      targetAmount: toSafeNumber(agent?.targetAmount),
      ordersCount: 0,
    };

    current.salesAmount = roundMoney(current.salesAmount + getSaleAmount(sale));
    current.ordersCount += 1;
    map.set(sale.agentId, current);

    return map;
  }, new Map());

  return [...rows.values()]
    .map((row) => ({
      ...row,
      targetPercent: row.targetAmount
        ? roundMoney((row.salesAmount / row.targetAmount) * 100)
        : 0,
    }))
    .sort((a, b) => b.salesAmount - a.salesAmount)
    .slice(0, 3);
};

export const getDashboardCrmSignals = (period = "today") => {
  const range = getPeriodRange(period);
  const today = new Date().toISOString().slice(0, 10);
  const customers = getStoredCustomers();
  const followUps = getStoredCustomerFollowUps().filter(
    (followUp) => followUp.status === "OPEN",
  );
  const overdueFollowUps = followUps.filter(
    (followUp) => String(followUp.date || "").slice(0, 10) < today,
  );
  const todayFollowUps = followUps.filter(
    (followUp) => String(followUp.date || "").slice(0, 10) === today,
  );
  const newCustomers = customers.filter((customer) =>
    isWithinRange(customer.createdAt, range),
  );
  const riskyCustomers = customers.filter(
    (customer) =>
      customer.status === "ACTIVE" &&
      (customer.segment === "RISK" ||
        (customer.nextFollowUpAt &&
          String(customer.nextFollowUpAt).slice(0, 10) < today)),
  );

  return {
    newCustomerCount: newCustomers.length,
    riskyCustomerCount: riskyCustomers.length,
    overdueFollowUpCount: overdueFollowUps.length,
    todayFollowUpCount: todayFollowUps.length,
  };
};

export const getDashboardHrSignals = () => {
  try {
    const summary = getHrSummary();

    return {
      present: summary.todayPresent,
      late: summary.lateCount,
      absent: Array.isArray(summary.absentToday) ? summary.absentToday.length : 0,
      leave: summary.onLeaveCount,
      unpaidPayrollCount: Array.isArray(summary.unpaidPayrolls)
        ? summary.unpaidPayrolls.length
        : 0,
      salaryDebt: roundMoney(summary.salaryDebt),
    };
  } catch {
    return {
      present: 0,
      late: 0,
      absent: 0,
      leave: 0,
      unpaidPayrollCount: 0,
      salaryDebt: 0,
    };
  }
};

export const getDashboardRecentActivity = (period = "today") => {
  const range = getPeriodRange(period);
  const sales = getStoredSales()
    .filter(
      (sale) =>
        sale.status === "COMPLETED" &&
        !isCancelled(sale.status) &&
        isWithinRange(
          getPrimaryDate(sale, ["completedAt", "orderDate", "createdAt"]),
          range,
        ),
    )
    .map((sale) => ({
      id: `sale-${sale.id}`,
      source: "sales",
      title: `Savdo yakunlandi ${sale.number || ""}`.trim(),
      info: sale.customerName || "Mijoz ko'rsatilmagan",
      amount: getSaleAmount(sale),
      date: getPrimaryDate(sale, ["completedAt", "orderDate", "createdAt"]),
      path: `/sales/history/${sale.id}`,
    }));
  const finance = getFinanceTransactions({
    from: range.fromInput,
    to: range.toInput,
  })
    .filter(
      (transaction) =>
        !transaction.internal &&
        !["SALE_PAYMENT", "PURCHASE_PAYMENT"].includes(transaction.sourceType),
    )
    .map((transaction) => ({
      id: `finance-${transaction.id}`,
      source: transaction.type === "IN" ? "finance-in" : "finance-out",
      title: transaction.type === "IN" ? "Pul tushumi" : "Pul chiqimi",
      info: transaction.counterparty || transaction.category || transaction.note,
      amount: transaction.amount,
      date: transaction.date || transaction.createdAt,
      path: "/finance/cashflow",
    }));
  const purchases = getStoredPurchases()
    .filter(
      (purchase) =>
        !isCancelled(purchase.status) &&
        isWithinRange(getPrimaryDate(purchase, ["orderDate", "createdAt"]), range),
    )
    .map((purchase) => ({
      id: `purchase-${purchase.id}`,
      source: "purchase",
      title: `Xarid ${purchase.number || ""}`.trim(),
      info: purchase.supplierName || purchase.status || "",
      amount: toSafeNumber(purchase.total),
      date: getPrimaryDate(purchase, ["orderDate", "createdAt"]),
      path: `/purchases/${purchase.id}`,
    }));
  const production = getStoredProductionOrders()
    .filter(
      (order) =>
        order.status === "COMPLETED" &&
        isWithinRange(getPrimaryDate(order, ["completedAt", "updatedAt", "createdAt"]), range),
    )
    .map((order) => ({
      id: `production-${order.id}`,
      source: "production",
      title: `Ishlab chiqarish tugadi ${order.number || ""}`.trim(),
      info: order.productName || "",
      amount: toSafeNumber(order.producedQuantity || order.plannedQuantity),
      date: getPrimaryDate(order, ["completedAt", "updatedAt", "createdAt"]),
      path: `/manufacturing/orders/${order.id}`,
      unit: order.outputUnit || "dona",
    }));
  const movements = getWarehouseMovements()
    .filter((movement) => isWithinRange(movement.createdAt, range))
    .map((movement) => ({
      id: `warehouse-${movement.id}`,
      source: movement.type === "IN" ? "warehouse-in" : "warehouse-out",
      title: movement.type === "IN" ? "Ombor kirimi" : "Ombor chiqimi",
      info: movement.productName || movement.source || "",
      amount: toSafeNumber(movement.quantity),
      date: movement.createdAt,
      path: "/warehouse",
      unit: movement.unit || "dona",
    }));

  const map = new Map();

  [...sales, ...finance, ...purchases, ...production, ...movements].forEach((item) => {
    if (!map.has(item.id)) {
      map.set(item.id, item);
    }
  });

  return byDateDesc([...map.values()]).slice(0, 10);
};

export const getDashboardData = (period = "today") => {
  if (!isBrowser()) {
    return null;
  }

  const sales = getDashboardSalesSummary(period);
  const finance = getDashboardFinanceSummary(period);
  const debts = getDashboardDebtSummary();
  const warehouse = getDashboardWarehouseAlerts();

  return {
    period,
    sales,
    finance,
    debts,
    warehouse,
    manufacturing: getDashboardManufacturingSummary(period),
    purchases: getDashboardPurchaseAlerts(period),
    agents: getDashboardAgentPerformance(period),
    crm: getDashboardCrmSignals(period),
    hr: getDashboardHrSignals(),
    recentActivity: getDashboardRecentActivity(period),
    kpis: [
      {
        id: "sales",
        label: "Savdo",
        value: sales.total,
        meta: `${sales.count} chek`,
        path: "/sales/history",
      },
      {
        id: "income",
        label: "Tushum",
        value: finance.inAmount,
        meta: "Finance IN",
        path: "/finance/cashflow",
      },
      {
        id: "cashflow",
        label: "Sof pul oqimi",
        value: finance.netCashflow,
        meta: "IN - OUT",
        path: "/finance/cashflow",
      },
      {
        id: "customerDebt",
        label: "Mijoz qarzi",
        value: debts.customerDebt,
        meta: `${debts.riskyCustomerCount} risk`,
        path: "/finance/debts",
      },
      {
        id: "supplierDebt",
        label: "Supplier qarzi",
        value: debts.supplierDebt,
        meta: "Yetkazib beruvchi",
        path: "/suppliers",
      },
      {
        id: "stock",
        label: "Low stock",
        value: warehouse.lowStockCount + warehouse.outOfStockCount,
        meta: `${warehouse.outOfStockCount} tugagan`,
        path: "/warehouse",
        plain: true,
      },
    ],
  };
};
