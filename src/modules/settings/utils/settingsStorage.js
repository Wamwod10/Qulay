import {
  DEFAULT_SETTINGS,
  DEFAULT_TABLE_STATE,
  SETTINGS_SCHEMA_VERSION,
} from "../constants/settingsDefaults";
import {
  tenantGet,
  tenantRemove,
  tenantSet,
} from "../../auth/utils/tenantStorage";
import {
  getStoredLanguage,
} from "../../../localization/i18n";
import { normalizeLanguage } from "../../../localization/languages";
import { apiRequest } from "../../../services/api/apiClient";
import { API_BASE_URL } from "../../../services/api/apiUrl";
import { getStoredSession } from "../../auth/utils/authStorage";
import { PLATFORM_ACCOUNT_ID, SUPER_ADMIN_ROLE } from "../../../constants/auth";

const STORAGE_KEY = "universal_erp_platform_settings";
const OLD_STORAGE_KEYS = [
  "universal_erp_settings",
  "platformSettings",
  "settings",
];

let skipNextSettingsPersistence = false;

const isPlainObject = (value) =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const deepMerge = (base, patch) => {
  if (!isPlainObject(base)) {
    return isPlainObject(patch) ? { ...patch } : patch;
  }

  const result = { ...base };

  Object.entries(patch || {}).forEach(([key, value]) => {
    if (value === undefined) {
      return;
    }

    if (isPlainObject(value) && isPlainObject(base[key])) {
      result[key] = deepMerge(base[key], value);
      return;
    }

    result[key] = value;
  });

  return result;
};

const normalizeAppearance = (stored = {}) => {
  const oldFontScale = stored.fontScale ?? stored.fontSizeScale;
  const density = stored.density ?? stored.uiDensity;
  const bodyFontWeight = stored.bodyFontWeight ?? stored.fontWeight;
  const headingFontWeight = stored.headingFontWeight ?? stored.headingWeight;

  return {
    ...stored,
    theme: ["light", "dark", "system"].includes(stored.theme)
      ? stored.theme
      : DEFAULT_SETTINGS.appearance.theme,
    ...(oldFontScale ? { fontScale: Number(oldFontScale) || 1 } : {}),
    ...(density ? { density } : {}),
    ...(bodyFontWeight ? { bodyFontWeight: Number(bodyFontWeight) || 400 } : {}),
    ...(headingFontWeight
      ? { headingFontWeight: Number(headingFontWeight) || 700 }
      : {}),
    tableFontSize: Number(stored.tableFontSize) || DEFAULT_SETTINGS.appearance.tableFontSize,
  };
};

const normalizeFormats = (stored = {}) => ({
  ...stored,
  language: normalizeLanguage(stored.language || stored.locale || getStoredLanguage()),
  numberPrecision: Math.max(Number(stored.numberPrecision ?? DEFAULT_SETTINGS.formats.numberPrecision), 2),
});

const normalizeTables = (tables = {}) =>
  Object.entries(tables || {}).reduce((result, [tableId, value]) => {
    result[tableId] = {
      ...DEFAULT_TABLE_STATE,
      ...(isPlainObject(value) ? value : {}),
      columnOrder: Array.isArray(value?.columnOrder) ? value.columnOrder : [],
      hiddenColumns: Array.isArray(value?.hiddenColumns) ? value.hiddenColumns : [],
      columnWidths: isPlainObject(value?.columnWidths) ? value.columnWidths : {},
      defaultPageSize: Number(value?.defaultPageSize) || DEFAULT_TABLE_STATE.defaultPageSize,
    };

    return result;
  }, {});

const normalizeModules = (modules = {}) => {
  if (modules.items) {
    return {
      defaultModule: modules.defaultModule || DEFAULT_SETTINGS.modules.defaultModule,
      items: isPlainObject(modules.items) ? modules.items : {},
    };
  }

  return {
    defaultModule: modules.defaultModule || DEFAULT_SETTINGS.modules.defaultModule,
    items: Object.entries(modules || {}).reduce((result, [moduleId, value]) => {
      if (moduleId !== "defaultModule") {
        result[moduleId] = value;
      }

      return result;
    }, {}),
  };
};

export const normalizeSettings = (raw = {}) => {
  const stored = isPlainObject(raw) ? raw : {};

  const migrated = {
    ...stored,
    appearance: normalizeAppearance({
      ...(stored.appearance || {}),
      fontWeight: stored.fontWeight,
      bodyFontWeight: stored.bodyFontWeight,
      headingWeight: stored.headingWeight,
      headingFontWeight: stored.headingFontWeight,
      uiDensity: stored.uiDensity,
      density: stored.density,
    }),
    formats: normalizeFormats(stored.formats),
    tables: normalizeTables(stored.tables),
    modules: normalizeModules(stored.modules),
  };

  return {
    ...deepMerge(DEFAULT_SETTINGS, migrated),
    schemaVersion: SETTINGS_SCHEMA_VERSION,
    tables: normalizeTables(migrated.tables),
    modules: normalizeModules(migrated.modules),
    terminology: isPlainObject(migrated.terminology) ? migrated.terminology : {},
  };
};

const readJson = (key) => {
  const stored = localStorage.getItem(key);

  if (!stored) {
    return null;
  }

  return JSON.parse(stored);
};

export const getPlatformSettings = () => {
  try {
    const session = getStoredSession();

    if (!session?.accessToken || session.accountId === PLATFORM_ACCOUNT_ID || session.user?.role === SUPER_ADMIN_ROLE) {
      return normalizeSettings();
    }

    const tenantSettings = tenantGet("settings", null);

    if (tenantSettings) {
      return normalizeSettings(tenantSettings);
    }

    const canonical = readJson(STORAGE_KEY);

    if (canonical) {
      return normalizeSettings(canonical);
    }

    return normalizeSettings();
  } catch (error) {
    return normalizeSettings();
  }
};

export const loadPlatformSettings = async () => {
  try {
    const session = getStoredSession();

    if (!session?.accessToken || session.accountId === PLATFORM_ACCOUNT_ID || session.user?.role === SUPER_ADMIN_ROLE) {
      return normalizeSettings();
    }

    const response = await apiRequest("/settings");

    if (response?.settings) {
      const settings = normalizeSettings(response.settings);
      tenantSet("settings", settings);

      return settings;
    }

    const current = getPlatformSettings();

    if (current) {
      return current;
    }

    for (const key of [STORAGE_KEY, ...OLD_STORAGE_KEYS]) {
      const legacy = readJson(key);

      if (legacy) {
        return normalizeSettings(legacy);
      }
    }

    return normalizeSettings();
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error("Settings load error:", error);
    }
    return getPlatformSettings();
  }
};

export const markSettingsHydrated = () => {
  skipNextSettingsPersistence = true;
};

export const consumeSettingsHydration = () => {
  const shouldSkip = skipNextSettingsPersistence;
  skipNextSettingsPersistence = false;
  return shouldSkip;
};

export const savePlatformSettings = (settings) => {
  try {
    const session = getStoredSession();

    if (!session?.accessToken || session.accountId === PLATFORM_ACCOUNT_ID || session.user?.role === SUPER_ADMIN_ROLE) {
      return;
    }

    const normalizedSettings = normalizeSettings(settings);
    tenantSet("settings", normalizedSettings);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(normalizedSettings));

    const headers = {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.accessToken}`,
      ...(session.accountId && session.accountId !== PLATFORM_ACCOUNT_ID
        ? { "X-Company-Id": session.accountId }
        : {}),
    };

    return fetch(`${API_BASE_URL}/settings`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({ settings: normalizedSettings }),
    }).then((response) => {
      if (!response.ok) {
        throw new Error(`Settings save failed (${response.status})`);
      }

      return response;
    }).catch((error) => {
      if (import.meta.env.DEV) {
        console.error("Settings save error:", error);
      }
      return null;
    });
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error("Settings save error:", error);
    }
    return null;
  }
};

export const clearPlatformSettings = () => {
  try {
    if (tenantRemove("settings")) {
      return;
    }

    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error("Settings clear error:", error);
    }
  }
};

export const serializePlatformSettings = (settings) =>
  JSON.stringify(normalizeSettings(settings), null, 2);

export const parsePlatformSettingsImport = (text) => {
  const parsed = JSON.parse(text);

  if (!isPlainObject(parsed)) {
    throw new Error("Sozlamalar fayli obyekt bo'lishi kerak.");
  }

  return normalizeSettings(parsed);
};
