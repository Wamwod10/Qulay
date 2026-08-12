export const calculateSaleSubtotal = (
    items = [],
) => {
    return items.reduce(
        (total, item) =>
            total +
            Number(item.quantity || 0) *
            Number(item.price || 0),
        0,
    );
};

export const calculateSaleDiscount = ({
    subtotal,
    discountType,
    discountValue,
}) => {
    const value =
        Number(discountValue || 0);

    if (value <= 0) {
        return 0;
    }

    if (
        discountType === "PERCENT"
    ) {
        return Math.min(
            subtotal,
            subtotal *
            (value / 100),
        );
    }

    return Math.min(
        subtotal,
        value,
    );
};

export const calculateSaleTotals = ({
    items = [],
    discountType = "AMOUNT",
    discountValue = 0,
    paidAmount = 0,
}) => {
    const subtotal =
        calculateSaleSubtotal(
            items,
        );

    const discount =
        calculateSaleDiscount({
            subtotal,
            discountType,
            discountValue,
        });

    const total =
        Math.max(
            subtotal - discount,
            0,
        );

    const paid =
        Math.max(
            Number(paidAmount || 0),
            0,
        );

    const debt =
        Math.max(
            total - paid,
            0,
        );

    return {
        subtotal,
        discount,
        total,
        paidAmount:
            Math.min(paid, total),
        debtAmount: debt,
    };
};