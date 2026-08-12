import {
    addWarehouseMovement,
    getStoredWarehouseStock,
    saveWarehouseStock,
} from "../../../warehouse/utils/warehouseStorage";

import {
    getStoredProducts,
} from "../../../products/utils/productsStorage";

import {
    getStoredProductionOrders,
    saveProductionOrders,
} from "../../utils/manufacturingStorage";

import {
    calculateActualProductionCost,
    calculateActualUnitCost,
    calculateOverheadCost,
    normalizeOverheadItems,
    positiveNumber,
} from "../../utils/productionCost";

const createStockId = () =>
    `stock-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 8)}`;

export const completeProductionOrder = ({
    orderId,
    producedQuantity,
    defectQuantity = 0,
    wasteQuantity = 0,
    actualMaterials = [],
    overheadCost,
    completionNote = "",
}) => {
    const orders =
        getStoredProductionOrders();

    const order =
        orders.find(
            (item) =>
                item.id === orderId,
        );

    if (!order) {
        throw new Error(
            "Ishlab chiqarish buyurtmasi topilmadi.",
        );
    }

    if (
        order.status !==
        "IN_PROGRESS"
    ) {
        throw new Error(
            "Faqat jarayondagi ishlab chiqarishni yakunlash mumkin.",
        );
    }

    const defect =
        positiveNumber(
            defectQuantity || 0,
        );

    const waste =
        positiveNumber(
            wasteQuantity || 0,
        );

    const plannedOutput =
        Number(
            order.plannedQuantity ||
            0,
        );

    const qualityAcceptedQuantity =
        order.qualityControl
            ?.acceptedQuantity !==
            undefined &&
            order.qualityControl
                ?.acceptedQuantity !==
            null
            ? positiveNumber(
                order.qualityControl
                    .acceptedQuantity,
            )
            : null;

    const produced =
        producedQuantity !==
            undefined &&
            producedQuantity !== null
            ? positiveNumber(
                producedQuantity,
            )
            : qualityAcceptedQuantity !==
                null
                ? Math.max(
                    qualityAcceptedQuantity -
                    waste,
                    0,
                )
                : Math.max(
                    plannedOutput -
                    defect -
                    waste,
                    0,
                );

    if (
        produced + defect + waste >
        plannedOutput
    ) {
        throw new Error(
            "Brak va yo'qotish reja miqdoridan oshmasligi kerak.",
        );
    }


    if (defect < 0 || waste < 0) {
        throw new Error(
            "Brak yoki yo‘qotish manfiy bo‘lishi mumkin emas.",
        );
    }

    const stock =
        getStoredWarehouseStock();

    const products =
        getStoredProducts();

    const updatedStock = [
        ...stock,
    ];

    let actualMaterialCost = 0;

    const preparedMaterials =
        (order.requiredMaterials || []).map(
            (plannedMaterial) => {
                const actual =
                    actualMaterials.find(
                        (item) =>
                            item.productId ===
                            plannedMaterial.productId,
                    );

                const plannedQuantity =
                    Number(
                        plannedMaterial.requiredQuantity ||
                        0,
                    );

                const actualQuantity =
                    positiveNumber(
                        actual?.actualQuantity ??
                        plannedQuantity,
                    );

                if (
                    actualQuantity < 0
                ) {
                    throw new Error(
                        `${plannedMaterial.productName}: real sarf noto‘g‘ri.`,
                    );
                }

                const stockIndex =
                    updatedStock.findIndex(
                        (stockItem) =>
                            stockItem.warehouseId ===
                            order.warehouseId &&
                            stockItem.productId ===
                            plannedMaterial.productId,
                    );

                if (stockIndex < 0) {
                    throw new Error(
                        `${plannedMaterial.productName} omborda topilmadi.`,
                    );
                }

                const stockItem =
                    updatedStock[
                    stockIndex
                    ];

                const currentQuantity =
                    Number(
                        stockItem.quantity || 0,
                    );

                if (
                    actualQuantity >
                    currentQuantity
                ) {
                    throw new Error(
                        `${plannedMaterial.productName}: ombordagi qoldiq real sarf uchun yetarli emas.`,
                    );
                }

                const currentReserved =
                    Number(
                        stockItem.reserved ||
                        0,
                    );

                const reservedToRelease =
                    Math.min(
                        plannedQuantity,
                        currentReserved,
                    );

                updatedStock[
                    stockIndex
                ] = {
                    ...stockItem,

                    quantity:
                        currentQuantity -
                        actualQuantity,

                    reserved:
                        Math.max(
                            currentReserved -
                            reservedToRelease,
                            0,
                        ),
                };

                const cost =
                    Number(
                        stockItem.cost ||
                        plannedMaterial.cost ||
                        0,
                    );

                const materialCost =
                    actualQuantity * cost;

                actualMaterialCost +=
                    materialCost;

                addWarehouseMovement({
                    type: "OUT",

                    warehouseId:
                        order.warehouseId,

                    productId:
                        plannedMaterial.productId,

                    productName:
                        plannedMaterial.productName,

                    quantity:
                        actualQuantity,

                    unit:
                        plannedMaterial.unit,

                    cost,

                    source:
                        `Ishlab chiqarish ${order.number}`,

                    productionOrderId:
                        order.id,

                    note:
                        "Ishlab chiqarishda xomashyo sarflandi.",
                });

                return {
                    ...plannedMaterial,

                    plannedQuantity,

                    actualQuantity,

                    actualCost:
                        materialCost,
                };
            },
        );

    const normalizedOverheadItems =
        normalizeOverheadItems(
            order.overheadItems,
        );

    const finalOverheadCost =
        positiveNumber(
            overheadCost ??
            calculateOverheadCost(
                normalizedOverheadItems,
            ),
        );

    const actualProductionCost =
        calculateActualProductionCost({
            actualMaterialCost,
            overheadCost:
                finalOverheadCost,
        });

    const actualUnitCost =
        calculateActualUnitCost({
            actualProductionCost,
            producedQuantity:
                produced,
        });

    /*
     * Tayyor mahsulotni Warehouse'ga kirim qilamiz.
     */
    if (produced > 0) {
        const finishedProduct =
            products.find(
                (product) =>
                    product.id ===
                    order.productId,
            );

        const finishedStockIndex =
            updatedStock.findIndex(
                (stockItem) =>
                    stockItem.warehouseId ===
                    order.warehouseId &&
                    stockItem.productId ===
                    order.productId,
            );

        if (
            finishedStockIndex >= 0
        ) {
            const current =
                updatedStock[
                finishedStockIndex
                ];

            updatedStock[
                finishedStockIndex
            ] = {
                ...current,

                quantity:
                    Number(
                        current.quantity || 0,
                    ) + produced,

                cost:
                    actualUnitCost,
            };
        } else {
            updatedStock.push({
                id:
                    createStockId(),

                warehouseId:
                    order.warehouseId,

                productId:
                    order.productId,

                productName:
                    order.productName,

                sku:
                    finishedProduct?.sku ||
                    "",

                type:
                    finishedProduct?.type ||
                    "FINISHED_GOOD",

                category:
                    finishedProduct?.category ||
                    "",

                unit:
                    order.unit,

                image:
                    finishedProduct?.image ||
                    "",

                quantity:
                    produced,

                reserved: 0,

                minimumStock:
                    Number(
                        finishedProduct?.minimumStock ||
                        0,
                    ),

                cost:
                    actualUnitCost,
            });
        }

        addWarehouseMovement({
            type: "IN",

            warehouseId:
                order.warehouseId,

            productId:
                order.productId,

            productName:
                order.productName,

            quantity:
                produced,

            unit:
                order.unit,

            cost:
                actualUnitCost,

            source:
                `Ishlab chiqarish ${order.number}`,

            productionOrderId:
                order.id,

            note:
                "Tayyor mahsulot ishlab chiqarishdan omborga qabul qilindi.",
        });
    }

    saveWarehouseStock(
        updatedStock,
    );

    const updatedOrder = {
        ...order,

        status:
            "COMPLETED",

        producedQuantity:
            produced,

        defectQuantity:
            defect,

        wasteQuantity:
            waste,

        actualMaterials:
            preparedMaterials,

        actualMaterialCost,

        overheadItems:
            normalizedOverheadItems,

        overheadCost:
            finalOverheadCost,

        actualProductionCost,

        actualUnitCost,

        completionNote:
            completionNote.trim(),

        completedAt:
            new Date().toLocaleString(
                "uz-UZ",
            ),
    };

    const updatedOrders =
        orders.map((item) =>
            item.id === order.id
                ? updatedOrder
                : item,
        );

    saveProductionOrders(
        updatedOrders,
    );

    return updatedOrder;
};
