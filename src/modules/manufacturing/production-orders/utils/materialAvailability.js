import {
    getStoredWarehouseStock,
} from "../../../warehouse/utils/warehouseStorage";

import { getStoredProducts } from "../../../products/utils/productsStorage";

export const checkMaterialAvailability = ({
    warehouseId,
    requiredMaterials = [],
}) => {
    const stock =
        getStoredWarehouseStock();

    const products = new Map(
        getStoredProducts().map(
            (product) => [
                product.id,
                product,
            ],
        ),
    );

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

            const available =
                stockItems.reduce(
                    (total, item) =>
                        total +
                        Number(
                            item.quantity ||
                            0,
                        ) -
                        Number(
                            item.reserved ||
                            0,
                        ),
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

                unit:
                    product?.unit ||
                    material.unit ||
                    stockItem?.unit ||
                    "",

                cost,

                warehouseQuantity:
                    stockItems.reduce(
                        (total, item) =>
                            total +
                            Number(
                                item.quantity ||
                                0,
                            ),
                        0,
                    ),

                reservedQuantity:
                    stockItems.reduce(
                        (total, item) =>
                            total +
                            Number(
                                item.reserved ||
                                0,
                            ),
                        0,
                    ),

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
