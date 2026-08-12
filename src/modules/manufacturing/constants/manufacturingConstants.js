export const PRODUCTION_STATUS = {
    PLANNED: "PLANNED",
    IN_PROGRESS: "IN_PROGRESS",
    COMPLETED: "COMPLETED",
    CANCELLED: "CANCELLED",
};

export const PRODUCTION_STATUS_OPTIONS = [
    {
        value: "PLANNED",
        label: "Rejalashtirilgan",
    },
    {
        value: "IN_PROGRESS",
        label: "Jarayonda",
    },
    {
        value: "COMPLETED",
        label: "Tugallangan",
    },
    {
        value: "CANCELLED",
        label: "Bekor qilingan",
    },
];

export const BOM_STATUS = {
    ACTIVE: "ACTIVE",
    INACTIVE: "INACTIVE",
};

export const MANUFACTURING_PRODUCT_TYPES = [
    "RAW_MATERIAL",
    "SEMI_FINISHED",
    "FINISHED_GOOD",
];