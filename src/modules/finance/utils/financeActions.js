import {
  addFinanceTransaction,
  createFinanceId,
  getDefaultCashboxId,
  normalizeDate,
  normalizePaymentMethod,
  roundMoney,
  toMoney,
} from "./financeStorage";

import {
  getAgentBalance,
  getCustomerDebt,
  getSupplierDebt,
} from "./financeSelectors";

const assertPositiveAmount = (amount) => {
  const value = roundMoney(amount);

  if (value <= 0) {
    throw new Error("Summa 0 dan katta bo'lishi kerak.");
  }

  return value;
};

const assertNoOverpayment = ({ amount, debt, label }) => {
  if (amount > roundMoney(debt)) {
    throw new Error(`${label} bo'yicha ortiqcha to'lov mumkin emas.`);
  }
};

export const addCustomerPayment = ({
  customerId,
  saleId = null,
  amount,
  paymentMethod = "CASH",
  cashboxId,
  date,
  note = "",
}) => {
  const safeAmount = assertPositiveAmount(amount);
  const debt = getCustomerDebt(customerId);

  assertNoOverpayment({
    amount: safeAmount,
    debt: debt.debt,
    label: "Mijoz qarzi",
  });

  const method = normalizePaymentMethod(paymentMethod);

  return addFinanceTransaction({
    id: createFinanceId("cust-pay"),
    type: "IN",
    category: "Mijoz to'lovi",
    sourceType: "CUSTOMER_PAYMENT",
    sourceId: saleId || customerId,
    customerId,
    saleId,
    amount: safeAmount,
    paymentMethod: method,
    cashboxId: cashboxId || getDefaultCashboxId(method),
    date: normalizeDate(date),
    note,
  });
};

export const addSupplierPayment = ({
  supplierId,
  purchaseId = null,
  amount,
  paymentMethod = "BANK",
  cashboxId,
  date,
  note = "",
}) => {
  const safeAmount = assertPositiveAmount(amount);
  const debt = getSupplierDebt(supplierId);

  assertNoOverpayment({
    amount: safeAmount,
    debt: debt.debt,
    label: "Supplier qarzi",
  });

  const method = normalizePaymentMethod(paymentMethod);

  return addFinanceTransaction({
    id: createFinanceId("sup-pay"),
    type: "OUT",
    category: "Yetkazib beruvchi to'lovi",
    sourceType: "SUPPLIER_PAYMENT",
    sourceId: purchaseId || supplierId,
    supplierId,
    purchaseId,
    amount: safeAmount,
    paymentMethod: method,
    cashboxId: cashboxId || getDefaultCashboxId(method),
    date: normalizeDate(date),
    note,
  });
};

export const addExpense = ({
  category,
  amount,
  paymentMethod = "CASH",
  cashboxId,
  date,
  responsiblePerson = "",
  note = "",
  status = "POSTED",
}) => {
  const safeAmount = assertPositiveAmount(amount);
  const method = normalizePaymentMethod(paymentMethod);

  return addFinanceTransaction({
    id: createFinanceId("expense"),
    type: "OUT",
    category: category || "Boshqa",
    sourceType: "EXPENSE",
    sourceId: category || "Boshqa",
    amount: safeAmount,
    paymentMethod: method,
    cashboxId: cashboxId || getDefaultCashboxId(method),
    date: normalizeDate(date),
    responsiblePerson,
    status,
    note,
  });
};

export const addCashMovement = ({
  type,
  amount,
  cashboxId,
  paymentMethod = "CASH",
  date,
  note = "",
}) => {
  const safeAmount = assertPositiveAmount(amount);
  const safeType = type === "OUT" ? "OUT" : "IN";
  const method = normalizePaymentMethod(paymentMethod);

  return addFinanceTransaction({
    id: createFinanceId(safeType === "IN" ? "cash-in" : "cash-out"),
    type: safeType,
    category: safeType === "IN" ? "Kassa kirimi" : "Kassa chiqimi",
    sourceType: safeType === "IN" ? "CASH_IN" : "CASH_OUT",
    sourceId: cashboxId,
    amount: safeAmount,
    paymentMethod: method,
    cashboxId: cashboxId || getDefaultCashboxId(method),
    date: normalizeDate(date),
    note,
  });
};

export const addCashTransfer = ({
  fromCashboxId,
  toCashboxId,
  amount,
  date,
  note = "",
}) => {
  const safeAmount = assertPositiveAmount(amount);

  if (!fromCashboxId || !toCashboxId || fromCashboxId === toCashboxId) {
    throw new Error("Transfer uchun ikkita turli kassa tanlang.");
  }

  const transferId = createFinanceId("transfer");
  const transferDate = normalizeDate(date);

  const outTransaction = addFinanceTransaction({
    id: `${transferId}-out`,
    type: "OUT",
    category: "Kassa o'tkazmasi",
    sourceType: "CASH_TRANSFER",
    sourceId: transferId,
    amount: safeAmount,
    paymentMethod: "CASH",
    cashboxId: fromCashboxId,
    date: transferDate,
    note,
    internal: true,
  });

  const inTransaction = addFinanceTransaction({
    id: `${transferId}-in`,
    type: "IN",
    category: "Kassa o'tkazmasi",
    sourceType: "CASH_TRANSFER",
    sourceId: transferId,
    amount: safeAmount,
    paymentMethod: "CASH",
    cashboxId: toCashboxId,
    date: transferDate,
    note,
    internal: true,
  });

  return [outTransaction, inTransaction];
};

export const addAgentCollection = ({
  agentId,
  customerId = null,
  saleId = null,
  amount,
  paymentMethod = "CASH",
  date,
  note = "",
}) => {
  const safeAmount = assertPositiveAmount(amount);

  if (customerId) {
    const debt = getCustomerDebt(customerId);

    assertNoOverpayment({
      amount: safeAmount,
      debt: debt.debt,
      label: "Mijoz qarzi",
    });
  }

  const method = normalizePaymentMethod(paymentMethod);

  return addFinanceTransaction({
    id: createFinanceId("agent-col"),
    type: "IN",
    category: "Agent tushumi",
    sourceType: "AGENT_COLLECTION",
    sourceId: saleId || customerId || agentId,
    customerId,
    agentId,
    saleId,
    amount: safeAmount,
    paymentMethod: method,
    cashboxId: null,
    date: normalizeDate(date),
    collectedAt: normalizeDate(date),
    note,
  });
};

export const addAgentHandover = ({
  agentId,
  amount,
  paymentMethod = "CASH",
  cashboxId,
  date,
  note = "",
}) => {
  const safeAmount = assertPositiveAmount(amount);
  const balance = getAgentBalance(agentId);

  if (safeAmount > toMoney(balance.balance)) {
    throw new Error("Agentdagi puldan ortiq topshirish mumkin emas.");
  }

  const method = normalizePaymentMethod(paymentMethod);

  return addFinanceTransaction({
    id: createFinanceId("agent-hand"),
    type: "IN",
    category: "Agent topshirimi",
    sourceType: "AGENT_HANDOVER",
    sourceId: agentId,
    agentId,
    amount: safeAmount,
    paymentMethod: method,
    cashboxId: cashboxId || getDefaultCashboxId(method),
    date: normalizeDate(date),
    note,
    internal: true,
  });
};
