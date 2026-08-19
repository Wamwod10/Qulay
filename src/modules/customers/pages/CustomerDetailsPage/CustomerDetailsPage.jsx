import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { AlertTriangle, ArrowLeft, BellPlus, CalendarClock, CircleDollarSign, HandCoins, Pencil, ReceiptText, Save, ShieldAlert, ShieldCheck, UserRound, Users, Wallet } from "lucide-react";
import PageContainer from "../../../../components/PageContainer/PageContainer";
import { Badge, Button, Card, Input, LiveIcon, Modal, Select, Table, Textarea } from "../../../../shared/ui";
import { getStoredAgents } from "../../../agents/utils/agentsStorage";
import { addCustomerPayment } from "../../../finance/utils/financeActions";
import { formatFinanceDate, formatFinanceMoney, getPaymentMethodLabel } from "../../../finance/utils/financeSelectors";
import { formatSaleDate, getPaymentStatusLabel, getPaymentStatusVariant, getSaleStatusLabel, getSaleStatusVariant } from "../../../sales/utils/salesHelpers";
import { buildCustomerAnalytics, getCustomerAgent, getCustomerDeleteSafety, getCustomerTimeline, isFollowUpOverdue, suggestCustomerSegment } from "../../utils/customerSelectors";
import { addCustomerFollowUp, deactivateCustomer, getCustomerById, getCustomerDisplayName, updateCustomer, updateCustomerFollowUp } from "../../utils/customersStorage";
import "./CustomerDetailsPage.scss";
import { translateText } from "../../../../localization/i18n";
const FOLLOW_UP_TYPES = [{
  value: "CALL",
  text: "Qo'ng'iroq"
}, {
  value: "MEETING",
  text: "Uchrashuv"
}, {
  value: "PAYMENT",
  text: "To'lov"
}, {
  value: "SALES",
  text: "Savdo"
}, {
  value: "OTHER",
  text: "Boshqa"
}];
const FOLLOW_UP_STATUS_LABELS = {
  OPEN: "Ochiq",
  DONE: "Bajarilgan",
  CANCELLED: "Bekor qilingan"
};
const PAYMENT_METHODS = [{
  value: "CASH",
  text: "Naqd"
}, {
  value: "CARD",
  text: "Karta"
}, {
  value: "BANK",
  text: "Bank"
}, {
  value: "QR",
  text: "QR"
}];
const FINANCE_SOURCE_LABELS = {
  SALE_PAYMENT: "Savdo to'lovi",
  CUSTOMER_PAYMENT: "Mijoz to'lovi",
  AGENT_COLLECTION: "Agent tushumi",
  REFUND: "Qaytarim"
};
const CustomerDetailsPage = () => {
  const navigate = useNavigate();
  const {
    customerId
  } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const [version, setVersion] = useState(0);
  const [paymentOpen, setPaymentOpen] = useState(searchParams.get("pay") === "1");
  const [followUpOpen, setFollowUpOpen] = useState(false);
  const [agentOpen, setAgentOpen] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    amount: "",
    paymentMethod: "CASH",
    date: new Date().toISOString().slice(0, 10),
    note: ""
  });
  const [followUpForm, setFollowUpForm] = useState({
    type: "CALL",
    status: "OPEN",
    date: new Date(Date.now() + 86400000).toISOString().slice(0, 10),
    note: ""
  });
  const [selectedAgentId, setSelectedAgentId] = useState("");
  const [error, setError] = useState("");
  const customer = getCustomerById(customerId);
  const analytics = useMemo(() => buildCustomerAnalytics(customerId), [customerId, version]);
  const agent = useMemo(() => getCustomerAgent(customerId), [customerId, version]);
  const timeline = useMemo(() => getCustomerTimeline(customerId), [customerId, version]);
  const agents = useMemo(() => getStoredAgents(), [version]);
  const activeAgents = agents.filter(item => item.status === "ACTIVE");
  const suggestedSegment = useMemo(() => suggestCustomerSegment(customerId), [customerId, version]);
  const followUpTypes = FOLLOW_UP_TYPES.map(item => ({
    ...item,
    label: translateText(item.text)
  }));
  const paymentMethods = PAYMENT_METHODS.map(item => ({
    ...item,
    label: translateText(item.text)
  }));
  useEffect(() => {
    const refresh = () => setVersion(current => current + 1);
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
      setSearchParams({}, {
        replace: true
      });
    }
    if (searchParams.get("follow") === "1") {
      setFollowUpOpen(true);
      setSearchParams({}, {
        replace: true
      });
    }
  }, [searchParams, setSearchParams]);
  useEffect(() => {
    setPaymentForm(current => ({
      ...current,
      amount: analytics.debt > 0 ? String(analytics.debt) : current.amount
    }));
  }, [analytics.debt]);
  useEffect(() => {
    setSelectedAgentId(customer?.agentId || "");
  }, [customer?.agentId]);
  if (!customer && !analytics.totalSales) {
    return <PageContainer title={translateText("Mijoz topilmadi")} description={translateText("Bu mijoz uchun ma'lumot mavjud emas.")}>
        <Button variant="secondary" onClick={() => navigate("/customers")}>{translateText("Ortga")}</Button>
      </PageContainer>;
  }
  const displayName = getCustomerDisplayName(customer || analytics.customer);
  const deleteSafety = getCustomerDeleteSafety(customerId);
  const nextFollowUpOverdue = isFollowUpOverdue(analytics.nextFollowUp);
  const refresh = () => setVersion(current => current + 1);
  const handlePayment = async () => {
    setError("");
    try {
      await addCustomerPayment({
        customerId,
        amount: Number(paymentForm.amount || 0),
        paymentMethod: paymentForm.paymentMethod,
        date: paymentForm.date,
        note: paymentForm.note || `${translateText("Mijoz to'lovi")}: ${displayName}`
      });
      setPaymentOpen(false);
      refresh();
    } catch (caughtError) {
      setError(caughtError.message);
    }
  };
  const handleFollowUp = () => {
    if (!followUpForm.note.trim()) {
      setError(translateText("Keyingi aloqa izohi majburiy."));
      return;
    }
    addCustomerFollowUp({
      ...followUpForm,
      customerId
    });
    setFollowUpOpen(false);
    setFollowUpForm({
      type: "CALL",
      status: "OPEN",
      date: new Date(Date.now() + 86400000).toISOString().slice(0, 10),
      note: ""
    });
    setError("");
    refresh();
  };
  const handleFollowUpStatus = (followUp, status) => {
    updateCustomerFollowUp({
      ...followUp,
      status
    });
    refresh();
  };
  const handleAgentChange = async () => {
    await updateCustomer({
      ...customer,
      agentId: selectedAgentId || null
    });
    setAgentOpen(false);
    refresh();
  };
  const handleDeactivate = async () => {
    if (!customer) {
      return;
    }
    if (customer.status === "INACTIVE") {
      await updateCustomer({
        ...customer,
        status: "ACTIVE"
      });
    } else {
      await deactivateCustomer(customer.id);
    }
    refresh();
  };
  return <PageContainer title={displayName} description={customer?.phone || translateText("Mijoz CRM tafsiloti")}>
      <div className="customer-details">
        <div className="customer-details__toolbar">
          <Button variant="secondary" leftIcon={<ArrowLeft size={17} />} onClick={() => navigate("/customers")}>{translateText("Ortga")}</Button>
          <div>
            <Button variant="secondary" leftIcon={<ReceiptText size={17} />} onClick={() => navigate(`/sales/terminal?customerId=${customerId}`)}>{translateText("Yangi savdo")}</Button>
            <Button variant="secondary" leftIcon={<HandCoins size={17} />} disabled={analytics.debt <= 0} onClick={() => setPaymentOpen(true)}>{translateText("To'lov qabul qilish")}</Button>
            <Button variant="secondary" leftIcon={<BellPlus size={17} />} onClick={() => setFollowUpOpen(true)}>{translateText("Keyingi aloqa")}</Button>
            <Button leftIcon={<Pencil size={17} />} onClick={() => navigate(`/customers/${customerId}/edit`)}>{translateText("Tahrirlash")}</Button>
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
                <Badge variant={customer?.status === "ACTIVE" ? "success" : "neutral"}>{translateText(customer?.status || "-")}</Badge>
                <Badge variant={analytics.score.variant}>
                  {analytics.score.value >= 60 ? <LiveIcon icon={ShieldCheck} motion="success-pop" size={13} /> : <LiveIcon icon={ShieldAlert} motion="warning-glow" size={13} />}
                  {analytics.score.label} / {analytics.score.value}
                </Badge>
              </div>
              <p>{customer?.companyName || customer?.fullName || customer?.phone || "-"}</p>
              <span>{translateText("Toifa:")}<b>{translateText(customer?.segment || "-")}</b>
                {suggestedSegment !== customer?.segment && ` / ${translateText("tavsiya")}: ${translateText(suggestedSegment)}`}
              </span>
            </div>
          </Card>

          <Metric icon={<CircleDollarSign size={20} />} label={translateText("Jami savdo")} value={formatFinanceMoney(analytics.totalSales)} />
          <Metric icon={<HandCoins size={20} />} label={translateText("Jami to'langan")} value={formatFinanceMoney(analytics.totalPaid)} variant="success" />
          <Metric icon={<Wallet size={20} />} label={translateText("Qarz")} value={formatFinanceMoney(analytics.debt)} variant={analytics.debt > 0 ? "warning" : "success"} live={analytics.debt > 0} />
          <Metric icon={<ReceiptText size={20} />} label={translateText("Buyurtmalar soni")} value={analytics.ordersCount} />
        </section>

        {(analytics.overdue || analytics.credit.exceeded || nextFollowUpOverdue) && <Card padding="md" className="customer-details__warning">
            <LiveIcon icon={AlertTriangle} motion="warning-glow" size={17} />
            <span>
              {analytics.credit.exceeded && translateText("Kredit limiti oshgan. ")}
              {analytics.overdue && translateText("Qarz muddati xavfli. ")}
              {nextFollowUpOverdue && translateText("Keyingi aloqa muddati o'tgan.")}
            </span>
          </Card>}

        <section className="customer-details__grid">
          <Card padding="lg" className="customer-details__section">
            <SectionTitle title={translateText("Kontakt ma'lumotlari")} />
            <InfoGrid items={[["Telefon", customer?.phone], ["Email", customer?.email], ["Hudud", customer?.region], ["Manzil", customer?.address], ["Turi", translateText(customer?.type || "-")], ["Manba", translateText(customer?.source || "-")], ["Aloqa uchun shaxs", customer?.contactPerson], ["STIR", customer?.taxId]]} />
            {customer?.tags?.length > 0 && <div className="customer-details__tags">
                {customer.tags.map(tag => <Badge key={tag} variant="neutral">{tag}</Badge>)}
              </div>}
          </Card>

          <Card padding="lg" className="customer-details__section">
            <SectionTitle title={translateText("Agent")} actionLabel={translateText("Agentni o'zgartirish")} onAction={() => setAgentOpen(true)} />
            <InfoGrid items={[["Agent", agent?.name || (customer?.agentId ? translateText("Agent topilmadi") : translateText("Tanlanmagan"))], ["Telefon", agent?.phone], ["Region", agent?.region], ["Yo'nalish", agent?.route]]} />
            {agent && <Button variant="secondary" leftIcon={<Users size={17} />} onClick={() => navigate(`/agents/${agent.id}`)}>{translateText("Agent tafsiloti")}</Button>}
          </Card>
        </section>

        <section className="customer-details__grid">
          <Card padding="lg" className="customer-details__section">
            <SectionTitle title={translateText("Qarz / kredit")} />
          <InfoGrid items={[["Kredit limiti", formatFinanceMoney(analytics.credit.creditLimit)], ["Ishlatilgan", formatFinanceMoney(analytics.credit.currentDebt)], ["Mavjud limit", formatFinanceMoney(analytics.credit.availableCredit)], ["To'lov muddati", `${customer?.paymentTermDays || 0} ${translateText("kun")}`], ["Oxirgi to'lov", analytics.lastPayment ? formatFinanceDate(analytics.lastPayment.date) : "-"], ["Keyin yig'ilgan", formatFinanceMoney(analytics.collectedAmount)]]} />
          </Card>

          <Card padding="lg" className="customer-details__section">
            <SectionTitle title={translateText("Sodiqlik / mukofot")} />
          <InfoGrid items={[["Sodiqlik ballari", customer?.loyaltyPoints || 0], ["Mukofot qoldig'i", formatFinanceMoney(customer?.bonusBalance || 0)], ["Rejim", translateText("Faqat o'qish uchun")], ["Tug'ilgan sana", customer?.birthday || "-"]]} />
          </Card>
        </section>

        <Card padding="lg" className="customer-details__section">
          <SectionTitle title={translateText("Savdo tarixi")} />
          <Table columns={[{
          key: "number",
          title: translateText("Savdo raqami"),
          render: (value, row) => <button type="button" className="customer-details__table-link" onClick={() => navigate(`/sales/history/${row.id}`)}>
                    {value || row.id}
                  </button>
        }, {
          key: "completedAt",
          title: translateText("Sana"),
          render: (value, row) => formatSaleDate(value || row.orderDate || row.createdAt)
        }, {
          key: "agentName",
          title: translateText("Agent"),
          render: value => value || "-"
        }, {
          key: "netTotal",
          title: translateText("Jami"),
          render: (value, row) => formatFinanceMoney(value ?? row.total)
        }, {
          key: "paidAmount",
          title: translateText("To'langan"),
          render: value => formatFinanceMoney(value)
        }, {
          key: "debtAmount",
          title: translateText("Qarz"),
          render: value => formatFinanceMoney(value)
        }, {
          key: "paymentStatus",
          title: translateText("To'lov"),
          render: value => <Badge variant={getPaymentStatusVariant(value)}>{getPaymentStatusLabel(value)}</Badge>
        }, {
          key: "status",
          title: translateText("Holat"),
          render: value => <Badge variant={getSaleStatusVariant(value)}>{getSaleStatusLabel(value)}</Badge>
        }]} data={analytics.sales} rowKey="id" emptyText={translateText("Mijoz savdo tarixi mavjud emas.")} />
        </Card>

        <Card padding="lg" className="customer-details__section">
          <SectionTitle title={translateText("To'lovlar")} />
          <Table columns={[{
          key: "date",
          title: translateText("Sana"),
          render: formatFinanceDate
        }, {
          key: "type",
          title: translateText("Turi"),
          render: value => <Badge variant={value === "IN" ? "success" : "danger"}>{value}</Badge>
        }, {
          key: "sourceType",
          title: translateText("Manba"),
          render: value => translateText(FINANCE_SOURCE_LABELS[value] || value || "-")
        }, {
          key: "paymentMethod",
          title: translateText("To'lov turi"),
          render: getPaymentMethodLabel
        }, {
          key: "amount",
          title: translateText("Summa"),
          render: value => formatFinanceMoney(value)
        }, {
          key: "note",
          title: translateText("Izoh"),
          render: value => value || "-"
        }]} data={analytics.payments} rowKey="id" emptyText={translateText("To'lov tarixi mavjud emas.")} />
        </Card>

        <section className="customer-details__grid">
          <Card padding="lg" className="customer-details__section">
            <SectionTitle title={translateText("Keyingi aloqalar / izohlar")} actionLabel={translateText("Qo'shish")} onAction={() => setFollowUpOpen(true)} />
            <div className="customer-details__followups">
              {analytics.followUps.length ? analytics.followUps.map(followUp => <div key={followUp.id} className={isFollowUpOverdue(followUp) ? "customer-details__followup--overdue" : ""}>
                    <span>
                      <b>{translateText(FOLLOW_UP_TYPES.find(item => item.value === followUp.type)?.text || followUp.type)}</b>
                      <small>{formatFinanceDate(followUp.date)}</small>
                    </span>
                    <p>{followUp.note}</p>
                    <div>
                      <Badge variant={followUp.status === "OPEN" ? "warning" : followUp.status === "DONE" ? "success" : "neutral"}>
                        {translateText(FOLLOW_UP_STATUS_LABELS[followUp.status] || followUp.status)}
                      </Badge>
                      {followUp.status === "OPEN" && <Button size="sm" variant="secondary" onClick={() => handleFollowUpStatus(followUp, "DONE")}>{translateText("Bajarildi")}</Button>}
                    </div>
                  </div>) : <div className="customer-details__empty">{translateText("Keyingi aloqa yoki izoh mavjud emas.")}</div>}
            </div>
          </Card>

          <Card padding="lg" className="customer-details__section">
            <SectionTitle title={translateText("Mijoz tahlili")} />
                <InfoGrid items={[["O'rtacha chek", formatFinanceMoney(analytics.averageCheck)], ["Oxirgi savdo", analytics.lastSale ? formatSaleDate(analytics.lastSale.completedAt || analytics.lastSale.createdAt) : "-"], ["Oxirgi savdodan beri kun", analytics.daysSinceLastSale ?? "-"], ["Qaytarish soni", analytics.returnCount], ["Kredit ishlatilishi", analytics.credit.creditLimit > 0 ? `${Math.round(analytics.credit.currentDebt / analytics.credit.creditLimit * 100)}%` : "0%"], ["Mijoz reytingi", `${analytics.score.value} / ${analytics.score.label}`]]} />
          </Card>
        </section>

        <Card padding="lg" className="customer-details__section">
          <SectionTitle title={translateText("Vaqt chizig'i")} />
          <div className="customer-details__timeline">
            {timeline.slice(0, 20).map(event => <div key={event.id}>
                <span>{formatFinanceDate(event.date)}</span>
                <strong>{event.title}</strong>
                <small>{event.note || event.meta || ""}</small>
                {event.amount !== undefined && <b>{formatFinanceMoney(event.amount)}</b>}
              </div>)}
          </div>
        </Card>

        <Card padding="md" className="customer-details__safety">
          <span>{translateText("O'chirish xavfsizligi:")} {deleteSafety.canDelete ? translateText("tarix yo'q, to'liq o'chirish mumkin") : deleteSafety.blockingReasons.join(", ")}
          </span>
          <Button variant="secondary" leftIcon={<AlertTriangle size={17} />} onClick={handleDeactivate}>{translateText("Faol/Faol emas")}</Button>
        </Card>
      </div>

      <Modal open={paymentOpen} title={translateText("To'lov qabul qilish")} description={translateText("Moliya modulida mijoz to'lovi operatsiyasi yaratiladi.")} onClose={() => {
      setPaymentOpen(false);
      setError("");
    }} footer={<>
            <Button variant="secondary" onClick={() => setPaymentOpen(false)}>{translateText("Bekor")}</Button>
            <Button leftIcon={<Save size={17} />} onClick={handlePayment}>{translateText("Saqlash")}</Button>
          </>}>
        <div className="customer-details__modal-form">
          {error && <div className="customer-details__modal-error">{error}</div>}
          <Input label={translateText("Summa")} type="number" min="0" value={paymentForm.amount} onChange={event => setPaymentForm(current => ({
          ...current,
          amount: event.target.value
        }))} />
          <Select label={translateText("To'lov turi")} value={paymentForm.paymentMethod} options={paymentMethods} onChange={event => setPaymentForm(current => ({
          ...current,
          paymentMethod: event.target.value
        }))} />
          <Input label={translateText("Sana")} type="date" value={paymentForm.date} onChange={event => setPaymentForm(current => ({
          ...current,
          date: event.target.value
        }))} />
          <Textarea label={translateText("Izoh")} rows={3} value={paymentForm.note} onChange={event => setPaymentForm(current => ({
          ...current,
          note: event.target.value
        }))} />
        </div>
      </Modal>

      <Modal open={followUpOpen} title={translateText("Yangi eslatma / keyingi aloqa")} onClose={() => {
      setFollowUpOpen(false);
      setError("");
    }} footer={<>
            <Button variant="secondary" onClick={() => setFollowUpOpen(false)}>{translateText("Bekor")}</Button>
            <Button leftIcon={<CalendarClock size={17} />} onClick={handleFollowUp}>{translateText("Qo'shish")}</Button>
          </>}>
        <div className="customer-details__modal-form">
          {error && <div className="customer-details__modal-error">{error}</div>}
          <Select label={translateText("Turi")} value={followUpForm.type} options={followUpTypes} onChange={event => setFollowUpForm(current => ({
          ...current,
          type: event.target.value
        }))} />
          <Select label={translateText("Holat")} value={followUpForm.status} options={[{
          value: "OPEN",
          label: translateText("Ochiq")
        }, {
          value: "DONE",
          label: translateText("Bajarilgan")
        }, {
          value: "CANCELLED",
          label: translateText("Bekor qilingan")
        }]} onChange={event => setFollowUpForm(current => ({
          ...current,
          status: event.target.value
        }))} />
          <Input label={translateText("Sana")} type="date" value={followUpForm.date} onChange={event => setFollowUpForm(current => ({
          ...current,
          date: event.target.value
        }))} />
          <Textarea label={translateText("Izoh")} rows={4} value={followUpForm.note} onChange={event => setFollowUpForm(current => ({
          ...current,
          note: event.target.value
        }))} />
        </div>
      </Modal>

      <Modal open={agentOpen} title={translateText("Agentni o'zgartirish")} onClose={() => setAgentOpen(false)} footer={<>
            <Button variant="secondary" onClick={() => setAgentOpen(false)}>{translateText("Bekor")}</Button>
            <Button leftIcon={<Save size={17} />} onClick={handleAgentChange}>{translateText("Saqlash")}</Button>
          </>}>
        <Select label={translateText("Agent")} value={selectedAgentId} options={[{
        value: "",
        label: translateText("Agent tanlanmagan")
      }, ...activeAgents.map(item => ({
        value: item.id,
        label: item.name || item.phone || item.id
      })), ...(agent && agent.status !== "ACTIVE" ? [{
        value: agent.id,
        label: `${agent.name || agent.id} (${translateText("Faol emas")})`
      }] : [])]} onChange={event => setSelectedAgentId(event.target.value)} />
      </Modal>
    </PageContainer>;
};
const Metric = ({
  icon,
  label,
  value,
  variant = "",
  live = false
}) => <Card variant="soft" padding="md" className="customer-details__metric">
    <div className={["customer-details__metric-icon", variant ? `customer-details__metric-icon--${variant}` : ""].filter(Boolean).join(" ")}>
      {live && icon.type ? <LiveIcon icon={icon.type} motion="warning-glow" size={20} /> : icon}
    </div>
    <span>
      <small>{label}</small>
      <strong>{value}</strong>
    </span>
  </Card>;
const SectionTitle = ({
  title,
  actionLabel,
  onAction
}) => <div className="customer-details__section-title">
    <h3>{title}</h3>
    {actionLabel && <Button size="sm" variant="secondary" onClick={onAction}>
        {actionLabel}
      </Button>}
  </div>;
const InfoGrid = ({
  items
}) => <div className="customer-details__info-grid">
    {items.filter(([label, value]) => label && value !== undefined).map(([label, value]) => <div key={label}>
          <span>{translateText(label)}</span>
          <strong>{value === null || value === undefined || value === "" ? "-" : value}</strong>
        </div>)}
  </div>;
export default CustomerDetailsPage;
