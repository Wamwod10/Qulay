import { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";

import { logout, setAuth } from "../store/slices/authSlice";
import { setGlobalLoading, setGlobalLoadingMessage } from "../store/slices/appSlice";
import { setCompany } from "../store/slices/tenantSlice";
import { setSettings } from "../store/slices/settingsSlice";
import { setEnabledModules } from "../store/slices/modulesSlice";
import { setPermissions, setRoles, clearPermissions } from "../store/slices/permissionsSlice";
import authService from "../modules/auth/services/authService";
import {
  getPlatformSettings,
  loadPlatformSettings,
  markSettingsHydrated,
} from "../modules/settings/utils/settingsStorage";
import { SUPER_ADMIN_ROLE } from "../constants/auth";
import { resetTenant } from "../store/slices/tenantSlice";

const hydrateSettings = (dispatch) => {
  markSettingsHydrated();
  dispatch(setSettings(getPlatformSettings()));

  window.requestIdleCallback?.(() => {
    loadPlatformSettings()
      .then((settings) => {
        markSettingsHydrated();
        dispatch(setSettings(settings));
      })
      .catch(() => undefined);
  }) || window.setTimeout(() => {
    loadPlatformSettings()
      .then((settings) => {
        markSettingsHydrated();
        dispatch(setSettings(settings));
      })
      .catch(() => undefined);
  }, 0);
};

const AppBootstrap = ({ children }) => {
  const dispatch = useDispatch();
  const bootstrapStarted = useRef(false);
  const [bootstrapError, setBootstrapError] = useState("");
  const [retryToken, setRetryToken] = useState(0);

  const isAuthInitialized = useSelector((state) => state.auth.isInitialized);

  useEffect(() => {
    if (isAuthInitialized || bootstrapStarted.current) {
      return undefined;
    }

    bootstrapStarted.current = true;

    const bootstrap = async () => {
      let wakeupTimer = null;

      try {
        setBootstrapError("");
        dispatch(setGlobalLoading({
          loading: true,
          message: "Platforma yuklanmoqda...",
        }));
        wakeupTimer = window.setTimeout(() => {
          dispatch(setGlobalLoadingMessage("Server uyg'onmoqda..."));
        }, 3000);

        if (!isAuthInitialized) {
          const result = await authService.getSession();

          if (result.isRecoverable) {
            setBootstrapError(result.error || "Platformani yuklab bo'lmadi.");
            return;
          }

          if (result.isAuthenticated) {
            if (!result.user) {
              setBootstrapError("Foydalanuvchi ma'lumotlarini yuklab bo'lmadi.");
              return;
            }

            if (result.user.role !== SUPER_ADMIN_ROLE && !result.account) {
              setBootstrapError("Kompaniya kontekstini yuklab bo'lmadi.");
              return;
            }

            dispatch(setAuth(result));
            dispatch(setPermissions(result.user?.permissions || []));
            dispatch(setRoles(result.user?.role ? [result.user.role] : []));
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
              hydrateSettings(dispatch);
            }
          } else {
            dispatch(logout());
            dispatch(clearPermissions());
          }
        }
      } catch (error) {
        if (import.meta.env.DEV) {
          console.error("App bootstrap error:", error);
        }
        setBootstrapError(error?.message || "Platformani yuklab bo'lmadi.");
      } finally {
        if (wakeupTimer) window.clearTimeout(wakeupTimer);
        dispatch(setGlobalLoading(false));
      }
    };

    bootstrap();

    return undefined;
  }, [dispatch, isAuthInitialized, retryToken]);

  if (bootstrapError) {
    return (
      <div className="global-loader" role="alert">
        <div className="global-loader__logo">U</div>
        <p>{bootstrapError}</p>
        <button
          type="button"
          className="global-loader__retry"
          onClick={() => {
            bootstrapStarted.current = false;
            setRetryToken((current) => current + 1);
          }}
        >
          Qayta urinish
        </button>
      </div>
    );
  }

  return children;
};

export default AppBootstrap;
