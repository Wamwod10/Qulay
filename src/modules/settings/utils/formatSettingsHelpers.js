import { getLocale } from "../../../localization/i18n.js";
import { getCurrencyDisplayLabel, normalizeCurrency } from "../../../shared/utils/currency.js";
import { roundDecimal } from "../../../shared/utils/number.js";

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
  const fromCurrency = normalizeCurrency(formats.fromCurrency || formats.originalCurrency || formats.baseCurrency || "TJS");
  const currency = normalizeCurrency(formats.displayCurrency || formats.currency || "TJS");
  const conversion = convertCurrency(value, fromCurrency, currency, formats);
  if (!conversion.available) {
    return "Kurs mavjud emas";
  }
  const precision = getCurrencyPrecision(formats);
  const amount = roundDecimal(conversion.amount, precision);
  const locale = formats.moneyFormat === "comma-code" ? "en-US" : getLocale(formats.language);
  const formatted = new Intl.NumberFormat(locale, {
    minimumFractionDigits: precision,
    maximumFractionDigits: precision,
  }).format(amount);

  const displayLabel = getCurrencyDisplayLabel(currency);

  if (formats.moneyFormat === "comma-code") {
    return `${formatted} TJS`;
  }

  return `${formatted} ${displayLabel}`;
};

const getCurrencyPrecision = (formats = {}) => {
  if (formats.numberPrecision !== undefined) {
    return Math.max(Number(formats.numberPrecision) || 0, 2);
  }

  return 2;
};

const extractRateValue = (value) => {
  if (value && typeof value === "object") {
    return Number(value.rate ?? value.value ?? value.exchangeRate);
  }

  return Number(value);
};

export const getExchangeRate = (fromCurrency, toCurrency, formats = {}) => {
  const from = normalizeCurrency(fromCurrency || formats.baseCurrency || "TJS");
  const to = normalizeCurrency(toCurrency || formats.displayCurrency || formats.currency || "TJS");
  if (from === to) {
    return { available: true, rate: 1, source: "same-currency", fallback: false };
  }

  const rates = formats.fxRates || {};
  const readPair = (source, target) => {
    const direct =
      rates[`${source}:${target}`] ??
      rates[`${source}_${target}`] ??
      rates?.[source]?.[target]?.rate ??
      rates?.[source]?.[target];
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

    const inverse =
      rates[`${target}:${source}`] ??
      rates[`${target}_${source}`] ??
      rates?.[target]?.[source]?.rate ??
      rates?.[target]?.[source];
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

    return null;
  };

  const direct = readPair(from, to);
  if (direct) return direct;

  // SettingsRuntime loads one canonical base-currency table. Derive any
  // cross-rate from that table instead of making one HTTP request per pair.
  const base = normalizeCurrency(formats.baseCurrency || "TJS");
  const baseToFrom = from === base ? { available: true, rate: 1, fallback: false } : readPair(base, from);
  const baseToTo = to === base ? { available: true, rate: 1, fallback: false } : readPair(base, to);

  if (baseToFrom?.available && baseToTo?.available && baseToFrom.rate > 0) {
    return {
      available: true,
      rate: baseToTo.rate / baseToFrom.rate,
      source: "backend-fx-cross",
      fallback: Boolean(baseToFrom.fallback || baseToTo.fallback),
      fetchedAt: baseToTo.fetchedAt || baseToFrom.fetchedAt || null,
      effectiveAt: baseToTo.effectiveAt || baseToFrom.effectiveAt || formats.fxUpdatedAt || null,
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
