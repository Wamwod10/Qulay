import {
    syncSupplierReferences,
} from "./supplierIntegration";
import { tenantGet, tenantSet } from "../../auth/utils/tenantStorage";
import { apiRequest, getCachedApiResponse, primeApiCache, unwrapList } from "../../../services/api/apiClient";

const STORAGE_KEY =
    "suppliers";

export const getStoredSuppliers = () => {
    const remoteSuppliers = unwrapList(getCachedApiResponse("/suppliers"), ["suppliers"]);

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
        if (import.meta.env.DEV) {
            console.error(
                "Suppliers storage read error:",
                error,
            );
        }

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

export const createSupplier = async (supplier, options = {}) => {
    const remoteSupplier = await apiRequest("/suppliers", {
        method: "POST",
        body: supplier,
        inlineModule: options.inlineModule,
    });

    if (remoteSupplier?.id) {
        const suppliers = getStoredSuppliers();
        const next = [remoteSupplier, ...suppliers.filter((item) => item.id !== remoteSupplier.id)];
        saveSuppliers(next);
        primeApiCache("/suppliers", { suppliers: next, data: next });
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

export const updateSupplier = async (
    updatedSupplier,
) => {
    const remoteSupplier = await apiRequest(`/suppliers/${updatedSupplier.id}`, {
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

export const toggleSupplierStatus = async (
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
        await apiRequest(`/suppliers/${supplierId}`, {
            method: "PATCH",
            body: { status: updatedSupplier.status },
        });
    }

    return updatedSupplier;
};

export const deleteSupplier = async (
    supplierId,
) => {
    await apiRequest(`/suppliers/${supplierId}`, {
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
