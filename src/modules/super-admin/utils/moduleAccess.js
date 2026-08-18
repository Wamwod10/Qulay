export const normalizeModuleMap = (
    result,
) => {
    if (!result) {
        return {};
    }

    if (Array.isArray(result)) {
        return Object.fromEntries(
            result
                .filter(Boolean)
                .map((item) => [
                    item.moduleKey ||
                    item.key,

                    item.enabled !==
                    false,
                ]),
        );
    }

    if (
        Array.isArray(
            result.modules,
        )
    ) {
        return normalizeModuleMap(
            result.modules,
        );
    }

    return (
        result.modules ||
        result
    );
};

export const canAccessModule = ({
    moduleKey,
    globalModules,
    accountModules,
}) => {
    if (!moduleKey) {
        return true;
    }

    /*
     * Agar backendda module haqida
     * hali hech qanday setting bo'lmasa,
     * backwards compatibility uchun ON.
     */
    const globalEnabled =
        globalModules?.[
        moduleKey
        ] !== false;

    if (!globalEnabled) {
        return false;
    }

    const accountEnabled =
        accountModules?.[
        moduleKey
        ] !== false;

    return accountEnabled;
};