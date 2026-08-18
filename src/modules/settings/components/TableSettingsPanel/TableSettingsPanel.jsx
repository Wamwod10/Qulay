import { ChevronDown, ChevronUp, Eye, EyeOff, RotateCcw } from "lucide-react";

import { useDispatch, useSelector } from "react-redux";

import { Button, Input, Select } from "../../../../shared/ui";

import {
  resetTableSettings,
  setTableColumnOrder,
  toggleTableColumn,
  updateTableSettings,
} from "../../../../store/slices/settingsSlice";

import { getInitialColumnOrder } from "../../utils/tableSettingsHelpers";

import "./Tablesettingss.scss";

const PAGE_SIZE_OPTIONS = [10, 20, 30, 50, 100].map((value) => ({
  value: String(value),
  label: `${value} qator`,
}));

const DENSITY_OPTIONS = [
  { value: "inherit", label: "Umumiy sozlama" },
  { value: "compact", label: "Ixcham" },
  { value: "normal", label: "Oddiy" },
  { value: "comfortable", label: "Keng" },
];

const TableSettingsPanel = ({ tableId, columns = [], title, description }) => {
  const dispatch = useDispatch();
  const settings = useSelector((state) => state.settings.tables[tableId] || {});

  const hiddenColumns = settings.hiddenColumns || [];
  const currentOrder = getInitialColumnOrder(columns, settings);
  const columnMap = new Map(columns.map((column) => [column.key, column]));
  const orderedColumns = currentOrder
    .map((key) => columnMap.get(key))
    .filter(Boolean);

  const moveColumn = (columnKey, direction) => {
    const order = [...currentOrder];
    const index = order.indexOf(columnKey);
    const targetIndex = direction === "up" ? index - 1 : index + 1;

    if (index < 0 || targetIndex < 0 || targetIndex >= order.length) {
      return;
    }

    [order[index], order[targetIndex]] = [order[targetIndex], order[index]];

    dispatch(setTableColumnOrder({ tableId, columnOrder: order }));
  };

  const updateWidth = (columnKey, value) => {
    dispatch(
      updateTableSettings({
        tableId,
        changes: {
          columnWidths: {
            ...(settings.columnWidths || {}),
            [columnKey]: value,
          },
        },
      }),
    );
  };

  return (
    <section className="table-settings-panel">
      <div className="table-settings-panel__heading">
        <div>
          <h3>{title}</h3>
          {description && <p>{description}</p>}
        </div>

        <Button
          variant="secondary"
          size="sm"
          leftIcon={<RotateCcw size={15} />}
          onClick={() => dispatch(resetTableSettings(tableId))}
        >
          Tiklash
        </Button>
      </div>

      <div className="table-settings-panel__meta">
        <Select
          label="Standart saralash"
          value={settings.defaultSort || ""}
          options={[
            { value: "", label: "Tanlanmagan" },
            ...columns.map((column) => ({
              value: column.key,
              label: column.title || column.key,
            })),
          ]}
          onChange={(event) =>
            dispatch(
              updateTableSettings({
                tableId,
                changes: { defaultSort: event.target.value },
              }),
            )
          }
        />
        <Select
          label="Standart qator soni"
          value={String(settings.defaultPageSize || 10)}
          options={PAGE_SIZE_OPTIONS}
          onChange={(event) =>
            dispatch(
              updateTableSettings({
                tableId,
                changes: { defaultPageSize: Number(event.target.value) },
              }),
            )
          }
        />
        <Select
          label="Qator zichligi"
          value={settings.rowDensity || "inherit"}
          options={DENSITY_OPTIONS}
          onChange={(event) =>
            dispatch(
              updateTableSettings({
                tableId,
                changes: { rowDensity: event.target.value },
              }),
            )
          }
        />
      </div>

      <div className="table-settings-panel__columns">
        {orderedColumns.map((column, index) => {
          const hidden = hiddenColumns.includes(column.key);
          const locked = column.locked || column.key === "actions";

          return (
            <div key={column.key} className="table-settings-panel__row">
              <div className="table-settings-panel__column-info">
                <strong>{column.title || "Amallar"}</strong>
                <span>{column.key}</span>
              </div>

              <div className="table-settings-panel__width">
                <Input
                  aria-label={`${column.title || column.key} eni`}
                  value={settings.columnWidths?.[column.key] || ""}
                  placeholder="Avto"
                  onChange={(event) => updateWidth(column.key, event.target.value)}
                />
              </div>

              <div className="table-settings-panel__actions">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={index === 0}
                  title="Yuqoriga"
                  onClick={() => moveColumn(column.key, "up")}
                >
                  <ChevronUp size={16} />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={index === orderedColumns.length - 1}
                  title="Pastga"
                  onClick={() => moveColumn(column.key, "down")}
                >
                  <ChevronDown size={16} />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={locked}
                  title={hidden ? "Ko'rsatish" : "Yashirish"}
                  onClick={() =>
                    dispatch(toggleTableColumn({ tableId, columnKey: column.key }))
                  }
                >
                  {hidden ? <EyeOff size={16} /> : <Eye size={16} />}
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};

export default TableSettingsPanel;
