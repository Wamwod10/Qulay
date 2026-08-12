import {
  ArrowDownToLine,
  ArrowLeftRight,
  ArrowUpFromLine,
  ClipboardCheck,
} from "lucide-react";

import { Badge, Card, EmptyState, LiveIcon, Table } from "../../../../shared/ui";

import { formatWarehouseMoney } from "../../utils/warehouseHelpers";

import "./StockMovements.scss";

const getMovementTypeLabel = (type) => {
  switch (type) {
    case "IN":
      return "Kirim";

    case "OUT":
      return "Chiqim";

    case "TRANSFER_IN":
      return "Transfer kirim";

    case "TRANSFER_OUT":
      return "Transfer chiqim";

    case "INVENTORY_ADJUSTMENT":
      return "Inventarizatsiya";

    default:
      return type || "-";
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
    warehouses.find((warehouse) => warehouse.id === warehouseId)?.name || "-";

  if (!movements.length) {
    return (
      <Card>
        <EmptyState
          title="Harakatlar mavjud emas"
          description="Kirim, chiqim, transfer yoki inventarizatsiya qilingandan keyin operatsiyalar shu yerda ko'rinadi."
        />
      </Card>
    );
  }

  const columns = [
    {
      key: "createdAt",
      title: "Sana",
    },
    {
      key: "type",
      title: "Operatsiya",
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
      title: "Mahsulot",
      render: (value, row) => (
        <div className="stock-movements__product">
          <strong>{value || "-"}</strong>
          <span>{row.productId}</span>
        </div>
      ),
    },
    {
      key: "warehouseId",
      title: "Ombor",
      render: (value) => getWarehouseName(value),
    },
    {
      key: "quantity",
      title: "Miqdor",
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
      title: "Qiymat",
      render: (value, row) => {
        if (!value || !row.quantity) {
          return "-";
        }

        return `${formatWarehouseMoney(
          Number(value) * Number(row.quantity),
        )} so'm`;
      },
    },
    {
      key: "source",
      title: "Sabab / Manba",
      render: (_, row) => row.source || row.reason || row.note || "-",
    },
  ];

  return (
    <Card padding="md" className="stock-movements">
      <div className="stock-movements__header">
        <div>
          <h3>Ombor harakatlari</h3>
          <p>
            Barcha kirim, chiqim, transfer va inventarizatsiya operatsiyalari.
          </p>
        </div>

        <span>{movements.length} ta operatsiya</span>
      </div>

      <Table columns={columns} data={movements} rowKey="id" />
    </Card>
  );
};

export default StockMovements;
