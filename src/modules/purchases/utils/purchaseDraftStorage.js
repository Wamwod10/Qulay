const DRAFT_KEY =
    "universal_erp_purchase_draft";

export const getPurchaseDraft =
    () => {
        try {
            const stored =
                localStorage.getItem(
                    DRAFT_KEY,
                );

            return stored
                ? JSON.parse(stored)
                : null;
        } catch {
            return null;
        }
    };

export const savePurchaseDraft = (
    draft,
) => {
    try {
        localStorage.setItem(
            DRAFT_KEY,
            JSON.stringify({
                ...draft,

                savedAt:
                    new Date().toLocaleString(
                        "uz-UZ",
                    ),
            }),
        );
    } catch (error) {
        console.error(
            "Purchase draft save error:",
            error,
        );
    }
};

export const clearPurchaseDraft =
    () => {
        localStorage.removeItem(
            DRAFT_KEY,
        );
    };