import { useEffect, useMemo, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";

import {
  ArrowDownCircle,
  ArrowUpCircle,
  Banknote,
  CreditCard,
  HandCoins,
  Landmark,
  Plus,
  ReceiptText,
  RotateCw,
  Search,
  TrendingDown,
  TrendingUp,
  Wallet,
  WalletCards,
} from "lucide-react";

import PageContainer from "../../../../components/PageContainer/PageContainer";
import {
  Badge,
  Button,
  Card,
  DatePicker,
  EmptyState,
  Input,
  LiveIcon,
  Modal,
  CreatableSelect,
  Select,
  Table,
  Textarea,
} from "../../../../shared/ui";
import { focusFirstInvalidField } from "../../../../shared/utils/formFocus";

import { createAgent, getStoredAgents } from "../../../agents/utils/agentsStorage";
import { createCustomer, getStoredCustomers } from "../../../customers/utils/customersStorage";
import { getStoredPurchases } from "../../../purchases/utils/purchasesStorage";
import { createSupplier, getStoredSuppliers } from "../../../suppliers/utils/suppliersStorage";
import useConfiguredColumns from "../../../settings/hooks/useConfiguredColumns";
import {
  useDefaultSettings,
  useFinanceSettings,
} from "../../../settings/selectors/settingsSelectors";

import {
  addAgentCollection,
  addAgentHandover,
  addCashMovement,
  addCashTransfer,
  addCustomerPayment,
  addExpense,
  addSupplierPayment,
} from "../../utils/financeActions";
import {
  EXPENSE_CATEGORIES,
  PAYMENT_METHODS,
  getStoredCashboxes,
} from "../../utils/financeStorage";
import {
  buildFinanceReport,
  formatFinanceDate,
  formatFinanceMoney,
  getAgentBalances,
  getCashboxBalances,
  getCustomerDebts,
  getFinanceSummary,
  getFinanceTransactions,
  getPaymentMethodLabel,
  getSupplierDebts,
} from "../../utils/financeSelectors";

import "./FinanceWorkspace.scss";

const NAV_ITEMS = [
  { to: "/finance", label: "Umumiy", end: true },
  { to: "/finance/cashflow", label: "Pul oqimi" },
  { to: "/finance/payments", label: "To'lovlar" },
  { to: "/finance/expenses", label: "Xarajatlar" },
  { to: "/finance/debts", label: "Qarzlar" },
  { to: "/finance/cashboxes", label: "Kassa" },
  { to: "/finance/agents", label: "Agentlar" },
];

const PAYMENT_OPTIONS = [
  { value: "", label: "Barcha to'lov turlari" },
  ...PAYMENT_METHODS.map((method) => ({
    value: method,
    label: getPaymentMethodLabel(method),
  })),
];

const todayIso = () => new Date().toISOString().slice(0, 10);

const getPeriodRange = (period, customFrom, customTo) => {
  const now = new Date();
  const end = todayIso();
  const start = new Date(now);

  if (period === "today") {
    return { from: end, to: end };
  }

  if (period === "week") {
    start.setDate(now.getDate() - 6);
  } else if (period === "month") {
    start.setMonth(now.getMonth() - 1);
  } else if (period === "year") {
    start.setFullYear(now.getFullYear() - 1);
  } else if (period === "custom") {
    return { from: customFrom, to: customTo };
  } else {
    return { from: "", to: "" };
  }

  return { from: start.toISOString().slice(0, 10), to: end };
};

const makeOption = (item, fallback) => ({
  value: item.id,
  label: item.name || item.companyName || item.phone || fallback || item.id,
});

const initialForm = () => ({
  amount: "",
  paymentMethod: "CASH",
  cashboxId: "cashbox-main",
  date: todayIso(),
  note: "",
  customerId: "",
  supplierId: "",
  agentId: "",
  saleId: "",
  purchaseId: "",
  category: "Transport",
  responsiblePerson: "",
  fromCashboxId: "cashbox-main",
  toCashboxId: "cashbox-bank-card",
  type: "IN",
});

const FinanceWorkspace = ({ view = "overview" }) => {
  const location = useLocation();
  const defaults = useDefaultSettings();
  const financeSettings = useFinanceSettings();
  const [refreshKey, setRefreshKey] = useState(0);
  const [period, setPeriod] = useState(financeSettings.defaultFinancePeriod || "month");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [filters, setFilters] = useState({
    search: "",
    type: "",
    category: "",
    paymentMethod: "",
    customerId: "",
    supplierId: "",
    agentId: "",
    cashboxId: "",
  });
  const [modal, setModal] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState("");
  const [modalErrors, setModalErrors] = useState({});

  useEffect(() => {
    const refresh = () => setRefreshKey((current) => current + 1);

    window.addEventListener("finance:changed", refresh);
    window.addEventListener("sales:changed", refresh);
    window.addEventListener("storage", refresh);

    return () => {
      window.removeEventListener("finance:changed", refresh);
      window.removeEventListener("sales:changed", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  const reference = useMemo(
    () => ({
      customers: getStoredCustomers(),
      suppliers: getStoredSuppliers(),
      agents: getStoredAgents(),
      cashboxes: getStoredCashboxes(),
      purchases: getStoredPurchases(),
      customerDebts: getCustomerDebts(),
      supplierDebts: getSupplierDebts(),
      agentBalances: getAgentBalances(),
      cashboxBalances: getCashboxBalances(),
    }),
    [refreshKey],
  );

  const periodRange = getPeriodRange(period, customFrom, customTo);
  const activeFilters = { ...filters, ...periodRange };

  const data = useMemo(
    () => ({
      summary: getFinanceSummary(activeFilters),
      transactions: getFinanceTransactions(activeFilters),
      report: buildFinanceReport(activeFilters),
    }),
    [activeFilters, refreshKey],
  );

  const categoryOptions = useMemo(() => {
    const categories = new Set(
      getFinanceTransactions().map((transaction) => transaction.category).filter(Boolean),
    );

    EXPENSE_CATEGORIES.forEach((category) => categories.add(category));

    return [
      { value: "", label: "Barcha kategoriyalar" },
      ...[...categories].sort().map((category) => ({ value: category, label: category })),
    ];
  }, [refreshKey]);

  const customerOptions = [
    { value: "", label: "Mijoz tanlang" },
    ...reference.customers.map((customer) => makeOption(customer, "Mijoz")),
  ];
  const supplierOptions = [
    { value: "", label: "Yetkazib beruvchi tanlang" },
    ...reference.suppliers.map((supplier) => makeOption(supplier, "Yetkazib beruvchi")),
  ];
  const agentOptions = [
    { value: "", label: "Agent tanlang" },
    ...reference.agents.map((agent) => makeOption(agent, "Agent")),
  ];
  const cashboxOptions = [
    { value: "", label: "Kassa tanlang" },
    ...reference.cashboxes.filter((cashbox) => cashbox.active).map((cashbox) => makeOption(cashbox, "Kassa")),
  ];
  const selectedSupplierPurchases = reference.purchases.filter(
    (purchase) => purchase.supplierId === form.supplierId && purchase.status !== "CANCELLED",
  );
  const requestedModal = useMemo(
    () => new URLSearchParams(location.search).get("modal"),
    [location.search],
  );

  const createFinanceCustomer = async (name) => {
    const created = await createCustomer({ name, fullName: name, status: "ACTIVE" });
    setRefreshKey((current) => current + 1);
    return created;
  };

  const createFinanceSupplier = async (name) => {
    const created = await createSupplier({ name, status: "ACTIVE" });
    setRefreshKey((current) => current + 1);
    return created;
  };

  const createFinanceAgent = async (name) => {
    const created = await createAgent({ name, status: "ACTIVE" });
    setRefreshKey((current) => current + 1);
    return created;
  };

  const openModal = (name, seed = {}) => {
    setForm({
      ...initialForm(),
      paymentMethod:
        financeSettings.defaultPaymentMethod ||
        defaults.paymentMethod ||
        "CASH",
      cashboxId:
        financeSettings.defaultCashboxId ||
        defaults.cashboxId ||
        "cashbox-main",
      fromCashboxId:
        financeSettings.defaultCashboxId ||
        defaults.cashboxId ||
        "cashbox-main",
      ...seed,
    });
    setError("");
    setModalErrors({});
    setIsSubmitting(false);
    setModal(name);
  };

  const closeModal = () => {
    setModal(null);
    setError("");
    setModalErrors({});
    setIsSubmitting(false);
  };

  useEffect(() => {
    if (requestedModal === "expense") {
      openModal("expense");
    }
  }, [requestedModal]);

  const updateForm = (field) => (event) => {
    setForm((current) => ({ ...current, [field]: event.target.value }));
    setModalErrors((current) => ({ ...current, [field]: "" }));
  };

  const submitModal = async () => {
    if (isSubmitting) {
      return;
    }

    const nextErrors = {};
    if (!Number(form.amount || 0) || Number(form.amount) < 0) {
      nextErrors.amount = "Summani kiriting.";
    }
    if (modal === "customer-payment" && !form.customerId) nextErrors.customerId = "Mijozni tanlang.";
    if (modal === "supplier-payment" && !form.supplierId) nextErrors.supplierId = "Yetkazib beruvchini tanlang.";
    if (["agent-collection", "agent-handover"].includes(modal) && !form.agentId) nextErrors.agentId = "Agentni tanlang.";
    if (modal === "cash-transfer" && !form.fromCashboxId) nextErrors.fromCashboxId = "Manba kassani tanlang.";
    if (modal === "cash-transfer" && !form.toCashboxId) nextErrors.toCashboxId = "Qabul qiluvchi kassani tanlang.";
    setModalErrors(nextErrors);
    if (Object.keys(nextErrors).length) {
      focusFirstInvalidField();
      return;
    }

    setIsSubmitting(true);
    try {
      if (modal === "customer-payment") {
        await addCustomerPayment(form);
      } else if (modal === "supplier-payment") {
        await addSupplierPayment(form);
      } else if (modal === "expense") {
        await addExpense(form);
      } else if (modal === "cash-movement") {
        await addCashMovement(form);
      } else if (modal === "cash-transfer") {
        await addCashTransfer(form);
      } else if (modal === "agent-collection") {
        await addAgentCollection(form);
      } else if (modal === "agent-handover") {
        await addAgentHandover(form);
      }

      closeModal();
      setRefreshKey((current) => current + 1);
    } catch (submitError) {
      setError(submitError.message || "Operatsiyani saqlab bo'lmadi.");
      setIsSubmitting(false);
    }
  };

  return (
    <PageContainer
      title="Moliya"
      description="Savdo, xarid, mijoz, yetkazib beruvchi va agentlar bilan real integratsiyadagi moliya moduli."
    >
      <div className="finance-workspace">
        <nav className="finance-workspace__nav" aria-label="Moliya navigatsiyasi">
          {NAV_ITEMS.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end}>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <FinanceQuickActions openModal={openModal} />

        {view === "overview" && (
          <OverviewView
            summary={data.summary}
            report={data.report}
            openModal={openModal}
          />
        )}

        {view === "cashflow" && (
          <CashflowView
            transactions={data.transactions}
            filters={filters}
            setFilters={setFilters}
            period={period}
            setPeriod={setPeriod}
            customFrom={customFrom}
            setCustomFrom={setCustomFrom}
            customTo={customTo}
            setCustomTo={setCustomTo}
            categoryOptions={categoryOptions}
            customerOptions={customerOptions}
            supplierOptions={supplierOptions}
            agentOptions={agentOptions}
            cashboxOptions={cashboxOptions}
          />
        )}

        {view === "payments" && (
          <PaymentsView
            transactions={data.transactions}
            filters={filters}
            setFilters={setFilters}
            openModal={openModal}
          />
        )}

        {view === "expenses" && (
          <ExpensesView transactions={data.transactions} openModal={openModal} />
        )}

        {view === "debts" && (
          <DebtsView
            customerDebts={reference.customerDebts}
            supplierDebts={reference.supplierDebts}
            openModal={openModal}
          />
        )}

        {view === "cashboxes" && (
          <CashboxesView
            cashboxBalances={reference.cashboxBalances}
            openModal={openModal}
          />
        )}

        {view === "agents" && (
          <AgentsView agentBalances={reference.agentBalances} openModal={openModal} />
        )}

      <FinanceModal
        modal={modal}
          form={form}
          error={error}
          closeModal={closeModal}
        submitModal={submitModal}
        isSubmitting={isSubmitting}
          updateForm={updateForm}
          customerOptions={customerOptions}
          supplierOptions={supplierOptions}
          agentOptions={agentOptions}
          cashboxOptions={cashboxOptions}
          selectedSupplierPurchases={selectedSupplierPurchases}
          modalErrors={modalErrors}
          onCreateCustomer={createFinanceCustomer}
          onCreateSupplier={createFinanceSupplier}
          onCreateAgent={createFinanceAgent}
        />
      </div>
    </PageContainer>
  );
};

const FinanceQuickActions = ({ openModal }) => (
  <div className="finance-workspace__quick-actions">
    <Button leftIcon={<Plus size={16} />} onClick={() => openModal("customer-payment")}>
      Mijoz to'lovi
    </Button>
    <Button variant="secondary" leftIcon={<HandCoins size={16} />} onClick={() => openModal("supplier-payment")}>
      Yetkazib beruvchiga to'lash
    </Button>
    <Button variant="secondary" leftIcon={<ReceiptText size={16} />} onClick={() => openModal("expense")}>
      Xarajat
    </Button>
    <Button variant="secondary" leftIcon={<Wallet size={16} />} onClick={() => openModal("agent-collection")}>
      Agentdan pul olish
    </Button>
  </div>
);

const OverviewView = ({ summary, report, openModal }) => (
  <>
    <section className="finance-workspace__kpis">
      <Kpi icon={<LiveIcon icon={ArrowUpCircle} motion="success-pop" once size={20} />} label="Jami kirim" value={summary.income} />
      <Kpi icon={<LiveIcon icon={ArrowDownCircle} motion="stock-out-soft" once size={20} />} label="Jami chiqim" value={summary.expense} variant="danger" />
      <Kpi icon={<TrendingUp size={20} />} label="Sof pul oqimi" value={summary.netCashflow} variant={summary.netCashflow >= 0 ? "success" : "danger"} />
      <Kpi icon={<WalletCards size={20} />} label="Kassadagi pul" value={summary.cashboxBalance} />
      <Kpi icon={<LiveIcon icon={Wallet} motion="warning-glow" active={summary.customerDebt > 0} size={20} />} label="Mijozlardan qarz" value={summary.customerDebt} variant="warning" />
      <Kpi icon={<Landmark size={20} />} label="Yetkazib beruvchilarga qarz" value={summary.supplierDebt} variant="warning" />
      <Kpi icon={<LiveIcon icon={HandCoins} motion="warning-glow" active={summary.agentBalance > 0} size={20} />} label="Agentlardagi pul" value={summary.agentBalance} variant="warning" />
      <Kpi icon={<Banknote size={20} />} label="Bugungi kirim" value={summary.todayIncome} />
      <Kpi icon={<CreditCard size={20} />} label="Bugungi chiqim" value={summary.todayExpense} variant="danger" />
    </section>

    <section className="finance-workspace__dashboard-grid">
      <FinancePanel title="Oxirgi operatsiyalar">
        <TransactionTable rows={summary.recentTransactions} compact />
      </FinancePanel>

      <FinancePanel title="Eng katta xarajatlar">
        <MiniBars rows={summary.biggestExpenses} valueKey="amount" emptyText="Xarajatlar yo'q." />
      </FinancePanel>

      <FinancePanel title="Eng katta qarzlar">
        <MiniBars
          rows={[...summary.biggestCustomerDebts, ...summary.biggestSupplierDebts].slice(0, 6)}
          labelKey={(row) => row.customerName || row.supplierName}
          valueKey="debt"
          emptyText="Qarzlar yo'q."
        />
      </FinancePanel>

      <FinancePanel title="Agentlardagi qoldiq">
        <MiniBars rows={summary.agentWarnings} labelKey="agentName" valueKey="balance" emptyText="Agentlarda pul yo'q." />
      </FinancePanel>

      <FinancePanel title="To'lov turlari">
        <MiniBars rows={report.paymentMethods} labelKey={(row) => getPaymentMethodLabel(row.name)} valueKey="amount" emptyText="To'lov mavjud emas." />
      </FinancePanel>

      <FinancePanel title="Tezkor amallar">
        <div className="finance-workspace__action-grid">
          <Button onClick={() => openModal("cash-movement")} leftIcon={<Plus size={16} />}>Kirim / chiqim</Button>
          <Button variant="secondary" onClick={() => openModal("cash-transfer")} leftIcon={<RotateCw size={16} />}>O'tkazma</Button>
          <Button variant="secondary" onClick={() => openModal("agent-handover")} leftIcon={<HandCoins size={16} />}>Agent topshirdi</Button>
        </div>
      </FinancePanel>
    </section>
  </>
);

const CashflowView = ({
  transactions,
  filters,
  setFilters,
  period,
  setPeriod,
  customFrom,
  setCustomFrom,
  customTo,
  setCustomTo,
  categoryOptions,
  customerOptions,
  supplierOptions,
  agentOptions,
  cashboxOptions,
}) => (
  <FinancePanel title="Pul oqimi">
    <Filters
      filters={filters}
      setFilters={setFilters}
      period={period}
      setPeriod={setPeriod}
      customFrom={customFrom}
      setCustomFrom={setCustomFrom}
      customTo={customTo}
      setCustomTo={setCustomTo}
      categoryOptions={categoryOptions}
      customerOptions={customerOptions}
      supplierOptions={supplierOptions}
      agentOptions={agentOptions}
      cashboxOptions={cashboxOptions}
    />
    <TransactionTable rows={transactions} />
  </FinancePanel>
);

const PaymentsView = ({ transactions, filters, setFilters, openModal }) => {
  const rows = transactions.filter((transaction) =>
    [
      "SALE_PAYMENT",
      "CUSTOMER_PAYMENT",
      "SUPPLIER_PAYMENT",
      "PURCHASE_PAYMENT",
      "AGENT_COLLECTION",
      "REFUND",
    ].includes(transaction.sourceType),
  );

  return (
    <FinancePanel
      title="To'lovlar"
      action={<Button leftIcon={<Plus size={16} />} onClick={() => openModal("customer-payment")}>To'lov qo'shish</Button>}
    >
      <div className="finance-workspace__simple-filter">
        <Search size={16} />
        <input
          value={filters.search}
          onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))}
          placeholder="To'lov, manba yoki kontragentni qidirish..."
        />
      </div>
      <TransactionTable rows={rows} />
    </FinancePanel>
  );
};

const ExpensesView = ({ transactions, openModal }) => {
  const rows = transactions.filter((transaction) => transaction.sourceType === "EXPENSE");

  return (
    <FinancePanel
      title="Xarajatlar"
      action={<Button leftIcon={<Plus size={16} />} onClick={() => openModal("expense")}>Xarajat qo'shish</Button>}
    >
      <TransactionTable rows={rows} />
    </FinancePanel>
  );
};

const DebtsView = ({ customerDebts, supplierDebts, openModal }) => {
  const [tab, setTab] = useState("customers");

  return (
    <FinancePanel title="Qarzlar">
      <div className="finance-workspace__tabs">
        <button className={tab === "customers" ? "active" : ""} type="button" onClick={() => setTab("customers")}>
          Mijozlar qarzi
        </button>
        <button className={tab === "suppliers" ? "active" : ""} type="button" onClick={() => setTab("suppliers")}>
          Yetkazib beruvchilarga qarz
        </button>
      </div>

      {tab === "customers" ? (
        <Table
          columns={[
            { key: "customerName", title: "Mijoz" },
            { key: "salesTotal", title: "Jami savdo", render: moneyCell },
            { key: "paid", title: "To'langan", render: moneyCell },
            { key: "debt", title: "Qarz", render: debtCell },
            { key: "lastPayment", title: "Oxirgi to'lov", render: (value) => (value ? formatFinanceDate(value.date) : "-") },
            {
              key: "actions",
              title: "Amallar",
              render: (_, row) => (
                <Button size="sm" variant="secondary" onClick={() => openModal("customer-payment", { customerId: row.customerId })}>
                  To'lov qabul qilish
                </Button>
              ),
            },
          ]}
          data={customerDebts}
          rowKey="customerId"
        />
      ) : (
        <Table
          columns={[
            { key: "supplierName", title: "Yetkazib beruvchi" },
            { key: "purchasesTotal", title: "Jami xarid", render: moneyCell },
            { key: "paid", title: "To'langan", render: moneyCell },
            { key: "debt", title: "Qarz", render: debtCell },
            { key: "lastPayment", title: "Oxirgi to'lov", render: (value) => (value ? formatFinanceDate(value.date) : "-") },
            {
              key: "actions",
              title: "Amallar",
              render: (_, row) => (
                <Button size="sm" variant="secondary" onClick={() => openModal("supplier-payment", { supplierId: row.supplierId })}>
                  Yetkazib beruvchiga to'lash
                </Button>
              ),
            },
          ]}
          data={supplierDebts}
          rowKey="supplierId"
        />
      )}
    </FinancePanel>
  );
};

const CashboxesView = ({ cashboxBalances, openModal }) => (
  <FinancePanel
    title="Kassa"
    action={<Button leftIcon={<Plus size={16} />} onClick={() => openModal("cash-movement")}>Kirim / chiqim</Button>}
  >
    <div className="finance-workspace__cashboxes">
      {cashboxBalances.map((row) => (
        <Card key={row.cashboxId} variant="soft" padding="md" className="finance-workspace__cashbox">
          <strong>{row.cashbox?.name || row.cashboxId}</strong>
          <span>{row.cashbox?.type || "CASH"} / {row.cashbox?.currency || "UZS"}</span>
          <b>{formatFinanceMoney(row.balance)}</b>
          <small>Kirim {formatFinanceMoney(row.inAmount)} / chiqim {formatFinanceMoney(row.outAmount)}</small>
        </Card>
      ))}
    </div>
    <Button variant="secondary" leftIcon={<RotateCw size={16} />} onClick={() => openModal("cash-transfer")}>
      Kassalar orasida transfer
    </Button>
  </FinancePanel>
);

const AgentsView = ({ agentBalances, openModal }) => (
  <FinancePanel
    title="Agentdan tushumlar"
    action={<Button leftIcon={<Plus size={16} />} onClick={() => openModal("agent-collection")}>Tushum qo'shish</Button>}
  >
    <Table
      columns={[
        { key: "agentName", title: "Agent" },
        { key: "totalSales", title: "Savdo", render: moneyCell },
        { key: "collected", title: "Yig'ilgan", render: moneyCell },
        { key: "handedOver", title: "Topshirilgan", render: moneyCell },
        { key: "balance", title: "Qoldiq", render: debtCell },
        { key: "commission", title: "Komissiya", render: moneyCell },
        {
          key: "actions",
          title: "Amallar",
          render: (_, row) => (
            <Button size="sm" variant="secondary" onClick={() => openModal("agent-handover", { agentId: row.agentId })}>
              Kassaga topshirish
            </Button>
          ),
        },
      ]}
      data={agentBalances}
      rowKey="agentId"
    />
  </FinancePanel>
);

const Filters = ({
  filters,
  setFilters,
  period,
  setPeriod,
  customFrom,
  setCustomFrom,
  customTo,
  setCustomTo,
  categoryOptions,
  customerOptions,
  supplierOptions,
  agentOptions,
  cashboxOptions,
}) => (
  <div className="finance-workspace__filters">
    <Select
      label="Davr"
      value={period}
      options={[
        { value: "today", label: "Bugun" },
        { value: "week", label: "Hafta" },
        { value: "month", label: "Oy" },
        { value: "year", label: "Yil" },
        { value: "custom", label: "Tanlangan davr" },
        { value: "all", label: "Hammasi" },
      ]}
      onChange={(event) => setPeriod(event.target.value)}
    />
    {period === "custom" && (
      <>
        <DatePicker label="Boshlanish" value={customFrom} onChange={(event) => setCustomFrom(event.target.value)} />
        <DatePicker label="Tugash" value={customTo} onChange={(event) => setCustomTo(event.target.value)} />
      </>
    )}
    <Select label="Turi" value={filters.type} options={[{ value: "", label: "Kirim/chiqim" }, { value: "IN", label: "Kirim" }, { value: "OUT", label: "Chiqim" }]} onChange={(event) => setFilters((current) => ({ ...current, type: event.target.value }))} />
    <Select label="Kategoriya" value={filters.category} options={categoryOptions} onChange={(event) => setFilters((current) => ({ ...current, category: event.target.value }))} />
    <Select label="To'lov turi" value={filters.paymentMethod} options={PAYMENT_OPTIONS} onChange={(event) => setFilters((current) => ({ ...current, paymentMethod: event.target.value }))} />
    <Select label="Mijoz" value={filters.customerId} options={customerOptions} onChange={(event) => setFilters((current) => ({ ...current, customerId: event.target.value }))} />
    <Select label="Yetkazib beruvchi" value={filters.supplierId} options={supplierOptions} onChange={(event) => setFilters((current) => ({ ...current, supplierId: event.target.value }))} />
    <Select label="Agent" value={filters.agentId} options={agentOptions} onChange={(event) => setFilters((current) => ({ ...current, agentId: event.target.value }))} />
    <Select label="Kassa" value={filters.cashboxId} options={cashboxOptions} onChange={(event) => setFilters((current) => ({ ...current, cashboxId: event.target.value }))} />
    <Input label="Qidirish" value={filters.search} onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))} />
  </div>
);

const TransactionTable = ({ rows, compact = false }) => {
  const columns = useConfiguredColumns("finance-transactions", [
      { key: "date", title: "Sana", render: formatFinanceDate },
      {
        key: "type",
        title: "Turi",
        render: (value) => (
          <Badge variant={value === "IN" ? "success" : "danger"}>{value}</Badge>
        ),
      },
      { key: "category", title: "Kategoriya" },
      { key: "source", title: "Manba" },
      { key: "counterparty", title: "Kontragent" },
      { key: "paymentMethod", title: "To'lov turi", render: getPaymentMethodLabel },
      { key: "amount", title: "Summa", render: moneyCell },
      ...(!compact ? [{ key: "cashboxName", title: "Kassa" }] : []),
      ...(!compact ? [{ key: "note", title: "Izoh", render: (value) => value || "-" }] : []),
    ]);

  return (
    <Table
      columns={columns}
      data={rows}
      rowKey="id"
      emptyText="Operatsiya mavjud emas."
    />
  );
};

const FinanceModal = ({
  modal,
  form,
  error,
  closeModal,
  submitModal,
  isSubmitting,
  updateForm,
  customerOptions,
  supplierOptions,
  agentOptions,
  cashboxOptions,
  selectedSupplierPurchases,
  modalErrors,
  onCreateCustomer,
  onCreateSupplier,
  onCreateAgent,
}) => {
  const titleMap = {
    "customer-payment": "Mijoz to'lovi",
    "supplier-payment": "Yetkazib beruvchiga to'lov",
    expense: "Xarajat",
    "cash-movement": "Kassa kirim/chiqimi",
    "cash-transfer": "Kassa o'tkazmasi",
    "agent-collection": "Agentdan tushum",
    "agent-handover": "Agent topshirimi",
  };

  return (
    <Modal
      open={Boolean(modal)}
      title={titleMap[modal]}
      description="Manfiy summa va ortiqcha to'lov avtomatik bloklanadi."
      onClose={closeModal}
      footer={(
        <>
          <Button variant="secondary" onClick={closeModal}>Bekor qilish</Button>
          <Button onClick={submitModal} disabled={isSubmitting}>Saqlash</Button>
        </>
      )}
    >
      {error && <div className="finance-workspace__error">{error}</div>}
      <div className="finance-workspace__form">
        {modal === "customer-payment" && <CreatableSelect label="Mijoz" value={form.customerId} error={modalErrors.customerId} options={customerOptions} onChange={updateForm("customerId")} onCreate={onCreateCustomer} />}
        {modal === "supplier-payment" && (
          <>
            <CreatableSelect label="Yetkazib beruvchi" value={form.supplierId} error={modalErrors.supplierId} options={supplierOptions} onChange={updateForm("supplierId")} onCreate={onCreateSupplier} />
            <Select
              label="Xarid ixtiyoriy"
              value={form.purchaseId}
              options={[{ value: "", label: "Umumiy to'lov" }, ...selectedSupplierPurchases.map((purchase) => ({ value: purchase.id, label: purchase.number || purchase.id }))]}
              onChange={updateForm("purchaseId")}
            />
          </>
        )}
        {["agent-collection", "agent-handover"].includes(modal) && <CreatableSelect label="Agent" value={form.agentId} error={modalErrors.agentId} options={agentOptions} onChange={updateForm("agentId")} onCreate={onCreateAgent} />}
        {modal === "agent-collection" && <Select label="Mijoz ixtiyoriy" value={form.customerId} options={customerOptions} onChange={updateForm("customerId")} />}
        {modal === "expense" && <Select label="Kategoriya" value={form.category} options={EXPENSE_CATEGORIES.map((category) => ({ value: category, label: category }))} onChange={updateForm("category")} />}
        {modal === "cash-movement" && <Select label="Turi" value={form.type} options={[{ value: "IN", label: "Kirim" }, { value: "OUT", label: "Chiqim" }]} onChange={updateForm("type")} />}
        {modal === "cash-transfer" ? (
          <>
            <Select label="Qaysi kassadan" value={form.fromCashboxId} error={modalErrors.fromCashboxId} options={cashboxOptions} onChange={updateForm("fromCashboxId")} />
            <Select label="Qaysi kassaga" value={form.toCashboxId} error={modalErrors.toCashboxId} options={cashboxOptions} onChange={updateForm("toCashboxId")} />
          </>
        ) : modal !== "agent-collection" ? (
          <Select label="Kassa" value={form.cashboxId} options={cashboxOptions} onChange={updateForm("cashboxId")} />
        ) : null}
        <Input label="Summa" type="number" min="0" error={modalErrors.amount} value={form.amount} onChange={updateForm("amount")} />
        {modal !== "cash-transfer" && <Select label="To'lov turi" value={form.paymentMethod} options={PAYMENT_OPTIONS.filter((option) => option.value)} onChange={updateForm("paymentMethod")} />}
        {modal === "expense" && <Input label="Mas'ul shaxs" value={form.responsiblePerson} onChange={updateForm("responsiblePerson")} />}
        <DatePicker label="Sana" value={form.date} onChange={updateForm("date")} />
        <Textarea label="Izoh" value={form.note} onChange={updateForm("note")} rows={3} />
      </div>
    </Modal>
  );
};

const Kpi = ({ icon, label, value, variant = "" }) => (
  <Card variant="soft" padding="md" className="finance-workspace__kpi">
    <div className={["finance-workspace__kpi-icon", variant ? `finance-workspace__kpi-icon--${variant}` : ""].filter(Boolean).join(" ")}>
      {icon}
    </div>
    <span>
      <small>{label}</small>
      <strong>{formatFinanceMoney(value)}</strong>
    </span>
  </Card>
);

const FinancePanel = ({ title, action, children }) => (
  <Card padding="lg" className="finance-workspace__panel">
    <div className="finance-workspace__panel-header">
      <h3>{title}</h3>
      {action}
    </div>
    {children}
  </Card>
);

const MiniBars = ({ rows, labelKey = "category", valueKey = "amount", emptyText }) => {
  const max = Math.max(...rows.map((row) => Number(row[valueKey] || 0)), 0);

  if (!rows.length) {
    return <EmptyState title={emptyText} />;
  }

  return (
    <div className="finance-workspace__mini-bars">
      {rows.map((row) => {
        const label = typeof labelKey === "function" ? labelKey(row) : row[labelKey];
        const value = Number(row[valueKey] || 0);

        return (
          <div key={row.id || row.customerId || row.supplierId || row.agentId || label} className="finance-workspace__mini-bar">
            <span><b>{label || "-"}</b><strong>{formatFinanceMoney(value)}</strong></span>
            <div><i style={{ width: `${max > 0 ? (value / max) * 100 : 0}%` }} /></div>
          </div>
        );
      })}
    </div>
  );
};

const moneyCell = (value) => formatFinanceMoney(value);

const debtCell = (value) => {
  const amount = Number(value || 0);

  return amount > 0 ? (
    <Badge variant={amount > 1000000 ? "danger" : "warning"}>
      {formatFinanceMoney(amount)}
    </Badge>
  ) : (
    <Badge variant="success">{formatFinanceMoney(0)}</Badge>
  );
};

export default FinanceWorkspace;
