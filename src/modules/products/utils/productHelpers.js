import { PRODUCT_TYPES } from "../constants/productTypes";
import { getLocale, translateText } from "../../../localization/i18n";
import { formatMoneyWithSettings } from "../../settings/utils/formatSettingsHelpers";
import { getPlatformSettings } from "../../settings/utils/settingsStorage";

export const getProductTypeLabel = (type) => {
  const productType = PRODUCT_TYPES.find((item) => item.value === type);

  return translateText(productType?.label || type || "-");
};

export const getStockStatus = (product) => {
  const stock = Number(product.stock) || 0;
  const minimumStock = Number(product.minimumStock) || 0;

  if (stock <= 0) {
    return "OUT_OF_STOCK";
  }

  if (stock <= minimumStock) {
    return "LOW_STOCK";
  }

  return "IN_STOCK";
};

export const getStockStatusLabel = (product) => {
  const status = getStockStatus(product);

  switch (status) {
    case "OUT_OF_STOCK":
      return translateText("Tugagan");

    case "LOW_STOCK":
      return translateText("Kam qolgan");

    default:
      return translateText("Yetarli");
  }
};

export const getStockBadgeVariant = (product) => {
  const status = getStockStatus(product);

  switch (status) {
    case "OUT_OF_STOCK":
      return "danger";

    case "LOW_STOCK":
      return "warning";

    default:
      return "success";
  }
};

export const getProductStatusLabel = (status) => {
  switch (status) {
    case "ACTIVE":
      return translateText("Faol");

    case "INACTIVE":
      return translateText("Faol emas");

    case "ARCHIVED":
      return translateText("Arxiv");

    default:
      return status || "-";
  }
};

export const getProductStatusBadgeVariant = (status) => {
  switch (status) {
    case "ACTIVE":
      return "success";

    case "ARCHIVED":
      return "warning";

    case "INACTIVE":
      return "neutral";

    default:
      return "neutral";
  }
};

export const formatProductPrice = (value) => {
  if (value === null || value === undefined || value === "") {
    return "-";
  }

  return formatMoneyWithSettings(Number(value) || 0, getPlatformSettings().formats);
};
