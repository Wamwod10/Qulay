import {
    INITIAL_PURCHASES,
} from "../constants/purchasesMock";

const STORAGE_KEY =
    "universal_erp_purchases";

export const getStoredPurchases = () => {
    try {
        const stored =
            localStorage.getItem(
                STORAGE_KEY,
            );

        if (!stored) {
            localStorage.setItem(
                STORAGE_KEY,
                JSON.stringify(
                    INITIAL_PURCHASES,
                ),
            );

            return INITIAL_PURCHASES;
        }

        return JSON.parse(stored);
    } catch (error) {
        console.error(
            "Purchases storage read error:",
            error,
        );

        return INITIAL_PURCHASES;
    }
};

export const savePurchases = (
    purchases,
) => {
    try {
        localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify(purchases),
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