import {
    addWarehouseMovement,
    getStoredWarehouseStock,
    saveWarehouseStock,
} from "../../../warehouse/utils/warehouseStorage";

import {
    getStoredProducts,
    saveProducts,
} from "../../../products/utils/productsStorage";
import { getLocale } from "../../../../localization/i18n";
import { apiRequest } from "../../../../services/api/apiClient";

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

import { convertQuantity, normalizeUnit } from "../../../../shared/utils/units";

const createStockId = () =>
    `stock-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 8)}`;

const prepareLocalPackaging = (rows, orderUnit) => (Array.isArray(rows) ? rows : []).map((row, index) => {
    const quantity = Number(row.quantity ?? row.count ?? 0);
    const packSize = Number(row.packSize ?? row.size ?? 0);
    if (!Number.isInteger(quantity) || quantity <= 0) {
        throw new Error("Qadoq soni butun son bo'lishi kerak.");
    }
    if (!Number.isFinite(packSize) || packSize <= 0) {
        throw new Error("Qadoq hajmi 0 dan katta bo'lishi kerak.");
    }
    const inputPackUnit = normalizeUnit(row.packUnit || orderUnit);
    const normalizedPackSize = convertQuantity(packSize, inputPackUnit, orderUnit);
    return {
        id: row.id || `package-${index + 1}`,
        productId: row.productId || null,
        productName: String(row.productName || row.name || "").trim(),
        quantity,
        packSize: normalizedPackSize,
        packUnit: normalizeUnit(orderUnit),
        materials: Array.isArray(row.materials) ? row.materials.filter((material) => material?.productId && Number(material.quantity) > 0).map((material) => ({ productId: material.productId, quantity: Number(material.quantity) })) : [],
    };
});

export const completeProductionOrder = async ({
    orderId,
    producedQuantity,
    defectQuantity = 0,
    wasteQuantity = 0,
    actualMaterials = [],
    packaging = [],
    overheadCost,
    completionNote = "",
}) => {
    const remoteOrder = await apiRequest(`/manufacturing/orders/${orderId}/complete`, {
        method: "POST",
        idempotencyKey: `production-complete:${orderId}`,
        body: { producedQuantity, defectQuantity, wasteQuantity, actualMaterials, packaging, overheadCost, completionNote },
    });
    if (remoteOrder?.id) {
        const orders = getStoredProductionOrders();
        saveProductionOrders(orders.map((item) => item.id === remoteOrder.id ? remoteOrder : item));
        window.dispatchEvent(new Event("warehouse:changed"));
        void (async () => {
            if (!remoteOrder.warehouseId) return;
            try {
                const result = await apiRequest(`/inventory/stock?warehouseId=${encodeURIComponent(remoteOrder.warehouseId)}`);
                const remoteStock = result?.stock || result?.data;
                if (Array.isArray(remoteStock)) {
                    saveWarehouseStock(remoteStock);
                    window.dispatchEvent(new Event("warehouse:changed"));
                }
            } catch {
                // The completed order remains authoritative; a later refresh will recover stock view.
            }
        })();
        return remoteOrder;
    }

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

    const normalizedPackaging = prepareLocalPackaging(packaging, order.unit);
    const packagedTotal = normalizedPackaging.reduce(
        (total, row) => total + row.quantity * row.packSize,
        0,
    );
    if (packagedTotal > produced) {
        throw new Error("Qadoqlangan jami mahsulot ishlab chiqarilgan miqdordan oshmasin.");
    }

    const stock =
        getStoredWarehouseStock();

    let products =
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

                const productUnit = normalizeUnit(
                    plannedMaterial.unit || products.find((product) => product.id === plannedMaterial.productId)?.unit || stockItem.unit,
                );
                const stockUnit = normalizeUnit(stockItem.unit || productUnit);
                let actualQuantityInStockUnit;
                let plannedQuantityInStockUnit;
                try {
                    actualQuantityInStockUnit = convertQuantity(actualQuantity, productUnit, stockUnit);
                    plannedQuantityInStockUnit = convertQuantity(plannedQuantity, productUnit, stockUnit);
                } catch {
                    throw new Error(`${plannedMaterial.productName}: o'lchov birliklari mos emas.`);
                }

                const currentQuantity =
                    Number(
                        stockItem.quantity || 0,
                    );

                if (
                    actualQuantityInStockUnit >
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
                        plannedQuantityInStockUnit,
                        currentReserved,
                    );

                updatedStock[
                    stockIndex
                ] = {
                    ...stockItem,

                    quantity:
                        currentQuantity -
                        actualQuantityInStockUnit,

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
                        productUnit,

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

                    unit: productUnit,

                    plannedQuantity,

                    actualQuantity,

                    actualCost:
                        materialCost,
                };
            },
        );

    const packagingMaterialCost = normalizedPackaging.reduce(
        (total, row) => total + row.materials.reduce(
            (rowTotal, material) => rowTotal + material.quantity * row.quantity * Number(products.find((product) => product.id === material.productId)?.cost || 0),
            0,
        ),
        0,
    );
    const totalMaterialCost = actualMaterialCost + packagingMaterialCost;

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
            actualMaterialCost: totalMaterialCost,
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
    const bulkQuantity = Math.max(produced - packagedTotal, 0);

    if (bulkQuantity > 0) {
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
                    ) + bulkQuantity,

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
                    bulkQuantity,

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
                bulkQuantity,

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

    for (const row of normalizedPackaging) {
        let packagedProduct = row.productId
            ? products.find((product) => product.id === row.productId)
            : products.find((product) => product.parentProductId === order.productId && Number(product.packSize) === Number(row.packSize) && product.isVariant);

        if (row.productId && !packagedProduct) {
            throw new Error("Qadoqlangan SKU topilmadi.");
        }

        if (!packagedProduct) {
            packagedProduct = {
                id: `pkg-${order.productId}-${String(row.packSize).replace(".", "-")}`,
                name: row.productName || `${order.productName} ${row.packSize} ${order.unit}`,
                sku: `PKG-${order.productId}-${String(row.packSize).replace(".", "-")}`,
                type: "FINISHED_GOOD",
                unit: "dona",
                parentProductId: order.productId,
                packSize: row.packSize,
                packUnit: row.packUnit,
                isVariant: true,
                stock: 0,
                cost: 0,
                salePrice: null,
                status: "ACTIVE",
            };
            products = [packagedProduct, ...products];
        }

        if (normalizeUnit(packagedProduct.unit) !== "dona") {
            throw new Error("Qadoqlangan mahsulot birligi dona bo'lishi kerak.");
        }

        const packageStockIndex = updatedStock.findIndex(
            (stockItem) => stockItem.warehouseId === order.warehouseId && stockItem.productId === packagedProduct.id,
        );
        const packageCost = actualUnitCost * row.packSize;
        if (packageStockIndex >= 0) {
            const current = updatedStock[packageStockIndex];
            updatedStock[packageStockIndex] = { ...current, quantity: Number(current.quantity || 0) + row.quantity, cost: packageCost };
        } else {
            updatedStock.push({
                id: createStockId(),
                warehouseId: order.warehouseId,
                productId: packagedProduct.id,
                productName: packagedProduct.name,
                sku: packagedProduct.sku || "",
                type: "FINISHED_GOOD",
                category: packagedProduct.category || "",
                unit: "dona",
                image: packagedProduct.image || "",
                quantity: row.quantity,
                reserved: 0,
                minimumStock: Number(packagedProduct.minimumStock || 0),
                cost: packageCost,
            });
        }
        addWarehouseMovement({ type: "IN", warehouseId: order.warehouseId, productId: packagedProduct.id, productName: packagedProduct.name, quantity: row.quantity, unit: "dona", cost: packageCost, source: `Ishlab chiqarish ${order.number}`, productionOrderId: order.id, note: "Qadoqlangan tayyor mahsulot omborga qabul qilindi." });

        for (const material of row.materials) {
            const materialIndex = updatedStock.findIndex((stockItem) => stockItem.warehouseId === order.warehouseId && stockItem.productId === material.productId);
            const materialQuantity = material.quantity * row.quantity;
            const materialStock = materialIndex >= 0 ? updatedStock[materialIndex] : null;
            const materialProduct = products.find((product) => product.id === material.productId);
            const materialUnit = normalizeUnit(materialProduct?.unit || materialStock?.unit || "dona");
            const stockUnit = normalizeUnit(materialStock?.unit || materialUnit);
            let materialQuantityInStockUnit;
            try {
                materialQuantityInStockUnit = convertQuantity(materialQuantity, materialUnit, stockUnit);
            } catch {
                throw new Error("Qadoqlash materiali o'lchov birligi mos emas.");
            }
            if (materialIndex < 0 || materialQuantityInStockUnit > Number(materialStock.quantity || 0) - Number(materialStock.reserved || 0)) {
                throw new Error("Qadoqlash materiali omborda yetarli emas.");
            }
            updatedStock[materialIndex] = { ...materialStock, quantity: Number(materialStock.quantity || 0) - materialQuantityInStockUnit };
            addWarehouseMovement({ type: "OUT", warehouseId: order.warehouseId, productId: material.productId, productName: materialStock.productName, quantity: materialQuantity, unit: materialUnit, cost: Number(materialStock.cost || 0), source: `Ishlab chiqarish ${order.number}`, productionOrderId: order.id, note: "Qadoqlash materiali sarflandi." });
        }
    }

    if (normalizedPackaging.length) {
        saveProducts(products);
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

        packaging: normalizedPackaging,

        remainingBulkQuantity: bulkQuantity,

        actualMaterials:
            preparedMaterials,

        actualMaterialCost: totalMaterialCost,

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
                getLocale(),
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
