import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import App from "./app/App";
import AppProviders from "./app/AppProviders";
import ErrorBoundary from "./app/ErrorBoundary";

import "./styles/global.scss";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <ErrorBoundary>
      <AppProviders>
        <App />
      </AppProviders>
    </ErrorBoundary>
  </StrictMode>,
);
