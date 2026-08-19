import { API_BASE_URL } from "./apiUrl";
import { isLocalBusinessFallbackEnabled } from "../../modules/auth/utils/tenantStorage";

const GET_CACHE_TTL_MS = 5000;
const responseCache = new Map();
const inFlightGets = new Map();

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

const emitApiStatus = (type, detail = {}) => {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(type, { detail }));
  }
};

const getSession = () => {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return (
      JSON.parse(localStorage.getItem("erp:auth:session") || "null") ||
      JSON.parse(sessionStorage.getItem("erp:auth:session:temporary") || "null")
    );
  } catch {
    return null;
  }
};

const getRequestContext = () => {
  const session = getSession();
  const token =
    session?.accessToken ||
    localStorage.getItem("accessToken") ||
    localStorage.getItem("token") ||
    "";

  return { session, token };
};

const getCacheKey = (path, session, token) =>
  `${session?.accountId || "-"}:${token}:${path}`;

const parseResponse = async (response, path) => {
  if (!response.ok) {
    if (isLocalBusinessFallbackEnabled()) {
      return null;
    }

    throw createApiUnavailableError(path, response.status);
  }

  if (response.status === 204) {
    return { success: true };
  }

  try {
    return await response.json();
  } catch {
    if (!isLocalBusinessFallbackEnabled()) {
      throw createApiUnavailableError(path, response.status);
    }

    return null;
  }
};

const request = async (path, options = {}) => {
  if (typeof window === "undefined") {
    return null;
  }

  const { session, token } = getRequestContext();

  if (!token) {
    if (!isLocalBusinessFallbackEnabled()) {
      throw createApiUnavailableError(path, 401);
    }

    return null;
  }

  const method = String(options.method || "GET").toUpperCase();
  const cacheKey = getCacheKey(path, session, token);

  if (method === "GET") {
    const cached = responseCache.get(cacheKey);

    if (cached && Date.now() - cached.createdAt < GET_CACHE_TTL_MS) {
      return cached.value;
    }

    if (inFlightGets.has(cacheKey)) {
      return inFlightGets.get(cacheKey);
    }
  } else {
    invalidateApiCache();
  }

  const headers = {
    Accept: "application/json",
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
    ...(session?.accountId && session.accountId !== "platform"
      ? { "X-Company-Id": session.accountId }
      : {}),
    ...(options.idempotencyKey
      ? { "Idempotency-Key": options.idempotencyKey }
      : {}),
    ...(options.headers || {}),
  };

  const promise = fetch(`${API_BASE_URL}${path}`, {
    ...options,
    method,
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  })
    .then((response) => parseResponse(response, path))
    .then((result) => {
      emitApiStatus("erp:api-online");
      if (method === "GET" && result !== null) {
        responseCache.set(cacheKey, { createdAt: Date.now(), value: result });
      }

      return result;
    })
    .catch((error) => {
      if (!isLocalBusinessFallbackEnabled()) {
        const normalizedError = error?.code === "API_UNAVAILABLE"
          ? error
          : createApiUnavailableError(path, error?.status);
        emitApiStatus("erp:api-error", { message: normalizedError.message });
        throw normalizedError;
      }

      return null;
    })
    .finally(() => {
      if (method === "GET") {
        inFlightGets.delete(cacheKey);
      }
    });

  if (method === "GET") {
    inFlightGets.set(cacheKey, promise);
  }

  return promise;
};

export const apiRequest = request;

export const getCachedApiResponse = (path) => {
  const { session, token } = getRequestContext();
  const cached = responseCache.get(getCacheKey(path, session, token));

  return cached?.value ?? null;
};

export const primeApiCache = (path, value) => {
  const { session, token } = getRequestContext();

  if (!token || value === undefined) {
    return;
  }

  responseCache.set(getCacheKey(path, session, token), {
    createdAt: Date.now(),
    value,
  });
};

export const invalidateApiCache = (path) => {
  if (!path) {
    responseCache.clear();
    return;
  }

  const { session, token } = getRequestContext();
  responseCache.delete(getCacheKey(path, session, token));
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
