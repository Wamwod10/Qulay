export const SUPPORTED_CURRENCIES = [
  { value: "UZS", label: "UZS - so'm" },
  { value: "TJS", label: "TJS - somoni" },
  { value: "USD", label: "USD - dollar" },
  { value: "EUR", label: "EUR - euro" },
  { value: "RUB", label: "RUB - rubl" },
  { value: "KZT", label: "KZT - tenge" },
  { value: "KGS", label: "KGS - som" },
];

export const normalizeCurrency = (value) =>
  SUPPORTED_CURRENCIES.some((currency) => currency.value === value)
    ? value
    : "UZS";
