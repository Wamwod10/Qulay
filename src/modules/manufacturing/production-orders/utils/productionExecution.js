import { apiRequest } from "../../../../services/api/apiClient";
import {
    getStoredProductionOrders,
    saveProductionOrders,
} from "../../utils/manufacturingStorage";
import { saveWarehouseStock } from "../../../warehouse/utils/warehouseStorage";

export const completeProductionOrder = async ({
    orderId,
    producedQuantity,
    acceptedQuantity,
    defectQuantity = 0,
    wasteQuantity = 0,
    actualMaterials = [],
    packaging = [],
    overheadCost,
    completionNote = "",
    outputWarehouseId,
    materialWarehouseId,
}) => {
    const remoteOrder = await apiRequest(`/manufacturing/orders/${orderId}/complete`, {
        method: "POST",
        idempotencyKey: `production-complete:${orderId}`,
        body: {
            producedQuantity,
            acceptedQuantity,
            defectQuantity,
            wasteQuantity,
            actualMaterials,
            packaging,
            overheadCost,
            completionNote,
            outputWarehouseId,
            materialWarehouseId,
        },
    });

    if (!remoteOrder?.id) {
        throw new Error("Ishlab chiqarishni yakunlash backendda bajarilmadi.");
    }

    const orders = getStoredProductionOrders();
    saveProductionOrders(orders.map((item) => item.id === remoteOrder.id ? remoteOrder : item));
    window.dispatchEvent(new Event("warehouse:changed"));

    void (async () => {
        const warehouseIds = [remoteOrder.materialWarehouseId, remoteOrder.outputWarehouseId, remoteOrder.warehouseId].filter(Boolean);
        for (const warehouseId of [...new Set(warehouseIds)]) {
            try {
                const result = await apiRequest(`/inventory/stock?warehouseId=${encodeURIComponent(warehouseId)}`);
                const remoteStock = result?.stock || result?.data;
                if (Array.isArray(remoteStock)) {
                    saveWarehouseStock(remoteStock);
                    window.dispatchEvent(new Event("warehouse:changed"));
                }
            } catch {
                // The completed order is authoritative; a later refresh can recover stock cards.
            }
        }
    })();

    return remoteOrder;
};
