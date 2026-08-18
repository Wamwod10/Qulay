import { Navigate, Outlet } from "react-router-dom";

import GlobalLoader from "../../components/GlobalLoader/GlobalLoader";
import useAuth from "../../hooks/useAuth";
import { SUPER_ADMIN_ROLE } from "../../constants/auth";

const GuestGuard = () => {
  const { user, isAuthenticated, isInitialized } = useAuth();

  if (!isInitialized) {
    return <GlobalLoader />;
  }

  if (isAuthenticated) {
    return <Navigate to={user?.role === SUPER_ADMIN_ROLE ? "/superadmin" : "/dashboard"} replace />;
  }

  return <Outlet />;
};

export default GuestGuard;
