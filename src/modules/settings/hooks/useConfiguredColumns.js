import { useMemo } from "react";
import { useSelector } from "react-redux";

import { applyTableSettings } from "../utils/tableSettingsHelpers";

const useConfiguredColumns = (
    tableId,
    columns,
) => {
    const settings = useSelector(
        (state) =>
            state.settings.tables?.[tableId],
    );

    return useMemo(
        () => {
            const configured = applyTableSettings({
                columns,
                settings,
            });

            Object.defineProperty(configured, "__tableSettings", {
                value: {
                    tableId,
                    rowDensity: settings?.rowDensity,
                    defaultPageSize: settings?.defaultPageSize,
                    defaultSort: settings?.defaultSort,
                },
                enumerable: false,
            });

            return configured;
        },
        [columns, settings, tableId],
    );
};

export default useConfiguredColumns;
