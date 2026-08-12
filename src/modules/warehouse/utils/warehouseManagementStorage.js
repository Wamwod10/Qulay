import { WAREHOUSES } from "../constants/warehouseMock";

const STORAGE_KEY = "universal_erp_warehouses";

export const getStoredWarehouses = () => {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);

        if (!stored) {
            const initialWarehouses = WAREHOUSES.map((warehouse) => ({
                ...warehouse,
                status: warehouse.status || "ACTIVE",
            }));

            localStorage.setItem(
                STORAGE_KEY,
                JSON.stringify(initialWarehouses),
            );

            return initialWarehouses;
        }

        return JSON.parse(stored);
    } catch {
        return WAREHOUSES.map((warehouse) => ({
            ...warehouse,
            status: warehouse.status || "ACTIVE",
        }));
    }
};

export const saveWarehouses = (warehouses) => {
    localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(warehouses),
    );
};

export const createWarehouse = (warehouse) => {
    const warehouses = getStoredWarehouses();

    const newWarehouse = {
        id: `wh-${Date.now()}`,
        name: warehouse.name.trim(),
        branch: warehouse.branch.trim(),
        address: warehouse.address?.trim() || "",
        responsible: warehouse.responsible?.trim() || "",
        note: warehouse.note?.trim() || "",
        status: "ACTIVE",
        createdAt: new Date().toLocaleString("uz-UZ"),
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
