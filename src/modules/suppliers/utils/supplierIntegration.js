import {
    getStoredPurchases,
    savePurchases,
} from "../../purchases/utils/purchasesStorage";

import {
    getStoredProducts,
    saveProducts,
} from "../../products/utils/productsStorage";

export const syncSupplierReferences = (
    supplier,
) => {
    if (!supplier?.id) {
        return;
    }

    const purchases =
        getStoredPurchases();

    const updatedPurchases =
        purchases.map(
            (purchase) =>
                purchase.supplierId ===
                    supplier.id
                    ? {
                        ...purchase,

                        supplierName:
                            supplier.name,
                    }
                    : purchase,
        );

    savePurchases(
        updatedPurchases,
    );

    const products =
        getStoredProducts();

    const updatedProducts =
        products.map(
            (product) =>
                product.supplierId ===
                    supplier.id
                    ? {
                        ...product,

                        supplierName:
                            supplier.name,
                    }
                    : product,
        );

    saveProducts(
        updatedProducts,
    );
};