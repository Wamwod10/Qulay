import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";

import { logout, setAuth } from "../store/slices/authSlice";
import { setGlobalLoading } from "../store/slices/appSlice";
import { setCompany } from "../store/slices/tenantSlice";
import { setSettings } from "../store/slices/settingsSlice";
import { setEnabledModules } from "../store/slices/modulesSlice";
import authService from "../modules/auth/services/authService";
import { loadPlatformSettings } from "../modules/settings/utils/settingsStorage";

const AppBootstrap = ({ children }) => {
  const dispatch = useDispatch();

  const isAuthInitialized = useSelector((state) => state.auth.isInitialized);

  useEffect(() => {
    const bootstrap = async () => {
      try {
        dispatch(setGlobalLoading(true));

        if (!isAuthInitialized) {
          const result = await authService.getSession();

          if (result.isAuthenticated) {
            dispatch(setAuth(result));
            if (result.account) {
              dispatch(
                setCompany({
                  id: result.account.id,
                  name: result.account.businessName,
                  ...result.account,
                }),
              );
            }
            if (Array.isArray(result.modules)) {
              dispatch(setEnabledModules(result.modules));
            }
            dispatch(setSettings(loadPlatformSettings()));
          } else {
            dispatch(logout());
          }
        }
      } catch (error) {
        console.error("App bootstrap error:", error);
      } finally {
        dispatch(setGlobalLoading(false));
      }
    };

    bootstrap();
  }, [dispatch, isAuthInitialized]);

  return children;
};

export default AppBootstrap;
