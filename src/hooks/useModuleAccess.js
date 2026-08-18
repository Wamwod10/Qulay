import { useCallback } from "react";
import { useSelector } from "react-redux";

const useModuleAccess = () => {
    const enabledModules = useSelector(
        (state) => state.modules.enabledModules,
    );
    const isInitialized = useSelector(
        (state) => state.modules.isInitialized,
    );

    const hasModule = useCallback(
        (moduleKey) => {
            if (!moduleKey) {
                return true;
            }

            return isInitialized && enabledModules.includes(moduleKey);
        },
        [enabledModules, isInitialized],
    );

    return {
        enabledModules,
        isInitialized,
        hasModule,
    };
};

export default useModuleAccess;
