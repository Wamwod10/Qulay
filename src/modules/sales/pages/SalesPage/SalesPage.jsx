import { useMemo, useState } from "react";

import {
  CircleDollarSign,
  Plus,
  ReceiptText,
  ShoppingBag,
  Wallet,
} from "lucide-react";

import { useNavigate } from "react-router-dom";

import PageContainer from "../../../../components/PageContainer/PageContainer";

import { Card, Select, TableToolbar } from "../../../../shared/ui";

import SalesTable from "../../components/SalesTable/SalesTable";

import { getStoredSales } from "../../utils/salesStorage";

import { formatSaleMoney } from "../../utils/salesHelpers";

import "./SalesPage.scss";

const SalesPage = () => {
  const navigate = useNavigate();

  const [sales] = useState(() => getStoredSales());

  const [search, setSearch] = useState("");

  const [statusFilter, setStatusFilter] = useState("");

  const [paymentFilter, setPaymentFilter] = useState("");

  const filteredSales = useMemo(() => {
    const query = search.trim().toLowerCase();

    return sales.filter((sale) => {
      const searchable = [
        sale.number,
        sale.customerName,
        sale.agentName,
        sale.warehouseName,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return (
        (!query || searchable.includes(query)) &&
        (!statusFilter || sale.status === statusFilter) &&
        (!paymentFilter || sale.paymentStatus === paymentFilter)
      );
    });
  }, [sales, search, statusFilter, paymentFilter]);

  const stats = useMemo(() => {
    const validSales = sales.filter((sale) => sale.status !== "CANCELLED");

    const total = validSales.reduce(
      (sum, sale) => sum + Number(sale.total || 0),
      0,
    );

    const paid = validSales.reduce(
      (sum, sale) => sum + Number(sale.paidAmount || 0),
      0,
    );

    const debt = validSales.reduce(
      (sum, sale) => sum + Number(sale.debtAmount || 0),
      0,
    );

    return {
      count: validSales.length,

      total,
      paid,
      debt,
    };
  }, [sales]);

  return (
    <PageContainer
      title="Savdo"
      description="Mijozlar buyurtmalari, agentlar va to‘lov holatini boshqarish."
    >
      <div className="sales-page">
        <section className="sales-page__stats">
          <SaleStat
            icon={<ShoppingBag size={21} />}
            label="Sotuvlar"
            value={stats.count}
          />

          <SaleStat
            icon={<ReceiptText size={21} />}
            label="Jami savdo"
            value={`${formatSaleMoney(stats.total)} so‘m`}
          />

          <SaleStat
            icon={<CircleDollarSign size={21} />}
            label="To‘langan"
            value={`${formatSaleMoney(stats.paid)} so‘m`}
            variant="success"
          />

          <SaleStat
            icon={<Wallet size={21} />}
            label="Qarz"
            value={`${formatSaleMoney(stats.debt)} so‘m`}
            variant="warning"
          />
        </section>

        <Card padding="md" className="sales-page__workspace">
          <TableToolbar
            searchValue={search}
            onSearchChange={setSearch}
            searchPlaceholder="Sotuv, mijoz yoki agent..."
            actionLabel="Yangi sotuv"
            actionIcon={<Plus size={17} />}
            onAction={() => navigate("/sales/create")}
          />

          <div className="sales-page__filters">
            <div className="sales-page__filter">
              <Select
                value={statusFilter}
                placeholder="Barcha holatlar"
                options={[
                  {
                    value: "DRAFT",
                    label: "Qoralama",
                  },
                  {
                    value: "CONFIRMED",
                    label: "Tasdiqlangan",
                  },
                  {
                    value: "COMPLETED",
                    label: "Yakunlangan",
                  },
                  {
                    value: "CANCELLED",
                    label: "Bekor qilingan",
                  },
                ]}
                onChange={(event) => setStatusFilter(event.target.value)}
              />
            </div>

            <div className="sales-page__filter">
              <Select
                value={paymentFilter}
                placeholder="Barcha to‘lovlar"
                options={[
                  {
                    value: "UNPAID",
                    label: "To‘lanmagan",
                  },
                  {
                    value: "PARTIAL",
                    label: "Qisman",
                  },
                  {
                    value: "PAID",
                    label: "To‘langan",
                  },
                ]}
                onChange={(event) => setPaymentFilter(event.target.value)}
              />
            </div>
          </div>

          <SalesTable
            sales={filteredSales}
            onView={(sale) => navigate(`/sales/${sale.id}`)}
            onEdit={(sale) => navigate(`/sales/${sale.id}/edit`)}
          />
        </Card>
      </div>
    </PageContainer>
  );
};

const SaleStat = ({ icon, label, value, variant }) => (
  <Card variant="soft" padding="md" className="sales-page__stat">
    <div
      className={[
        "sales-page__stat-icon",
        variant ? `sales-page__stat-icon--${variant}` : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {icon}
    </div>

    <div>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  </Card>
);

export default SalesPage;
