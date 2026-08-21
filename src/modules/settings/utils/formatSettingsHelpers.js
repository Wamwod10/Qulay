import { getLocale } from "../../../localization/i18n";
import { normalizeCurrency } from "../../../shared/utils/currency";
import { roundDecimal } from "../../../shared/utils/number";

export const formatDateWithSettings = (value, formats = {}) => {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yyyy = String(date.getFullYear());
  const dateFormat = formats.dateFormat || "DD.MM.YYYY";

  if (dateFormat === "DD/MM/YYYY") {
    return `${dd}/${mm}/${yyyy}`;
  }

  if (dateFormat === "YYYY-MM-DD") {
    return `${yyyy}-${mm}-${dd}`;
  }

  return `${dd}.${mm}.${yyyy}`;
};

export const formatTimeWithSettings = (value, formats = {}) => {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleTimeString(getLocale(formats.language), {
    hour: "2-digit",
    minute: "2-digit",
    hour12: formats.timeFormat === "12h",
  });
};

export const formatMoneyWithSettings = (value, formats = {}) => {
  const amount = roundDecimal(value, 2);
  const currency = normalizeCurrency(formats.currency || "UZS");
  const precision = Math.max(Number(formats.numberPrecision ?? 2), 2);
  const locale = formats.moneyFormat === "comma-code" ? "en-US" : getLocale(formats.language);
  const formatted = new Intl.NumberFormat(locale, {
    minimumFractionDigits: precision,
    maximumFractionDigits: precision,
  }).format(amount);

  if (formats.moneyFormat === "comma-code") {
    return `${formatted} ${currency}`;
  }

  return `${formatted} ${currency}`;
};

export const calculateVat = (amount, percent) => {
  const base = Number(amount || 0);
  const rate = Number(percent || 0);
  if (!Number.isFinite(base) || !Number.isFinite(rate)) return 0;
  return Number((base * rate / 100).toFixed(2));
};

export const formatQuantityWithSettings = (value, formats = {}) => {
  const precision = Number(formats.quantityPrecision ?? 2);

  return roundDecimal(value, precision).toLocaleString(getLocale(formats.language), {
    minimumFractionDigits: 0,
    maximumFractionDigits: precision,
  });
};
