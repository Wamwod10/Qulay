import { Navigate, Outlet } from "react-router-dom";

import GlobalLoader from "../../components/GlobalLoader/GlobalLoader";
import useAuth from "../../hooks/useAuth";

const AuthGuard = () => {
  const { isAuthenticated, isInitialized } = useAuth();

  if (!isInitialized) {
    return <GlobalLoader />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
};

export default AuthGuard;
