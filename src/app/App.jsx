import AppRouter from "../routes/AppRouter";
import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";

import GlobalLoader from "../components/GlobalLoader/GlobalLoader";
import OfflineBanner from "../components/OfflineBanner/OfflineBanner";

import useAppLoading from "../hooks/useAppLoading";
import authService from "../modules/auth/services/authService";
import { logout } from "../store/slices/authSlice";
import { clearPermissions } from "../store/slices/permissionsSlice";

const App = () => {
  const dispatch = useDispatch();
  const isLoading = useAppLoading();
  const loadingMessage = useSelector((state) => state.app.globalLoadingMessage);

  useEffect(() => {
    const preventWheelChange = (event) => {
      if (event.target instanceof HTMLInputElement && event.target.type === "number" && document.activeElement === event.target) {
        event.preventDefault();
      }
    };
    document.addEventListener("wheel", preventWheelChange, { passive: false });
    return () => document.removeEventListener("wheel", preventWheelChange);
  }, []);

  useEffect(() => {
    const handleSessionExpired = () => {
      authService.logout();
      dispatch(logout());
      dispatch(clearPermissions());
    };

    window.addEventListener("erp:session-expired", handleSessionExpired);

    return () => {
      window.removeEventListener("erp:session-expired", handleSessionExpired);
    };
  }, [dispatch]);

  if (isLoading) {
    return <GlobalLoader message={loadingMessage} />;
  }

  return (
    <>
      <OfflineBanner />
      <AppRouter />
    </>
  );
};

export default App;
