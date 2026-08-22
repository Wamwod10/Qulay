import { tenantGet, tenantSet } from "../../auth/utils/tenantStorage";
import { apiRequest, getCachedApiResponse, unwrapList } from "../../../services/api/apiClient";

import {
    saveWarehouseStock,
} from "../../warehouse/utils/warehouseStorage";

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

const normalizeBom = (bom) => ({
    ...bom,
    status: bom?.status || (bom?.active === false ? "INACTIVE" : "ACTIVE"),
});

const normalizeBoms = (boms) =>
    Array.isArray(boms) ? boms.map(normalizeBom) : [];

const emitManufacturingChanged = () => {
    if (typeof window !== "undefined") {
        window.dispatchEvent(
            new Event("manufacturing:changed"),
        );
    }
};

const refreshWarehouseStock = async (warehouseId) => {
    if (!warehouseId) return;

    try {
        const result = await apiRequest(`/inventory/stock?warehouseId=${encodeURIComponent(warehouseId)}`);
        const stock = unwrapList(result, ["stock"]);
        if (Array.isArray(stock)) {
            saveWarehouseStock(stock);
            window.dispatchEvent(new Event("warehouse:changed"));
        }
    } catch {
        // The order mutation already succeeded. A later warehouse refresh can recover the view.
    }
};

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
        const normalizedBoms = normalizeBoms(remoteBoms);
        tenantSet(BOM_STORAGE_KEY, normalizedBoms);
        return normalizedBoms;
    }

    return normalizeBoms(tenantGet(BOM_STORAGE_KEY, []));
};

export const fetchStoredBoms = async () => {
    const result = await apiRequest("/manufacturing/boms", { skipCache: true });
    const boms = unwrapList(result, ["boms"]);
    if (!Array.isArray(boms)) {
        throw new Error("Retseptlar backenddan olinmadi.");
    }
    const normalizedBoms = normalizeBoms(boms);
    saveBoms(normalizedBoms);
    return normalizedBoms;
};

export const saveBoms = (boms) => {
    tenantSet(
        BOM_STORAGE_KEY,
        normalizeBoms(boms),
    );
    emitManufacturingChanged();
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
    throw new Error("Retsept backendda saqlanmadi.");
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
    throw new Error("Retsept backendda yangilanmadi.");
};

export const getStoredProductionOrders =
    () => {
        const remoteOrders = unwrapList(getCachedApiResponse("/manufacturing/orders"), ["orders", "productionOrders"]);
        if (Array.isArray(remoteOrders)) {
            tenantSet(PRODUCTION_STORAGE_KEY, remoteOrders);
            return remoteOrders.map(normalizeProductionOrder);
        }
        return [];
    };

export const fetchStoredProductionOrders = async () => {
    const result = await apiRequest("/manufacturing/orders", { skipCache: true });
    const orders = unwrapList(result, ["orders", "productionOrders"]);
    if (!Array.isArray(orders)) {
        throw new Error("Ishlab chiqarish buyurtmalari backenddan olinmadi.");
    }
    saveProductionOrders(orders);
    return orders.map(normalizeProductionOrder);
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
    throw new Error("Ishlab chiqarish buyurtmasi backendda saqlanmadi.");
};

export const fetchProductionMaterialAvailability = async (payload) => {
    const result = await apiRequest("/manufacturing/material-availability", {
        method: "POST",
        body: payload,
    });

    return {
        ...result,
        materials: Array.isArray(result?.materials) ? result.materials : [],
    };
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
    throw new Error("Ishlab chiqarish buyurtmasi backendda yangilanmadi.");
};

export const startProductionOrder = async (
    orderId,
) => {
    const remoteOrder = await apiRequest(`/manufacturing/orders/${orderId}/start`, {
        method: "POST",
        idempotencyKey: `production-start:${orderId}`,
        body: {},
    });
    if (remoteOrder?.id) {
        const orders = getStoredProductionOrders();
        saveProductionOrders(orders.map((order) => (order.id === remoteOrder.id ? remoteOrder : order)));
        window.dispatchEvent(new Event("warehouse:changed"));
        void refreshWarehouseStock(remoteOrder.materialWarehouseId || remoteOrder.warehouseId);
        if (remoteOrder.outputWarehouseId && remoteOrder.outputWarehouseId !== remoteOrder.warehouseId) {
            void refreshWarehouseStock(remoteOrder.outputWarehouseId);
        }
        return normalizeProductionOrder(remoteOrder);
    }
    throw new Error("Ishlab chiqarishni boshlash backendda bajarilmadi.");
};

export const updateProductionOrderStages = async (
    orderId,
    stages,
    stageId,
) => {
    const changedStage = stages.find((stage) => stage.id === stageId);
    if (changedStage?.id) {
        const action = changedStage.status === "IN_PROGRESS" ? "start" : changedStage.status === "COMPLETED" ? "complete" : null;
        if (action) {
            const remoteOrder = await apiRequest(`/manufacturing/orders/${orderId}/stages/${changedStage.id}/${action}`, {
                method: "POST",
                body: { notes: changedStage.notes },
            });
            if (remoteOrder?.id) {
                const orders = getStoredProductionOrders();
                saveProductionOrders(orders.map((order) => order.id === remoteOrder.id ? remoteOrder : order));
                return normalizeProductionOrder(remoteOrder);
            }
        }
    }
    throw new Error("Bosqich backendda yangilanmadi.");
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
    throw new Error("Sifat nazorati backendda saqlanmadi.");
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
    throw new Error("Qo'shimcha xarajatlar backendda saqlanmadi.");
};
