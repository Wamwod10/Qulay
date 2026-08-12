import {
  ArrowLeft,
  Barcode,
  Boxes,
  Factory,
  History,
  Package,
  Pencil,
  QrCode,
  ShoppingCart,
  Warehouse,
} from "lucide-react";

import { useEffect, useMemo, useState } from "react";

import { useNavigate, useParams } from "react-router-dom";

import PageContainer from "../../../../components/PageContainer/PageContainer";

import { Badge, Button, Card, Table, Tabs } from "../../../../shared/ui";

import {
  getProductHistory,
  getStoredProductById,
} from "../../utils/productsStorage";

import {
  formatProductPrice,
  getProductStatusBadgeVariant,
  getProductStatusLabel,
  getProductTypeLabel,
  getStockBadgeVariant,
  getStockStatusLabel,
} from "../../utils/productHelpers";

import {
  PRODUCT_MANUFACTURING_HISTORY,
  PRODUCT_PURCHASE_HISTORY,
  PRODUCT_SALES_HISTORY,
} from "../../constants/productHistoryMock";

import "./ProductDetailsPage.scss";

const HISTORY_LABELS = {
  CREATE: "Yaratildi",
  UPDATE: "Tahrirlandi",
  STATUS: "Status",
  DUPLICATE: "Nusxa",
  STOCK_ADJUSTMENT: "Qoldiq",
  PRICE: "Narx",
  ARCHIVE: "Arxiv",
  RESTORE: "Qaytarildi",
};

const MANUFACTURING_TYPES = ["RAW_MATERIAL", "SEMI_FINISHED", "FINISHED_GOOD"];

const ProductDetailsPage = () => {
  const navigate = useNavigate();
  const { productId } = useParams();

  const [activeTab, setActiveTab] = useState("general");
  const [imagePreviewOpen, setImagePreviewOpen] = useState(false);

  const product = getStoredProductById(productId);
  const history = useMemo(() => getProductHistory(productId), [productId]);

  const isManufacturingProduct = MANUFACTURING_TYPES.includes(product?.type);

  const margin = useMemo(() => {
    if (!product?.salePrice) {
      return null;
    }

    return Math.round(
      ((Number(product.salePrice) - Number(product.cost || 0)) /
        Number(product.salePrice)) *
        100,
    );
  }, [product]);

  const tabs = useMemo(() => {
    const nextTabs = [
      { key: "general", label: "Umumiy", icon: <Package size={16} /> },
      { key: "warehouse", label: "Ombor", icon: <Warehouse size={16} /> },
      {
        key: "sales",
        label: "Savdo va xaridlar",
        icon: <ShoppingCart size={16} />,
      },
      { key: "history", label: "Tarix", icon: <History size={16} /> },
    ];

    if (isManufacturingProduct) {
      nextTabs.push({
        key: "manufacturing",
        label: "Ishlab chiqarish",
        icon: <Factory size={16} />,
      });
    }

    return nextTabs;
  }, [isManufacturingProduct]);

  useEffect(() => {
    if (!imagePreviewOpen) {
      return undefined;
    }

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setImagePreviewOpen(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [imagePreviewOpen]);

  useEffect(() => {
    if (activeTab === "manufacturing" && !isManufacturingProduct) {
      setActiveTab("general");
    }
  }, [activeTab, isManufacturingProduct]);

  if (!product) {
    return (
      <PageContainer
        title="Mahsulot topilmadi"
        description="Bu mahsulot mavjud emas yoki o'chirilgan."
      >
        <Button variant="secondary" onClick={() => navigate("/products")}>
          Mahsulotlarga qaytish
        </Button>
      </PageContainer>
    );
  }

  return (
    <PageContainer
      title={product.name}
      description={`${product.sku} - ${getProductTypeLabel(product.type)}`}
    >
      <div className="product-details">
        <div className="product-details__top-actions">
          <Button
            variant="secondary"
            leftIcon={<ArrowLeft size={17} />}
            onClick={() => navigate("/products")}
          >
            Ortga
          </Button>

          <Button
            leftIcon={<Pencil size={17} />}
            onClick={() => navigate(`/products/${product.id}/edit`)}
          >
            Tahrirlash
          </Button>
        </div>

        <section className="product-details__hero">
          <Card className="product-details__identity">
            <button
              type="button"
              className={[
                "product-details__image",
                product.image ? "product-details__image--clickable" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              onClick={() => {
                if (product.image) {
                  setImagePreviewOpen(true);
                }
              }}
              disabled={!product.image}
              title={product.image ? "Rasmni kattalashtirish" : undefined}
            >
              {product.image ? (
                <img src={product.image} alt={product.name} />
              ) : (
                <Package size={30} />
              )}
            </button>

            <div className="product-details__identity-content">
              <div className="product-details__identity-title">
                <h2>{product.name}</h2>

                <Badge variant={getProductStatusBadgeVariant(product.status)}>
                  {getProductStatusLabel(product.status)}
                </Badge>
              </div>

              <p>
                {product.category || "-"} - {getProductTypeLabel(product.type)}
              </p>

              <div className="product-details__identity-meta">
                <span>SKU: {product.sku}</span>
                <span>Birlik: {product.unit}</span>
                {product.brand && <span>Brend: {product.brand}</span>}
              </div>
            </div>
          </Card>

          <MetricCard
            label="Joriy qoldiq"
            value={`${product.stock} ${product.unit}`}
            badge={
              <Badge size="sm" variant={getStockBadgeVariant(product)}>
                {getStockStatusLabel(product)}
              </Badge>
            }
          />

          <MetricCard
            label="Tannarx"
            value={`${formatProductPrice(product.cost)} so'm`}
            description={`1 ${product.unit} uchun`}
          />

          <MetricCard
            label="Sotuv narxi"
            value={
              product.salePrice
                ? `${formatProductPrice(product.salePrice)} so'm`
                : "-"
            }
            description={
              margin !== null ? `Marja: ${margin}%` : "Sotuv narxi belgilanmagan"
            }
          />
        </section>

        <Tabs items={tabs} activeKey={activeTab} onChange={setActiveTab} />

        {activeTab === "general" && <GeneralTab product={product} />}
        {activeTab === "warehouse" && (
          <WarehouseTab product={product} history={history} />
        )}
        {activeTab === "sales" && <SalesPurchasesTab product={product} />}
        {activeTab === "history" && <HistoryTab history={history} />}
        {activeTab === "manufacturing" && isManufacturingProduct && (
          <ManufacturingTab product={product} />
        )}

        {imagePreviewOpen && product.image && (
          <div
            className="product-details__image-overlay"
            onClick={() => setImagePreviewOpen(false)}
            role="presentation"
          >
            <div
              className="product-details__image-modal"
              onClick={(event) => event.stopPropagation()}
              role="presentation"
            >
              <img src={product.image} alt={product.name} />

              <Button
                variant="secondary"
                onClick={() => setImagePreviewOpen(false)}
              >
                Yopish
              </Button>
            </div>
          </div>
        )}
      </div>
    </PageContainer>
  );
};

const MetricCard = ({ label, value, description, badge }) => (
  <Card className="product-details__metric">
    <span>{label}</span>
    <strong>{value}</strong>
    {description && <small>{description}</small>}
    {badge}
  </Card>
);

const GeneralTab = ({ product }) => (
  <div className="product-details__tab-grid">
    <Card>
      <SectionHeader
        title="Asosiy ma'lumotlar"
        description="Mahsulotning katalog ma'lumotlari."
      />

      <div className="product-details__info-grid">
        <InfoItem label="Nomi" value={product.name} />
        <InfoItem label="SKU" value={product.sku} />
        <InfoItem label="Turi" value={getProductTypeLabel(product.type)} />
        <InfoItem label="Kategoriya" value={product.category} />
        <InfoItem label="Brend" value={product.brand} />
        <InfoItem label="O'lchov birligi" value={product.unit} />
        <InfoItem label="Yetkazib beruvchi" value={product.supplierName} />
        <InfoItem label="Status" value={getProductStatusLabel(product.status)} />
      </div>
    </Card>

    <Card>
      <SectionHeader
        title="Narx va soliq"
        description="Mahsulotning moliyaviy parametrlari."
      />

      <div className="product-details__info-grid">
        <InfoItem
          label="Tannarx"
          value={`${formatProductPrice(product.cost)} so'm`}
        />
        <InfoItem
          label="Sotuv narxi"
          value={
            product.salePrice ? `${formatProductPrice(product.salePrice)} so'm` : "-"
          }
        />
        <InfoItem label="QQS" value={`${product.tax || 0}%`} />
        <InfoItem label="Chegirma" value={`${product.discount || 0}%`} />
      </div>
    </Card>

    <Card>
      <SectionHeader
        title="Identifikatsiya"
        description="Barcode va boshqa identifikatorlar."
      />

      <div className="product-details__code-list">
        <CodeItem
          icon={<Barcode size={20} />}
          label="Barcode"
          value={product.barcode || "-"}
        />
        <CodeItem
          icon={<QrCode size={20} />}
          label="QR"
          value={product.sku ? `QR-${product.sku}` : "-"}
        />
      </div>
    </Card>

    <Card>
      <SectionHeader title="Izoh" description="Mahsulot bo'yicha ichki ma'lumot." />

      <div className="product-details__notes">
        {product.notes || "Mahsulot uchun izoh kiritilmagan."}
      </div>
    </Card>
  </div>
);

const WarehouseTab = ({ product, history }) => {
  const stockHistory = history.filter((item) => item.type === "STOCK_ADJUSTMENT");

  const stockColumns = [
    { key: "date", title: "Sana", render: (value) => formatHistoryDate(value) },
    { key: "title", title: "Operatsiya" },
    {
      key: "oldValue",
      title: "Oldingi",
      render: (value) => `${value ?? "-"} ${product.unit}`,
    },
    {
      key: "newValue",
      title: "Yangi",
      render: (value) => `${value ?? "-"} ${product.unit}`,
    },
    { key: "description", title: "Sabab" },
  ];

  return (
    <div className="product-details__tab-stack">
      <div className="product-details__warehouse-summary">
        <MetricCard label="Jami qoldiq" value={`${product.stock} ${product.unit}`} />
        <MetricCard
          label="Minimal qoldiq"
          value={`${product.minimumStock} ${product.unit}`}
        />
        <MetricCard
          label="Ombor qiymati"
          value={`${formatProductPrice(product.stock * product.cost)} so'm`}
        />
        <MetricCard
          label="Qoldiq holati"
          value={getStockStatusLabel(product)}
          badge={
            <Badge size="sm" variant={getStockBadgeVariant(product)}>
              {getStockStatusLabel(product)}
            </Badge>
          }
        />
      </div>

      <Card>
        <SectionHeader
          title="Qoldiq harakatlari"
          description="Mahsulot bo'yicha localStorage historydan olingan ombor o'zgarishlari."
        />

        <Table
          columns={stockColumns}
          data={stockHistory}
          emptyText="Bu mahsulot bo'yicha qoldiq tuzatish tarixi yo'q."
        />
      </Card>
    </div>
  );
};

const SalesPurchasesTab = ({ product }) => {
  const salesColumns = [
    { key: "date", title: "Sana" },
    { key: "document", title: "Hujjat" },
    { key: "customer", title: "Mijoz" },
    {
      key: "quantity",
      title: "Miqdor",
      render: (value) => `${value} ${product.unit}`,
    },
    { key: "price", title: "Narx", render: (value) => `${formatProductPrice(value)} so'm` },
    { key: "total", title: "Jami", render: (value) => `${formatProductPrice(value)} so'm` },
  ];

  const purchaseColumns = [
    { key: "date", title: "Sana" },
    { key: "document", title: "Hujjat" },
    { key: "supplier", title: "Yetkazib beruvchi" },
    {
      key: "quantity",
      title: "Miqdor",
      render: (value) => `${value} ${product.unit}`,
    },
    { key: "price", title: "Narx", render: (value) => `${formatProductPrice(value)} so'm` },
    { key: "total", title: "Jami", render: (value) => `${formatProductPrice(value)} so'm` },
  ];

  return (
    <div className="product-details__tab-stack">
      <Card>
        <SectionHeader
          title="Savdo tarixi"
          description="Backend ulangunga qadar demo savdo harakatlari."
        />

        <Table
          columns={salesColumns}
          data={product.salePrice ? PRODUCT_SALES_HISTORY : []}
          emptyText="Bu mahsulot bo'yicha savdo mavjud emas."
        />
      </Card>

      <Card>
        <SectionHeader
          title="Xaridlar tarixi"
          description="Xomashyo va savdo mahsulotlari uchun demo xaridlar."
        />

        <Table
          columns={purchaseColumns}
          data={
            product.type === "RAW_MATERIAL" || product.type === "TRADING_PRODUCT"
              ? PRODUCT_PURCHASE_HISTORY
              : []
          }
          emptyText="Bu mahsulot bo'yicha xarid mavjud emas."
        />
      </Card>
    </div>
  );
};

const HistoryTab = ({ history }) => {
  const columns = [
    { key: "date", title: "Sana", render: (value) => formatHistoryDate(value) },
    {
      key: "type",
      title: "Turi",
      render: (value) => <Badge variant="neutral">{HISTORY_LABELS[value] || value}</Badge>,
    },
    { key: "title", title: "Sarlavha" },
    { key: "description", title: "Tavsif" },
    { key: "oldValue", title: "Oldingi", render: formatHistoryValue },
    { key: "newValue", title: "Yangi", render: formatHistoryValue },
    {
      key: "price",
      title: "Narxlar",
      render: (_, row) => formatPriceHistory(row),
    },
    {
      key: "summary",
      title: "Before / after",
      render: (_, row) => formatSummary(row),
    },
  ];

  return (
    <Card>
      <SectionHeader
        title="Mahsulot tarixi"
        description="Create, edit, status, stock, price, archive va restore eventlari."
      />

      <Table
        columns={columns}
        data={history}
        emptyText="Bu mahsulot bo'yicha history hali yo'q."
      />
    </Card>
  );
};

const ManufacturingTab = ({ product }) => {
  if (product.type === "RAW_MATERIAL") {
    return (
      <div className="product-details__tab-grid">
        <Card>
          <SectionHeader
            title="Xomashyo ishlatilishi"
            description="Backend ulangunga qadar demo BOM ma'lumotlari."
          />

          <div className="product-details__info-grid">
            <InfoItem label="Qaysi BOMda ishlatiladi" value="Shokoladli pechenye v1" />
            <InfoItem label="1 partiyaga sarf" value={`25 ${product.unit}`} />
            <InfoItem label="Rezerv qilingan" value={`40 ${product.unit}`} />
            <InfoItem
              label="Mavjud stock"
              value={`${Math.max(product.stock - 40, 0)} ${product.unit}`}
            />
            <InfoItem label="Material use" value="Asosiy retsept komponenti" />
          </div>
        </Card>
      </div>
    );
  }

  const columns = [
    { key: "number", title: "Buyurtma" },
    { key: "date", title: "Sana" },
    {
      key: "quantity",
      title: "Ishlab chiqarildi",
      render: (value) => `${value} ${product.unit}`,
    },
    { key: "cost", title: "Tannarx", render: (value) => `${formatProductPrice(value)} so'm` },
    { key: "status", title: "Holat", render: () => <Badge variant="success">Tugallangan</Badge> },
  ];

  return (
    <div className="product-details__tab-stack">
      <Card>
        <SectionHeader
          title="Ishlab chiqarish ma'lumotlari"
          description="Tayyor yoki yarim tayyor mahsulot retsepti va ishlab chiqarish holati."
        />

        <div className="product-details__info-grid">
          <InfoItem label="BOM / Recipe" value={`${product.name} v1`} />
          <InfoItem
            label="Oxirgi tannarx"
            value={`${formatProductPrice(product.cost)} so'm`}
          />
          <InfoItem label="Oxirgi ishlab chiqarish" value="PRD-2026-0042" />
          <InfoItem label="Jami qoldiq" value={`${product.stock} ${product.unit}`} />
        </div>
      </Card>

      <Card>
        <SectionHeader
          title="Ishlab chiqarish tarixi"
          description="Backend ulangunga qadar demo ishlab chiqarish buyurtmalari."
        />

        <Table columns={columns} data={PRODUCT_MANUFACTURING_HISTORY} />
      </Card>
    </div>
  );
};

const SectionHeader = ({ title, description }) => (
  <div className="product-details__section-header">
    <h3>{title}</h3>
    {description && <p>{description}</p>}
  </div>
);

const InfoItem = ({ label, value }) => (
  <div className="product-details__info-item">
    <span>{label}</span>
    <strong>{value || "-"}</strong>
  </div>
);

const CodeItem = ({ icon, label, value }) => (
  <div className="product-details__code-item">
    <div>{icon}</div>

    <span>
      <small>{label}</small>
      <strong>{value}</strong>
    </span>
  </div>
);

const formatHistoryDate = (value) => {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString("uz-UZ");
};

const formatHistoryValue = (value) => {
  if (value === null || value === undefined || value === "") {
    return "-";
  }

  if (typeof value === "object") {
    return Object.entries(value)
      .map(([key, item]) => `${key}: ${item ?? "-"}`)
      .join(", ");
  }

  return String(value);
};

const formatPriceHistory = (row) => {
  const hasPriceData =
    row.oldCost !== undefined ||
    row.newCost !== undefined ||
    row.oldSalePrice !== undefined ||
    row.newSalePrice !== undefined;

  if (!hasPriceData) {
    return "-";
  }

  return [
    `Tannarx: ${formatProductPrice(row.oldCost)} -> ${formatProductPrice(row.newCost)}`,
    `Sotuv: ${formatProductPrice(row.oldSalePrice)} -> ${formatProductPrice(row.newSalePrice)}`,
  ].join(" | ");
};

const formatSummary = (row) => {
  if (!row.before && !row.after) {
    return "-";
  }

  const before = row.before ? formatHistoryValue(row.before) : "-";
  const after = row.after ? formatHistoryValue(row.after) : "-";

  return `${before} -> ${after}`;
};

export default ProductDetailsPage;
