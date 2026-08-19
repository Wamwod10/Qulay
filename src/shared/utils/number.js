export const roundDecimal = (value, precision = 6) => {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  const factor = 10 ** precision;
  return Math.round((number + Number.EPSILON) * factor) / factor;
};

export const formatDecimal = (value, { precision = 6, minimumFractionDigits = 0, locale } = {}) => {
  const number = roundDecimal(value, precision);
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits,
    maximumFractionDigits: precision,
  }).format(number);
};
