export const UNIT_DEFINITIONS = {
  dona: { dimension: "COUNT", base: "dona", factor: 1, label: "dona" },
  g: { dimension: "WEIGHT", base: "g", factor: 1, label: "g" },
  kg: { dimension: "WEIGHT", base: "g", factor: 1000, label: "kg" },
  ml: { dimension: "VOLUME", base: "ml", factor: 1, label: "ml" },
  litr: { dimension: "VOLUME", base: "ml", factor: 1000, label: "litr" },
  mm: { dimension: "LENGTH", base: "mm", factor: 1, label: "mm" },
  sm: { dimension: "LENGTH", base: "mm", factor: 10, label: "sm" },
  metr: { dimension: "LENGTH", base: "mm", factor: 1000, label: "metr" },
};

export const UNIT_OPTIONS = Object.entries(UNIT_DEFINITIONS).map(([value, definition]) => ({
  value,
  label: definition.label,
  dimension: definition.dimension,
}));

export const normalizeUnit = (unit) => UNIT_DEFINITIONS[unit] ? unit : "dona";

export const convertQuantity = (value, from, to) => {
  const source = UNIT_DEFINITIONS[normalizeUnit(from)];
  const target = UNIT_DEFINITIONS[normalizeUnit(to)];
  if (source.dimension !== target.dimension) {
    throw new Error("UNIT_DIMENSION_MISMATCH");
  }
  return Number(value || 0) * source.factor / target.factor;
};

export const quantityToBase = (value, unit) => {
  const definition = UNIT_DEFINITIONS[normalizeUnit(unit)];
  return Number(value || 0) * definition.factor;
};

export const aggregateQuantities = (items = [], quantityKey = "requiredQuantity") => {
  const totals = new Map();
  items.forEach((item) => {
    const unit = UNIT_DEFINITIONS[normalizeUnit(item.unit)];
    const value = quantityToBase(item[quantityKey], item.unit);
    totals.set(unit.dimension, { dimension: unit.dimension, base: unit.base, value: (totals.get(unit.dimension)?.value || 0) + value });
  });
  return [...totals.values()].map((total) => {
    const display = total.dimension === "WEIGHT" ? { value: roundDecimal(total.value / 1000), unit: "kg" } : total.dimension === "VOLUME" ? { value: roundDecimal(total.value / 1000), unit: "litr" } : total.dimension === "LENGTH" ? { value: roundDecimal(total.value / 1000), unit: "metr" } : { value: roundDecimal(total.value), unit: "dona" };
    return { ...total, ...display };
  });
};
import { roundDecimal } from "./number.js";
