import { getStoredProducts } from "../../../products/utils/productsStorage";
import { getLocale } from "../../../../localization/i18n";
import { roundDecimal } from "../../../../shared/utils/number";
import { convertQuantity } from "../../../../shared/utils/units";

const roundQuantity = (value) => roundDecimal(value, 6);

const roundMoney = (value) => Math.round((Number(value) || 0) * 100) / 100;

const getProductMap = () =>
  new Map(getStoredProducts().map((product) => [product.id, product]));

const safeConvertQuantity = (value, from, to) => {
  try {
    return convertQuantity(value, from, to);
  } catch {
    return Number(value || 0);
  }
};

export const formatProductionQuantity = (value) => {
  const number = roundQuantity(value);

  return new Intl.NumberFormat(getLocale(), {
    maximumFractionDigits: 6,
  }).format(number);
};

export const getBomProductSnapshot = (bom) => {
  if (!bom) {
    return null;
  }

  const product = getProductMap().get(bom.productId);

  return {
    productId: bom.productId,
    productName: product?.name || bom.productName || "",
    productSku: product?.sku || bom.productSku || "",
    outputQuantity: Number(bom.outputQuantity || 0),
    unit: product?.unit || bom.unit || "dona",
    bomVersion: bom.version || "1.0",
  };
};

export const calculateRequiredMaterials = ({ bom, plannedQuantity }) => {
  if (!bom) {
    return [];
  }

  const outputQuantity = Number(bom.outputQuantity || 0);
  const targetQuantity = Number(plannedQuantity || 0);

  if (outputQuantity <= 0 || targetQuantity <= 0) {
    return [];
  }

  const products = getProductMap();
  const multiplier = targetQuantity / outputQuantity;

  return (bom.materials || []).map((material) => {
    const product = products.get(material.productId);
    const bomQuantity = Number(material.quantity || 0);
    const recipeUnit = material.unit || product?.unit || "dona";
    const productUnit = product?.unit || recipeUnit;
    const requiredQuantity = roundQuantity(
      safeConvertQuantity(bomQuantity * multiplier, recipeUnit, productUnit),
    );
    const cost = Number(product?.cost ?? material.cost ?? 0);

    return {
      id: material.id || material.productId,
      productId: material.productId,
      productName: product?.name || material.productName || "",
      sku: product?.sku || material.sku || "",
      unit: productUnit,
      bomQuantity,
      requiredQuantity,
      cost,
      totalCost: roundMoney(requiredQuantity * cost),
    };
  });
};

export const calculateProductionMaterialCost = (materials = []) =>
  roundMoney(
    materials.reduce(
      (total, material) => total + Number(material.totalCost || 0),
      0,
    ),
  );
