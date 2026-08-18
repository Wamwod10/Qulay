import { getLocale, translateText } from "../../../localization/i18n";

import "./Table.scss";

const Table = ({
  columns = [],
  data = [],
  rowKey = "id",
  emptyText = "Ma'lumot topilmadi.",
  density,
}) => {
  const tableSettings = columns.__tableSettings || {};
  const effectiveDensity = density || tableSettings.rowDensity;
  const sortKey = tableSettings.defaultSort;
  const tableData = sortKey
    ? [...data].sort((left, right) =>
        String(left?.[sortKey] ?? "").localeCompare(
          String(right?.[sortKey] ?? ""),
          getLocale(),
        ),
      )
    : data;
  const classes = [
    "ui-table",
    effectiveDensity && effectiveDensity !== "inherit"
      ? `ui-table--${effectiveDensity}`
      : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={classes}>
      <div className="ui-table__scroll">
        <table>
          <thead>
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  style={{
                    width: column.width,
                  }}
                >
                  {column.title}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {tableData.length > 0 ? (
              tableData.map((row, rowIndex) => (
                <tr key={row[rowKey] ?? rowIndex}>
                  {columns.map((column) => (
                    <td key={column.key}>
                      {column.render
                        ? column.render(row[column.key], row, rowIndex)
                        : row[column.key]}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td className="ui-table__empty" colSpan={columns.length}>
                  {translateText(emptyText)}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Table;
