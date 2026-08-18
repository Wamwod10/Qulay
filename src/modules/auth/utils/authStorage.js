const ACCOUNTS_KEY = "erp:auth:accounts";
const USERS_KEY = "erp:auth:users";
const LOCAL_SESSION_KEY = "erp:auth:session";
const TEMP_SESSION_KEY = "erp:auth:session:temporary";

const canUseStorage = () => typeof window !== "undefined" && window.localStorage;
const canUseSessionStorage = () =>
  typeof window !== "undefined" && window.sessionStorage;

const readJson = (storage, key, fallback) => {
  try {
    const stored = storage.getItem(key);
    return stored ? JSON.parse(stored) : fallback;
  } catch {
    return fallback;
  }
};

const writeJson = (storage, key, value) => {
  storage.setItem(key, JSON.stringify(value));
};

export const normalizeEmail = (email = "") => String(email).trim().toLowerCase();

export const normalizePhone = (phone = "") =>
  String(phone).replace(/\s+/g, " ").trim();

export const getAccounts = () =>
  canUseStorage() ? readJson(window.localStorage, ACCOUNTS_KEY, []) : [];

export const saveAccounts = (accounts) => {
  if (!canUseStorage()) {
    return false;
  }

  writeJson(window.localStorage, ACCOUNTS_KEY, accounts);
  return true;
};

export const getUsers = () =>
  canUseStorage() ? readJson(window.localStorage, USERS_KEY, []) : [];

export const saveUsers = (users) => {
  if (!canUseStorage()) {
    return false;
  }

  writeJson(window.localStorage, USERS_KEY, users);
  return true;
};

export const findUserByLogin = (identifier = "") => {
  const value = String(identifier).trim().toLowerCase();

  return getUsers().find(
    (user) =>
      normalizeEmail(user.email) === value ||
      normalizePhone(user.phone).toLowerCase() === value,
  );
};

export const getStoredSession = () => {
  if (!canUseStorage()) {
    return null;
  }

  const persistent = readJson(window.localStorage, LOCAL_SESSION_KEY, null);

  if (persistent) {
    return persistent;
  }

  return canUseSessionStorage()
    ? readJson(window.sessionStorage, TEMP_SESSION_KEY, null)
    : null;
};

export const saveStoredSession = (session) => {
  if (!canUseStorage()) {
    return false;
  }

  clearStoredSession();

  if (session.rememberMe && canUseStorage()) {
    writeJson(window.localStorage, LOCAL_SESSION_KEY, session);
    return true;
  }

  if (canUseSessionStorage()) {
    writeJson(window.sessionStorage, TEMP_SESSION_KEY, session);
    return true;
  }

  writeJson(window.localStorage, LOCAL_SESSION_KEY, { ...session, rememberMe: true });
  return true;
};

export const clearStoredSession = () => {
  if (canUseStorage()) {
    window.localStorage.removeItem(LOCAL_SESSION_KEY);
  }

  if (canUseSessionStorage()) {
    window.sessionStorage.removeItem(TEMP_SESSION_KEY);
  }
};

export const getAuthStorageKeys = () => ({
  accounts: ACCOUNTS_KEY,
  users: USERS_KEY,
  localSession: LOCAL_SESSION_KEY,
  temporarySession: TEMP_SESSION_KEY,
});
