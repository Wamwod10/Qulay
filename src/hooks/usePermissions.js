import { useCallback } from "react";
import { useSelector } from "react-redux";

const usePermissions = () => {
    const permissions = useSelector(
        (state) => state.permissions.permissions,
    );

    const roles = useSelector(
        (state) => state.permissions.roles,
    );

    const can = useCallback(
        (permission) => {
            if (!permission) {
                return true;
            }

            return permissions.includes(permission);
        },
        [permissions],
    );

    const canAny = useCallback(
        (requiredPermissions = []) => {
            if (!requiredPermissions.length) {
                return true;
            }

            return requiredPermissions.some((permission) =>
                permissions.includes(permission),
            );
        },
        [permissions],
    );

    const canAll = useCallback(
        (requiredPermissions = []) => {
            if (!requiredPermissions.length) {
                return true;
            }

            return requiredPermissions.every((permission) =>
                permissions.includes(permission),
            );
        },
        [permissions],
    );

    return {
        permissions,
        roles,
        can,
        canAny,
        canAll,
    };
};

export default usePermissions;