import { Plus, UserMinus, Users } from "lucide-react";
import { useMemo, useState } from "react";
import { Button, Card, EmptyState, Select } from "../../../../shared/ui";
import { assignCustomerToAgent, getAgentCustomers, getAssignableCustomersForAgent, getCustomerDisplayName, unassignCustomerFromAgent } from "../../utils/agentIntegration";
import "./AgentCustomers.scss";
import { translateText } from "../../../../localization/i18n";
const AgentCustomers = ({
  agent,
  onChange
}) => {
  const [version, setVersion] = useState(0);
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const customers = useMemo(() => getAgentCustomers(agent.id), [agent.id, version]);
  const assignableCustomers = useMemo(() => getAssignableCustomersForAgent(agent.id), [agent.id, version]);
  const customerOptions = assignableCustomers.filter(customer => !customers.some(assignedCustomer => assignedCustomer.id === customer.id)).map(customer => ({
    value: customer.id,
    label: getCustomerDisplayName(customer)
  }));
  const refresh = () => {
    setVersion(current => current + 1);
    onChange?.(getAgentCustomers(agent.id));
  };
  const handleAssign = () => {
    if (!selectedCustomerId) {
      return;
    }
    assignCustomerToAgent({
      customerId: selectedCustomerId,
      agentId: agent.id
    });
    setSelectedCustomerId("");
    refresh();
  };
  const handleRemove = customer => {
    unassignCustomerFromAgent(customer.id);
    refresh();
  };
  return <Card padding="lg" className="agent-customers">
      <div className="agent-customers__header">
        <div>
          <h3>{translateText("Biriktirilgan mijozlar")}</h3>
          <p>{translateText("Agent xizmat ko'rsatadigan mijozlar.")}</p>
        </div>

        <div className="agent-customers__count">
          <Users size={16} />
          {customers.length}{translateText("ta")}</div>
      </div>

      <div className="agent-customers__assign">
        <Select value={selectedCustomerId} placeholder={translateText("Mijoz tanlang")} options={customerOptions} onChange={event => setSelectedCustomerId(event.target.value)} />

        <Button type="button" leftIcon={<Plus size={16} />} disabled={!selectedCustomerId} onClick={handleAssign}>{translateText("Biriktirish")}</Button>
      </div>

      {!customers.length ? <EmptyState title={translateText("Mijoz biriktirilmagan")} description={translateText("Ushbu agentga hali mijoz biriktirilmagan.")} /> : <div className="agent-customers__list">
          {customers.map(customer => <div key={customer.id} className="agent-customers__item">
              <div>
                <strong>{getCustomerDisplayName(customer)}</strong>
                <span>{customer.phone || translateText("Telefon yo'q")}</span>
              </div>

              <Button type="button" size="sm" variant="ghost" title={translateText("Agentdan ajratish")} onClick={() => handleRemove(customer)}>
                <UserMinus size={16} />
              </Button>
            </div>)}
        </div>}
    </Card>;
};
export default AgentCustomers;
