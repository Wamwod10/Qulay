import { getLocale, translateText } from "../../../localization/i18n";

export const formatAgentMoney = (
  value,
) => {
  const number = Number(value);

  return new Intl.NumberFormat(
    getLocale(),
  ).format(
    Number.isFinite(number) ? number : 0,
  );
};

export const getAgentStatusLabel = (
  status,
) => {
  return status === "ACTIVE"
    ? translateText("Faol")
    : translateText("Faol emas");
};

export const getAgentStatusVariant = (
  status,
) => {
  return status === "ACTIVE"
    ? "success"
    : "neutral";
};

export const formatAgentDate = (value) => {
  if (!value) {
    return translateText("Ma'lumot yo'q");
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleDateString(getLocale());
};

export const getAgentInitials = (name = "") => {
  const parts = name.trim().split(/\s+/).filter(Boolean);

  if (!parts.length) {
    return "A";
  }

  return parts
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
};
