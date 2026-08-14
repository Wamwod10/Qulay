import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";

import {
  AlertTriangle,
  ArrowLeft,
  BellPlus,
  CalendarClock,
  CircleDollarSign,
  HandCoins,
  Pencil,
  ReceiptText,
  Save,
  ShieldAlert,
  ShieldCheck,
  UserRound,
  Users,
  Wallet,
} from "lucide-react";

import PageContainer from "../../../../components/PageContainer/PageContainer";
import { Badge, Button, Card, Input, LiveIcon, Modal, Select, Table, Textarea } from "../../../../shared/ui";

import { getStoredAgents } from "../../../agents/utils/agentsStorage";
import { addCustomerPayment } from "../../../finance/utils/financeActions";
import {
  formatFinanceDate,
  formatFinanceMoney,
  getPaymentMethodLabel,
} from "../../../finance/utils/financeSelectors";
import {
  formatSaleDate,
  getPaymentStatusLabel,
  getPaymentStatusVariant,
  getSaleStatusLabel,
  getSaleStatusVariant,
} from "../../../sales/utils/salesHelpers";

import {
  buildCustomerAnalytics,
  getCustomerAgent,
  getCustomerDeleteSafety,
  getCustomerTimeline,
  isFollowUpOverdue,
  suggestCustomerSegment,
} from "../../utils/customerSelectors";
import {
  addCustomerFollowUp,
  deactivateCustomer,
  getCustomerById,
  getCustomerDisplayName,
  updateCustomer,
  updateCustomerFollowUp,
} from "../../utils/customersStorage";

import "./CustomerDetailsPage.scss";

const FOLLOW_UP_TYPES = [
  { value: "CALL", label: "CALL" },
  { value: "MEETING", label: "MEETING" },
  { value: "PAYMENT", label: "PAYMENT" },
  { value: "SALES", label: "SALES" },
  { value: "OTHER", label: "OTHER" },
];

const PAYMENT_METHODS = [
  { value: "CASH", label: "Naqd" },
  { value: "CARD", label: "Karta" },
  { value: "BANK", label: "Bank" },
  { value: "QR", label: "QR" },
];

const CustomerDetailsPage = () => {
  const navigate = useNavigate();
  const { customerId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const [version, setVersion] = useState(0);
  const [paymentOpen, setPaymentOpen] = useState(searchParams.get("pay") === "1");
  const [followUpOpen, setFollowUpOpen] = useState(false);
  const [agentOpen, setAgentOpen] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    amount: "",
    paymentMethod: "CASH",
    date: new Date().toISOString().slice(0, 10),
    note: "",
  });
  const [followUpForm, setFollowUpForm] = useState({
    type: "CALL",
    status: "OPEN",
    date: new Date(Date.now() + 86400000).toISOString().slice(0, 10),
    note: "",
  });
  const [selectedAgentId, setSelectedAgentId] = useState("");
  const [error, setError] = useState("");

  const customer = getCustomerById(customerId);
  const analytics = useMemo(() => buildCustomerAnalytics(customerId), [customerId, version]);
  const agent = useMemo(() => getCustomerAgent(customerId), [customerId, version]);
  const timeline = useMemo(() => getCustomerTimeline(customerId), [customerId, version]);
  const agents = useMemo(() => getStoredAgents(), [version]);
  const activeAgents = agents.filter((item) => item.status === "ACTIVE");
  const suggestedSegment = useMemo(() => suggestCustomerSegment(customerId), [customerId, version]);

  useEffect(() => {
    const refresh = () => setVersion((current) => current + 1);

    window.addEventListener("customers:changed", refresh);
    window.addEventListener("finance:changed", refresh);
    window.addEventListener("sales:changed", refresh);
    window.addEventListener("storage", refresh);

    return () => {
      window.removeEventListener("customers:changed", refresh);
      window.removeEventListener("finance:changed", refresh);
      window.removeEventListener("sales:changed", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  useEffect(() => {
    if (searchParams.get("pay") === "1") {
      setPaymentOpen(true);
      setSearchParams({}, { replace: true });
    }

    if (searchParams.get("follow") === "1") {
      setFollowUpOpen(true);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    setPaymentForm((current) => ({
      ...current,
      amount: analytics.debt > 0 ? String(analytics.debt) : current.amount,
    }));
  }, [analytics.debt]);

  useEffect(() => {
    setSelectedAgentId(customer?.agentId || "");
  }, [customer?.agentId]);

  if (!customer && !analytics.totalSales) {
    return (
      <PageContainer title="Mijoz topilmadi" description="Bu mijoz uchun ma'lumot mavjud emas.">
        <Button variant="secondary" onClick={() => navigate("/customers")}>
          Ortga
        </Button>
      </PageContainer>
    );
  }

  const displayName = getCustomerDisplayName(customer || analytics.customer);
  const deleteSafety = getCustomerDeleteSafety(customerId);
  const nextFollowUpOverdue = isFollowUpOverdue(analytics.nextFollowUp);

  const refresh = () => setVersion((current) => current + 1);

  const handlePayment = () => {
    setError("");

    try {
      addCustomerPayment({
        customerId,
        amount: Number(paymentForm.amount || 0),
        paymentMethod: paymentForm.paymentMethod,
        date: paymentForm.date,
        note: paymentForm.note || `Customer payment: ${displayName}`,
      });
      setPaymentOpen(false);
      refresh();
    } catch (caughtError) {
      setError(caughtError.message);
    }
  };

  const handleFollowUp = () => {
    if (!followUpForm.note.trim()) {
      setError("Follow-up note majburiy.");
      return;
    }

    addCustomerFollowUp({
      ...followUpForm,
      customerId,
    });
    setFollowUpOpen(false);
    setFollowUpForm({
      type: "CALL",
      status: "OPEN",
      date: new Date(Date.now() + 86400000).toISOString().slice(0, 10),
      note: "",
    });
    setError("");
    refresh();
  };

  const handleFollowUpStatus = (followUp, status) => {
    updateCustomerFollowUp({
      ...followUp,
      status,
    });
    refresh();
  };

  const handleAgentChange = () => {
    updateCustomer({
      ...customer,
      agentId: selectedAgentId || null,
    });
    setAgentOpen(false);
    refresh();
  };

  const handleDeactivate = () => {
    if (!customer) {
      return;
    }

    if (customer.status === "INACTIVE") {
      updateCustomer({
        ...customer,
        status: "ACTIVE",
      });
    } else {
      deactivateCustomer(customer.id);
    }
    refresh();
  };

  return (
    <PageContainer title={displayName} description={customer?.phone || "Customer CRM detail"}>
      <div className="customer-details">
        <div className="customer-details__toolbar">
          <Button variant="secondary" leftIcon={<ArrowLeft size={17} />} onClick={() => navigate("/customers")}>
            Ortga
          </Button>
          <div>
            <Button variant="secondary" leftIcon={<ReceiptText size={17} />} onClick={() => navigate(`/sales/terminal?customerId=${customerId}`)}>
              Yangi savdo
            </Button>
            <Button variant="secondary" leftIcon={<HandCoins size={17} />} disabled={analytics.debt <= 0} onClick={() => setPaymentOpen(true)}>
              To'lov qabul qilish
            </Button>
            <Button variant="secondary" leftIcon={<BellPlus size={17} />} onClick={() => setFollowUpOpen(true)}>
              Follow-up
            </Button>
            <Button leftIcon={<Pencil size={17} />} onClick={() => navigate(`/customers/${customerId}/edit`)}>
              Tahrirlash
            </Button>
          </div>
        </div>

        <section className="customer-details__hero">
          <Card padding="lg" className="customer-details__identity">
            <div className="customer-details__avatar">
              <UserRound size={25} />
            </div>
            <div>
              <div className="customer-details__title-row">
                <h2>{displayName}</h2>
                <Badge variant={customer?.status === "ACTIVE" ? "success" : "neutral"}>{customer?.status || "-"}</Badge>
                <Badge variant={analytics.score.variant}>
                  {analytics.score.value >= 60 ? (
                    <LiveIcon icon={ShieldCheck} motion="success-pop" size={13} />
                  ) : (
                    <LiveIcon icon={ShieldAlert} motion="warning-glow" size={13} />
                  )}
                  {analytics.score.label} / {analytics.score.value}
                </Badge>
              </div>
              <p>{customer?.companyName || customer?.fullName || customer?.phone || "-"}</p>
              <span>
                Segment: <b>{customer?.segment || "-"}</b>
                {suggestedSegment !== customer?.segment && ` / tavsiya: ${suggestedSegment}`}
              </span>
            </div>
          </Card>

          <Metric icon={<CircleDollarSign size={20} />} label="Total Sales" value={`${formatFinanceMoney(analytics.totalSales)} so'm`} />
          <Metric icon={<HandCoins size={20} />} label="Total Paid" value={`${formatFinanceMoney(analytics.totalPaid)} so'm`} variant="success" />
          <Metric
            icon={<Wallet size={20} />}
            label="Debt"
            value={`${formatFinanceMoney(analytics.debt)} so'm`}
            variant={analytics.debt > 0 ? "warning" : "success"}
            live={analytics.debt > 0}
          />
          <Metric icon={<ReceiptText size={20} />} label="Orders Count" value={analytics.ordersCount} />
        </section>

        {(analytics.overdue || analytics.credit.exceeded || nextFollowUpOverdue) && (
          <Card padding="md" className="customer-details__warning">
            <LiveIcon icon={AlertTriangle} motion="warning-glow" size={17} />
            <span>
              {analytics.credit.exceeded && "Credit limit oshgan. "}
              {analytics.overdue && "Qarz muddati xavfli. "}
              {nextFollowUpOverdue && "Follow-up overdue."}
            </span>
          </Card>
        )}

        <section className="customer-details__grid">
          <Card padding="lg" className="customer-details__section">
            <SectionTitle title="Kontakt ma'lumotlari" />
            <InfoGrid
              items={[
                ["Telefon", customer?.phone],
                ["Email", customer?.email],
                ["Region", customer?.region],
                ["Address", customer?.address],
                ["Type", customer?.type],
                ["Source", customer?.source],
                ["Contact person", customer?.contactPerson],
                ["STIR", customer?.taxId],
              ]}
            />
            {customer?.tags?.length > 0 && (
              <div className="customer-details__tags">
                {customer.tags.map((tag) => (
                  <Badge key={tag} variant="neutral">{tag}</Badge>
                ))}
              </div>
            )}
          </Card>

          <Card padding="lg" className="customer-details__section">
            <SectionTitle title="Agent" actionLabel="Agentni o'zgartirish" onAction={() => setAgentOpen(true)} />
            <InfoGrid
              items={[
                ["Agent", agent?.name || (customer?.agentId ? "Agent topilmadi" : "Tanlanmagan")],
                ["Telefon", agent?.phone],
                ["Region", agent?.region],
                ["Route", agent?.route],
              ]}
            />
            {agent && (
              <Button variant="secondary" leftIcon={<Users size={17} />} onClick={() => navigate(`/agents/${agent.id}`)}>
                Agent detail
              </Button>
            )}
          </Card>
        </section>

        <section className="customer-details__grid">
          <Card padding="lg" className="customer-details__section">
            <SectionTitle title="Debt / Credit" />
            <InfoGrid
              items={[
                ["Credit limit", `${formatFinanceMoney(analytics.credit.creditLimit)} so'm`],
                ["Used", `${formatFinanceMoney(analytics.credit.currentDebt)} so'm`],
                ["Available", `${formatFinanceMoney(analytics.credit.availableCredit)} so'm`],
                ["Payment term", `${customer?.paymentTermDays || 0} kun`],
                ["Last payment", analytics.lastPayment ? formatFinanceDate(analytics.lastPayment.date) : "-"],
                ["Collected later", `${formatFinanceMoney(analytics.collectedAmount)} so'm`],
              ]}
            />
          </Card>

          <Card padding="lg" className="customer-details__section">
            <SectionTitle title="Loyalty / Bonus" />
            <InfoGrid
              items={[
                ["Loyalty points", customer?.loyaltyPoints || 0],
                ["Bonus balance", `${formatFinanceMoney(customer?.bonusBalance || 0)} so'm`],
                ["Mode", "Read-only future-ready"],
                ["Birthday", customer?.birthday || "-"],
              ]}
            />
          </Card>
        </section>

        <Card padding="lg" className="customer-details__section">
          <SectionTitle title="Sales History" />
          <Table
            columns={[
              {
                key: "number",
                title: "Sale number",
                render: (value, row) => (
                  <button type="button" className="customer-details__table-link" onClick={() => navigate(`/sales/history/${row.id}`)}>
                    {value || row.id}
                  </button>
                ),
              },
              { key: "completedAt", title: "Date", render: (value, row) => formatSaleDate(value || row.orderDate || row.createdAt) },
              { key: "agentName", title: "Agent", render: (value) => value || "-" },
              { key: "netTotal", title: "Total", render: (value, row) => `${formatFinanceMoney(value ?? row.total)} so'm` },
              { key: "paidAmount", title: "Paid", render: (value) => `${formatFinanceMoney(value)} so'm` },
              { key: "debtAmount", title: "Debt", render: (value) => `${formatFinanceMoney(value)} so'm` },
              { key: "paymentStatus", title: "Payment", render: (value) => <Badge variant={getPaymentStatusVariant(value)}>{getPaymentStatusLabel(value)}</Badge> },
              { key: "status", title: "Status", render: (value) => <Badge variant={getSaleStatusVariant(value)}>{getSaleStatusLabel(value)}</Badge> },
            ]}
            data={analytics.sales}
            rowKey="id"
            emptyText="Customer sales history mavjud emas."
          />
        </Card>

        <Card padding="lg" className="customer-details__section">
          <SectionTitle title="Payments" />
          <Table
            columns={[
              { key: "date", title: "Date", render: formatFinanceDate },
              { key: "type", title: "Type", render: (value) => <Badge variant={value === "IN" ? "success" : "danger"}>{value}</Badge> },
              { key: "sourceType", title: "Source" },
              { key: "paymentMethod", title: "Method", render: getPaymentMethodLabel },
              { key: "amount", title: "Amount", render: (value) => `${formatFinanceMoney(value)} so'm` },
              { key: "note", title: "Note", render: (value) => value || "-" },
            ]}
            data={analytics.payments}
            rowKey="id"
            emptyText="Payment history mavjud emas."
          />
        </Card>

        <section className="customer-details__grid">
          <Card padding="lg" className="customer-details__section">
            <SectionTitle title="Follow-ups / Notes" actionLabel="Qo'shish" onAction={() => setFollowUpOpen(true)} />
            <div className="customer-details__followups">
              {analytics.followUps.length ? (
                analytics.followUps.map((followUp) => (
                  <div key={followUp.id} className={isFollowUpOverdue(followUp) ? "customer-details__followup--overdue" : ""}>
                    <span>
                      <b>{followUp.type}</b>
                      <small>{formatFinanceDate(followUp.date)}</small>
                    </span>
                    <p>{followUp.note}</p>
                    <div>
                      <Badge variant={followUp.status === "OPEN" ? "warning" : followUp.status === "DONE" ? "success" : "neutral"}>
                        {followUp.status}
                      </Badge>
                      {followUp.status === "OPEN" && (
                        <Button size="sm" variant="secondary" onClick={() => handleFollowUpStatus(followUp, "DONE")}>
                          DONE
                        </Button>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="customer-details__empty">Follow-up yoki note mavjud emas.</div>
              )}
            </div>
          </Card>

          <Card padding="lg" className="customer-details__section">
            <SectionTitle title="Customer analytics" />
            <InfoGrid
              items={[
                ["Average check", `${formatFinanceMoney(analytics.averageCheck)} so'm`],
                ["Last sale", analytics.lastSale ? formatSaleDate(analytics.lastSale.completedAt || analytics.lastSale.createdAt) : "-"],
                ["Days since last sale", analytics.daysSinceLastSale ?? "-"],
                ["Return count", analytics.returnCount],
                ["Credit usage", analytics.credit.creditLimit > 0 ? `${Math.round((analytics.credit.currentDebt / analytics.credit.creditLimit) * 100)}%` : "0%"],
                ["Customer score", `${analytics.score.value} / ${analytics.score.label}`],
              ]}
            />
          </Card>
        </section>

        <Card padding="lg" className="customer-details__section">
          <SectionTitle title="Timeline" />
          <div className="customer-details__timeline">
            {timeline.slice(0, 20).map((event) => (
              <div key={event.id}>
                <span>{formatFinanceDate(event.date)}</span>
                <strong>{event.title}</strong>
                <small>{event.note || event.meta || ""}</small>
                {event.amount !== undefined && <b>{formatFinanceMoney(event.amount)} so'm</b>}
              </div>
            ))}
          </div>
        </Card>

        <Card padding="md" className="customer-details__safety">
          <span>
            Delete safety: {deleteSafety.canDelete ? "history yo'q, hard delete mumkin" : deleteSafety.blockingReasons.join(", ")}
          </span>
          <Button variant="secondary" leftIcon={<AlertTriangle size={17} />} onClick={handleDeactivate}>
            Faol/Faol emas
          </Button>
        </Card>
      </div>

      <Modal
        open={paymentOpen}
        title="To'lov qabul qilish"
        description="Finance CUSTOMER_PAYMENT transaction yaratiladi."
        onClose={() => {
          setPaymentOpen(false);
          setError("");
        }}
        footer={
          <>
            <Button variant="secondary" onClick={() => setPaymentOpen(false)}>Bekor</Button>
            <Button leftIcon={<Save size={17} />} onClick={handlePayment}>Saqlash</Button>
          </>
        }
      >
        <div className="customer-details__modal-form">
          {error && <div className="customer-details__modal-error">{error}</div>}
          <Input label="Summa" type="number" min="0" value={paymentForm.amount} onChange={(event) => setPaymentForm((current) => ({ ...current, amount: event.target.value }))} />
          <Select label="Method" value={paymentForm.paymentMethod} options={PAYMENT_METHODS} onChange={(event) => setPaymentForm((current) => ({ ...current, paymentMethod: event.target.value }))} />
          <Input label="Date" type="date" value={paymentForm.date} onChange={(event) => setPaymentForm((current) => ({ ...current, date: event.target.value }))} />
          <Textarea label="Note" rows={3} value={paymentForm.note} onChange={(event) => setPaymentForm((current) => ({ ...current, note: event.target.value }))} />
        </div>
      </Modal>

      <Modal
        open={followUpOpen}
        title="Yangi eslatma / Follow-up"
        onClose={() => {
          setFollowUpOpen(false);
          setError("");
        }}
        footer={
          <>
            <Button variant="secondary" onClick={() => setFollowUpOpen(false)}>Bekor</Button>
            <Button leftIcon={<CalendarClock size={17} />} onClick={handleFollowUp}>Qo'shish</Button>
          </>
        }
      >
        <div className="customer-details__modal-form">
          {error && <div className="customer-details__modal-error">{error}</div>}
          <Select label="Type" value={followUpForm.type} options={FOLLOW_UP_TYPES} onChange={(event) => setFollowUpForm((current) => ({ ...current, type: event.target.value }))} />
          <Select
            label="Status"
            value={followUpForm.status}
            options={[
              { value: "OPEN", label: "OPEN" },
              { value: "DONE", label: "DONE" },
              { value: "CANCELLED", label: "CANCELLED" },
            ]}
            onChange={(event) => setFollowUpForm((current) => ({ ...current, status: event.target.value }))}
          />
          <Input label="Date" type="date" value={followUpForm.date} onChange={(event) => setFollowUpForm((current) => ({ ...current, date: event.target.value }))} />
          <Textarea label="Note" rows={4} value={followUpForm.note} onChange={(event) => setFollowUpForm((current) => ({ ...current, note: event.target.value }))} />
        </div>
      </Modal>

      <Modal
        open={agentOpen}
        title="Agentni o'zgartirish"
        onClose={() => setAgentOpen(false)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setAgentOpen(false)}>Bekor</Button>
            <Button leftIcon={<Save size={17} />} onClick={handleAgentChange}>Saqlash</Button>
          </>
        }
      >
        <Select
          label="Agent"
          value={selectedAgentId}
          options={[
            { value: "", label: "Agent tanlanmagan" },
            ...activeAgents.map((item) => ({
              value: item.id,
              label: item.name || item.phone || item.id,
            })),
            ...(agent && agent.status !== "ACTIVE"
              ? [{ value: agent.id, label: `${agent.name || agent.id} (inactive)` }]
              : []),
          ]}
          onChange={(event) => setSelectedAgentId(event.target.value)}
        />
      </Modal>
    </PageContainer>
  );
};

const Metric = ({ icon, label, value, variant = "", live = false }) => (
  <Card variant="soft" padding="md" className="customer-details__metric">
    <div className={["customer-details__metric-icon", variant ? `customer-details__metric-icon--${variant}` : ""].filter(Boolean).join(" ")}>
      {live && icon.type ? <LiveIcon icon={icon.type} motion="warning-glow" size={20} /> : icon}
    </div>
    <span>
      <small>{label}</small>
      <strong>{value}</strong>
    </span>
  </Card>
);

const SectionTitle = ({ title, actionLabel, onAction }) => (
  <div className="customer-details__section-title">
    <h3>{title}</h3>
    {actionLabel && (
      <Button size="sm" variant="secondary" onClick={onAction}>
        {actionLabel}
      </Button>
    )}
  </div>
);

const InfoGrid = ({ items }) => (
  <div className="customer-details__info-grid">
    {items
      .filter(([label, value]) => label && value !== undefined)
      .map(([label, value]) => (
        <div key={label}>
          <span>{label}</span>
          <strong>{value === null || value === undefined || value === "" ? "-" : value}</strong>
        </div>
      ))}
  </div>
);

export default CustomerDetailsPage;
