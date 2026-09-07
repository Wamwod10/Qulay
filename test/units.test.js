import assert from "node:assert/strict";
import test from "node:test";

import { aggregateQuantities, convertQuantity } from "../src/shared/utils/units.js";
import { formatDecimal, roundDecimal } from "../src/shared/utils/number.js";
import { setCurrentLanguage, translateText } from "../src/localization/i18n.js";
import { convertCurrency, formatMoneyWithSettings } from "../src/modules/settings/utils/formatSettingsHelpers.js";
import {
  isUncategorizedProduct,
  matchesProductCategory,
  UNCATEGORIZED_CATEGORY_FILTER,
} from "../src/modules/products/utils/productCategoryFilters.js";

test("frontend unit conversion rejects mixed dimensions", () => {
  assert.equal(convertQuantity(1000, "g", "kg"), 1);
  assert.equal(convertQuantity(1000, "ml", "litr"), 1);
  assert.throws(() => convertQuantity(1, "kg", "litr"), /UNIT_DIMENSION_MISMATCH/);
});

test("frontend quantity summary keeps dimensions separate", () => {
  const summary = aggregateQuantities([
    { unit: "kg", requiredQuantity: 0.5 },
    { unit: "g", requiredQuantity: 500 },
    { unit: "litr", requiredQuantity: 1.25 },
    { unit: "sm", requiredQuantity: 150.5 },
    { unit: "dona", requiredQuantity: 2 },
  ]);

  assert.deepEqual(summary.map(({ dimension, value, unit }) => ({ dimension, value, unit })), [
    { dimension: "WEIGHT", value: 1, unit: "kg" },
    { dimension: "VOLUME", value: 1.25, unit: "litr" },
    { dimension: "LENGTH", value: 1.505, unit: "metr" },
    { dimension: "COUNT", value: 2, unit: "dona" },
  ]);
});

test("frontend decimal formatter removes floating point noise", () => {
  assert.equal(roundDecimal(0.1 + 0.2, 6), 0.3);
  assert.equal(formatDecimal(1.60000000004, { precision: 6, locale: "en-US" }), "1.6");
});

test("frontend i18n does not repair valid Cyrillic business text", () => {
  setCurrentLanguage("uz");
  assert.equal(translateText("Селес"), "Селес");

  setCurrentLanguage("tj");
  assert.equal(translateText("Селес"), "Селес");

  setCurrentLanguage("uz");
});

test("frontend money uses TJS as its canonical and display currency", () => {
  const formats = { baseCurrency: "TJS", displayCurrency: "TJS", currency: "TJS" };

  assert.equal(convertCurrency(20.5, "TJS", "TJS", formats).amount, 20.5);
  assert.equal(formatMoneyWithSettings(20.5, formats), "20,50 somoni");
});

test("frontend legacy currency settings fall back to TJS", () => {
  assert.equal(formatMoneyWithSettings(20.5, {
    baseCurrency: "UZS",
    displayCurrency: "UZS",
    currency: "UZS",
  }), "20,50 somoni");
});

test("product category filter matches linked and legacy categories", () => {
  assert.equal(
    matchesProductCategory(
      { categoryId: "category-1", category: "Ichimliklar" },
      "category-1",
      "Ichimliklar",
    ),
    true,
  );
  assert.equal(
    matchesProductCategory(
      { categoryId: null, category: "Ichimliklar" },
      "category-1",
      "Ichimliklar",
    ),
    true,
  );
  assert.equal(
    matchesProductCategory(
      { categoryId: "category-2", category: "Xomashyo" },
      "category-1",
      "Ichimliklar",
    ),
    false,
  );
});

test("uncategorized product filter only matches products without category data", () => {
  assert.equal(isUncategorizedProduct({ categoryId: null, category: "" }), true);
  assert.equal(isUncategorizedProduct({}), true);
  assert.equal(isUncategorizedProduct({ categoryId: "category-1", category: "" }), false);
  assert.equal(isUncategorizedProduct({ categoryId: null, category: "Ichimliklar" }), false);
  assert.equal(
    matchesProductCategory(
      { categoryId: null, category: null },
      UNCATEGORIZED_CATEGORY_FILTER,
    ),
    true,
  );
});
