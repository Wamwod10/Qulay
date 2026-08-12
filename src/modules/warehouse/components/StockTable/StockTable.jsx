import { AlertTriangle, CircleAlert, Eye, Lock } from "lucide-react";

import { Badge, Button, LiveIcon, Table } from "../../../../shared/ui";

import {
  getAvailableStock,
  getWarehouseStockBadgeVariant,
  getWarehouseStockStatus,
  getWarehouseStockStatusLabel,
  formatWarehouseMoney,
} from "../../utils/warehouseHelpers";

import "./StockTable.scss";

const StockTable = ({ items = [], onView }) => {
  const columns = [
    {
      key: "product",
      title: "Mahsulot",

      render: (_, item) => (
        <div className="warehouse-stock-table__product">
          <div className="warehouse-stock-table__avatar">
            {item.productName?.charAt(0)?.toUpperCase()}
          </div>

          <div>
            <strong>{item.productName}</strong>

            <span>SKU: {item.sku}</span>
          </div>
        </div>
      ),
    },

    {
      key: "category",
      title: "Kategoriya",

      render: (value) => (
        <span className="warehouse-stock-table__muted">{value || "—"}</span>
      ),
    },

    {
      key: "quantity",
      title: "Jami qoldiq",

      render: (_, item) => (
        <strong>
          {item.quantity} {item.unit}
        </strong>
      ),
    },

    {
      key: "reserved",
      title: "Rezerv",

      render: (_, item) => (
        <span>
          {Number(item.reserved || 0) > 0 && (
            <LiveIcon icon={Lock} motion="pulse-soft" size={13} />
          )}
          {item.reserved} {item.unit}
        </span>
      ),
    },

    {
      key: "available",
      title: "Mavjud",

      render: (_, item) => (
        <strong>
          {getAvailableStock(item)} {item.unit}
        </strong>
      ),
    },

    {
      key: "status",
      title: "Holat",

      render: (_, item) => (
        <Badge variant={getWarehouseStockBadgeVariant(item)}>
          <StockStatusIcon item={item} />
          {getWarehouseStockStatusLabel(item)}
        </Badge>
      ),
    },

    {
      key: "value",
      title: "Qiymati",

      render: (_, item) => (
        <span>{formatWarehouseMoney(item.quantity * item.cost)} so‘m</span>
      ),
    },

    {
      key: "actions",
      title: "",

      render: (_, item) => (
        <Button size="sm" variant="ghost" onClick={() => onView?.(item)}>
          <Eye size={16} />
        </Button>
      ),
    },
  ];

  return (
    <Table
      columns={columns}
      data={items}
      emptyText="Omborda mahsulot topilmadi."
    />
  );
};

const StockStatusIcon = ({ item }) => {
  const status = getWarehouseStockStatus(item);

  if (status === "LOW_STOCK") {
    return <LiveIcon icon={AlertTriangle} motion="warning-glow" size={14} />;
  }

  if (status === "OUT_OF_STOCK") {
    return <LiveIcon icon={CircleAlert} motion="danger-breathe" size={14} />;
  }

  return null;
};

export default StockTable;
