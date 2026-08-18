import { getLocale, translateText } from "../../../localization/i18n";

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
  const amount = Number(value || 0);
  const currency = formats.currency || "UZS";
  const precision = Number(formats.numberPrecision || 0);
  const locale = formats.moneyFormat === "comma-code" ? "en-US" : getLocale(formats.language);
  const formatted = new Intl.NumberFormat(locale, {
    minimumFractionDigits: precision,
    maximumFractionDigits: precision,
  }).format(amount);

  if (formats.moneyFormat === "comma-code") {
    return `${formatted} ${currency}`;
  }

  return `${formatted} ${currency === "UZS" ? translateText("so'm", { language: formats.language }) : currency}`;
};

export const formatQuantityWithSettings = (value, formats = {}) => {
  const precision = Number(formats.quantityPrecision ?? 2);

  return Number(value || 0).toLocaleString(getLocale(formats.language), {
    minimumFractionDigits: 0,
    maximumFractionDigits: precision,
  });
};
