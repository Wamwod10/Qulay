import { PackageSearch } from "lucide-react";

import { Card, EmptyState, Table } from "../../../../shared/ui";

import {
  formatAgentDate,
  formatAgentMoney,
} from "../../utils/agentHelpers";
import {
  getCustomerDisplayName,
} from "../../utils/agentIntegration";

import "./AgentOrders.scss";

const AgentOrders = ({ orders = [], customers = [] }) => {
  const customerMap = new Map(customers.map((customer) => [customer.id, customer]));

  const columns = [
    {
      key: "orderNumber",
      title: "Buyurtma",
      render: (value, order) => value || order.id,
    },
    {
      key: "customerId",
      title: "Mijoz",
      render: (customerId) => getCustomerDisplayName(customerMap.get(customerId)),
    },
    {
      key: "createdAt",
      title: "Sana",
      render: (value, order) => formatAgentDate(order.orderDate || value),
    },
    {
      key: "totalAmount",
      title: "Summa",
      render: (value, order) => `${formatAgentMoney(value ?? order.total)} so'm`,
    },
    {
      key: "status",
      title: "Holat",
      render: (value) => value || "DRAFT",
    },
  ];

  return (
    <Card padding="lg" className="agent-orders">
      <div className="agent-orders__header">
        <div>
          <h3>Buyurtmalar</h3>
          <p>Sales moduli bilan agent buyurtmalari shu contract orqali ulanadi.</p>
        </div>
      </div>

      {orders.length ? (
        <Table columns={columns} data={orders} rowKey="id" />
      ) : (
        <EmptyState
          icon={PackageSearch}
          title="Buyurtmalar yo'q"
          description="Sales moduli ulanmaguncha agent buyurtmalari shu yerda paydo bo'ladi."
        />
      )}
    </Card>
  );
};

export default AgentOrders;
