import { Ban, CheckCircle2, Clock3, Eye, LoaderCircle } from "lucide-react";

import { Badge, Button, LiveIcon, Table } from "../../../../shared/ui";

import {
  getProductionStatusLabel,
  getProductionStatusVariant,
} from "../../utils/manufacturingHelpers";
import useConfiguredColumns from "../../../settings/hooks/useConfiguredColumns";

const ProductionOrdersTable = ({ orders = [], onView }) => {
  const columns = [
    {
      key: "number",
      title: "Buyurtma",

      render: (value, order) => (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 4,
          }}
        >
          <strong>{value}</strong>

          <span
            style={{
              fontSize: 10,
              color: "var(--color-text-muted)",
            }}
          >
            {order.plannedDate}
          </span>
        </div>
      ),
    },

    {
      key: "productName",
      title: "Mahsulot",
    },

    {
      key: "plannedQuantity",
      title: "Reja",

      render: (value, order) => `${value} ${order.unit}`,
    },

    {
      key: "producedQuantity",
      title: "Ishlab chiqarildi",

      render: (value, order) => `${value || 0} ${order.unit}`,
    },

    {
      key: "status",
      title: "Holat",

      render: (status) => (
        <Badge variant={getProductionStatusVariant(status)}>
          <ProductionStatusIcon status={status} />
          {getProductionStatusLabel(status)}
        </Badge>
      ),
    },

    {
      key: "actions",
      title: "",

      render: (_, order) => (
        <Button size="sm" variant="ghost" onClick={() => onView?.(order)}>
          <Eye size={16} />
        </Button>
      ),
    },
  ];

  const configuredColumns = useConfiguredColumns("production-orders", columns);

  return (
    <Table
      columns={configuredColumns}
      data={orders}
      rowKey="id"
      emptyText="Ishlab chiqarish buyurtmasi mavjud emas."
    />
  );
};

const ProductionStatusIcon = ({ status }) => {
  if (status === "IN_PROGRESS") {
    return <LiveIcon icon={LoaderCircle} motion="spin-slow" size={14} />;
  }

  if (status === "PLANNED") {
    return <LiveIcon icon={Clock3} motion="pulse-soft" size={14} />;
  }

  if (status === "COMPLETED") {
    return <LiveIcon icon={CheckCircle2} motion="success-pop" size={14} />;
  }

  if (status === "CANCELLED") {
    return <Ban size={14} />;
  }

  return null;
};

export default ProductionOrdersTable;
