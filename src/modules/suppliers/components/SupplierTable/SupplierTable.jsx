import { CircleDollarSign, Eye, Pencil } from "lucide-react";

import { Badge, Button, LiveIcon, Table } from "../../../../shared/ui";

import {
  getSupplierStatusLabel,
  getSupplierStatusVariant,
} from "../../utils/supplierHelpers";
import SupplierActionsMenu from "../SupplierActionsMenu/SupplierActionsMenu";
import "./SupplierTable.scss";

const SupplierTable = ({
  suppliers = [],
  purchases = [],
  onView,
  onEdit,
  onNewPurchase,
  onPayment,
  onToggleStatus,
  onDelete,
}) => {
  const columns = [
    {
      key: "name",
      title: "Yetkazib beruvchi",

      render: (value, supplier) => (
        <div className="supplier-table__supplier">
          <div className="supplier-table__avatar">
            {value?.charAt(0)?.toUpperCase()}
          </div>

          <div>
            <strong>{value}</strong>

            <span>{supplier.companyName || "—"}</span>
          </div>
        </div>
      ),
    },

    {
      key: "contactPerson",
      title: "Kontakt",

      render: (value, supplier) => (
        <div className="supplier-table__contact">
          <strong>{value || "—"}</strong>

          <span>{supplier.phone || "—"}</span>
        </div>
      ),
    },

    {
      key: "category",
      title: "Kategoriya",
    },

    {
      key: "purchases",
      title: "Xaridlar",

      render: (_, supplier) => {
        const count = purchases.filter(
          (purchase) => purchase.supplierId === supplier.id,
        ).length;

        return `${count} ta`;
      },
    },

    {
      key: "debt",
      title: "Qarz",

      render: (_, supplier) => {
        const debt = purchases
          .filter((purchase) => purchase.supplierId === supplier.id)
          .reduce(
            (total, purchase) => total + Number(purchase.debtAmount || 0),
            0,
          );

        if (debt <= 0) {
          return <Badge variant="success">Qarz yo‘q</Badge>;
        }

        return (
          <Badge variant="warning">
            <LiveIcon icon={CircleDollarSign} motion="pulse-soft" size={14} />
            {new Intl.NumberFormat("uz-UZ").format(debt)} so‘m
          </Badge>
        );
      },
    },

    {
      key: "status",
      title: "Holat",

      render: (status) => (
        <Badge variant={getSupplierStatusVariant(status)}>
          {getSupplierStatusLabel(status)}
        </Badge>
      ),
    },

    {
      key: "actions",
      title: "",

      render: (_, supplier) => (
        <div className="supplier-table__actions">
          <Button
            size="sm"
            variant="ghost"
            title="Ko‘rish"
            onClick={() => onView?.(supplier)}
          >
            <Eye size={16} />
          </Button>

          <Button
            size="sm"
            variant="ghost"
            title="Tahrirlash"
            onClick={() => onEdit?.(supplier)}
          >
            <Pencil size={16} />
          </Button>

          <SupplierActionsMenu
            supplier={supplier}
            onView={onView}
            onEdit={onEdit}
            onNewPurchase={onNewPurchase}
            onPayment={onPayment}
            onToggleStatus={onToggleStatus}
            onDelete={onDelete}
          />
        </div>
      ),
    },
  ];

  return (
    <Table
      columns={columns}
      data={suppliers}
      rowKey="id"
      emptyText="Yetkazib beruvchi topilmadi."
    />
  );
};

export default SupplierTable;
