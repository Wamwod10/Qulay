export const formatManufacturingMoney = (
    value,
) => {
    return new Intl.NumberFormat(
        "uz-UZ",
    ).format(Number(value) || 0);
};

export const getProductionStatusLabel = (
    status,
) => {
    switch (status) {
        case "PLANNED":
            return "Rejalashtirilgan";

        case "IN_PROGRESS":
            return "Jarayonda";

        case "COMPLETED":
            return "Tugallangan";

        case "CANCELLED":
            return "Bekor qilingan";

        default:
            return status || "—";
    }
};

export const getProductionStatusVariant = (
    status,
) => {
    switch (status) {
        case "PLANNED":
            return "primary";

        case "IN_PROGRESS":
            return "warning";

        case "COMPLETED":
            return "success";

        case "CANCELLED":
            return "danger";

        default:
            return "neutral";
    }
};

export const calculateBomMaterialCost = (
    bom,
) => {
    if (!bom?.materials) {
        return 0;
    }

    return bom.materials.reduce(
        (total, material) =>
            total +
            Number(material.quantity || 0) *
            Number(material.cost || 0),
        0,
    );
};

export const calculateBomUnitCost = (
    bom,
) => {
    const total =
        calculateBomMaterialCost(bom);

    const output =
        Number(
            bom?.outputQuantity || 0,
        );

    if (output <= 0) {
        return 0;
    }

    return total / output;
};