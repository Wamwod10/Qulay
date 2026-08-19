import {
  clearStoredSession,
  getStoredSession,
  saveStoredSession,
} from "../utils/authStorage";

import { API_BASE_URL } from "../../../services/api/apiUrl";

const getMessage = async (response) => {
  try {
    const data = await response.json();
    return data.message || data.error || "Server xatosi";
  } catch {
    return "Server xatosi";
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
  const headers = {
    "Content-Type": "application/json",
    Accept: "application/json",
    ...(session?.accessToken ? { Authorization: `Bearer ${session.accessToken}` } : {}),
    ...(session?.accountId && session.accountId !== "platform"
      ? { "X-Company-Id": session.accountId }
      : {}),
    ...(options.headers || {}),
  };

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    throw new Error(await getMessage(response));
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
};

export const authService = {
  async register(values) {
    const result = await request("/auth/register", {
      method: "POST",
      body: JSON.stringify(values),
    });

    return persistAuth(result);
  },

  async login(values) {
    const result = await request("/auth/login", {
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
      const result = await request("/auth/me");
      return persistAuth(result);
    } catch (error) {
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
    return persistAuth(await request("/auth/profile", {
      method: "POST",
      body: JSON.stringify(values),
    }));
  },

  async updateAccount(values) {
    return persistAuth(await request("/auth/account", {
      method: "POST",
      body: JSON.stringify(values),
    }));
  },

  async changePassword(values) {
    return request("/auth/password", {
      method: "POST",
      body: JSON.stringify(values),
    });
  },

  async resetPassword(values) {
    return request("/auth/reset-password", {
      method: "POST",
      body: JSON.stringify(values),
    });
  },

};

export default authService;
