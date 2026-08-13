export const formatSaleMoney = (value) =>
  new Intl.NumberFormat("uz-UZ").format(Number(value) || 0);

export const formatSaleDate = (value) => {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString("uz-UZ");
};

export const getSaleStatusLabel = (status) => {
  switch (status) {
    case "DRAFT":
      return "Qoralama";
    case "COMPLETED":
      return "Yakunlangan";
    case "CANCELLED":
      return "Bekor qilingan";
    default:
      return status || "-";
  }
};

export const getSaleStatusVariant = (status) => {
  switch (status) {
    case "COMPLETED":
      return "success";
    case "CANCELLED":
      return "danger";
    case "DRAFT":
      return "warning";
    default:
      return "neutral";
  }
};

export const getPaymentStatus = ({ total, paidAmount }) => {
  const saleTotal = Number(total || 0);
  const paid = Number(paidAmount || 0);

  if (saleTotal > 0 && paid >= saleTotal) {
    return "PAID";
  }

  if (paid > 0) {
    return "PARTIAL";
  }

  return "UNPAID";
};

export const getPaymentStatusLabel = (status) => {
  switch (status) {
    case "PAID":
      return "To'langan";
    case "PARTIAL":
      return "Qisman";
    default:
      return "To'lanmagan";
  }
};

export const getPaymentStatusVariant = (status) => {
  switch (status) {
    case "PAID":
      return "success";
    case "PARTIAL":
      return "warning";
    default:
      return "danger";
  }
};

export const getReturnStatusLabel = (status) => {
  switch (status) {
    case "RETURNED":
      return "To'liq qaytarilgan";
    case "PARTIALLY_RETURNED":
      return "Qisman qaytarilgan";
    default:
      return "Qaytarilmagan";
  }
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
    case "DEBT":
      return "Qarz";
    default:
      return method || "-";
  }
};

export const buildSaleSearchText = (sale) =>
  [
    sale.number,
    sale.customerName,
    sale.agentName,
    sale.warehouseName,
    sale.note,
    ...(sale.items || []).flatMap((item) => [item.productName, item.sku]),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
