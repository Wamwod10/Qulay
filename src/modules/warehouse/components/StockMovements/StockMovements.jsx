import {
  ArrowDownToLine,
  ArrowLeftRight,
  ArrowUpFromLine,
  ClipboardCheck,
} from "lucide-react";

import { Badge, Card, EmptyState, LiveIcon, Table } from "../../../../shared/ui";

import { formatWarehouseMoney } from "../../utils/warehouseHelpers";
import { translateText } from "../../../../localization/i18n";

import "./StockMovements.scss";

const getMovementTypeLabel = (type) => {
  switch (type) {
    case "IN":
      return translateText("Kirim");

    case "OUT":
      return translateText("Chiqim");

    case "TRANSFER_IN":
      return translateText("Transfer kirim");

    case "TRANSFER_OUT":
      return translateText("Transfer chiqim");

    case "INVENTORY_ADJUSTMENT":
      return translateText("Inventarizatsiya");

    default:
      return type || "—";
  }
};

const getMovementVariant = (type) => {
  switch (type) {
    case "IN":
    case "TRANSFER_IN":
      return "success";

    case "OUT":
    case "TRANSFER_OUT":
      return "warning";

    case "INVENTORY_ADJUSTMENT":
      return "primary";

    default:
      return "neutral";
  }
};

const getMovementIcon = (type) => {
  switch (type) {
    case "IN":
      return (
        <LiveIcon icon={ArrowDownToLine} motion="stock-in-soft" size={16} />
      );

    case "OUT":
      return (
        <LiveIcon icon={ArrowUpFromLine} motion="stock-out-soft" size={16} />
      );

    case "TRANSFER_IN":
    case "TRANSFER_OUT":
      return (
        <LiveIcon icon={ArrowLeftRight} motion="slide-x-soft" size={16} />
      );

    case "INVENTORY_ADJUSTMENT":
      return <ClipboardCheck size={16} />;

    default:
      return null;
  }
};

const StockMovements = ({ movements = [], warehouses = [] }) => {
  const getWarehouseName = (warehouseId) =>
    warehouses.find((warehouse) => warehouse.id === warehouseId)?.name || "—";

  if (!movements.length) {
    return (
      <Card>
        <EmptyState
          title={translateText("Harakatlar mavjud emas")}
          description={translateText(
            "Kirim, chiqim, transfer yoki inventarizatsiya qilingandan keyin operatsiyalar shu yerda ko'rinadi.",
          )}
        />
      </Card>
    );
  }

  const columns = [
    {
      key: "createdAt",
      title: translateText("Sana"),
    },
    {
      key: "type",
      title: translateText("Operatsiya"),
      render: (type) => (
        <div className="stock-movements__type">
          <span className="stock-movements__type-icon">
            {getMovementIcon(type)}
          </span>

          <Badge variant={getMovementVariant(type)}>
            {getMovementTypeLabel(type)}
          </Badge>
        </div>
      ),
    },
    {
      key: "productName",
      title: translateText("Mahsulot"),
      render: (value, row) => (
        <div className="stock-movements__product">
          <strong>{value || "—"}</strong>
          <span>{row.productId}</span>
        </div>
      ),
    },
    {
      key: "warehouseId",
      title: translateText("Ombor"),
      render: (value) => getWarehouseName(value),
    },
    {
      key: "quantity",
      title: translateText("Miqdor"),
      render: (value, row) => {
        if (row.type === "INVENTORY_ADJUSTMENT") {
          return (
            <div className="stock-movements__quantity">
              <strong>
                {row.difference > 0 ? "+" : ""}
                {row.difference} {row.unit}
              </strong>

              <span>
                {row.oldQuantity} - {row.newQuantity}
              </span>
            </div>
          );
        }

        return (
          <strong>
            {value || 0} {row.unit || ""}
          </strong>
        );
      },
    },
    {
      key: "cost",
      title: translateText("Qiymat"),
      render: (value, row) => {
        if (!value || !row.quantity) {
          return "—";
        }

        return `${formatWarehouseMoney(
          Number(value) * Number(row.quantity),
        )}`;
      },
    },
    {
      key: "source",
      title: translateText("Sabab / Manba"),
      render: (_, row) =>
        translateText(row.source || row.reason || row.note || "—"),
    },
  ];

  return (
    <Card padding="md" className="stock-movements">
      <div className="stock-movements__header">
        <div>
          <h3>{translateText("Ombor harakatlari")}</h3>
          <p>
            {translateText(
              "Barcha kirim, chiqim, transfer va inventarizatsiya operatsiyalari.",
            )}
          </p>
        </div>

        <span>
          {movements.length} {translateText("ta operatsiya")}
        </span>
      </div>

      <Table columns={columns} data={movements} rowKey="id" />
    </Card>
  );
};

export default StockMovements;
