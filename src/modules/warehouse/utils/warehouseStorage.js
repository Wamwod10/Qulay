import { isLocalBusinessFallbackEnabled, tenantGet, tenantSet } from "../../auth/utils/tenantStorage";
import { getLocale } from "../../../localization/i18n";
import { apiRequest, getCachedApiResponse, unwrapList } from "../../../services/api/apiClient";

const STORAGE_KEY =
    "warehouse_stock";

const MOVEMENTS_KEY =
    "warehouse_movements";

const BATCHES_KEY =
    "warehouse_batches";

export const getStoredWarehouseStock = () => {
    const remoteStock = unwrapList(getCachedApiResponse("/inventory/stock"), ["stock"]);

    if (Array.isArray(remoteStock)) {
        tenantSet(STORAGE_KEY, remoteStock);
        return remoteStock;
    }

    try {
        if (!isLocalBusinessFallbackEnabled()) {
            return [];
        }

        const stored =
            tenantGet(
                STORAGE_KEY,
                null,
            );

        if (!stored) {
            tenantSet(
                STORAGE_KEY,
                [],
            );

            return [];
        }

        return stored;
    } catch {
        return [];
    }
};

export const getStoredBatches = () => {
    const remoteBatches = unwrapList(getCachedApiResponse("/inventory/batches"), ["batches"]);
    if (Array.isArray(remoteBatches)) {
        tenantSet(BATCHES_KEY, remoteBatches);
        return remoteBatches;
    }
    return isLocalBusinessFallbackEnabled() ? tenantGet(BATCHES_KEY, []) || [] : [];
};

export const saveWarehouseStock = (
    stock,
) => {
    try {
        tenantSet(
            STORAGE_KEY,
            stock,
        );
    } catch {
        return false;
    }
};

export const getWarehouseMovements =
    () => {
        const remoteMovements = unwrapList(getCachedApiResponse("/inventory/movements"), ["movements"]);

        if (Array.isArray(remoteMovements)) {
            tenantSet(MOVEMENTS_KEY, remoteMovements);
            return remoteMovements;
        }

        try {
            return isLocalBusinessFallbackEnabled() ? tenantGet(MOVEMENTS_KEY, []) : [];
        } catch {
            return [];
        }
    };

export const addWarehouseMovement = (
    movement,
) => {
    if (!isLocalBusinessFallbackEnabled()) {
        return null;
    }

    const movements =
        getWarehouseMovements();

    const newMovement = {
        id: `mov-${Date.now()}-${Math.random()}`,

        createdAt:
            new Date().toLocaleString(
                getLocale(),
            ),

        ...movement,
    };

    tenantSet(
        MOVEMENTS_KEY,
        [
            newMovement,
            ...movements,
        ],
    );

    return newMovement;
};

export const stockIn = async ({
    warehouseId,
    productId,
    quantity,
    cost,
    source,
    note,
    inputUnit,
    batchNumber,
    expiryDate,
    productionDate,
    receivedDate,
    totalCost,
    idempotencyKey,
}) => {
    const requestKey = idempotencyKey || `stock-in:${globalThis.crypto?.randomUUID?.() || Date.now()}`;
    const remoteResult = await apiRequest("/inventory/stock/in", {
        method: "POST",
        idempotencyKey: requestKey,
        body: { warehouseId, productId, quantity, cost, source, note, inputUnit, unit: inputUnit, batchNumber, expiryDate, productionDate, receivedDate, totalCost, idempotencyKey: requestKey },
    });

    if (remoteResult) {
        const remoteStock = unwrapList(remoteResult, ["stock"]);
        if (Array.isArray(remoteStock)) {
            saveWarehouseStock(remoteStock);
        }
        window.dispatchEvent(new Event("warehouse:changed"));
        return remoteStock?.find((item) => item.warehouseId === warehouseId && item.productId === productId) || remoteResult;
    }

    if (!isLocalBusinessFallbackEnabled()) {
        throw new Error("Ombor operatsiyasi server orqali bajarilishi kerak.");
    }

    const stock =
        getStoredWarehouseStock();

    const amount =
        Number(quantity);

    if (
        !amount ||
        amount <= 0
    ) {
        throw new Error(
            "Kirim miqdori 0 dan katta bo‘lishi kerak.",
        );
    }

    let updatedItem = null;

    const updatedStock =
        stock.map((item) => {
            if (
                item.warehouseId !==
                warehouseId ||
                item.productId !==
                productId
            ) {
                return item;
            }

            updatedItem = {
                ...item,

                quantity:
                    Number(item.quantity || 0) +
                    amount,

                cost:
                    cost === "" ||
                        cost === null ||
                        cost === undefined
                        ? item.cost
                        : Number(cost),
            };

            return updatedItem;
        });

    if (!updatedItem) {
        throw new Error(
            "Mahsulot tanlangan omborda topilmadi.",
        );
    }

    saveWarehouseStock(
        updatedStock,
    );

    addWarehouseMovement({
        type: "IN",

        warehouseId,
        productId,

        productName:
            updatedItem.productName,

        quantity: amount,

        unit:
            updatedItem.unit,

        cost:
            updatedItem.cost,

        source:
            source ||
            "Qo‘lda kirim",

        note:
            note || "",
    });

    return updatedItem;
};

export const stockOut = async ({
    warehouseId,
    productId,
    quantity,
    reason,
    note,
    inputUnit,
    idempotencyKey,
}) => {
    const requestKey = idempotencyKey || `stock-out:${globalThis.crypto?.randomUUID?.() || Date.now()}`;
    const remoteResult = await apiRequest("/inventory/stock/out", {
        method: "POST",
        idempotencyKey: requestKey,
        body: { warehouseId, productId, quantity, reason, note, inputUnit, unit: inputUnit, idempotencyKey: requestKey },
    });

    if (remoteResult) {
        const remoteStock = unwrapList(remoteResult, ["stock"]);
        if (Array.isArray(remoteStock)) {
            saveWarehouseStock(remoteStock);
        }
        window.dispatchEvent(new Event("warehouse:changed"));
        return remoteStock?.find((item) => item.warehouseId === warehouseId && item.productId === productId) || remoteResult;
    }

    if (!isLocalBusinessFallbackEnabled()) {
        throw new Error("Ombor operatsiyasi server orqali bajarilishi kerak.");
    }

    const stock =
        getStoredWarehouseStock();

    const amount =
        Number(quantity);

    if (
        !amount ||
        amount <= 0
    ) {
        throw new Error(
            "Chiqim miqdori 0 dan katta bo‘lishi kerak.",
        );
    }

    let updatedItem = null;

    const updatedStock =
        stock.map((item) => {
            if (
                item.warehouseId !==
                warehouseId ||
                item.productId !==
                productId
            ) {
                return item;
            }

            const currentQuantity =
                Number(
                    item.quantity || 0,
                );

            if (
                amount >
                currentQuantity
            ) {
                throw new Error(
                    `Omborda yetarli qoldiq yo‘q. Mavjud: ${currentQuantity} ${item.unit}`,
                );
            }

            updatedItem = {
                ...item,

                quantity:
                    currentQuantity -
                    amount,
            };

            return updatedItem;
        });

    if (!updatedItem) {
        throw new Error(
            "Mahsulot tanlangan omborda topilmadi.",
        );
    }

    saveWarehouseStock(
        updatedStock,
    );

    addWarehouseMovement({
        type: "OUT",

        warehouseId,
        productId,

        productName:
            updatedItem.productName,

        quantity: amount,

        unit:
            updatedItem.unit,

        reason:
            reason ||
            "Qo‘lda chiqim",

        note:
            note || "",
    });

    return updatedItem;
};
export const transferStock = async ({
    fromWarehouseId,
    toWarehouseId,
    productId,
    quantity,
    note,
    inputUnit,
    idempotencyKey,
}) => {
    const requestKey = idempotencyKey || `transfer:${globalThis.crypto?.randomUUID?.() || Date.now()}`;
    const remoteResult = await apiRequest("/inventory/stock/transfer", {
        method: "POST",
        idempotencyKey: requestKey,
        body: { fromWarehouseId, toWarehouseId, productId, quantity, note, inputUnit, unit: inputUnit, idempotencyKey: requestKey },
    });

    if (remoteResult) {
        const remoteStock = unwrapList(remoteResult, ["stock"]);
        if (Array.isArray(remoteStock)) {
            saveWarehouseStock(remoteStock);
            window.dispatchEvent(new Event("warehouse:changed"));
            return remoteStock;
        }
        return remoteResult;
    }

    if (!isLocalBusinessFallbackEnabled()) {
        throw new Error("Ombor operatsiyasi server orqali bajarilishi kerak.");
    }

    if (fromWarehouseId === toWarehouseId) {
        throw new Error(
            "Mahsulotni bir xil ombor ichida ko‘chirib bo‘lmaydi.",
        );
    }

    const amount = Number(quantity);

    if (!amount || amount <= 0) {
        throw new Error(
            "Ko‘chirish miqdori 0 dan katta bo‘lishi kerak.",
        );
    }

    const stock =
        getStoredWarehouseStock();

    const sourceItem =
        stock.find(
            (item) =>
                item.warehouseId ===
                fromWarehouseId &&
                item.productId ===
                productId,
        );

    if (!sourceItem) {
        throw new Error(
            "Mahsulot manba omborda topilmadi.",
        );
    }

    if (
        amount >
        Number(
            sourceItem.quantity || 0,
        )
    ) {
        throw new Error(
            `Manba omborda yetarli qoldiq yo‘q. Mavjud: ${sourceItem.quantity} ${sourceItem.unit}`,
        );
    }

    const destinationItem =
        stock.find(
            (item) =>
                item.warehouseId ===
                toWarehouseId &&
                item.productId ===
                productId,
        );

    const updatedStock =
        stock.map((item) => {
            if (
                item.warehouseId ===
                fromWarehouseId &&
                item.productId ===
                productId
            ) {
                return {
                    ...item,
                    quantity:
                        Number(
                            item.quantity || 0,
                        ) - amount,
                };
            }

            if (
                item.warehouseId ===
                toWarehouseId &&
                item.productId ===
                productId
            ) {
                return {
                    ...item,
                    quantity:
                        Number(
                            item.quantity || 0,
                        ) + amount,
                };
            }

            return item;
        });

    if (!destinationItem) {
        updatedStock.push({
            ...sourceItem,

            id:
                `stock-${Date.now()}`,

            warehouseId:
                toWarehouseId,

            quantity:
                amount,

            reserved: 0,
        });
    }

    saveWarehouseStock(
        updatedStock,
    );

    addWarehouseMovement({
        type: "TRANSFER_OUT",

        warehouseId:
            fromWarehouseId,

        destinationWarehouseId:
            toWarehouseId,

        productId,

        productName:
            sourceItem.productName,

        quantity: amount,

        unit:
            sourceItem.unit,

        note:
            note || "",
    });

    addWarehouseMovement({
        type: "TRANSFER_IN",

        warehouseId:
            toWarehouseId,

        sourceWarehouseId:
            fromWarehouseId,

        productId,

        productName:
            sourceItem.productName,

        quantity: amount,

        unit:
            sourceItem.unit,

        note:
            note || "",
    });

    return updatedStock;
};

export const inventoryAdjustStock = async ({
    warehouseId,
    productId,
    countedQuantity,
    reason,
    note,
    idempotencyKey,
}) => {
    const remoteProduct = await apiRequest("/inventory/counts", {
        method: "POST",
        idempotencyKey,
        body: { warehouseId, productId, actualQuantity: countedQuantity, reason, note, idempotencyKey },
    });

    if (remoteProduct) {
        window.dispatchEvent(new Event("warehouse:changed"));
        return remoteProduct;
    }

    if (!isLocalBusinessFallbackEnabled()) {
        throw new Error("Ombor operatsiyasi server orqali bajarilishi kerak.");
    }

    const stock =
        getStoredWarehouseStock();

    const counted =
        Number(countedQuantity);

    if (
        Number.isNaN(counted) ||
        counted < 0
    ) {
        throw new Error(
            "Sanalgan qoldiq 0 yoki undan katta bo‘lishi kerak.",
        );
    }

    let updatedItem = null;
    let previousQuantity = null;

    const updatedStock =
        stock.map((item) => {
            if (
                item.warehouseId !==
                warehouseId ||
                item.productId !==
                productId
            ) {
                return item;
            }

            previousQuantity =
                Number(
                    item.quantity || 0,
                );

            updatedItem = {
                ...item,
                quantity: counted,
            };

            return updatedItem;
        });

    if (!updatedItem) {
        throw new Error(
            "Mahsulot tanlangan omborda topilmadi.",
        );
    }

    saveWarehouseStock(
        updatedStock,
    );

    const difference =
        counted -
        previousQuantity;

    addWarehouseMovement({
        type:
            "INVENTORY_ADJUSTMENT",

        warehouseId,
        productId,

        productName:
            updatedItem.productName,

        unit:
            updatedItem.unit,

        oldQuantity:
            previousQuantity,

        newQuantity:
            counted,

        difference,

        quantity:
            Math.abs(
                difference,
            ),

        reason:
            reason ||
            "Inventarizatsiya",

        note:
            note || "",
    });

    return updatedItem;
};
