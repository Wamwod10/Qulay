import { isLocalBusinessFallbackEnabled, tenantGet, tenantSet } from "../../auth/utils/tenantStorage";
import { getLocale } from "../../../localization/i18n";
import { apiRequest, getCachedApiResponse, unwrapList } from "../../../services/api/apiClient";

const STORAGE_KEY = "warehouses";

const DEFAULT_WAREHOUSES = [
    {
        id: "warehouse-main",
        name: "Asosiy ombor",
        branch: "Asosiy filial",
        address: "",
        responsible: "",
        note: "",
        status: "ACTIVE",
        createdAt: new Date().toISOString(),
    },
];

export const getStoredWarehouses = () => {
    const remoteWarehouses = unwrapList(getCachedApiResponse("/warehouses"), ["warehouses"]);

    if (Array.isArray(remoteWarehouses)) {
        tenantSet(STORAGE_KEY, remoteWarehouses);
        return remoteWarehouses;
    }

    try {
        if (!isLocalBusinessFallbackEnabled()) {
            return [];
        }

        const stored = tenantGet(STORAGE_KEY, null);

        if (!stored) {
            const initialWarehouses = DEFAULT_WAREHOUSES.map((warehouse) => ({
                ...warehouse,
                status: warehouse.status || "ACTIVE",
            }));

            tenantSet(
                STORAGE_KEY,
                initialWarehouses,
            );

            return initialWarehouses;
        }

        return stored;
    } catch {
        return isLocalBusinessFallbackEnabled() ? DEFAULT_WAREHOUSES.map((warehouse) => ({
            ...warehouse,
            status: warehouse.status || "ACTIVE",
        })) : [];
    }
};

export const saveWarehouses = (warehouses) => {
    tenantSet(
        STORAGE_KEY,
        warehouses,
    );
};

export const createWarehouse = async (warehouse) => {
    const remoteWarehouse = await apiRequest("/warehouses", {
        method: "POST",
        body: warehouse,
    });

    if (remoteWarehouse?.id) {
        const warehouses = getStoredWarehouses();
        saveWarehouses([...warehouses.filter((item) => item.id !== remoteWarehouse.id), remoteWarehouse]);
        return remoteWarehouse;
    }

    if (!isLocalBusinessFallbackEnabled()) {
        throw new Error("Ombor serverda yaratilishi kerak.");
    }

    const warehouses = getStoredWarehouses();

    const newWarehouse = {
        id: `wh-${Date.now()}`,
        name: warehouse.name.trim(),
        code: warehouse.code?.trim() || "",
        address: warehouse.address?.trim() || "",
        responsible: warehouse.responsible?.trim() || "",
        note: warehouse.note?.trim() || "",
        status: "ACTIVE",
        createdAt: new Date().toLocaleString(getLocale()),
    };

    saveWarehouses([
        ...warehouses,
        newWarehouse,
    ]);

    return newWarehouse;
};

export const updateWarehouse = async (updatedWarehouse) => {
    const remoteWarehouse = await apiRequest(`/warehouses/${updatedWarehouse.id}`, {
        method: "PATCH",
        body: updatedWarehouse,
    });

    if (remoteWarehouse?.id) {
        const warehouses = getStoredWarehouses();
        saveWarehouses(warehouses.map((warehouse) => warehouse.id === remoteWarehouse.id ? remoteWarehouse : warehouse));
        return remoteWarehouse;
    }

    if (!isLocalBusinessFallbackEnabled()) {
        throw new Error("Ombor serverda yangilanishi kerak.");
    }

    const warehouses = getStoredWarehouses();

    const updated = warehouses.map((warehouse) =>
        warehouse.id === updatedWarehouse.id
            ? {
                ...warehouse,
                ...updatedWarehouse,
            }
            : warehouse,
    );

    saveWarehouses(updated);

    return updatedWarehouse;
};

export const toggleWarehouseStatus = async (warehouseId) => {
    const warehouses = getStoredWarehouses();
    const current = warehouses.find((warehouse) => warehouse.id === warehouseId);
    const nextStatus = current?.status === "ACTIVE" ? "ARCHIVED" : "ACTIVE";

    const remoteWarehouse = await apiRequest(`/warehouses/${warehouseId}`, {
        method: "PATCH",
        body: { status: nextStatus },
    });

    if (remoteWarehouse?.id) {
        saveWarehouses(warehouses.map((warehouse) => warehouse.id === remoteWarehouse.id ? remoteWarehouse : warehouse));
        return remoteWarehouse;
    }

    if (!isLocalBusinessFallbackEnabled()) {
        throw new Error("Ombor holati serverda yangilanishi kerak.");
    }

    let changedWarehouse = null;

    const updated = warehouses.map((warehouse) => {
        if (warehouse.id !== warehouseId) {
            return warehouse;
        }

        changedWarehouse = {
            ...warehouse,
            status:
                warehouse.status === "ACTIVE"
                    ? "INACTIVE"
                    : "ACTIVE",
        };

        return changedWarehouse;
    });

    saveWarehouses(updated);

    return changedWarehouse;
};

export const fetchStoredWarehouses = async () => {
    const result = await apiRequest("/warehouses", { skipCache: true });
    const warehouses = unwrapList(result, ["warehouses"]);

    if (!Array.isArray(warehouses)) {
        throw new Error("Omborlar backenddan olinmadi.");
    }

    tenantSet(STORAGE_KEY, warehouses);

    return warehouses;
};
