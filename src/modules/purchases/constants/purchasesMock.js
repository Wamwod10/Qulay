export const PURCHASE_STATUS = {
    DRAFT: "DRAFT",
    ORDERED: "ORDERED",
    PARTIALLY_RECEIVED: "PARTIALLY_RECEIVED",
    RECEIVED: "RECEIVED",
    CANCELLED: "CANCELLED",
};

export const PURCHASE_STATUS_OPTIONS = [
    {
        value: "DRAFT",
        label: "Qoralama",
    },
    {
        value: "ORDERED",
        label: "Buyurtma berilgan",
    },
    {
        value: "PARTIALLY_RECEIVED",
        label: "Qisman qabul qilingan",
    },
    {
        value: "RECEIVED",
        label: "Qabul qilingan",
    },
    {
        value: "CANCELLED",
        label: "Bekor qilingan",
    },
];

export const INITIAL_PURCHASES = [
    {
        id: "pur-001",

        number: "PO-1001",

        supplierId: "sup-001",
        supplierName: "Oltin Don Trade",

        warehouseId: "wh-main",
        warehouseName: "Asosiy ombor",

        status: "RECEIVED",

        orderDate: "2026-08-05",
        expectedDate: "2026-08-06",

        items: [
            {
                id: "pi-001",

                productId: "prd-001",
                productName: "Un Premium",

                sku: "4821",

                unit: "kg",

                quantity: 300,
                receivedQuantity: 300,

                purchasePrice: 4200,

                total: 1260000,
            },
        ],

        subtotal: 1260000,
        discount: 0,
        tax: 0,

        total: 1260000,

        paidAmount: 1260000,
        debtAmount: 0,

        note: "",

        createdAt: "05.08.2026 10:15",
    },

    {
        id: "pur-002",

        number: "PO-1002",

        supplierId: "sup-002",
        supplierName: "Samarqand Sugar",

        warehouseId: "wh-main",
        warehouseName: "Asosiy ombor",

        status: "ORDERED",

        orderDate: "2026-08-09",
        expectedDate: "2026-08-10",

        items: [
            {
                id: "pi-002",

                productId: "prd-002",
                productName: "Shakar",

                sku: "7314",

                unit: "kg",

                quantity: 200,
                receivedQuantity: 0,

                purchasePrice: 13500,

                total: 2700000,
            },
        ],

        subtotal: 2700000,
        discount: 0,
        tax: 0,

        total: 2700000,

        paidAmount: 0,
        debtAmount: 2700000,

        note: "Ertalab yetkazib beriladi.",

        createdAt: "09.08.2026 14:20",
    },
];