import { getLocale, translateText } from "../../../localization/i18n";
import { formatMoneyWithSettings } from "../../settings/utils/formatSettingsHelpers";
import { getPlatformSettings } from "../../settings/utils/settingsStorage";

export const formatPurchaseMoney = (
    value,
) => {
    return formatMoneyWithSettings(Number(value) || 0, getPlatformSettings().formats);
};

export const formatSupplierMoney =
    formatPurchaseMoney;

export const getSupplierStatusLabel = (
    status,
) => {
    switch (status) {
        case "ACTIVE":
            return translateText("Faol");

        case "INACTIVE":
            return translateText("Faol emas");

        default:
            return status || "—";
    }
};

export const getSupplierStatusVariant = (
    status,
) => {
    switch (status) {
        case "ACTIVE":
            return "success";

        case "INACTIVE":
            return "neutral";

        default:
            return "neutral";
    }
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

export const getLastPurchasePrice = ({
    purchases = [],
    productId,
    excludePurchaseId,
}) => {
    const matchedItems = [];

    purchases.forEach(
        (purchase) => {
            if (
                purchase.id ===
                excludePurchaseId ||
                purchase.status ===
                "CANCELLED"
            ) {
                return;
            }

            purchase.items?.forEach(
                (item) => {
                    if (
                        item.productId ===
                        productId &&
                        Number(
                            item.purchasePrice,
                        ) >= 0
                    ) {
                        matchedItems.push({
                            price:
                                Number(
                                    item.purchasePrice,
                                ),

                            date:
                                purchase.orderDate ||
                                purchase.createdAt ||
                                "",
                        });
                    }
                },
            );
        },
    );

    if (
        !matchedItems.length
    ) {
        return null;
    }

    matchedItems.sort(
        (a, b) =>
            String(b.date).localeCompare(
                String(a.date),
            ),
    );

    return matchedItems[0].price;
};

export const getPriceDifference = (
    currentPrice,
    previousPrice,
) => {
    if (
        previousPrice === null ||
        previousPrice ===
        undefined
    ) {
        return null;
    }

    const current =
        Number(
            currentPrice || 0,
        );

    const previous =
        Number(
            previousPrice || 0,
        );

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

export const getSupplierDebt = (
    supplierId,
    purchases = [],
) => {
    return purchases
        .filter(
            (purchase) =>
                purchase.supplierId ===
                supplierId &&
                purchase.status !==
                "CANCELLED",
        )
        .reduce(
            (total, purchase) =>
                total +
                Number(
                    purchase.debtAmount || 0,
                ),
            0,
        );
};
