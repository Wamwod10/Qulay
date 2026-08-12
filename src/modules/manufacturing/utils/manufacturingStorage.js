import {
    INITIAL_BOMS,
    INITIAL_PRODUCTION_ORDERS,
} from "../constants/manufacturingMock";

import {
    checkMaterialAvailability,
    hasEnoughMaterials,
} from "../production-orders/utils/materialAvailability";

import {
    calculateProductionMaterialCost,
} from "../production-orders/utils/productionOrderHelpers";

import {
    getStoredWarehouseStock,
    saveWarehouseStock,
} from "../../warehouse/utils/warehouseStorage";

import {
    DEFAULT_PRODUCTION_STAGES,
} from "../production-orders/utils/productionStages";

import {
    calculateActualProductionCost,
    calculateActualUnitCost,
    calculateOverheadCost,
    normalizeOverheadItems,
    positiveNumber,
} from "./productionCost";

const BOM_STORAGE_KEY =
    "universal_erp_manufacturing_boms";

const PRODUCTION_STORAGE_KEY =
    "universal_erp_production_orders";

const normalizeProductionOrder = (order) => {
    const overheadItems =
        normalizeOverheadItems(
            order?.overheadItems,
        );

    const overheadCost =
        positiveNumber(
            order?.overheadCost ??
            calculateOverheadCost(
                overheadItems,
            ),
        );

    const actualMaterialCost =
        positiveNumber(
            order?.actualMaterialCost,
        );

    const actualProductionCost =
        positiveNumber(
            order?.actualProductionCost ??
            calculateActualProductionCost({
                actualMaterialCost,
                overheadCost,
            }),
        );

    const actualUnitCost =
        positiveNumber(
            order?.actualUnitCost ??
            calculateActualUnitCost({
                actualProductionCost,
                producedQuantity:
                    order?.producedQuantity,
            }),
        );

    return {
        ...order,

        requiredMaterials:
            Array.isArray(
                order?.requiredMaterials,
            )
                ? order.requiredMaterials
                : [],

        overheadItems,

        overheadCost,

        actualProductionCost,

        actualUnitCost,
    };
};

export const getStoredBoms = () => {
    try {
        const stored =
            localStorage.getItem(
                BOM_STORAGE_KEY,
            );

        if (!stored) {
            localStorage.setItem(
                BOM_STORAGE_KEY,
                JSON.stringify(
                    INITIAL_BOMS,
                ),
            );

            return INITIAL_BOMS;
        }

        return JSON.parse(stored);
    } catch {
        return INITIAL_BOMS;
    }
};

export const saveBoms = (boms) => {
    localStorage.setItem(
        BOM_STORAGE_KEY,
        JSON.stringify(boms),
    );
};

export const createBom = (bom) => {
    const boms = getStoredBoms();

    const newBom = {
        ...bom,

        id: `bom-${Date.now()}`,

        version:
            bom.version || "1.0",

        status:
            bom.status || "ACTIVE",

        createdAt:
            new Date().toLocaleString(
                "uz-UZ",
            ),
    };

    saveBoms([
        newBom,
        ...boms,
    ]);

    return newBom;
};

export const updateBom = (
    updatedBom,
) => {
    const boms = getStoredBoms();

    const updated = boms.map(
        (bom) =>
            bom.id === updatedBom.id
                ? {
                    ...bom,
                    ...updatedBom,
                }
                : bom,
    );

    saveBoms(updated);

    return updatedBom;
};

export const getStoredProductionOrders =
    () => {
        try {
            const stored =
                localStorage.getItem(
                    PRODUCTION_STORAGE_KEY,
                );

            if (!stored) {
                localStorage.setItem(
                    PRODUCTION_STORAGE_KEY,
                    JSON.stringify(
                        INITIAL_PRODUCTION_ORDERS,
                    ),
                );

            return INITIAL_PRODUCTION_ORDERS.map(
                normalizeProductionOrder,
            );
        }

            return JSON.parse(stored).map(
                normalizeProductionOrder,
            );
        } catch {
            return INITIAL_PRODUCTION_ORDERS.map(
                normalizeProductionOrder,
            );
        }
    };

export const saveProductionOrders = (
    orders,
) => {
    localStorage.setItem(
        PRODUCTION_STORAGE_KEY,
        JSON.stringify(orders),
    );
};

export const createProductionOrder = (
    order,
) => {
    const orders =
        getStoredProductionOrders();

    const requiredMaterials =
        Array.isArray(
            order.requiredMaterials,
        )
            ? order.requiredMaterials
            : [];

    const plannedMaterialCost =
        Number(
            order.plannedMaterialCost ??
            order.materialCost ??
            calculateProductionMaterialCost(
                requiredMaterials,
            ),
        ) || 0;

    const newOrder = {
        ...order,

        id:
            `prod-${Date.now()}`,

        number:
            `PR-${Math.floor(
                1000 +
                Math.random() *
                9000,
            )}`,

        status: "PLANNED",

        producedQuantity: 0,

        requiredMaterials,

        plannedMaterialCost,

        overheadItems: [],

        overheadCost: 0,

        actualMaterialCost: 0,

        actualProductionCost: 0,

        actualUnitCost: 0,

        wasteQuantity: 0,

        defectQuantity: 0,

        startedAt: null,

        completedAt: null,

        createdAt:
            new Date().toLocaleString(
                "uz-UZ",
            ),

        stages:
            DEFAULT_PRODUCTION_STAGES.map(
                (stage) => ({
                    ...stage,
                }),
            ),
    };

    saveProductionOrders([
        newOrder,
        ...orders,
    ]);

    return newOrder;
};

export const getProductionOrderById = (
    orderId,
) => {
    return getStoredProductionOrders().find(
        (order) =>
            order.id === orderId,
    );
};

export const updateProductionOrder = (
    updatedOrder,
) => {
    const orders =
        getStoredProductionOrders();

    const updated = orders.map(
        (order) =>
            order.id === updatedOrder.id
                ? {
                    ...order,
                    ...updatedOrder,
                }
                : order,
    );

    saveProductionOrders(updated);

    return updatedOrder;
};

export const startProductionOrder = (
    orderId,
) => {
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

    if (order.status !== "PLANNED") {
        throw new Error(
            "Faqat PLANNED holatdagi buyurtmani boshlash mumkin.",
        );
    }

    const availability =
        checkMaterialAvailability({
            warehouseId:
                order.warehouseId,
            requiredMaterials:
                order.requiredMaterials ||
                [],
        });

    if (
        !hasEnoughMaterials(
            availability,
        )
    ) {
        const error =
            new Error(
                "Xomashyo yetarli emas.",
            );

        error.shortages =
            availability.filter(
                (material) =>
                    !material.enough,
            );

        throw error;
    }

    const stock =
        getStoredWarehouseStock();

    const remainingByProduct =
        new Map(
            availability.map(
                (material) => [
                    material.productId,
                    Number(
                        material.requiredQuantity ||
                        0,
                    ),
                ],
            ),
        );

    const updatedStock =
        stock.map((item) => {
            const remaining =
                remainingByProduct.get(
                    item.productId,
                ) || 0;

            if (
                item.warehouseId !==
                order.warehouseId ||
                remaining <= 0
            ) {
                return item;
            }

            const available =
                Math.max(
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

            const reservedNow =
                Math.min(
                    remaining,
                    available,
                );

            remainingByProduct.set(
                item.productId,
                remaining -
                reservedNow,
            );

            return {
                ...item,

                reserved:
                    Number(
                        item.reserved ||
                        0,
                    ) +
                    Number(
                        reservedNow ||
                        0,
                    ),
            };
        });

    saveWarehouseStock(
        updatedStock,
    );

    const startedOrder = {
        ...order,

        status: "IN_PROGRESS",

        startedAt:
            new Date().toISOString(),

        requiredMaterials:
            availability.map(
                (material) => ({
                    id:
                        material.id ||
                        material.productId,
                    productId:
                        material.productId,
                    productName:
                        material.productName,
                    sku:
                        material.sku,
                    unit:
                        material.unit,
                    bomQuantity:
                        material.bomQuantity,
                    requiredQuantity:
                        material.requiredQuantity,
                    cost:
                        material.cost,
                    totalCost:
                        material.totalCost,
                }),
            ),

        plannedMaterialCost:
            calculateProductionMaterialCost(
                availability,
            ),

        overheadItems:
            normalizeOverheadItems(
                order.overheadItems,
            ),

        overheadCost:
            calculateOverheadCost(
                order.overheadItems,
            ),
    };

    saveProductionOrders(
        orders.map(
            (item) =>
                item.id === orderId
                    ? startedOrder
                    : item,
        ),
    );

    return startedOrder;
};

export const updateProductionOrderStages = (
    orderId,
    stages,
) => {
    const orders =
        getStoredProductionOrders();

    let updatedOrder = null;

    const updatedOrders =
        orders.map((order) => {
            if (order.id !== orderId) {
                return order;
            }

            updatedOrder = {
                ...order,
                stages,
            };

            return updatedOrder;
        });

    if (!updatedOrder) {
        throw new Error(
            "Ishlab chiqarish buyurtmasi topilmadi.",
        );
    }

    saveProductionOrders(
        updatedOrders,
    );

    return updatedOrder;
};

export const updateProductionOrderQuality = (
    orderId,
    qualityControl,
) => {
    const orders =
        getStoredProductionOrders();

    let updatedOrder = null;

    const updatedOrders =
        orders.map((order) => {
            if (
                order.id !== orderId
            ) {
                return order;
            }

            updatedOrder = {
                ...order,

                qualityControl,
            };

            return updatedOrder;
        });

    if (!updatedOrder) {
        throw new Error(
            "Ishlab chiqarish buyurtmasi topilmadi.",
        );
    }

    saveProductionOrders(
        updatedOrders,
    );

    return updatedOrder;
};

export const updateProductionOrderOverhead = (
    orderId,
    overheadItems,
) => {
    const orders =
        getStoredProductionOrders();

    const normalizedItems =
        normalizeOverheadItems(
            overheadItems,
        );

    const overheadCost =
        calculateOverheadCost(
            normalizedItems,
        );

    let updatedOrder = null;

    const updatedOrders =
        orders.map((order) => {
            if (
                order.id !== orderId
            ) {
                return order;
            }

            if (
                order.status ===
                "COMPLETED"
            ) {
                throw new Error(
                    "Tugallangan ishlab chiqarish xarajatlarini o'zgartirib bo'lmaydi.",
                );
            }

            updatedOrder = {
                ...order,

                overheadItems:
                    normalizedItems,

                overheadCost,
            };

            return updatedOrder;
        });

    if (!updatedOrder) {
        throw new Error(
            "Ishlab chiqarish buyurtmasi topilmadi.",
        );
    }

    saveProductionOrders(
        updatedOrders,
    );

    return updatedOrder;
};
