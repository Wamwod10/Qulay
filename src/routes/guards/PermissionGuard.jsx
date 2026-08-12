import { Navigate, Outlet } from "react-router-dom";

import usePermissions from "../../hooks/usePermissions";

const PermissionGuard = ({ permission }) => {
  const { can } = usePermissions();

  if (!can(permission)) {
    return (
      <Navigate
        to="/dashboard"
        replace
      />
    );
  }

  return <Outlet />;
};

export default PermissionGuard;