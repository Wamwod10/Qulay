import { createSlice } from "@reduxjs/toolkit";

import {
  DEFAULT_SETTINGS,
  DEFAULT_TABLE_STATE,
} from "../../modules/settings/constants/settingsDefaults";

import {
  normalizeSettings,
} from "../../modules/settings/utils/settingsStorage";

const resetSectionState = (section) => normalizeSettings()[section];

const settingsSlice = createSlice({
  name: "settings",

  initialState: normalizeSettings(),

  reducers: {
    updateSection: (state, action) => {
      const { section, changes } = action.payload;

      state[section] = {
        ...(state[section] || {}),
        ...changes,
      };
    },

    updateAppearance: (state, action) => {
      state.appearance = {
        ...state.appearance,
        ...action.payload,
      };
    },

    updateBehavior: (state, action) => {
      state.behavior = {
        ...state.behavior,
        ...action.payload,
      };
    },

    updateFormats: (state, action) => {
      state.formats = {
        ...state.formats,
        ...action.payload,
      };
    },

    updateDefaults: (state, action) => {
      state.defaults = {
        ...state.defaults,
        ...action.payload,
      };
    },

    updateNotifications: (state, action) => {
      state.notifications = {
        ...state.notifications,
        ...action.payload,
      };
    },

    setTerminology: (state, action) => {
      const { key, value } = action.payload;

      if (!value) {
        delete state.terminology[key];
        return;
      }

      state.terminology[key] = value;
    },

    resetTerminology: (state) => {
      state.terminology = {};
    },

    updateModuleSettings: (state, action) => {
      const { moduleId, changes } = action.payload;

      if (!state.modules.items) {
        state.modules.items = {};
      }

      state.modules.items[moduleId] = {
        ...(state.modules.items[moduleId] || {}),
        ...changes,
      };
    },

    setModulesDefault: (state, action) => {
      state.modules.defaultModule = action.payload || DEFAULT_SETTINGS.modules.defaultModule;
    },

    resetModuleSettings: (state, action) => {
      const moduleId = action.payload;

      if (moduleId) {
        delete state.modules.items[moduleId];
        return;
      }

      state.modules = resetSectionState("modules");
    },

    updateTableSettings: (state, action) => {
      const { tableId, changes } = action.payload;

      state.tables[tableId] = {
        ...DEFAULT_TABLE_STATE,
        ...(state.tables[tableId] || {}),
        ...changes,
      };
    },

    setTableColumnOrder: (state, action) => {
      const { tableId, columnOrder } = action.payload;

      state.tables[tableId] = {
        ...DEFAULT_TABLE_STATE,
        ...(state.tables[tableId] || {}),
        columnOrder,
      };
    },

    toggleTableColumn: (state, action) => {
      const { tableId, columnKey } = action.payload;

      state.tables[tableId] = {
        ...DEFAULT_TABLE_STATE,
        ...(state.tables[tableId] || {}),
      };

      const hidden = state.tables[tableId].hiddenColumns || [];

      state.tables[tableId].hiddenColumns = hidden.includes(columnKey)
        ? hidden.filter((key) => key !== columnKey)
        : [...hidden, columnKey];
    },

    resetTableSettings: (state, action) => {
      const tableId = action.payload;

      delete state.tables[tableId];
    },

    resetAppearance: (state) => {
      state.appearance = resetSectionState("appearance");
    },

    resetSection: (state, action) => {
      const section = action.payload;

      state[section] = resetSectionState(section);
    },

    importSettings: (state, action) => {
      return normalizeSettings(action.payload);
    },

    setSettings: (state, action) => {
      return normalizeSettings(action.payload);
    },

    resetAllSettings: () => normalizeSettings(),
  },
});

export const {
  updateSection,
  updateAppearance,
  updateBehavior,
  updateFormats,
  updateDefaults,
  updateNotifications,
  setTerminology,
  resetTerminology,
  updateModuleSettings,
  setModulesDefault,
  resetModuleSettings,
  updateTableSettings,
  setTableColumnOrder,
  toggleTableColumn,
  resetTableSettings,
  resetAppearance,
  resetSection,
  importSettings,
  setSettings,
  resetAllSettings,
} = settingsSlice.actions;

export default settingsSlice.reducer;
