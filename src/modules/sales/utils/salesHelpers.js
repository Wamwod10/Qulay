export const formatSaleMoney = (
    value,
) => {
    return new Intl.NumberFormat(
        "uz-UZ",
    ).format(
        Number(value) || 0,
    );
};

export const getSaleStatusLabel = (
    status,
) => {
    switch (status) {
        case "DRAFT":
            return "Qoralama";

        case "CONFIRMED":
            return "Tasdiqlangan";

        case "COMPLETED":
            return "Yakunlangan";

        case "CANCELLED":
            return "Bekor qilingan";

        default:
            return status || "—";
    }
};

export const getSaleStatusVariant = (
    status,
) => {
    switch (status) {
        case "CONFIRMED":
            return "warning";

        case "COMPLETED":
            return "success";

        case "CANCELLED":
            return "danger";

        default:
            return "neutral";
    }
};

export const getPaymentStatus = ({
    total,
    paidAmount,
}) => {
    const saleTotal =
        Number(total || 0);

    const paid =
        Number(paidAmount || 0);

    if (
        saleTotal > 0 &&
        paid >= saleTotal
    ) {
        return "PAID";
    }

    if (paid > 0) {
        return "PARTIAL";
    }

    return "UNPAID";
};

export const getPaymentStatusLabel = (
    status,
) => {
    switch (status) {
        case "PAID":
            return "To‘langan";

        case "PARTIAL":
            return "Qisman";

        default:
            return "To‘lanmagan";
    }
};

export const getPaymentStatusVariant = (
    status,
) => {
    switch (status) {
        case "PAID":
            return "success";

        case "PARTIAL":
            return "warning";

        default:
            return "danger";
    }
};