import assert from "node:assert/strict";
import test from "node:test";

import { aggregateQuantities, convertQuantity } from "../src/shared/utils/units.js";
import { formatDecimal, roundDecimal } from "../src/shared/utils/number.js";

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
