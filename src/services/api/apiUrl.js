const trimTrailingSlash = (value = "") => String(value).replace(/\/+$/, "");

const rawApiUrl = () => {
  const configured = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL;

  if (configured) {
    return configured;
  }

  // Local development should set VITE_API_URL explicitly; production uses
  // the same-origin /api proxy when no public API origin is configured.
  return "/api";
};

export const getApiBaseUrl = () => {
  const url = trimTrailingSlash(rawApiUrl());

  return url.endsWith("/api") ? url : `${url}/api`;
};

export const getApiOrigin = () => getApiBaseUrl().replace(/\/api$/, "");

export const API_BASE_URL = getApiBaseUrl();
export const API_ORIGIN = getApiOrigin();
