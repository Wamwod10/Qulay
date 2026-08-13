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
import { getStoredSales } from "../../../sales/utils/salesStorage";
import { formatSaleMoney } from "../../../sales/utils/salesHelpers";
import {
  buildFinanceReport,
  formatFinanceMoney,
  getPaymentMethodLabel,
} from "../../../finance/utils/financeSelectors";

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
  const [sales] = useState(() => getStoredSales());
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

  const salesReport = useMemo(() => {
    const completedSales = sales.filter((sale) => sale.status !== "CANCELLED");
    const productMap = new Map();
    const agentMap = new Map();
    const customerMap = new Map();

    completedSales.forEach((sale) => {
      (sale.items || []).forEach((item) => {
        const current = productMap.get(item.productId) || {
          id: item.productId,
          name: item.productName,
          quantity: 0,
          revenue: 0,
        };

        current.quantity += Number(item.quantity || 0);
        current.revenue += Number(item.subtotal || 0);
        productMap.set(item.productId, current);
      });

      if (sale.agentId) {
        const currentAgent = agentMap.get(sale.agentId) || {
          id: sale.agentId,
          name: sale.agentName || sale.agentId,
          total: 0,
        };
        currentAgent.total += Number(sale.netTotal ?? sale.total ?? 0);
        agentMap.set(sale.agentId, currentAgent);
      }

      if (sale.customerId) {
        const currentCustomer = customerMap.get(sale.customerId) || {
          id: sale.customerId,
          name: sale.customerName || sale.customerId,
          total: 0,
          debt: 0,
        };
        currentCustomer.total += Number(sale.netTotal ?? sale.total ?? 0);
        currentCustomer.debt += Number(sale.debtAmount || 0);
        customerMap.set(sale.customerId, currentCustomer);
      }
    });

    return {
      amount: completedSales.reduce(
        (total, sale) => total + Number(sale.netTotal ?? sale.total ?? 0),
        0,
      ),
      paid: completedSales.reduce((total, sale) => total + Number(sale.paidAmount || 0), 0),
      debt: completedSales.reduce((total, sale) => total + Number(sale.debtAmount || 0), 0),
      count: completedSales.length,
      topProducts: [...productMap.values()].sort((a, b) => b.revenue - a.revenue).slice(0, 5),
      agentSales: [...agentMap.values()].sort((a, b) => b.total - a.total).slice(0, 5),
      customerSales: [...customerMap.values()].sort((a, b) => b.total - a.total).slice(0, 5),
    };
  }, [sales]);

  const financeReport = useMemo(
    () =>
      buildFinanceReport({
        ...getReportRange(period, from, to),
      }),
    [period, from, to],
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
        <ReportSection
          title="Sales Report"
          description="Sales modulidagi real completed savdolar, payment va debt summary."
        >
          <div className="reports-page__summary-grid">
            <SummaryValue label="Sale count" value={salesReport.count} />
            <SummaryValue label="Sales amount" value={`${formatSaleMoney(salesReport.amount)} so'm`} />
            <SummaryValue label="Paid" value={`${formatSaleMoney(salesReport.paid)} so'm`} />
            <SummaryValue label="Debt" value={`${formatSaleMoney(salesReport.debt)} so'm`} />
          </div>

          <div className="reports-page__sales-grid">
            <MiniReportList title="Top products" rows={salesReport.topProducts} valueKey="revenue" />
            <MiniReportList title="Agent sales" rows={salesReport.agentSales} valueKey="total" />
            <MiniReportList title="Customer sales" rows={salesReport.customerSales} valueKey="total" />
          </div>
        </ReportSection>

        <ReportSection
          title="Finance Report"
          description="Income, expenses, debt va agent collections Finance selectorlari asosida."
        >
          <div className="reports-page__summary-grid">
            <SummaryValue label="Income" value={`${formatFinanceMoney(financeReport.summary.income)} so'm`} />
            <SummaryValue label="Expenses" value={`${formatFinanceMoney(financeReport.summary.expense)} so'm`} />
            <SummaryValue label="Net Cashflow" value={`${formatFinanceMoney(financeReport.summary.netCashflow)} so'm`} />
            <SummaryValue label="Customer Debt" value={`${formatFinanceMoney(financeReport.summary.customerDebt)} so'm`} />
            <SummaryValue label="Supplier Debt" value={`${formatFinanceMoney(financeReport.summary.supplierDebt)} so'm`} />
            <SummaryValue label="Agent Collections" value={`${formatFinanceMoney(financeReport.summary.agentBalance)} so'm`} />
          </div>

          <div className="reports-page__sales-grid">
            <MiniReportList
              title="Payment methods"
              rows={financeReport.paymentMethods.map((row) => ({
                ...row,
                name: getPaymentMethodLabel(row.name),
              }))}
              valueKey="amount"
              formatter={formatFinanceMoney}
            />
            <MiniReportList
              title="Expenses by category"
              rows={financeReport.expensesByCategory}
              valueKey="amount"
              formatter={formatFinanceMoney}
            />
            <MiniReportList
              title="Agent balances"
              rows={financeReport.agentCollections.slice(0, 5).map((row) => ({
                id: row.agentId,
                name: row.agentName,
                amount: row.balance,
              }))}
              valueKey="amount"
              formatter={formatFinanceMoney}
            />
          </div>
        </ReportSection>

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

const MiniReportList = ({ title, rows, valueKey, formatter = formatSaleMoney }) => (
  <div className="reports-page__mini-report">
    <h4>{title}</h4>
    {rows.length ? (
      rows.map((row) => (
        <span key={row.id}>
          <b>{row.name}</b>
          <strong>{formatter(row[valueKey])} so'm</strong>
        </span>
      ))
    ) : (
      <p>Ma'lumot yo'q.</p>
    )}
  </div>
);

const getReportRange = (period, from, to) => {
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const start = new Date(now);

  if (period === "today") {
    return { from: today, to: today };
  }

  if (period === "week") {
    start.setDate(now.getDate() - 6);
  } else if (period === "month") {
    start.setMonth(now.getMonth() - 1);
  } else if (period === "year") {
    start.setFullYear(now.getFullYear() - 1);
  } else {
    return { from, to };
  }

  return { from: start.toISOString().slice(0, 10), to: today };
};

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
