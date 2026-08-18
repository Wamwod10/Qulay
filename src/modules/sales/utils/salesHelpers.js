import {
  formatDateWithSettings,
  formatMoneyWithSettings,
  formatTimeWithSettings,
} from "../../settings/utils/formatSettingsHelpers";
import { getPlatformSettings } from "../../settings/utils/settingsStorage";
import { translateText } from "../../../localization/i18n";

const getFormats = () => {
  try {
    return getPlatformSettings().formats || {};
  } catch {
    return {};
  }
};

export const formatSaleMoney = (value) => {
  const formatted = formatMoneyWithSettings(value, getFormats());

  return formatted.replace(/\s(so'm|UZS|USD)$/, "");
};

export const formatSaleDate = (value) => {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return `${formatDateWithSettings(date, getFormats())} ${formatTimeWithSettings(date, getFormats())}`;
};

export const getSaleStatusLabel = (status) => {
  switch (status) {
    case "DRAFT":
      return translateText("Qoralama");
    case "COMPLETED":
      return translateText("Yakunlangan");
    case "CANCELLED":
      return translateText("Bekor qilingan");
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
      return translateText("To'langan");
    case "PARTIAL":
      return translateText("Qisman");
    default:
      return translateText("To'lanmagan");
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
      return translateText("To'liq qaytarilgan");
    case "PARTIALLY_RETURNED":
      return translateText("Qisman qaytarilgan");
    default:
      return translateText("Qaytarilmagan");
  }
};

export const getPaymentMethodLabel = (method) => {
  switch (method) {
    case "CASH":
      return translateText("Naqd");
    case "CARD":
      return translateText("Karta");
    case "BANK":
      return translateText("Bank");
    case "QR":
      return "QR";
    case "DEBT":
      return translateText("Qarz");
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
