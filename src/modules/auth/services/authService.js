import {
  clearStoredSession,
  getStoredSession,
  saveStoredSession,
} from "../utils/authStorage";

import { API_BASE_URL } from "../../../services/api/apiUrl";
import { getApiErrorMessage } from "../../../services/api/apiErrorHandler";

const DEFAULT_REQUEST_TIMEOUT_MS = 15000;
const SESSION_RESTORE_TIMEOUT_MS = 15000;

const delay = (ms) => new Promise((resolve) => {
  window.setTimeout(resolve, ms);
});

const createTimeoutError = () => {
  const error = new Error("Server javob bermayapti. Qayta urinib ko'ring.");
  error.code = "REQUEST_TIMEOUT";
  error.status = 0;
  error.isRecoverable = true;
  return error;
};

const createHttpError = (message, status) => {
  const error = new Error(message);
  error.status = status;
  error.statusCode = status;
  error.isRecoverable = status === 408 || status === 429 || status >= 500;
  return error;
};

const isTransientError = (error) =>
  error?.code === "REQUEST_TIMEOUT" ||
  error?.status === 0 ||
  error?.status === 408 ||
  error?.status === 429 ||
  error?.status === 502 ||
  error?.status === 503 ||
  error?.status === 504 ||
  error?.status >= 500;

const getMessage = async (response) => {
  try {
    const data = await response.json();
    return getApiErrorMessage({ status: response.status, code: data.code, data });
  } catch {
    return getApiErrorMessage({ status: response.status });
  }
};

const persistAuth = (result) => {
  const accessToken = result.accessToken || getStoredSession()?.accessToken || null;
  const normalizedResult = {
    ...result,
    accessToken,
    isAuthenticated: Boolean(result.user && accessToken),
  };
  const session = {
    ...(normalizedResult.session || {}),
    accessToken,
    user: normalizedResult.user,
    account: normalizedResult.account,
  };

  saveStoredSession(session);

  if (typeof window !== "undefined") {
    window.localStorage.setItem("accessToken", accessToken || "");
    window.localStorage.setItem("token", accessToken || "");
  }

  return normalizedResult;
};

const request = async (path, options = {}) => {
  const session = getStoredSession();
  const {
    timeoutMs = DEFAULT_REQUEST_TIMEOUT_MS,
    retries = 0,
    retryDelayMs = 800,
    ...fetchOptions
  } = options;
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);
  const headers = {
    "Content-Type": "application/json",
    Accept: "application/json",
    ...(session?.accessToken ? { Authorization: `Bearer ${session.accessToken}` } : {}),
    ...(session?.accountId && session.accountId !== "platform"
      ? { "X-Company-Id": session.accountId }
      : {}),
    ...(fetchOptions.headers || {}),
  };

  let response;

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...fetchOptions,
      headers,
      signal: controller.signal,
    });
  } catch (error) {
    if (error.name === "AbortError") {
      throw createTimeoutError();
    }

    error.status = error.status || 0;
    error.isRecoverable = true;
    throw error;
  } finally {
    window.clearTimeout(timeoutId);
  }

  if (!response.ok) {
    throw createHttpError(await getMessage(response), response.status);
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
};

const requestWithRetry = async (path, options = {}) => {
  const retries = Math.max(Number(options.retries) || 0, 0);
  let lastError = null;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      return await request(path, { ...options, retries: 0 });
    } catch (error) {
      lastError = error;

      if (attempt >= retries || !isTransientError(error)) {
        throw error;
      }

      await delay((Number(options.retryDelayMs) || 800) * (attempt + 1));
    }
  }

  throw lastError;
};

export const authService = {
  async register(values) {
    const result = await requestWithRetry("/auth/register", {
      method: "POST",
      body: JSON.stringify(values),
    });

    return persistAuth(result);
  },

  async login(values) {
    const result = await requestWithRetry("/auth/login", {
      method: "POST",
      body: JSON.stringify(values),
    });

    return persistAuth(result);
  },

  logout() {
    request("/auth/logout", { method: "POST" }).catch(() => {});
    clearStoredSession();

    if (typeof window !== "undefined") {
      window.localStorage.removeItem("accessToken");
      window.localStorage.removeItem("token");
    }
  },

  async getSession() {
    const session = getStoredSession();

    if (!session?.accessToken) {
      return {
        user: null,
        account: null,
        session: null,
        accessToken: null,
        isAuthenticated: false,
      };
    }

    try {
      const result = await requestWithRetry("/auth/me", {
        timeoutMs: SESSION_RESTORE_TIMEOUT_MS,
        retries: 2,
        retryDelayMs: 1200,
      });
      return persistAuth(result);
    } catch (error) {
      if (error.isRecoverable || error.code === "REQUEST_TIMEOUT") {
        return {
          user: null,
          account: null,
          session,
          accessToken: session.accessToken,
          isAuthenticated: false,
          isRecoverable: true,
          error: error.message,
        };
      }

      clearStoredSession();
      return {
        user: null,
        account: null,
        session: null,
        accessToken: null,
        isAuthenticated: false,
        error: error.message,
      };
    }
  },

  async updateProfile(values) {
    return persistAuth(await requestWithRetry("/auth/profile", {
      method: "POST",
      body: JSON.stringify(values),
    }));
  },

  async updateAccount(values) {
    return persistAuth(await requestWithRetry("/auth/account", {
      method: "POST",
      body: JSON.stringify(values),
    }));
  },

  async changePassword(values) {
    return requestWithRetry("/auth/password", {
      method: "POST",
      body: JSON.stringify(values),
    });
  },

  async resetPassword(values) {
    return requestWithRetry("/auth/reset-password", {
      method: "POST",
      body: JSON.stringify(values),
    });
  },

};

export default authService;
