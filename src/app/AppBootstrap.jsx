import { useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";

import { logout, setAuth } from "../store/slices/authSlice";
import { setGlobalLoading } from "../store/slices/appSlice";
import { setCompany } from "../store/slices/tenantSlice";
import { setSettings } from "../store/slices/settingsSlice";
import { setEnabledModules } from "../store/slices/modulesSlice";
import authService from "../modules/auth/services/authService";
import {
  loadPlatformSettings,
  markSettingsHydrated,
} from "../modules/settings/utils/settingsStorage";
import { SUPER_ADMIN_ROLE } from "../constants/auth";
import { resetTenant } from "../store/slices/tenantSlice";
import { preloadBusinessData } from "../services/api/businessDataLoader";

const AppBootstrap = ({ children }) => {
  const dispatch = useDispatch();
  const bootstrapStarted = useRef(false);

  const isAuthInitialized = useSelector((state) => state.auth.isInitialized);

  useEffect(() => {
    if (isAuthInitialized || bootstrapStarted.current) {
      return undefined;
    }

    bootstrapStarted.current = true;

    const bootstrap = async () => {
      try {
        dispatch(setGlobalLoading(true));

        if (!isAuthInitialized) {
          const result = await authService.getSession();

          if (result.isAuthenticated) {
            dispatch(setAuth(result));
            if (result.user?.role === SUPER_ADMIN_ROLE) {
              dispatch(resetTenant());
            } else if (result.account) {
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
            if (result.user?.role !== SUPER_ADMIN_ROLE) {
              await preloadBusinessData();
              const settings = await loadPlatformSettings();
              markSettingsHydrated();
              dispatch(setSettings(settings));
            }
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

    return undefined;
  }, [dispatch, isAuthInitialized]);

  return children;
};

export default AppBootstrap;
