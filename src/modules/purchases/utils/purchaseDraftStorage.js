import { tenantGet, tenantRemove, tenantSet } from "../../auth/utils/tenantStorage";

const DRAFT_KEY =
    "purchase_draft";

export const getPurchaseDraft =
    () => {
        try {
            const stored =
                tenantGet(
                    DRAFT_KEY,
                    null,
                );

            return stored || null;
        } catch {
            return null;
        }
    };

export const savePurchaseDraft = (
    draft,
) => {
    try {
        tenantSet(
            DRAFT_KEY,
            {
                ...draft,

                savedAt:
                    new Date().toLocaleString(
                        "uz-UZ",
                    ),
            },
        );
    } catch (error) {
        if (import.meta.env.DEV) {
            console.error(
                "Purchase draft save error:",
                error,
            );
        }
    }
};

export const clearPurchaseDraft =
    () => {
        tenantRemove(DRAFT_KEY);
    };
