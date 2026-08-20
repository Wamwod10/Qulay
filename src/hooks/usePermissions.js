import { useCallback } from "react";
import { useSelector } from "react-redux";

const usePermissions = () => {
    const permissions = useSelector(
        (state) => state.permissions.permissions,
    );

    const roles = useSelector(
        (state) => state.permissions.roles,
    );
    const userRole = useSelector((state) => state.auth.user?.role);

    const can = useCallback(
        (permission) => {
            if (!permission) {
                return true;
            }

            return userRole === "OWNER" || userRole === "ADMIN" || permissions.includes("*") || permissions.includes(permission);
        },
        [permissions, userRole],
    );

    const canAny = useCallback(
        (requiredPermissions = []) => {
            if (!requiredPermissions.length) {
                return true;
            }

            return userRole === "OWNER" || userRole === "ADMIN" || requiredPermissions.some((permission) => permissions.includes("*") || permissions.includes(permission));
        },
        [permissions, userRole],
    );

    const canAll = useCallback(
        (requiredPermissions = []) => {
            if (!requiredPermissions.length) {
                return true;
            }

            return userRole === "OWNER" || userRole === "ADMIN" || requiredPermissions.every((permission) => permissions.includes("*") || permissions.includes(permission));
        },
        [permissions, userRole],
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
