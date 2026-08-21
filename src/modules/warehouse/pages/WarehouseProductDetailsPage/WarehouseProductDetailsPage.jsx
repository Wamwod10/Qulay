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
import { translateText } from "../../../../localization/i18n";

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
        title={translateText("Mahsulot topilmadi")}
        description={translateText("Bu mahsulot tanlangan omborda mavjud emas.")}
      >
        <Button variant="secondary" onClick={() => navigate("/warehouse")}>
          {translateText("Omborga qaytish")}
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

  const handleStockIn = async (values) => {
    try {
      await stockIn(values);

      setStockInOpen(false);

      refreshData();
    } catch (error) {
      alert(translateText(error.message || "Kirim qilishda xatolik."));
    }
  };

  const handleStockOut = async (values) => {
    try {
      await stockOut(values);

      setStockOutOpen(false);

      refreshData();
    } catch (error) {
      alert(translateText(error.message || "Chiqim qilishda xatolik."));
    }
  };

  const handleTransfer = async (values) => {
    try {
      await transferStock(values);

      setTransferOpen(false);

      refreshData();
    } catch (error) {
      alert(translateText(error.message || "Ko‘chirishda xatolik."));
    }
  };

  const movementColumns = [
    {
      key: "createdAt",
      title: translateText("Sana"),
    },
    {
      key: "type",
      title: translateText("Operatsiya"),

      render: (type) => {
        const labels = {
          IN: translateText("Kirim"),
          OUT: translateText("Chiqim"),
          TRANSFER_IN: translateText("Transfer kirim"),
          TRANSFER_OUT: translateText("Transfer chiqim"),
          INVENTORY_ADJUSTMENT: translateText("Inventarizatsiya"),
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
      title: translateText("Miqdor"),

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
      title: translateText("Sabab / Manba"),

      render: (_, movement) =>
        translateText(movement.source || movement.reason || movement.note || "—"),
    },
  ];

  return (
    <PageContainer
      title={item.productName}
      description={`${warehouse?.name || translateText("Ombor")} · SKU: ${item.sku || "—"}`}
    >
      <div className="warehouse-product-details">
        <div className="warehouse-product-details__actions">
          <Button
            variant="secondary"
            leftIcon={<ArrowLeft size={17} />}
            onClick={() => navigate("/warehouse")}
          >
            {translateText("Ortga")}
          </Button>

          <div className="warehouse-product-details__quick-actions">
            <Button
              leftIcon={<ArrowDownToLine size={17} />}
              onClick={() => setStockInOpen(true)}
            >
              {translateText("Kirim")}
            </Button>

            <Button
              variant="secondary"
              leftIcon={<ArrowUpFromLine size={17} />}
              onClick={() => setStockOutOpen(true)}
            >
              {translateText("Chiqim")}
            </Button>

            <Button
              variant="secondary"
              leftIcon={<ArrowLeftRight size={17} />}
              onClick={() => setTransferOpen(true)}
            >
              {translateText("Ko‘chirish")}
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

              <p>{item.category || translateText("Kategoriya yo‘q")}</p>

              <div className="warehouse-product-details__meta">
                <span>SKU: {item.sku || "—"}</span>

                <span>
                  {translateText("Birlik:")} {item.unit}
                </span>
              </div>
            </div>
          </Card>

          <WarehouseMetric
            icon={<Boxes size={20} />}
            label={translateText("Jami qoldiq")}
            value={`${item.quantity} ${item.unit}`}
            badge={
              <Badge variant={getWarehouseStockBadgeVariant(item)}>
                {getWarehouseStockStatusLabel(item)}
              </Badge>
            }
          />

          <WarehouseMetric
            label={translateText("Rezerv")}
            value={`${item.reserved || 0} ${item.unit}`}
          />

          <WarehouseMetric
            label={translateText("Mavjud")}
            value={`${available} ${item.unit}`}
          />

          <WarehouseMetric
            icon={<Wallet size={20} />}
            label={translateText("Ombor qiymati")}
            value={formatWarehouseMoney(stockValue)}
          />
        </section>

        <section className="warehouse-product-details__grid">
          <Card>
            <div className="warehouse-product-details__section-header">
              <h3>{translateText("Qoldiq ma’lumotlari")}</h3>

              <p>{translateText("Tanlangan ombordagi joriy holat.")}</p>
            </div>

            <div className="warehouse-product-details__info-grid">
              <InfoItem
                label={translateText("Jami qoldiq")}
                value={`${item.quantity} ${item.unit}`}
              />

              <InfoItem
                label={translateText("Rezerv")}
                value={`${item.reserved || 0} ${item.unit}`}
              />

              <InfoItem
                label={translateText("Mavjud")}
                value={`${available} ${item.unit}`}
              />

              <InfoItem
                label={translateText("Minimal qoldiq")}
                value={`${item.minimumStock || 0} ${item.unit}`}
              />

              <InfoItem
                label={translateText("Tannarx")}
                value={formatWarehouseMoney(item.cost)}
              />

              <InfoItem
                label={translateText("Ombor qiymati")}
                value={formatWarehouseMoney(stockValue)}
              />
            </div>
          </Card>

          <Card>
            <div className="warehouse-product-details__section-header">
              <h3>{translateText("Ombor ma’lumotlari")}</h3>

              <p>{translateText("Mahsulot joylashgan ombor.")}</p>
            </div>

            <div className="warehouse-product-details__info-grid">
              <InfoItem label={translateText("Ombor")} value={warehouse?.name} />

              <InfoItem label={translateText("Kod")} value={warehouse?.code} />

              <InfoItem
                label={translateText("Qoldiq holati")}
                value={getWarehouseStockStatusLabel(item)}
              />

              <InfoItem label={translateText("Mahsulot ID")} value={item.productId} />
            </div>
          </Card>
        </section>

        <Card>
          <div className="warehouse-product-details__section-header">
            <h3>{translateText("Harakatlar tarixi")}</h3>

            <p>
              {translateText(
                "Faqat shu mahsulot va shu omborga tegishli operatsiyalar.",
              )}
            </p>
          </div>

          {productMovements.length ? (
            <Table
              columns={movementColumns}
              data={productMovements}
              rowKey="id"
            />
          ) : (
            <EmptyState
              title={translateText("Harakat mavjud emas")}
              description={translateText(
                "Ushbu mahsulot bo‘yicha hali ombor operatsiyasi bajarilmagan.",
              )}
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
