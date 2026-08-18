import { Navigate, Outlet } from "react-router-dom";
import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";

import GlobalLoader from "../../components/GlobalLoader/GlobalLoader";
import authService from "../../modules/auth/services/authService";
import { logout, setAuth } from "../../store/slices/authSlice";

const SuperAdminGuard = () => {
  const dispatch = useDispatch();
  const user = useSelector((state) => state.auth.user);
  const isInitialized = useSelector((state) => state.auth.isInitialized);
  const [isVerifying, setIsVerifying] = useState(true);

  useEffect(() => {
    let active = true;

    if (!isInitialized || user?.role === "SUPER_ADMIN") {
      setIsVerifying(false);
      return () => {
        active = false;
      };
    }

    const verifySession = async () => {
      setIsVerifying(true);

      try {
        const result = await authService.getSession();

        if (!active) {
          return;
        }

        if (result.isAuthenticated) {
          dispatch(setAuth(result));
        } else {
          dispatch(logout());
        }
      } catch {
        if (active) {
          dispatch(logout());
        }
      } finally {
        if (active) {
          setIsVerifying(false);
        }
      }
    };

    verifySession();

    return () => {
      active = false;
    };
  }, [dispatch, isInitialized, user?.role]);

  if (!isInitialized || isVerifying) {
    return <GlobalLoader />;
  }

  if (user?.role !== "SUPER_ADMIN") {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
};

export default SuperAdminGuard;
