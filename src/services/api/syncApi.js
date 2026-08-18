import { API_BASE_URL } from "./apiUrl";
import { isLocalBusinessFallbackEnabled } from "../../modules/auth/utils/tenantStorage";

const createApiUnavailableError = (path, status) => {
  const error = new Error(
    status
      ? `Server xatosi (${status}).`
      : `Server bilan bog'lanib bo'lmadi: ${path}`,
  );
  error.code = "API_UNAVAILABLE";
  error.status = status || 0;
  return error;
};

const getSession = () => {
  try {
    return (
      JSON.parse(localStorage.getItem("erp:auth:session") || "null") ||
      JSON.parse(sessionStorage.getItem("erp:auth:session:temporary") || "null")
    );
  } catch {
    return null;
  }
};

export const syncApiRequest = (path, options = {}) => {
  if (typeof window === "undefined") {
    return null;
  }

  const session = getSession();
  const token =
    session?.accessToken ||
    localStorage.getItem("accessToken") ||
    localStorage.getItem("token") ||
    "";

  if (!token) {
    if (!isLocalBusinessFallbackEnabled()) {
      throw createApiUnavailableError(path, 401);
    }
    return null;
  }

  const request = new XMLHttpRequest();
  request.open(options.method || "GET", `${API_BASE_URL}${path}`, false);
  request.setRequestHeader("Accept", "application/json");
  request.setRequestHeader("Content-Type", "application/json");
  request.setRequestHeader("Authorization", `Bearer ${token}`);

  if (session?.accountId && session.accountId !== "platform") {
    request.setRequestHeader("X-Company-Id", session.accountId);
  }

  if (options.idempotencyKey) {
    request.setRequestHeader("Idempotency-Key", options.idempotencyKey);
  }

  try {
    request.send(options.body === undefined ? null : JSON.stringify(options.body));
  } catch (error) {
    if (!isLocalBusinessFallbackEnabled()) {
      throw createApiUnavailableError(path, error?.status);
    }
    return null;
  }

  if (request.status < 200 || request.status >= 300) {
    if (!isLocalBusinessFallbackEnabled()) {
      throw createApiUnavailableError(path, request.status);
    }
    return null;
  }

  if (!request.responseText) {
    return { success: true };
  }

  try {
    return JSON.parse(request.responseText);
  } catch (error) {
    if (!isLocalBusinessFallbackEnabled()) {
      throw createApiUnavailableError(path, request.status);
    }
    return null;
  }
};

export const unwrapList = (result, keys = []) => {
  if (Array.isArray(result)) {
    return result;
  }

  for (const key of keys) {
    if (Array.isArray(result?.[key])) {
      return result[key];
    }
  }

  if (Array.isArray(result?.data)) {
    return result.data;
  }

  if (result !== null && result !== undefined && !isLocalBusinessFallbackEnabled()) {
    throw createApiUnavailableError("list response", 502);
  }

  return null;
};
