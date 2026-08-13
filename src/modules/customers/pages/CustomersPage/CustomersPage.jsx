import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { CircleDollarSign, Users, Wallet } from "lucide-react";

import PageContainer from "../../../../components/PageContainer/PageContainer";

import { Badge, Card, Table, TableToolbar } from "../../../../shared/ui";

import { getStoredSales } from "../../../sales/utils/salesStorage";
import { formatSaleDate, formatSaleMoney } from "../../../sales/utils/salesHelpers";

import { getStoredCustomers } from "../../utils/customersStorage";
import { getCustomerDebts } from "../../../finance/utils/financeSelectors";

import "./CustomersPage.scss";

const CustomersPage = () => {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState(() => getStoredCustomers());
  const [sales, setSales] = useState(() => getStoredSales());
  const [debtRows, setDebtRows] = useState(() => getCustomerDebts());
  const [search, setSearch] = useState("");

  useEffect(() => {
    const refresh = () => {
      setCustomers(getStoredCustomers());
      setSales(getStoredSales());
      setDebtRows(getCustomerDebts());
    };

    window.addEventListener("finance:changed", refresh);
    window.addEventListener("sales:changed", refresh);
    window.addEventListener("storage", refresh);

    return () => {
      window.removeEventListener("finance:changed", refresh);
      window.removeEventListener("sales:changed", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  const customerRows = useMemo(() => {
    const salesByCustomer = new Map();
    const financeDebtMap = new Map(debtRows.map((row) => [row.customerId, row]));

    sales
      .filter((sale) => sale.customerId && sale.status !== "CANCELLED")
      .forEach((sale) => {
        const current = salesByCustomer.get(sale.customerId) || {
          salesCount: 0,
          salesAmount: 0,
          debtAmount: 0,
          lastSale: null,
        };

        current.salesCount += 1;
        current.salesAmount += Number(sale.netTotal ?? sale.total ?? 0);
        current.debtAmount += Number(sale.debtAmount || 0);

        const saleDate = new Date(sale.completedAt || sale.createdAt || 0);
        const lastDate = current.lastSale
          ? new Date(current.lastSale.completedAt || current.lastSale.createdAt || 0)
          : null;

        if (!lastDate || saleDate > lastDate) {
          current.lastSale = sale;
        }

        salesByCustomer.set(sale.customerId, current);
      });

    const query = search.trim().toLowerCase();

    return customers
      .map((customer) => ({
        ...customer,
        ...(salesByCustomer.get(customer.id) || {
          salesCount: 0,
          salesAmount: 0,
          debtAmount: 0,
          lastSale: null,
        }),
        debtAmount:
          financeDebtMap.get(customer.id)?.debt ??
          salesByCustomer.get(customer.id)?.debtAmount ??
          0,
        paidAmount: financeDebtMap.get(customer.id)?.paid || 0,
      }))
      .filter((customer) =>
        !query
          ? true
          : [customer.name, customer.phone, customer.email]
              .filter(Boolean)
              .join(" ")
              .toLowerCase()
              .includes(query),
      );
  }, [customers, debtRows, sales, search]);

  const stats = customerRows.reduce(
    (result, customer) => ({
      count: result.count + 1,
      salesAmount: result.salesAmount + Number(customer.salesAmount || 0),
      debtAmount: result.debtAmount + Number(customer.debtAmount || 0),
    }),
    {
      count: 0,
      salesAmount: 0,
      debtAmount: 0,
    },
  );

  return (
    <PageContainer
      title="Mijozlar"
      description="Mijozlar bazasi va Sales modulidan real savdo/qarz summary."
    >
      <div className="customers-page">
        <section className="customers-page__kpis">
          <Metric icon={<Users size={20} />} label="Mijozlar" value={stats.count} />
          <Metric
            icon={<CircleDollarSign size={20} />}
            label="Jami savdo"
            value={`${formatSaleMoney(stats.salesAmount)} so'm`}
          />
          <Metric
            icon={<Wallet size={20} />}
            label="Jami qarz"
            value={`${formatSaleMoney(stats.debtAmount)} so'm`}
            variant="warning"
          />
        </section>

        <Card padding="lg" className="customers-page__table">
          <TableToolbar
            searchValue={search}
            onSearchChange={setSearch}
            searchPlaceholder="Mijoz qidirish..."
          />

          <Table
            columns={[
              { key: "name", title: "Mijoz", render: (value, row) => value || row.phone || row.id },
              { key: "phone", title: "Telefon", render: (value) => value || "-" },
              {
                key: "status",
                title: "Status",
                render: (value) => (
                  <Badge variant={value === "ACTIVE" ? "success" : "neutral"}>{value}</Badge>
                ),
              },
              { key: "salesCount", title: "Sotuvlar" },
              {
                key: "salesAmount",
                title: "Jami savdo",
                render: (value) => `${formatSaleMoney(value)} so'm`,
              },
              {
                key: "debtAmount",
                title: "Qarz",
                render: (value) => `${formatSaleMoney(value)} so'm`,
              },
              {
                key: "lastSale",
                title: "Oxirgi savdo",
                render: (value) => (value ? formatSaleDate(value.completedAt || value.createdAt) : "-"),
              },
              {
                key: "actions",
                title: "Actions",
                render: (_, row) => (
                  <button
                    type="button"
                    className="customers-page__link-action"
                    onClick={() => navigate(`/customers/${row.id}`)}
                  >
                    Detail
                  </button>
                ),
              },
            ]}
            data={customerRows}
            rowKey="id"
            emptyText="Mijozlar mavjud emas."
          />
        </Card>
      </div>
    </PageContainer>
  );
};

const Metric = ({ icon, label, value, variant = "" }) => (
  <Card variant="soft" padding="md" className="customers-page__metric">
    <div
      className={[
        "customers-page__metric-icon",
        variant ? `customers-page__metric-icon--${variant}` : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {icon}
    </div>
    <span>
      <small>{label}</small>
      <strong>{value}</strong>
    </span>
  </Card>
);

export default CustomersPage;
