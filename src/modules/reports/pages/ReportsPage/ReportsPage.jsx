import { useMemo, useState } from "react";

import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Factory,
  LoaderCircle,
  PackageCheck,
  WalletCards,
} from "lucide-react";

import PageContainer from "../../../../components/PageContainer/PageContainer";

import {
  Badge,
  Card,
  DatePicker,
  LiveIcon,
  Select,
  Table,
} from "../../../../shared/ui";

import { formatProductionQuantity } from "../../../manufacturing/production-orders/utils/productionOrderHelpers";

import { getStoredProductionOrders } from "../../../manufacturing/utils/manufacturingStorage";

import {
  formatManufacturingMoney,
  getProductionStatusLabel,
  getProductionStatusVariant,
} from "../../../manufacturing/utils/manufacturingHelpers";

import { buildManufacturingReport } from "../../utils/manufacturingReports";

import "./ReportsPage.scss";

const PERIOD_OPTIONS = [
  { value: "today", label: "Bugun" },
  { value: "week", label: "Hafta" },
  { value: "month", label: "Oy" },
  { value: "year", label: "Yil" },
  { value: "custom", label: "Custom period" },
];

const STATUS_OPTIONS = [
  { value: "", label: "Barcha holatlar" },
  { value: "PLANNED", label: "Rejalashtirilgan" },
  { value: "IN_PROGRESS", label: "Jarayonda" },
  { value: "COMPLETED", label: "Tugallangan" },
];

const ReportsPage = () => {
  const [orders] = useState(() => getStoredProductionOrders());
  const [period, setPeriod] = useState("month");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [productId, setProductId] = useState("");
  const [status, setStatus] = useState("");

  const productOptions = useMemo(() => {
    const map = new Map();

    orders.forEach((order) => {
      if (order.productId && order.productName) {
        map.set(order.productId, order.productName);
      }
    });

    return [
      { value: "", label: "Barcha mahsulotlar" },
      ...Array.from(map.entries()).map(([value, label]) => ({
        value,
        label,
      })),
    ];
  }, [orders]);

  const report = useMemo(
    () =>
      buildManufacturingReport({
        orders,
        period,
        from,
        to,
        productId,
        status,
      }),
    [orders, period, from, to, productId, status],
  );

  const topProductMax = Math.max(
    ...report.topProducts.map((product) => product.producedQuantity),
    0,
  );

  return (
    <PageContainer
      title="Hisobotlar"
      description="Manufacturing natijalari, tannarx va ishlab chiqarish samaradorligi."
    >
      <div className="reports-page">
        <Card padding="lg" className="reports-page__filters">
          <Select
            label="Period"
            value={period}
            options={PERIOD_OPTIONS}
            onChange={(event) => setPeriod(event.target.value)}
          />

          {period === "custom" && (
            <>
              <DatePicker
                label="Boshlanish"
                value={from}
                onChange={(event) => setFrom(event.target.value)}
              />

              <DatePicker
                label="Tugash"
                value={to}
                onChange={(event) => setTo(event.target.value)}
              />
            </>
          )}

          <Select
            label="Product"
            value={productId}
            options={productOptions}
            onChange={(event) => setProductId(event.target.value)}
          />

          <Select
            label="Status"
            value={status}
            options={STATUS_OPTIONS}
            onChange={(event) => setStatus(event.target.value)}
          />
        </Card>

        <section className="reports-page__kpis">
          <ReportKpi
            icon={<Factory size={20} />}
            label="Jami production order"
            value={report.kpi.totalOrders}
          />
          <ReportKpi
            icon={<Clock3 size={20} />}
            label="Rejalashtirilgan"
            value={report.kpi.planned}
          />
          <ReportKpi
            icon={
              <LiveIcon
                icon={LoaderCircle}
                motion="spin-slow"
                active={report.kpi.inProgress > 0}
                size={20}
              />
            }
            label="Jarayonda"
            value={report.kpi.inProgress}
            variant="warning"
          />
          <ReportKpi
            icon={
              <LiveIcon
                icon={PackageCheck}
                motion="success-pop"
                active={report.kpi.completed > 0}
                size={20}
              />
            }
            label="Tugallangan"
            value={report.kpi.completed}
            variant="success"
          />
          <ReportKpi
            icon={<CheckCircle2 size={20} />}
            label="Jami ishlab chiqarilgan"
            value={formatProductionQuantity(report.kpi.producedQuantity)}
          />
          <ReportKpi
            icon={<AlertTriangle size={20} />}
            label="Jami brak"
            value={formatProductionQuantity(report.kpi.defectQuantity)}
            variant="danger"
          />
          <ReportKpi
            icon={<AlertTriangle size={20} />}
            label="Jami waste"
            value={formatProductionQuantity(report.kpi.wasteQuantity)}
            variant="warning"
          />
          <ReportKpi
            icon={<WalletCards size={20} />}
            label="Jami material tannarxi"
            value={`${formatManufacturingMoney(
              report.kpi.actualMaterialCost,
            )} so'm`}
          />
          <ReportKpi
            icon={<WalletCards size={20} />}
            label="Jami overhead"
            value={`${formatManufacturingMoney(report.kpi.overheadCost)} so'm`}
          />
          <ReportKpi
            icon={<WalletCards size={20} />}
            label="Jami ishlab chiqarish tannarxi"
            value={`${formatManufacturingMoney(
              report.kpi.actualProductionCost,
            )} so'm`}
          />
          <ReportKpi
            icon={<WalletCards size={20} />}
            label="O'rtacha unit cost"
            value={`${formatManufacturingMoney(
              report.kpi.averageUnitCost,
            )} so'm`}
          />
        </section>

        <ReportSection
          title="Production Summary"
          description="Order count, completed, in progress va production quantity."
        >
          <div className="reports-page__summary-grid">
            <SummaryValue label="Order count" value={report.kpi.totalOrders} />
            <SummaryValue label="Completed" value={report.kpi.completed} />
            <SummaryValue label="In progress" value={report.kpi.inProgress} />
            <SummaryValue
              label="Production quantity"
              value={formatProductionQuantity(report.kpi.producedQuantity)}
            />
          </div>
        </ReportSection>

        <ReportSection
          title="Plan vs Actual"
          description="Har completed order bo'yicha reja va real ishlab chiqarish."
        >
          <Table
            columns={[
              { key: "productName", title: "Product" },
              {
                key: "plannedQuantity",
                title: "Planned",
                render: (value, row) =>
                  `${formatProductionQuantity(value)} ${row.unit}`,
              },
              {
                key: "producedQuantity",
                title: "Actual",
                render: (value, row) =>
                  `${formatProductionQuantity(value)} ${row.unit}`,
              },
              {
                key: "difference",
                title: "Difference",
                render: (value, row) => (
                  <strong
                    className={
                      value < 0
                        ? "reports-page__danger-text"
                        : value > 0
                          ? "reports-page__success-text"
                          : ""
                    }
                  >
                    {value > 0 ? "+" : ""}
                    {formatProductionQuantity(value)} {row.unit}
                  </strong>
                ),
              },
              {
                key: "percent",
                title: "Percentage",
                render: (value) =>
                  `${value > 0 ? "+" : ""}${value.toFixed(1)}%`,
              },
            ]}
            data={report.planActualRows}
            rowKey="id"
            emptyText="Completed production mavjud emas."
          />
        </ReportSection>

        <ReportSection
          title="Defect / Waste"
          description="Brak va waste ulushi completed orderlar asosida."
        >
          <Table
            columns={[
              { key: "productName", title: "Product" },
              {
                key: "defectQuantity",
                title: "Defect",
                render: (value, row) =>
                  `${formatProductionQuantity(value)} ${row.unit}`,
              },
              {
                key: "wasteQuantity",
                title: "Waste",
                render: (value, row) =>
                  `${formatProductionQuantity(value)} ${row.unit}`,
              },
              {
                key: "defectRate",
                title: "Defect rate",
                render: (value) => `${value.toFixed(1)}%`,
              },
              {
                key: "wasteRate",
                title: "Waste rate",
                render: (value) => `${value.toFixed(1)}%`,
              },
            ]}
            data={report.defectWasteRows}
            rowKey="id"
            emptyText="Defect yoki waste ma'lumoti yo'q."
          />
        </ReportSection>

        <ReportSection
          title="Cost Report"
          description="Material, overhead va total production cost."
        >
          <Table
            columns={[
              { key: "productName", title: "Product" },
              {
                key: "plannedMaterialCost",
                title: "Planned material",
                render: (value) => `${formatManufacturingMoney(value)} so'm`,
              },
              {
                key: "actualMaterialCost",
                title: "Actual material",
                render: (value) => `${formatManufacturingMoney(value)} so'm`,
              },
              {
                key: "overheadCost",
                title: "Overhead",
                render: (value) => `${formatManufacturingMoney(value)} so'm`,
              },
              {
                key: "actualProductionCost",
                title: "Total production cost",
                render: (value) => `${formatManufacturingMoney(value)} so'm`,
              },
              {
                key: "actualUnitCost",
                title: "Actual unit cost",
                render: (value) => `${formatManufacturingMoney(value)} so'm`,
              },
            ]}
            data={report.costRows}
            rowKey="id"
            emptyText="Cost report uchun completed order mavjud emas."
          />
        </ReportSection>

        <ReportSection
          title="Top Products"
          description="Eng ko'p ishlab chiqarilgan 5 ta mahsulot."
        >
          <div className="reports-page__top-products">
            {report.topProducts.length > 0 ? (
              report.topProducts.map((product) => (
                <div key={product.id} className="reports-page__top-product">
                  <div>
                    <strong>{product.productName}</strong>
                    <span>
                      {formatProductionQuantity(product.producedQuantity)}
                    </span>
                  </div>

                  <div className="reports-page__bar">
                    <span
                      style={{
                        width: `${
                          topProductMax > 0
                            ? (product.producedQuantity / topProductMax) * 100
                            : 0
                        }%`,
                      }}
                    />
                  </div>
                </div>
              ))
            ) : (
              <div className="reports-page__empty">Mahsulotlar mavjud emas.</div>
            )}
          </div>
        </ReportSection>

        <ReportSection
          title="Recent Production"
          description="Oxirgi production orderlar."
        >
          <Table
            columns={[
              { key: "number", title: "Number" },
              { key: "productName", title: "Product" },
              {
                key: "status",
                title: "Status",
                render: (value) => (
                  <Badge variant={getProductionStatusVariant(value)}>
                    <ProductionStatusIcon status={value} />
                    {getProductionStatusLabel(value)}
                  </Badge>
                ),
              },
              {
                key: "date",
                title: "Date",
                render: (value) => value || "-",
              },
              {
                key: "plannedQuantity",
                title: "Planned",
                render: (value, row) =>
                  `${formatProductionQuantity(value)} ${row.unit}`,
              },
              {
                key: "producedQuantity",
                title: "Actual",
                render: (value, row) =>
                  `${formatProductionQuantity(value)} ${row.unit}`,
              },
              {
                key: "cost",
                title: "Cost",
                render: (value) => `${formatManufacturingMoney(value)} so'm`,
              },
            ]}
            data={report.recentOrders}
            rowKey="id"
            emptyText="Production order mavjud emas."
          />
        </ReportSection>
      </div>
    </PageContainer>
  );
};

const ReportKpi = ({ icon, label, value, variant = "" }) => (
  <Card variant="soft" padding="md" className="reports-page__kpi">
    <div
      className={[
        "reports-page__kpi-icon",
        variant ? `reports-page__kpi-icon--${variant}` : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {icon}
    </div>

    <div>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  </Card>
);

const ReportSection = ({ title, description, children }) => (
  <Card padding="lg" className="reports-page__section">
    <div className="reports-page__section-title">
      <h3>{title}</h3>
      {description && <p>{description}</p>}
    </div>

    {children}
  </Card>
);

const SummaryValue = ({ label, value }) => (
  <div className="reports-page__summary-value">
    <span>{label}</span>
    <strong>{value}</strong>
  </div>
);

const ProductionStatusIcon = ({ status }) => {
  if (status === "IN_PROGRESS") {
    return <LiveIcon icon={LoaderCircle} motion="spin-slow" size={14} />;
  }

  if (status === "COMPLETED") {
    return <LiveIcon icon={CheckCircle2} motion="success-pop" size={14} />;
  }

  if (status === "PLANNED") {
    return <LiveIcon icon={Clock3} motion="pulse-soft" size={14} />;
  }

  return null;
};

export default ReportsPage;
