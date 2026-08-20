import {
    getStoredWarehouseStock,
} from "../../../warehouse/utils/warehouseStorage";

import { getStoredProducts } from "../../../products/utils/productsStorage";
import { convertQuantity, normalizeUnit } from "../../../../shared/utils/units";

const SOURCE_CACHE_TTL_MS = 5000;
let sourceCache = null;

const clearSourceCache = () => {
    sourceCache = null;
};

if (typeof window !== "undefined") {
    ["warehouse:changed", "products:changed", "storage"].forEach((eventName) => {
        window.addEventListener(eventName, clearSourceCache);
    });
}

const getSourceData = () => {
    if (sourceCache && Date.now() - sourceCache.createdAt < SOURCE_CACHE_TTL_MS) {
        return sourceCache;
    }

    sourceCache = {
        createdAt: Date.now(),
        stock: getStoredWarehouseStock(),
        products: new Map(getStoredProducts().map((product) => [product.id, product])),
    };

    return sourceCache;
};

export const checkMaterialAvailability = ({
    warehouseId,
    requiredMaterials = [],
}) => {
    const { stock, products } = getSourceData();

    return requiredMaterials.map(
        (material) => {
            const stockItems =
                stock.filter(
                    (item) =>
                        item.warehouseId ===
                        warehouseId &&
                        item.productId ===
                        material.productId,
                );

            const stockItem =
                stockItems[0];

            const product = products.get(
                material.productId,
            );

            const productUnit = product?.unit || material.unit || stockItem?.unit || "dona";
            const toProductUnit = (value, item) => {
                try {
                    return convertQuantity(value, item.unit || productUnit, productUnit);
                } catch {
                    return 0;
                }
            };

            const available = stockItems.reduce(
                (total, item) => total + toProductUnit(Number(item.quantity || 0), item) - toProductUnit(Number(item.reserved || 0), item),
                0,
            );

            const required =
                Number(
                    material.requiredQuantity ||
                    0,
                );

            const cost = Number(
                product?.cost ??
                material.cost ??
                stockItem?.cost ??
                0,
            );

            return {
                ...material,

                productName:
                    product?.name ||
                    material.productName ||
                    stockItem?.productName ||
                    "",

                sku:
                    product?.sku ||
                    material.sku ||
                    stockItem?.sku ||
                    "",

                unit: normalizeUnit(productUnit),

                cost,

                warehouseQuantity:
                    stockItems.reduce((total, item) => total + toProductUnit(Number(item.quantity || 0), item), 0),

                reservedQuantity:
                    stockItems.reduce((total, item) => total + toProductUnit(Number(item.reserved || 0), item), 0),

                availableQuantity:
                    Math.max(
                        available,
                        0,
                    ),

                enough:
                    available >= required,

                missingQuantity:
                    Math.max(
                        required -
                        available,
                        0,
                    ),

                totalCost:
                    Math.round(
                        required *
                        cost *
                        100,
                    ) / 100,
            };
        },
    );
};

export const hasEnoughMaterials = (
    materials = [],
) => {
    return materials.length > 0 && materials.every(
        (material) =>
            material.enough,
    );
};
