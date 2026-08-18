import { tenantGet, tenantSet } from "../../auth/utils/tenantStorage";
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
        return DEFAULT_WAREHOUSES.map((warehouse) => ({
            ...warehouse,
            status: warehouse.status || "ACTIVE",
        }));
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

    const warehouses = getStoredWarehouses();

    const newWarehouse = {
        id: `wh-${Date.now()}`,
        name: warehouse.name.trim(),
        branch: warehouse.branch.trim(),
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

export const updateWarehouse = (updatedWarehouse) => {
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

export const toggleWarehouseStatus = (warehouseId) => {
    const warehouses = getStoredWarehouses();

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
