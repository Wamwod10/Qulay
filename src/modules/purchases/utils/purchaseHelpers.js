import {
    getStoredPurchases,
    savePurchases,
} from "./purchasesStorage";
import { getLocale, translateText } from "../../../localization/i18n";

export const formatPurchaseMoney = (
    value,
) => {
    return new Intl.NumberFormat(
        getLocale(),
    ).format(
        Number(value) || 0,
    );
};

export const getPurchaseStatusLabel = (
    status,
) => {
    switch (status) {
        case "DRAFT":
            return translateText("Qoralama");

        case "ORDERED":
            return translateText("Buyurtma berilgan");

        case "PARTIALLY_RECEIVED":
            return translateText("Qisman qabul qilingan");

        case "RECEIVED":
            return translateText("Qabul qilingan");

        case "CANCELLED":
            return translateText("Bekor qilingan");

        default:
            return status || "—";
    }
};

export const getPurchaseStatusVariant = (
    status,
) => {
    switch (status) {
        case "RECEIVED":
            return "success";

        case "PARTIALLY_RECEIVED":
            return "warning";

        case "ORDERED":
            return "primary";

        case "CANCELLED":
            return "danger";

        default:
            return "neutral";
    }
};

export const formatPurchaseDate = (
    value,
) => {
    if (!value) {
        return "—";
    }

    const dateValue =
        String(value);

    if (
        dateValue.includes("-")
    ) {
        const [
            year,
            month,
            day,
        ] = dateValue.split("-");

        if (
            year &&
            month &&
            day
        ) {
            return `${day}.${month}.${year}`;
        }
    }

    return dateValue;
};

export const applyPurchaseReceipt = ({
    purchaseId,
    receivedItems,
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

            const updatedItems =
                purchase.items.map(
                    (item) => {
                        const receipt =
                            receivedItems.find(
                                (receivedItem) =>
                                    receivedItem.itemId ===
                                    item.id ||
                                    receivedItem.productId ===
                                    item.productId,
                            );

                        if (!receipt) {
                            return item;
                        }

                        const oldReceived =
                            Number(
                                item.receivedQuantity ||
                                0,
                            );

                        const add =
                            Number(
                                receipt.quantity ||
                                0,
                            );

                        return {
                            ...item,

                            receivedQuantity:
                                Math.min(
                                    Number(
                                        item.quantity ||
                                        0,
                                    ),
                                    oldReceived + add,
                                ),
                        };
                    },
                );

            const allReceived =
                updatedItems.every(
                    (item) =>
                        Number(
                            item.receivedQuantity ||
                            0,
                        ) >=
                        Number(
                            item.quantity ||
                            0,
                        ),
                );

            const anythingReceived =
                updatedItems.some(
                    (item) =>
                        Number(
                            item.receivedQuantity ||
                            0,
                        ) > 0,
                );

            updatedPurchase = {
                ...purchase,

                items:
                    updatedItems,

                status:
                    allReceived
                        ? "RECEIVED"
                        : anythingReceived
                            ? "PARTIALLY_RECEIVED"
                            : purchase.status,

                receivedAt:
                    allReceived
                        ? new Date().toLocaleString(
                            getLocale(),
                        )
                        : purchase.receivedAt,
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

export const getLastPurchasePrice = ({
    purchases,
    productId,
    excludePurchaseId,
}) => {
    const matchedItems = [];

    purchases.forEach((purchase) => {
        if (
            purchase.id === excludePurchaseId ||
            purchase.status === "CANCELLED"
        ) {
            return;
        }

        purchase.items?.forEach((item) => {
            if (
                item.productId === productId &&
                Number(item.purchasePrice) >= 0
            ) {
                matchedItems.push({
                    price: Number(item.purchasePrice),
                    date:
                        purchase.orderDate ||
                        purchase.createdAt ||
                        "",
                });
            }
        });
    });

    if (!matchedItems.length) {
        return null;
    }

    matchedItems.sort((a, b) => {
        return String(b.date).localeCompare(
            String(a.date),
        );
    });

    return matchedItems[0].price;
};

export const getPriceDifference = (
    currentPrice,
    previousPrice,
) => {
    if (
        previousPrice === null ||
        previousPrice === undefined
    ) {
        return null;
    }

    const current =
        Number(currentPrice || 0);

    const previous =
        Number(previousPrice || 0);

    if (previous === 0) {
        return {
            amount: current,
            percent: null,
        };
    }

    const amount =
        current - previous;

    const percent =
        (amount / previous) * 100;

    return {
        amount,
        percent,
    };
};
