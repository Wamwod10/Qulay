import { translateText } from "../../../../localization/i18n";
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
import { apiRequest, unwrapList } from "../../../../services/api/apiClient";
import { getApiErrorMessage } from "../../../../services/api/apiErrorHandler";

import StockAdjustmentModal from "../../components/StockAdjustmentModal/StockAdjustmentModal";
import {
  adjustStoredProductStock,
  fetchStoredProductById,
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

import "./ProductDetailsPage.scss";

const MANUFACTURING_TYPES = ["RAW_MATERIAL", "SEMI_FINISHED", "FINISHED_GOOD"];

const ProductDetailsPage = () => {
  const navigate = useNavigate();
  const { productId } = useParams();

  const [activeTab, setActiveTab] = useState("general");
  const [imagePreviewOpen, setImagePreviewOpen] = useState(false);
  const [stockModalOpen, setStockModalOpen] = useState(false);
  const [product, setProduct] = useState(() => getStoredProductById(productId));
  const [related, setRelated] = useState({ purchases: [], sales: [], boms: [], orders: [] });
  const [loading, setLoading] = useState(!product);
  const [error, setError] = useState("");

  const loadData = async () => {
    setLoading(true);
    setError("");

    try {
      const [remoteProduct, purchasesResult, salesResult, bomsResult, ordersResult] = await Promise.all([
        fetchStoredProductById(productId),
        apiRequest("/purchases"),
        apiRequest("/sales"),
        apiRequest("/manufacturing/boms"),
        apiRequest("/manufacturing/orders"),
      ]);

      setProduct(remoteProduct);
      setRelated({
        purchases: unwrapList(purchasesResult, ["purchases"]) || [],
        sales: unwrapList(salesResult, ["sales"]) || [],
        boms: unwrapList(bomsResult, ["boms"]) || [],
        orders: unwrapList(ordersResult, ["orders", "productionOrders"]) || [],
      });
    } catch (loadError) {
      setError(getApiErrorMessage(loadError));
      setProduct((current) => current || getStoredProductById(productId));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, [productId]);

  const isManufacturingProduct = MANUFACTURING_TYPES.includes(product?.type);
  const history = product?.history || [];
  const stockItems = product?.stockItems || [];

  const margin = useMemo(() => {
    if (!product?.salePrice) return null;
    return Math.round(((Number(product.salePrice) - Number(product.cost || 0)) / Number(product.salePrice)) * 100);
  }, [product]);

  const tabs = useMemo(() => {
    const nextTabs = [
      { key: "general", label: translateText("Umumiy"), icon: <Package size={16} /> },
      { key: "warehouse", label: translateText("Ombor"), icon: <Warehouse size={16} /> },
      { key: "sales", label: translateText("Savdo va xaridlar"), icon: <ShoppingCart size={16} /> },
      { key: "history", label: translateText("Tarix"), icon: <History size={16} /> },
    ];

    if (isManufacturingProduct) {
      nextTabs.push({ key: "manufacturing", label: translateText("Ishlab chiqarish"), icon: <Factory size={16} /> });
    }

    return nextTabs;
  }, [isManufacturingProduct]);

  useEffect(() => {
    if (activeTab === "manufacturing" && !isManufacturingProduct) setActiveTab("general");
  }, [activeTab, isManufacturingProduct]);

  if (!product && loading) {
    return (
      <PageContainer title={translateText("Mahsulot yuklanmoqda")} description={translateText("Ma'lumotlar backenddan olinmoqda.")}>
        <Button variant="secondary" onClick={() => navigate("/products")}>{translateText("Mahsulotlarga qaytish")}</Button>
      </PageContainer>
    );
  }

  if (!product) {
    return (
      <PageContainer title={translateText("Mahsulot topilmadi")} description={translateText("Bu mahsulot mavjud emas yoki o'chirilgan.")}>
        <Button variant="secondary" onClick={() => navigate("/products")}>{translateText("Mahsulotlarga qaytish")}</Button>
      </PageContainer>
    );
  }

  const handleStockAdjustment = async (values) => {
    try {
      const updatedProduct = await adjustStoredProductStock(values);
      if (updatedProduct) {
        setStockModalOpen(false);
        await loadData();
      }
    } catch (adjustError) {
      setError(getApiErrorMessage(adjustError));
    }
  };

  return (
    <PageContainer title={product.name} description={`${product.sku} - ${getProductTypeLabel(product.type)}`}>
      <div className="product-details">
        {error && <div className="product-form__submit-error" role="alert">{error}</div>}

        <div className="product-details__top-actions">
          <Button variant="secondary" leftIcon={<ArrowLeft size={17} />} onClick={() => navigate("/products")}>
            {translateText("Ortga")}
          </Button>
          <Button variant="secondary" leftIcon={<Boxes size={17} />} onClick={() => setStockModalOpen(true)}>
            {translateText("Qoldiqni tuzatish")}
          </Button>
          <Button leftIcon={<Pencil size={17} />} onClick={() => navigate(`/products/${product.id}/edit`)}>
            {translateText("Tahrirlash")}
          </Button>
        </div>

        <section className="product-details__hero">
          <Card className="product-details__identity">
            <button
              type="button"
              className={["product-details__image", product.image ? "product-details__image--clickable" : ""].filter(Boolean).join(" ")}
              onClick={() => product.image && setImagePreviewOpen(true)}
              disabled={!product.image}
              title={product.image ? translateText("Rasmni kattalashtirish") : undefined}
            >
              {product.image ? <img src={product.image} alt={product.name} /> : <Package size={30} />}
            </button>

            <div className="product-details__identity-content">
              <div className="product-details__identity-title">
                <h2>{product.name}</h2>
                <Badge variant={getProductStatusBadgeVariant(product.status)}>{getProductStatusLabel(product.status)}</Badge>
              </div>
              <p>{product.category || "-"} - {getProductTypeLabel(product.type)}</p>
              <div className="product-details__identity-meta">
                <span>SKU: {product.sku}</span>
                <span>{translateText("Birlik:")} {product.unit}</span>
                {product.brand && <span>{translateText("Brend:")} {product.brand}</span>}
              </div>
            </div>
          </Card>

          <MetricCard label={translateText("Joriy qoldiq")} value={`${product.stock} ${product.unit}`} badge={<Badge size="sm" variant={getStockBadgeVariant(product)}>{getStockStatusLabel(product)}</Badge>} />
          <MetricCard label={translateText("Tannarx")} value={formatProductPrice(product.cost)} description={`1 ${product.unit} ${translateText("uchun")}`} />
          <MetricCard label={translateText("Sotuv narxi")} value={product.salePrice ? formatProductPrice(product.salePrice) : "-"} description={margin !== null ? `${translateText("Marja:")} ${margin}%` : translateText("Sotuv narxi belgilanmagan")} />
        </section>

        <Tabs items={tabs} activeKey={activeTab} onChange={setActiveTab} />

        {activeTab === "general" && <GeneralTab product={product} />}
        {activeTab === "warehouse" && <WarehouseTab product={product} stockItems={stockItems} history={history} />}
        {activeTab === "sales" && <SalesPurchasesTab product={product} purchases={related.purchases} sales={related.sales} />}
        {activeTab === "history" && <HistoryTab history={history} />}
        {activeTab === "manufacturing" && isManufacturingProduct && <ManufacturingTab product={product} boms={related.boms} orders={related.orders} />}

        <StockAdjustmentModal product={product} open={stockModalOpen} onClose={() => setStockModalOpen(false)} onSubmit={handleStockAdjustment} />

        {imagePreviewOpen && product.image && (
          <div className="product-details__image-overlay" onClick={() => setImagePreviewOpen(false)} role="presentation">
            <div className="product-details__image-modal" onClick={(event) => event.stopPropagation()} role="presentation">
              <img src={product.image} alt={product.name} />
              <Button variant="secondary" onClick={() => setImagePreviewOpen(false)}>{translateText("Yopish")}</Button>
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
      <SectionHeader title={translateText("Asosiy ma'lumotlar")} description={translateText("Mahsulotning katalog ma'lumotlari.")} />
      <div className="product-details__info-grid">
        <InfoItem label={translateText("Nomi")} value={product.name} />
        <InfoItem label="SKU" value={product.sku} />
        <InfoItem label={translateText("Turi")} value={getProductTypeLabel(product.type)} />
        <InfoItem label={translateText("Kategoriya")} value={product.category} />
        <InfoItem label={translateText("Brend")} value={product.brand} />
        <InfoItem label={translateText("O'lchov birligi")} value={product.unit} />
        <InfoItem label={translateText("Yetkazib beruvchi")} value={product.supplierName} />
        <InfoItem label={translateText("Holat")} value={getProductStatusLabel(product.status)} />
      </div>
    </Card>

    <Card>
      <SectionHeader title={translateText("Narx va soliq")} description={translateText("Mahsulotning moliyaviy parametrlari.")} />
      <div className="product-details__info-grid">
        <InfoItem label={translateText("Tannarx")} value={formatProductPrice(product.cost)} />
        <InfoItem label={translateText("Sotuv narxi")} value={product.salePrice ? formatProductPrice(product.salePrice) : "-"} />
        <InfoItem label="QQS" value={`${product.tax || 0}%`} />
        <InfoItem label={translateText("Chegirma")} value={`${product.discount || 0}%`} />
      </div>
    </Card>

    <Card>
      <SectionHeader title={translateText("Identifikatsiya")} description={translateText("Shtrix-kod va boshqa identifikatorlar.")} />
      <div className="product-details__code-list">
        <CodeItem icon={<Barcode size={20} />} label={translateText("Shtrix-kod")} value={product.barcode || "-"} />
        <CodeItem icon={<QrCode size={20} />} label="QR" value={product.sku ? `QR-${product.sku}` : "-"} />
      </div>
    </Card>

    <Card>
      <SectionHeader title={translateText("Izoh")} description={translateText("Mahsulot bo'yicha ichki ma'lumot.")} />
      <div className="product-details__notes">{product.notes || "Mahsulot uchun izoh kiritilmagan."}</div>
    </Card>
  </div>
);

const WarehouseTab = ({ product, stockItems, history }) => {
  const stockColumns = [
    { key: "warehouseName", title: translateText("Ombor"), render: (value) => value || "-" },
    { key: "quantity", title: translateText("Qoldiq"), render: (value) => `${value ?? 0} ${product.unit}` },
    { key: "reserved", title: translateText("Rezerv"), render: (value) => `${value ?? 0} ${product.unit}` },
    { key: "available", title: translateText("Mavjud"), render: (value, row) => `${value ?? Math.max(Number(row.quantity || 0) - Number(row.reserved || 0), 0)} ${product.unit}` },
    { key: "cost", title: translateText("Qiymat"), render: (value, row) => formatProductPrice(Number(row.quantity || 0) * Number(value || product.cost || 0)) },
  ];
  const movementColumns = [
    { key: "createdAt", title: translateText("Sana"), render: formatHistoryDate },
    { key: "type", title: translateText("Operatsiya"), render: (value) => <Badge variant="neutral">{value}</Badge> },
    { key: "warehouseId", title: translateText("Ombor") },
    { key: "quantity", title: translateText("Miqdor"), render: (value, row) => `${value ?? 0} ${row.unit || product.unit}` },
    { key: "reason", title: translateText("Sabab"), render: (value) => value || "-" },
  ];

  return (
    <div className="product-details__tab-stack">
      <div className="product-details__warehouse-summary">
        <MetricCard label={translateText("Jami qoldiq")} value={`${product.stock} ${product.unit}`} />
        <MetricCard label={translateText("Minimal qoldiq")} value={`${product.minimumStock} ${product.unit}`} />
        <MetricCard label={translateText("Ombor qiymati")} value={formatProductPrice(Number(product.stock || 0) * Number(product.cost || 0))} />
        <MetricCard label={translateText("Qoldiq holati")} value={getStockStatusLabel(product)} badge={<Badge size="sm" variant={getStockBadgeVariant(product)}>{getStockStatusLabel(product)}</Badge>} />
      </div>

      <Card>
        <SectionHeader title={translateText("Omborlar bo'yicha qoldiq")} description={translateText("StockItem aggregate ma'lumotlari.")} />
        <Table columns={stockColumns} data={stockItems} emptyText={translateText("Bu mahsulot uchun ombor qoldig'i yo'q.")} />
      </Card>

      <Card>
        <SectionHeader title={translateText("Qoldiq harakatlari")} description={translateText("Backend stock movement tarixi.")} />
        <Table columns={movementColumns} data={history} emptyText={translateText("Bu mahsulot bo'yicha qoldiq harakati yo'q.")} />
      </Card>
    </div>
  );
};

const SalesPurchasesTab = ({ product, purchases, sales }) => {
  const purchaseRows = purchases.flatMap((purchase) =>
    (purchase.items || []).filter((item) => item.productId === product.id).map((item) => ({
      id: `${purchase.id}-${item.id}`,
      date: purchase.receivedAt || purchase.orderDate || purchase.createdAt,
      document: purchase.number,
      partner: purchase.supplierName || "-",
      quantity: item.quantity,
      unit: item.unit || product.unit,
      price: item.cost,
      total: item.subtotal,
      status: purchase.status,
    })),
  );
  const salesRows = sales.flatMap((sale) =>
    (sale.items || []).filter((item) => item.productId === product.id).map((item) => ({
      id: `${sale.id}-${item.id}`,
      date: sale.completedAt || sale.createdAt,
      document: sale.number,
      partner: sale.customerName || "-",
      quantity: item.quantity,
      unit: item.unit || product.unit,
      price: item.price,
      total: item.subtotal,
      status: sale.status,
    })),
  );
  const columns = [
    { key: "date", title: translateText("Sana"), render: formatHistoryDate },
    { key: "document", title: translateText("Hujjat") },
    { key: "partner", title: translateText("Hamkor") },
    { key: "quantity", title: translateText("Miqdor"), render: (value, row) => `${value} ${row.unit}` },
    { key: "price", title: translateText("Narx"), render: formatProductPrice },
    { key: "total", title: translateText("Jami"), render: formatProductPrice },
    { key: "status", title: translateText("Holat"), render: (value) => <Badge variant="neutral">{value}</Badge> },
  ];

  return (
    <div className="product-details__tab-stack">
      <div className="product-details__warehouse-summary">
        <MetricCard label={translateText("Sotuvlar soni")} value={`${salesRows.length} ta`} />
        <MetricCard label={translateText("Xaridlar soni")} value={`${purchaseRows.length} ta`} />
        <MetricCard label={translateText("Sotuv summasi")} value={formatProductPrice(salesRows.reduce((sum, row) => sum + Number(row.total || 0), 0))} />
      </div>

      <Card>
        <SectionHeader title={translateText("Savdo tarixi")} description={translateText("Sales API'dan olingan real satrlar.")} />
        <Table columns={columns} data={salesRows} emptyText={translateText("Bu mahsulot bo'yicha savdo mavjud emas.")} />
      </Card>

      <Card>
        <SectionHeader title={translateText("Xaridlar tarixi")} description={translateText("Purchases API'dan olingan real satrlar.")} />
        <Table columns={columns} data={purchaseRows} emptyText={translateText("Bu mahsulot bo'yicha xarid mavjud emas.")} />
      </Card>
    </div>
  );
};

const HistoryTab = ({ history }) => {
  const columns = [
    { key: "createdAt", title: translateText("Sana"), render: formatHistoryDate },
    { key: "type", title: translateText("Turi"), render: (value) => <Badge variant="neutral">{value}</Badge> },
    { key: "quantity", title: translateText("Miqdor"), render: (value, row) => `${value ?? "-"} ${row.unit || ""}` },
    { key: "reason", title: translateText("Sabab"), render: (value) => value || "-" },
    { key: "sourceType", title: translateText("Manba"), render: (value) => value || "-" },
  ];

  return (
    <Card>
      <SectionHeader title={translateText("Mahsulot tarixi")} description={translateText("Backend stock movement va auditga tayyor operatsiyalar.")} />
      <Table columns={columns} data={history} emptyText={translateText("Bu mahsulot bo'yicha tarix hali yo'q.")} />
    </Card>
  );
};

const ManufacturingTab = ({ product, boms, orders }) => {
  const relatedBoms = boms.filter((bom) =>
    bom.outputProductId === product.id ||
    (bom.materials || []).some((material) => material.productId === product.id),
  );
  const relatedOrders = orders.filter((order) => order.outputProductId === product.id);
  const bomColumns = [
    { key: "name", title: translateText("Retsept") },
    { key: "outputProductName", title: translateText("Natija"), render: (value) => value || "-" },
    { key: "outputQuantity", title: translateText("Chiqish"), render: (value, row) => `${value ?? row.quantity ?? 0} ${row.unit || product.unit}` },
    { key: "status", title: translateText("Holat"), render: (value) => <Badge variant="neutral">{value}</Badge> },
  ];
  const orderColumns = [
    { key: "number", title: translateText("Buyurtma") },
    { key: "createdAt", title: translateText("Sana"), render: formatHistoryDate },
    { key: "plannedQuantity", title: translateText("Reja"), render: (value, row) => `${value} ${row.unit || product.unit}` },
    { key: "actualQuantity", title: translateText("Ishlab chiqarildi"), render: (value, row) => `${value ?? row.producedQuantity ?? 0} ${row.unit || product.unit}` },
    { key: "status", title: translateText("Holat"), render: (value) => <Badge variant="neutral">{value}</Badge> },
  ];

  return (
    <div className="product-details__tab-stack">
      <Card>
        <SectionHeader title={translateText("Retseptlar")} description={translateText("Manufacturing BOM API'dan olingan real bog'lanishlar.")} />
        <Table columns={bomColumns} data={relatedBoms} emptyText={translateText("Bu mahsulot bo'yicha retsept bog'lanishi yo'q.")} />
      </Card>

      <Card>
        <SectionHeader title={translateText("Ishlab chiqarish tarixi")} description={translateText("Production order API'dan olingan real buyurtmalar.")} />
        <Table columns={orderColumns} data={relatedOrders} emptyText={translateText("Bu mahsulot bo'yicha ishlab chiqarish buyurtmasi yo'q.")} />
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
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("uz-UZ");
};

export default ProductDetailsPage;
