import { useMemo, useState } from "react";

import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Factory,
  LoaderCircle,
  PackageCheck,
  UserCheck,
  Users,
  WalletCards,
} from "lucide-react";

import PageContainer from "../../../../components/PageContainer/PageContainer";

import {
  Badge,
  Card,
  DatePicker,
  Input,
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

import { getStoredBatches } from "../../../warehouse/utils/warehouseStorage";

import { formatSaleMoney } from "../../../sales/utils/salesHelpers";

import {
  buildFinanceReport,
  formatFinanceMoney,
  getPaymentMethodLabel,
} from "../../../finance/utils/financeSelectors";

import { buildCustomerReport } from "../../../customers/utils/customerSelectors";

import { buildHrReport, monthIso } from "../../../employees/utils/hrStorage";

import useConfiguredColumns from "../../../settings/hooks/useConfiguredColumns";

import { getLocale, translateText } from "../../../../localization/i18n";

import "./ReportsPage.scss";

/* =========================================
 * OPTIONS
 * ========================================= */

const PERIOD_OPTIONS = [
  {
    value: "today",
    label: "Bugun",
  },
  {
    value: "week",
    label: "Hafta",
  },
  {
    value: "month",
    label: "Oy",
  },
  {
    value: "year",
    label: "Yil",
  },
  {
    value: "custom",
    label: "Tanlangan davr",
  },
];

const STATUS_OPTIONS = [
  {
    value: "",
    label: "Barcha holatlar",
  },
  {
    value: "PLANNED",
    label: "Rejalashtirilgan",
  },
  {
    value: "IN_PROGRESS",
    label: "Jarayonda",
  },
  {
    value: "COMPLETED",
    label: "Tugallangan",
  },
];

/* =========================================
 * I18N HELPERS
 * ========================================= */

const localizeOptions = (options = []) =>
  options.map((option) => ({
    ...option,
    label: translateText(option.label),
  }));

const moneyText = (value, formatter = formatFinanceMoney) => formatter(value);

const localizedUnit = (unit) => translateText(unit || "dona");

const localizedProductionStatus = (status) =>
  translateText(getProductionStatusLabel(status));

const LocalizedTable = ({ columns = [], emptyText, ...props }) => {
  const localizedColumns = columns.map((column) => ({
    ...column,

    title:
      typeof column.title === "string"
        ? translateText(column.title)
        : column.title,
  }));

  return (
    <Table
      {...props}
      columns={localizedColumns}
      emptyText={emptyText ? translateText(emptyText) : undefined}
    />
  );
};

/* =========================================
 * PAGE
 * ========================================= */

const ReportsPage = () => {
  const [orders] = useState(() => getStoredProductionOrders());

  const [sales] = useState(() => getStoredSales());

  const [batches] = useState(() => getStoredBatches());

  const [period, setPeriod] = useState("month");

  const [from, setFrom] = useState("");

  const [to, setTo] = useState("");

  const [productId, setProductId] = useState("");

  const [status, setStatus] = useState("");

  const [hrMonth, setHrMonth] = useState(monthIso());

  /* =========================================
   * PRODUCT OPTIONS
   * ========================================= */

  const productOptions = useMemo(() => {
    const map = new Map();

    orders.forEach((order) => {
      if (order.productId && order.productName) {
        map.set(order.productId, order.productName);
      }
    });

    return [
      {
        value: "",
        label: translateText("Barcha mahsulotlar"),
      },

      ...Array.from(map.entries()).map(([value, label]) => ({
        value,
        label,
      })),
    ];
  }, [orders]);

  /* =========================================
   * MANUFACTURING REPORT
   * ========================================= */

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

  /* =========================================
   * SALES REPORT
   * ========================================= */

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

      paid: completedSales.reduce(
        (total, sale) => total + Number(sale.paidAmount || 0),

        0,
      ),

      debt: completedSales.reduce(
        (total, sale) => total + Number(sale.debtAmount || 0),

        0,
      ),

      count: completedSales.length,

      topProducts: [...productMap.values()]
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5),

      agentSales: [...agentMap.values()]
        .sort((a, b) => b.total - a.total)
        .slice(0, 5),

      customerSales: [...customerMap.values()]
        .sort((a, b) => b.total - a.total)
        .slice(0, 5),
    };
  }, [sales]);

  const expiryRows = useMemo(
    () =>
      batches
        .filter((batch) => ["expired", "near_expiry"].includes(batch.expiryStatus))
        .sort((left, right) => Number(left.expiryDays ?? 0) - Number(right.expiryDays ?? 0)),
    [batches],
  );

  /* =========================================
   * FINANCE
   * ========================================= */

  const financeReport = useMemo(
    () =>
      buildFinanceReport({
        ...getReportRange(period, from, to),
      }),

    [period, from, to],
  );

  /* =========================================
   * CRM
   * ========================================= */

  const customerReport = useMemo(
    () => buildCustomerReport(),

    [],
  );

  /* =========================================
   * HR
   * ========================================= */

  const hrReport = useMemo(
    () => buildHrReport(hrMonth),

    [hrMonth],
  );

  /* =========================================
   * PAYROLL TABLE
   * ========================================= */

  const payrollReportColumns = useConfiguredColumns(
    "reports-payroll",

    [
      {
        key: "employeeName",

        title: "Xodim",
      },

      {
        key: "baseAmount",

        title: "Asos",

        render: (value) => moneyText(value),
      },

      {
        key: "bonuses",

        title: "Mukofot",

        render: (value) => moneyText(value),
      },

      {
        key: "advances",

        title: "Avans",

        render: (value) => moneyText(value),
      },

      {
        key: "penalties",

        title: "Jarima",

        render: (value) => moneyText(value),
      },

      {
        key: "netAmount",

        title: "Sof oylik",

        render: (value) => moneyText(value),
      },

      {
        key: "paidAmount",

        title: "To'langan",

        render: (value) => moneyText(value),
      },

      {
        key: "debtAmount",

        title: "Qarz",

        render: (value) => moneyText(value),
      },
    ],
  );

  const topProductMax = Math.max(
    ...report.topProducts.map((product) => product.producedQuantity),

    0,
  );

  return (
    <PageContainer
      title={translateText("Hisobotlar")}
      description={translateText(
        "Manufacturing natijalari, tannarx va ishlab chiqarish samaradorligi.",
      )}
    >
      <div className="reports-page">
        {/* =========================
            SALES
        ========================== */}

        <ReportSection
          title="Savdo hisoboti"
          description="Savdo modulidagi real yakunlangan savdolar, to'lovlar va qarzlar."
        >
          <div className="reports-page__summary-grid">
            <SummaryValue label="Savdo soni" value={salesReport.count} />

            <SummaryValue
              label="Savdo summasi"
              value={moneyText(salesReport.amount, formatSaleMoney)}
            />

            <SummaryValue
              label="To'langan"
              value={moneyText(salesReport.paid, formatSaleMoney)}
            />

            <SummaryValue
              label="Qarz"
              value={moneyText(salesReport.debt, formatSaleMoney)}
            />
          </div>

          <div className="reports-page__sales-grid">
            <MiniReportList
              title="Eng ko'p sotilgan mahsulotlar"
              rows={salesReport.topProducts}
              valueKey="revenue"
            />

            <MiniReportList
              title="Agentlar savdosi"
              rows={salesReport.agentSales}
              valueKey="total"
            />

            <MiniReportList
              title="Mijozlar savdosi"
              rows={salesReport.customerSales}
              valueKey="total"
            />
          </div>
        </ReportSection>

        <ReportSection
          title="Yaroqlilik muddati hisoboti"
          description="Muddati o'tgan va yaqin qolgan xomashyo hamda tayyor mahsulot batchlari."
        >
          <LocalizedTable
            columns={[
              { key: "productName", title: "Mahsulot" },
              { key: "batchNumber", title: "Batch" },
              { key: "warehouseName", title: "Ombor" },
              {
                key: "expiryDate",
                title: "Yaroqlilik sanasi",
                render: (value) =>
                  value ? new Date(value).toLocaleDateString(getLocale()) : "—",
              },
              {
                key: "expiryStatus",
                title: "Holat",
                render: (value, row) => (
                  <Badge variant={value === "expired" ? "danger" : "warning"}>
                    {value === "expired"
                      ? translateText("Muddati o'tgan")
                      : `${row.expiryDays} ${translateText("kun qoldi")}`}
                  </Badge>
                ),
              },
            ]}
            data={expiryRows}
            rowKey="id"
            emptyText="Yaroqlilik bo'yicha ogohlantirish yo'q."
          />
        </ReportSection>

        {/* =========================
            FINANCE
        ========================== */}

        <ReportSection
          title="Moliya hisoboti"
          description="Kirim, chiqim, qarz va agent tushumlari moliya hisoblari asosida."
        >
          <div className="reports-page__summary-grid">
            <SummaryValue
              label="Kirim"
              value={moneyText(financeReport.summary.income)}
            />

            <SummaryValue
              label="Chiqim"
              value={moneyText(financeReport.summary.expense)}
            />

            <SummaryValue
              label="Sof pul oqimi"
              value={moneyText(financeReport.summary.netCashflow)}
            />

            <SummaryValue
              label="Mijoz qarzi"
              value={moneyText(financeReport.summary.customerDebt)}
            />

            <SummaryValue
              label="Yetkazib beruvchi qarzi"
              value={moneyText(financeReport.summary.supplierDebt)}
            />

            <SummaryValue
              label="Agentdagi pul"
              value={moneyText(financeReport.summary.agentBalance)}
            />
          </div>

          <div className="reports-page__sales-grid">
            <MiniReportList
              title="To'lov turlari"
              rows={financeReport.paymentMethods.map((row) => ({
                ...row,

                name: translateText(getPaymentMethodLabel(row.name)),
              }))}
              valueKey="amount"
              formatter={formatFinanceMoney}
            />

            <MiniReportList
              title="Kategoriya bo'yicha xarajatlar"
              rows={financeReport.expensesByCategory}
              valueKey="amount"
              formatter={formatFinanceMoney}
            />

            <MiniReportList
              title="Agent qoldiqlari"
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

        {/* =========================
            CRM
        ========================== */}

        <ReportSection
          title="CRM / mijozlar hisoboti"
          description="Mijozlar, savdo, moliya va agentlar ma'lumotlari asosidagi real mijozlar xulosasi."
        >
          <div className="reports-page__summary-grid">
            <SummaryValue
              label="Jami mijoz"
              value={customerReport.totalCustomers}
            />

            <SummaryValue
              label="Yangi mijoz"
              value={customerReport.newCustomers}
            />

            <SummaryValue
              label="Faol mijoz"
              value={customerReport.activeCustomers}
            />

            <SummaryValue
              label="Mijozlar savdosi"
              value={moneyText(customerReport.customerSales)}
            />

            <SummaryValue
              label="Mijozlar qarzi"
              value={moneyText(customerReport.customerDebt)}
            />
          </div>

          <div className="reports-page__sales-grid">
            <MiniReportList
              title="Eng faol mijozlar"
              rows={customerReport.topCustomers.map((row) => ({
                id: row.id,

                name: row.displayName,

                amount: row.salesAmount,
              }))}
              valueKey="amount"
              formatter={formatFinanceMoney}
            />

            <MiniReportList
              title="Riskli qarzdor mijozlar"
              rows={customerReport.riskyDebtCustomers.map((row) => ({
                id: row.id,

                name: row.displayName,

                amount: row.debtAmount,
              }))}
              valueKey="amount"
              formatter={formatFinanceMoney}
            />

            <MiniReportList
              title="Agentlar bo'yicha mijozlar"
              rows={customerReport.agentDistribution.map((row) => ({
                id: row.id,

                name: `${row.name} / ${row.customers} ${translateText("ta")}`,

                amount: row.sales,
              }))}
              valueKey="amount"
              formatter={formatFinanceMoney}
            />
          </div>
        </ReportSection>

        {/* =========================
            HR
        ========================== */}

        <ReportSection
          title="Xodimlar hisoboti"
          description="Xodim, davomat, oylik hisob-kitobi, qarz va mukofot/jarimalar asosida."
        >
          <div className="reports-page__hr-filter">
            <Input
              label={translateText("Oylik oyi")}
              type="month"
              value={hrMonth}
              onChange={(event) => setHrMonth(event.target.value || monthIso())}
            />
          </div>

          <div className="reports-page__summary-grid">
            <SummaryValue
              label="Xodimlar soni"
              value={hrReport.summary.employeeCount}
            />

            <SummaryValue
              label="Jami oylik"
              value={moneyText(hrReport.summary.payrollTotal)}
            />

            <SummaryValue
              label="To'langan oylik"
              value={moneyText(hrReport.summary.paidSalary)}
            />

            <SummaryValue
              label="Oylik qarzi"
              value={moneyText(hrReport.summary.salaryDebt)}
            />

            <SummaryValue
              label="Avanslar"
              value={moneyText(hrReport.summary.advances)}
            />

            <SummaryValue
              label="Mukofotlar"
              value={moneyText(hrReport.summary.bonuses)}
            />

            <SummaryValue
              label="Jarimalar"
              value={moneyText(hrReport.summary.penalties)}
            />

            <SummaryValue
              label="Davomat foizi"
              value={`${hrReport.summary.attendanceRate}%`}
            />

            <SummaryValue
              label="Kechikkanlar soni"
              value={hrReport.summary.lateCount}
            />
          </div>

          <div className="reports-page__sales-grid">
            <MiniReportList
              title="Oylik qarzi"
              rows={hrReport.salaryDebt.slice(0, 5).map((row) => ({
                id: row.id,

                name: row.employeeName,

                amount: row.debtAmount,
              }))}
              valueKey="amount"
              formatter={formatFinanceMoney}
            />

            <MiniReportList
              title="Kechikkan xodimlar"
              rows={hrReport.lateEmployees.slice(0, 5).map((row) => ({
                id: row.id,

                name: `${row.employeeName} / ${row.lateMinutes} ${translateText(
                  "min",
                )}`,

                amount: row.lateMinutes,
              }))}
              valueKey="amount"
              formatter={(value) => String(value)}
              suffix=""
            />

            <MiniReportList
              title="Bo'limlar bo'yicha oylik"
              rows={hrReport.departmentPayroll.slice(0, 5).map((row) => ({
                id: row.id,

                name: row.name,

                amount: row.payroll,
              }))}
              valueKey="amount"
              formatter={formatFinanceMoney}
            />
          </div>

          <LocalizedTable
            columns={payrollReportColumns}
            data={hrReport.payrollByMonth}
            rowKey="id"
            emptyText="Xodimlar oyligi bo'yicha ma'lumot yo'q."
          />
        </ReportSection>

        {/* =========================
            FILTERS
        ========================== */}

        <Card padding="lg" className="reports-page__filters">
          <Select
            label={translateText("Davr")}
            value={period}
            options={localizeOptions(PERIOD_OPTIONS)}
            onChange={(event) => setPeriod(event.target.value)}
          />

          {period === "custom" && (
            <>
              <DatePicker
                label={translateText("Boshlanish")}
                value={from}
                onChange={(event) => setFrom(event.target.value)}
              />

              <DatePicker
                label={translateText("Tugash")}
                value={to}
                onChange={(event) => setTo(event.target.value)}
              />
            </>
          )}

          <Select
            label={translateText("Mahsulot")}
            value={productId}
            options={productOptions}
            onChange={(event) => setProductId(event.target.value)}
          />

          <Select
            label={translateText("Holat")}
            value={status}
            options={localizeOptions(STATUS_OPTIONS)}
            onChange={(event) => setStatus(event.target.value)}
          />
        </Card>

        {/* =========================
            KPIs
        ========================== */}

        <section className="reports-page__kpis">
          <ReportKpi
            icon={<Factory size={20} />}
            label="Jami ishlab chiqarish buyurtmasi"
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
            icon={<Users size={20} />}
            label="CRM mijozlar"
            value={customerReport.totalCustomers}
          />

          <ReportKpi
            icon={<UserCheck size={20} />}
            label="Faol CRM mijozlar"
            value={customerReport.activeCustomers}
            variant="success"
          />

          <ReportKpi
            icon={<AlertTriangle size={20} />}
            label="Jami brak"
            value={formatProductionQuantity(report.kpi.defectQuantity)}
            variant="danger"
          />

          <ReportKpi
            icon={<AlertTriangle size={20} />}
            label="Jami yo'qotish"
            value={formatProductionQuantity(report.kpi.wasteQuantity)}
            variant="warning"
          />

          <ReportKpi
            icon={<WalletCards size={20} />}
            label="Jami material tannarxi"
            value={moneyText(
              report.kpi.actualMaterialCost,
              formatManufacturingMoney,
            )}
          />

          <ReportKpi
            icon={<WalletCards size={20} />}
            label="Jami qo'shimcha xarajat"
            value={moneyText(report.kpi.overheadCost, formatManufacturingMoney)}
          />

          <ReportKpi
            icon={<WalletCards size={20} />}
            label="Jami ishlab chiqarish tannarxi"
            value={moneyText(
              report.kpi.actualProductionCost,
              formatManufacturingMoney,
            )}
          />

          <ReportKpi
            icon={<WalletCards size={20} />}
            label="O'rtacha birlik tannarxi"
            value={moneyText(
              report.kpi.averageUnitCost,
              formatManufacturingMoney,
            )}
          />
        </section>

        {/* =========================
            MANUFACTURING SUMMARY
        ========================== */}

        <ReportSection
          title="Ishlab chiqarish xulosasi"
          description="Buyurtmalar soni, yakunlangan, jarayondagi va ishlab chiqarilgan miqdor."
        >
          <div className="reports-page__summary-grid">
            <SummaryValue
              label="Buyurtmalar soni"
              value={report.kpi.totalOrders}
            />

            <SummaryValue label="Yakunlangan" value={report.kpi.completed} />

            <SummaryValue label="Jarayonda" value={report.kpi.inProgress} />

            <SummaryValue
              label="Ishlab chiqarilgan miqdor"
              value={formatProductionQuantity(report.kpi.producedQuantity)}
            />
          </div>
        </ReportSection>

        {/* =========================
            PLAN VS ACTUAL
        ========================== */}

        <ReportSection
          title="Reja va amalda"
          description="Har bir yakunlangan buyurtma bo'yicha reja va real ishlab chiqarish."
        >
          <LocalizedTable
            columns={[
              {
                key: "productName",

                title: "Mahsulot",
              },

              {
                key: "plannedQuantity",

                title: "Reja",

                render: (value, row) =>
                  `${formatProductionQuantity(value)} ${localizedUnit(
                    row.unit,
                  )}`,
              },

              {
                key: "producedQuantity",

                title: "Amalda",

                render: (value, row) =>
                  `${formatProductionQuantity(value)} ${localizedUnit(
                    row.unit,
                  )}`,
              },

              {
                key: "difference",

                title: "Farq",

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
                    {formatProductionQuantity(value)} {localizedUnit(row.unit)}
                  </strong>
                ),
              },

              {
                key: "percent",

                title: "Foiz",

                render: (value) =>
                  `${value > 0 ? "+" : ""}${value.toFixed(1)}%`,
              },
            ]}
            data={report.planActualRows}
            rowKey="id"
            emptyText="Yakunlangan ishlab chiqarish mavjud emas."
          />
        </ReportSection>

        {/* =========================
            BRAK / CHIQINDI
        ========================== */}

        <ReportSection
          title="Brak / yo'qotish"
          description="Brak va yo'qotish ulushi yakunlangan buyurtmalar asosida."
        >
          <LocalizedTable
            columns={[
              {
                key: "productName",

                title: "Mahsulot",
              },

              {
                key: "defectQuantity",

                title: "Brak",

                render: (value, row) =>
                  `${formatProductionQuantity(value)} ${localizedUnit(
                    row.unit,
                  )}`,
              },

              {
                key: "wasteQuantity",

                title: "Yo'qotish",

                render: (value, row) =>
                  `${formatProductionQuantity(value)} ${localizedUnit(
                    row.unit,
                  )}`,
              },

              {
                key: "defectRate",

                title: "Brak foizi",

                render: (value) => `${value.toFixed(1)}%`,
              },

              {
                key: "wasteRate",

                title: "Yo'qotish foizi",

                render: (value) => `${value.toFixed(1)}%`,
              },
            ]}
            data={report.defectWasteRows}
            rowKey="id"
            emptyText="Brak yoki yo'qotish ma'lumoti yo'q."
          />
        </ReportSection>

        {/* =========================
            COST REPORT
        ========================== */}

        <ReportSection
          title="Tannarx hisoboti"
          description="Material, qo'shimcha xarajat va jami ishlab chiqarish tannarxi."
        >
          <LocalizedTable
            columns={[
              {
                key: "productName",

                title: "Mahsulot",
              },

              {
                key: "plannedMaterialCost",

                title: "Rejadagi material",

                render: (value) => moneyText(value, formatManufacturingMoney),
              },

              {
                key: "actualMaterialCost",

                title: "Amaldagi material",

                render: (value) => moneyText(value, formatManufacturingMoney),
              },

              {
                key: "overheadCost",

                title: "Qo'shimcha xarajat",

                render: (value) => moneyText(value, formatManufacturingMoney),
              },

              {
                key: "actualProductionCost",

                title: "Jami ishlab chiqarish tannarxi",

                render: (value) => moneyText(value, formatManufacturingMoney),
              },

              {
                key: "actualUnitCost",

                title: "Amaldagi birlik tannarxi",

                render: (value) => moneyText(value, formatManufacturingMoney),
              },
            ]}
            data={report.costRows}
            rowKey="id"
            emptyText="Tannarx hisoboti uchun yakunlangan buyurtma mavjud emas."
          />
        </ReportSection>

        {/* =========================
            TOP PRODUCTS
        ========================== */}

        <ReportSection
          title="Eng ko'p ishlab chiqarilgan mahsulotlar"
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
              <div className="reports-page__empty">
                {translateText("Mahsulotlar mavjud emas.")}
              </div>
            )}
          </div>
        </ReportSection>

        {/* =========================
            RECENT PRODUCTION
        ========================== */}

        <ReportSection
          title="Oxirgi ishlab chiqarish"
          description="Oxirgi ishlab chiqarish buyurtmalari."
        >
          <LocalizedTable
            columns={[
              {
                key: "number",

                title: "Raqam",
              },

              {
                key: "productName",

                title: "Mahsulot",
              },

              {
                key: "status",

                title: "Holat",

                render: (value) => (
                  <Badge variant={getProductionStatusVariant(value)}>
                    <ProductionStatusIcon status={value} />

                    {localizedProductionStatus(value)}
                  </Badge>
                ),
              },

              {
                key: "date",

                title: "Sana",

                render: (value) => value || "-",
              },

              {
                key: "plannedQuantity",

                title: "Reja",

                render: (value, row) =>
                  `${formatProductionQuantity(value)} ${localizedUnit(
                    row.unit,
                  )}`,
              },

              {
                key: "producedQuantity",

                title: "Amalda",

                render: (value, row) =>
                  `${formatProductionQuantity(value)} ${localizedUnit(
                    row.unit,
                  )}`,
              },

              {
                key: "cost",

                title: "Tannarx",

                render: (value) => moneyText(value, formatManufacturingMoney),
              },
            ]}
            data={report.recentOrders}
            rowKey="id"
            emptyText="Ishlab chiqarish buyurtmasi mavjud emas."
          />
        </ReportSection>
      </div>
    </PageContainer>
  );
};

/* =========================================
 * COMPONENTS
 * ========================================= */

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
      <span>{translateText(label)}</span>

      <strong>{value}</strong>
    </div>
  </Card>
);

const ReportSection = ({ title, description, children }) => (
  <Card padding="lg" className="reports-page__section">
    <div className="reports-page__section-title">
      <h3>{translateText(title)}</h3>

      {description && <p>{translateText(description)}</p>}
    </div>

    {children}
  </Card>
);

const SummaryValue = ({ label, value }) => (
  <div className="reports-page__summary-value">
    <span>{translateText(label)}</span>

    <strong>{value}</strong>
  </div>
);

const MiniReportList = ({
  title,
  rows = [],
  valueKey,
  formatter = formatSaleMoney,
  suffix,
}) => (
  <div className="reports-page__mini-report">
    <h4>{translateText(title)}</h4>

    {rows.length ? (
      rows.map((row) => (
        <span key={row.id}>
          <b>{translateText(row.name || "-")}</b>

          <strong>
            {formatter(row[valueKey])}

          </strong>
        </span>
      ))
    ) : (
      <p>{translateText("Ma'lumot yo'q.")}</p>
    )}
  </div>
);

/* =========================================
 * DATE RANGE
 * ========================================= */

const getReportRange = (period, from, to) => {
  const now = new Date();

  const today = now.toISOString().slice(0, 10);

  const start = new Date(now);

  if (period === "today") {
    return {
      from: today,
      to: today,
    };
  }

  if (period === "week") {
    start.setDate(now.getDate() - 6);
  } else if (period === "month") {
    start.setMonth(now.getMonth() - 1);
  } else if (period === "year") {
    start.setFullYear(now.getFullYear() - 1);
  } else {
    return {
      from,
      to,
    };
  }

  return {
    from: start.toISOString().slice(0, 10),

    to: today,
  };
};

/* =========================================
 * STATUS ICON
 * ========================================= */

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
