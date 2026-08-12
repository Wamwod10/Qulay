import { combineReducers } from "@reduxjs/toolkit";

import { baseApi } from "../services/api/baseApi";

import appReducer from "./slices/appSlice";
import authReducer from "./slices/authSlice";
import modulesReducer from "./slices/modulesSlice";
import permissionsReducer from "./slices/permissionsSlice";
import settingsReducer from "./slices/settingsSlice";
import tenantReducer from "./slices/tenantSlice";

const rootReducer = combineReducers({
  app: appReducer,
  auth: authReducer,
  tenant: tenantReducer,
  permissions: permissionsReducer,
  modules: modulesReducer,
  settings: settingsReducer,

  [baseApi.reducerPath]: baseApi.reducer,
});

export default rootReducer;