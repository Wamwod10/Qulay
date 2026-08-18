import {
    syncSupplierReferences,
} from "./supplierIntegration";
import { tenantGet, tenantSet } from "../../auth/utils/tenantStorage";
import { syncApiRequest, unwrapList } from "../../../services/api/syncApi";

const STORAGE_KEY =
    "suppliers";

export const getStoredSuppliers = () => {
    const remoteSuppliers = unwrapList(syncApiRequest("/suppliers"), ["suppliers"]);

    if (Array.isArray(remoteSuppliers)) {
        tenantSet(STORAGE_KEY, remoteSuppliers);
        return remoteSuppliers;
    }

    try {
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
    } catch (error) {
        console.error(
            "Suppliers storage read error:",
            error,
        );

        return [];
    }
};

export const saveSuppliers = (
    suppliers,
) => {
    tenantSet(
        STORAGE_KEY,
        suppliers,
    );

    window.dispatchEvent(
        new Event("suppliers:changed"),
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
    const remoteSupplier = syncApiRequest("/suppliers", {
        method: "POST",
        body: supplier,
    });

    if (remoteSupplier?.id) {
        const suppliers = getStoredSuppliers();
        saveSuppliers([remoteSupplier, ...suppliers.filter((item) => item.id !== remoteSupplier.id)]);
        return remoteSupplier;
    }

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
    const remoteSupplier = syncApiRequest(`/suppliers/${updatedSupplier.id}`, {
        method: "PATCH",
        body: updatedSupplier,
    });

    if (remoteSupplier?.id) {
        const suppliers = getStoredSuppliers();
        saveSuppliers(suppliers.map((supplier) => (supplier.id === remoteSupplier.id ? remoteSupplier : supplier)));
        syncSupplierReferences(remoteSupplier);
        return remoteSupplier;
    }

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

    if (updatedSupplier) {
        syncApiRequest(`/suppliers/${supplierId}`, {
            method: "PATCH",
            body: { status: updatedSupplier.status },
        });
    }

    return updatedSupplier;
};

export const deleteSupplier = (
    supplierId,
) => {
    syncApiRequest(`/suppliers/${supplierId}`, {
        method: "DELETE",
    });

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
