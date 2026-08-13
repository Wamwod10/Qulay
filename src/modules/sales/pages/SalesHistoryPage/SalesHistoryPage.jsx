import { useEffect, useMemo, useState } from "react";

import { CircleDollarSign, ReceiptText, ShoppingBag, Wallet } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { getStoredAgents } from "../../../agents/utils/agentsStorage";
import { getStoredCustomers } from "../../../customers/utils/customersStorage";
import { getStoredWarehouses } from "../../../warehouse/utils/warehouseManagementStorage";

import { Badge, Card, DatePicker, Modal, Pagination, Select, TableToolbar } from "../../../../shared/ui";

import SalesTable from "../../components/SalesTable/SalesTable";
import ReceiptPreview from "../../pos/components/ReceiptPreview/ReceiptPreview";

import { cancelSale, getStoredSales } from "../../utils/salesStorage";
import {
  buildSaleSearchText,
  formatSaleMoney,
} from "../../utils/salesHelpers";

import "../SalesPage/SalesPage.scss";

const PAGE_SIZE = 10;

const SalesHistoryPage = () => {
  const navigate = useNavigate();
  const [sales, setSales] = useState(() => getStoredSales());
  const [receiptSale, setReceiptSale] = useState(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [paymentFilter, setPaymentFilter] = useState("");
  const [customerFilter, setCustomerFilter] = useState("");
  const [agentFilter, setAgentFilter] = useState("");
  const [warehouseFilter, setWarehouseFilter] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);

  const customers = useMemo(() => getStoredCustomers(), []);
  const agents = useMemo(() => getStoredAgents().filter((agent) => agent.status === "ACTIVE"), []);
  const warehouses = useMemo(
    () => getStoredWarehouses().filter((warehouse) => warehouse.status !== "INACTIVE"),
    [],
  );

  useEffect(() => {
    const refresh = () => setSales(getStoredSales());

    window.addEventListener("sales:changed", refresh);
    window.addEventListener("storage", refresh);

    return () => {
      window.removeEventListener("sales:changed", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, paymentFilter, customerFilter, agentFilter, warehouseFilter, from, to]);

  const filteredSales = useMemo(() => {
    const query = search.trim().toLowerCase();

    return sales.filter((sale) => {
      const saleDate = new Date(sale.completedAt || sale.orderDate || sale.createdAt);
      const saleDay = Number.isNaN(saleDate.getTime())
        ? ""
        : saleDate.toISOString().slice(0, 10);

      return (
        (!query || buildSaleSearchText(sale).includes(query)) &&
        (!statusFilter || sale.status === statusFilter) &&
        (!paymentFilter || sale.paymentStatus === paymentFilter) &&
        (!customerFilter || sale.customerId === customerFilter) &&
        (!agentFilter || sale.agentId === agentFilter) &&
        (!warehouseFilter || sale.warehouseId === warehouseFilter) &&
        (!from || saleDay >= from) &&
        (!to || saleDay <= to)
      );
    });
  }, [
    sales,
    search,
    statusFilter,
    paymentFilter,
    customerFilter,
    agentFilter,
    warehouseFilter,
    from,
    to,
  ]);

  const stats = useMemo(() => {
    const validSales = filteredSales.filter((sale) => sale.status !== "CANCELLED");

    return validSales.reduce(
      (result, sale) => ({
        count: result.count + 1,
        total: result.total + Number(sale.netTotal ?? sale.total ?? 0),
        paid: result.paid + Number(sale.paidAmount || 0),
        debt: result.debt + Number(sale.debtAmount || 0),
      }),
      {
        count: 0,
        total: 0,
        paid: 0,
        debt: 0,
      },
    );
  }, [filteredSales]);

  const totalPages = Math.max(Math.ceil(filteredSales.length / PAGE_SIZE), 1);
  const pagedSales = filteredSales.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleCancel = (sale) => {
    const reason = window.prompt("Bekor qilish sababi:");

    if (reason === null) {
      return;
    }

    try {
      cancelSale({
        saleId: sale.id,
        reason,
      });
      setSales(getStoredSales());
    } catch (error) {
      window.alert(error.message);
    }
  };

  const handlePrint = (sale) => {
    setReceiptSale(sale);
    window.setTimeout(() => window.print(), 120);
  };

  return (
    <div className="sales-page">
      <section className="sales-page__stats">
        <SaleStat icon={<ShoppingBag size={21} />} label="Sotuvlar" value={stats.count} />
        <SaleStat
          icon={<ReceiptText size={21} />}
          label="Jami savdo"
          value={`${formatSaleMoney(stats.total)} so'm`}
        />
        <SaleStat
          icon={<CircleDollarSign size={21} />}
          label="Paid"
          value={`${formatSaleMoney(stats.paid)} so'm`}
          variant="success"
        />
        <SaleStat
          icon={<Wallet size={21} />}
          label="Debt"
          value={`${formatSaleMoney(stats.debt)} so'm`}
          variant="warning"
        />
      </section>

      <Card padding="md" className="sales-page__workspace">
        <TableToolbar
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder="Sotuv, SKU, mijoz, agent..."
          actionLabel="POS terminal"
          actionIcon={<ShoppingBag size={17} />}
          onAction={() => navigate("/sales/terminal")}
        />

        <div className="sales-page__filters sales-page__filters--wide">
          <Select
            value={statusFilter}
            placeholder="Barcha holatlar"
            options={[
              { value: "", label: "Barcha holatlar" },
              { value: "DRAFT", label: "Qoralama" },
              { value: "COMPLETED", label: "Yakunlangan" },
              { value: "CANCELLED", label: "Bekor qilingan" },
            ]}
            onChange={(event) => setStatusFilter(event.target.value)}
          />
          <Select
            value={paymentFilter}
            placeholder="Barcha to'lovlar"
            options={[
              { value: "", label: "Barcha to'lovlar" },
              { value: "UNPAID", label: "To'lanmagan" },
              { value: "PARTIAL", label: "Qisman" },
              { value: "PAID", label: "To'langan" },
            ]}
            onChange={(event) => setPaymentFilter(event.target.value)}
          />
          <Select
            value={customerFilter}
            placeholder="Barcha mijozlar"
            options={[
              { value: "", label: "Barcha mijozlar" },
              ...customers.map((customer) => ({
                value: customer.id,
                label: customer.name || customer.phone || customer.id,
              })),
            ]}
            onChange={(event) => setCustomerFilter(event.target.value)}
          />
          <Select
            value={agentFilter}
            placeholder="Barcha agentlar"
            options={[
              { value: "", label: "Barcha agentlar" },
              ...agents.map((agent) => ({
                value: agent.id,
                label: agent.name || agent.phone || agent.id,
              })),
            ]}
            onChange={(event) => setAgentFilter(event.target.value)}
          />
          <Select
            value={warehouseFilter}
            placeholder="Barcha omborlar"
            options={[
              { value: "", label: "Barcha omborlar" },
              ...warehouses.map((warehouse) => ({
                value: warehouse.id,
                label: warehouse.name,
              })),
            ]}
            onChange={(event) => setWarehouseFilter(event.target.value)}
          />
          <DatePicker value={from} placeholder="Boshlanish" onChange={(event) => setFrom(event.target.value)} />
          <DatePicker value={to} placeholder="Tugash" onChange={(event) => setTo(event.target.value)} />
        </div>

        <SalesTable
          sales={pagedSales}
          onView={(sale) => navigate(`/sales/history/${sale.id}`)}
          onReceipt={setReceiptSale}
          onPrint={handlePrint}
          onReturn={(sale) => navigate(`/sales/history/${sale.id}`)}
          onCancel={handleCancel}
        />

        <div className="sales-page__pagination">
          <Badge variant="neutral">{filteredSales.length} ta natija</Badge>
          <Pagination page={page} totalPages={totalPages} onChange={setPage} />
        </div>
      </Card>

      <Modal
        open={Boolean(receiptSale)}
        title="Receipt"
        size="sm"
        onClose={() => setReceiptSale(null)}
      >
        <ReceiptPreview sale={receiptSale} onPrint={() => window.print()} />
      </Modal>
    </div>
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

export default SalesHistoryPage;
