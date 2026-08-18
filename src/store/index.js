import {
  configureStore,
} from "@reduxjs/toolkit";

import {
  baseApi,
} from "../services/api/baseApi";

import {
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

store.subscribe(() => {
  const currentSettings =
    store.getState().settings;

  if (
    currentSettings !==
    previousSettings
  ) {
    previousSettings =
      currentSettings;

    if (getCurrentAccountId()) {
      savePlatformSettings(
        currentSettings,
      );
    }
  }
});
