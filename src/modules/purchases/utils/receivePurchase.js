import {
    addWarehouseMovement,
    getStoredWarehouseStock,
    saveWarehouseStock,
} from "../../warehouse/utils/warehouseStorage";

import {
    getStoredProducts,
} from "../../products/utils/productsStorage";
import { syncApiRequest, unwrapList } from "../../../services/api/syncApi";

export const receivePurchaseIntoWarehouse = ({
    purchase,
    receivedItems,
}) => {
    if (!purchase) {
        throw new Error(
            "Xarid topilmadi.",
        );
    }

    if (
        purchase.status ===
        "RECEIVED" ||
        purchase.status ===
        "CANCELLED"
    ) {
        throw new Error(
            "Bu xaridni qabul qilib bo‘lmaydi.",
        );
    }

    if (
        !Array.isArray(
            receivedItems,
        ) ||
        !receivedItems.length
    ) {
        throw new Error(
            "Qabul qilinadigan mahsulotlarni kiriting.",
        );
    }

    const remotePurchase = syncApiRequest(`/purchases/${purchase.id}/receive`, {
        method: "POST",
        body: {
            receivedItems: receivedItems.map((item) => ({
                purchaseItemId: item.itemId,
                productId: item.productId,
                quantity: item.quantity,
            })),
        },
    });

    if (remotePurchase?.id) {
        const remoteStock = unwrapList(syncApiRequest("/inventory/stock"), ["stock"]);
        if (Array.isArray(remoteStock)) {
            saveWarehouseStock(remoteStock);
            window.dispatchEvent(new Event("warehouse:changed"));
            return remoteStock;
        }
    }

    const currentStock =
        getStoredWarehouseStock();

    const products =
        getStoredProducts();

    const updatedStock = [
        ...currentStock,
    ];

    receivedItems.forEach(
        (receivedItem) => {
            const amount =
                Number(
                    receivedItem.quantity ||
                    0,
                );

            if (amount <= 0) {
                return;
            }

            const purchaseItem =
                purchase.items.find(
                    (item) =>
                        item.id ===
                        receivedItem.itemId ||
                        item.productId ===
                        receivedItem.productId,
                );

            if (!purchaseItem) {
                throw new Error(
                    "Xarid mahsuloti topilmadi.",
                );
            }

            const alreadyReceived =
                Number(
                    purchaseItem.receivedQuantity ||
                    0,
                );

            const ordered =
                Number(
                    purchaseItem.quantity ||
                    0,
                );

            const remaining =
                ordered -
                alreadyReceived;

            if (amount > remaining) {
                throw new Error(
                    `${purchaseItem.productName}: qolgan miqdordan ko‘p qabul qilib bo‘lmaydi.`,
                );
            }

            const existingIndex =
                updatedStock.findIndex(
                    (stockItem) =>
                        stockItem.warehouseId ===
                        purchase.warehouseId &&
                        stockItem.productId ===
                        purchaseItem.productId,
                );

            if (existingIndex >= 0) {
                const existing =
                    updatedStock[
                    existingIndex
                    ];

                updatedStock[
                    existingIndex
                ] = {
                    ...existing,

                    quantity:
                        Number(
                            existing.quantity ||
                            0,
                        ) + amount,

                    cost:
                        Number(
                            purchaseItem.purchasePrice ||
                            existing.cost ||
                            0,
                        ),
                };
            } else {
                const product =
                    products.find(
                        (item) =>
                            item.id ===
                            purchaseItem.productId,
                    );

                updatedStock.push({
                    id:
                        `stock-${Date.now()}-${Math.random()
                            .toString(36)
                            .slice(2, 7)}`,

                    warehouseId:
                        purchase.warehouseId,

                    productId:
                        purchaseItem.productId,

                    productName:
                        purchaseItem.productName,

                    sku:
                        purchaseItem.sku,

                    type:
                        product?.type ||
                        "TRADING_PRODUCT",

                    category:
                        product?.category ||
                        "Boshqa",

                    unit:
                        purchaseItem.unit,

                    image:
                        product?.image ||
                        "",

                    quantity:
                        amount,

                    reserved: 0,

                    minimumStock:
                        Number(
                            product?.minimumStock ||
                            0,
                        ),

                    cost:
                        Number(
                            purchaseItem.purchasePrice ||
                            0,
                        ),
                });
            }

            addWarehouseMovement({
                type: "IN",

                warehouseId:
                    purchase.warehouseId,

                productId:
                    purchaseItem.productId,

                productName:
                    purchaseItem.productName,

                quantity:
                    amount,

                unit:
                    purchaseItem.unit,

                cost:
                    purchaseItem.purchasePrice,

                source:
                    `Xarid ${purchase.number}`,

                purchaseId:
                    purchase.id,

                supplierName:
                    purchase.supplierName,

                note:
                    "Xarid buyurtmasidan qabul qilindi.",
            });
        },
    );

    saveWarehouseStock(
        updatedStock,
    );

    return updatedStock;
};
