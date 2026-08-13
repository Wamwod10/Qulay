import { ArrowLeft, CircleDollarSign, Wallet } from "lucide-react";
import { useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";

import PageContainer from "../../../../components/PageContainer/PageContainer";
import { Badge, Button, Card, Table } from "../../../../shared/ui";

import {
  formatFinanceDate,
  formatFinanceMoney,
  getCustomerDebt,
  getFinanceTransactions,
  getPaymentMethodLabel,
} from "../../../finance/utils/financeSelectors";
import { getStoredSales } from "../../../sales/utils/salesStorage";
import { formatSaleDate } from "../../../sales/utils/salesHelpers";
import { getCustomerById } from "../../utils/customersStorage";

import "./CustomerDetailsPage.scss";

const CustomerDetailsPage = () => {
  const navigate = useNavigate();
  const { customerId } = useParams();
  const customer = getCustomerById(customerId);

  const debt = useMemo(() => getCustomerDebt(customerId), [customerId]);
  const sales = useMemo(
    () => getStoredSales().filter((sale) => sale.customerId === customerId && sale.status !== "CANCELLED"),
    [customerId],
  );
  const payments = useMemo(
    () =>
      getFinanceTransactions({ customerId }).filter((transaction) =>
        ["SALE_PAYMENT", "CUSTOMER_PAYMENT", "AGENT_COLLECTION", "REFUND"].includes(transaction.sourceType),
      ),
    [customerId],
  );

  if (!customer && !debt.salesTotal) {
    return (
      <PageContainer title="Mijoz topilmadi" description="Bu mijoz uchun ma'lumot mavjud emas.">
        <Button variant="secondary" onClick={() => navigate("/customers")}>
          Ortga
        </Button>
      </PageContainer>
    );
  }

  return (
    <PageContainer
      title={customer?.name || debt.customerName}
      description={customer?.phone || "Customer finance detail"}
    >
      <div className="customer-details">
        <Button variant="secondary" leftIcon={<ArrowLeft size={17} />} onClick={() => navigate("/customers")}>
          Ortga
        </Button>

        <section className="customer-details__kpis">
          <Metric icon={<CircleDollarSign size={20} />} label="Jami savdo" value={debt.salesTotal} />
          <Metric icon={<Wallet size={20} />} label="To'langan" value={debt.paid} />
          <Metric icon={<Wallet size={20} />} label="Qolgan qarz" value={debt.debt} variant={debt.debt > 0 ? "warning" : "success"} />
          <Metric label="Oxirgi to'lov" value={debt.lastPayment ? formatFinanceDate(debt.lastPayment.date) : "-"} text />
        </section>

        {debt.overdue && (
          <Card padding="md" className="customer-details__warning">
            Overdue qarz mavjud. Mijoz bilan to'lov muddatini tekshiring.
          </Card>
        )}

        <Card padding="lg" className="customer-details__section">
          <h3>Payment history</h3>
          <Table
            columns={[
              { key: "date", title: "Date", render: formatFinanceDate },
              { key: "type", title: "Type", render: (value) => <Badge variant={value === "IN" ? "success" : "danger"}>{value}</Badge> },
              { key: "source", title: "Source" },
              { key: "paymentMethod", title: "Method", render: getPaymentMethodLabel },
              { key: "amount", title: "Amount", render: (value) => `${formatFinanceMoney(value)} so'm` },
              { key: "note", title: "Note", render: (value) => value || "-" },
            ]}
            data={payments}
            rowKey="id"
          />
        </Card>

        <Card padding="lg" className="customer-details__section">
          <h3>Sales</h3>
          <Table
            columns={[
              { key: "number", title: "Sale" },
              { key: "completedAt", title: "Date", render: (value, row) => formatSaleDate(value || row.createdAt) },
              { key: "netTotal", title: "Total", render: (value, row) => `${formatFinanceMoney(value ?? row.total)} so'm` },
              { key: "paidAmount", title: "Paid", render: (value) => `${formatFinanceMoney(value)} so'm` },
              { key: "debtAmount", title: "Original debt", render: (value) => `${formatFinanceMoney(value)} so'm` },
            ]}
            data={sales}
            rowKey="id"
          />
        </Card>
      </div>
    </PageContainer>
  );
};

const Metric = ({ icon, label, value, variant = "", text = false }) => (
  <Card variant="soft" padding="md" className="customer-details__metric">
    {icon && <div className={["customer-details__metric-icon", variant ? `customer-details__metric-icon--${variant}` : ""].filter(Boolean).join(" ")}>{icon}</div>}
    <span>
      <small>{label}</small>
      <strong>{text ? value : `${formatFinanceMoney(value)} so'm`}</strong>
    </span>
  </Card>
);

export default CustomerDetailsPage;
