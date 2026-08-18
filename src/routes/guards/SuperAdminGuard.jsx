import { Navigate, Outlet } from "react-router-dom";
import { useSelector } from "react-redux";

import GlobalLoader from "../../components/GlobalLoader/GlobalLoader";
import { SUPER_ADMIN_ROLE } from "../../constants/auth";

const SuperAdminGuard = () => {
  const { user, isAuthenticated, isInitialized } = useSelector((state) => state.auth);

  if (!isInitialized) {
    return <GlobalLoader />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (user?.role !== SUPER_ADMIN_ROLE) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
};

export default SuperAdminGuard;
