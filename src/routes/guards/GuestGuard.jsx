import { Navigate, Outlet } from "react-router-dom";

import GlobalLoader from "../../components/GlobalLoader/GlobalLoader";
import useAuth from "../../hooks/useAuth";

const GuestGuard = () => {
  const { isAuthenticated, isInitialized } = useAuth();

  if (!isInitialized) {
    return <GlobalLoader />;
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
};

export default GuestGuard;
