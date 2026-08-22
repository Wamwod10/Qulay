const getFormats = () => {
  try {
    const settings = JSON.parse(localStorage.getItem("universal_erp_platform_settings") || "null");
    return settings?.formats || {};
  } catch {
    return {};
  }
};

export const parseDateTime = (value) => {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

export const formatAppDateTime = (value, formats = getFormats()) => {
  const date = parseDateTime(value);
  if (!date) return "-";

  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yyyy = String(date.getFullYear());
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");

  if (formats.timeFormat === "12h") {
    const hour12 = date.getHours() % 12 || 12;
    const suffix = date.getHours() >= 12 ? "PM" : "AM";
    return `${dd}.${mm}.${yyyy} ${String(hour12).padStart(2, "0")}:${minutes} ${suffix}`;
  }

  return `${dd}.${mm}.${yyyy} ${hours}:${minutes}`;
};

export const formatAppDate = (value, formats = getFormats()) => {
  const date = parseDateTime(value);
  if (!date) return "-";

  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yyyy = String(date.getFullYear());

  return `${dd}.${mm}.${yyyy}`;
};
