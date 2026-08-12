import {
  ArrowDownToLine,
  ArrowLeft,
  ArrowLeftRight,
  ArrowUpFromLine,
  Boxes,
  Package,
  Wallet,
} from "lucide-react";

import { useMemo, useState } from "react";

import { useNavigate, useParams } from "react-router-dom";

import PageContainer from "../../../../components/PageContainer/PageContainer";

import { Badge, Button, Card, EmptyState, Table } from "../../../../shared/ui";

import StockInModal from "../../components/StockInModal/StockInModal";
import StockOutModal from "../../components/StockOutModal/StockOutModal";
import TransferModal from "../../components/TransferModal/TransferModal";

import { getStoredWarehouses } from "../../utils/warehouseManagementStorage";

import {
  getStoredWarehouseStock,
  getWarehouseMovements,
  stockIn,
  stockOut,
  transferStock,
} from "../../utils/warehouseStorage";

import {
  formatWarehouseMoney,
  getAvailableStock,
  getWarehouseStockBadgeVariant,
  getWarehouseStockStatusLabel,
} from "../../utils/warehouseHelpers";

import "./WarehouseProductDetailsPage.scss";

const WarehouseProductDetailsPage = () => {
  const navigate = useNavigate();

  const { warehouseId, productId } = useParams();

  const [stock, setStock] = useState(() => getStoredWarehouseStock());

  const [movements, setMovements] = useState(() => getWarehouseMovements());

  const [stockInOpen, setStockInOpen] = useState(false);

  const [stockOutOpen, setStockOutOpen] = useState(false);

  const [transferOpen, setTransferOpen] = useState(false);

  const warehouses = getStoredWarehouses();

  const warehouse = warehouses.find((item) => item.id === warehouseId);

  const item = stock.find(
    (stockItem) =>
      stockItem.warehouseId === warehouseId &&
      stockItem.productId === productId,
  );

  const productMovements = useMemo(() => {
    return movements.filter(
      (movement) =>
        movement.warehouseId === warehouseId &&
        movement.productId === productId,
    );
  }, [movements, warehouseId, productId]);

  if (!item) {
    return (
      <PageContainer
        title="Mahsulot topilmadi"
        description="Bu mahsulot tanlangan omborda mavjud emas."
      >
        <Button variant="secondary" onClick={() => navigate("/warehouse")}>
          Omborga qaytish
        </Button>
      </PageContainer>
    );
  }

  const available = getAvailableStock(item);

  const stockValue = Number(item.quantity || 0) * Number(item.cost || 0);

  const refreshData = () => {
    setStock(getStoredWarehouseStock());

    setMovements(getWarehouseMovements());
  };

  const handleStockIn = (values) => {
    try {
      stockIn(values);

      setStockInOpen(false);

      refreshData();
    } catch (error) {
      alert(error.message || "Kirim qilishda xatolik.");
    }
  };

  const handleStockOut = (values) => {
    try {
      stockOut(values);

      setStockOutOpen(false);

      refreshData();
    } catch (error) {
      alert(error.message || "Chiqim qilishda xatolik.");
    }
  };

  const handleTransfer = (values) => {
    try {
      transferStock(values);

      setTransferOpen(false);

      refreshData();
    } catch (error) {
      alert(error.message || "Ko‘chirishda xatolik.");
    }
  };

  const movementColumns = [
    {
      key: "createdAt",
      title: "Sana",
    },
    {
      key: "type",
      title: "Operatsiya",

      render: (type) => {
        const labels = {
          IN: "Kirim",
          OUT: "Chiqim",
          TRANSFER_IN: "Transfer kirim",
          TRANSFER_OUT: "Transfer chiqim",
          INVENTORY_ADJUSTMENT: "Inventarizatsiya",
        };

        const variants = {
          IN: "success",
          TRANSFER_IN: "success",
          OUT: "warning",
          TRANSFER_OUT: "warning",
          INVENTORY_ADJUSTMENT: "primary",
        };

        return (
          <Badge variant={variants[type] || "neutral"}>
            {labels[type] || type}
          </Badge>
        );
      },
    },
    {
      key: "quantity",
      title: "Miqdor",

      render: (_, movement) => {
        if (movement.type === "INVENTORY_ADJUSTMENT") {
          return (
            <span>
              {movement.oldQuantity}
              {" → "}
              {movement.newQuantity} {movement.unit}
            </span>
          );
        }

        return (
          <strong>
            {movement.quantity || 0} {movement.unit || ""}
          </strong>
        );
      },
    },
    {
      key: "reason",
      title: "Sabab / Manba",

      render: (_, movement) =>
        movement.source || movement.reason || movement.note || "—",
    },
  ];

  return (
    <PageContainer
      title={item.productName}
      description={`${warehouse?.name || "Ombor"} · SKU: ${item.sku || "—"}`}
    >
      <div className="warehouse-product-details">
        <div className="warehouse-product-details__actions">
          <Button
            variant="secondary"
            leftIcon={<ArrowLeft size={17} />}
            onClick={() => navigate("/warehouse")}
          >
            Ortga
          </Button>

          <div className="warehouse-product-details__quick-actions">
            <Button
              leftIcon={<ArrowDownToLine size={17} />}
              onClick={() => setStockInOpen(true)}
            >
              Kirim
            </Button>

            <Button
              variant="secondary"
              leftIcon={<ArrowUpFromLine size={17} />}
              onClick={() => setStockOutOpen(true)}
            >
              Chiqim
            </Button>

            <Button
              variant="secondary"
              leftIcon={<ArrowLeftRight size={17} />}
              onClick={() => setTransferOpen(true)}
            >
              Ko‘chirish
            </Button>
          </div>
        </div>

        <section className="warehouse-product-details__hero">
          <Card className="warehouse-product-details__identity">
            <div className="warehouse-product-details__image">
              {item.image ? (
                <img src={item.image} alt={item.productName} />
              ) : (
                <Package size={30} />
              )}
            </div>

            <div>
              <h2>{item.productName}</h2>

              <p>{item.category || "Kategoriya yo‘q"}</p>

              <div className="warehouse-product-details__meta">
                <span>SKU: {item.sku || "—"}</span>

                <span>Birlik: {item.unit}</span>
              </div>
            </div>
          </Card>

          <WarehouseMetric
            icon={<Boxes size={20} />}
            label="Jami qoldiq"
            value={`${item.quantity} ${item.unit}`}
            badge={
              <Badge variant={getWarehouseStockBadgeVariant(item)}>
                {getWarehouseStockStatusLabel(item)}
              </Badge>
            }
          />

          <WarehouseMetric
            label="Rezerv"
            value={`${item.reserved || 0} ${item.unit}`}
          />

          <WarehouseMetric label="Mavjud" value={`${available} ${item.unit}`} />

          <WarehouseMetric
            icon={<Wallet size={20} />}
            label="Ombor qiymati"
            value={`${formatWarehouseMoney(stockValue)} so‘m`}
          />
        </section>

        <section className="warehouse-product-details__grid">
          <Card>
            <div className="warehouse-product-details__section-header">
              <h3>Qoldiq ma’lumotlari</h3>

              <p>Tanlangan ombordagi joriy holat.</p>
            </div>

            <div className="warehouse-product-details__info-grid">
              <InfoItem
                label="Jami qoldiq"
                value={`${item.quantity} ${item.unit}`}
              />

              <InfoItem
                label="Rezerv"
                value={`${item.reserved || 0} ${item.unit}`}
              />

              <InfoItem label="Mavjud" value={`${available} ${item.unit}`} />

              <InfoItem
                label="Minimal qoldiq"
                value={`${item.minimumStock || 0} ${item.unit}`}
              />

              <InfoItem
                label="Tannarx"
                value={`${formatWarehouseMoney(item.cost)} so‘m`}
              />

              <InfoItem
                label="Ombor qiymati"
                value={`${formatWarehouseMoney(stockValue)} so‘m`}
              />
            </div>
          </Card>

          <Card>
            <div className="warehouse-product-details__section-header">
              <h3>Ombor ma’lumotlari</h3>

              <p>Mahsulot joylashgan ombor.</p>
            </div>

            <div className="warehouse-product-details__info-grid">
              <InfoItem label="Ombor" value={warehouse?.name} />

              <InfoItem label="Filial" value={warehouse?.branch} />

              <InfoItem
                label="Stock holati"
                value={getWarehouseStockStatusLabel(item)}
              />

              <InfoItem label="Mahsulot ID" value={item.productId} />
            </div>
          </Card>
        </section>

        <Card>
          <div className="warehouse-product-details__section-header">
            <h3>Harakatlar tarixi</h3>

            <p>Faqat shu mahsulot va shu omborga tegishli operatsiyalar.</p>
          </div>

          {productMovements.length ? (
            <Table
              columns={movementColumns}
              data={productMovements}
              rowKey="id"
            />
          ) : (
            <EmptyState
              title="Harakat mavjud emas"
              description="Ushbu mahsulot bo‘yicha hali ombor operatsiyasi bajarilmagan."
            />
          )}
        </Card>
      </div>

      <StockInModal
        open={stockInOpen}
        warehouseId={warehouseId}
        stock={stock}
        onClose={() => setStockInOpen(false)}
        onSubmit={handleStockIn}
      />

      <StockOutModal
        open={stockOutOpen}
        warehouseId={warehouseId}
        stock={stock}
        onClose={() => setStockOutOpen(false)}
        onSubmit={handleStockOut}
      />

      <TransferModal
        open={transferOpen}
        currentWarehouseId={warehouseId}
        stock={stock}
        onClose={() => setTransferOpen(false)}
        onSubmit={handleTransfer}
      />
    </PageContainer>
  );
};

const WarehouseMetric = ({ icon, label, value, badge }) => (
  <Card className="warehouse-product-details__metric">
    {icon && (
      <div className="warehouse-product-details__metric-icon">{icon}</div>
    )}

    <span>{label}</span>

    <strong>{value}</strong>

    {badge}
  </Card>
);

const InfoItem = ({ label, value }) => (
  <div className="warehouse-product-details__info-item">
    <span>{label}</span>
    <strong>{value || "—"}</strong>
  </div>
);

export default WarehouseProductDetailsPage;
