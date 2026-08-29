export const SUPPORTED_CURRENCIES = [
  { value: "UZS", label: "UZS - so'm" },
  { value: "TJS", label: "TJS - Сомон" },
  { value: "USD", label: "USD - dollar" },
  { value: "EUR", label: "EUR - euro" },
  { value: "RUB", label: "RUB - rubl" },
  { value: "KZT", label: "KZT - tenge" },
  { value: "KGS", label: "KGS - som" },
];

export const CURRENCY_DISPLAY_LABELS = {
  UZS: "so'm",
  TJS: "Сомон",
  USD: "$",
  EUR: "€",
  RUB: "₽",
  KZT: "₸",
  KGS: "som",
};

export const normalizeCurrency = (value) => {
  const normalized = String(value || "UZS").trim().toUpperCase();

  return SUPPORTED_CURRENCIES.some((currency) => currency.value === normalized)
    ? normalized
    : "UZS";
};

export const getCurrencyDisplayLabel = (currency) =>
  CURRENCY_DISPLAY_LABELS[normalizeCurrency(currency)] || normalizeCurrency(currency);
