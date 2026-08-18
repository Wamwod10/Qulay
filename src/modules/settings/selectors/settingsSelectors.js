import { useMemo } from "react";
import { useSelector } from "react-redux";

import {
  DEFAULT_SETTINGS,
  DEFAULT_TABLE_STATE,
} from "../constants/settingsDefaults";
import { tTerm as translateTerm } from "../../../localization/i18n";

const selectSettings = (state) => state.settings || DEFAULT_SETTINGS;

export const selectAppearanceSettings = (state) =>
  selectSettings(state).appearance || DEFAULT_SETTINGS.appearance;

export const selectTableSettings = (tableId) => (state) => ({
  ...DEFAULT_TABLE_STATE,
  ...(selectSettings(state).tables?.[tableId] || {}),
});

export const selectModuleSettings = (state) =>
  selectSettings(state).modules || DEFAULT_SETTINGS.modules;

export const selectTerminologySettings = (state) =>
  selectSettings(state).terminology || {};

export const selectBehaviorSettings = (state) =>
  selectSettings(state).behavior || DEFAULT_SETTINGS.behavior;

export const selectFormatSettings = (state) =>
  selectSettings(state).formats || DEFAULT_SETTINGS.formats;

export const selectDefaultSettings = (state) =>
  selectSettings(state).defaults || DEFAULT_SETTINGS.defaults;

export const selectNotificationSettings = (state) =>
  selectSettings(state).notifications || DEFAULT_SETTINGS.notifications;

export const selectPosSettings = (state) =>
  selectSettings(state).pos || DEFAULT_SETTINGS.pos;

export const selectWarehouseSettings = (state) =>
  selectSettings(state).warehouse || DEFAULT_SETTINGS.warehouse;

export const selectManufacturingSettings = (state) =>
  selectSettings(state).manufacturing || DEFAULT_SETTINGS.manufacturing;

export const selectCrmSettings = (state) =>
  selectSettings(state).crm || DEFAULT_SETTINGS.crm;

export const selectFinanceSettings = (state) =>
  selectSettings(state).finance || DEFAULT_SETTINGS.finance;

export const selectHrSettings = (state) =>
  selectSettings(state).hr || DEFAULT_SETTINGS.hr;

export const useAppearanceSettings = () => useSelector(selectAppearanceSettings);

export const useTableSettings = (tableId) =>
  useSelector(selectTableSettings(tableId));

export const useModuleSettings = () => useSelector(selectModuleSettings);

export const useTerminology = () => {
  const terminology = useSelector(selectTerminologySettings);
  const formats = useSelector(selectFormatSettings);

  return useMemo(
    () => ({
      terms: terminology,
      tTerm: (key) =>
        translateTerm(key, {
          language: formats.language,
          terminology,
        }),
    }),
    [formats.language, terminology],
  );
};

export const useBehaviorSettings = () => useSelector(selectBehaviorSettings);

export const useFormatSettings = () => useSelector(selectFormatSettings);

export const useDefaultSettings = () => useSelector(selectDefaultSettings);

export const useNotificationSettings = () =>
  useSelector(selectNotificationSettings);

export const usePosSettings = () => useSelector(selectPosSettings);

export const useWarehouseSettings = () => useSelector(selectWarehouseSettings);

export const useManufacturingSettings = () =>
  useSelector(selectManufacturingSettings);

export const useCrmSettings = () => useSelector(selectCrmSettings);

export const useFinanceSettings = () => useSelector(selectFinanceSettings);

export const useHrSettings = () => useSelector(selectHrSettings);
