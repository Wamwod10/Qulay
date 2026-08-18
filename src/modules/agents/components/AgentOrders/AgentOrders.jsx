import { PackageSearch } from "lucide-react";
import { Card, EmptyState, Table } from "../../../../shared/ui";
import { formatAgentDate, formatAgentMoney } from "../../utils/agentHelpers";
import { getCustomerDisplayName } from "../../utils/agentIntegration";
import "./AgentOrders.scss";
import { translateText } from "../../../../localization/i18n";
const AgentOrders = ({
  orders = [],
  customers = []
}) => {
  const customerMap = new Map(customers.map(customer => [customer.id, customer]));
  const columns = [{
    key: "orderNumber",
    title: translateText("Buyurtma"),
    render: (value, order) => value || order.id
  }, {
    key: "customerId",
    title: translateText("Mijoz"),
    render: customerId => getCustomerDisplayName(customerMap.get(customerId))
  }, {
    key: "createdAt",
    title: translateText("Sana"),
    render: (value, order) => formatAgentDate(order.orderDate || value)
  }, {
    key: "totalAmount",
    title: translateText("Summa"),
    render: (value, order) => `${formatAgentMoney(value ?? order.total)} ${translateText("so'm")}`
  }, {
    key: "status",
    title: translateText("Holat"),
    render: value => translateText(value || "DRAFT")
  }];
  return <Card padding="lg" className="agent-orders">
      <div className="agent-orders__header">
        <div>
          <h3>{translateText("Buyurtmalar")}</h3>
          <p>{translateText("Savdo moduli bilan agent buyurtmalari shu kelishuv orqali ulanadi.")}</p>
        </div>
      </div>

      {orders.length ? <Table columns={columns} data={orders} rowKey="id" /> : <EmptyState icon={PackageSearch} title={translateText("Buyurtmalar yo'q")} description={translateText("Savdo moduli ulanmaguncha agent buyurtmalari shu yerda paydo bo'ladi.")} />}
    </Card>;
};
export default AgentOrders;
