import { WalletCards } from "lucide-react";

import { Card, EmptyState, Table } from "../../../../shared/ui";

import {
  formatAgentDate,
  formatAgentMoney,
} from "../../utils/agentHelpers";
import { getCustomerDisplayName } from "../../utils/agentIntegration";

import "./AgentPayments.scss";

const AgentPayments = ({ payments = [], customers = [] }) => {
  const customerMap = new Map(customers.map((customer) => [customer.id, customer]));

  const columns = [
    {
      key: "customerId",
      title: "Mijoz",
      render: (customerId) => getCustomerDisplayName(customerMap.get(customerId)),
    },
    {
      key: "orderId",
      title: "Buyurtma",
      render: (value) => value || "Bog'lanmagan",
    },
    {
      key: "amount",
      title: "Summa",
      render: (value) => `${formatAgentMoney(value)} so'm`,
    },
    {
      key: "createdAt",
      title: "Sana",
      render: formatAgentDate,
    },
    {
      key: "paymentMethod",
      title: "Usul",
      render: (value, payment) => value || payment.method || "Kiritilmagan",
    },
  ];

  return (
    <Card padding="lg" className="agent-payments">
      <div className="agent-payments__header">
        <div>
          <h3>To'lovlar</h3>
          <p>Finance moduli bilan agent collectionlari shu contract orqali ulanadi.</p>
        </div>
      </div>

      {payments.length ? (
        <Table columns={columns} data={payments} rowKey="id" />
      ) : (
        <EmptyState
          icon={WalletCards}
          title="To'lovlar yo'q"
          description="Finance moduli ulanmaguncha agent to'lovlari shu yerda paydo bo'ladi."
        />
      )}
    </Card>
  );
};

export default AgentPayments;
