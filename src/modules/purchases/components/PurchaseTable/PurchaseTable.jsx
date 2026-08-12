import {
  AlertTriangle,
  Ban,
  CheckCircle2,
  Clock3,
  Eye,
  PackageOpen,
  Wallet,
} from "lucide-react";

import { Badge, Button, LiveIcon, Table } from "../../../../shared/ui";

import PurchaseActionsMenu from "../PurchaseActionsMenu/PurchaseActionsMenu";

import {
  formatPurchaseMoney,
  getPurchaseStatusLabel,
  getPurchaseStatusVariant,
} from "../../utils/purchaseHelpers";

import "./PurchaseTable.scss";

const PurchaseTable = ({
  purchases = [],
  onView,
  onEdit,
  onPayment,
  onReceive,
  onCancel,
  onDuplicate,
}) => {
  const columns = [
    {
      key: "number",
      title: "Buyurtma",

      render: (value, purchase) => (
        <div className="purchase-table__number">
          <strong>{value}</strong>

          <span>{purchase.orderDate}</span>
        </div>
      ),
    },

    {
      key: "supplierName",
      title: "Yetkazib beruvchi",

      render: (value) => (
        <span className="purchase-table__muted">{value || "—"}</span>
      ),
    },

    {
      key: "warehouseName",
      title: "Ombor",

      render: (value) => (
        <span className="purchase-table__muted">{value || "—"}</span>
      ),
    },

    {
      key: "items",
      title: "Mahsulot",

      render: (items) => {
        const count = items?.length || 0;

        return <span>{count} ta pozitsiya</span>;
      },
    },

    {
      key: "total",
      title: "Jami",

      render: (value) => <strong>{formatPurchaseMoney(value)} so‘m</strong>,
    },

    {
      key: "paidAmount",
      title: "To‘langan",

      render: (value) => <span>{formatPurchaseMoney(value)} so‘m</span>,
    },

    {
      key: "debtAmount",
      title: "Qarz",

      render: (value) => {
        const debt = Number(value || 0);

        if (debt <= 0) {
          return <Badge variant="success">To‘langan</Badge>;
        }

        return (
          <div className="purchase-table__debt">
            <strong>{formatPurchaseMoney(debt)} so‘m</strong>

            <Badge size="sm" variant="warning">
              <LiveIcon icon={Wallet} motion="pulse-soft" size={13} />
              Qarz bor
            </Badge>
          </div>
        );
      },
    },

    {
      key: "status",
      title: "Holat",

      render: (status, purchase) => (
        <Badge variant={getPurchaseStatusVariant(status)}>
          <PurchaseStatusIcon purchase={purchase} status={status} />
          {getPurchaseStatusLabel(status)}
        </Badge>
      ),
    },

    {
      key: "actions",
      title: "",

      render: (_, purchase) => (
        <div className="purchase-table__actions">
          <Button
            size="sm"
            variant="ghost"
            title="Ko‘rish"
            onClick={() => onView?.(purchase)}
          >
            <Eye size={16} />
          </Button>

          <PurchaseActionsMenu
            purchase={purchase}
            onView={onView}
            onEdit={onEdit}
            onPayment={onPayment}
            onReceive={onReceive}
            onCancel={onCancel}
            onDuplicate={onDuplicate}
          />
        </div>
      ),
    },
  ];

  return (
    <Table
      columns={columns}
      data={purchases}
      rowKey="id"
      emptyText="Xarid buyurtmasi topilmadi."
    />
  );
};

const isLatePurchase = (purchase) => {
  const today = new Date().toISOString().slice(0, 10);

  return Boolean(
    purchase.expectedDate &&
      purchase.expectedDate < today &&
      purchase.status !== "RECEIVED" &&
      purchase.status !== "CANCELLED",
  );
};

const PurchaseStatusIcon = ({ purchase, status }) => {
  if (isLatePurchase(purchase)) {
    return <LiveIcon icon={AlertTriangle} motion="warning-glow" size={14} />;
  }

  if (status === "ORDERED") {
    return <LiveIcon icon={Clock3} motion="pulse-soft" size={14} />;
  }

  if (status === "PARTIALLY_RECEIVED") {
    return <LiveIcon icon={PackageOpen} motion="pulse-soft" size={14} />;
  }

  if (status === "RECEIVED") {
    return <LiveIcon icon={CheckCircle2} motion="success-pop" size={14} />;
  }

  if (status === "CANCELLED") {
    return <Ban size={14} />;
  }

  return null;
};

export default PurchaseTable;
