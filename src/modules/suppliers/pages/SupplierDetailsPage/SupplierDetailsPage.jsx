import {
  ArrowLeft,
  Building2,
  Mail,
  MapPin,
  Package,
  Pencil,
  Phone,
  Truck,
  User,
  Wallet,
} from "lucide-react";

import { useMemo } from "react";

import { useNavigate, useParams } from "react-router-dom";

import PageContainer from "../../../../components/PageContainer/PageContainer";

import {
  Badge,
  Button,
  Card,
  EmptyState,
  LiveIcon,
  Table,
} from "../../../../shared/ui";

import { getSupplierById } from "../../utils/suppliersStorage";

import { getStoredPurchases } from "../../../purchases/utils/purchasesStorage";

import { getStoredProducts } from "../../../products/utils/productsStorage";
import {
  formatFinanceDate,
  formatFinanceMoney,
  getFinanceTransactions,
  getPaymentMethodLabel,
  getSupplierDebt as getFinanceSupplierDebt,
} from "../../../finance/utils/financeSelectors";

import {
  AlertTriangle,
  CircleDollarSign,
  Gauge,
  ShieldAlert,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
} from "lucide-react";

import {
  calculateSupplierScore,
  getSupplierPriceTrends,
  getSupplierRiskAlerts,
} from "../../utils/supplierAnalytics";

import {
  formatSupplierMoney,
  getSupplierStatusLabel,
  getSupplierStatusVariant,
} from "../../utils/supplierHelpers";

import { formatPurchaseDate } from "../../../purchases/utils/purchaseHelpers";

import "./SupplierDetailsPage.scss";

const SupplierDetailsPage = () => {
  const navigate = useNavigate();

  const { supplierId } = useParams();

  const supplier = getSupplierById(supplierId);

  const purchases = getStoredPurchases();

  const supplierPurchases = useMemo(() => {
    if (!supplier) {
      return [];
    }

    return purchases.filter((purchase) => purchase.supplierId === supplier.id);
  }, [purchases, supplier]);

  const supplierScore = calculateSupplierScore({
    supplierPurchases,
  });

  const priceTrends = getSupplierPriceTrends(supplierPurchases);

  const riskAlerts = getSupplierRiskAlerts({
    supplierPurchases,
    priceTrends,
  });

  if (!supplier) {
    return (
      <PageContainer
        title="Yetkazib beruvchi topilmadi"
        description="Bu yetkazib beruvchi mavjud emas."
      >
        <Button variant="secondary" onClick={() => navigate("/suppliers")}>
          Ortga
        </Button>
      </PageContainer>
    );
  }

  const financeDebt = getFinanceSupplierDebt(supplier.id);
  const supplierPayments = getFinanceTransactions({ supplierId: supplier.id }).filter(
    (transaction) =>
      ["PURCHASE_PAYMENT", "SUPPLIER_PAYMENT"].includes(transaction.sourceType),
  );
  const totalPurchases = financeDebt.purchasesTotal;
  const totalPaid = financeDebt.paid;
  const totalDebt = financeDebt.debt;

  const lastPurchase = [...supplierPurchases].sort((a, b) =>
    String(b.orderDate || "").localeCompare(String(a.orderDate || "")),
  )[0];

  const linkedProducts = getStoredProducts().filter(
    (product) => product.supplierId === supplier.id,
  );

  const purchaseProducts = supplierPurchases.flatMap(
    (purchase) => purchase.items || [],
  );

  const productMap = new Map();

  linkedProducts.forEach((product) => {
    productMap.set(product.id, {
      productId: product.id,

      productName: product.name,

      sku: product.sku,

      purchasePrice: product.cost || 0,
    });
  });

  purchaseProducts.forEach((item) => {
    productMap.set(item.productId, item);
  });

  const suppliedProducts = Array.from(productMap.values());

  const purchaseColumns = [
    {
      key: "number",
      title: "Buyurtma",

      render: (value, purchase) => (
        <div className="supplier-details__purchase">
          <strong>{value}</strong>

          <span>{formatPurchaseDate(purchase.orderDate)}</span>
        </div>
      ),
    },

    {
      key: "warehouseName",
      title: "Ombor",
    },

    {
      key: "total",
      title: "Jami",

      render: (value) => `${formatSupplierMoney(value)} so‘m`,
    },

    {
      key: "paidAmount",
      title: "To‘langan",

      render: (value) => `${formatSupplierMoney(value)} so‘m`,
    },

    {
      key: "debtAmount",
      title: "Qarz",

      render: (value) => {
        const debt = Number(value || 0);

        return debt > 0 ? (
          <Badge variant="warning">{formatSupplierMoney(debt)} so‘m</Badge>
        ) : (
          <Badge variant="success">Qarz yo‘q</Badge>
        );
      },
    },

    {
      key: "status",
      title: "Holat",

      render: (status) => {
        const map = {
          DRAFT: "Qoralama",
          ORDERED: "Buyurtma berilgan",
          PARTIALLY_RECEIVED: "Qisman qabul",
          RECEIVED: "Qabul qilingan",
          CANCELLED: "Bekor qilingan",
        };

        return <span>{map[status] || status}</span>;
      },
    },
  ];

  return (
    <PageContainer
      title={supplier.name}
      description={supplier.companyName || supplier.category}
    >
      <div className="supplier-details">
        <div className="supplier-details__actions">
          <Button
            variant="secondary"
            leftIcon={<ArrowLeft size={17} />}
            onClick={() => navigate("/suppliers")}
          >
            Ortga
          </Button>

          <Button
            leftIcon={<Pencil size={17} />}
            onClick={() => navigate(`/suppliers/${supplier.id}/edit`)}
          >
            Tahrirlash
          </Button>
        </div>

        <section className="supplier-details__summary">
          <Card className="supplier-details__identity">
            <div className="supplier-details__identity-icon">
              <Truck size={28} />
            </div>

            <div>
              <div className="supplier-details__identity-title">
                <h2>{supplier.name}</h2>

                <Badge variant={getSupplierStatusVariant(supplier.status)}>
                  {getSupplierStatusLabel(supplier.status)}
                </Badge>
              </div>

              <p>{supplier.companyName || "—"}</p>

              <span>{supplier.category}</span>
            </div>
          </Card>

          <SupplierMetric
            icon={<Package size={20} />}
            label="Xaridlar"
            value={`${supplierPurchases.length} ta`}
          />

          <SupplierMetric
            icon={<Wallet size={20} />}
            label="Jami xarid"
            value={`${formatSupplierMoney(totalPurchases)} so‘m`}
          />

          <SupplierMetric
            icon={
              <LiveIcon
                icon={CircleDollarSign}
                motion="pulse-soft"
                active={totalDebt > 0}
                size={20}
              />
            }
            label="Jami qarz"
            value={`${formatSupplierMoney(totalDebt)} so‘m`}
          />

          <Card className="supplier-details__score">
            <div className="supplier-details__score-icon">
              <SupplierScoreIcon variant={supplierScore.variant} />
            </div>

            <span>Yetkazib beruvchi reytingi</span>

            <div className="supplier-details__score-value">
              <strong>{supplierScore.score}</strong>

              <small>/100</small>
            </div>

            <Badge variant={supplierScore.variant}>{supplierScore.label}</Badge>
          </Card>
        </section>

        <section className="supplier-details__grid">
          <Card>
            <SectionTitle title="Kontakt ma’lumotlari" />

            <div className="supplier-details__contact-list">
              <ContactItem
                icon={<User size={17} />}
                label="Kontakt shaxs"
                value={supplier.contactPerson}
              />

              <ContactItem
                icon={<Phone size={17} />}
                label="Telefon"
                value={supplier.phone}
              />

              <ContactItem
                icon={<Mail size={17} />}
                label="Email"
                value={supplier.email}
              />

              <ContactItem
                icon={<MapPin size={17} />}
                label="Manzil"
                value={supplier.address}
              />
            </div>
          </Card>

          {riskAlerts.length > 0 && (
            <Card className="supplier-details__risk-card">
              <SectionTitle
                title="Risk ogohlantirishi"
                description="Tizim aniqlagan e’tibor talab qiladigan holatlar."
              />

              <div className="supplier-details__risk-list">
                {riskAlerts.map((alert) => (
                  <div
                    key={alert.id}
                    className={[
                      "supplier-details__risk-item",
                      `supplier-details__risk-item--${alert.level}`,
                    ].join(" ")}
                  >
                    <div className="supplier-details__risk-icon">
                      <LiveIcon
                        icon={alert.level === "danger" ? ShieldAlert : AlertTriangle}
                        motion={
                          alert.level === "danger"
                            ? "danger-breathe"
                            : "warning-glow"
                        }
                        size={18}
                      />
                    </div>

                    <div>
                      <strong>{alert.title}</strong>

                      <p>{alert.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          <Card>
            <SectionTitle
              title="Narx trendi"
              description="Yetkazib beruvchidan olingan mahsulotlarning oxirgi xarid narxlari."
            />

            {priceTrends.length ? (
              <div className="supplier-details__price-trends">
                {priceTrends.slice(0, 6).map((trend) => {
                  const increased = trend.change > 0;

                  const decreased = trend.change < 0;

                  return (
                    <div
                      key={trend.productId}
                      className="supplier-details__price-trend"
                    >
                      <div className="supplier-details__price-trend-top">
                        <div>
                          <strong>{trend.productName}</strong>

                          <span>Oxirgi {trend.prices.length} ta xarid</span>
                        </div>

                        <div
                          className={[
                            "supplier-details__price-change",

                            increased
                              ? "supplier-details__price-change--up"
                              : "",

                            decreased
                              ? "supplier-details__price-change--down"
                              : "",
                          ]
                            .filter(Boolean)
                            .join(" ")}
                        >
                          {increased && (
                            <LiveIcon
                              icon={TrendingUp}
                              motion="trend-up-soft"
                              size={15}
                            />
                          )}

                          {decreased && (
                            <LiveIcon
                              icon={TrendingDown}
                              motion="trend-down-soft"
                              size={15}
                            />
                          )}

                          {!increased && !decreased && <TrendingUp size={15} />}

                          <strong>
                            {trend.percent > 0 ? "+" : ""}
                            {trend.percent.toFixed(1)}%
                          </strong>
                        </div>
                      </div>

                      <div className="supplier-details__price-history">
                        {trend.prices.map((price, index) => (
                          <div key={`${price.date}-${index}`}>
                            <span>{formatPurchaseDate(price.date)}</span>

                            <strong>
                              {formatSupplierMoney(price.price)} so‘m
                            </strong>
                          </div>
                        ))}
                      </div>

                      <div className="supplier-details__price-footer">
                        <span>
                          Birinchi: {formatSupplierMoney(trend.firstPrice)} so‘m
                        </span>

                        <span>
                          Hozir:{" "}
                          <strong>
                            {formatSupplierMoney(trend.lastPrice)} so‘m
                          </strong>
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <EmptyState
                title="Narx tarixi yetarli emas"
                description="Narx trendini ko'rsatish uchun ushbu yetkazib beruvchidan xaridlar bo'lishi kerak."
              />
            )}
          </Card>

          <Card>
            <SectionTitle title="Hamkorlik holati" />

            <div className="supplier-details__info-grid">
              <InfoItem
                label="Jami xarid"
                value={`${formatSupplierMoney(totalPurchases)} so‘m`}
              />

              <InfoItem
                label="To‘langan"
                value={`${formatSupplierMoney(totalPaid)} so‘m`}
              />

              <InfoItem
                label="Qarz"
                value={`${formatSupplierMoney(totalDebt)} so‘m`}
              />

              <InfoItem
                label="Oxirgi xarid"
                value={
                  lastPurchase
                    ? formatPurchaseDate(lastPurchase.orderDate)
                    : "—"
                }
              />
            </div>
          </Card>
        </section>

        <Card>
          <SectionTitle
            title="Yetkazib bergan mahsulotlar"
            description={`${suppliedProducts.length} ta mahsulot`}
          />

          {suppliedProducts.length ? (
            <div className="supplier-details__products">
              {suppliedProducts.map((product) => (
                <div
                  key={product.productId}
                  className="supplier-details__product-card"
                >
                  <div className="supplier-details__product-icon">
                    <Package size={18} />
                  </div>

                  <div>
                    <strong>{product.productName}</strong>

                    <span>SKU: {product.sku || "—"}</span>
                  </div>

                  <small>
                    Oxirgi narx: {formatSupplierMoney(product.purchasePrice)}{" "}
                    so‘m
                  </small>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              title="Mahsulotlar mavjud emas"
              description="Bu yetkazib beruvchidan hali xarid amalga oshirilmagan."
            />
          )}
        </Card>

        <Card>
          <SectionTitle
            title="Xaridlar tarixi"
            description={`${supplierPurchases.length} ta buyurtma`}
          />

          {supplierPurchases.length ? (
            <Table
              columns={purchaseColumns}
              data={supplierPurchases}
              rowKey="id"
            />
          ) : (
            <EmptyState
              title="Xarid mavjud emas"
              description="Ushbu yetkazib beruvchidan hali xarid qilinmagan."
            />
          )}
        </Card>

        <Card>
          <SectionTitle
            title="To'lov tarixi"
            description="Xaridlardagi to'langan summa va moliyadagi yetkazib beruvchi to'lovlari birlashtirilgan."
          />

          <Table
            columns={[
              { key: "date", title: "Sana", render: formatFinanceDate },
              { key: "source", title: "Manba" },
              { key: "paymentMethod", title: "To'lov turi", render: getPaymentMethodLabel },
              {
                key: "amount",
                title: "Summa",
                render: (value) => `${formatFinanceMoney(value)} so'm`,
              },
              { key: "note", title: "Izoh", render: (value) => value || "-" },
            ]}
            data={supplierPayments}
            rowKey="id"
            emptyText="Yetkazib beruvchi to'lovi mavjud emas."
          />
        </Card>

        {supplier.note && (
          <Card>
            <SectionTitle title="Izoh" />

            <div className="supplier-details__note">{supplier.note}</div>
          </Card>
        )}
      </div>
    </PageContainer>
  );
};

const SupplierMetric = ({ icon, label, value }) => (
  <Card className="supplier-details__metric">
    {icon && <div className="supplier-details__metric-icon">{icon}</div>}

    <span>{label}</span>

    <strong>{value}</strong>
  </Card>
);

const SupplierScoreIcon = ({ variant }) => {
  if (variant === "success") {
    return <LiveIcon icon={ShieldCheck} motion="success-pop" size={21} />;
  }

  if (variant === "danger") {
    return <LiveIcon icon={ShieldAlert} motion="danger-breathe" size={21} />;
  }

  if (variant === "warning") {
    return <LiveIcon icon={ShieldAlert} motion="warning-glow" size={21} />;
  }

  return <Gauge size={21} />;
};

const SectionTitle = ({ title, description }) => (
  <div className="supplier-details__section-title">
    <h3>{title}</h3>

    {description && <p>{description}</p>}
  </div>
);

const InfoItem = ({ label, value }) => (
  <div className="supplier-details__info-item">
    <span>{label}</span>

    <strong>{value || "—"}</strong>
  </div>
);

const ContactItem = ({ icon, label, value }) => (
  <div className="supplier-details__contact-item">
    <div>{icon}</div>

    <span>
      <small>{label}</small>

      <strong>{value || "—"}</strong>
    </span>
  </div>
);

export default SupplierDetailsPage;
