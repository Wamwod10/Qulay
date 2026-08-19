import { useMemo, useState } from "react";
import { CircleDollarSign, Plus, Route, Target, UsersRound } from "lucide-react";
import { useNavigate } from "react-router-dom";
import PageContainer from "../../../../components/PageContainer/PageContainer";
import { Card, ConfirmDialog, Pagination, Select, TableToolbar } from "../../../../shared/ui";
import AgentTable from "../../components/AgentTable/AgentTable";
import { deleteAgent, getStoredAgents, toggleAgentStatus, updateAgent } from "../../utils/agentsStorage";
import { formatAgentMoney } from "../../utils/agentHelpers";
import { getAgentDeleteSafety, getAgentOrders, getAgentSalesTotal } from "../../utils/agentIntegration";
import "./AgentsPage.scss";
import { translateText } from "../../../../localization/i18n";
const PAGE_SIZE = 10;
const AgentsPage = () => {
  const navigate = useNavigate();
  const [agents, setAgents] = useState(() => getStoredAgents());
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [regionFilter, setRegionFilter] = useState("");
  const [page, setPage] = useState(1);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const refreshAgents = () => {
    setAgents(getStoredAgents());
  };
  const regions = useMemo(() => {
    return Array.from(new Set(agents.map(agent => agent.region).filter(Boolean))).map(region => ({
      value: region,
      label: region
    }));
  }, [agents]);
  const filteredAgents = useMemo(() => {
    const query = search.trim().toLowerCase();
    return agents.filter(agent => {
      const searchable = [agent.name, agent.phone, agent.email, agent.region, agent.route].filter(Boolean).join(" ").toLowerCase();
      return (!query || searchable.includes(query)) && (!statusFilter || agent.status === statusFilter) && (!regionFilter || agent.region === regionFilter);
    });
  }, [agents, search, statusFilter, regionFilter]);
  const totalPages = Math.max(Math.ceil(filteredAgents.length / PAGE_SIZE), 1);
  const safePage = Math.min(page, totalPages);
  const pagedAgents = filteredAgents.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const stats = useMemo(() => {
    const active = agents.filter(agent => agent.status === "ACTIVE").length;
    const target = agents.reduce((total, agent) => total + Number(agent.targetAmount || 0), 0);
    const cash = agents.reduce((total, agent) => total + Number(agent.cashBalance || 0), 0);
    const ordersCount = agents.reduce((total, agent) => total + getAgentOrders(agent.id).length, 0);
    const sales = agents.reduce((total, agent) => total + getAgentSalesTotal(agent.id), 0);
    return {
      total: agents.length,
      active,
      target,
      cash,
      sales,
      hasSalesData: ordersCount > 0
    };
  }, [agents]);
  const handleToggleStatus = async agent => {
    await toggleAgentStatus(agent.id);
    refreshAgents();
  };
  const deleteSafety = deleteTarget ? getAgentDeleteSafety(deleteTarget.id) : null;
  const deleteBlocked = deleteSafety && !deleteSafety.canDelete;
  const handleDeleteConfirm = async () => {
    if (!deleteTarget) {
      return;
    }
    if (deleteBlocked) {
      if (deleteTarget.status === "ACTIVE") {
        await updateAgent({
          ...deleteTarget,
          status: "INACTIVE"
        });
      }
      setDeleteTarget(null);
      refreshAgents();
      return;
    }
    await deleteAgent(deleteTarget.id);
    setDeleteTarget(null);
    refreshAgents();
  };
  return <PageContainer title={translateText("Agentlar")} description={translateText("Savdo agentlari, hududlar, marshrutlar va rejalarni boshqarish.")}>
      <div className="agents-page">
        <section className="agents-page__stats">
          <AgentStat icon={<UsersRound size={21} />} label={translateText("Jami agent")} value={stats.total} />

          <AgentStat icon={<Route size={21} />} label={translateText("Faol agent")} value={stats.active} variant="success" />

          <AgentStat icon={<Target size={21} />} label={translateText("Jami reja")} value={formatAgentMoney(stats.target)} />

          {stats.hasSalesData ? <AgentStat icon={<CircleDollarSign size={21} />} label={translateText("Real savdo")} value={formatAgentMoney(stats.sales)} variant="success" /> : <AgentStat icon={<CircleDollarSign size={21} />} label={translateText("Agentlardagi pul")} value={formatAgentMoney(stats.cash)} variant="warning" />}
        </section>

        <Card padding="md" className="agents-page__workspace">
          <TableToolbar searchValue={search} onSearchChange={value => {
          setSearch(value);
          setPage(1);
        }} searchPlaceholder={translateText("Agent, telefon, hudud yoki marshrut...")} actionLabel={translateText("Yangi agent")} actionIcon={<Plus size={17} />} onAction={() => navigate("/agents/create")} />

          <div className="agents-page__filters">
            <div className="agents-page__filter">
              <Select value={regionFilter} placeholder={translateText("Barcha hududlar")} options={regions} onChange={event => {
              setRegionFilter(event.target.value);
              setPage(1);
            }} />
            </div>

            <div className="agents-page__filter">
              <Select value={statusFilter} placeholder={translateText("Barcha holatlar")} options={[{
              value: "ACTIVE",
              label: translateText("Faol")
            }, {
              value: "INACTIVE",
              label: translateText("Faol emas")
            }]} onChange={event => {
              setStatusFilter(event.target.value);
              setPage(1);
            }} />
            </div>
          </div>

          <AgentTable agents={pagedAgents} onView={agent => navigate(`/agents/${agent.id}`)} onEdit={agent => navigate(`/agents/${agent.id}/edit`)} onAssignCustomer={agent => navigate(`/agents/${agent.id}`)} onToggleStatus={handleToggleStatus} onDelete={setDeleteTarget} />

          <Pagination page={safePage} totalPages={totalPages} onChange={setPage} />
        </Card>
      </div>

      <ConfirmDialog open={Boolean(deleteTarget)} title={deleteBlocked ? translateText("Agentni o'chirib bo'lmaydi") : translateText("Agentni o'chirish")} description={deleteBlocked ? `${deleteSafety.blockingReasons.join(", ")}. ${translateText("To'liq o'chirish bloklandi, agentni faol emas qilish tavsiya qilinadi.")}` : translateText("Bu agent hech qanday mijoz, buyurtma yoki to'lovga bog'lanmagan. O'chirishni tasdiqlaysizmi?")} confirmText={deleteBlocked ? translateText("Faol emas qilish") : translateText("O'chirish")} cancelText={translateText("Bekor qilish")} danger={!deleteBlocked} onClose={() => setDeleteTarget(null)} onConfirm={handleDeleteConfirm} />
    </PageContainer>;
};
const AgentStat = ({
  icon,
  label,
  value,
  variant
}) => <Card variant="soft" padding="md" className="agents-page__stat">
    <div className={["agents-page__stat-icon", variant ? `agents-page__stat-icon--${variant}` : ""].filter(Boolean).join(" ")}>
      {icon}
    </div>

    <div>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  </Card>;
export default AgentsPage;
