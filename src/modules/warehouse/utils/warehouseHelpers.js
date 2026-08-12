export const getAvailableStock = (
    item,
) => {
    return Math.max(
        Number(item.quantity || 0) -
        Number(item.reserved || 0),
        0,
    );
};

export const getWarehouseStockStatus = (
    item,
) => {
    if (
        Number(item.quantity) <= 0
    ) {
        return "OUT_OF_STOCK";
    }

    if (
        Number(item.quantity) <=
        Number(item.minimumStock)
    ) {
        return "LOW_STOCK";
    }

    return "IN_STOCK";
};

export const getWarehouseStockStatusLabel = (
    item,
) => {
    const status =
        getWarehouseStockStatus(item);

    switch (status) {
        case "OUT_OF_STOCK":
            return "Tugagan";

        case "LOW_STOCK":
            return "Kam qolgan";

        default:
            return "Yetarli";
    }
};

export const getWarehouseStockBadgeVariant = (
    item,
) => {
    const status =
        getWarehouseStockStatus(item);

    switch (status) {
        case "OUT_OF_STOCK":
            return "danger";

        case "LOW_STOCK":
            return "warning";

        default:
            return "success";
    }
};

export const formatWarehouseMoney = (
    value,
) => {
    return new Intl.NumberFormat(
        "uz-UZ",
    ).format(Number(value) || 0);
};