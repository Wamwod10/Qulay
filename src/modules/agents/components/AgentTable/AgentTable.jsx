import { Badge, Table } from "../../../../shared/ui";

import {
  formatAgentMoney,
  getAgentInitials,
  getAgentStatusLabel,
  getAgentStatusVariant,
} from "../../utils/agentHelpers";
import {
  getAgentCustomers,
  getAgentSalesTotal,
} from "../../utils/agentIntegration";

import AgentActionsMenu from "../AgentActionsMenu/AgentActionsMenu";

import "./AgentTable.scss";

const AgentTable = ({
  agents = [],
  onView,
  onEdit,
  onAssignCustomer,
  onToggleStatus,
  onDelete,
}) => {
  const columns = [
    {
      key: "name",
      title: "Agent",
      render: (value, agent) => (
        <div className="agent-table__agent">
          <div className="agent-table__avatar">{getAgentInitials(value)}</div>

          <div>
            <strong>{value || "Nomsiz agent"}</strong>
            <span>{agent.phone || "Telefon yo'q"}</span>
          </div>
        </div>
      ),
    },
    {
      key: "region",
      title: "Hudud",
      render: (value) => value || "-",
    },
    {
      key: "route",
      title: "Marshrut",
      render: (value) => value || "-",
    },
    {
      key: "targetAmount",
      title: "Reja",
      render: (value) => `${formatAgentMoney(value)} so'm`,
    },
    {
      key: "salesAmount",
      title: "Real sales",
      render: (_, agent) => `${formatAgentMoney(getAgentSalesTotal(agent.id))} so'm`,
    },
    {
      key: "commissionPercent",
      title: "Komissiya",
      render: (value) => `${Number(value || 0)}%`,
    },
    {
      key: "customerIds",
      title: "Mijozlar",
      render: (_, agent) => `${getAgentCustomers(agent.id).length} ta`,
    },
    {
      key: "status",
      title: "Holat",
      render: (status) => (
        <Badge variant={getAgentStatusVariant(status)}>
          {getAgentStatusLabel(status)}
        </Badge>
      ),
    },
    {
      key: "actions",
      title: "",
      render: (_, agent) => (
        <AgentActionsMenu
          agent={agent}
          onView={onView}
          onEdit={onEdit}
          onAssignCustomer={onAssignCustomer}
          onToggleStatus={onToggleStatus}
          onDelete={onDelete}
        />
      ),
    },
  ];

  return (
    <Table
      columns={columns}
      data={agents}
      rowKey="id"
      emptyText="Agentlar topilmadi."
    />
  );
};

export default AgentTable;
