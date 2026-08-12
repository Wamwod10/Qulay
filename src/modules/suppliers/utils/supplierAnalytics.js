export const calculateSupplierScore = ({
    supplierPurchases = [],
}) => {
    if (!supplierPurchases.length) {
        return {
            score: 70,
            label: "Ma’lumot yetarli emas",
            variant: "neutral",
        };
    }

    let score = 100;

    const activePurchases =
        supplierPurchases.filter(
            (purchase) =>
                purchase.status !==
                "CANCELLED",
        );

    const cancelledCount =
        supplierPurchases.filter(
            (purchase) =>
                purchase.status ===
                "CANCELLED",
        ).length;

    score -= cancelledCount * 5;

    const today =
        new Date()
            .toISOString()
            .slice(0, 10);

    const latePurchases =
        activePurchases.filter(
            (purchase) =>
                purchase.expectedDate &&
                purchase.expectedDate <
                today &&
                purchase.status !==
                "RECEIVED",
        );

    score -= latePurchases.length * 7;

    const debt =
        activePurchases.reduce(
            (total, purchase) =>
                total +
                Number(
                    purchase.debtAmount || 0,
                ),
            0,
        );

    const total =
        activePurchases.reduce(
            (sum, purchase) =>
                sum +
                Number(
                    purchase.total || 0,
                ),
            0,
        );

    if (total > 0) {
        const debtRatio =
            debt / total;

        if (debtRatio > 0.7) {
            score -= 10;
        } else if (
            debtRatio > 0.4
        ) {
            score -= 6;
        } else if (
            debtRatio > 0.2
        ) {
            score -= 3;
        }
    }

    score = Math.max(
        0,
        Math.min(100, score),
    );

    if (score >= 90) {
        return {
            score,
            label: "Juda yaxshi",
            variant: "success",
        };
    }

    if (score >= 75) {
        return {
            score,
            label: "Yaxshi",
            variant: "primary",
        };
    }

    if (score >= 60) {
        return {
            score,
            label: "O‘rtacha",
            variant: "warning",
        };
    }

    return {
        score,
        label: "Riskli",
        variant: "danger",
    };
};

export const getSupplierPriceTrends = (
    supplierPurchases = [],
) => {
    const grouped =
        new Map();

    const sortedPurchases = [
        ...supplierPurchases,
    ].sort((a, b) =>
        String(
            a.orderDate || "",
        ).localeCompare(
            String(
                b.orderDate || "",
            ),
        ),
    );

    sortedPurchases.forEach(
        (purchase) => {
            if (
                purchase.status ===
                "CANCELLED"
            ) {
                return;
            }

            purchase.items?.forEach(
                (item) => {
                    if (!item.productId) {
                        return;
                    }

                    if (
                        !grouped.has(
                            item.productId,
                        )
                    ) {
                        grouped.set(
                            item.productId,
                            {
                                productId:
                                    item.productId,

                                productName:
                                    item.productName,

                                unit:
                                    item.unit,

                                prices: [],
                            },
                        );
                    }

                    grouped
                        .get(
                            item.productId,
                        )
                        .prices.push({
                            price:
                                Number(
                                    item.purchasePrice ||
                                    0,
                                ),

                            date:
                                purchase.orderDate,
                        });
                },
            );
        },
    );

    return Array.from(
        grouped.values(),
    )
        .map((item) => {
            const prices =
                item.prices.slice(-5);

            const firstPrice =
                prices[0]?.price || 0;

            const lastPrice =
                prices[
                    prices.length - 1
                ]?.price || 0;

            const change =
                lastPrice -
                firstPrice;

            const percent =
                firstPrice > 0
                    ? (change /
                        firstPrice) *
                    100
                    : 0;

            return {
                ...item,
                prices,
                firstPrice,
                lastPrice,
                change,
                percent,
            };
        })
        .sort(
            (a, b) =>
                Math.abs(b.percent) -
                Math.abs(a.percent),
        );
};

export const getSupplierRiskAlerts = ({
    supplierPurchases = [],
    priceTrends = [],
}) => {
    const alerts = [];

    const today =
        new Date()
            .toISOString()
            .slice(0, 10);

    const latePurchases =
        supplierPurchases.filter(
            (purchase) =>
                purchase.expectedDate &&
                purchase.expectedDate <
                today &&
                purchase.status !==
                "RECEIVED" &&
                purchase.status !==
                "CANCELLED",
        );

    if (latePurchases.length >= 2) {
        alerts.push({
            id: "late-purchases",
            level: "danger",
            title:
                "Yetkazib berish kechikmoqda",
            description:
                `${latePurchases.length} ta buyurtma muddatidan o‘tgan.`,
        });
    } else if (
        latePurchases.length === 1
    ) {
        alerts.push({
            id: "late-purchase",
            level: "warning",
            title:
                "Kechikayotgan buyurtma bor",
            description:
                "1 ta buyurtma kutilgan sanadan o‘tib ketgan.",
        });
    }

    const highPriceTrend =
        priceTrends.find(
            (trend) =>
                trend.prices.length >=
                2 &&
                trend.percent >= 10,
        );

    if (highPriceTrend) {
        alerts.push({
            id: "price-growth",
            level: "warning",
            title:
                "Narx sezilarli oshgan",
            description:
                `${highPriceTrend.productName} narxi ${highPriceTrend.percent.toFixed(
                    1,
                )}% ga oshgan.`,
        });
    }

    const totalDebt =
        supplierPurchases.reduce(
            (total, purchase) =>
                total +
                Number(
                    purchase.debtAmount || 0,
                ),
            0,
        );

    const totalPurchases =
        supplierPurchases.reduce(
            (total, purchase) =>
                total +
                Number(
                    purchase.total || 0,
                ),
            0,
        );

    if (
        totalPurchases > 0 &&
        totalDebt /
        totalPurchases >
        0.6
    ) {
        alerts.push({
            id: "high-debt",
            level: "warning",
            title:
                "Qarzdorlik yuqori",
            description:
                "Ushbu yetkazib beruvchi bo‘yicha xaridlarning katta qismi hali to‘lanmagan.",
        });
    }

    return alerts;
};