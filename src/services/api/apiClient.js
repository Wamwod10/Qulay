import { API_BASE_URL } from "./apiUrl";
import { getApiErrorMessage } from "./apiErrorHandler";
import { isLocalBusinessFallbackEnabled } from "../../modules/auth/utils/tenantStorage";

const GET_CACHE_TTL_MS = 5000;
const DEFAULT_REQUEST_TIMEOUT_MS = 20000;
const DEFAULT_GET_RETRIES = 2;
const RETRY_BASE_DELAY_MS = 700;

const responseCache = new Map();
const inFlightGets = new Map();

const delay = (ms) => new Promise((resolve) => {
  window.setTimeout(resolve, ms);
});

const createApiUnavailableError = (path, status = 0) => {
  const error = new Error(
    status === 401
      ? "Sessiya tugagan. Qayta kiring."
      : "Server bilan aloqa o'rnatilmadi. Qayta urinib ko'ring.",
  );

  error.code = status === 401 ? "UNAUTHENTICATED" : "API_UNAVAILABLE";
  error.status = status;
  error.statusCode = status;
  error.isApiError = true;
  error.path = path;

  return error;
};

const createRequestTimeoutError = (path) => {
  const error = createApiUnavailableError(path, 0);
  error.code = "REQUEST_TIMEOUT";
  error.message = "Server javob bermayapti. Qayta urinib ko'ring.";
  error.isNetworkError = true;
  return error;
};

const createApiError = (path, status, body = {}) => {
  const rawMessage = Array.isArray(body?.message)
    ? body.message.join(", ")
    : body?.message;

  const error = new Error(
    getApiErrorMessage({
      status,
      statusCode: body?.statusCode || status,
      code: body?.code,
      data: body,
    }) ||
    rawMessage ||
    "Amalni bajarib bo'lmadi. Qayta urinib ko'ring.",
  );

  error.status = status;
  error.statusCode = body?.statusCode || status;
  error.code =
    body?.code ||
    (status === 401 ? "UNAUTHENTICATED" : "API_ERROR");

  error.field = body?.field;
  error.details = body?.details;
  error.data = body;
  error.path = path;
  error.isApiError = true;

  return error;
};

const emitApiStatus = (type, detail = {}) => {
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent(type, {
        detail,
      }),
    );
  }
};

const getSession = () => {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return (
      JSON.parse(
        localStorage.getItem("erp:auth:session") || "null",
      ) ||
      JSON.parse(
        sessionStorage.getItem("erp:auth:session:temporary") || "null",
      )
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

  return {
    session,
    token,
  };
};

const getCacheKey = (path, session, token) =>
  `${session?.accountId || "-"}:${token}:${path}`;

const parseResponse = async (response, path) => {
  if (!response.ok) {
    let body = {};

    try {
      body = await response.json();
    } catch {
      body = {};
    }

    throw createApiError(path, response.status, body);
  }

  if (response.status === 204) {
    return {
      success: true,
    };
  }

  try {
    return await response.json();
  } catch {
    throw createApiError(path, response.status, {});
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

  const skipCache = Boolean(options.skipCache);

  if (method === "GET" && !skipCache) {
    const cached = responseCache.get(cacheKey);

    if (
      cached &&
      Date.now() - cached.createdAt < GET_CACHE_TTL_MS
    ) {
      return cached.value;
    }

    if (inFlightGets.has(cacheKey)) {
      return inFlightGets.get(cacheKey);
    }
  } else if (method !== "GET") {
    invalidateApiCache();
  }

  const {
    idempotencyKey,
    inlineModule,
    skipCache: _skipCache,
    retries: _retries,
    timeoutMs = DEFAULT_REQUEST_TIMEOUT_MS,
    headers: customHeaders,
    signal,
    ...fetchOptions
  } = options;

  const headers = {
    Accept: "application/json",
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,

    ...(session?.accountId &&
      session.accountId !== "platform"
      ? {
        "X-Company-Id": session.accountId,
      }
      : {}),

    ...(idempotencyKey
      ? {
        "Idempotency-Key": idempotencyKey,
      }
      : {}),

    ...(inlineModule
      ? {
        "X-Inline-Parent-Module": inlineModule,
      }
      : {}),

    ...(customHeaders || {}),
  };

  const fetchOnce = async () => {
    const controller = new AbortController();
    let timedOut = false;
    const timeoutId = window.setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, timeoutMs);
    const handleExternalAbort = () => controller.abort();

    if (signal) {
      if (signal.aborted) {
        controller.abort();
      } else {
        signal.addEventListener("abort", handleExternalAbort, { once: true });
      }
    }

    try {
      const response = await fetch(`${API_BASE_URL}${path}`, {
        ...fetchOptions,
        method,
        headers,
        signal: controller.signal,
        body:
          fetchOptions.body === undefined
            ? undefined
            : JSON.stringify(fetchOptions.body),
      });

      return parseResponse(response, path);
    } catch (error) {
      if (error?.name === "AbortError" && timedOut) {
        throw createRequestTimeoutError(path);
      }

      if (error?.name === "AbortError" && signal?.aborted) {
        error.code = "REQUEST_ABORTED";
        error.status = 0;
        error.path = path;
      }

      throw error;
    } finally {
      window.clearTimeout(timeoutId);
      signal?.removeEventListener?.("abort", handleExternalAbort);
    }
  };

  const promise = (async () => {
    const retryCount = getRetryCount(method, options);
    let lastError = null;

    for (let attempt = 0; attempt <= retryCount; attempt += 1) {
      try {
        return await fetchOnce();
      } catch (error) {
        lastError = error;

        if (
          attempt >= retryCount ||
          signal?.aborted ||
          error?.code === "REQUEST_ABORTED" ||
          !isRetryableStatus(error?.status || 0)
        ) {
          throw error;
        }

        await delay(RETRY_BASE_DELAY_MS * (attempt + 1));
      }
    }

    throw lastError;
  })()
    .then((result) => {
      emitApiStatus("erp:api-online");

      if (method === "GET" && result !== null) {
        responseCache.set(cacheKey, {
          createdAt: Date.now(),
          value: result,
        });
      }

      return result;
    })
    .catch((error) => {
      if (error?.isApiError) {
        if (error.status === 401) {
          emitApiStatus("erp:session-expired", {
            message: error.message,
            code: error.code,
            status: error.status,
            path: error.path,
          });
        }

        if (error.status === 0 || error.code === "REQUEST_TIMEOUT") {
          emitApiStatus("erp:api-error", {
            message: error.message,
            code: error.code,
            status: error.status,
            path: error.path,
          });
        }

        throw error;
      }

      if (isLocalBusinessFallbackEnabled()) {
        return null;
      }

      const normalizedError = createApiUnavailableError(
        path,
        error?.status || 0,
      );

      emitApiStatus("erp:api-error", {
        message: normalizedError.message,
        code: normalizedError.code,
        status: normalizedError.status,
        path: normalizedError.path,
      });

      throw normalizedError;
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

  const cached = responseCache.get(
    getCacheKey(path, session, token),
  );

  return cached?.value ?? null;
};

export const primeApiCache = (path, value) => {
  const { session, token } = getRequestContext();

  if (!token || value === undefined) {
    return;
  }

  responseCache.set(
    getCacheKey(path, session, token),
    {
      createdAt: Date.now(),
      value,
    },
  );
};

export const invalidateApiCache = (path) => {
  if (!path) {
    responseCache.clear();
    return;
  }

  const { session, token } = getRequestContext();

  responseCache.delete(
    getCacheKey(path, session, token),
  );
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

  if (
    result !== null &&
    result !== undefined &&
    !isLocalBusinessFallbackEnabled()
  ) {
    throw createApiUnavailableError(
      "list response",
      502,
    );
  }

  return null;
};

const isRetryableStatus = (status) =>
  status === 0 ||
  status === 408 ||
  status === 429 ||
  status === 502 ||
  status === 503 ||
  status === 504 ||
  status >= 500;

const getRetryCount = (method, options = {}) => {
  if (options.retries !== undefined) {
    return Math.max(Number(options.retries) || 0, 0);
  }

  return method === "GET" ? DEFAULT_GET_RETRIES : 0;
};
