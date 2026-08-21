import { getStoredProducts } from "../../products/utils/productsStorage";
import { isLocalBusinessFallbackEnabled } from "../../auth/utils/tenantStorage";

import {
    getStoredWarehouseStock,
    saveWarehouseStock,
} from "./warehouseStorage";

import {
    getStoredWarehouses,
} from "./warehouseManagementStorage";

const WAREHOUSE_PRODUCT_TYPES = [
    "RAW_MATERIAL",
    "SEMI_FINISHED",
    "FINISHED_GOOD",
    "TRADING_PRODUCT",
];

export const syncWarehouseWithProducts = () => {
    if (!isLocalBusinessFallbackEnabled()) {
        return getStoredWarehouseStock();
    }

    const products = getStoredProducts();

    const warehouses = getStoredWarehouses();

    const currentStock =
        getStoredWarehouseStock();

    const warehouseProducts =
        products.filter((product) =>
            WAREHOUSE_PRODUCT_TYPES.includes(
                product.type,
            ),
        );

    const productMap = new Map(
        warehouseProducts.map((product) => [
            product.id,
            product,
        ]),
    );

    /*
     * 1. Mavjud qoldiq yozuvlari metadata'sini
     * Products bilan yangilaymiz.
     *
     * Product butunlay o‘chirilgan bo‘lsa,
     * uning warehouse recordini ham olib tashlaymiz.
     */
    let syncedStock = currentStock
        .filter((item) =>
            productMap.has(item.productId),
        )
        .map((item) => {
            const product =
                productMap.get(item.productId);

            return {
                ...item,

                productName:
                    product.name,

                sku:
                    product.sku,

                type:
                    product.type,

                category:
                    product.category,

                unit:
                    product.unit,

                image:
                    product.image || "",

                minimumStock:
                    Number(
                        product.minimumStock || 0,
                    ),

                cost:
                    Number(product.cost || 0),
            };
        });

    /*
     * 2. Products'da bor, lekin hali hech bir
     * omborda yo‘q mahsulotlarni topamiz.
     */
    const existingProductIds =
        new Set(
            syncedStock.map(
                (item) => item.productId,
            ),
        );

    const activeWarehouses =
        warehouses.filter(
            (warehouse) =>
                warehouse.status !== "INACTIVE",
        );

    const defaultWarehouse =
        activeWarehouses[0] ||
        warehouses[0];

    if (defaultWarehouse) {
        warehouseProducts.forEach(
            (product) => {
                if (
                    existingProductIds.has(
                        product.id,
                    )
                ) {
                    return;
                }

                syncedStock.push({
                    id:
                        `stock-${Date.now()}-${Math.random()
                            .toString(36)
                            .slice(2, 8)}`,

                    warehouseId:
                        defaultWarehouse.id,

                    productId:
                        product.id,

                    productName:
                        product.name,

                    sku:
                        product.sku,

                    type:
                        product.type,

                    category:
                        product.category,

                    unit:
                        product.unit,

                    image:
                        product.image || "",

                    quantity: 0,

                    reserved: 0,

                    minimumStock:
                        Number(
                            product.minimumStock || 0,
                        ),

                    cost:
                        Number(product.cost || 0),
                });
            },
        );
    }

    saveWarehouseStock(
        syncedStock,
    );

    return syncedStock;
};
