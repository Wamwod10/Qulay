import {
    getStoredPurchases,
    savePurchases,
} from "./purchasesStorage";
import { getLocale, translateText } from "../../../localization/i18n";
import { formatMoneyWithSettings } from "../../settings/utils/formatSettingsHelpers";
import { getPlatformSettings } from "../../settings/utils/settingsStorage";
import { convertQuantity } from "../../../shared/utils/units";

export const formatPurchaseMoney = (
    value,
) => {
    return formatMoneyWithSettings(Number(value) || 0, getPlatformSettings().formats);
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

export const roundPurchaseNumber = (value, precision = 6) => {
    const number = Number(value || 0);
    if (!Number.isFinite(number)) return 0;
    const factor = 10 ** precision;
    return Math.round((number + Number.EPSILON) * factor) / factor;
};

export const getPurchaseDisplayQuantity = (item) => {
    if (item?.purchaseQuantity !== null && item?.purchaseQuantity !== undefined) {
        return roundPurchaseNumber(item.purchaseQuantity);
    }

    return roundPurchaseNumber(item?.quantity);
};

export const getPurchaseDisplayUnit = (item) => item?.purchaseUnit || item?.unit || "";

export const convertCanonicalToPurchaseUnit = (value, item) => {
    const canonicalUnit = item?.unit;
    const purchaseUnit = item?.purchaseUnit || item?.unit;

    if (!canonicalUnit || !purchaseUnit) {
        return roundPurchaseNumber(value);
    }

    try {
        return roundPurchaseNumber(convertQuantity(value, canonicalUnit, purchaseUnit));
    } catch {
        return roundPurchaseNumber(value);
    }
};

export const getCanonicalUnitCost = ({
    quantity,
    purchaseUnit,
    productUnit,
    lineTotal,
}) => {
    try {
        const canonicalQuantity = convertQuantity(Number(quantity || 0), purchaseUnit || productUnit, productUnit);
        if (canonicalQuantity <= 0) return 0;
        return roundPurchaseNumber(Number(lineTotal || 0) / canonicalQuantity);
    } catch {
        return 0;
    }
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
                Number(item.cost ?? item.canonicalUnitPrice ?? 0) >= 0
            ) {
                matchedItems.push({
                    price: Number(item.cost ?? item.canonicalUnitPrice ?? 0),
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
