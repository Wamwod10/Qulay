import { translateText } from "../../../../localization/i18n";import {
  AlertTriangle,
  Ban,
  CheckCircle2,
  Clock3,
  Eye,
  PackageOpen,
  Wallet } from
"lucide-react";

import { Badge, Button, LiveIcon, Table } from "../../../../shared/ui";

import PurchaseActionsMenu from "../PurchaseActionsMenu/PurchaseActionsMenu";

import {
  formatPurchaseMoney,
  getPurchaseStatusLabel,
  getPurchaseStatusVariant } from
"../../utils/purchaseHelpers";

import useConfiguredColumns from "../../../settings/hooks/useConfiguredColumns";

import "./PurchaseTable.scss";

const PurchaseTable = ({
  purchases = [],
  onView,
  onEdit,
  onPayment,
  onReceive,
  onCancel
}) => {
  const columns = [
  {
    key: "number",
    title: translateText("Buyurtma"),

    render: (value, purchase) =>
    <div className="purchase-table__number">
          <strong>{value}</strong>

          <span>{purchase.orderDate}</span>
        </div>

  },

  {
    key: "supplierName",
    title: translateText("Yetkazib beruvchi"),

    render: (value) =>
    <span className="purchase-table__muted">{value || "—"}</span>

  },

  {
    key: "warehouseName",
    title: translateText("Ombor"),

    render: (value) =>
    <span className="purchase-table__muted">{value || "—"}</span>

  },

  {
    key: "items",
    title: translateText("Mahsulot"),

    render: (items) => {
      const count = items?.length || 0;

      return <span>{count}{translateText("ta pozitsiya")}</span>;
    }
  },

  {
    key: "total",
    title: translateText("Jami"),

    render: (value) => <strong>{formatPurchaseMoney(value)}</strong>
  },

  {
    key: "paidAmount",
    title: translateText("To‘langan"),

    render: (value) => <span>{formatPurchaseMoney(value)}</span>
  },

  {
    key: "debtAmount",
    title: translateText("Qarz"),

    render: (value) => {
      const debt = Number(value || 0);

      if (debt <= 0) {
        return <Badge variant="success">{translateText("To‘langan")}</Badge>;
      }

      return (
        <div className="purchase-table__debt">
            <strong>{formatPurchaseMoney(debt)}</strong>

            <Badge size="sm" variant="warning">
              <LiveIcon icon={Wallet} motion="pulse-soft" size={13} />{translateText("Qarz bor")}

          </Badge>
          </div>);

    }
  },

  {
    key: "status",
    title: translateText("Holat"),

    render: (status, purchase) =>
    <Badge variant={getPurchaseStatusVariant(status)}>
          <PurchaseStatusIcon purchase={purchase} status={status} />
          {getPurchaseStatusLabel(status)}
        </Badge>

  },

  {
    key: "actions",
    title: "",

    render: (_, purchase) =>
    <div className="purchase-table__actions">
          <Button
        size="sm"
        variant="ghost"
        title={translateText("Ko‘rish")}
        onClick={() => onView?.(purchase)}>
        
            <Eye size={16} />
          </Button>

          <PurchaseActionsMenu
        purchase={purchase}
        onView={onView}
        onEdit={onEdit}
        onPayment={onPayment}
        onReceive={onReceive}
        onCancel={onCancel} />
      
        </div>

  }];


  const configuredColumns = useConfiguredColumns("purchases", columns);

  return (
    <Table
      columns={configuredColumns}
      data={purchases}
      rowKey="id"
      emptyText={translateText("Xarid buyurtmasi topilmadi.")} />);


};

const isLatePurchase = (purchase) => {
  const today = new Date().toISOString().slice(0, 10);

  return Boolean(
    purchase.expectedDate &&
    purchase.expectedDate < today &&
    purchase.status !== "RECEIVED" &&
    purchase.status !== "CANCELLED"
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
