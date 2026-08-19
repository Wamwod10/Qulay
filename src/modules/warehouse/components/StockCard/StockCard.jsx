import { AlertTriangle, CircleAlert, Eye, Lock, Package } from "lucide-react";

import { Badge, Button, Card, LiveIcon } from "../../../../shared/ui";

import {
  formatWarehouseMoney,
  getAvailableStock,
  getWarehouseStockBadgeVariant,
  getWarehouseStockStatus,
  getWarehouseStockStatusLabel,
} from "../../utils/warehouseHelpers";
import { translateText } from "../../../../localization/i18n";

import "./StockCard.scss";

const StockCard = ({ item, onView }) => {
  const available = getAvailableStock(item);

  const stockValue = Number(item.quantity || 0) * Number(item.cost || 0);

  return (
    <Card variant="soft" padding="md" className="warehouse-stock-card">
      <div className="warehouse-stock-card__top">
        <div className="warehouse-stock-card__product">
          <div className="warehouse-stock-card__image">
            {item.image ? (
              <img src={item.image} alt={item.productName} />
            ) : (
              <Package size={24} strokeWidth={1.6} />
            )}
          </div>

          <div className="warehouse-stock-card__product-info">
            <strong>{item.productName}</strong>

            <span>SKU: {item.sku || "—"}</span>

            <small>{item.category || "—"}</small>
          </div>
        </div>

        <Button
          size="sm"
          variant="ghost"
          aria-label={translateText("Ko‘rish")}
          title={translateText("Ko‘rish")}
          onClick={() => onView?.(item)}
        >
          <Eye size={16} strokeWidth={1.8} />
        </Button>
      </div>

      <div className="warehouse-stock-card__numbers">
        <StockNumber
          label={translateText("Jami qoldiq")}
          value={`${item.quantity ?? 0} ${item.unit || ""}`}
        />

        <StockNumber
          label={translateText("Rezerv")}
          value={
            <>
              {Number(item.reserved || 0) > 0 && (
                <LiveIcon icon={Lock} motion="pulse-soft" size={13} />
              )}
              {item.reserved ?? 0} {item.unit || ""}
            </>
          }
        />

        <StockNumber
          label={translateText("Mavjud")}
          value={`${available} ${item.unit || ""}`}
          strong
        />
      </div>

      <div className="warehouse-stock-card__bottom">
        <div className="warehouse-stock-card__status">
          <Badge size="sm" variant={getWarehouseStockBadgeVariant(item)}>
            <StockStatusIcon item={item} />
            {getWarehouseStockStatusLabel(item)}
          </Badge>

          <span>
            {translateText("Min:")} {item.minimumStock ?? 0} {item.unit || ""}
          </span>
        </div>

        <div className="warehouse-stock-card__value">
          <span>{translateText("Ombor qiymati")}</span>

          <strong>
            {formatWarehouseMoney(stockValue)}
          </strong>
        </div>
      </div>
    </Card>
  );
};

const StockNumber = ({ label, value, strong = false }) => {
  return (
    <div className="warehouse-stock-card__number">
      <span>{label}</span>

      <strong
        className={strong ? "warehouse-stock-card__number-value--strong" : ""}
      >
        {value}
      </strong>
    </div>
  );
};

const StockStatusIcon = ({ item }) => {
  const status = getWarehouseStockStatus(item);

  if (status === "LOW_STOCK") {
    return <LiveIcon icon={AlertTriangle} motion="warning-glow" size={13} />;
  }

  if (status === "OUT_OF_STOCK") {
    return <LiveIcon icon={CircleAlert} motion="danger-breathe" size={13} />;
  }

  return null;
};

export default StockCard;
