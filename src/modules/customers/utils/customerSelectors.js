import { getStoredAgents } from "../../agents/utils/agentsStorage";
import { getCustomerDebt as getFinanceCustomerDebt, getFinanceTransactions } from "../../finance/utils/financeSelectors";
import { getStoredFinanceTransactions, roundMoney, toMoney } from "../../finance/utils/financeStorage";
import { getStoredSales } from "../../sales/utils/salesStorage";
import { getCustomerById, getCustomerDisplayName, getStoredCustomerFollowUps, getStoredCustomers } from "./customersStorage";
import { translateText } from "../../../localization/i18n";
const DAY_MS = 86400000;
const isCancelledSale = sale => String(sale?.status || "").toUpperCase() === "CANCELLED";
const getSaleDateValue = sale => {
  const date = new Date(sale?.completedAt || sale?.orderDate || sale?.createdAt || 0);
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
};
const safeDate = value => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};
const activeCustomerSales = customerId => getStoredSales().filter(sale => sale.customerId === customerId && !isCancelledSale(sale));
export const getCustomerSales = customerId => activeCustomerSales(customerId).sort((a, b) => getSaleDateValue(b) - getSaleDateValue(a));
export const getCustomerOrdersCount = customerId => getCustomerSales(customerId).length;
export const getCustomerSalesTotal = customerId => roundMoney(getCustomerSales(customerId).reduce((total, sale) => total + toMoney(sale.netTotal ?? sale.total), 0));
export const getCustomerPaidTotal = customerId => getFinanceCustomerDebt(customerId).paid;
export const getCustomerDebt = customerId => getFinanceCustomerDebt(customerId).debt;
export const getCustomerDebtRow = customerId => getFinanceCustomerDebt(customerId);
export const getCustomerLastSale = customerId => getCustomerSales(customerId)[0] || null;
export const getCustomerAverageCheck = customerId => {
  const sales = getCustomerSales(customerId);
  if (!sales.length) {
    return 0;
  }
  return roundMoney(getCustomerSalesTotal(customerId) / sales.length);
};
export const getCustomerAgent = customerId => {
  const customer = getCustomerById(customerId);
  if (!customer?.agentId) {
    return null;
  }
  return getStoredAgents().find(agent => agent.id === customer.agentId) || null;
};
export const getCustomerFollowUps = customerId => getStoredCustomerFollowUps().filter(followUp => followUp.customerId === customerId).sort((a, b) => {
  const first = new Date(a.date || a.createdAt || 0).getTime();
  const second = new Date(b.date || b.createdAt || 0).getTime();
  return (Number.isFinite(second) ? second : 0) - (Number.isFinite(first) ? first : 0);
});
export const getOpenCustomerFollowUps = customerId => getCustomerFollowUps(customerId).filter(followUp => followUp.status === "OPEN");
export const getNextCustomerFollowUp = customerId => [...getOpenCustomerFollowUps(customerId)].sort((a, b) => {
  const first = new Date(a.date || 0).getTime();
  const second = new Date(b.date || 0).getTime();
  return (Number.isFinite(first) ? first : Infinity) - (Number.isFinite(second) ? second : Infinity);
})[0] || null;
export const isFollowUpOverdue = followUp => {
  if (!followUp || followUp.status !== "OPEN") {
    return false;
  }
  const date = safeDate(followUp.date);
  if (!date) {
    return false;
  }
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  date.setHours(0, 0, 0, 0);
  return date < today;
};
export const getCustomerPayments = customerId => getFinanceTransactions({
  customerId
}).filter(transaction => ["SALE_PAYMENT", "CUSTOMER_PAYMENT", "AGENT_COLLECTION", "REFUND"].includes(transaction.sourceType));
export const getCustomerCollectedAmount = customerId => roundMoney(getStoredFinanceTransactions().filter(transaction => !transaction.reversed && transaction.customerId === customerId && ["CUSTOMER_PAYMENT", "AGENT_COLLECTION"].includes(transaction.sourceType)).reduce((total, transaction) => total + toMoney(transaction.amount), 0));
export const getCustomerCredit = customerId => {
  const customer = getCustomerById(customerId);
  const currentDebt = getCustomerDebt(customerId);
  const creditLimit = toMoney(customer?.creditLimit);
  return {
    currentDebt,
    creditLimit,
    availableCredit: roundMoney(Math.max(creditLimit - currentDebt, 0)),
    exceeded: creditLimit > 0 && currentDebt > creditLimit
  };
};
export const canCustomerUseDebt = ({
  customerId,
  additionalDebt = 0
}) => {
  const credit = getCustomerCredit(customerId);
  const nextDebt = roundMoney(credit.currentDebt + toMoney(additionalDebt));
  if (credit.creditLimit <= 0) {
    return {
      allowed: true,
      nextDebt,
      ...credit
    };
  }
  return {
    allowed: nextDebt <= credit.creditLimit,
    nextDebt,
    ...credit
  };
};
export const calculateCustomerScore = customerId => {
  const sales = getCustomerSales(customerId);
  const totalSales = getCustomerSalesTotal(customerId);
  const paid = getCustomerPaidTotal(customerId);
  const debt = getCustomerDebt(customerId);
  const lastSale = getCustomerLastSale(customerId);
  const lastSaleDate = safeDate(lastSale?.completedAt || lastSale?.orderDate || lastSale?.createdAt);
  const daysSinceLastSale = lastSaleDate ? Math.max(Math.floor((Date.now() - lastSaleDate.getTime()) / DAY_MS), 0) : null;
  let score = 42;
  score += Math.min(sales.length * 6, 24);
  score += Math.min(totalSales / 500000, 18);
  if (daysSinceLastSale === null) {
    score -= 10;
  } else if (daysSinceLastSale <= 14) {
    score += 14;
  } else if (daysSinceLastSale <= 45) {
    score += 7;
  } else if (daysSinceLastSale > 90) {
    score -= 12;
  }
  const debtRatio = totalSales > 0 ? debt / totalSales : 0;
  score -= Math.min(debtRatio * 42, 30);
  if (debt > 0 && getFinanceCustomerDebt(customerId).overdue) {
    score -= 16;
  }
  if (paid >= totalSales && totalSales > 0) {
    score += 8;
  }
  const value = Math.max(0, Math.min(Math.round(score), 100));
  return {
    value,
    label: value >= 80 ? translateText("Juda yaxshi") : value >= 60 ? translateText("Yaxshi") : value >= 40 ? translateText("O'rtacha") : translateText("Riskli"),
    variant: value >= 80 ? "success" : value >= 60 ? "success" : value >= 40 ? "warning" : "danger",
    daysSinceLastSale,
    debtRatio
  };
};
export const suggestCustomerSegment = customerId => {
  const customer = getCustomerById(customerId);
  const totalSales = getCustomerSalesTotal(customerId);
  const debt = getCustomerDebt(customerId);
  const createdAt = safeDate(customer?.createdAt);
  const daysSinceCreated = createdAt ? (Date.now() - createdAt.getTime()) / DAY_MS : 9999;
  if (debt >= 1000000 || calculateCustomerScore(customerId).value < 40) {
    return "RISK";
  }
  if (totalSales >= 5000000) {
    return "VIP";
  }
  if (daysSinceCreated <= 14) {
    return "NEW";
  }
  return customer?.segment || "REGULAR";
};
export const buildCustomerAnalytics = customerId => {
  const sales = getCustomerSales(customerId);
  const debtRow = getFinanceCustomerDebt(customerId);
  const lastSale = getCustomerLastSale(customerId);
  const lastSaleDate = safeDate(lastSale?.completedAt || lastSale?.orderDate || lastSale?.createdAt);
  const credit = getCustomerCredit(customerId);
  const score = calculateCustomerScore(customerId);
  return {
    customer: getCustomerById(customerId) || debtRow.customer || null,
    sales,
    payments: getCustomerPayments(customerId),
    totalSales: debtRow.salesTotal,
    totalPaid: debtRow.paid,
    debt: debtRow.debt,
    ordersCount: sales.length,
    averageCheck: getCustomerAverageCheck(customerId),
    lastSale,
    lastPayment: debtRow.lastPayment,
    daysSinceLastSale: score.daysSinceLastSale,
    returnCount: sales.reduce((total, sale) => total + (sale.returns || []).length, 0),
    collectedAmount: getCustomerCollectedAmount(customerId),
    credit,
    score,
    overdue: debtRow.overdue,
    followUps: getCustomerFollowUps(customerId),
    nextFollowUp: getNextCustomerFollowUp(customerId)
  };
};
export const getCustomerTimeline = customerId => {
  const customer = getCustomerById(customerId);
  const sales = getCustomerSales(customerId).map(sale => ({
    id: `sale-${sale.id}`,
    type: "SALE",
    date: sale.completedAt || sale.orderDate || sale.createdAt,
    title: sale.number || translateText("Savdo"),
    amount: sale.netTotal ?? sale.total,
    meta: sale.paymentStatus || sale.status
  }));
  const payments = getCustomerPayments(customerId).map(payment => ({
    id: `payment-${payment.id}`,
    type: "PAYMENT",
    date: payment.date || payment.createdAt,
    title: payment.sourceType,
    amount: payment.amount,
    meta: payment.paymentMethod
  }));
  const followUps = getCustomerFollowUps(customerId).map(followUp => ({
    id: `follow-${followUp.id}`,
    type: followUp.type === "OTHER" ? "NOTE" : "FOLLOW_UP",
    date: followUp.date || followUp.createdAt,
    title: followUp.type,
    note: followUp.note,
    meta: followUp.status
  }));
  const created = customer ? [{
    id: `customer-${customer.id}`,
    type: "CUSTOMER",
    date: customer.createdAt,
    title: translateText("Mijoz yaratildi"),
    note: getCustomerDisplayName(customer),
    meta: customer.status
  }] : [];
  return [...created, ...sales, ...payments, ...followUps].sort((a, b) => {
    const first = new Date(a.date || 0).getTime();
    const second = new Date(b.date || 0).getTime();
    return (Number.isFinite(second) ? second : 0) - (Number.isFinite(first) ? first : 0);
  });
};
export const getCustomerDeleteSafety = customerId => {
  const salesCount = getStoredSales().filter(sale => sale.customerId === customerId).length;
  const financeCount = getStoredFinanceTransactions().filter(transaction => transaction.customerId === customerId).length;
  const followUpsCount = getCustomerFollowUps(customerId).length;
  const blockingReasons = [];
  if (salesCount) {
    blockingReasons.push(`${salesCount} ${translateText("ta savdo mavjud")}`);
  }
  if (financeCount) {
    blockingReasons.push(`${financeCount} ${translateText("ta moliya operatsiyasi mavjud")}`);
  }
  return {
    canDelete: blockingReasons.length === 0,
    salesCount,
    financeCount,
    followUpsCount,
    blockingReasons
  };
};
export const buildCustomerListRows = () => {
  const agents = new Map(getStoredAgents().map(agent => [agent.id, agent]));
  return getStoredCustomers().map(customer => {
    const analytics = buildCustomerAnalytics(customer.id);
    const agent = customer.agentId ? agents.get(customer.agentId) : null;
    return {
      ...customer,
      displayName: getCustomerDisplayName(customer),
      agent,
      agentName: agent?.name || (customer.agentId ? translateText("Agent topilmadi") : "-"),
      salesAmount: analytics.totalSales,
      paidAmount: analytics.totalPaid,
      debtAmount: analytics.debt,
      salesCount: analytics.ordersCount,
      averageCheck: analytics.averageCheck,
      lastSale: analytics.lastSale,
      lastPayment: analytics.lastPayment,
      score: analytics.score,
      nextFollowUp: analytics.nextFollowUp,
      overdue: analytics.overdue || isFollowUpOverdue(analytics.nextFollowUp),
      credit: analytics.credit
    };
  });
};
export const buildCustomerReport = () => {
  const rows = buildCustomerListRows();
  const newSince = Date.now() - 30 * DAY_MS;
  const activeCustomers = rows.filter(customer => customer.status === "ACTIVE");
  const agentMap = new Map();
  rows.forEach(customer => {
    const key = customer.agentId || "unassigned";
    const current = agentMap.get(key) || {
      id: key,
      name: customer.agentName || translateText("Agent tanlanmagan"),
      customers: 0,
      sales: 0,
      debt: 0
    };
    current.customers += 1;
    current.sales = roundMoney(current.sales + toMoney(customer.salesAmount));
    current.debt = roundMoney(current.debt + toMoney(customer.debtAmount));
    agentMap.set(key, current);
  });
  return {
    totalCustomers: rows.length,
    newCustomers: rows.filter(customer => {
      const date = new Date(customer.createdAt);
      return !Number.isNaN(date.getTime()) && date.getTime() >= newSince;
    }).length,
    activeCustomers: activeCustomers.length,
    customerSales: roundMoney(rows.reduce((total, row) => total + toMoney(row.salesAmount), 0)),
    customerDebt: roundMoney(rows.reduce((total, row) => total + toMoney(row.debtAmount), 0)),
    topCustomers: [...rows].sort((a, b) => b.salesAmount - a.salesAmount).slice(0, 5),
    riskyDebtCustomers: rows.filter(customer => customer.debtAmount > 0 || customer.score.value < 40).sort((a, b) => b.debtAmount - a.debtAmount || a.score.value - b.score.value).slice(0, 5),
    agentDistribution: [...agentMap.values()].sort((a, b) => b.customers - a.customers)
  };
};
