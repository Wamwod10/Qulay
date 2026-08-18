import { translateText } from "../../../../localization/i18n";

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
            return translateText("Qabul qilindi");

        case "PARTIAL":
            return translateText("Qisman qabul");

        case "FAIL":
            return translateText("Rad etildi");

        default:
            return translateText("Tekshirilmagan");
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
