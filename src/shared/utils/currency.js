export const SUPPORTED_CURRENCIES = [
  { value: "TJS", label: "TJS - somon" },
];

export const CURRENCY_DISPLAY_LABELS = {
  TJS: "somon",
};

export const normalizeCurrency = (value) => {
  const normalized = String(value || "TJS").trim().toUpperCase();

  return SUPPORTED_CURRENCIES.some((currency) => currency.value === normalized)
    ? normalized
    : "TJS";
};

export const getCurrencyDisplayLabel = (currency) =>
  CURRENCY_DISPLAY_LABELS[normalizeCurrency(currency)] || normalizeCurrency(currency);
