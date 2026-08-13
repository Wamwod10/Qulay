const toMoney = (value) => {
  const number = Number(value);

  return Number.isFinite(number) ? Math.max(number, 0) : 0;
};

export const roundMoney = (value) => Math.round(toMoney(value) * 100) / 100;

export const calculateSaleSubtotal = (items = []) =>
  roundMoney(
    items.reduce(
      (total, item) =>
        total + toMoney(item.quantity) * toMoney(item.price),
      0,
    ),
  );

export const calculateSaleDiscount = ({
  subtotal,
  discountType = "AMOUNT",
  discountValue = 0,
}) => {
  const safeSubtotal = toMoney(subtotal);
  const safeValue = toMoney(discountValue);

  if (safeSubtotal <= 0 || safeValue <= 0) {
    return 0;
  }

  if (discountType === "PERCENT") {
    return roundMoney(safeSubtotal * (Math.min(safeValue, 100) / 100));
  }

  return roundMoney(Math.min(safeValue, safeSubtotal));
};

export const calculatePaidAmount = (payments = [], paidAmount = 0) => {
  if (Array.isArray(payments) && payments.length) {
    return roundMoney(
      payments.reduce(
        (total, payment) =>
          payment.method === "DEBT" || payment.paymentMethod === "DEBT"
            ? total
            : total + toMoney(payment.amount),
        0,
      ),
    );
  }

  return roundMoney(paidAmount);
};

export const calculateReturnedAmount = (returns = []) =>
  roundMoney(
    returns.reduce((total, item) => total + toMoney(item.refundAmount), 0),
  );

export const calculateSaleTotals = ({
  items = [],
  discountType = "AMOUNT",
  discountValue = 0,
  paidAmount = 0,
  payments = [],
  returns = [],
}) => {
  const subtotal = calculateSaleSubtotal(items);
  const discount = calculateSaleDiscount({
    subtotal,
    discountType,
    discountValue,
  });
  const total = roundMoney(Math.max(subtotal - discount, 0));
  const paid = roundMoney(Math.min(calculatePaidAmount(payments, paidAmount), total));
  const debt = roundMoney(Math.max(total - paid, 0));
  const returnedAmount = calculateReturnedAmount(returns);
  const netTotal = roundMoney(Math.max(total - returnedAmount, 0));

  return {
    subtotal,
    discount,
    total,
    paidAmount: paid,
    debtAmount: debt,
    returnedAmount,
    netTotal,
  };
};

export const getReturnedQuantityForItem = (sale, productId) =>
  (sale.returns || []).reduce((total, item) => {
    if (item.productId !== productId) {
      return total;
    }

    return total + toMoney(item.quantity);
  }, 0);

export const getSaleNetTotal = (sale) =>
  roundMoney(Math.max(toMoney(sale.total) - toMoney(sale.returnedAmount), 0));
