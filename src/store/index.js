import {
  configureStore,
} from "@reduxjs/toolkit";

import {
  baseApi,
} from "../services/api/baseApi";

import {
  consumeSettingsHydration,
  savePlatformSettings,
} from "../modules/settings/utils/settingsStorage";
import { getCurrentAccountId } from "../modules/auth/utils/tenantStorage";

import rootReducer from "./rootReducer";

export const store =
  configureStore({
    reducer:
      rootReducer,

    middleware: (
      getDefaultMiddleware,
    ) =>
      getDefaultMiddleware().concat(
        baseApi.middleware,
      ),

    devTools:
      import.meta.env.DEV,
  });

let previousSettings =
  store.getState().settings;
let settingsSaveTimer = null;
let pendingSettings = null;

store.subscribe(() => {
  const currentSettings =
    store.getState().settings;

  if (
    currentSettings !==
    previousSettings
  ) {
    previousSettings =
      currentSettings;

    if (consumeSettingsHydration() || !getCurrentAccountId()) {
      return;
    }

    if (getCurrentAccountId()) {
      if (typeof window === "undefined") {
        return;
      }

      pendingSettings = currentSettings;

      if (settingsSaveTimer) {
        window.clearTimeout(settingsSaveTimer);
      }

      settingsSaveTimer = window.setTimeout(() => {
        const settingsToSave = pendingSettings;
        pendingSettings = null;
        settingsSaveTimer = null;

        if (settingsToSave) {
          void savePlatformSettings(settingsToSave);
        }
      }, 250);
    }
  }
});
