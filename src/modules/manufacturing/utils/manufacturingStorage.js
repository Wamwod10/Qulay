import {
    checkMaterialAvailability,
    hasEnoughMaterials,
} from "../production-orders/utils/materialAvailability";
import { tenantGet, tenantSet } from "../../auth/utils/tenantStorage";
import { getLocale } from "../../../localization/i18n";
import { apiRequest, getCachedApiResponse, unwrapList } from "../../../services/api/apiClient";

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
    "manufacturing_boms";

const PRODUCTION_STORAGE_KEY =
    "production_orders";

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
    const remoteBoms = unwrapList(getCachedApiResponse("/manufacturing/boms"), ["boms"]);
    if (Array.isArray(remoteBoms)) {
        tenantSet(BOM_STORAGE_KEY, remoteBoms);
        return remoteBoms;
    }
    try {
        const stored =
            tenantGet(
                BOM_STORAGE_KEY,
                null,
            );

        if (!stored) {
            tenantSet(
                BOM_STORAGE_KEY,
                [],
            );

            return [];
        }

        return stored;
    } catch {
        return [];
    }
};

export const saveBoms = (boms) => {
    tenantSet(
        BOM_STORAGE_KEY,
        boms,
    );
};

export const createBom = async (bom) => {
    const remoteBom = await apiRequest("/manufacturing/boms", {
        method: "POST",
        body: bom,
    });
    if (remoteBom?.id) {
        const boms = getStoredBoms();
        saveBoms([remoteBom, ...boms.filter((item) => item.id !== remoteBom.id)]);
        return remoteBom;
    }
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
                getLocale(),
            ),
    };

    saveBoms([
        newBom,
        ...boms,
    ]);

    return newBom;
};

export const updateBom = async (
    updatedBom,
) => {
    const remoteBom = updatedBom?.id ? await apiRequest(`/manufacturing/boms/${updatedBom.id}`, {
        method: "PATCH",
        body: updatedBom,
    }) : null;
    if (remoteBom?.id) {
        const boms = getStoredBoms();
        saveBoms([remoteBom, ...boms.filter((bom) => bom.id !== updatedBom.id && bom.id !== remoteBom.id)]);
        return remoteBom;
    }
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
        const remoteOrders = unwrapList(getCachedApiResponse("/manufacturing/orders"), ["orders", "productionOrders"]);
        if (Array.isArray(remoteOrders)) {
            tenantSet(PRODUCTION_STORAGE_KEY, remoteOrders);
            return remoteOrders.map(normalizeProductionOrder);
        }
        try {
            const stored =
                tenantGet(
                    PRODUCTION_STORAGE_KEY,
                    null,
                );

            if (!stored) {
                tenantSet(
                    PRODUCTION_STORAGE_KEY,
                    [],
                );

            return [];
        }

            return stored.map(
                normalizeProductionOrder,
            );
        } catch {
            return [];
        }
    };

export const saveProductionOrders = (
    orders,
) => {
    tenantSet(
        PRODUCTION_STORAGE_KEY,
        orders,
    );

    window.dispatchEvent(
        new Event("manufacturing:changed"),
    );
};

export const createProductionOrder = async (
    order,
) => {
    const remoteOrder = await apiRequest("/manufacturing/orders", {
        method: "POST",
        body: order,
    });
    if (remoteOrder?.id) {
        const orders = getStoredProductionOrders();
        saveProductionOrders([remoteOrder, ...orders.filter((item) => item.id !== remoteOrder.id)]);
        return normalizeProductionOrder(remoteOrder);
    }
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
                getLocale(),
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

export const refreshProductionOrder = async (orderId) => {
    const remoteOrder = await apiRequest(`/manufacturing/orders/${orderId}`);
    if (!remoteOrder?.id) return getProductionOrderById(orderId);
    const orders = getStoredProductionOrders();
    saveProductionOrders(orders.map((order) => order.id === remoteOrder.id ? remoteOrder : order));
    return normalizeProductionOrder(remoteOrder);
};

export const updateProductionOrder = async (
    updatedOrder,
) => {
    const remoteOrder = updatedOrder?.status === "IN_PROGRESS"
        ? await apiRequest(`/manufacturing/orders/${updatedOrder.id}/start`, {
            method: "POST",
            body: updatedOrder,
        })
        : updatedOrder?.status === "COMPLETED"
            ? await apiRequest(`/manufacturing/orders/${updatedOrder.id}/complete`, {
                method: "POST",
                body: updatedOrder,
            })
            : null;
    if (remoteOrder?.id) {
        const orders = getStoredProductionOrders();
        saveProductionOrders(orders.map((order) => (order.id === remoteOrder.id ? remoteOrder : order)));
        window.dispatchEvent(new Event("warehouse:changed"));
        return normalizeProductionOrder(remoteOrder);
    }
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

export const startProductionOrder = async (
    orderId,
) => {
    const remoteOrder = await apiRequest(`/manufacturing/orders/${orderId}/start`, {
        method: "POST",
        body: {},
    });
    if (remoteOrder?.id) {
        const orders = getStoredProductionOrders();
        saveProductionOrders(orders.map((order) => (order.id === remoteOrder.id ? remoteOrder : order)));
        window.dispatchEvent(new Event("warehouse:changed"));
        return normalizeProductionOrder(remoteOrder);
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

export const updateProductionOrderStages = async (
    orderId,
    stages,
) => {
    const current = getProductionOrderById(orderId);
    const changedStage = stages.find((stage, index) => stage.status !== current?.stages?.[index]?.status);
    if (current && changedStage?.id) {
        const action = changedStage.status === "IN_PROGRESS" ? "start" : changedStage.status === "COMPLETED" ? "complete" : null;
        if (action) {
            const remoteStage = await apiRequest(`/manufacturing/orders/${orderId}/stages/${changedStage.id}/${action}`, {
                method: "POST",
                body: { notes: changedStage.notes },
            });
            if (remoteStage?.id) {
                const remoteOrder = await apiRequest(`/manufacturing/orders/${orderId}`);
                if (remoteOrder?.id) {
                    const orders = getStoredProductionOrders();
                    saveProductionOrders(orders.map((order) => order.id === remoteOrder.id ? remoteOrder : order));
                    return normalizeProductionOrder(remoteOrder);
                }
            }
        }
    }
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

export const updateProductionOrderQuality = async (
    orderId,
    qualityControl,
) => {
    const remoteOrder = await apiRequest(`/manufacturing/orders/${orderId}/quality`, {
        method: "PATCH",
        body: qualityControl,
    });
    if (remoteOrder?.id) {
        const orders = getStoredProductionOrders();
        saveProductionOrders(orders.map((order) => order.id === remoteOrder.id ? remoteOrder : order));
        return normalizeProductionOrder(remoteOrder);
    }
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

export const updateProductionOrderOverhead = async (
    orderId,
    overheadItems,
) => {
    const remoteOrder = await apiRequest(`/manufacturing/orders/${orderId}/overhead`, {
        method: "PATCH",
        body: { items: overheadItems },
    });
    if (remoteOrder?.id) {
        const orders = getStoredProductionOrders();
        saveProductionOrders(orders.map((order) => order.id === remoteOrder.id ? remoteOrder : order));
        return normalizeProductionOrder(remoteOrder);
    }
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
