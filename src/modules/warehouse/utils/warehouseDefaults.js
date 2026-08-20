import { getPlatformSettings } from "../../settings/utils/settingsStorage";
import { getStoredWarehouses } from "./warehouseManagementStorage";

const readSetting = (settings, path) =>
  path.split(".").reduce((value, key) => value?.[key], settings);

/**
 * Resolve the initial warehouse for create forms only. Existing values must
 * always be passed by the caller and take precedence over this helper.
 */
export const getDefaultWarehouseId = (
  warehouses = getStoredWarehouses(),
  preferredSettingPaths = [],
) => {
  const activeWarehouses = (warehouses || []).filter(
    (warehouse) => warehouse.status !== "INACTIVE" && warehouse.status !== "ARCHIVED",
  );

  if (!activeWarehouses.length) return "";

  const settings = getPlatformSettings();
  const settingPaths = [
    ...preferredSettingPaths,
    "defaults.warehouseId",
    "warehouse.defaultWarehouseId",
  ];

  for (const path of settingPaths) {
    const configuredId = readSetting(settings, path);
    if (configuredId && activeWarehouses.some((warehouse) => warehouse.id === configuredId)) {
      return configuredId;
    }
  }

  const primary = activeWarehouses.find(
    (warehouse) =>
      warehouse.isPrimary ||
      warehouse.isDefault ||
      warehouse.primary ||
      String(warehouse.code || "").toUpperCase() === "MAIN" ||
      String(warehouse.name || "").trim().toLocaleLowerCase() === "asosiy ombor",
  );

  return primary?.id || activeWarehouses[0]?.id || "";
};

