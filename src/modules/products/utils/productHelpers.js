import { PRODUCT_TYPES } from "../constants/productTypes";

export const getProductTypeLabel = (type) => {
  const productType = PRODUCT_TYPES.find((item) => item.value === type);

  return productType?.label || type || "-";
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
      return "Tugagan";

    case "LOW_STOCK":
      return "Kam qolgan";

    default:
      return "Yetarli";
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
      return "Faol";

    case "INACTIVE":
      return "Faol emas";

    case "ARCHIVED":
      return "Arxiv";

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

  return new Intl.NumberFormat("uz-UZ").format(Number(value) || 0);
};
