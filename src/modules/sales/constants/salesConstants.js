export const SALE_STATUS = {
    DRAFT: "DRAFT",
    CONFIRMED: "CONFIRMED",
    COMPLETED: "COMPLETED",
    CANCELLED: "CANCELLED",
};

export const PAYMENT_STATUS = {
    UNPAID: "UNPAID",
    PARTIAL: "PARTIAL",
    PAID: "PAID",
};

export const SALE_STATUS_OPTIONS = [
    {
        value: "DRAFT",
        label: "Qoralama",
    },
    {
        value: "CONFIRMED",
        label: "Tasdiqlangan",
    },
    {
        value: "COMPLETED",
        label: "Yakunlangan",
    },
    {
        value: "CANCELLED",
        label: "Bekor qilingan",
    },
];