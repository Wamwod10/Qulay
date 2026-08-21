import { translateText } from "../../../../localization/i18n";
import { memo, useState } from "react";

import useConfiguredColumns from "../../../settings/hooks/useConfiguredColumns";
import {
  useNotificationSettings,
  useTerminology } from
"../../../settings/selectors/settingsSelectors";

import {
  AlertTriangle,
  CircleAlert,
  Eye,
  PackageSearch,
  Pencil } from
"lucide-react";

import {
  Badge,
  Button,
  EmptyState,
  LiveIcon,
  Modal,
  Table } from
"../../../../shared/ui";

import ProductActionsMenu from "../ProductActionsMenu/ProductActionsMenu";

import {
  formatProductPrice,
  getProductStatusBadgeVariant,
  getProductStatusLabel,
  getStockStatus,
  getProductTypeLabel,
  getStockBadgeVariant,
  getStockStatusLabel } from
"../../utils/productHelpers";

import "./ProductTable.scss";

const ProductTable = ({
  products = [],
  hasActiveFilters = false,
  onClearFilters,
  onView,
  onEdit,
  onToggleStatus,
  onDuplicate,
  onBarcode,
  onStockAdjustment,
  onPriceChange,
  onArchive,
  onDelete,
  busyProductId = null
}) => {
  const { tTerm } = useTerminology();
  const notifications = useNotificationSettings();
  const [previewImage, setPreviewImage] = useState(null);

  const columns = [
  {
    key: "product",
    title: tTerm("product"),
    render: (_, product) =>
    <div className="product-table__product">
          <button
        type="button"
        className={[
        "product-table__avatar",
        product.image ? "product-table__avatar--image" : ""].

        filter(Boolean).
        join(" ")}
        onClick={() => {
          if (product.image) {
            setPreviewImage({ src: product.image, name: product.name });
          }
        }}
        disabled={!product.image}
        title={product.image ? translateText("Rasmni kattalashtirish") : undefined}>
        
            {product.image ?
        <img src={product.image} alt={product.name} /> :

        <span>{product.name?.charAt(0)?.toUpperCase() || "M"}</span>
        }
          </button>

          <div className="product-table__product-info">
            <strong>{product.name}</strong>
            <span>{product.barcode || translateText("Shtrix-kod yo'q")}</span>
          </div>
        </div>

  },
  {
    key: "sku",
    title: "SKU",
    render: (value) =>
    <span className="product-table__mono">{value || "-"}</span>

  },
  {
    key: "type",
    title: translateText("Turi"),
    render: (type) =>
    <span className="product-table__muted">
          {getProductTypeLabel(type)}
        </span>

  },
  {
    key: "category",
    title: translateText("Kategoriya"),
    render: (value) =>
    <span className="product-table__muted">{value || "-"}</span>

  },
  {
    key: "stock",
    title: translateText("Qoldiq"),
    render: (_, product) =>
    <div className="product-table__stock">
          <strong>
            {product.stock ?? 0} {product.unit || ""}
          </strong>

          <Badge size="sm" variant={getStockBadgeVariant(product)}>
          <ProductStockIcon product={product} notifications={notifications} />
            {getStockStatusLabel(product)}
          </Badge>
        </div>

  },
  {
    key: "cost",
    title: tTerm("cost"),
    render: (value) =>
    <span className="product-table__price">
          {formatProductPrice(value ?? 0)}
    </span>

  },
  {
    key: "salePrice",
    title: tTerm("salePrice"),
    render: (value) =>
    <span className="product-table__price">
          {value !== null && value !== undefined ?
      formatProductPrice(value) :
      "-"}
        </span>

  },
  {
    key: "margin",
    title: translateText("Marja"),
    render: (_, product) => {
      const salePrice = Number(product.salePrice) || 0;
      const cost = Number(product.cost) || 0;

      if (salePrice <= 0) {
        return <span className="product-table__muted">-</span>;
      }

      const roundedMargin = Math.round(
        (salePrice - cost) / salePrice * 100
      );

      return (
        <Badge
          size="sm"
          variant={
          roundedMargin > 0 ?
          "success" :
          roundedMargin < 0 ?
          "danger" :
          "neutral"
          }>
          
            {roundedMargin}%
          </Badge>);

    }
  },
  {
    key: "supplier",
    title: tTerm("supplier"),
    render: (_, product) =>
    <span className="product-table__muted">
          {product.supplierName || "-"}
        </span>

  },
  {
    key: "status",
    title: translateText("Holat"),
    render: (status) =>
    <Badge variant={getProductStatusBadgeVariant(status)}>
          {getProductStatusLabel(status)}
        </Badge>

  },
  {
    key: "actions",
    title: "",
    render: (_, product) =>
    <div className="product-table__actions">
          <Button
        size="sm"
        variant="ghost"
        aria-label={translateText("Mahsulotni ko'rish")}
        title={translateText("Ko'rish")}
        disabled={busyProductId === product.id}
        onClick={() => onView?.(product)}>
        
            <Eye size={16} strokeWidth={1.8} />
          </Button>

          <Button
        size="sm"
        variant="ghost"
        aria-label={translateText("Mahsulotni tahrirlash")}
        title={translateText("Tahrirlash")}
        disabled={busyProductId === product.id}
        onClick={() => onEdit?.(product)}>
        
            <Pencil size={16} strokeWidth={1.8} />
          </Button>

          <ProductActionsMenu
        product={product}
        onToggleStatus={onToggleStatus}
        onDuplicate={onDuplicate}
        onBarcode={onBarcode}
        onStockAdjustment={onStockAdjustment}
        onPriceChange={onPriceChange}
        onArchive={onArchive}
        onDelete={onDelete}
        disabled={busyProductId === product.id} />
      
        </div>

  }];


  const configuredColumns = useConfiguredColumns("products", columns);

  return (
    <>
      {products.length > 0 ?
      <Table columns={configuredColumns} data={products} rowKey="id" /> :

      <EmptyState
        icon={PackageSearch}
        title={translateText("Mahsulot topilmadi")}
        description={
        hasActiveFilters ?
        translateText("Qidiruv yoki filtr shartlariga mos mahsulot yo'q.") :
        translateText("Hali mahsulot qo'shilmagan.")
        }
        actionLabel={hasActiveFilters ? translateText("Filtrlarni tozalash") : undefined}
        onAction={hasActiveFilters ? onClearFilters : undefined} />

      }

      <Modal
        open={Boolean(previewImage)}
        onClose={() => setPreviewImage(null)}
        title={previewImage?.name || translateText("Mahsulot rasmi")}
        description={translateText("Rasmni kattalashtirilgan ko'rinishda ko'rish.")}
        size="lg">
        
        {previewImage &&
        <div className="product-table__image-preview-modal">
            <img src={previewImage.src} alt={previewImage.name} />
          </div>
        }
      </Modal>
    </>);

};

const ProductStockIcon = ({ product, notifications }) => {
  const status = getStockStatus(product);

  if (status === "LOW_STOCK" && notifications.lowStockWarning) {
    return <LiveIcon icon={AlertTriangle} motion="warning-glow" size={13} />;
  }

  if (status === "OUT_OF_STOCK" && notifications.outOfStockWarning) {
    return <LiveIcon icon={CircleAlert} motion="danger-breathe" size={13} />;
  }

  return null;
};

export default memo(ProductTable);
