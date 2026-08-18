import { DEFAULT_TABLE_STATE } from "../constants/settingsDefaults";

export const normalizeTableSettings = (settings = {}) => ({
  ...DEFAULT_TABLE_STATE,
  ...settings,
  columnOrder: Array.isArray(settings.columnOrder) ? settings.columnOrder : [],
  hiddenColumns: Array.isArray(settings.hiddenColumns) ? settings.hiddenColumns : [],
  columnWidths:
    settings.columnWidths && typeof settings.columnWidths === "object"
      ? settings.columnWidths
      : {},
});

export const applyTableSettings = ({ columns = [], settings }) => {
  const tableSettings = normalizeTableSettings(settings);
  const hiddenColumns = tableSettings.hiddenColumns;
  const columnOrder = tableSettings.columnOrder;
  const columnWidths = tableSettings.columnWidths;

  const visibleColumns = columns
    .filter((column) => column.locked || column.key === "actions" || !hiddenColumns.includes(column.key))
    .map((column) => ({
      ...column,
      width: columnWidths[column.key] || column.width,
    }));

  if (!columnOrder.length) {
    return visibleColumns;
  }

  const columnMap = new Map(
    visibleColumns.map((column) => [
      column.key,
      column,
    ]),
  );

  const ordered = columnOrder
    .map((key) => columnMap.get(key))
    .filter(Boolean);

  const missing = visibleColumns.filter(
    (column) => !columnOrder.includes(column.key),
  );

  return [
    ...ordered,
    ...missing,
  ];
};

export const getInitialColumnOrder = (columns = [], settings = {}) => {
  const current = normalizeTableSettings(settings).columnOrder;
  const keys = columns.map((column) => column.key);
  const known = current.filter((key) => keys.includes(key));
  const missing = keys.filter((key) => !known.includes(key));

  return [...known, ...missing];
};
