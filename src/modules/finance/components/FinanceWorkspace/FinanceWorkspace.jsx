import { useEffect, useMemo, useState } from "react";
import { NavLink } from "react-router-dom";

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
  Select,
  Table,
  Textarea,
} from "../../../../shared/ui";

import { getStoredAgents } from "../../../agents/utils/agentsStorage";
import { getStoredCustomers } from "../../../customers/utils/customersStorage";
import { getStoredPurchases } from "../../../purchases/utils/purchasesStorage";
import { getStoredSuppliers } from "../../../suppliers/utils/suppliersStorage";

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
  { to: "/finance", label: "Overview", end: true },
  { to: "/finance/cashflow", label: "Cashflow" },
  { to: "/finance/payments", label: "Payments" },
  { to: "/finance/expenses", label: "Expenses" },
  { to: "/finance/debts", label: "Debts" },
  { to: "/finance/cashboxes", label: "Cashbox" },
  { to: "/finance/agents", label: "Agents" },
];

const PAYMENT_OPTIONS = [
  { value: "", label: "Barcha methodlar" },
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
  const [refreshKey, setRefreshKey] = useState(0);
  const [period, setPeriod] = useState("month");
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
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState("");

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
    { value: "", label: "Supplier tanlang" },
    ...reference.suppliers.map((supplier) => makeOption(supplier, "Supplier")),
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

  const openModal = (name, seed = {}) => {
    setForm({ ...initialForm(), ...seed });
    setError("");
    setModal(name);
  };

  const closeModal = () => {
    setModal(null);
    setError("");
  };

  const updateForm = (field) => (event) => {
    setForm((current) => ({ ...current, [field]: event.target.value }));
  };

  const submitModal = () => {
    try {
      if (modal === "customer-payment") {
        addCustomerPayment(form);
      } else if (modal === "supplier-payment") {
        addSupplierPayment(form);
      } else if (modal === "expense") {
        addExpense(form);
      } else if (modal === "cash-movement") {
        addCashMovement(form);
      } else if (modal === "cash-transfer") {
        addCashTransfer(form);
      } else if (modal === "agent-collection") {
        addAgentCollection(form);
      } else if (modal === "agent-handover") {
        addAgentHandover(form);
      }

      closeModal();
      setRefreshKey((current) => current + 1);
    } catch (submitError) {
      setError(submitError.message || "Operatsiyani saqlab bo'lmadi.");
    }
  };

  return (
    <PageContainer
      title="Moliya"
      description="Sales, Purchases, Customers, Suppliers va Agents bilan real integratsiyadagi Finance MVP."
    >
      <div className="finance-workspace">
        <nav className="finance-workspace__nav" aria-label="Finance navigation">
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
          updateForm={updateForm}
          customerOptions={customerOptions}
          supplierOptions={supplierOptions}
          agentOptions={agentOptions}
          cashboxOptions={cashboxOptions}
          selectedSupplierPurchases={selectedSupplierPurchases}
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
      Supplierga to'lash
    </Button>
    <Button variant="secondary" leftIcon={<ReceiptText size={16} />} onClick={() => openModal("expense")}>
      Xarajat
    </Button>
    <Button variant="secondary" leftIcon={<Wallet size={16} />} onClick={() => openModal("agent-collection")}>
      Agent collection
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
      <Kpi icon={<Landmark size={20} />} label="Supplierlarga qarz" value={summary.supplierDebt} variant="warning" />
      <Kpi icon={<LiveIcon icon={HandCoins} motion="warning-glow" active={summary.agentBalance > 0} size={20} />} label="Agentlardagi pul" value={summary.agentBalance} variant="warning" />
      <Kpi icon={<Banknote size={20} />} label="Bugungi kirim" value={summary.todayIncome} />
      <Kpi icon={<CreditCard size={20} />} label="Bugungi chiqim" value={summary.todayExpense} variant="danger" />
    </section>

    <section className="finance-workspace__dashboard-grid">
      <FinancePanel title="Recent transactions">
        <TransactionTable rows={summary.recentTransactions} compact />
      </FinancePanel>

      <FinancePanel title="Biggest expenses">
        <MiniBars rows={summary.biggestExpenses} valueKey="amount" emptyText="Xarajatlar yo'q." />
      </FinancePanel>

      <FinancePanel title="Biggest debts">
        <MiniBars
          rows={[...summary.biggestCustomerDebts, ...summary.biggestSupplierDebts].slice(0, 6)}
          labelKey={(row) => row.customerName || row.supplierName}
          valueKey="debt"
          emptyText="Qarzlar yo'q."
        />
      </FinancePanel>

      <FinancePanel title="Agent balances">
        <MiniBars rows={summary.agentWarnings} labelKey="agentName" valueKey="balance" emptyText="Agentlarda pul yo'q." />
      </FinancePanel>

      <FinancePanel title="Payment methods">
        <MiniBars rows={report.paymentMethods} labelKey={(row) => getPaymentMethodLabel(row.name)} valueKey="amount" emptyText="Payment mavjud emas." />
      </FinancePanel>

      <FinancePanel title="Tezkor amallar">
        <div className="finance-workspace__action-grid">
          <Button onClick={() => openModal("cash-movement")} leftIcon={<Plus size={16} />}>Cash In/Out</Button>
          <Button variant="secondary" onClick={() => openModal("cash-transfer")} leftIcon={<RotateCw size={16} />}>Transfer</Button>
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
  <FinancePanel title="Cashflow / Pul oqimi">
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
      title="Payments / To'lovlar"
      action={<Button leftIcon={<Plus size={16} />} onClick={() => openModal("customer-payment")}>To'lov qo'shish</Button>}
    >
      <div className="finance-workspace__simple-filter">
        <Search size={16} />
        <input
          value={filters.search}
          onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))}
          placeholder="Payment, source yoki counterparty qidirish..."
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
      title="Expenses / Xarajatlar"
      action={<Button leftIcon={<Plus size={16} />} onClick={() => openModal("expense")}>Xarajat qo'shish</Button>}
    >
      <TransactionTable rows={rows} />
    </FinancePanel>
  );
};

const DebtsView = ({ customerDebts, supplierDebts, openModal }) => {
  const [tab, setTab] = useState("customers");

  return (
    <FinancePanel title="Debts / Qarzlar">
      <div className="finance-workspace__tabs">
        <button className={tab === "customers" ? "active" : ""} type="button" onClick={() => setTab("customers")}>
          Customers owe us
        </button>
        <button className={tab === "suppliers" ? "active" : ""} type="button" onClick={() => setTab("suppliers")}>
          We owe suppliers
        </button>
      </div>

      {tab === "customers" ? (
        <Table
          columns={[
            { key: "customerName", title: "Customer" },
            { key: "salesTotal", title: "Sales total", render: moneyCell },
            { key: "paid", title: "Paid", render: moneyCell },
            { key: "debt", title: "Debt", render: debtCell },
            { key: "lastPayment", title: "Last payment", render: (value) => (value ? formatFinanceDate(value.date) : "-") },
            {
              key: "actions",
              title: "Actions",
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
            { key: "supplierName", title: "Supplier" },
            { key: "purchasesTotal", title: "Purchases total", render: moneyCell },
            { key: "paid", title: "Paid", render: moneyCell },
            { key: "debt", title: "Debt", render: debtCell },
            { key: "lastPayment", title: "Last payment", render: (value) => (value ? formatFinanceDate(value.date) : "-") },
            {
              key: "actions",
              title: "Actions",
              render: (_, row) => (
                <Button size="sm" variant="secondary" onClick={() => openModal("supplier-payment", { supplierId: row.supplierId })}>
                  Supplierga to'lash
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
    title="Cashbox / Kassa"
    action={<Button leftIcon={<Plus size={16} />} onClick={() => openModal("cash-movement")}>Cash In/Out</Button>}
  >
    <div className="finance-workspace__cashboxes">
      {cashboxBalances.map((row) => (
        <Card key={row.cashboxId} variant="soft" padding="md" className="finance-workspace__cashbox">
          <strong>{row.cashbox?.name || row.cashboxId}</strong>
          <span>{row.cashbox?.type || "CASH"} / {row.cashbox?.currency || "UZS"}</span>
          <b>{formatFinanceMoney(row.balance)} so'm</b>
          <small>IN {formatFinanceMoney(row.inAmount)} / OUT {formatFinanceMoney(row.outAmount)}</small>
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
    title="Agent Collections"
    action={<Button leftIcon={<Plus size={16} />} onClick={() => openModal("agent-collection")}>Collection qo'shish</Button>}
  >
    <Table
      columns={[
        { key: "agentName", title: "Agent" },
        { key: "totalSales", title: "Sales", render: moneyCell },
        { key: "collected", title: "Collected", render: moneyCell },
        { key: "handedOver", title: "Handed Over", render: moneyCell },
        { key: "balance", title: "Balance", render: debtCell },
        { key: "commission", title: "Commission", render: moneyCell },
        {
          key: "actions",
          title: "Actions",
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
      label="Period"
      value={period}
      options={[
        { value: "today", label: "Bugun" },
        { value: "week", label: "Hafta" },
        { value: "month", label: "Oy" },
        { value: "year", label: "Yil" },
        { value: "custom", label: "Custom" },
        { value: "all", label: "Hammasi" },
      ]}
      onChange={(event) => setPeriod(event.target.value)}
    />
    {period === "custom" && (
      <>
        <DatePicker label="From" value={customFrom} onChange={(event) => setCustomFrom(event.target.value)} />
        <DatePicker label="To" value={customTo} onChange={(event) => setCustomTo(event.target.value)} />
      </>
    )}
    <Select label="Type" value={filters.type} options={[{ value: "", label: "IN/OUT" }, { value: "IN", label: "IN" }, { value: "OUT", label: "OUT" }]} onChange={(event) => setFilters((current) => ({ ...current, type: event.target.value }))} />
    <Select label="Category" value={filters.category} options={categoryOptions} onChange={(event) => setFilters((current) => ({ ...current, category: event.target.value }))} />
    <Select label="Method" value={filters.paymentMethod} options={PAYMENT_OPTIONS} onChange={(event) => setFilters((current) => ({ ...current, paymentMethod: event.target.value }))} />
    <Select label="Customer" value={filters.customerId} options={customerOptions} onChange={(event) => setFilters((current) => ({ ...current, customerId: event.target.value }))} />
    <Select label="Supplier" value={filters.supplierId} options={supplierOptions} onChange={(event) => setFilters((current) => ({ ...current, supplierId: event.target.value }))} />
    <Select label="Agent" value={filters.agentId} options={agentOptions} onChange={(event) => setFilters((current) => ({ ...current, agentId: event.target.value }))} />
    <Select label="Cashbox" value={filters.cashboxId} options={cashboxOptions} onChange={(event) => setFilters((current) => ({ ...current, cashboxId: event.target.value }))} />
    <Input label="Search" value={filters.search} onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))} />
  </div>
);

const TransactionTable = ({ rows, compact = false }) => (
  <Table
    columns={[
      { key: "date", title: "Date", render: formatFinanceDate },
      {
        key: "type",
        title: "Type",
        render: (value) => (
          <Badge variant={value === "IN" ? "success" : "danger"}>{value}</Badge>
        ),
      },
      { key: "category", title: "Category" },
      { key: "source", title: "Source" },
      { key: "counterparty", title: "Counterparty" },
      { key: "paymentMethod", title: "Method", render: getPaymentMethodLabel },
      { key: "amount", title: "Amount", render: moneyCell },
      ...(!compact ? [{ key: "cashboxName", title: "Cashbox" }] : []),
      ...(!compact ? [{ key: "note", title: "Note", render: (value) => value || "-" }] : []),
    ]}
    data={rows}
    rowKey="id"
    emptyText="Transaction mavjud emas."
  />
);

const FinanceModal = ({
  modal,
  form,
  error,
  closeModal,
  submitModal,
  updateForm,
  customerOptions,
  supplierOptions,
  agentOptions,
  cashboxOptions,
  selectedSupplierPurchases,
}) => {
  const titleMap = {
    "customer-payment": "Mijoz to'lovi",
    "supplier-payment": "Supplier payment",
    expense: "Xarajat",
    "cash-movement": "Cash In/Out",
    "cash-transfer": "Cash transfer",
    "agent-collection": "Agent collection",
    "agent-handover": "Agent handover",
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
          <Button onClick={submitModal}>Saqlash</Button>
        </>
      )}
    >
      {error && <div className="finance-workspace__error">{error}</div>}
      <div className="finance-workspace__form">
        {modal === "customer-payment" && <Select label="Mijoz" value={form.customerId} options={customerOptions} onChange={updateForm("customerId")} />}
        {modal === "supplier-payment" && (
          <>
            <Select label="Supplier" value={form.supplierId} options={supplierOptions} onChange={updateForm("supplierId")} />
            <Select
              label="Purchase optional"
              value={form.purchaseId}
              options={[{ value: "", label: "Umumiy payment" }, ...selectedSupplierPurchases.map((purchase) => ({ value: purchase.id, label: purchase.number || purchase.id }))]}
              onChange={updateForm("purchaseId")}
            />
          </>
        )}
        {["agent-collection", "agent-handover"].includes(modal) && <Select label="Agent" value={form.agentId} options={agentOptions} onChange={updateForm("agentId")} />}
        {modal === "agent-collection" && <Select label="Mijoz optional" value={form.customerId} options={customerOptions} onChange={updateForm("customerId")} />}
        {modal === "expense" && <Select label="Kategoriya" value={form.category} options={EXPENSE_CATEGORIES.map((category) => ({ value: category, label: category }))} onChange={updateForm("category")} />}
        {modal === "cash-movement" && <Select label="Type" value={form.type} options={[{ value: "IN", label: "Cash In" }, { value: "OUT", label: "Cash Out" }]} onChange={updateForm("type")} />}
        {modal === "cash-transfer" ? (
          <>
            <Select label="From" value={form.fromCashboxId} options={cashboxOptions} onChange={updateForm("fromCashboxId")} />
            <Select label="To" value={form.toCashboxId} options={cashboxOptions} onChange={updateForm("toCashboxId")} />
          </>
        ) : modal !== "agent-collection" ? (
          <Select label="Kassa" value={form.cashboxId} options={cashboxOptions} onChange={updateForm("cashboxId")} />
        ) : null}
        <Input label="Summa" type="number" min="0" value={form.amount} onChange={updateForm("amount")} />
        {modal !== "cash-transfer" && <Select label="Payment method" value={form.paymentMethod} options={PAYMENT_OPTIONS.filter((option) => option.value)} onChange={updateForm("paymentMethod")} />}
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
      <strong>{formatFinanceMoney(value)} so'm</strong>
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
            <span><b>{label || "-"}</b><strong>{formatFinanceMoney(value)} so'm</strong></span>
            <div><i style={{ width: `${max > 0 ? (value / max) * 100 : 0}%` }} /></div>
          </div>
        );
      })}
    </div>
  );
};

const moneyCell = (value) => `${formatFinanceMoney(value)} so'm`;

const debtCell = (value) => {
  const amount = Number(value || 0);

  return amount > 0 ? (
    <Badge variant={amount > 1000000 ? "danger" : "warning"}>
      {formatFinanceMoney(amount)} so'm
    </Badge>
  ) : (
    <Badge variant="success">0 so'm</Badge>
  );
};

export default FinanceWorkspace;
