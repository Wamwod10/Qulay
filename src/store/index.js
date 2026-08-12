import { configureStore } from "@reduxjs/toolkit";

import { baseApi } from "../services/api/baseApi";
import rootReducer from "./rootReducer";

export const store = configureStore({
  reducer: rootReducer,

  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(baseApi.middleware),

  devTools: import.meta.env.DEV,
});