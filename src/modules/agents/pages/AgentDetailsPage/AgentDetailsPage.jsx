import { ArrowLeft, CircleDollarSign, Mail, MapPin, Pencil, Phone, Route, Target, UserRound, Wallet } from "lucide-react";
import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import PageContainer from "../../../../components/PageContainer/PageContainer";
import AgentCustomers from "../../components/AgentCustomers/AgentCustomers";
import AgentOrders from "../../components/AgentOrders/AgentOrders";
import AgentPayments from "../../components/AgentPayments/AgentPayments";
import AgentPerformance from "../../components/AgentPerformance/AgentPerformance";
import { Badge, Button, Card } from "../../../../shared/ui";
import { calculateAgentPerformance } from "../../utils/agentAnalytics";
import { formatAgentMoney, getAgentInitials, getAgentStatusLabel, getAgentStatusVariant } from "../../utils/agentHelpers";
import { getAgentById } from "../../utils/agentsStorage";
import { getAgentCollectedAmount, getAgentCustomers, getAgentDebt, getAgentOrders, getAgentPayments, getCustomersCatalog } from "../../utils/agentIntegration";
import { getAgentBalance } from "../../../finance/utils/financeSelectors";
import "./AgentDetailsPage.scss";
import { translateText } from "../../../../localization/i18n";
const AgentDetailsPage = () => {
  const navigate = useNavigate();
  const {
    agentId
  } = useParams();
  const [refreshKey, setRefreshKey] = useState(0);
  const agent = getAgentById(agentId);
  const integrationData = useMemo(() => {
    if (!agent) {
      return {
        customers: [],
        orders: [],
        payments: [],
        allCustomers: [],
        collectedAmount: 0,
        debtAmount: 0,
        financeBalance: null
      };
    }
    const financeBalance = getAgentBalance(agent.id);
    return {
      customers: getAgentCustomers(agent.id),
      orders: getAgentOrders(agent.id),
      payments: financeBalance.history.length ? financeBalance.history : getAgentPayments(agent.id),
      allCustomers: getCustomersCatalog(),
      collectedAmount: financeBalance.collected || getAgentCollectedAmount(agent.id),
      debtAmount: getAgentDebt(agent.id),
      financeBalance
    };
  }, [agent, refreshKey]);
  if (!agent) {
    return <PageContainer title={translateText("Agent topilmadi")} description={translateText("Bu agent mavjud emas yoki o'chirilgan.")}>
        <Button variant="secondary" onClick={() => navigate("/agents")}>{translateText("Agentlarga qaytish")}</Button>
      </PageContainer>;
  }
  const target = Number(agent.targetAmount || 0);
  const cashBalance = Number(integrationData.financeBalance?.balance ?? agent.cashBalance ?? 0);
  const commission = Number(agent.commissionPercent || 0);
  const submittedAmount = Number(integrationData.financeBalance?.handedOver || 0);
  const commissionAmount = Number(integrationData.financeBalance?.commission || 0);
  const performance = calculateAgentPerformance({
    agent,
    orders: integrationData.orders
  });
  return <PageContainer title={agent.name} description={`${agent.region || translateText("Hudud ko'rsatilmagan")} / ${agent.route || translateText("Marshrut yo'q")}`}>
      <div className="agent-details">
        <div className="agent-details__actions">
          <Button variant="secondary" leftIcon={<ArrowLeft size={17} />} onClick={() => navigate("/agents")}>{translateText("Ortga")}</Button>

          <Button leftIcon={<Pencil size={17} />} onClick={() => navigate(`/agents/${agent.id}/edit`)}>{translateText("Tahrirlash")}</Button>
        </div>

        <section className="agent-details__summary">
          <Card className="agent-details__identity">
            <div className="agent-details__identity-icon">
              <UserRound size={24} />
            </div>

            <div>
              <div className="agent-details__identity-title">
                <h2>{agent.name || getAgentInitials(agent.name)}</h2>

                <Badge variant={getAgentStatusVariant(agent.status)}>
                  {getAgentStatusLabel(agent.status)}
                </Badge>
              </div>

              <p>{agent.region || translateText("Hudud ko'rsatilmagan")}</p>
              <span>{agent.route || translateText("Marshrut belgilanmagan")}</span>
            </div>
          </Card>

          <AgentMetric icon={<Target size={20} />} label={translateText("Oylik reja")} value={formatAgentMoney(target)} />

          <AgentMetric icon={<CircleDollarSign size={20} />} label={translateText("Komissiya")} value={`${commission}%`} />

          <AgentMetric icon={<Wallet size={20} />} label={translateText("Agentdagi pul")} value={formatAgentMoney(cashBalance)} />
        </section>

        <section className="agent-details__grid">
          <Card padding="lg">
            <SectionTitle title={translateText("Kontaktlar")} description={translateText("Agent bilan bog'lanish uchun asosiy ma'lumotlar.")} />

            <div className="agent-details__contact-list">
              <ContactItem icon={<Phone size={17} />} label={translateText("Telefon")} value={agent.phone} />
              <ContactItem icon={<Mail size={17} />} label={translateText("Email")} value={agent.email} />
              <ContactItem icon={<MapPin size={17} />} label={translateText("Hudud")} value={agent.region} />
              <ContactItem icon={<Route size={17} />} label={translateText("Marshrut")} value={agent.route} />
            </div>
          </Card>

          <Card padding="lg">
            <SectionTitle title={translateText("Pul / qarz xulosasi")} description={translateText("Moliya ulanganda tushum va qarzlar shu yerda real hisoblanadi.")} />

            <div className="agent-details__info-grid">
              <InfoItem label={translateText("Yig'ilgan pul")} value={formatAgentMoney(integrationData.collectedAmount)} />
              <InfoItem label={translateText("Agentdagi pul")} value={formatAgentMoney(cashBalance)} />
              <InfoItem label={translateText("Komissiya")} value={formatAgentMoney(commissionAmount)} />
              <InfoItem label={translateText("Topshirilgan pul")} value={formatAgentMoney(submittedAmount)} />
            </div>
          </Card>
        </section>

        <section className="agent-details__stack">
          <AgentCustomers agent={agent} onChange={() => setRefreshKey(current => current + 1)} />

          <AgentPerformance performance={performance} />

          <AgentOrders orders={integrationData.orders} customers={integrationData.allCustomers} />

          <AgentPayments payments={integrationData.payments} customers={integrationData.allCustomers} />
        </section>

        {agent.note && <Card padding="lg">
            <SectionTitle title={translateText("Izoh")} />
            <div className="agent-details__note">{agent.note}</div>
          </Card>}
      </div>
    </PageContainer>;
};
const AgentMetric = ({
  icon,
  label,
  value
}) => <Card className="agent-details__metric">
    {icon && <div className="agent-details__metric-icon">{icon}</div>}

    <span>{label}</span>
    <strong>{value}</strong>
  </Card>;
const SectionTitle = ({
  title,
  description
}) => <div className="agent-details__section-title">
    <h3>{title}</h3>
    {description && <p>{description}</p>}
  </div>;
const InfoItem = ({
  label,
  value
}) => <div className="agent-details__info-item">
    <span>{label}</span>
    <strong>{value || translateText("Ma'lumot yo'q")}</strong>
  </div>;
const ContactItem = ({
  icon,
  label,
  value
}) => <div className="agent-details__contact-item">
    <div>{icon}</div>

    <span>
      <small>{label}</small>
      <strong>{value || translateText("Ma'lumot yo'q")}</strong>
    </span>
  </div>;
export default AgentDetailsPage;
