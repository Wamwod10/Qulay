import { useEffect, useRef, useState } from "react";

import {
  Ban,
  Eye,
  MoreVertical,
  Printer,
  ReceiptText,
  RotateCcw,
} from "lucide-react";

import { Badge, Button, LiveIcon, Table } from "../../../../shared/ui";

import {
  formatSaleDate,
  formatSaleMoney,
  getPaymentStatusLabel,
  getPaymentStatusVariant,
  getSaleStatusLabel,
  getSaleStatusVariant,
} from "../../utils/salesHelpers";

import useConfiguredColumns from "../../../settings/hooks/useConfiguredColumns";
import { translateText } from "../../../../localization/i18n";

import "./SalesTable.scss";

const SalesTable = ({
  sales = [],
  onView,
  onReceipt,
  onPrint,
  onReturn,
  onCancel,
}) => {
  const moneyText = (value) => `${formatSaleMoney(value)} ${translateText("so'm")}`;
  const columns = [
    {
      key: "number",
      title: translateText("Sotuv"),
      render: (value, sale) => (
        <div className="sales-table__sale">
          <strong>{value}</strong>
          <span>
            {formatSaleDate(
              sale.completedAt || sale.orderDate || sale.createdAt,
            )}
          </span>
        </div>
      ),
    },
    {
      key: "customerName",
      title: translateText("Mijoz"),
      render: (value) => value || translateText("Mijozsiz"),
    },
    {
      key: "agentName",
      title: translateText("Agent"),
      render: (value) => value || "-",
    },
    {
      key: "warehouseName",
      title: translateText("Ombor"),
      render: (value) => value || "-",
    },
    {
      key: "total",
      title: translateText("Jami"),
      render: (value) => moneyText(value),
    },
    {
      key: "paidAmount",
      title: translateText("To'langan"),
      render: (value) => moneyText(value),
    },
    {
      key: "debtAmount",
      title: translateText("Qarz"),
      render: (value) => {
        const debt = Number(value || 0);

        return debt > 0 ? (
          <Badge variant="warning">
            <LiveIcon icon={ReceiptText} motion="pulse-soft" size={13} />
            {moneyText(debt)}
          </Badge>
        ) : (
          <Badge variant="success">{translateText("Yo'q")}</Badge>
        );
      },
    },
    {
      key: "paymentStatus",
      title: translateText("To'lov"),
      render: (status) => (
        <Badge variant={getPaymentStatusVariant(status)}>
          {getPaymentStatusLabel(status)}
        </Badge>
      ),
    },
    {
      key: "status",
      title: translateText("Holat"),
      render: (status) => (
        <Badge variant={getSaleStatusVariant(status)}>
          {status === "DRAFT" && (
            <LiveIcon icon={ReceiptText} motion="pulse-soft" size={13} />
          )}
          {getSaleStatusLabel(status)}
        </Badge>
      ),
    },
    {
      key: "actions",
      title: "",
      width: "68px",
      render: (_, sale) => (
        <SaleActions
          sale={sale}
          onView={onView}
          onReceipt={onReceipt}
          onPrint={onPrint}
          onReturn={onReturn}
          onCancel={onCancel}
        />
      ),
    },
  ];

  const configuredColumns = useConfiguredColumns("sales", columns);

  return <Table columns={configuredColumns} data={sales} rowKey="id" />;
};

const SaleActions = ({
  sale,
  onView,
  onReceipt,
  onPrint,
  onReturn,
  onCancel,
}) => {
  const ref = useRef(null);
  const [open, setOpen] = useState(false);
  const completed = sale.status === "COMPLETED";
  const cancelled = sale.status === "CANCELLED";

  useEffect(() => {
    const handleOutside = (event) => {
      if (!ref.current?.contains(event.target)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutside);

    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  const run = (handler) => {
    setOpen(false);
    handler?.(sale);
  };

  return (
    <div ref={ref} className="sales-table__menu">
      <Button
        size="sm"
        variant="ghost"
        className="sales-table__menu-trigger"
        aria-label={translateText("Sotuv amallari")}
        onClick={() => setOpen((current) => !current)}
      >
        <MoreVertical size={17} />
      </Button>

      {open && (
        <div className="sales-table__menu-list">
          <button type="button" onClick={() => run(onView)}>
            <Eye size={15} />
            {translateText("Ko'rish")}
          </button>
          <button
            type="button"
            disabled={sale.status === "DRAFT"}
            onClick={() => run(onReceipt)}
          >
            <ReceiptText size={15} />
            {translateText("Chek")}
          </button>
          <button
            type="button"
            disabled={sale.status === "DRAFT"}
            onClick={() => run(onPrint)}
          >
            <Printer size={15} />
            {translateText("Chop etish")}
          </button>
          <button
            type="button"
            disabled={!completed}
            onClick={() => run(onReturn)}
          >
            <RotateCcw size={15} />
            {translateText("Qaytarish")}
          </button>
          <button
            type="button"
            disabled={!completed || cancelled}
            onClick={() => run(onCancel)}
          >
            <Ban size={15} />
            {translateText("Bekor qilish")}
          </button>
        </div>
      )}
    </div>
  );
};

export default SalesTable;
