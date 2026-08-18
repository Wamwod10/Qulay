import { WalletCards } from "lucide-react";
import { Card, EmptyState, Table } from "../../../../shared/ui";
import { formatAgentDate, formatAgentMoney } from "../../utils/agentHelpers";
import { getCustomerDisplayName } from "../../utils/agentIntegration";
import "./AgentPayments.scss";
import { translateText } from "../../../../localization/i18n";
const AgentPayments = ({
  payments = [],
  customers = []
}) => {
  const customerMap = new Map(customers.map(customer => [customer.id, customer]));
  const columns = [{
    key: "customerId",
    title: translateText("Mijoz"),
    render: customerId => getCustomerDisplayName(customerMap.get(customerId))
  }, {
    key: "orderId",
    title: translateText("Buyurtma"),
    render: value => value || translateText("Bog'lanmagan")
  }, {
    key: "amount",
    title: translateText("Summa"),
    render: value => `${formatAgentMoney(value)} ${translateText("so'm")}`
  }, {
    key: "createdAt",
    title: translateText("Sana"),
    render: formatAgentDate
  }, {
    key: "paymentMethod",
    title: translateText("Usul"),
    render: (value, payment) => translateText(value || payment.method || "Kiritilmagan")
  }];
  return <Card padding="lg" className="agent-payments">
      <div className="agent-payments__header">
        <div>
          <h3>{translateText("To'lovlar")}</h3>
          <p>{translateText("Moliya moduli bilan agent tushumlari shu kelishuv orqali ulanadi.")}</p>
        </div>
      </div>

      {payments.length ? <Table columns={columns} data={payments} rowKey="id" /> : <EmptyState icon={WalletCards} title={translateText("To'lovlar yo'q")} description={translateText("Moliya moduli ulanmaguncha agent to'lovlari shu yerda paydo bo'ladi.")} />}
    </Card>;
};
export default AgentPayments;
