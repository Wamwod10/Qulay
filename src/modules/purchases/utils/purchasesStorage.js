import { tenantGet, tenantSet } from "../../auth/utils/tenantStorage";
import { syncApiRequest, unwrapList } from "../../../services/api/syncApi";

const STORAGE_KEY =
    "purchases";

export const getStoredPurchases = () => {
    const remotePurchases = unwrapList(syncApiRequest("/purchases"), ["purchases"]);

    if (Array.isArray(remotePurchases)) {
        tenantSet(STORAGE_KEY, remotePurchases);
        return remotePurchases;
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
            "Purchases storage read error:",
            error,
        );

        return [];
    }
};

export const savePurchases = (
    purchases,
) => {
    try {
        tenantSet(
            STORAGE_KEY,
            purchases,
        );

        window.dispatchEvent(
            new Event("purchases:changed"),
        );
    } catch (error) {
        console.error(
            "Purchases storage save error:",
            error,
        );
    }
};

export const getPurchaseById = (
    purchaseId,
) => {
    return getStoredPurchases().find(
        (purchase) =>
            purchase.id === purchaseId,
    );
};

export const createPurchase = (
    purchase,
) => {
    const remotePurchase = syncApiRequest("/purchases", {
        method: "POST",
        body: purchase,
    });

    if (remotePurchase?.id) {
        const purchases = getStoredPurchases();
        savePurchases([remotePurchase, ...purchases.filter((item) => item.id !== remotePurchase.id)]);
        return remotePurchase;
    }

    const purchases =
        getStoredPurchases();

    const newPurchase = {
        ...purchase,

        id:
            purchase.id ||
            `pur-${Date.now()}`,

        number:
            purchase.number ||
            `PO-${Math.floor(
                1000 +
                Math.random() * 9000,
            )}`,

        createdAt:
            new Date().toLocaleString(
                "uz-UZ",
            ),
    };

    savePurchases([
        newPurchase,
        ...purchases,
    ]);

    return newPurchase;
};

export const updatePurchase = (
    updatedPurchase,
) => {
    const remotePurchase = syncApiRequest(`/purchases/${updatedPurchase.id}`, {
        method: "PATCH",
        body: updatedPurchase,
    });

    if (remotePurchase?.id) {
        const purchases = getStoredPurchases();
        savePurchases(purchases.map((purchase) => (purchase.id === remotePurchase.id ? remotePurchase : purchase)));
        return remotePurchase;
    }

    const purchases =
        getStoredPurchases();

    const updated =
        purchases.map(
            (purchase) =>
                purchase.id ===
                    updatedPurchase.id
                    ? {
                        ...purchase,
                        ...updatedPurchase,
                    }
                    : purchase,
        );

    savePurchases(updated);

    return updatedPurchase;
};

export const markPurchaseReceived = (
    purchaseId,
) => {
    const remotePurchase = syncApiRequest(`/purchases/${purchaseId}/receive`, {
        method: "POST",
        idempotencyKey: `purchase-receive:${purchaseId}`,
        body: { idempotencyKey: `purchase-receive:${purchaseId}` },
    });

    if (remotePurchase?.id) {
        const purchases = getStoredPurchases();
        savePurchases(purchases.map((purchase) => (purchase.id === remotePurchase.id ? remotePurchase : purchase)));
        return remotePurchase;
    }

    const purchases =
        getStoredPurchases();

    let updatedPurchase = null;

    const updatedPurchases =
        purchases.map((purchase) => {
            if (
                purchase.id !== purchaseId
            ) {
                return purchase;
            }

            updatedPurchase = {
                ...purchase,

                status: "RECEIVED",

                items:
                    purchase.items.map(
                        (item) => ({
                            ...item,

                            receivedQuantity:
                                Number(
                                    item.quantity ||
                                    0,
                                ),
                        }),
                    ),

                receivedAt:
                    new Date().toLocaleString(
                        "uz-UZ",
                    ),
            };

            return updatedPurchase;
        });

    savePurchases(
        updatedPurchases,
    );

    return updatedPurchase;
};
export const cancelPurchase = (
    purchaseId,
) => {
    const remotePurchase = syncApiRequest(`/purchases/${purchaseId}/cancel`, {
        method: "POST",
        body: {},
    });

    if (remotePurchase?.id) {
        const purchases = getStoredPurchases();
        savePurchases(purchases.map((purchase) => (purchase.id === remotePurchase.id ? remotePurchase : purchase)));
        return remotePurchase;
    }

    const purchases =
        getStoredPurchases();

    let updatedPurchase = null;

    const updatedPurchases =
        purchases.map((purchase) => {
            if (
                purchase.id !==
                purchaseId
            ) {
                return purchase;
            }

            if (
                purchase.status ===
                "RECEIVED"
            ) {
                throw new Error(
                    "Qabul qilingan xaridni bekor qilib bo‘lmaydi.",
                );
            }

            updatedPurchase = {
                ...purchase,

                status: "CANCELLED",

                cancelledAt:
                    new Date().toLocaleString(
                        "uz-UZ",
                    ),
            };

            return updatedPurchase;
        });

    if (!updatedPurchase) {
        throw new Error(
            "Xarid topilmadi.",
        );
    }

    savePurchases(
        updatedPurchases,
    );

    return updatedPurchase;
};

export const updatePurchasePayment = ({
    purchaseId,
    paidAmount,
}) => {
    const currentPurchase = getStoredPurchases().find((purchase) => purchase.id === purchaseId);
    const currentPaid = Number(currentPurchase?.paidAmount || 0);
    const nextPaid = Number(paidAmount || 0);
    const remotePurchase = syncApiRequest(`/purchases/${purchaseId}/payment`, {
        method: "POST",
        idempotencyKey: `purchase-payment:${purchaseId}:${Math.max(nextPaid - currentPaid, 0)}`,
        body: {
            amount: Math.max(nextPaid - currentPaid, 0),
            paidAmount: nextPaid,
            idempotencyKey: `purchase-payment:${purchaseId}:${Math.max(nextPaid - currentPaid, 0)}`,
        },
    });

    if (remotePurchase?.id) {
        const purchases = getStoredPurchases();
        savePurchases(purchases.map((purchase) => (purchase.id === remotePurchase.id ? remotePurchase : purchase)));
        return remotePurchase;
    }

    const purchases =
        getStoredPurchases();

    let updatedPurchase = null;

    const updatedPurchases =
        purchases.map((purchase) => {
            if (
                purchase.id !==
                purchaseId
            ) {
                return purchase;
            }

            const total =
                Number(
                    purchase.total || 0,
                );

            const paid =
                Number(
                    paidAmount || 0,
                );

            if (paid < 0) {
                throw new Error(
                    "To‘lov manfiy bo‘lishi mumkin emas.",
                );
            }

            if (paid > total) {
                throw new Error(
                    "To‘lov jami summadan katta bo‘lishi mumkin emas.",
                );
            }

            updatedPurchase = {
                ...purchase,

                paidAmount: paid,

                debtAmount:
                    Math.max(
                        total - paid,
                        0,
                    ),

                paymentUpdatedAt:
                    new Date().toLocaleString(
                        "uz-UZ",
                    ),
            };

            return updatedPurchase;
        });

    if (!updatedPurchase) {
        throw new Error(
            "Xarid topilmadi.",
        );
    }

    savePurchases(
        updatedPurchases,
    );

    return updatedPurchase;
};
export const duplicatePurchase = (
    purchaseId,
) => {
    const purchases =
        getStoredPurchases();

    const sourcePurchase =
        purchases.find(
            (purchase) =>
                purchase.id ===
                purchaseId,
        );

    if (!sourcePurchase) {
        throw new Error(
            "Xarid topilmadi.",
        );
    }

    const today =
        new Date()
            .toISOString()
            .slice(0, 10);

    const duplicatedPurchase = {
        ...sourcePurchase,

        id:
            `pur-${Date.now()}`,

        number:
            `PO-${Math.floor(
                1000 +
                Math.random() * 9000,
            )}`,

        status: "DRAFT",

        orderDate: today,

        expectedDate: "",

        paidAmount: 0,

        debtAmount:
            Number(
                sourcePurchase.total ||
                0,
            ),

        receivedAt: null,
        cancelledAt: null,

        createdAt:
            new Date().toLocaleString(
                "uz-UZ",
            ),

        items:
            sourcePurchase.items.map(
                (item) => ({
                    ...item,

                    id:
                        `pi-${Date.now()}-${Math.random()
                            .toString(36)
                            .slice(2, 7)}`,

                    receivedQuantity: 0,
                }),
            ),
    };

    savePurchases([
        duplicatedPurchase,
        ...purchases,
    ]);

    return duplicatedPurchase;
};
