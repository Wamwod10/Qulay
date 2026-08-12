import { useCallback } from "react";
import { useSelector } from "react-redux";

const useModuleAccess = () => {
    const enabledModules = useSelector(
        (state) => state.modules.enabledModules,
    );

    const hasModule = useCallback(
        (moduleKey) => {
            if (!moduleKey) {
                return true;
            }

            return enabledModules.includes(moduleKey);
        },
        [enabledModules],
    );

    return {
        enabledModules,
        hasModule,
    };
};

export default useModuleAccess;