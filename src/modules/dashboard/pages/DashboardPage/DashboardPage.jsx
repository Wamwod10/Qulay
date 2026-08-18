import { useEffect, useMemo, useState } from "react";

import {
  Activity,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  CheckCircle,
  CircleDollarSign,
  Clock,
  Factory,
  Package,
  PackageX,
  Plus,
  Receipt,
  ShoppingCart,
  Truck,
  UserPlus,
  Users,
  Wallet,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

import PageContainer from "../../../../components/PageContainer/PageContainer";
import { Badge, Button, Card, EmptyState, LiveIcon, Select } from "../../../../shared/ui";
import {
  DASHBOARD_PERIODS,
  getDashboardData,
  parseDashboardDate,
} from "../../utils/dashboardSelectors";
import { getLocale, translateText } from "../../../../localization/i18n";

import "./DashboardPage.scss";

const moneyFormatter = () => new Intl.NumberFormat(getLocale(), {
  maximumFractionDigits: 0,
});

const formatMoney = (value) =>
  `${moneyFormatter().format(Number(value) || 0)} ${translateText("so'm")}`;

const formatNumber = (value) => moneyFormatter().format(Number(value) || 0);

const formatDateTime = (value) => {
  const date = parseDashboardDate(value);

  if (!date) {
    return "-";
  }

  return date.toLocaleString(getLocale(), {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const getPeriodLabel = (period) =>
  translateText(DASHBOARD_PERIODS.find((item) => item.value === period)?.label || "Bugun");

const statusLabel = (status) => {
  switch (status) {
    case "IN_PROGRESS":
      return translateText("Jarayonda");
    case "PLANNED":
      return translateText("Reja");
    case "ORDERED":
      return translateText("Buyurtma");
    case "PARTIALLY_RECEIVED":
      return translateText("Qisman");
    case "LOW_STOCK":
      return translateText("Kam");
    case "OUT_OF_STOCK":
      return translateText("Tugagan");
    default:
      return status || "-";
  }
};

const statusVariant = (status) => {
  switch (status) {
    case "OUT_OF_STOCK":
    case "late":
      return "danger";
    case "LOW_STOCK":
    case "IN_PROGRESS":
    case "PARTIALLY_RECEIVED":
    case "today":
      return "warning";
    case "PLANNED":
    case "ORDERED":
    case "pending":
      return "primary";
    default:
      return "neutral";
  }
};

const activityIcon = {
  sales: { icon: ShoppingCart, motion: "success-pop" },
  "finance-in": { icon: ArrowUpRight, motion: "trend-up-soft" },
  "finance-out": { icon: ArrowDownRight, motion: "trend-down-soft" },
  purchase: { icon: Truck, motion: "pulse-soft" },
  production: { icon: Factory, motion: "success-pop" },
  "warehouse-in": { icon: Package, motion: "stock-in-soft" },
  "warehouse-out": { icon: PackageX, motion: "stock-out-soft" },
};

const DashboardPage = () => {
  const navigate = useNavigate();
  const [period, setPeriod] = useState("today");
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const refresh = () => setRefreshKey((current) => current + 1);
    const events = [
      "storage",
      "sales:changed",
      "finance:changed",
      "warehouse:changed",
      "customers:changed",
      "hr:changed",
    ];

    events.forEach((event) => window.addEventListener(event, refresh));

    return () => {
      events.forEach((event) => window.removeEventListener(event, refresh));
    };
  }, []);

  const dashboard = useMemo(
    () => getDashboardData(period),
    [period, refreshKey],
  );

  if (!dashboard) {
    return (
      <PageContainer title="Bosh sahifa">
        <EmptyState title="Bosh sahifa yuklanmadi" description="Mahalliy xotira mavjud emas." />
      </PageContainer>
    );
  }

  const periodLabel = getPeriodLabel(period);

  return (
    <PageContainer
      title="Bosh sahifa"
      description="Biznes holati, pul oqimi va operatsion signallar."
    >
      <div className="dashboard-page">
        <header className="dashboard-page__topbar">
          <div className="dashboard-page__period">
            <Select
              value={period}
              options={DASHBOARD_PERIODS}
              onChange={(event) => setPeriod(event.target.value)}
              placeholder="Davr"
            />
          </div>

          <div className="dashboard-page__actions">
            <QuickAction
              icon={<ShoppingCart size={16} />}
              label="Yangi savdo"
              onClick={() => navigate("/sales/terminal")}
            />
            <QuickAction
              icon={<Truck size={16} />}
              label="Yangi xarid"
              onClick={() => navigate("/purchases/create")}
            />
            <QuickAction
              icon={<Factory size={16} />}
              label="Ishlab chiqarish"
              onClick={() => navigate("/manufacturing/orders/create")}
            />
            <QuickAction
              icon={<UserPlus size={16} />}
              label="Yangi mijoz"
              onClick={() => navigate("/customers/create")}
            />
            <QuickAction
              icon={<Plus size={16} />}
              label="Xarajat"
              onClick={() => navigate("/finance/expenses")}
            />
          </div>
        </header>

        <section className="dashboard-page__kpis">
          {dashboard.kpis.map((kpi) => (
            <KpiCard
              key={kpi.id}
              kpi={kpi}
              periodLabel={kpi.id === "stock" ? translateText("Jonli") : periodLabel}
              onClick={() => navigate(kpi.path)}
            />
          ))}
        </section>

        <section className="dashboard-page__grid dashboard-page__grid--two">
          <SalesFinancePanel
            sales={dashboard.sales}
            finance={dashboard.finance}
            periodLabel={periodLabel}
            onSales={() => navigate("/sales/history")}
            onFinance={() => navigate("/finance/cashflow")}
          />

          <WarehousePanel
            warehouse={dashboard.warehouse}
            onClick={() => navigate("/warehouse")}
          />
        </section>

        <section className="dashboard-page__grid dashboard-page__grid--two">
          <ManufacturingPanel
            manufacturing={dashboard.manufacturing}
            periodLabel={periodLabel}
            onClick={() => navigate("/manufacturing")}
            onOrder={(order) => navigate(`/manufacturing/orders/${order.id}`)}
          />

          <PurchasesPanel
            purchases={dashboard.purchases}
            onClick={() => navigate("/purchases")}
            onPurchase={(purchase) => navigate(`/purchases/${purchase.id}`)}
          />
        </section>

        <section className="dashboard-page__grid dashboard-page__grid--two">
          <AgentPanel
            agents={dashboard.agents}
            onClick={() => navigate("/agents")}
          />

          <SignalsPanel
            debts={dashboard.debts}
            crm={dashboard.crm}
            hr={dashboard.hr}
            onCustomers={() => navigate("/customers")}
            onHr={() => navigate("/hr")}
            onDebts={() => navigate("/finance/debts")}
          />
        </section>

        <RecentActivityPanel
          items={dashboard.recentActivity}
          onOpen={(path) => navigate(path)}
        />
      </div>
    </PageContainer>
  );
};

const QuickAction = ({ icon, label, onClick }) => (
  <Button variant="secondary" size="sm" leftIcon={icon} onClick={onClick}>
    {label}
  </Button>
);

const KpiCard = ({ kpi, periodLabel, onClick }) => {
  const iconMap = {
    sales: ShoppingCart,
    income: CircleDollarSign,
    cashflow: Wallet,
    customerDebt: Users,
    supplierDebt: Truck,
    stock: PackageX,
  };
  const motionMap = {
    sales: "success-pop",
    income: "trend-up-soft",
    cashflow: kpi.value < 0 ? "trend-down-soft" : "trend-up-soft",
    customerDebt: kpi.value > 0 ? "warning-glow" : "",
    supplierDebt: kpi.value > 0 ? "warning-glow" : "",
    stock: kpi.value > 0 ? "warning-glow" : "",
  };
  const Icon = iconMap[kpi.id] || Activity;

  return (
    <button type="button" className="dashboard-page__kpi" onClick={onClick}>
      <span className="dashboard-page__kpi-icon">
        <LiveIcon icon={Icon} motion={motionMap[kpi.id]} active={Boolean(motionMap[kpi.id])} />
      </span>
      <span className="dashboard-page__kpi-content">
        <span className="dashboard-page__kpi-label">{translateText(kpi.label)}</span>
        <strong>{kpi.plain ? formatNumber(kpi.value) : formatMoney(kpi.value)}</strong>
        <small>
          {periodLabel} · {translateText(kpi.meta)}
        </small>
      </span>
    </button>
  );
};

const PanelHeader = ({ icon, title, meta, actionLabel, onClick }) => (
  <div className="dashboard-page__panel-header">
    <div>
      <h2>
        {icon}
        {translateText(title)}
      </h2>
      {meta && <p>{translateText(meta)}</p>}
    </div>
    {onClick && (
      <Button variant="ghost" size="sm" onClick={onClick}>
        {translateText(actionLabel || "Ochish")}
      </Button>
    )}
  </div>
);

const SalesFinancePanel = ({ sales, finance, periodLabel, onSales, onFinance }) => (
  <Card padding="md" className="dashboard-page__panel">
    <PanelHeader
      icon={<ShoppingCart size={18} />}
      title="Savdo va pul oqimi"
      meta={periodLabel}
      actionLabel="Savdo"
      onClick={onSales}
    />

    <div className="dashboard-page__summary-grid">
      <SummaryItem label="Savdo" value={formatMoney(sales.total)} />
      <SummaryItem label="Cheklar" value={formatNumber(sales.count)} />
      <SummaryItem label="To'langan" value={formatMoney(sales.paidAmount)} />
      <SummaryItem label="Qarzga" value={formatMoney(sales.debtAmount)} />
      <SummaryItem label="O'rtacha chek" value={formatMoney(sales.averageCheck)} />
      <SummaryItem label="Kassa qoldig'i" value={formatMoney(finance.cashboxBalance)} />
    </div>

    <button type="button" className="dashboard-page__cashflow" onClick={onFinance}>
      <span>
        <LiveIcon icon={ArrowUpRight} motion="trend-up-soft" active={finance.inAmount > 0} />
        {translateText("Kirim")} {formatMoney(finance.inAmount)}
      </span>
      <span>
        <LiveIcon icon={ArrowDownRight} motion="trend-down-soft" active={finance.outAmount > 0} />
        {translateText("Chiqim")} {formatMoney(finance.outAmount)}
      </span>
      <strong>{translateText("Sof oqim")} {formatMoney(finance.netCashflow)}</strong>
    </button>
  </Card>
);

const WarehousePanel = ({ warehouse, onClick }) => (
  <Card padding="md" className="dashboard-page__panel">
    <PanelHeader
      icon={<Package size={18} />}
      title="Ombor signallari"
      meta={`${warehouse.lowStockCount} ${translateText("kam")}, ${warehouse.outOfStockCount} ${translateText("tugagan")}`}
      actionLabel="Ombor"
      onClick={onClick}
    />

    {warehouse.criticalItems.length ? (
      <div className="dashboard-page__list">
        {warehouse.criticalItems.map((item) => (
          <button key={item.id} type="button" className="dashboard-page__list-row" onClick={onClick}>
            <span className="dashboard-page__row-icon">
              <LiveIcon
                icon={item.status === "OUT_OF_STOCK" ? PackageX : AlertTriangle}
                motion={item.status === "OUT_OF_STOCK" ? "danger-breathe" : "warning-glow"}
              />
            </span>
            <span>
              <strong>{item.productName || translateText("Mahsulot")}</strong>
              <small>
                {translateText("Qoldiq")}: {formatNumber(item.currentStock)} · {translateText("Min")}: {formatNumber(item.minimumStock)}
              </small>
            </span>
            <Badge variant={item.status === "OUT_OF_STOCK" ? "danger" : "warning"} size="sm">
              {translateText(item.statusLabel)}
            </Badge>
          </button>
        ))}
      </div>
    ) : (
      <EmptyState title="Muammo aniqlanmadi" description="Qoldig'i kam yoki tugagan mahsulot yo'q." />
    )}
  </Card>
);

const ManufacturingPanel = ({ manufacturing, periodLabel, onClick, onOrder }) => (
  <Card padding="md" className="dashboard-page__panel">
    <PanelHeader
      icon={<Factory size={18} />}
      title="Ishlab chiqarish"
      meta={`${manufacturing.inProgressCount} ${translateText("jarayonda")} · ${manufacturing.plannedCount} ${translateText("reja")}`}
      actionLabel="Modul"
      onClick={onClick}
    />

    <div className="dashboard-page__mini-stats">
      <Signal label="Jarayonda" value={manufacturing.inProgressCount} icon={Factory} motion="spin-slow" />
      <Signal label="Reja" value={manufacturing.plannedCount} icon={Clock} motion="pulse-soft" />
      <Signal label="Material yetishmaydi" value={manufacturing.shortageCount} icon={AlertTriangle} motion="warning-glow" />
      <Signal label={`${periodLabel} tugadi`} value={manufacturing.completedTodayCount} icon={CheckCircle} motion="success-pop" />
    </div>

    {manufacturing.currentOrders.length ? (
      <div className="dashboard-page__list dashboard-page__list--compact">
        {manufacturing.currentOrders.map((order) => (
          <button
            key={order.id}
            type="button"
            className="dashboard-page__list-row"
            onClick={() => onOrder(order)}
          >
            <span>
              <strong>{order.number || order.id}</strong>
              <small>
                {order.productName || translateText("Mahsulot")} · {formatNumber(order.plannedQuantity)}{" "}
                {translateText(order.outputUnit || "dona")}
              </small>
              {order.currentStageName && <small>{order.currentStageName}</small>}
            </span>
            <Badge variant={statusVariant(order.status)} size="sm">
              {statusLabel(order.status)}
            </Badge>
          </button>
        ))}
      </div>
    ) : (
      <EmptyState title="Jarayondagi buyurtma yo'q" description="Reja yoki faol buyurtma topilmadi." />
    )}
  </Card>
);

const PurchasesPanel = ({ purchases, onClick, onPurchase }) => (
  <Card padding="md" className="dashboard-page__panel">
    <PanelHeader
      icon={<Truck size={18} />}
      title="Xaridlar"
      meta={`${purchases.lateCount} ${translateText("kechikkan")} · ${purchases.orderedCount} ${translateText("kutilmoqda")}`}
      actionLabel="Xaridlar"
      onClick={onClick}
    />

    <div className="dashboard-page__mini-stats">
      <Signal label="Kechikkan" value={purchases.lateCount} icon={AlertTriangle} motion="warning-glow" />
      <Signal label="Bugun keladi" value={purchases.expectedTodayCount} icon={Clock} motion="pulse-soft" />
      <Signal label="Buyurtmada" value={purchases.orderedCount} icon={Truck} motion="pulse-soft" />
    </div>

    {purchases.important.length ? (
      <div className="dashboard-page__list dashboard-page__list--compact">
        {purchases.important.map((purchase) => (
          <button
            key={purchase.id}
            type="button"
            className="dashboard-page__list-row"
            onClick={() => onPurchase(purchase)}
          >
            <span>
              <strong>{purchase.number || purchase.id}</strong>
              <small>{purchase.supplierName || translateText("Yetkazib beruvchi")} · {formatMoney(purchase.total)}</small>
            </span>
            <Badge variant={statusVariant(purchase.signal)} size="sm">
              {purchase.signal === "late"
                ? translateText("Kechikkan")
                : purchase.signal === "today"
                  ? translateText("Bugun")
                  : statusLabel(purchase.status)}
            </Badge>
          </button>
        ))}
      </div>
    ) : (
      <EmptyState title="Muhim xarid signali yo'q" description="Kechikkan yoki bugun keladigan xarid topilmadi." />
    )}
  </Card>
);

const AgentPanel = ({ agents, onClick }) => (
  <Card padding="md" className="dashboard-page__panel">
    <PanelHeader
      icon={<Users size={18} />}
      title="Agentlar"
      meta="Top 3 natija"
      actionLabel="Agentlar"
      onClick={onClick}
    />

    {agents.length ? (
      <div className="dashboard-page__agent-list">
        {agents.map((agent) => {
          const percent = Math.min(Math.max(agent.targetPercent, 0), 100);

          return (
            <button key={agent.agentId} type="button" className="dashboard-page__agent" onClick={onClick}>
              <span>
                <strong>{agent.name}</strong>
                <small>
                  {formatMoney(agent.salesAmount)} · {formatNumber(agent.ordersCount)} {translateText("buyurtma")}
                </small>
              </span>
              <span className="dashboard-page__progress" aria-label={`${formatNumber(agent.targetPercent)}%`}>
                <span style={{ width: `${percent}%` }} />
              </span>
              <Badge variant={agent.targetPercent >= 100 ? "success" : "primary"} size="sm">
                {formatNumber(agent.targetPercent)}%
              </Badge>
            </button>
          );
        })}
      </div>
    ) : (
      <EmptyState title="Agent savdosi yo'q" description="Tanlangan davrda agentga bog'langan savdo topilmadi." />
    )}
  </Card>
);

const SignalsPanel = ({ debts, crm, hr, onCustomers, onHr, onDebts }) => (
  <Card padding="md" className="dashboard-page__panel">
    <PanelHeader
      icon={<Activity size={18} />}
      title="CRM / HR signallar"
      meta="Xavf, keyingi aloqa va davomat"
      actionLabel="Qarzlar"
      onClick={onDebts}
    />

    <div className="dashboard-page__signals">
      <button type="button" onClick={onCustomers}>
        <LiveIcon icon={Clock} motion="warning-glow" active={crm.overdueFollowUpCount > 0} />
        <span>{translateText("Muddati o'tgan aloqa")}</span>
        <strong>{formatNumber(crm.overdueFollowUpCount)}</strong>
      </button>
      <button type="button" onClick={onCustomers}>
        <Users size={18} />
        <span>{translateText("Xavf guruhidagi mijozlar")}</span>
        <strong>{formatNumber(crm.riskyCustomerCount || debts.riskyCustomerCount)}</strong>
      </button>
      <button type="button" onClick={onCustomers}>
        <UserPlus size={18} />
        <span>{translateText("Yangi mijozlar")}</span>
        <strong>{formatNumber(crm.newCustomerCount)}</strong>
      </button>
      <button type="button" onClick={onHr}>
        <CheckCircle size={18} />
        <span>{translateText("Bugun ishda")}</span>
        <strong>{formatNumber(hr.present)}</strong>
      </button>
      <button type="button" onClick={onHr}>
        <LiveIcon icon={AlertTriangle} motion="warning-glow" active={hr.late > 0} />
        <span>{translateText("Kechikkan")}</span>
        <strong>{formatNumber(hr.late)}</strong>
      </button>
      <button type="button" onClick={onHr}>
        <Receipt size={18} />
        <span>{translateText("Ish haqi qarzi")}</span>
        <strong>{formatNumber(hr.unpaidPayrollCount)}</strong>
      </button>
    </div>
  </Card>
);

const RecentActivityPanel = ({ items, onOpen }) => (
  <Card padding="md" className="dashboard-page__panel dashboard-page__recent">
    <PanelHeader
      icon={<Activity size={18} />}
      title="So'nggi harakatlar"
      meta="Savdo, moliya, xarid, ishlab chiqarish va ombor"
    />

    {items.length ? (
      <div className="dashboard-page__activity">
        {items.map((item) => {
          const icon = activityIcon[item.source] || { icon: Activity, motion: "pulse-soft" };

          return (
            <button
              key={item.id}
              type="button"
              className="dashboard-page__activity-row"
              onClick={() => onOpen(item.path)}
            >
              <span className="dashboard-page__row-icon">
                <LiveIcon icon={icon.icon} motion={icon.motion} />
              </span>
              <span>
                <strong>{translateText(item.title)}</strong>
                <small>{translateText(item.info || "-")}</small>
              </span>
              <span className="dashboard-page__activity-meta">
                <strong>
                  {item.unit
                    ? `${formatNumber(item.amount)} ${translateText(item.unit)}`
                    : formatMoney(item.amount)}
                </strong>
                <small>{formatDateTime(item.date)}</small>
              </span>
            </button>
          );
        })}
      </div>
    ) : (
      <EmptyState title="Hali harakat yo'q" description="Tanlangan davrda faoliyat topilmadi." />
    )}
  </Card>
);

const SummaryItem = ({ label, value }) => (
  <div className="dashboard-page__summary-item">
    <span>{translateText(label)}</span>
    <strong>{value}</strong>
  </div>
);

const Signal = ({ label, value, icon, motion }) => (
  <div className="dashboard-page__signal">
    <LiveIcon icon={icon} motion={motion} active={Number(value) > 0} />
    <span>{translateText(label)}</span>
    <strong>{formatNumber(value)}</strong>
  </div>
);

export default DashboardPage;
