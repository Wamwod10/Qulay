import {
    INITIAL_SUPPLIERS,
} from "../constants/suppliersMock";

import {
    syncSupplierReferences,
} from "./supplierIntegration";

const STORAGE_KEY =
    "universal_erp_suppliers";

export const getStoredSuppliers = () => {
    try {
        const stored =
            localStorage.getItem(
                STORAGE_KEY,
            );

        if (!stored) {
            localStorage.setItem(
                STORAGE_KEY,
                JSON.stringify(
                    INITIAL_SUPPLIERS,
                ),
            );

            return INITIAL_SUPPLIERS;
        }

        return JSON.parse(stored);
    } catch (error) {
        console.error(
            "Suppliers storage read error:",
            error,
        );

        return INITIAL_SUPPLIERS;
    }
};

export const saveSuppliers = (
    suppliers,
) => {
    localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(suppliers),
    );
};

export const getSupplierById = (
    supplierId,
) => {
    return getStoredSuppliers().find(
        (supplier) =>
            supplier.id === supplierId,
    );
};

export const createSupplier = (
    supplier,
) => {
    const suppliers =
        getStoredSuppliers();

    const newSupplier = {
        ...supplier,

        id: `sup-${Date.now()}`,

        status:
            supplier.status ||
            "ACTIVE",

        createdAt:
            new Date().toLocaleString(
                "uz-UZ",
            ),
    };

    saveSuppliers([
        newSupplier,
        ...suppliers,
    ]);

    return newSupplier;
};

export const updateSupplier = (
    updatedSupplier,
) => {
    const suppliers =
        getStoredSuppliers();

    const updated =
        suppliers.map(
            (supplier) =>
                supplier.id ===
                    updatedSupplier.id
                    ? {
                        ...supplier,
                        ...updatedSupplier,
                    }
                    : supplier,
        );

    saveSuppliers(updated);

    syncSupplierReferences(
        updatedSupplier,
    );

    return updatedSupplier;
};

export const toggleSupplierStatus = (
    supplierId,
) => {
    const suppliers =
        getStoredSuppliers();

    let updatedSupplier = null;

    const updated =
        suppliers.map(
            (supplier) => {
                if (
                    supplier.id !==
                    supplierId
                ) {
                    return supplier;
                }

                updatedSupplier = {
                    ...supplier,

                    status:
                        supplier.status ===
                            "ACTIVE"
                            ? "INACTIVE"
                            : "ACTIVE",
                };

                return updatedSupplier;
            },
        );

    saveSuppliers(updated);

    return updatedSupplier;
};

export const deleteSupplier = (
    supplierId,
) => {
    const suppliers =
        getStoredSuppliers();

    const updated =
        suppliers.filter(
            (supplier) =>
                supplier.id !==
                supplierId,
        );

    saveSuppliers(updated);
};