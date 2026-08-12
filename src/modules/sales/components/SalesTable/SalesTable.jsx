import { Eye, Pencil } from "lucide-react";

import { Badge, Button, Table } from "../../../../shared/ui";

import {
  formatSaleMoney,
  getPaymentStatusLabel,
  getPaymentStatusVariant,
  getSaleStatusLabel,
  getSaleStatusVariant,
} from "../../utils/salesHelpers";

import "./SalesTable.scss";

const SalesTable = ({ sales = [], onView, onEdit }) => {
  const columns = [
    {
      key: "number",
      title: "Sotuv",

      render: (value, sale) => (
        <div className="sales-table__sale">
          <strong>{value}</strong>

          <span>{sale.orderDate || sale.createdAt || "—"}</span>
        </div>
      ),
    },

    {
      key: "customerName",
      title: "Mijoz",

      render: (value) => value || "—",
    },

    {
      key: "agentName",
      title: "Agent",

      render: (value) => value || "—",
    },

    {
      key: "total",
      title: "Jami",

      render: (value) => `${formatSaleMoney(value)} so‘m`,
    },

    {
      key: "debtAmount",
      title: "Qarz",

      render: (value) => {
        const debt = Number(value || 0);

        return debt > 0 ? (
          <Badge variant="warning">{formatSaleMoney(debt)} so‘m</Badge>
        ) : (
          <Badge variant="success">Qarz yo‘q</Badge>
        );
      },
    },

    {
      key: "paymentStatus",
      title: "To‘lov",

      render: (status) => (
        <Badge variant={getPaymentStatusVariant(status)}>
          {getPaymentStatusLabel(status)}
        </Badge>
      ),
    },

    {
      key: "status",
      title: "Holat",

      render: (status) => (
        <Badge variant={getSaleStatusVariant(status)}>
          {getSaleStatusLabel(status)}
        </Badge>
      ),
    },

    {
      key: "actions",
      title: "",

      render: (_, sale) => (
        <div className="sales-table__actions">
          <Button size="sm" variant="ghost" onClick={() => onView?.(sale)}>
            <Eye size={16} />
          </Button>

          <Button size="sm" variant="ghost" onClick={() => onEdit?.(sale)}>
            <Pencil size={16} />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <Table
      columns={columns}
      data={sales}
      rowKey="id"
      emptyText="Sotuvlar mavjud emas."
    />
  );
};

export default SalesTable;
