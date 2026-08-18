import { Badge, Table } from "../../../../shared/ui";
import { formatAgentMoney, getAgentInitials, getAgentStatusLabel, getAgentStatusVariant } from "../../utils/agentHelpers";
import { getAgentCustomers, getAgentSalesTotal } from "../../utils/agentIntegration";
import AgentActionsMenu from "../AgentActionsMenu/AgentActionsMenu";
import useConfiguredColumns from "../../../settings/hooks/useConfiguredColumns";
import "./AgentTable.scss";
import { translateText } from "../../../../localization/i18n";
const AgentTable = ({
  agents = [],
  onView,
  onEdit,
  onAssignCustomer,
  onToggleStatus,
  onDelete
}) => {
  const columns = [{
    key: "name",
    title: translateText("Agent"),
    render: (value, agent) => <div className="agent-table__agent">
          <div className="agent-table__avatar">{getAgentInitials(value)}</div>

          <div>
            <strong>{value || translateText("Nomsiz agent")}</strong>
            <span>{agent.phone || translateText("Telefon yo'q")}</span>
          </div>
        </div>
  }, {
    key: "region",
    title: translateText("Hudud"),
    render: value => value || "-"
  }, {
    key: "route",
    title: translateText("Marshrut"),
    render: value => value || "-"
  }, {
    key: "targetAmount",
    title: translateText("Reja"),
    render: value => `${formatAgentMoney(value)} ${translateText("so'm")}`
  }, {
    key: "salesAmount",
    title: translateText("Real savdo"),
    render: (_, agent) => `${formatAgentMoney(getAgentSalesTotal(agent.id))} ${translateText("so'm")}`
  }, {
    key: "commissionPercent",
    title: translateText("Komissiya"),
    render: value => `${Number(value || 0)}%`
  }, {
    key: "customerIds",
    title: translateText("Mijozlar"),
    render: (_, agent) => `${getAgentCustomers(agent.id).length} ${translateText("ta")}`
  }, {
    key: "status",
    title: translateText("Holat"),
    render: status => <Badge variant={getAgentStatusVariant(status)}>
          {getAgentStatusLabel(status)}
        </Badge>
  }, {
    key: "actions",
    title: "",
    render: (_, agent) => <AgentActionsMenu agent={agent} onView={onView} onEdit={onEdit} onAssignCustomer={onAssignCustomer} onToggleStatus={onToggleStatus} onDelete={onDelete} />
  }];
  const configuredColumns = useConfiguredColumns("agents", columns);
  return <Table columns={configuredColumns} data={agents} rowKey="id" emptyText={translateText("Agentlar topilmadi.")} />;
};
export default AgentTable;
