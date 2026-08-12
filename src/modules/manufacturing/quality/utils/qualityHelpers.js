export const QUALITY_STATUS = {
    NOT_CHECKED: "NOT_CHECKED",
    PASS: "PASS",
    PARTIAL: "PARTIAL",
    FAIL: "FAIL",
};

export const getQualityStatusLabel = (
    status,
) => {
    switch (status) {
        case "PASS":
            return "Qabul qilindi";

        case "PARTIAL":
            return "Qisman qabul";

        case "FAIL":
            return "Rad etildi";

        default:
            return "Tekshirilmagan";
    }
};

export const getQualityStatusVariant = (
    status,
) => {
    switch (status) {
        case "PASS":
            return "success";

        case "PARTIAL":
            return "warning";

        case "FAIL":
            return "danger";

        default:
            return "neutral";
    }
};