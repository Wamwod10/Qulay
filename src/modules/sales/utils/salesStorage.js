import { getStoredProducts } from "../../products/utils/productsStorage";
import {
  getStoredWarehouseStock,
  getWarehouseMovements,
  saveWarehouseStock,
} from "../../warehouse/utils/warehouseStorage";
import { getStoredWarehouses } from "../../warehouse/utils/warehouseManagementStorage";

import { getTenantKey, tenantGet, tenantSet } from "../../auth/utils/tenantStorage";
import { syncApiRequest, unwrapList } from "../../../services/api/syncApi";

import { calculateSaleTotals, roundMoney } from "./salesCalculations";
import { getPaymentStatus } from "./salesHelpers";

const STORAGE_KEY = "sales";
const MOVEMENTS_KEY = "warehouse_movements";

const canUseStorage = () => typeof window !== "undefined" && window.localStorage;

const nowIso = () => new Date().toISOString();

const createId = (prefix) =>
  `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;

const toNumber = (value) => {
  const number = Number(value);

  return Number.isFinite(number) ? number : 0;
};

const normalizePayment = (payment = {}) => ({
  id: String(payment.id || createId("pay")),
  method: payment.method || payment.paymentMethod || "CASH",
  paymentMethod: payment.paymentMethod || payment.method || "CASH",
  amount: roundMoney(payment.amount),
});

const normalizeItem = (item = {}) => {
  const quantity = roundMoney(item.quantity);
  const price = roundMoney(item.price ?? item.salePrice);

  return {
    id: String(item.id || `${item.productId || "item"}-${Date.now()}`),
    productId: item.productId || null,
    productName: item.productName || item.name || "Mahsulot",
    sku: item.sku || "",
    barcode: item.barcode || "",
    quantity,
    unit: item.unit || "dona",
    price,
    cost: roundMoney(item.cost),
    subtotal: roundMoney(quantity * price),
  };
};

const normalizeReturn = (item = {}) => ({
  id: String(item.id || createId("ret")),
  productId: item.productId || null,
  productName: item.productName || "",
  sku: item.sku || "",
  quantity: roundMoney(item.quantity),
  unit: item.unit || "dona",
  refundAmount: roundMoney(item.refundAmount),
  reason: item.reason || "",
  createdAt: item.createdAt || nowIso(),
});

export const normalizeSale = (sale = {}) => {
  const items = Array.isArray(sale.items) ? sale.items.map(normalizeItem) : [];
  const payments = Array.isArray(sale.payments)
    ? sale.payments.map(normalizePayment).filter((payment) => payment.amount > 0)
    : [];
  const returns = Array.isArray(sale.returns)
    ? sale.returns.map(normalizeReturn).filter((item) => item.quantity > 0)
    : [];
  const totals = calculateSaleTotals({
    items,
    discountType: sale.discountType || "AMOUNT",
    discountValue: sale.discountValue,
    paidAmount: sale.paidAmount,
    payments,
    returns,
  });

  const status = ["DRAFT", "COMPLETED", "CANCELLED"].includes(sale.status)
    ? sale.status
    : "DRAFT";

  return {
    id: String(sale.id || createId("sale")),
    number: sale.number || "",
    customerId: sale.customerId || null,
    customerName: sale.customerName || "",
    agentId: sale.agentId || null,
    agentName: sale.agentName || "",
    warehouseId: sale.warehouseId || null,
    warehouseName: sale.warehouseName || "",
    items,
    subtotal: totals.subtotal,
    discountType: sale.discountType === "PERCENT" ? "PERCENT" : "AMOUNT",
    discountValue: roundMoney(sale.discountValue),
    discount: totals.discount,
    total: totals.total,
    paidAmount: totals.paidAmount,
    debtAmount: totals.debtAmount,
    paymentStatus: getPaymentStatus({
      total: totals.total,
      paidAmount: totals.paidAmount,
    }),
    paymentMethod:
      sale.paymentMethod || payments[0]?.method || (totals.paidAmount > 0 ? "CASH" : ""),
    payments,
    status,
    returnStatus: sale.returnStatus || "",
    returnedAmount: totals.returnedAmount,
    netTotal: totals.netTotal,
    returns,
    orderDate: sale.orderDate || sale.createdAt || null,
    completedAt: sale.completedAt || null,
    cancelledAt: sale.cancelledAt || null,
    createdAt: sale.createdAt || nowIso(),
    updatedAt: sale.updatedAt || sale.createdAt || nowIso(),
    note: sale.note || "",
  };
};

const readJson = (key, fallback) => {
  if (!canUseStorage()) {
    return fallback;
  }

  try {
    return tenantGet(key, fallback);
  } catch {
    return fallback;
  }
};

const writeJson = (key, value) => {
  if (!canUseStorage()) {
    return false;
  }

  tenantSet(key, value);

  return true;
};

const writeSales = (sales) => writeJson(STORAGE_KEY, sales.map(normalizeSale));

const commitBatch = ({ sales, stock, movements }) => {
  if (!canUseStorage()) {
    return false;
  }

  const salesKey = getTenantKey(STORAGE_KEY);
  const stockKey = getTenantKey("warehouse_stock");
  const movementsKey = getTenantKey(MOVEMENTS_KEY);
  const previousSales = salesKey ? window.localStorage.getItem(salesKey) : null;
  const previousStock = stockKey ? window.localStorage.getItem(stockKey) : null;
  const previousMovements = movementsKey ? window.localStorage.getItem(movementsKey) : null;

  try {
    saveWarehouseStock(stock);
    writeJson(MOVEMENTS_KEY, movements);
    writeSales(sales);

    window.dispatchEvent(new Event("sales:changed"));
    window.dispatchEvent(new Event("warehouse:changed"));

    return true;
  } catch (error) {
    if (previousStock === null) {
      if (stockKey) window.localStorage.removeItem(stockKey);
    } else if (stockKey) {
      window.localStorage.setItem(stockKey, previousStock);
    }

    if (previousMovements === null) {
      if (movementsKey) window.localStorage.removeItem(movementsKey);
    } else if (movementsKey) {
      window.localStorage.setItem(movementsKey, previousMovements);
    }

    if (previousSales === null) {
      if (salesKey) window.localStorage.removeItem(salesKey);
    } else if (salesKey) {
      window.localStorage.setItem(salesKey, previousSales);
    }

    throw error;
  }
};

const generateSaleNumber = (sales) => {
  const year = new Date().getFullYear();
  const count = sales.length + 1;
  let number = `SO-${year}-${String(count).padStart(5, "0")}`;
  const used = new Set(sales.map((sale) => sale.number));
  let offset = count;

  while (used.has(number)) {
    offset += 1;
    number = `SO-${year}-${String(offset).padStart(5, "0")}`;
  }

  return number;
};

const getAvailableStock = (stockItem) =>
  Math.max(toNumber(stockItem?.quantity) - toNumber(stockItem?.reserved), 0);

const validateSaleInput = (sale) => {
  if (!sale.warehouseId) {
    throw new Error("Ombor tanlang.");
  }

  if (!Array.isArray(sale.items) || !sale.items.length) {
    throw new Error("Savatcha bo'sh.");
  }

  sale.items.forEach((item) => {
    if (!item.productId || toNumber(item.quantity) <= 0) {
      throw new Error("Mahsulot miqdori 0 dan katta bo'lishi kerak.");
    }
  });

  if (sale.discountType === "PERCENT" && toNumber(sale.discountValue) > 100) {
    throw new Error("Foiz chegirma 100% dan oshmasin.");
  }

  if (toNumber(sale.discountValue) < 0) {
    throw new Error("Chegirma manfiy bo'lmasin.");
  }

  if (Array.isArray(sale.payments)) {
    sale.payments.forEach((payment) => {
      if (toNumber(payment.amount) < 0) {
        throw new Error("To'lov summasi manfiy bo'lmasin.");
      }
    });
  }
};

export const getStoredSales = () => {
  const remoteSales = unwrapList(syncApiRequest("/sales"), ["sales"]);

  if (Array.isArray(remoteSales)) {
    writeSales(remoteSales);
    return remoteSales.map(normalizeSale);
  }

  const stored = readJson(STORAGE_KEY, null);

  if (!Array.isArray(stored)) {
    writeSales([]);

    return [];
  }

  const normalizedSales = stored.map(normalizeSale);
  writeSales(normalizedSales);

  return normalizedSales;
};

export const saveSales = (sales) => {
  if (!Array.isArray(sales)) {
    return false;
  }

  const result = writeSales(sales);

  if (canUseStorage()) {
    window.dispatchEvent(new Event("sales:changed"));
  }

  return result;
};

export const getSaleById = (saleId) =>
  getStoredSales().find((sale) => sale.id === saleId) || null;

export const createSale = (values) => {
  const remoteSale = syncApiRequest("/sales", {
    method: "POST",
    body: values,
  });

  if (remoteSale?.id) {
    const sales = getStoredSales();
    saveSales([remoteSale, ...sales.filter((sale) => sale.id !== remoteSale.id)]);
    return normalizeSale(remoteSale);
  }

  const sales = getStoredSales();
  const now = nowIso();
  const sale = normalizeSale({
    ...values,
    id: values.id || createId("sale"),
    number: values.number || generateSaleNumber(sales),
    status: values.status || "DRAFT",
    createdAt: now,
    updatedAt: now,
  });

  saveSales([sale, ...sales]);

  return sale;
};

export const updateSale = (updatedSale) => {
  const remoteSale = updatedSale?.status === "DRAFT"
    ? syncApiRequest("/sales", {
        method: "POST",
        body: updatedSale,
      })
    : null;

  if (remoteSale?.id) {
    const sales = getStoredSales();
    saveSales(sales.map((sale) => (sale.id === remoteSale.id ? remoteSale : sale)));
    return normalizeSale(remoteSale);
  }

  const sales = getStoredSales();
  let result = null;

  const next = sales.map((sale) => {
    if (sale.id !== updatedSale.id) {
      return sale;
    }

    result = normalizeSale({
      ...sale,
      ...updatedSale,
      updatedAt: nowIso(),
    });

    return result;
  });

  saveSales(next);

  return result;
};

export const holdSale = (values) => {
  const remoteSale = syncApiRequest("/sales", {
    method: "POST",
    body: values,
  });

  if (remoteSale?.id) {
    const sales = getStoredSales();
    saveSales([remoteSale, ...sales.filter((sale) => sale.id !== remoteSale.id)]);
    return normalizeSale(remoteSale);
  }

  const sales = getStoredSales();
  const now = nowIso();
  const draft = normalizeSale({
    ...values,
    id: values.id || createId("sale"),
    number: values.number || generateSaleNumber(sales),
    status: "DRAFT",
    paidAmount: 0,
    payments: [],
    createdAt: values.createdAt || now,
    updatedAt: now,
  });

  const exists = sales.some((sale) => sale.id === draft.id);
  const next = exists
    ? sales.map((sale) => (sale.id === draft.id ? draft : sale))
    : [draft, ...sales];

  saveSales(next);

  return draft;
};

export const completeSale = (values) => {
  const idempotencyKey = values.id || `sale-complete-${Date.now()}`;
  const remoteSale = syncApiRequest("/sales/complete", {
    method: "POST",
    idempotencyKey,
    body: { ...values, idempotencyKey },
  });

  if (remoteSale?.id) {
    const sales = getStoredSales();
    saveSales([remoteSale, ...sales.filter((sale) => sale.id !== remoteSale.id)]);
    window.dispatchEvent(new Event("warehouse:changed"));
    window.dispatchEvent(new Event("finance:changed"));
    window.dispatchEvent(new Event("customers:changed"));
    return normalizeSale(remoteSale);
  }

  validateSaleInput(values);

  const products = getStoredProducts();
  const warehouses = getStoredWarehouses();
  const sales = getStoredSales();
  const stock = getStoredWarehouseStock();
  const movements = getWarehouseMovements();
  const now = nowIso();
  const warehouse = warehouses.find((item) => item.id === values.warehouseId);

  if (!warehouse || warehouse.status === "INACTIVE") {
    throw new Error("Faol ombor tanlang.");
  }

  const normalized = normalizeSale({
    ...values,
    status: "COMPLETED",
    completedAt: now,
    orderDate: values.orderDate || now,
    createdAt: values.createdAt || now,
    updatedAt: now,
  });

  if (normalized.debtAmount > 0 && !normalized.customerId) {
    throw new Error("Qarzga savdo uchun mijoz tanlanishi kerak.");
  }

  if (normalized.paidAmount > normalized.total) {
    throw new Error("To'lov summasi jami summadan oshmasin.");
  }

  const existing = values.id ? sales.find((sale) => sale.id === values.id) : null;

  if (existing?.status === "COMPLETED") {
    throw new Error("Bu savdo allaqachon yakunlangan.");
  }

  if (existing?.status === "CANCELLED") {
    throw new Error("Bekor qilingan savdoni yakunlab bo'lmaydi.");
  }

  const productMap = new Map(products.map((product) => [product.id, product]));
  const nextStock = stock.map((item) => ({ ...item }));
  const outMovements = [];

  normalized.items.forEach((item) => {
    const product = productMap.get(item.productId);

    if (!product || product.status !== "ACTIVE" || product.salePrice === null) {
      throw new Error(`${item.productName} faol sotuv mahsuloti emas.`);
    }

    const stockItem = nextStock.find(
      (entry) =>
        entry.warehouseId === normalized.warehouseId &&
        entry.productId === item.productId,
    );

    const available = getAvailableStock(stockItem);

    if (!stockItem || item.quantity > available) {
      throw new Error(
        `${item.productName} uchun yetarli qoldiq yo'q. Mavjud: ${available} ${item.unit}`,
      );
    }

    stockItem.quantity = roundMoney(toNumber(stockItem.quantity) - item.quantity);

    outMovements.push({
      id: createId("mov"),
      type: "OUT",
      warehouseId: normalized.warehouseId,
      productId: item.productId,
      productName: item.productName,
      quantity: item.quantity,
      unit: item.unit,
      reason: "SALE",
      source: normalized.number,
      saleId: normalized.id,
      note: normalized.note,
      createdAt: now,
    });
  });

  const sale = normalizeSale({
    ...normalized,
    id: normalized.id || createId("sale"),
    number: normalized.number || generateSaleNumber(sales),
  });

  outMovements.forEach((movement) => {
    movement.source = sale.number;
    movement.saleId = sale.id;
  });

  const nextSales = existing
    ? sales.map((item) => (item.id === existing.id ? sale : item))
    : [sale, ...sales];

  commitBatch({
    sales: nextSales,
    stock: nextStock,
    movements: [...outMovements, ...movements],
  });

  return sale;
};

export const cancelSale = ({ saleId, reason = "" }) => {
  const remoteSale = syncApiRequest(`/sales/${saleId}/cancel`, {
    method: "POST",
    body: { reason },
  });

  if (remoteSale?.id) {
    const sales = getStoredSales();
    saveSales(sales.map((sale) => (sale.id === remoteSale.id ? remoteSale : sale)));
    window.dispatchEvent(new Event("warehouse:changed"));
    window.dispatchEvent(new Event("finance:changed"));
    window.dispatchEvent(new Event("customers:changed"));
    return normalizeSale(remoteSale);
  }

  const sales = getStoredSales();
  const sale = sales.find((item) => item.id === saleId);

  if (!sale) {
    throw new Error("Savdo topilmadi.");
  }

  if (sale.status === "CANCELLED") {
    throw new Error("Bu savdo allaqachon bekor qilingan.");
  }

  if (sale.status !== "COMPLETED") {
    throw new Error("Faqat yakunlangan savdoni bekor qilish mumkin.");
  }

  const now = nowIso();
  const stock = getStoredWarehouseStock().map((item) => ({ ...item }));
  const movements = getWarehouseMovements();
  const inMovements = [];

  sale.items.forEach((item) => {
    const returnedQuantity = (sale.returns || [])
      .filter((returnItem) => returnItem.productId === item.productId)
      .reduce((total, returnItem) => total + toNumber(returnItem.quantity), 0);
    const quantityToRestore = roundMoney(Math.max(item.quantity - returnedQuantity, 0));

    if (quantityToRestore <= 0) {
      return;
    }

    let stockItem = stock.find(
      (entry) =>
        entry.warehouseId === sale.warehouseId &&
        entry.productId === item.productId,
    );

    if (!stockItem) {
      stockItem = {
        id: createId("stock"),
        warehouseId: sale.warehouseId,
        productId: item.productId,
        productName: item.productName,
        sku: item.sku,
        unit: item.unit,
        quantity: 0,
        reserved: 0,
        minimumStock: 0,
        cost: item.cost,
      };
      stock.push(stockItem);
    }

    stockItem.quantity = roundMoney(toNumber(stockItem.quantity) + quantityToRestore);

    inMovements.push({
      id: createId("mov"),
      type: "IN",
      warehouseId: sale.warehouseId,
      productId: item.productId,
      productName: item.productName,
      quantity: quantityToRestore,
      unit: item.unit,
      reason: "SALE_CANCEL",
      source: sale.number,
      saleId: sale.id,
      note: reason,
      createdAt: now,
    });
  });

  const cancelledSale = normalizeSale({
    ...sale,
    status: "CANCELLED",
    cancelledAt: now,
    note: [sale.note, reason].filter(Boolean).join(" | "),
    updatedAt: now,
  });

  commitBatch({
    sales: sales.map((item) => (item.id === sale.id ? cancelledSale : item)),
    stock,
    movements: [...inMovements, ...movements],
  });

  return cancelledSale;
};

export const returnSaleItems = ({ saleId, items = [], reason = "" }) => {
  const remoteSale = syncApiRequest(`/sales/${saleId}/return`, {
    method: "POST",
    body: { items, reason },
  });

  if (remoteSale?.id) {
    const sales = getStoredSales();
    saveSales(sales.map((sale) => (sale.id === remoteSale.id ? remoteSale : sale)));
    window.dispatchEvent(new Event("warehouse:changed"));
    window.dispatchEvent(new Event("finance:changed"));
    window.dispatchEvent(new Event("customers:changed"));
    return normalizeSale(remoteSale);
  }

  const sales = getStoredSales();
  const sale = sales.find((item) => item.id === saleId);

  if (!sale) {
    throw new Error("Savdo topilmadi.");
  }

  if (sale.status !== "COMPLETED") {
    throw new Error("Faqat yakunlangan savdodan qaytarish mumkin.");
  }

  const returnItems = items
    .map((item) => ({
      ...item,
      quantity: roundMoney(item.quantity),
      refundAmount: roundMoney(item.refundAmount),
    }))
    .filter((item) => item.quantity > 0);

  if (!returnItems.length) {
    throw new Error("Qaytariladigan mahsulot tanlang.");
  }

  const now = nowIso();
  const stock = getStoredWarehouseStock().map((item) => ({ ...item }));
  const movements = getWarehouseMovements();
  const inMovements = [];
  const normalizedReturns = [];

  returnItems.forEach((returnItem) => {
    const soldItem = sale.items.find((item) => item.productId === returnItem.productId);

    if (!soldItem) {
      throw new Error("Qaytariladigan mahsulot savdoda topilmadi.");
    }

    const alreadyReturned = (sale.returns || [])
      .filter((item) => item.productId === returnItem.productId)
      .reduce((total, item) => total + toNumber(item.quantity), 0);
    const availableToReturn = roundMoney(soldItem.quantity - alreadyReturned);

    if (returnItem.quantity > availableToReturn) {
      throw new Error(
        `${soldItem.productName} bo'yicha qaytarish miqdori sotilganidan oshmasin.`,
      );
    }

    const maxRefund = roundMoney(soldItem.price * returnItem.quantity);

    if (returnItem.refundAmount > maxRefund) {
      throw new Error("Qaytarish summasi mahsulot summasidan oshmasin.");
    }

    let stockItem = stock.find(
      (entry) =>
        entry.warehouseId === sale.warehouseId &&
        entry.productId === returnItem.productId,
    );

    if (!stockItem) {
      stockItem = {
        id: createId("stock"),
        warehouseId: sale.warehouseId,
        productId: soldItem.productId,
        productName: soldItem.productName,
        sku: soldItem.sku,
        unit: soldItem.unit,
        quantity: 0,
        reserved: 0,
        minimumStock: 0,
        cost: soldItem.cost,
      };
      stock.push(stockItem);
    }

    stockItem.quantity = roundMoney(toNumber(stockItem.quantity) + returnItem.quantity);

    const normalizedReturn = normalizeReturn({
      productId: soldItem.productId,
      productName: soldItem.productName,
      sku: soldItem.sku,
      unit: soldItem.unit,
      quantity: returnItem.quantity,
      refundAmount: returnItem.refundAmount,
      reason: returnItem.reason || reason,
      createdAt: now,
    });

    normalizedReturns.push(normalizedReturn);

    inMovements.push({
      id: createId("mov"),
      type: "IN",
      warehouseId: sale.warehouseId,
      productId: soldItem.productId,
      productName: soldItem.productName,
      quantity: returnItem.quantity,
      unit: soldItem.unit,
      reason: "SALE_RETURN",
      source: sale.number,
      saleId: sale.id,
      returnId: normalizedReturn.id,
      note: normalizedReturn.reason,
      createdAt: now,
    });
  });

  const allReturns = [...normalizedReturns, ...(sale.returns || [])];
  const allItemsReturned = sale.items.every((item) => {
    const returnedQuantity = allReturns
      .filter((returnItem) => returnItem.productId === item.productId)
      .reduce((total, returnItem) => total + toNumber(returnItem.quantity), 0);

    return returnedQuantity >= item.quantity;
  });

  const returnedSale = normalizeSale({
    ...sale,
    returns: allReturns,
    returnStatus: allItemsReturned ? "RETURNED" : "PARTIALLY_RETURNED",
    updatedAt: now,
  });

  commitBatch({
    sales: sales.map((item) => (item.id === sale.id ? returnedSale : item)),
    stock,
    movements: [...inMovements, ...movements],
  });

  return returnedSale;
};
