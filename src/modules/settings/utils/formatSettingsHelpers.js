import { getLocale } from "../../../localization/i18n";
import { normalizeCurrency } from "../../../shared/utils/currency";
import { roundDecimal } from "../../../shared/utils/number";

export const formatDateWithSettings = (value, formats = {}) => {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
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
    return "-";
  }

  return date.toLocaleTimeString(getLocale(formats.language), {
    hour: "2-digit",
    minute: "2-digit",
    hour12: formats.timeFormat === "12h",
  });
};

export const formatMoneyWithSettings = (value, formats = {}) => {
  const fromCurrency = normalizeCurrency(formats.fromCurrency || formats.originalCurrency || formats.baseCurrency || "UZS");
  const currency = normalizeCurrency(formats.displayCurrency || formats.currency || "UZS");
  const conversion = convertCurrency(value, fromCurrency, currency, formats);
  if (!conversion.available) {
    return "Kurs mavjud emas";
  }
  const precision = getCurrencyPrecision(currency, formats);
  const amount = roundDecimal(conversion.amount, precision);
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

const getCurrencyPrecision = (currency, formats = {}) => {
  if (formats.numberPrecision !== undefined) {
    return Math.max(Number(formats.numberPrecision) || 0, currency === "UZS" ? 0 : 2);
  }

  return currency === "UZS" ? 0 : 2;
};

const extractRateValue = (value) => {
  if (value && typeof value === "object") {
    return Number(value.rate ?? value.value ?? value.exchangeRate);
  }

  return Number(value);
};

export const getExchangeRate = (fromCurrency, toCurrency, formats = {}) => {
  const from = normalizeCurrency(fromCurrency || formats.baseCurrency || "UZS");
  const to = normalizeCurrency(toCurrency || formats.displayCurrency || formats.currency || "UZS");
  if (from === to) {
    return { available: true, rate: 1, source: "same-currency", fallback: false };
  }

  const rates = formats.fxRates || {};
  const direct =
    rates[`${from}:${to}`] ??
    rates[`${from}_${to}`] ??
    rates?.[from]?.[to]?.rate ??
    rates?.[from]?.[to];
  const inverse =
    rates[`${to}:${from}`] ??
    rates[`${to}_${from}`] ??
    rates?.[to]?.[from]?.rate ??
    rates?.[to]?.[from];
  const directRate = extractRateValue(direct);
  if (Number.isFinite(directRate) && directRate > 0) {
    return {
      available: true,
      rate: directRate,
      source: direct?.source || formats.fxProvider || "backend-fx",
      fallback: Boolean(direct?.fallback),
      fetchedAt: direct?.fetchedAt || null,
      effectiveAt: direct?.effectiveAt || formats.fxUpdatedAt || null,
    };
  }
  const inverseRate = extractRateValue(inverse);
  if (Number.isFinite(inverseRate) && inverseRate > 0) {
    return {
      available: true,
      rate: 1 / inverseRate,
      source: inverse?.source || "backend-fx-inverse",
      fallback: true,
      fetchedAt: inverse?.fetchedAt || null,
      effectiveAt: inverse?.effectiveAt || formats.fxUpdatedAt || null,
    };
  }

  return { available: false, rate: null, source: null, fallback: true };
};

export const convertCurrency = (value, fromCurrency, toCurrency, formats = {}) => {
  const amount = Number(value || 0);
  const rate = getExchangeRate(fromCurrency, toCurrency, formats);
  if (!rate.available) {
    return { ...rate, amount: null, fromCurrency, toCurrency };
  }

  return {
    ...rate,
    amount: amount * rate.rate,
    fromCurrency,
    toCurrency,
    effectiveAt: rate.effectiveAt || formats.fxUpdatedAt || null,
  };
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
