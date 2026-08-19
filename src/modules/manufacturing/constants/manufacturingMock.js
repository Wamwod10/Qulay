export const INITIAL_BOMS = [
    {
        id: "bom-001",

        name: "Shokoladli pechenye retsepti",

        productId: "prd-004",
        productName: "Shokoladli pechenye",

        outputQuantity: 100,
        unit: "dona",

        version: "1.0",

        status: "ACTIVE",

        materials: [
            {
                id: "bm-001",
                productId: "prd-001",
                productName: "Un Premium",
                sku: "4821",
                quantity: 12,
                unit: "kg",
                cost: 4200,
            },
            {
                id: "bm-002",
                productId: "prd-002",
                productName: "Shakar",
                sku: "7314",
                quantity: 4,
                unit: "kg",
                cost: 13500,
            },
            {
                id: "bm-003",
                productId: "prd-003",
                productName: "Vanilin",
                sku: "2059",
                quantity: 0.2,
                unit: "kg",
                cost: 78000,
            },
        ],

        note: "",

        createdAt: "10.08.2026 10:00",
    },
];

export const INITIAL_PRODUCTION_ORDERS = [
    {
        id: "prod-001",

        number: "PR-1001",

        productId: "prd-004",
        productName: "Shokoladli pechenye",

        bomId: "bom-001",

        plannedQuantity: 1000,
        producedQuantity: 0,

        unit: "dona",

        status: "PLANNED",

        warehouseId: "wh-production",

        plannedDate: "2026-08-12",

        startedAt: null,
        completedAt: null,

        wasteQuantity: 0,
        defectQuantity: 0,

        note: "",

        createdAt: "11.08.2026 09:00",
    },
];
