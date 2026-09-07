import {
  DEFAULT_SETTINGS,
  DEFAULT_TABLE_STATE,
  MAX_TABLE_PAGE_SIZE,
  MIN_TABLE_PAGE_SIZE,
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
import { getStoredSession } from "../../auth/utils/authStorage";
import { PLATFORM_ACCOUNT_ID, SUPER_ADMIN_ROLE } from "../../../constants/auth";
import { normalizeCurrency } from "../../../shared/utils/currency";

const STORAGE_KEY = "universal_erp_platform_settings";
const OLD_STORAGE_KEYS = [
  "universal_erp_settings",
  "platformSettings",
  "settings",
];

let skipNextSettingsPersistence = false;
let runtimeSettings = null;

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

const normalizeFormats = (stored = {}) => {
  const baseCurrency = normalizeCurrency(stored.baseCurrency || stored.accountingCurrency || stored.currency || "TJS");
  const displayCurrency = normalizeCurrency(stored.displayCurrency || stored.currency || baseCurrency);
  const { exchangeRates: _exchangeRates, ...formatSettings } = stored;

  return {
    ...formatSettings,
    baseCurrency,
    displayCurrency,
    currency: displayCurrency,
    fxRates: isPlainObject(stored.fxRates) ? stored.fxRates : {},
    fxUpdatedAt: stored.fxUpdatedAt || null,
    fxProvider: stored.fxProvider || "",
    language: normalizeLanguage(stored.language || stored.locale || getStoredLanguage()),
    numberPrecision: Math.max(Number(stored.numberPrecision ?? DEFAULT_SETTINGS.formats.numberPrecision), 2),
  };
};

const normalizeTables = (tables = {}) =>
  Object.entries(tables || {}).reduce((result, [tableId, value]) => {
    result[tableId] = {
      ...DEFAULT_TABLE_STATE,
      ...(isPlainObject(value) ? value : {}),
      columnOrder: Array.isArray(value?.columnOrder) ? value.columnOrder : [],
      hiddenColumns: Array.isArray(value?.hiddenColumns) ? value.hiddenColumns : [],
      columnWidths: isPlainObject(value?.columnWidths) ? value.columnWidths : {},
      defaultPageSize: Math.min(
        Math.max(Number(value?.defaultPageSize) || DEFAULT_TABLE_STATE.defaultPageSize, MIN_TABLE_PAGE_SIZE),
        MAX_TABLE_PAGE_SIZE,
      ),
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

const stripRuntimeFxState = (settings) => {
  const {
    exchangeRates: _exchangeRates,
    fxRates: _fxRates,
    fxUpdatedAt: _fxUpdatedAt,
    fxProvider: _fxProvider,
    fxCacheTtlMinutes: _fxCacheTtlMinutes,
    fxUnavailable: _fxUnavailable,
    ...formats
  } = settings.formats || {};

  return {
    ...settings,
    formats,
  };
};

const normalizeServerSettings = (response = {}) => {
  const company = response.company || {};
  const platform = isPlainObject(company.platform) ? company.platform : {};
  const settings = normalizeSettings(response.settings || platform);
  const baseCurrency = normalizeCurrency(company.currency || settings.formats.baseCurrency || settings.defaults.currency);
  const displayCurrency = normalizeCurrency(settings.formats.displayCurrency || settings.formats.currency || baseCurrency);
  const inventoryPolicy = company.inventoryPolicy || settings.warehouse.inventoryPolicy;

  return normalizeSettings({
    ...settings,
    formats: {
      ...settings.formats,
      baseCurrency,
      displayCurrency,
      currency: displayCurrency,
    },
    defaults: {
      ...settings.defaults,
      currency: baseCurrency,
    },
    warehouse: {
      ...settings.warehouse,
      inventoryPolicy,
    },
  });
};

export const getPlatformSettings = () => {
  try {
    if (runtimeSettings) {
      return normalizeSettings(runtimeSettings);
    }

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

    if (response?.settings || response?.company?.platform || response?.company) {
      const settings = normalizeServerSettings(response);
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

export const setRuntimePlatformSettings = (settings) => {
  runtimeSettings = normalizeSettings(settings);
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
      return Promise.resolve(null);
    }

    const normalizedSettings = normalizeSettings(settings);
    const settingsToPersist = stripRuntimeFxState(normalizedSettings);

    return apiRequest("/settings", {
      method: "PATCH",
      body: {
        settings: settingsToPersist,
      },
    }).then((response) => {
      const serverSettings = normalizeServerSettings(response);
      tenantSet("settings", serverSettings);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(serverSettings));

      return serverSettings;
    }).catch((error) => {
      if (import.meta.env.DEV) {
        console.error("Settings save error:", error);
      }

      throw error;
    });
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error("Settings save error:", error);
    }
    return Promise.reject(error);
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
  JSON.stringify(stripRuntimeFxState(normalizeSettings(settings)), null, 2);

export const parsePlatformSettingsImport = (text) => {
  const parsed = JSON.parse(text);

  if (!isPlainObject(parsed)) {
    throw new Error("Sozlamalar fayli obyekt bo'lishi kerak.");
  }

  return normalizeSettings(parsed);
};
